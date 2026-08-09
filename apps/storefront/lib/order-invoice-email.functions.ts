import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { hasSupabaseAdminCredentials, supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail, logDispatch, getDefaultSender } from "@/lib/resend.server";

function esc(s: any): string {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
function money(n: any, sym = "৳") {
  const v = Number(n || 0);
  return `${sym}${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function renderInvoiceHtml(order: any, items: any[], brand: { name: string; addr?: string; email?: string; support?: string }, trackingUrl?: string | null) {
  const addr = order.shipping_address ?? {};
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:8px 10px;border-bottom:1px solid #eee">${esc(i.product_name)}</td>` +
        `<td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>` +
        `<td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right">${money(i.unit_price)}</td>` +
        `<td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right">${money(i.total_price)}</td></tr>`,
    )
    .join("");
  return `<!DOCTYPE html><html><body style="margin:0;background:#f6f6f4;padding:24px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#141110">
<div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e4dfd3;border-radius:12px;overflow:hidden">
  <div style="padding:24px 28px;border-bottom:1px solid #f0ead9;background:linear-gradient(90deg,#fbf8f1,#fff)">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <h1 style="margin:0;font-family:Georgia,serif;font-size:22px;color:#141110">${esc(brand.name)}</h1>
        <p style="margin:4px 0 0;color:#6b6b6b;font-size:12px">${esc(brand.addr || "")}</p>
      </div>
      <div style="text-align:right">
        <p style="margin:0;font-size:11px;letter-spacing:.15em;color:#b8902f;text-transform:uppercase">Invoice</p>
        <p style="margin:2px 0 0;font-weight:600">${esc(order.order_number)}</p>
        <p style="margin:2px 0 0;color:#6b6b6b;font-size:12px">${new Date(order.created_at).toLocaleDateString()}</p>
      </div>
    </div>
  </div>
  <div style="padding:20px 28px">
    <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#6b6b6b">Bill to</p>
    <p style="margin:0;font-weight:600">${esc(addr.full_name || "-")}</p>
    <p style="margin:2px 0;color:#4b4b4b;font-size:13px">${esc([addr.street, addr.area, addr.city, addr.postal_code].filter(Boolean).join(", "))}</p>
    <p style="margin:2px 0;color:#4b4b4b;font-size:13px">${esc(addr.phone || "")} ${addr.email ? "· " + esc(addr.email) : ""}</p>

    <table style="width:100%;margin-top:20px;border-collapse:collapse;font-size:14px">
      <thead>
        <tr style="background:#fbf8f1">
          <th style="text-align:left;padding:10px;font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#6b6b6b">Item</th>
          <th style="text-align:center;padding:10px;font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#6b6b6b">Qty</th>
          <th style="text-align:right;padding:10px;font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#6b6b6b">Price</th>
          <th style="text-align:right;padding:10px;font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#6b6b6b">Total</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="4" style="padding:12px;color:#6b6b6b">No items</td></tr>`}</tbody>
    </table>

    <table style="width:100%;margin-top:16px;font-size:14px">
      <tr><td style="padding:4px 10px;color:#6b6b6b">Subtotal</td><td style="padding:4px 10px;text-align:right">${money(order.subtotal)}</td></tr>
      <tr><td style="padding:4px 10px;color:#6b6b6b">Shipping</td><td style="padding:4px 10px;text-align:right">${money(order.shipping_fee)}</td></tr>
      <tr><td style="padding:8px 10px;border-top:1px solid #eee;font-weight:700">Total</td><td style="padding:8px 10px;border-top:1px solid #eee;text-align:right;font-weight:700">${money(order.total)}</td></tr>
      <tr><td style="padding:4px 10px;color:#6b6b6b">Payment</td><td style="padding:4px 10px;text-align:right">${esc(order.payment_method)}</td></tr>
    </table>

    <p style="margin:24px 0 0;padding:12px;background:#fbf8f1;border-radius:8px;color:#4b4b4b;font-size:13px">
      Thank you for shopping with ${esc(brand.name)}.${trackingUrl ? ` <br/><a href="${esc(trackingUrl)}" style="color:#b8902f;font-weight:600;text-decoration:none">Track your order →</a>` : ""}
      ${brand.support ? `<br/><span style="color:#6b6b6b">Questions? Contact ${esc(brand.support)}.</span>` : ""}
    </p>
  </div>
  <div style="padding:14px 28px;border-top:1px solid #f0ead9;background:#fbf8f1;font-size:11px;color:#6b6b6b;text-align:center">
    This invoice was generated automatically. ${esc(brand.email || "")}
  </div>
</div></body></html>`;
}

async function resolveRecipient(sb: any, order: any): Promise<string | null> {
  const addr = order.shipping_address ?? {};
  if (addr.email) return addr.email;
  if (order.user_id) {
    const { data: u } = await sb.auth.admin.getUserById(order.user_id);
    return u?.user?.email ?? null;
  }
  return null;
}

async function buildAndSend(order_id: string, opts?: { overrideTo?: string }) {
  if (!hasSupabaseAdminCredentials()) {
    return { ok: false, error: "admin credentials missing" };
  }
  const sb: any = supabaseAdmin;
  const { data: order } = await sb
    .from("orders")
    .select("id, order_number, status, total, subtotal, shipping_fee, payment_method, shipping_address, user_id, notes, created_at, tracking_token")
    .eq("id", order_id)
    .maybeSingle();
  if (!order) return { ok: false, error: "order not found" };
  const { data: items } = await sb
    .from("order_items")
    .select("product_name, quantity, unit_price, total_price")
    .eq("order_id", order.id);

  const to = opts?.overrideTo || (await resolveRecipient(sb, order));
  if (!to) {
    await logDispatch({
      purpose: "invoice",
      event: "order_placed",
      recipient: "",
      subject: `Invoice ${order.order_number}`,
      status: "failed",
      error: "no recipient",
      meta: { order_id },
    });
    return { ok: false, error: "no recipient email" };
  }

  const { data: settingsRows } = await sb
    .from("site_settings")
    .select("key,value")
    .in("key", ["gdocs_settings", "email_provider"]);
  const settings = Object.fromEntries((settingsRows ?? []).map((r: any) => [r.key, r.value ?? {}]));
  const g = (settings.gdocs_settings ?? {}) as any;
  const brand = {
    name: g.brand_name || g.site_name || "Orizino",
    addr: g.address || "",
    email: g.support_email || "",
    support: g.support_email || "",
  };

  const sender = await getDefaultSender();
  const from = `${sender.from_name} <${sender.from_email}>`;
  const subject = `Invoice ${order.order_number} — ${brand.name}`;
  const companyBase = (g.company_url || process.env.COMPANY_URL || "").replace(/\/$/, "");
  const trackingUrl = order.tracking_token && companyBase
    ? `${companyBase}/track?t=${encodeURIComponent(order.tracking_token)}`
    : (order.tracking_token ? `/track?t=${encodeURIComponent(order.tracking_token)}` : null);
  const html = renderInvoiceHtml(order, items ?? [], brand, trackingUrl);

  const res = await sendEmail({ from, to: [to], subject, html, reply_to: sender.reply_to });
  await logDispatch({
    purpose: "invoice",
    event: "order_placed",
    recipient: to,
    subject,
    status: res.error ? "failed" : "sent",
    provider_id: res.id ?? null,
    error: res.error ?? null,
    meta: { order_id, order_number: order.order_number },
  });
  return { ok: !res.error, id: res.id ?? null, error: res.error ?? null, to };
}

/**
 * Public: emails the invoice HTML for an order. Called after checkout by
 * `notifyNewOrder`, and callable by admins to resend.
 */
export const emailOrderInvoice = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        order_id: z.string().uuid(),
        to: z.string().email().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    return await buildAndSend(data.order_id, { overrideTo: data.to });
  });
