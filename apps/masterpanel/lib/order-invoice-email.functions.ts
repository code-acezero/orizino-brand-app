"use server";

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

/**
 * Render structured plain text invoice email
 */
function renderInvoiceText(
  order: any,
  items: any[],
  brand: { name: string; addr?: string; email?: string },
  trackingUrl?: string | null,
  invoicePdfUrl?: string | null
): string {
  const addr = order.shipping_address ?? {};
  const formattedDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-US");

  const addressLine = [addr.street, addr.area, addr.city, addr.postal_code].filter(Boolean).join(", ") || "Provided at Checkout";

  const itemLines = (items || []).map((i) => {
    const variant = [i.size, i.color].filter(Boolean).join(" / ");
    return `• ${i.product_name || "Item"}${variant ? ` (${variant})` : ""} x ${i.quantity || 1} — ${money(i.total_price || (i.unit_price * (i.quantity || 1)))}`;
  }).join("\n");

  let text = `${brand.name || "ORIZINO"}
Artisanal Fashion & Lifestyle
--------------------------------------------------
OFFICIAL ORDER INVOICE #${order.order_number}
--------------------------------------------------
Date            : ${formattedDate}
Customer Name   : ${addr.full_name || "Valued Client"}
Delivery Address: ${addressLine}
Contact Phone   : ${addr.phone || "N/A"}
Payment Method  : ${order.payment_method || "Cash on Delivery"}
Status          : Confirmed & Reserved

ITEMS ORDERED:
${itemLines || "No items recorded"}

FINANCIAL SUMMARY:
Subtotal        : ${money(order.subtotal)}
Delivery Fee    : ${money(order.shipping_fee)}
${order.discount_amount && Number(order.discount_amount) > 0 ? `Special Discount: -${money(order.discount_amount)}\n` : ""}TOTAL PAYABLE   : ${money(order.total)}

--------------------------------------------------
ORDER TRACKING LINK:
${trackingUrl || "https://shop.orizino.com/track"}

DOWNLOAD OFFICIAL INVOICE (PDF):
${invoicePdfUrl || `https://shop.orizino.com/api/public/orders/${order.order_number}/invoice?download=true`}
--------------------------------------------------

Thank you for choosing ORIZINO. For any inquiries, please contact our concierge at contact.orizino@gmail.com.

ORIZINO FASHION & LIFESTYLE • Dhaka, Bangladesh
`;

  return text;
}

/**
 * Render Cherry Vanilla HTML Invoice with clean text layout, live tracking link, and PDF download button
 */
function renderInvoiceHtml(
  order: any,
  items: any[],
  brand: { name: string; addr?: string; email?: string; support?: string; phone?: string; siteUrl?: string },
  trackingUrl?: string | null,
  invoicePdfUrl?: string | null
) {
  const addr = order.shipping_address ?? {};
  const rows = (items || [])
    .map((i) => {
      const variantInfo = [i.size, i.color].filter(Boolean).join(" / ");
      return `
        <tr>
          <td style="padding:14px 16px;border-bottom:1px solid rgba(250, 246, 238, 0.06)">
            <div style="font-weight:600;color:#FAF6EE;font-size:13px">${esc(i.product_name || "Product")}</div>
            ${variantInfo ? `<div style="font-size:11px;color:#9E9A92;margin-top:3px">Variant: ${esc(variantInfo)}</div>` : ""}
          </td>
          <td style="padding:14px 16px;border-bottom:1px solid rgba(250, 246, 238, 0.06);text-align:center;color:#FAF6EE;font-size:13px;font-weight:600">
            ${i.quantity || 1}
          </td>
          <td style="padding:14px 16px;border-bottom:1px solid rgba(250, 246, 238, 0.06);text-align:right;color:#9E9A92;font-size:13px">
            ${money(i.unit_price)}
          </td>
          <td style="padding:14px 16px;border-bottom:1px solid rgba(250, 246, 238, 0.06);text-align:right;font-weight:700;color:#FAF6EE;font-size:13px">
            ${money(i.total_price || (i.unit_price * (i.quantity || 1)))}
          </td>
        </tr>
      `;
    })
    .join("");

  const formattedDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleDateString("en-US");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice #${esc(order.order_number)}</title>
</head>
<body style="margin:0;padding:32px 12px;background:#0d0c0e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#FAF6EE;-webkit-font-smoothing:antialiased">
  <div style="max-width:620px;margin:0 auto;background:#151418;border:1px solid rgba(154, 0, 2, 0.35);border-top:3px solid #9a0002;border-radius:16px;overflow:hidden;box-shadow:0 24px 48px rgba(0,0,0,0.7)">
    
    <!-- ── BRAND HEADER ── -->
    <div style="background:linear-gradient(180deg, rgba(154,0,2,0.22) 0%, rgba(21,20,24,0) 100%);padding:32px 32px 22px 32px;border-bottom:1px solid rgba(250, 246, 238, 0.08)">
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="vertical-align:middle;width:56px;padding-right:16px">
            <a href="https://shop.orizino.com" target="_blank" style="text-decoration:none;display:block">
              <img src="https://shop.orizino.com/apple-touch-icon.png" alt="ORIZINO" width="52" height="52" style="display:block;width:52px;height:52px;border-radius:12px;border:1.5px solid rgba(154,0,2,0.5);box-shadow:0 4px 16px rgba(154,0,2,0.35)" />
            </a>
          </td>
          <td style="vertical-align:middle">
            <h1 style="margin:0;font-size:26px;font-weight:900;letter-spacing:6px;color:#FAF6EE;text-transform:uppercase;font-family:Georgia,serif">
              ${esc(brand.name || "ORIZINO")}
            </h1>
            <p style="margin:4px 0 0 0;font-size:10px;font-weight:700;letter-spacing:3px;color:#9a0002;text-transform:uppercase">
              Official Customer Invoice
            </p>
          </td>
          <td style="vertical-align:middle;text-align:right">
            <div style="display:inline-block;padding:6px 14px;background:rgba(154, 0, 2, 0.2);border:1px solid rgba(154, 0, 2, 0.5);border-radius:20px;color:#FAF6EE;font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase">
              Confirmed
            </div>
            <div style="font-family:monospace;font-size:13px;font-weight:700;color:#FAF6EE;margin-top:6px">
              #${esc(order.order_number)}
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- ── ORDER META & BILLING INFO ── -->
    <div style="padding:32px">
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <tr>
          <td style="width:50%;vertical-align:top;padding-right:16px">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9E9A92;margin-bottom:6px">
              Billed &amp; Shipped To
            </div>
            <div style="font-size:14px;font-weight:700;color:#FAF6EE">${esc(addr.full_name || "Valued Client")}</div>
            <div style="font-size:12px;color:#9E9A92;margin-top:4px;line-height:1.5">
              ${esc([addr.street, addr.area, addr.city, addr.postal_code].filter(Boolean).join(", ")) || "Delivery Address Provided"}
            </div>
            <div style="font-size:12px;color:#9E9A92;margin-top:4px">
              ${esc(addr.phone || "")} ${addr.email ? `&bull; ${esc(addr.email)}` : ""}
            </div>
          </td>
          <td style="width:50%;vertical-align:top;padding-left:16px">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9E9A92;margin-bottom:6px">
              Order Details
            </div>
            <div style="font-size:12px;color:#9E9A92;line-height:1.6">
              <div><strong>Date:</strong> <span style="color:#FAF6EE">${formattedDate}</span></div>
              <div><strong>Payment:</strong> <span style="text-transform:uppercase;font-weight:600;color:#FAF6EE">${esc(order.payment_method || "Cash on Delivery")}</span></div>
              <div><strong>Status:</strong> <span style="color:#10b981;font-weight:600">Confirmed &amp; Reserved</span></div>
            </div>
          </td>
        </tr>
      </table>

      <!-- ── ITEMS TABLE ── -->
      <table style="width:100%;border-collapse:collapse;margin-top:12px;background:#1a191e;border-radius:10px;overflow:hidden;border:1px solid rgba(250, 246, 238, 0.08)">
        <thead>
          <tr style="background:rgba(250, 246, 238, 0.04)">
            <th style="padding:12px 16px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9E9A92;border-bottom:1px solid rgba(250, 246, 238, 0.08)">Item</th>
            <th style="padding:12px 16px;text-align:center;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9E9A92;border-bottom:1px solid rgba(250, 246, 238, 0.08)">Qty</th>
            <th style="padding:12px 16px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9E9A92;border-bottom:1px solid rgba(250, 246, 238, 0.08)">Price</th>
            <th style="padding:12px 16px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9E9A92;border-bottom:1px solid rgba(250, 246, 238, 0.08)">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="4" style="padding:16px;text-align:center;color:#9E9A92;font-size:12px">No items found</td></tr>'}
        </tbody>
      </table>

      <!-- ── FINANCIAL TOTALS ── -->
      <div style="margin-top:20px;padding:16px;background:#1a191e;border-radius:10px;border:1px solid rgba(250, 246, 238, 0.08)">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:4px 0;font-size:13px;color:#9E9A92">Subtotal</td>
            <td style="padding:4px 0;font-size:13px;font-weight:600;color:#FAF6EE;text-align:right">${money(order.subtotal)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-size:13px;color:#9E9A92">Delivery / Shipping</td>
            <td style="padding:4px 0;font-size:13px;font-weight:600;color:#FAF6EE;text-align:right">${money(order.shipping_fee)}</td>
          </tr>
          ${
            order.discount_amount && Number(order.discount_amount) > 0
              ? `
          <tr>
            <td style="padding:4px 0;font-size:13px;color:#10b981">Special Discount</td>
            <td style="padding:4px 0;font-size:13px;font-weight:700;color:#10b981;text-align:right">-${money(order.discount_amount)}</td>
          </tr>
          `
              : ""
          }
          <tr>
            <td style="padding:12px 0 4px 0;font-size:14px;font-weight:800;color:#FAF6EE;border-top:1px solid rgba(250, 246, 238, 0.12)">Total Payable</td>
            <td style="padding:12px 0 4px 0;font-size:18px;font-weight:900;color:#FAF6EE;text-align:right;border-top:1px solid rgba(250, 246, 238, 0.12)">${money(order.total)}</td>
          </tr>
        </table>
      </div>

      <!-- ── ACTION BUTTONS: LIVE TRACKING & PDF DOWNLOAD ── -->
      <div style="margin-top:28px;text-align:center;padding:24px;background:#1a191e;border:1px solid rgba(154, 0, 2, 0.4);border-radius:12px">
        <div style="font-size:13px;font-weight:600;color:#FAF6EE;margin-bottom:14px">
          Order Actions &amp; Official Documentation
        </div>
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="padding: 4px;">
              ${
                trackingUrl
                  ? `<a href="${esc(trackingUrl)}" target="_blank" style="display:inline-block;padding:12px 24px;background:#9a0002;color:#FAF6EE;font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;border-radius:10px;border:1px solid rgba(250, 246, 238, 0.15);box-shadow:0 8px 24px rgba(154, 0, 2, 0.4);margin: 4px;">
                      Track Order Live &rarr;
                    </a>`
                  : ""
              }
              ${
                invoicePdfUrl
                  ? `<a href="${esc(invoicePdfUrl)}" target="_blank" style="display:inline-block;padding:12px 24px;background:#242329;color:#FAF6EE;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-decoration:none;border-radius:10px;border:1px solid rgba(250, 246, 238, 0.15);margin: 4px;">
                      📥 Download PDF Invoice
                    </a>`
                  : ""
              }
            </td>
          </tr>
        </table>
      </div>

      <div style="margin-top:24px;text-align:center;font-size:12px;color:#7D7971;line-height:1.5">
        Need assistance with your order? Reply directly to this email or reach us at <a href="mailto:contact.orizino@gmail.com" style="color:#FAF6EE;text-decoration:underline">contact.orizino@gmail.com</a>.
      </div>
    </div>

    <!-- ── FOOTER ── -->
    <div style="background:#0f0e11;padding:20px 32px;border-top:1px solid rgba(250, 246, 238, 0.06);text-align:center">
      <div style="font-size:11px;color:#FAF6EE;font-weight:700;letter-spacing:1px">ORIZINO FASHION &amp; LIFESTYLE</div>
      <div style="font-size:10px;color:#6E6A63;margin-top:3px">Dhaka, Bangladesh &bull; Official Customer Invoice</div>
    </div>
  </div>
</body>
</html>`;
}

async function resolveRecipient(sb: any, order: any): Promise<string | null> {
  const addr = order.shipping_address ?? {};
  if (addr.email && typeof addr.email === "string" && addr.email.trim()) {
    return addr.email.trim();
  }
  if (order.customer_email && typeof order.customer_email === "string" && order.customer_email.trim()) {
    return order.customer_email.trim();
  }
  if (order.email && typeof order.email === "string" && order.email.trim()) {
    return order.email.trim();
  }
  if (order.user_id) {
    try {
      const { data: u } = await sb.auth.admin.getUserById(order.user_id);
      if (u?.user?.email) return u.user.email.trim();
    } catch {}
    try {
      const { data: prof } = await sb.from("profiles").select("email").eq("id", order.user_id).maybeSingle();
      if (prof?.email) return prof.email.trim();
    } catch {}
  }
  return null;
}

async function buildAndSend(order_id: string, opts?: { overrideTo?: string }) {
  if (!hasSupabaseAdminCredentials()) {
    return { ok: false, error: "admin credentials missing" };
  }
  const sb: any = supabaseAdmin;
  const { data: order, error: orderErr } = await sb
    .from("orders")
    .select("id, order_number, status, total, subtotal, shipping_fee, discount_amount, payment_method, shipping_address, user_id, notes, created_at, tracking_token")
    .eq("id", order_id)
    .maybeSingle();

  if (orderErr || !order) {
    return { ok: false, error: orderErr?.message || "Order not found" };
  }

  const { data: items } = await sb
    .from("order_items")
    .select("product_name, quantity, unit_price, total_price, size, color")
    .eq("order_id", order.id);

  const to = opts?.overrideTo || (await resolveRecipient(sb, order));
  if (!to) {
    await logDispatch({
      purpose: "invoice",
      event: "order_confirmed",
      recipient: "",
      subject: `Invoice #${order.order_number}`,
      status: "failed",
      error: "No valid recipient email address found on order or customer profile",
      meta: { order_id, order_number: order.order_number },
    });
    return { ok: false, error: "No recipient email found" };
  }

  const { data: settingsRows } = await sb
    .from("site_settings")
    .select("key,value")
    .in("key", ["gdocs_settings", "email_provider"]);

  const settings = Object.fromEntries((settingsRows ?? []).map((r: any) => [r.key, r.value ?? {}]));
  const g = (settings.gdocs_settings ?? {}) as any;
  const ep = (settings.email_provider ?? {}) as any;

  const brand = {
    name: g.brand_name || g.site_name || "ORIZINO",
    addr: g.address || ep.footer_address || "Dhaka, Bangladesh",
    email: ep.reply_to || g.support_email || "support@orizino.com",
    support: g.support_email || ep.reply_to || "support@orizino.com",
    phone: g.support_phone || "+880 1700-000000",
  };

  const sender = await getDefaultSender();
  const from = `${sender.from_name} <${sender.from_email}>`;
  const subject = `Order Confirmed #${order.order_number} — ${brand.name} Invoice`;

  const companyBase = (process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.SITE_URL || "https://shop.orizino.com").replace(/\/$/, "");
  const trackingUrl = `${companyBase}/track?t=${encodeURIComponent(order.tracking_token || order.order_number)}`;
  const invoicePdfUrl = `${companyBase}/api/public/orders/${order.order_number}/invoice?download=true`;

  const html = renderInvoiceHtml(order, items ?? [], brand, trackingUrl, invoicePdfUrl);
  const text = renderInvoiceText(order, items ?? [], brand, trackingUrl, invoicePdfUrl);

  const res = await sendEmail({
    from,
    to: [to],
    subject,
    html,
    text,
    reply_to: sender.reply_to,
  });

  await logDispatch({
    purpose: "invoice",
    event: "order_confirmed",
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
 * Public server function: emails the invoice HTML for an order.
 * Automatically triggered on order confirmation, guest checkout, or manually by staff.
 */
export const emailOrderInvoice = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
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
