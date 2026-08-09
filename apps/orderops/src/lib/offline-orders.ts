import { supabase } from "./supabase";

// The @orizino/sb generated Database type predates product_serials,
// product_serial_events, and the orders.order_source/customer_name columns
// (added in later migrations) — masterpanel's own server functions work
// around the same drift with `as any` at these exact call sites. Same fix
// here, scoped to just the tables/columns affected.
const sb = supabase as any;

export type OfflineSource = "offline" | "page" | "whatsapp" | "tiktok" | "instagram";

export interface CreateOfflineOrderInput {
  customerName: string;
  phone?: string;
  email?: string;
  address?: string;
  source: OfflineSource;
  notes?: string;
  serialIds: string[];
}

/**
 * Client-side port of masterpanel's `createOfflineOrder` server function.
 * Same reasoning as lib/serials.ts: the original only ever used the
 * RLS-scoped client, so this is byte-for-byte the same operation, just
 * called directly from the browser instead of proxied through a server
 * function that added nothing security-wise.
 */
export async function createOfflineOrder(input: CreateOfflineOrderInput) {
  const uniqueSerialIds = [...new Set(input.serialIds)];
  const { data: serialRows, error: se } = await sb
    .from("product_serials")
    .select("id, serial_code, status, product_id, variant_id, products(name, price), product_variants(size, color)")
    .in("id", uniqueSerialIds);
  if (se) throw new Error(se.message);
  if (!serialRows || serialRows.length !== uniqueSerialIds.length) {
    throw new Error("Some scanned serials could not be found — they may have been deleted mid-scan.");
  }
  const notAvailable = serialRows.filter((r: any) => r.status !== "available");
  if (notAvailable.length) {
    throw new Error(`Not available for sale: ${notAvailable.map((r: any) => r.serial_code).join(", ")}`);
  }

  const groups = new Map<
    string,
    { product_id: string; variant_id: string | null; product_name: string; unit_price: number; serialIds: string[] }
  >();
  for (const r of serialRows as any[]) {
    const key = `${r.product_id}::${r.variant_id ?? ""}`;
    const variantLabel = [r.product_variants?.size, r.product_variants?.color].filter(Boolean).join(" / ");
    const name = variantLabel ? `${r.products?.name ?? "Product"} (${variantLabel})` : r.products?.name ?? "Product";
    if (!groups.has(key)) {
      groups.set(key, {
        product_id: r.product_id,
        variant_id: r.variant_id ?? null,
        product_name: name,
        unit_price: Number(r.products?.price ?? 0),
        serialIds: [],
      });
    }
    groups.get(key)!.serialIds.push(r.id);
  }

  const subtotal = [...groups.values()].reduce((sum, g) => sum + g.unit_price * g.serialIds.length, 0);
  const orderNumber = `OFL-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

  const shippingAddress: Record<string, any> = {
    full_name: input.customerName,
    phone: input.phone || null,
    email: input.email || null,
    address_line: input.address || null,
  };

  const { data: order, error: oe } = await sb
    .from("orders")
    .insert({
      order_number: orderNumber,
      user_id: null,
      is_guest: true,
      guest_email: input.email || null,
      guest_phone: input.phone || null,
      customer_name: input.customerName,
      status: "confirmed",
      payment_status: "paid",
      payment_method: "cod",
      order_source: input.source,
      subtotal,
      shipping_fee: 0,
      total: subtotal,
      shipping_address: shippingAddress,
      notes: input.notes || null,
    })
    .select("*")
    .single();
  if (oe || !order) throw new Error(`Failed to create order: ${oe?.message ?? "unknown"}`);

  const itemRows = [...groups.values()].map((g) => ({
    order_id: order.id,
    product_id: g.product_id,
    variant_id: g.variant_id,
    product_name: g.product_name,
    quantity: g.serialIds.length,
    unit_price: g.unit_price,
    total_price: g.unit_price * g.serialIds.length,
  }));
  const { data: items, error: ie } = await sb.from("order_items").insert(itemRows).select("*");
  if (ie) throw new Error(ie.message);

  const now = new Date().toISOString();
  const { data: auth } = await sb.auth.getUser();
  const { error: ue } = await sb
    .from("product_serials")
    .update({ status: "sold", sold_order_id: order.id, sold_at: now, updated_at: now })
    .in("id", uniqueSerialIds);
  if (ue) throw new Error(ue.message);

  const eventRows = (serialRows as any[]).map((r) => ({
    serial_id: r.id,
    action: "sell",
    from_status: "available",
    to_status: "sold",
    actor_id: auth?.user?.id ?? null,
    order_id: order.id,
    metadata: { source: input.source, order_number: orderNumber },
  }));
  await sb.from("product_serial_events").insert(eventRows);
  await sb.rpc("sync_stock_from_serials");

  return { order, items: items ?? [] };
}
