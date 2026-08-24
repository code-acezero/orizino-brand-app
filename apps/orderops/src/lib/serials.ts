"use client";

import { supabase } from "./supabase";

const sb = supabase as any;

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

export function extractSerialCode(raw: string): string {
  if (!raw) return "";
  let trimmed = raw.trim().replace(/[\r\n\t]/g, "");

  // 1. JSON parsing
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.serial_code) return String(parsed.serial_code).trim();
      if (parsed.serial) return String(parsed.serial).trim();
      if (parsed.sku) return String(parsed.sku).trim();
      if (parsed.barcode) return String(parsed.barcode).trim();
      if (parsed.code) return String(parsed.code).trim();
      if (parsed.id) return String(parsed.id).trim();
    } catch {
      /* ignore */
    }
  }

  // 2. URL parsing (QR codes)
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      const param =
        url.searchParams.get("serial") ||
        url.searchParams.get("code") ||
        url.searchParams.get("s") ||
        url.searchParams.get("sku") ||
        url.searchParams.get("barcode") ||
        url.searchParams.get("id") ||
        url.searchParams.get("v");
      if (param) return param.trim();
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length > 0) return parts[parts.length - 1].trim();
    } catch {
      /* ignore */
    }
  }

  return trimmed;
}

/**
 * Universal Smart Product & Serial Resolver
 * Resolves Serial Codes, Product SKUs, Variant Barcodes, Product Barcodes, IDs, and Slugs
 */
export async function lookupSerial(rawCode: string): Promise<SerialLookupRow | null> {
  const code = extractSerialCode(rawCode);
  if (!code) return null;

  try {
    // Step 1: Direct match on product_serials (case-insensitive)
    const { data: serialRow } = await sb
      .from("product_serials")
      .select(
        "id, serial_code, status, product_id, variant_id, sold_order_id, sold_at, products(name, sku, price, compare_at_price, thumbnail), product_variants(size, color, sku), orders:sold_order_id(id, order_number, customer_name, guest_name, guest_phone, status, total, created_at, shipping_address)",
      )
      .ilike("serial_code", code)
      .limit(1)
      .maybeSingle();

    if (serialRow) {
      return serialRow as any;
    }

    // Step 2: Try variant barcode or SKU
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code);
    let variantQuery = sb
      .from("product_variants")
      .select(
        "id, product_id, size, color, sku, barcode, stock_quantity, products(name, sku, price, compare_at_price, thumbnail)",
      );

    if (isUuid) {
      variantQuery = variantQuery.or(`id.eq.${code},sku.ilike.${code},barcode.ilike.${code}`);
    } else {
      variantQuery = variantQuery.or(`sku.ilike.${code},barcode.ilike.${code}`);
    }

    const { data: variantRow } = await variantQuery.limit(1).maybeSingle();

    if (variantRow) {
      // Check if an available serial exists for this variant
      const { data: availableSerial } = await sb
        .from("product_serials")
        .select(
          "id, serial_code, status, product_id, variant_id, sold_order_id, sold_at, products(name, sku, price, compare_at_price, thumbnail), product_variants(size, color, sku), orders:sold_order_id(id, order_number, customer_name, guest_name, guest_phone, status, total, created_at, shipping_address)",
        )
        .eq("variant_id", variantRow.id)
        .eq("status", "available")
        .limit(1)
        .maybeSingle();

      if (availableSerial) {
        return availableSerial as any;
      }

      // Synthesize available inventory unit
      return {
        id: variantRow.id,
        serial_code: variantRow.sku || variantRow.barcode || code,
        status: "available",
        product_id: variantRow.product_id,
        variant_id: variantRow.id,
        sold_order_id: null,
        sold_at: null,
        products: variantRow.products as any,
        product_variants: {
          size: variantRow.size,
          color: variantRow.color,
          sku: variantRow.sku,
        },
      };
    }

    // Step 3: Try product barcode, SKU, slug, or ID
    let prodQuery = sb
      .from("products")
      .select("id, name, sku, barcode, slug, price, compare_at_price, thumbnail, stock_quantity");

    if (isUuid) {
      prodQuery = prodQuery.or(`id.eq.${code},sku.ilike.${code},barcode.ilike.${code}`);
    } else {
      prodQuery = prodQuery.or(`sku.ilike.${code},barcode.ilike.${code},slug.ilike.${code},name.ilike.%${code}%`);
    }

    const { data: productRow } = await prodQuery.limit(1).maybeSingle();

    if (productRow) {
      // Check if an available serial exists for this product
      const { data: availableSerial } = await sb
        .from("product_serials")
        .select(
          "id, serial_code, status, product_id, variant_id, sold_order_id, sold_at, products(name, sku, price, compare_at_price, thumbnail), product_variants(size, color, sku), orders:sold_order_id(id, order_number, customer_name, guest_name, guest_phone, status, total, created_at, shipping_address)",
        )
        .eq("product_id", productRow.id)
        .eq("status", "available")
        .limit(1)
        .maybeSingle();

      if (availableSerial) {
        return availableSerial as any;
      }

      // Synthesize available inventory unit
      return {
        id: productRow.id,
        serial_code: productRow.sku || productRow.barcode || code,
        status: "available",
        product_id: productRow.id,
        variant_id: null,
        sold_order_id: null,
        sold_at: null,
        products: {
          name: productRow.name,
          sku: productRow.sku,
          price: Number(productRow.price || 0),
          compare_at_price: productRow.compare_at_price ? Number(productRow.compare_at_price) : null,
          thumbnail: productRow.thumbnail,
        },
        product_variants: null,
      };
    }
  } catch (err) {
    console.error("lookupSerial error:", err);
  }

  return null;
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
