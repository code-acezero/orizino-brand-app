"use server";

import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { hasSupabaseAdminCredentials, supabaseAdmin } from "@/integrations/supabase/client.server";
import { broadcastToTelegram } from "@/lib/telegram.functions";

const RESEND_GATEWAY = "https://connector-gateway.lovable.dev/resend";

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fmtBDT(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  return `৳${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

// notifyNewOrder is intentionally public so guest checkouts (no bearer token)
// can trigger the Telegram staff broadcast. It only reads/broadcasts data
// derivable from an existing order UUID; customer emails are dispatched by
// the email automation cron.
export const notifyNewOrder = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    if (!hasSupabaseAdminCredentials()) {
      console.warn("[notify-order] admin credentials missing; skipping");
      return { telegram: { sent: 0, failed: 0 } };
    }
    const sb: any = supabaseAdmin;

    const { data: order, error } = await (sb as any)
      .from("orders")
      .select("id, order_number, status, total, subtotal, shipping_fee, payment_method, shipping_address, user_id, notes, created_at")
      .eq("id", data.order_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found");

    const { data: items } = await (sb as any)
      .from("order_items")
      .select("product_name, quantity, unit_price, total_price")
      .eq("order_id", order.id);

    const addr = order.shipping_address ?? {};
    const itemLines = (items ?? [])
      .map((i: any) => `• ${escapeHtml(i.product_name)} × ${i.quantity} — ${fmtBDT(i.total_price)}`)
      .join("\n");

    // --- Telegram broadcast ---
    const tgText =
      `🛒 <b>New order ${escapeHtml(order.order_number)}</b>\n` +
      `<b>Customer:</b> ${escapeHtml(addr.full_name || "-")} (${escapeHtml(addr.phone || "-")})\n` +
      `<b>Address:</b> ${escapeHtml([addr.street, addr.area, addr.city].filter(Boolean).join(", "))}\n` +
      `<b>Payment:</b> ${escapeHtml(order.payment_method)}\n` +
      `<b>Total:</b> ${fmtBDT(order.total)} (sub ${fmtBDT(order.subtotal)} + ship ${fmtBDT(order.shipping_fee)})\n\n` +
      `<b>Items:</b>\n${itemLines || "—"}` +
      (order.notes ? `\n\n<b>Notes:</b> ${escapeHtml(order.notes)}` : "");

    const tg = await broadcastToTelegram(sb, "notify_orders", tgText).catch((e) => {
      console.warn("[notify-order] telegram broadcast failed", e);
      return { sent: 0, failed: 0 };
    });

    let invoice: any = { ok: false, error: "not attempted" };
    try {
      const { emailOrderInvoice } = await import("@/lib/order-invoice-email.functions");
      invoice = await emailOrderInvoice({ data: { order_id: order.id } });
    } catch (e: any) {
      console.warn("[notify-order] invoice email failed", e);
      invoice = { ok: false, error: e?.message ?? "invoice send failed" };
    }

    return { telegram: tg, invoice };
  });
