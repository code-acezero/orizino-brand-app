"use server";

import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";

/**
 * Guest checkout for the storefront — no auth middleware, since guests have
 * no bearer token. Prices/stock are re-validated server-side against the
 * products table before any order row is written.
 */

const GuestOrderItemSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().nullable().optional(),
  quantity: z.number().int().min(1).max(999),
});

const GuestOrderSchema = z.object({
  email: z.string().email().max(200),
  phone: z.string().min(3).max(40),
  full_name: z.string().min(1).max(120),
  city: z.string().min(1).max(120),
  address_line: z.string().min(1).max(400),
  notes: z.string().max(1000).optional(),
  payment_method: z.enum(["cod", "stripe", "bank_transfer"]),
  items: z.array(GuestOrderItemSchema).min(1).max(50),
  shipping_method_id: z.string().uuid().nullable().optional(),
  coupon_code: z.string().max(64).optional(),
  currency: z.string().max(6).default("BDT"),
  bank_proof: z
    .object({ screenshot_url: z.string().url(), transaction_id: z.string().max(120) })
    .optional(),
});

type PricedItem = {
  product_id: string;
  variant_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

async function loadAdmin() {
  const { supabaseAdmin, hasSupabaseAdminCredentials } = await import(
    "@/integrations/supabase/client.server"
  );
  if (!hasSupabaseAdminCredentials()) throw new Error("Server misconfigured (no admin key).");
  return supabaseAdmin as any;
}

/** Read the admin toggle for guest checkout. Defaults to enabled if unset. */
async function assertGuestCheckoutEnabled(sb: any) {
  const { data } = await sb
    .from("site_settings")
    .select("value")
    .eq("key", "allow_guest_checkout")
    .maybeSingle();
  const raw = data?.value;
  const v = raw && typeof raw === "object" ? (raw as any).value : raw;
  // Default true when the row is missing (existing behavior).
  const enabled = v === undefined || v === null ? true : !!v;
  if (!enabled) throw new Error("Guest checkout is currently disabled. Please sign in to place an order.");
}

/** Re-price items from the DB — client input is only ids/qty. */
async function priceItems(
  sb: any,
  items: z.infer<typeof GuestOrderItemSchema>[],
): Promise<{ items: PricedItem[]; subtotal: number }> {
  const productIds = Array.from(new Set(items.map((i) => i.product_id)));
  const variantIds = Array.from(new Set(items.map((i) => i.variant_id).filter(Boolean))) as string[];
  const [{ data: products }, { data: variants }] = await Promise.all([
    sb.from("products").select("id, name, price, is_active, stock_quantity").in("id", productIds),
    variantIds.length
      ? sb.from("product_variants").select("id, product_id, price_override, is_active, stock_quantity").in("id", variantIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const pMap = new Map((products ?? []).map((p: any) => [p.id, p]));
  const vMap = new Map((variants ?? []).map((v: any) => [v.id, v]));

  const priced: PricedItem[] = [];
  let subtotal = 0;
  for (const it of items) {
    const p: any = pMap.get(it.product_id);
    if (!p || p.is_active === false) throw new Error(`Product unavailable: ${it.product_id}`);
    let unit = Number(p.price ?? 0);
    let variantId: string | null = null;
    if (it.variant_id) {
      const v: any = vMap.get(it.variant_id);
      if (!v || v.is_active === false || v.product_id !== p.id) {
        throw new Error(`Variant unavailable: ${it.variant_id}`);
      }
      if (v.price_override != null) unit = Number(v.price_override);
      variantId = v.id;
    }
    if (!(unit >= 0)) throw new Error(`Bad price for ${p.name}`);
    const line = unit * it.quantity;
    subtotal += line;
    priced.push({
      product_id: p.id,
      variant_id: variantId,
      product_name: p.name,
      quantity: it.quantity,
      unit_price: unit,
      subtotal: line,
    });
  }
  return { items: priced, subtotal };
}

async function resolveShipping(sb: any, shippingMethodId: string | null | undefined, subtotal: number) {
  if (!shippingMethodId) return 0;
  const { data } = await sb
    .from("shipping_methods")
    .select("price, min_order_free, is_active")
    .eq("id", shippingMethodId)
    .maybeSingle();
  if (!data || !data.is_active) return 0;
  const free = data.min_order_free && subtotal >= Number(data.min_order_free);
  return free ? 0 : Number(data.price || 0);
}

async function resolveCoupon(sb: any, code: string | undefined, subtotal: number, itemCount: number) {
  if (!code) return 0;
  const { data } = await sb
    .from("coupons")
    .select("discount_type, discount_value, min_order_amount, max_discount_amount, is_active, starts_at, expires_at, min_items")
    .eq("code", code)
    .maybeSingle();
  if (!data || !data.is_active) return 0;
  const now = new Date();
  if (data.starts_at && new Date(data.starts_at) > now) return 0;
  if (data.expires_at && new Date(data.expires_at) < now) return 0;
  if (data.min_order_amount && subtotal < Number(data.min_order_amount)) return 0;
  if (data.min_items && itemCount < Number(data.min_items)) return 0;
  let d = data.discount_type === "percentage"
    ? subtotal * (Number(data.discount_value) / 100)
    : Number(data.discount_value);
  if (data.max_discount_amount) d = Math.min(d, Number(data.max_discount_amount));
  return Math.max(0, Math.min(d, subtotal));
}

export const placeGuestOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => GuestOrderSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = await loadAdmin();
    await assertGuestCheckoutEnabled(sb);
    const { items, subtotal } = await priceItems(sb, data.items);
    const itemCount = items.reduce((n, i) => n + i.quantity, 0);
    const discount = await resolveCoupon(sb, data.coupon_code, subtotal, itemCount);
    const shipping = await resolveShipping(sb, data.shipping_method_id, subtotal - discount);
    const total = Math.max(0, subtotal - discount + shipping);

    const orderNumber = `ORZ-${Date.now().toString(36).toUpperCase().slice(-8)}`;

    const shippingAddress = {
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      city: data.city,
      street: data.address_line,
    };

    const { data: order, error } = await sb
      .from("orders")
      .insert({
        order_number: orderNumber,
        user_id: null,
        is_guest: true,
        guest_email: data.email,
        guest_phone: data.phone,
        status: data.payment_method === "cod" ? "pending" : "awaiting_payment",
        payment_status: data.payment_method === "cod" ? "unpaid" : "pending",
        payment_method: data.payment_method,
        subtotal,
        shipping_fee: shipping,
        total,
        currency: data.currency,
        shipping_address: shippingAddress,
        notes: data.notes ?? null,
      })
      .select("id, order_number")
      .single();
    if (error || !order) throw new Error(`Failed to create order: ${error?.message ?? "unknown"}`);

    await sb.from("order_items").insert(
      items.map((i) => ({
        order_id: order.id,
        product_id: i.product_id,
        variant_id: i.variant_id,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        subtotal: i.subtotal,
      })),
    );

    // Optional bank-transfer proof
    if (data.payment_method === "bank_transfer" && data.bank_proof) {
      await sb.from("payment_proofs").insert({
        order_id: order.id,
        user_id: null,
        payment_method: "bank_transfer",
        screenshot_url: data.bank_proof.screenshot_url,
        transaction_id: data.bank_proof.transaction_id,
        amount: total,
        status: "pending",
        customer_name: data.full_name,
        customer_phone: data.phone,
      });
    }

    const { data: tokenData } = await sb.rpc("mint_order_tracking_token", { _order_id: order.id });
    const trackingToken = (tokenData as string | null) ?? null;

    // Fire-and-forget staff/customer notifications for COD & bank_transfer.
    // Stripe path fires from the webhook once payment_intent.succeeded arrives.
    if (data.payment_method !== "stripe") {
      try {
        const { notifyNewOrder } = await import("@/lib/order-notifications.functions");
        await notifyNewOrder({ data: { order_id: order.id } });
      } catch (e) {
        console.warn("[guest-checkout] notifyNewOrder failed", e);
      }
    }

    return {
      order_id: order.id,
      order_number: order.order_number,
      tracking_token: trackingToken,
      total,
    };
  });

/**
 * Create a Stripe PaymentIntent for a guest order that was already inserted
 * (payment_method='stripe', status='awaiting_payment'). Server recomputes
 * the amount from the persisted order row — client cannot influence total.
 */
export const createGuestStripePaymentIntent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) throw new Error("Stripe is not configured.");
    const sb = await loadAdmin();
    await assertGuestCheckoutEnabled(sb);
    const { data: order } = await sb
      .from("orders")
      .select("id, order_number, total, currency, payment_method, payment_status, is_guest")
      .eq("id", data.order_id)
      .maybeSingle();
    if (!order) throw new Error("Order not found");
    if (!order.is_guest || order.payment_method !== "stripe") throw new Error("Not a stripe guest order");
    if (order.payment_status === "paid") throw new Error("Order already paid");

    const { data: cfg } = await sb
      .from("site_settings")
      .select("value")
      .eq("key", "payment_gateways_config")
      .maybeSingle();
    const stripeCfg = ((cfg?.value as any) ?? {}).stripe ?? {};
    const publishableKey: string = stripeCfg.publishable_key || "";
    if (!publishableKey) throw new Error("Stripe publishable key not set");
    if (!stripeCfg.enabled) throw new Error("Stripe disabled");

    const ZERO_DECIMAL = new Set(["bif","clp","djf","gnf","jpy","kmf","krw","mga","pyg","rwf","ugx","vnd","vuv","xaf","xof","xpf"]);
    const currency = String(order.currency || "usd").toLowerCase();
    const totalMajor = Number(order.total || 0);
    const amount = ZERO_DECIMAL.has(currency) ? Math.round(totalMajor) : Math.round(totalMajor * 100);
    if (amount < 1) throw new Error("Amount too small");

    const body = new URLSearchParams();
    body.set("amount", String(amount));
    body.set("currency", currency);
    body.set("automatic_payment_methods[enabled]", "true");
    body.set("description", `Order ${order.order_number}`);
    body.set("metadata[order_id]", order.id);
    body.set("metadata[order_number]", order.order_number);
    body.set("metadata[guest]", "1");

    const res = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const pi: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(pi?.error?.message || `Stripe error ${res.status}`);

    // (order lookup on the webhook side is done via metadata[order_id])

    return {
      paymentIntentId: pi.id as string,
      clientSecret: pi.client_secret as string,
      publishableKey,
      amount,
      currency,
    };
  });
