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
  const { data, error } = await sb
    .from("product_serials")
    .select(
      "serial_code, status, sold_at, sold_order_id, products(name, slug, thumbnail, images, category)",
    )
    .eq("serial_code", code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
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

      if (row.status === "sold" && row.sold_order_id) {
        const order = await loadOrder(row.sold_order_id);
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
          sold_at_masked: maskDateMonth(row.sold_at),
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

    if (row.status === "sold" && row.sold_order_id) {
      const order = await loadOrder(row.sold_order_id);
      const isOwner = !!order?.user_id && order.user_id === context.userId;
      if (isOwner) {
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
          sold_at_masked: maskDateMonth(row.sold_at),
          buyer_masked: buyerMasked ?? "Valued Client",
          is_owner: false,
        };
      }
    }
    return base;
  });
