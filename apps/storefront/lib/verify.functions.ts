import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";




export type VerifyResult = {
  found: boolean;
  genuine: boolean;
  serial_code?: string;
  status?: string;
  product?: { name: string; slug: string | null; thumbnail: string | null; images: string[] | null };
  sold?: {
    sold_at_masked?: string | null;   // e.g. "Sold in Mar 2026" for non-buyers
    sold_at?: string | null;           // full ISO only for buyer
    buyer_masked?: string | null;      // e.g. "A***a K."
    is_owner?: boolean;
    order?: {                          // buyer-only
      order_number: string;
      total: number;
      shipping_address: any;
      payment_status: string | null;
    };
  };
};

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

async function loadSerialCore(code: string) {
  const sb: any = supabaseAdmin;
  const { data, error } = await sb
    .from("product_serials")
    .select(
      "serial_code, status, sold_at, sold_order_id, products(name, slug, thumbnail, images)",
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
    .select("id, user_id, order_number, total, shipping_address, payment_status, guest_email, is_guest")
    .eq("id", orderId)
    .maybeSingle();
  return data;
}

/** PUBLIC: no auth. Returns masked buyer info. */
export const verifyPublicSerial = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string }) => z.object({ code: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data }): Promise<VerifyResult> => {
    const row = await loadSerialCore(data.code.trim());
    if (!row) return { found: false, genuine: false };
    const base: VerifyResult = {
      found: true,
      genuine: true,
      serial_code: row.serial_code,
      status: row.status,
      product: row.products
        ? {
            name: row.products.name,
            slug: row.products.slug,
            thumbnail: row.products.thumbnail,
            images: row.products.images,
          }
        : undefined,
    };
    if (row.status === "sold" && row.sold_order_id) {
      const order = await loadOrder(row.sold_order_id);
      let buyerMasked: string | null = null;
      if (order?.user_id) {
        const sb: any = supabaseAdmin;
        const { data: profile } = await sb.from("profiles").select("full_name").eq("id", order.user_id).maybeSingle();
        buyerMasked = maskName(profile?.full_name);
      } else if (order?.guest_email) {
        buyerMasked = maskName(order.guest_email.split("@")[0]);
      }
      base.sold = {
        sold_at_masked: maskDateMonth(row.sold_at),
        buyer_masked: buyerMasked ?? "Customer",
        is_owner: false,
      };
    }
    return base;
  });

/** AUTHED: reveals full info if the caller owns the sold order. */
export const verifyOwnedSerial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string }) => z.object({ code: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }): Promise<VerifyResult> => {
    const row = await loadSerialCore(data.code.trim());
    if (!row) return { found: false, genuine: false };
    const base: VerifyResult = {
      found: true,
      genuine: true,
      serial_code: row.serial_code,
      status: row.status,
      product: row.products
        ? {
            name: row.products.name,
            slug: row.products.slug,
            thumbnail: row.products.thumbnail,
            images: row.products.images,
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
        if (order?.user_id) {
          const sb: any = supabaseAdmin;
          const { data: profile } = await sb.from("profiles").select("full_name").eq("id", order.user_id).maybeSingle();
          buyerMasked = maskName(profile?.full_name);
        } else if (order?.guest_email) {
          buyerMasked = maskName(order.guest_email.split("@")[0]);
        }
        base.sold = {
          sold_at_masked: maskDateMonth(row.sold_at),
          buyer_masked: buyerMasked ?? "Customer",
          is_owner: false,
        };
      }
    }
    return base;
  });
