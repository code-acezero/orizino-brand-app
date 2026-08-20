import { supabase } from "./supabase";

// The @orizino/sb generated Database type predates product_serials,
// product_serial_events, and the orders.order_source/customer_name columns
// (added in later migrations) — masterpanel's own server functions work
// around the same drift with `as any` at these exact call sites. Same fix
// here, scoped to just the tables/columns affected.
const sb = supabase as any;

/**
 * Direct client-side ports of masterpanel's serial-related server functions.
 * They're safe to run straight from the browser because they were already
 * only using the RLS-scoped (anon-key + user session) Supabase client, never
 * the service role — see requireSupabaseAuth in packages/sb. The real
 * security boundary is the `product_serials` / `orders` / `order_items` RLS
 * policies (has_section_access(uid, 'sales')), which apply identically here.
 */

export interface SerialLookupRow {
  id: string;
  serial_code: string;
  status: "available" | "sold" | "cancelled" | "returned" | "defective";
  product_id: string;
  variant_id: string | null;
  sold_order_id: string | null;
  sold_at: string | null;
  products: { name: string; sku: string; price: number; compare_at_price: number | null; thumbnail: string | null } | null;
  product_variants: { size: string | null; color: string | null; sku: string | null } | null;
  orders?: {
    id: string;
    order_number: string;
    customer_name: string | null;
    guest_name: string | null;
    guest_phone: string | null;
    status: string;
    total: number;
    created_at: string;
    shipping_address?: any;
  } | null;
}

export async function lookupSerial(code: string): Promise<SerialLookupRow | null> {
  const { data, error } = await sb
    .from("product_serials")
    .select(
      "id, serial_code, status, product_id, variant_id, sold_order_id, sold_at, products(name, sku, price, compare_at_price, thumbnail), product_variants(size, color, sku), orders:sold_order_id(id, order_number, customer_name, guest_name, guest_phone, status, total, created_at, shipping_address)",
    )
    .eq("serial_code", code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as any;
}

export async function searchOrdersForAssignment(search?: string) {
  let q = sb
    .from("orders")
    .select("id, order_number, customer_name, status, total, created_at")
    .order("created_at", { ascending: false })
    .limit(25);
  if (search) q = q.ilike("order_number", `%${search}%`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function recomputeOrderTotals(orderId: string) {
  const { data: items } = await sb.from("order_items").select("total_price").eq("order_id", orderId);
  const subtotal = (items ?? []).reduce((s, i: any) => s + Number(i.total_price || 0), 0);
  const { data: order } = await sb
    .from("orders")
    .select("shipping_fee, coupon_discount, loyalty_discount")
    .eq("id", orderId)
    .maybeSingle();
  const shippingFee = Number((order as any)?.shipping_fee || 0);
  const discounts = Number((order as any)?.coupon_discount || 0) + Number((order as any)?.loyalty_discount || 0);
  const total = Math.max(0, subtotal + shippingFee - discounts);
  await sb.from("orders").update({ subtotal, total, updated_at: new Date().toISOString() }).eq("id", orderId);
}

function findLineQuery(orderId: string, productId: string, variantId: string | null) {
  let q = sb.from("order_items").select("id, quantity, unit_price").eq("order_id", orderId).eq("product_id", productId);
  q = variantId ? q.eq("variant_id", variantId) : q.is("variant_id", null);
  return q.maybeSingle();
}

export async function reassignSerial(input: {
  serialId: string;
  newStatus: "available" | "sold" | "cancelled" | "returned" | "defective";
  orderId?: string | null;
}) {
  const { data: serial, error } = await sb
    .from("product_serials")
    .select("id, serial_code, status, product_id, variant_id, sold_order_id, products(name, price)")
    .eq("id", input.serialId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!serial) throw new Error("Serial not found");

  const prevOrderId: string | null = (serial as any).sold_order_id ?? null;
  const nextOrderId: string | null = input.newStatus === "sold" ? input.orderId ?? prevOrderId ?? null : null;
  if (input.newStatus === "sold" && !nextOrderId) throw new Error("Pick an order to assign this serial to.");

  if (prevOrderId && prevOrderId !== nextOrderId) {
    const item = await findLineQuery(prevOrderId, (serial as any).product_id, (serial as any).variant_id ?? null);
    if (item.data) {
      if (item.data.quantity <= 1) {
        await sb.from("order_items").delete().eq("id", item.data.id);
      } else {
        const qty = item.data.quantity - 1;
        await sb.from("order_items").update({ quantity: qty, total_price: qty * item.data.unit_price }).eq("id", item.data.id);
      }
    }
    await recomputeOrderTotals(prevOrderId);
    const { count } = await sb.from("order_items").select("id", { count: "exact", head: true }).eq("order_id", prevOrderId);
    if ((count ?? 0) === 0) {
      await sb.from("orders").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", prevOrderId);
    }
  }

  if (nextOrderId && nextOrderId !== prevOrderId) {
    const item = await findLineQuery(nextOrderId, (serial as any).product_id, (serial as any).variant_id ?? null);
    if (item.data) {
      const qty = item.data.quantity + 1;
      await sb.from("order_items").update({ quantity: qty, total_price: qty * item.data.unit_price }).eq("id", item.data.id);
    } else {
      const unitPrice = Number((serial as any).products?.price ?? 0);
      await sb.from("order_items").insert({
        order_id: nextOrderId,
        product_id: (serial as any).product_id,
        variant_id: (serial as any).variant_id,
        product_name: (serial as any).products?.name ?? "Product",
        quantity: 1,
        unit_price: unitPrice,
        total_price: unitPrice,
      });
    }
    await recomputeOrderTotals(nextOrderId);
  }

  const update: Record<string, any> = {
    status: input.newStatus,
    sold_order_id: nextOrderId,
    updated_at: new Date().toISOString(),
  };
  if (input.newStatus === "sold" && ((serial as any).status !== "sold" || prevOrderId !== nextOrderId)) {
    update.sold_at = new Date().toISOString();
  }

  const { data: updated, error: ue } = await sb
    .from("product_serials")
    .update(update)
    .eq("id", (serial as any).id)
    .select("id, serial_code, status, sold_order_id")
    .maybeSingle();
  if (ue) throw new Error(ue.message);

  await sb.from("product_serial_events").insert({
    serial_id: (serial as any).id,
    action: nextOrderId !== prevOrderId ? "reassign" : "status_change",
    from_status: (serial as any).status,
    to_status: input.newStatus,
    order_id: nextOrderId,
    metadata: { prevOrderId, nextOrderId },
  });

  await sb.rpc("sync_stock_from_serials");
  return updated;
}
