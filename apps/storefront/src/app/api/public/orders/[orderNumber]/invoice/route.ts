import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const dynamic = "force-dynamic";

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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const rawParams = await Promise.resolve(context.params);
    const orderNumber = rawParams?.orderNumber?.trim();
    if (!orderNumber) {
      return NextResponse.json({ error: "Missing order number" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const autoPrint = searchParams.get("print") === "true" || searchParams.get("download") === "true";

    const sb: any = supabaseAdmin;
    let query = sb
      .from("orders")
      .select("id, order_number, status, total, subtotal, shipping_fee, coupon_discount, loyalty_discount, payment_method, shipping_address, created_at, tracking_token");

    if (UUID_REGEX.test(orderNumber)) {
      query = query.eq("id", orderNumber);
    } else {
      query = query.eq("order_number", orderNumber);
    }

    const { data: order, error } = await query.maybeSingle();
    if (error) {
      console.error("[invoice route error]", error);
    }

    if (error || !order) {
      return new NextResponse("Order not found", { status: 404 });
    }

    const { data: items } = await sb
      .from("order_items")
      .select("product_name, quantity, unit_price, total_price, size, color")
      .eq("order_id", order.id);

    const addr = order.shipping_address ?? {};
    const formattedDate = order.created_at
      ? new Date(order.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : new Date().toLocaleDateString("en-US");

    const discountAmount = Number(order.coupon_discount || 0) + Number(order.loyalty_discount || 0);

    const itemRows = (items || [])
      .map((item: any) => {
        const variant = [item.size, item.color].filter(Boolean).join(" / ");
        return `
          <tr>
            <td style="padding: 12px 14px; border-bottom: 1px solid #e5e5e5; font-size: 13px; color: #111;">
              <strong>${esc(item.product_name || "Item")}</strong>
              ${variant ? `<div style="font-size: 11px; color: #666; margin-top: 2px;">Variant: ${esc(variant)}</div>` : ""}
            </td>
            <td style="padding: 12px 14px; border-bottom: 1px solid #e5e5e5; font-size: 13px; color: #333; text-align: center;">
              ${item.quantity || 1}
            </td>
            <td style="padding: 12px 14px; border-bottom: 1px solid #e5e5e5; font-size: 13px; color: #333; text-align: right;">
              ${money(item.unit_price)}
            </td>
            <td style="padding: 12px 14px; border-bottom: 1px solid #e5e5e5; font-size: 13px; font-weight: 700; color: #111; text-align: right;">
              ${money(item.total_price || item.unit_price * (item.quantity || 1))}
            </td>
          </tr>
        `;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Invoice #${esc(order.order_number)} — ORIZINO</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 24px;
      background: #f7f7f7;
      color: #111;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
      padding: 40px 48px;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
    }
    .actions-bar {
      max-width: 800px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: #9a0002;
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      text-decoration: none;
    }
    .btn-secondary {
      background: #f0f0f0;
      color: #333;
      border: 1px solid #ccc;
    }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; border-bottom: 2px solid #9a0002; padding-bottom: 20px; }
    .brand-title { font-family: Georgia, serif; font-size: 30px; font-weight: 900; letter-spacing: 5px; color: #111; margin: 0; }
    .brand-sub { font-size: 10px; font-weight: 700; letter-spacing: 2px; color: #9a0002; text-transform: uppercase; margin-top: 4px; }
    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    .meta-card { background: #fafafa; border: 1px solid #eee; border-radius: 6px; padding: 16px; font-size: 12px; line-height: 1.6; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .items-table th { background: #f4f4f4; padding: 10px 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #555; border-bottom: 2px solid #ddd; }
    .totals-table { width: 100%; border-collapse: collapse; margin-left: auto; max-width: 320px; }
    .totals-table td { padding: 6px 0; font-size: 13px; color: #444; }
    .totals-table .grand-total td { font-size: 16px; font-weight: 900; color: #111; border-top: 2px solid #111; padding-top: 10px; }
    .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #eee; font-size: 11px; color: #777; text-align: center; }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { border: none; box-shadow: none; padding: 0; }
      .actions-bar { display: none; }
    }
  </style>
</head>
<body>
  <div class="actions-bar">
    <a href="/track?t=${encodeURIComponent(order.tracking_token || order.order_number)}" class="btn btn-secondary">
      ← Back to Tracking
    </a>
    <button onclick="window.print()" class="btn">
      📥 Download PDF / Print Invoice
    </button>
  </div>

  <div class="sheet">
    <table class="header-table">
      <tr>
        <td valign="top">
          <h1 class="brand-title">ORIZINO</h1>
          <div class="brand-sub">Artisanal Fashion &amp; Lifestyle</div>
          <div style="font-size: 12px; color: #666; margin-top: 8px;">
            Dhaka, Bangladesh • contact.orizino@gmail.com
          </div>
        </td>
        <td valign="top" align="right">
          <div style="font-size: 20px; font-weight: 800; color: #9a0002; text-transform: uppercase;">Official Invoice</div>
          <div style="font-size: 13px; font-weight: 700; font-family: monospace; color: #111; margin-top: 4px;">#${esc(order.order_number)}</div>
          <div style="font-size: 12px; color: #666; margin-top: 4px;">Date: ${formattedDate}</div>
          <div style="margin-top: 8px; display: inline-block; padding: 4px 10px; background: #e6f4ea; color: #137333; font-size: 11px; font-weight: 700; border-radius: 12px;">
            Confirmed
          </div>
        </td>
      </tr>
    </table>

    <table class="meta-table">
      <tr>
        <td width="48%" valign="top">
          <div class="meta-card">
            <strong style="text-transform: uppercase; font-size: 10px; color: #888; letter-spacing: 1px;">Customer Details</strong>
            <div style="font-size: 14px; font-weight: 700; color: #111; margin-top: 4px;">${esc(addr.full_name || "Valued Customer")}</div>
            <div>${esc([addr.street, addr.area, addr.state, addr.city, addr.zip || addr.postal_code].filter(Boolean).join(", ")) || "Delivery Address Provided"}</div>
            <div>Phone: ${esc(addr.phone || "N/A")}</div>
            ${addr.email ? `<div>Email: ${esc(addr.email)}</div>` : ""}
          </div>
        </td>
        <td width="4%"></td>
        <td width="48%" valign="top">
          <div class="meta-card">
            <strong style="text-transform: uppercase; font-size: 10px; color: #888; letter-spacing: 1px;">Order &amp; Payment Details</strong>
            <div style="margin-top: 4px;"><strong>Payment Method:</strong> ${esc(order.payment_method || "Cash on Delivery")}</div>
            <div><strong>Fulfillment Status:</strong> Confirmed &amp; In Queue</div>
            <div><strong>Shipping Method:</strong> Express Courier Doorstep</div>
          </div>
        </td>
      </tr>
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th align="left">Product Description</th>
          <th align="center">Qty</th>
          <th align="right">Unit Price</th>
          <th align="right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows || '<tr><td colspan="4" align="center" style="padding: 20px; color: #888;">No items recorded</td></tr>'}
      </tbody>
    </table>

    <table style="width: 100%;">
      <tr>
        <td valign="top" style="font-size: 12px; color: #666; line-height: 1.6; padding-right: 20px;">
          <strong>Thank you for choosing ORIZINO.</strong><br/>
          This is a computer-generated official document. For warranty, exchange, or delivery questions, reach out to our concierge.
        </td>
        <td valign="top" align="right">
          <table class="totals-table">
            <tr>
              <td>Subtotal:</td>
              <td align="right" style="font-weight: 600; color: #111;">${money(order.subtotal)}</td>
            </tr>
            <tr>
              <td>Delivery Fee:</td>
              <td align="right" style="font-weight: 600; color: #111;">${money(order.shipping_fee)}${order.is_delivery_prepaid ? ' <span style="font-size: 11px; color: #137333; font-weight: 700;">(Pre-paid)</span>' : ''}</td>
            </tr>
            ${
              discountAmount > 0
                ? `
            <tr>
              <td style="color: #137333;">Special Discount:</td>
              <td align="right" style="font-weight: 700; color: #137333;">-${money(discountAmount)}</td>
            </tr>
            `
                : ""
            }
            ${
              order.is_delivery_prepaid
                ? `
            <tr>
              <td style="color: #137333;">Advance Paid (Delivery):</td>
              <td align="right" style="font-weight: 700; color: #137333;">-${money(order.delivery_prepaid_amount || order.shipping_fee)}</td>
            </tr>
            `
                : ""
            }
            <tr class="grand-total">
              <td>${order.is_delivery_prepaid ? "Balance Due on Delivery:" : "Total Payable:"}</td>
              <td align="right">${money(order.is_delivery_prepaid ? Math.max(0, Number(order.total || 0) - Number(order.delivery_prepaid_amount || order.shipping_fee || 0)) : order.total)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <div class="footer">
      <div>ORIZINO FASHION &amp; LIFESTYLE • Dhaka, Bangladesh</div>
      <div style="margin-top: 4px;">Official Verified Purchase Invoice • https://shop.orizino.com</div>
    </div>
  </div>

  ${autoPrint ? `<script>window.onload = function() { setTimeout(function(){ window.print(); }, 400); };</script>` : ""}
</body>
</html>`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to generate invoice" }, { status: 500 });
  }
}
