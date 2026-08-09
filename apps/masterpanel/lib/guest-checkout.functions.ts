import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";

/**
 * Guest checkout — allows placing an order without a user account.
 * Also exposes the /track lookup helpers that hit the SECURITY DEFINER
 * public RPCs added in the migration.
 */

const GuestOrderItemSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  variant_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(240),
  quantity: z.number().int().min(1).max(999),
  unit_price: z.number().min(0),
});

const GuestOrderSchema = z.object({
  email: z.string().email().max(200),
  phone: z.string().min(3).max(40),
  full_name: z.string().min(1).max(120),
  city: z.string().min(1).max(120),
  address_line: z.string().min(1).max(400),
  notes: z.string().max(1000).optional(),
  payment_method: z.enum(["cod", "stripe", "bank_transfer"]),
  items: z.array(GuestOrderItemSchema).min(1).max(100),
  shipping_fee: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  currency: z.string().max(6).default("BDT"),
});

function serverSb() {
  return (async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  })();
}

export const placeGuestOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => GuestOrderSchema.parse(data))
  .handler(async ({ data }) => {
    const sb = await serverSb();
    const subtotal = data.items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);
    const total = subtotal + data.shipping_fee + data.tax - data.discount;

    // Mint a short order number
    const orderNumber = `ORZ-${Date.now().toString(36).toUpperCase().slice(-8)}`;

    const shippingAddress = {
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      city: data.city,
      address_line: data.address_line,
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
        shipping_fee: data.shipping_fee,
        total,
        currency: data.currency,
        shipping_address: shippingAddress,
        notes: data.notes ?? null,
      })
      .select("id, order_number")
      .single();

    if (error || !order) {
      throw new Error(`Failed to create order: ${error?.message ?? "unknown"}`);
    }

    // Insert items
    const itemRows = data.items.map((it) => ({
      order_id: order.id,
      product_id: it.product_id ?? null,
      variant_id: it.variant_id ?? null,
      product_name: it.name,
      quantity: it.quantity,
      unit_price: it.unit_price,
      subtotal: it.quantity * it.unit_price,
    }));
    await sb.from("order_items").insert(itemRows);

    // Mint tracking token
    const { data: tokenData } = await sb.rpc("mint_order_tracking_token", { _order_id: order.id });
    const trackingToken = tokenData as string | null;

    return {
      order_id: order.id,
      order_number: order.order_number,
      tracking_token: trackingToken,
      total,
    };
  });

/** Public track lookup by order number + email/phone. */
export const trackOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    order_number: z.string().min(1).max(60),
    contact: z.string().min(1).max(200),
  }).parse(d))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const sb = createClient(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: row } = await sb.rpc("lookup_order_for_tracking", {
      _order_number: data.order_number,
      _contact: data.contact,
    });
    const first = Array.isArray(row) ? row[0] : row;
    if (!first) return { found: false as const };
    return { found: true as const, order: first };
  });

/** Public track lookup by signed tracking token. */
export const trackOrderByToken = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    token: z.string().min(8).max(200),
  }).parse(d))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const sb = createClient(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: row } = await sb.rpc("lookup_order_by_token", { _token: data.token });
    const first = Array.isArray(row) ? row[0] : row;
    if (!first) return { found: false as const };
    return { found: true as const, order: first };
  });
