"use server";

import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runTwoWayStockSync } from "./serials.functions";
import { syncSerialsAndStockToSheetSilently } from "./serials-sheets.functions";

/**
 * Offline / manual-channel order creation + serial reassignment.
 *
 * Flow this backs (masterpanel "Offline Orders" section):
 *  1. Staff creates an order shell with customer info + a channel/source
 *     (offline counter sale, Facebook Page, WhatsApp, TikTok, Instagram).
 *  2. Staff continuously scans product serials into a working list.
 *  3. On confirm, `createOfflineOrder` groups scanned serials by
 *     product+variant into `order_items` (quantity = count of that
 *     product's serials), marks each `product_serials` row `sold` against
 *     the new order, and logs a `product_serial_events` row per unit.
 *
 * Because it writes into the same `orders` / `order_items` tables as the
 * storefront, it's automatically picked up by existing revenue dashboards,
 * invoice PDF/email senders, and Google Docs export — no separate ledger.
 */

const SOURCES = ["offline", "page", "whatsapp", "tiktok", "instagram"] as const;
const STATUSES = ["available", "sold", "cancelled", "returned", "defective"] as const;

async function assertStaff(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_section_access", { _user_id: userId, _section: "sales" });
  if (!data) throw new Error("Forbidden");
}

const assertAdminOrMod = assertStaff;

async function recomputeOrderTotals(sb: any, orderId: string) {
  const { data: items } = await sb.from("order_items").select("total_price").eq("order_id", orderId);
  const subtotal = (items ?? []).reduce((s: number, i: any) => s + Number(i.total_price || 0), 0);
  const { data: order } = await sb
    .from("orders")
    .select("shipping_fee, coupon_discount, loyalty_discount")
    .eq("id", orderId)
    .maybeSingle();
  const shippingFee = Number(order?.shipping_fee || 0);
  const discounts = Number(order?.coupon_discount || 0) + Number(order?.loyalty_discount || 0);
  const total = Math.max(0, subtotal + shippingFee - discounts);
  await sb
    .from("orders")
    .update({ subtotal, total, updated_at: new Date().toISOString() })
    .eq("id", orderId);
  return { subtotal, total };
}

function findLineQuery(sb: any, orderId: string, productId: string, variantId: string | null) {
  let q = sb.from("order_items").select("id, quantity, unit_price").eq("order_id", orderId).eq("product_id", productId);
  q = variantId ? q.eq("variant_id", variantId) : q.is("variant_id", null);
  return q.maybeSingle();
}

/** Create an offline/manual-channel order from a batch of scanned serials. */
export const createOfflineOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        customerName: z.string().trim().min(1).max(160),
        phone: z.string().trim().max(40).optional(),
        email: z.string().trim().max(200).optional(),
        address: z.string().trim().max(500).optional(),
        source: z.enum(SOURCES).default("offline"),
        notes: z.string().max(1000).optional(),
        serialIds: z.array(z.string().uuid()).max(300).default([]),
        shippingFee: z.number().min(0).default(0),
        isDeliveryPrepaid: z.boolean().default(false),
        deliveryPrepaidAmount: z.number().min(0).optional(),
        items: z
          .array(
            z.object({
              serialId: z.string().uuid(),
              soldPrice: z.number().min(0),
              mainPrice: z.number().min(0).optional(),
              discount: z.number().min(0).optional(),
            })
          )
          .optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    const sb: any = context.supabase;

    const uniqueSerialIds = [...new Set(data.serialIds)];
    let serialRows: any[] = [];
    if (uniqueSerialIds.length > 0) {
      const { data: rows, error: se } = await sb
        .from("product_serials")
        .select("id, serial_code, status, product_id, variant_id, products(name, price, compare_at_price), product_variants(size, color, sku, price_override)")
        .in("id", uniqueSerialIds);
      if (se) throw new Error(se.message);
      if (!rows || rows.length !== uniqueSerialIds.length) {
        throw new Error("Some scanned serials could not be found — they may have been deleted mid-scan.");
      }
      const notAvailable = rows.filter((r: any) => r.status !== "available");
      if (notAvailable.length) {
        throw new Error(`Not available for sale: ${notAvailable.map((r: any) => r.serial_code).join(", ")}`);
      }
      serialRows = rows;
    }

    const itemPriceMap = new Map<string, { soldPrice: number; mainPrice?: number; discount?: number }>();
    if (data.items) {
      for (const it of data.items) {
        itemPriceMap.set(it.serialId, {
          soldPrice: it.soldPrice,
          mainPrice: it.mainPrice,
          discount: it.discount,
        });
      }
    }

    // Group scanned units by product+variant+soldPrice -> one order_items line each.
    const groups = new Map<
      string,
      { product_id: string; variant_id: string | null; product_name: string; unit_price: number; main_price: number; serialIds: string[] }
    >();
    for (const r of serialRows) {
      const customInfo = itemPriceMap.get(r.id);
      const mainPrice = customInfo?.mainPrice !== undefined
        ? customInfo.mainPrice
        : Number(r.product_variants?.price_override || r.products?.compare_at_price || r.products?.price || 0);
      const soldPrice = customInfo?.soldPrice !== undefined ? customInfo.soldPrice : mainPrice;

      const key = `${r.product_id}::${r.variant_id ?? ""}::${soldPrice}`;
      const variantLabel = [r.product_variants?.size, r.product_variants?.color].filter(Boolean).join(" / ");
      const name = variantLabel ? `${r.products?.name ?? "Product"} (${variantLabel})` : r.products?.name ?? "Product";
      if (!groups.has(key)) {
        groups.set(key, {
          product_id: r.product_id,
          variant_id: r.variant_id ?? null,
          product_name: name,
          unit_price: soldPrice,
          main_price: mainPrice,
          serialIds: [],
        });
      }
      groups.get(key)!.serialIds.push(r.id);
    }

    const subtotal = [...groups.values()].reduce((sum, g) => sum + g.unit_price * g.serialIds.length, 0);
    const originalSubtotal = [...groups.values()].reduce((sum, g) => sum + g.main_price * g.serialIds.length, 0);
    const totalDiscount = Math.max(0, originalSubtotal - subtotal);
    const shippingFee = data.source === "offline" ? 0 : Number(data.shippingFee || 0);
    const total = subtotal + shippingFee;
    const isDeliveryPrepaid = data.source !== "offline" && !!data.isDeliveryPrepaid;
    const orderNumber = `OFL-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

    const shippingAddress: Record<string, any> = {
      full_name: data.customerName,
      phone: data.phone || null,
      email: data.email || null,
      address_line: data.address || null,
    };

    let paymentStatus = "unpaid";
    if (data.source === "offline") {
      paymentStatus = "paid";
    } else if (isDeliveryPrepaid) {
      paymentStatus = "partially_paid";
    } else if (groups.size > 0) {
      paymentStatus = "unpaid";
    }

    const { data: order, error: oe } = await sb
      .from("orders")
      .insert({
        order_number: orderNumber,
        user_id: null,
        is_guest: true,
        guest_email: data.email || null,
        guest_phone: data.phone || null,
        customer_name: data.customerName,
        status: data.source === "offline" ? "delivered" : groups.size > 0 ? "confirmed" : "pending",
        payment_status: paymentStatus,
        payment_method: data.source === "offline" ? "cash" : "cod",
        order_source: data.source,
        subtotal,
        coupon_discount: totalDiscount > 0 ? totalDiscount : 0,
        shipping_fee: shippingFee,
        is_delivery_prepaid: isDeliveryPrepaid,
        delivery_prepaid_amount: isDeliveryPrepaid ? (data.deliveryPrepaidAmount ?? shippingFee) : 0,
        total,
        shipping_address: shippingAddress,
        notes: data.notes || null,
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
    let items: any[] = [];
    if (itemRows.length > 0) {
      const { data: insertedItems, error: ie } = await sb.from("order_items").insert(itemRows).select("*");
      if (ie) throw new Error(ie.message);
      items = insertedItems ?? [];
    }

    if (uniqueSerialIds.length > 0) {
      const now = new Date().toISOString();
      const { error: ue } = await sb
        .from("product_serials")
        .update({ status: "sold", sold_order_id: order.id, sold_at: now, updated_at: now })
        .in("id", uniqueSerialIds);
      if (ue) throw new Error(ue.message);

      const eventRows = serialRows.map((r: any) => {
        const customInfo = itemPriceMap.get(r.id);
        const mainPrice = customInfo?.mainPrice !== undefined
          ? customInfo.mainPrice
          : Number(r.product_variants?.price_override || r.products?.compare_at_price || r.products?.price || 0);
        const normalDiscountPrice = Number(r.product_variants?.price_override || r.products?.price || mainPrice || 0);
        const soldPrice = customInfo?.soldPrice !== undefined ? customInfo.soldPrice : normalDiscountPrice;
        const discount = customInfo?.discount !== undefined ? customInfo.discount : Math.max(0, mainPrice - soldPrice);
        const isOverride = customInfo?.soldPrice !== undefined ? customInfo.soldPrice !== normalDiscountPrice : false;
        return {
          serial_id: r.id,
          action: "sell",
          from_status: "available",
          to_status: "sold",
          actor_id: context.userId,
          order_id: order.id,
          metadata: {
            source: data.source,
            order_number: orderNumber,
            main_price: mainPrice,
            discounted_price: normalDiscountPrice,
            sold_price: soldPrice,
            discount,
            is_override: isOverride,
          },
        };
      });
      await sb.from("product_serial_events").insert(eventRows);
      await runTwoWayStockSync(sb);

      // Auto-update connected Google Sheets in real-time
      await syncSerialsAndStockToSheetSilently(sb);
    }

    return { order, items };
  });

/** Look up recent orders by order number, for the "assign to a different order" picker. */
export const searchOrdersForAssignment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    let q = context.supabase
      .from("orders")
      .select("id, order_number, customer_name, status, total, created_at")
      .order("created_at", { ascending: false })
      .limit(25);
    if (data.search) q = q.ilike("order_number", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/**
 * Change a serial's status and/or move it to a different order, keeping the
 * order's line items, totals, and (by extension, since invoices/PDFs render
 * live from these tables) its invoice in sync.
 */
export const reassignSerial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        serialId: z.string().uuid(),
        newStatus: z.enum(STATUSES),
        orderId: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    const sb: any = context.supabase;

    const { data: serial, error } = await sb
      .from("product_serials")
      .select("id, serial_code, status, product_id, variant_id, sold_order_id, products(name, price)")
      .eq("id", data.serialId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!serial) throw new Error("Serial not found");

    const prevOrderId: string | null = serial.sold_order_id ?? null;
    const nextOrderId: string | null = data.newStatus === "sold" ? data.orderId ?? prevOrderId ?? null : null;

    if (data.newStatus === "sold" && !nextOrderId) {
      throw new Error("Pick an order to assign this serial to.");
    }

    // Detach from its previous order's line item (decrement/delete + recompute totals).
    if (prevOrderId && prevOrderId !== nextOrderId) {
      const item = await findLineQuery(sb, prevOrderId, serial.product_id, serial.variant_id ?? null);
      if (item.data) {
        if (item.data.quantity <= 1) {
          await sb.from("order_items").delete().eq("id", item.data.id);
        } else {
          const qty = item.data.quantity - 1;
          await sb.from("order_items").update({ quantity: qty, total_price: qty * item.data.unit_price }).eq("id", item.data.id);
        }
      }
      await recomputeOrderTotals(sb, prevOrderId);
      const { count } = await sb.from("order_items").select("id", { count: "exact", head: true }).eq("order_id", prevOrderId);
      if ((count ?? 0) === 0) {
        await sb.from("orders").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", prevOrderId);
      }
    }

    // Attach to the new order's line item (increment/create + recompute totals).
    if (nextOrderId && nextOrderId !== prevOrderId) {
      const item = await findLineQuery(sb, nextOrderId, serial.product_id, serial.variant_id ?? null);
      if (item.data) {
        const qty = item.data.quantity + 1;
        await sb.from("order_items").update({ quantity: qty, total_price: qty * item.data.unit_price }).eq("id", item.data.id);
      } else {
        const unitPrice = Number(serial.products?.price ?? 0);
        await sb.from("order_items").insert({
          order_id: nextOrderId,
          product_id: serial.product_id,
          variant_id: serial.variant_id,
          product_name: serial.products?.name ?? "Product",
          quantity: 1,
          unit_price: unitPrice,
          total_price: unitPrice,
        });
      }
      await recomputeOrderTotals(sb, nextOrderId);
    }

    const update: Record<string, any> = {
      status: data.newStatus,
      sold_order_id: nextOrderId,
      updated_at: new Date().toISOString(),
    };
    if (data.newStatus === "sold" && (serial.status !== "sold" || prevOrderId !== nextOrderId)) {
      update.sold_at = new Date().toISOString();
    }

    const { data: updated, error: ue } = await sb
      .from("product_serials")
      .update(update)
      .eq("id", serial.id)
      .select("id, serial_code, status, sold_order_id")
      .maybeSingle();
    if (ue) throw new Error(ue.message);

    await sb.from("product_serial_events").insert({
      serial_id: serial.id,
      action: nextOrderId !== prevOrderId ? "reassign" : "status_change",
      from_status: serial.status,
      to_status: data.newStatus,
      actor_id: context.userId,
      order_id: nextOrderId,
      metadata: { prevOrderId, nextOrderId },
    });

    await runTwoWayStockSync(sb);
    return updated;
  });
