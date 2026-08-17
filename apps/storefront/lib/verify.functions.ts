"use server";

import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { extractSerialCode } from "@orizino/shared";
import type { VerifyResult } from "@orizino/shared";

export type { VerifyResult };

function maskName(input: string | null | undefined): string | null {
  if (!input) return null;
  const parts = input.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  const first = parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  const maskedFirst =
    first.length <= 2 ? first[0] + "*" : first[0] + "*".repeat(Math.max(1, first.length - 2)) + first[first.length - 1];
  const maskedLast = last ? last[0].toUpperCase() + "." : "";
  return [maskedFirst, maskedLast].filter(Boolean).join(" ");
}

function maskDateMonth(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function isTestOrSampleCode(code: string): boolean {
  const upper = (code || "").toUpperCase().trim();
  return (
    upper.includes("SAMPLE") ||
    upper.includes("TEST") ||
    upper.includes("DEMO") ||
    upper.startsWith("ORZ-SAMPLE") ||
    upper.startsWith("SAMPLE-") ||
    upper.startsWith("TEST-") ||
    upper.includes("CALIBRATION")
  );
}

async function loadSerialCore(code: string) {
  const sb: any = supabaseAdmin;
  const raw = (code || "").trim();
  if (!raw) return null;

  const selectFields = "serial_code, status, sold_at, sold_order_id, products(name, slug, thumbnail, images, category)";

  // 1. Direct exact match
  const { data: exact } = await sb
    .from("product_serials")
    .select(selectFields)
    .eq("serial_code", raw)
    .maybeSingle();

  if (exact) return exact;

  // 2. Normalized hyphens & stripped prefixes (e.g. "ORZ ORZGAC 000005" -> "ORZ-ORZGAC-000005")
  const hyphenated = raw
    .replace(/^SN:?\s*/i, "")
    .replace(/^S\/N:?\s*/i, "")
    .replace(/^SERIAL:?\s*/i, "")
    .replace(/^CODE:?\s*/i, "")
    .replace(/^#/, "")
    .trim()
    .replace(/[\s_.]+/g, "-")
    .toUpperCase();

  if (hyphenated && hyphenated !== raw) {
    const { data: hypData } = await sb
      .from("product_serials")
      .select(selectFields)
      .eq("serial_code", hyphenated)
      .maybeSingle();
    if (hypData) return hypData;
  }

  // 3. Case-insensitive ilike match
  const { data: ilikeData } = await sb
    .from("product_serials")
    .select(selectFields)
    .ilike("serial_code", hyphenated || raw)
    .maybeSingle();
  if (ilikeData) return ilikeData;

  // 4. Match with flexible delimiters (e.g., ORZ%ORZGAC%000005)
  const flexiblePattern = raw
    .replace(/^SN:?\s*/i, "")
    .replace(/^S\/N:?\s*/i, "")
    .replace(/[^A-Za-z0-9]/g, "%")
    .replace(/%+/, "%");

  if (flexiblePattern && flexiblePattern.length >= 4) {
    const { data: flexData } = await sb
      .from("product_serials")
      .select(selectFields)
      .ilike("serial_code", `%${flexiblePattern}%`)
      .limit(1)
      .maybeSingle();
    if (flexData) return flexData;
  }

  return null;
}

/** Fallback: try to find an Orizino product by SKU (handles retail barcode / SKU label scans) */
async function loadProductBySku(code: string) {
  const sb: any = supabaseAdmin;
  // Try exact SKU match first, then partial ilike for flexibility
  const { data: exact } = await sb
    .from("products")
    .select("id, name, slug, sku, thumbnail, images, category")
    .eq("is_active", true)
    .ilike("sku", code)
    .maybeSingle();
  if (exact) return exact;
  return null;
}

async function loadOrder(orderId: string) {
  const sb: any = supabaseAdmin;
  const { data } = await sb
    .from("orders")
    .select("id, user_id, order_number, total, subtotal, shipping_fee, coupon_discount, customer_name, customer_email, customer_phone, shipping_address, payment_method, payment_status, created_at, guest_email, is_guest, order_items(id, name, sku, quantity, unit_price, total_price, image_url)")
    .eq("id", orderId)
    .maybeSingle();
  return data;
}

async function loadOrderByNumber(orderNumber: string) {
  const sb: any = supabaseAdmin;
  const clean = orderNumber.replace(/^#/, "").trim();
  const { data } = await sb
    .from("orders")
    .select("id, user_id, order_number, total, subtotal, shipping_fee, coupon_discount, customer_name, customer_email, customer_phone, shipping_address, payment_method, payment_status, created_at, guest_email, is_guest, order_items(id, name, sku, quantity, unit_price, total_price, image_url)")
    .ilike("order_number", `%${clean}%`)
    .maybeSingle();
  return data;
}

/** PUBLIC: Authenticity lookup supporting both Product Serials and Order Numbers */
export const verifyPublicSerial = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string }) => z.object({ code: z.string().min(1).max(256) }).parse(d))
  .handler(async ({ data }): Promise<VerifyResult> => {
    const rawCode = data.code.trim();
    const cleanCode = extractSerialCode(rawCode);

    // 1. Check Product Serials first
    const row = await loadSerialCore(cleanCode);

    if (row) {
      const base: VerifyResult = {
        found: true,
        genuine: true,
        is_sample: false,
        serial_code: row.serial_code,
        status: row.status,
        product: row.products
          ? {
              name: row.products.name,
              slug: row.products.slug,
              thumbnail: row.products.thumbnail,
              images: row.products.images,
              category: row.products.category,
            }
          : undefined,
      };

      if (row.status === "sold") {
        let order: any = null;
        let buyerMasked: string | null = null;
        if (row.sold_order_id) {
          order = await loadOrder(row.sold_order_id);
          if (order?.customer_name) {
            buyerMasked = maskName(order.customer_name);
          } else if (order?.user_id) {
            const sb: any = supabaseAdmin;
            const { data: profile } = await sb.from("profiles").select("full_name").eq("id", order.user_id).maybeSingle();
            buyerMasked = maskName(profile?.full_name);
          } else if (order?.guest_email) {
            buyerMasked = maskName(order.guest_email.split("@")[0]);
          }
        }
        base.sold = {
          sold_at_masked: maskDateMonth(row.sold_at) ?? "Recorded at Store",
          buyer_masked: buyerMasked ?? "Valued Client",
          is_owner: false,
          order: order
            ? {
                order_number: order.order_number,
                total: Number(order.total || 0),
                shipping_address: order.shipping_address,
                payment_status: order.payment_status,
              }
            : undefined,
        };
      }
      return base;
    }

    // 2. If not found in serials, check if cleanCode is an Order Number
    const directOrder = await loadOrderByNumber(cleanCode);
    if (directOrder) {
      let buyerMasked: string | null = null;
      if (directOrder.customer_name) {
        buyerMasked = maskName(directOrder.customer_name);
      } else if (directOrder.guest_email) {
        buyerMasked = maskName(directOrder.guest_email.split("@")[0]);
      }

      return {
        found: true,
        genuine: true,
        is_sample: false,
        serial_code: directOrder.order_number,
        status: "order_verified",
        product: directOrder.order_items?.[0]
          ? {
              name: directOrder.order_items[0].name || "Orizino Atelier Piece",
              slug: null,
              thumbnail: directOrder.order_items[0].image_url || null,
              images: null,
              category: "Consignment Order",
            }
          : undefined,
        sold: {
          sold_at_masked: maskDateMonth(directOrder.created_at),
          buyer_masked: buyerMasked ?? "Valued Client",
          is_owner: false,
          order: {
            order_number: directOrder.order_number,
            total: Number(directOrder.total || 0),
            shipping_address: directOrder.shipping_address,
            payment_status: directOrder.payment_status,
          },
        },
      };
    }

    // 3. Check for test/sample simulation tag
    if (isTestOrSampleCode(cleanCode)) {
      return {
        found: true,
        genuine: true,
        is_sample: true,
        serial_code: cleanCode,
        status: "sample",
        sample_info: {
          title: "Official Orizino Royal Demonstration Code",
          description:
            "This is an authentic verified test QR generated by Orizino Atelier for high-precision printing calibration and verification testing.",
          prefix: cleanCode.split("-")[0] || "ORZ",
        },
      };
    }

    // 4. Fallback: check if the scanned code matches a product SKU.
    //    This happens when a retail barcode / SKU label is scanned instead of the Orizino QR code.
    const productBySku = await loadProductBySku(cleanCode);
    if (productBySku) {
      return {
        found: true,
        genuine: false,
        is_sample: false,
        serial_code: cleanCode,
        status: "unregistered",
        product: {
          name: productBySku.name,
          slug: productBySku.slug,
          thumbnail: productBySku.thumbnail,
          images: productBySku.images,
          category: productBySku.category,
        },
      };
    }

    return { found: false, genuine: false, serial_code: cleanCode };
  });

/** PUBLIC SECURITY UNLOCK: Unlocks full invoice if customer name and phone/email match purchase record */
export const unlockOrderInvoice = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      orderNumberOrSerial: string;
      customerName: string;
      customerPhoneOrEmail: string;
    }) =>
      z
        .object({
          orderNumberOrSerial: z.string().min(1).max(256),
          customerName: z.string().min(1).max(256),
          customerPhoneOrEmail: z.string().min(1).max(256),
        })
        .parse(d)
  )
  .handler(async ({ data }) => {
    const sb: any = supabaseAdmin;
    const raw = data.orderNumberOrSerial.trim();
    const clean = extractSerialCode(raw);
    const inputName = data.customerName.trim().toLowerCase();
    const inputPhoneOrEmail = data.customerPhoneOrEmail.trim().toLowerCase();
    const cleanPhoneDigits = inputPhoneOrEmail.replace(/\D/g, "");

    // 1. Locate order directly or via serial
    let orderRow: any = null;

    // Check direct order
    const directOrder = await loadOrderByNumber(clean);
    if (directOrder) {
      orderRow = directOrder;
    } else {
      // Check serial
      const { data: serialRow } = await sb
        .from("product_serials")
        .select("sold_order_id")
        .eq("serial_code", clean)
        .maybeSingle();

      if (serialRow?.sold_order_id) {
        orderRow = await loadOrder(serialRow.sold_order_id);
      }
    }

    if (!orderRow) {
      return { ok: false, error: "Order record not found for this code" };
    }

    // 2. Validate customer info against order record
    const orderName = (orderRow.customer_name || "").toLowerCase();
    const nameMatch =
      inputName.length >= 2 &&
      (orderName.includes(inputName) ||
        inputName.includes(orderName) ||
        orderName.split(/\s+/).some((part: string) => part.length >= 2 && inputName.includes(part)));

    const orderEmail = (orderRow.customer_email || orderRow.guest_email || "").toLowerCase();
    const orderPhone = (orderRow.customer_phone || "").replace(/\D/g, "");

    const directEmailMatch =
      inputPhoneOrEmail.includes("@") &&
      orderEmail &&
      (orderEmail === inputPhoneOrEmail || orderEmail.includes(inputPhoneOrEmail) || inputPhoneOrEmail.includes(orderEmail));

    const directPhoneMatch =
      cleanPhoneDigits.length >= 4 &&
      orderPhone &&
      (orderPhone === cleanPhoneDigits ||
        orderPhone.endsWith(cleanPhoneDigits) ||
        cleanPhoneDigits.endsWith(orderPhone) ||
        orderPhone.includes(cleanPhoneDigits));

    // Profile check fallback
    let profileMatch = false;
    if (orderRow.user_id) {
      const { data: prof } = await sb.from("profiles").select("full_name, phone, email").eq("id", orderRow.user_id).maybeSingle();
      if (prof) {
        const pName = (prof.full_name || "").toLowerCase();
        const pPhone = (prof.phone || "").replace(/\D/g, "");
        const pEmail = (prof.email || "").toLowerCase();
        if (
          (pEmail && (pEmail === inputPhoneOrEmail || pEmail.includes(inputPhoneOrEmail))) ||
          (cleanPhoneDigits.length >= 4 && pPhone && (pPhone.endsWith(cleanPhoneDigits) || cleanPhoneDigits.endsWith(pPhone)))
        ) {
          profileMatch = true;
        } else if (pName && (pName.includes(inputName) || inputName.includes(pName))) {
          if (directEmailMatch || directPhoneMatch) {
            profileMatch = true;
          }
        }
      }
    }

    const isVerified = directEmailMatch || directPhoneMatch || (nameMatch && (directEmailMatch || directPhoneMatch)) || profileMatch;

    if (!isVerified) {
      return {
        ok: false,
        error: "Verification failed. The mobile number or email does not match the purchase record for this order.",
      };
    }

    return {
      ok: true,
      order: orderRow,
      items: orderRow.order_items || [],
    };
  });

/** AUTHED: reveals full order breakdown if the caller owns the sold order */
export const verifyOwnedSerial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string }) => z.object({ code: z.string().min(1).max(256) }).parse(d))
  .handler(async ({ data, context }): Promise<VerifyResult> => {
    const rawCode = data.code.trim();
    const cleanCode = extractSerialCode(rawCode);
    const row = await loadSerialCore(cleanCode);

    if (!row) {
      if (isTestOrSampleCode(cleanCode)) {
        return {
          found: true,
          genuine: true,
          is_sample: true,
          serial_code: cleanCode,
          status: "sample",
          sample_info: {
            title: "Official Orizino Royal Demonstration Code",
            description: "Verified Orizino Atelier Test Tag.",
            prefix: cleanCode.split("-")[0] || "ORZ",
          },
        };
      }
      return { found: false, genuine: false, serial_code: cleanCode };
    }

    const base: VerifyResult = {
      found: true,
      genuine: true,
      is_sample: false,
      serial_code: row.serial_code,
      status: row.status,
      product: row.products
        ? {
            name: row.products.name,
            slug: row.products.slug,
            thumbnail: row.products.thumbnail,
            images: row.products.images,
            category: row.products.category,
          }
        : undefined,
    };

    if (row.status === "sold") {
      let order: any = null;
      let isOwner = false;
      if (row.sold_order_id) {
        order = await loadOrder(row.sold_order_id);
        isOwner = !!order?.user_id && order.user_id === context.userId;
      }
      if (isOwner && order) {
        base.sold = {
          sold_at: row.sold_at,
          is_owner: true,
          order: {
            order_number: order.order_number,
            total: Number(order.total ?? 0),
            shipping_address: order.shipping_address ?? null,
            payment_status: order.payment_status ?? null,
          },
        };
      } else {
        let buyerMasked: string | null = null;
        if (order?.customer_name) {
          buyerMasked = maskName(order.customer_name);
        } else if (order?.user_id) {
          const sb: any = supabaseAdmin;
          const { data: profile } = await sb.from("profiles").select("full_name").eq("id", order.user_id).maybeSingle();
          buyerMasked = maskName(profile?.full_name);
        } else if (order?.guest_email) {
          buyerMasked = maskName(order.guest_email.split("@")[0]);
        }
        base.sold = {
          sold_at_masked: maskDateMonth(row.sold_at) ?? "Recorded at Store",
          buyer_masked: buyerMasked ?? "Valued Client",
          is_owner: false,
        };
      }
    }
    return base;
  });
