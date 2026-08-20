/**
 * Luxury POS Invoice Slip & Thermal Sticker Rendering — English Heritage & Cherry Vanilla
 *
 * Supports Multiple Industry Standard POS Roll Sizes:
 * - 58mm / 2.25" (Compact Mobile / Bluetooth POS - Default)
 * - 80mm / 3.125" (Standard Retail & Supermarket POS)
 * - 76mm / 3.0" (Kitchen / Impact Receipt Roll)
 * - 100mm / 4.0" (4" Shipping / Logistics Parcel Label)
 * - 50mm / 2.0" (2" Micro Tag Roll)
 *
 * Zero bottom overflow: Height fits content tightly without trailing empty space.
 */

import type { InvoiceSettings } from "./invoice-settings.schema";
import bwipjs from "bwip-js/browser";
import type { InvoiceOrderPayload } from "./invoice-render";

export type PosRollSize = "58mm" | "80mm" | "76mm" | "100mm" | "50mm";

export const POS_ROLL_SIZES: Record<
  PosRollSize,
  { label: string; widthIn: number; widthMm: number; defaultFontSize: number; desc: string }
> = {
  "58mm": {
    label: '58mm (2¼" Compact POS)',
    widthIn: 2.25,
    widthMm: 58,
    defaultFontSize: 12.5,
    desc: "Sunmi, Rongta, Xprinter, Mobile Bluetooth POS printers",
  },
  "80mm": {
    label: '80mm (3⅛" Standard POS)',
    widthIn: 3.125,
    widthMm: 80,
    defaultFontSize: 14.5,
    desc: "Epson TM-T88, Star Micronics, Square & Clover terminals",
  },
  "76mm": {
    label: '76mm (3" Impact Roll)',
    widthIn: 3.0,
    widthMm: 76,
    defaultFontSize: 14,
    desc: "Standard impact receipt and kitchen printer roll",
  },
  "100mm": {
    label: '100mm (4" Shipping Label)',
    widthIn: 4.0,
    widthMm: 100,
    defaultFontSize: 16,
    desc: "Zebra, Rollo, Dymo 4XL thermal parcel stickers",
  },
  "50mm": {
    label: '50mm (2" Micro Tag)',
    widthIn: 2.0,
    widthMm: 50,
    defaultFontSize: 11.5,
    desc: "Micro thermal price tag & barcode stickers",
  },
};

const ORIZINO_LOGO_SVG_PATHS = `
<svg viewBox="0 0 540 566" xmlns="http://www.w3.org/2000/svg" class="pos-watermark-svg">
  <path fill="currentColor" d="M11.31,303.01l10.42,10.61,102.73,114.11c-16.27-34.27-34.28-66.2-53.79-98.11L0,219.52l41.25-42.82,104.13-107.09C169.3,45.99,192.23,22.22,218.19,0l-71.11,101.28L55.74,232.06c26,65.57,52.95,130.16,81.76,194.32l12.16,25.25,71.16,112.86L52.01,416.82l-40.7-113.8Z"/>
  <path fill="currentColor" d="M510.24,351.74l-23.18,64.87-169.05,148.54,27.52-44.45,45.28-70.91,30.12-65.82,16.7-38.98,46-113.02-81.21-116.77-25.93-36.85L321.38.16c14.41,11.93,26.61,24.47,40.1,37.05l86.76,87.48,77.26,80.22,13.77,14.47-52.64,81.42c-26.66,41.23-50.32,83.4-72.56,127.58l33.83-36.98,79.5-88.8-17.16,49.14Z"/>
  <path fill="currentColor" d="M356.28,185.04l26.95,46.73-36.12,40.33-32.01,35.6-5.9,33.94-22.1,115.86-19.75,106.98-25.06-136.06-23.26-120.77-10.57-11.82-57.13-64.08,17.38-30.41,40.24-67.6c-.28,10.99,4.75,22.09,2.63,32.95l-18.99,63.2,44.02,68.95,9.75,55.81,20.97,113.31,20.22-107.91,10.47-61.52,44.22-68.68-19.37-63.68,2.55-32.17,30.86,51.02Z"/>
</svg>
`;

function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function generateQrSvg(text: string): string {
  try {
    return bwipjs.toSVG({
      bcid: "qrcode",
      text,
      scale: 3,
      eclevel: "M",
      backgroundcolor: "FFFFFF",
      paddingwidth: 0,
      paddingheight: 0,
    } as any);
  } catch (e) {
    return "";
  }
}

/** Render full standalone Invoice Slip / Sticker HTML */
export function renderPosSlipHtml(
  s: InvoiceSettings,
  order: InvoiceOrderPayload,
  rollSize: PosRollSize = "58mm"
): string {
  const sizeConfig = POS_ROLL_SIZES[rollSize] || POS_ROLL_SIZES["58mm"];
  const widthIn = sizeConfig.widthIn;

  const accentColor = s.accent_color || "#6B0F1A";
  const goldLine = "#C5A059";
  const goldSoft = "rgba(197, 160, 89, 0.4)";
  const textColor = s.text_color || "#1D070B";
  const bgColor = s.bg_color || "#FDFBF7";
  const watermarkOpacity = typeof s.watermark_opacity === "number" ? s.watermark_opacity : 0.06;

  // Compute proportional base font size
  const userOffset = (s.font_size ?? 15) - 15;
  const baseFontSize = Math.max(10, Math.min(22, sizeConfig.defaultFontSize + userOffset));

  // ── Sizing & Scaling Configurations ──
  // QR Sizing (Default is full width)
  const qrScaleMult = (s.qr_scale ?? 100) / 100;
  let baseQrPx = widthIn >= 3.0 ? 195 : 155;
  if (s.qr_size === "compact") baseQrPx = widthIn >= 3.0 ? 88 : 74;
  else if (s.qr_size === "medium") baseQrPx = widthIn >= 3.0 ? 125 : 105;
  else if (s.qr_size === "large") baseQrPx = widthIn >= 3.0 ? 160 : 132;
  else if (s.qr_size === "full_width") baseQrPx = widthIn >= 3.0 ? 215 : 165;
  const finalQrPx = Math.max(50, Math.round(baseQrPx * qrScaleMult));

  // Logo Sizing
  const logoScaleMult = (s.logo_scale ?? 100) / 100;
  let baseLogoPx = 36;
  if (s.logo_size === "small") baseLogoPx = 22;
  else if (s.logo_size === "medium") baseLogoPx = 28;
  else if (s.logo_size === "large") baseLogoPx = 36;
  else if (s.logo_size === "extra_large") baseLogoPx = 48;
  const finalLogoPx = Math.max(16, Math.round(baseLogoPx * logoScaleMult));

  // Brand Name Sizing
  const brandScaleMult = (s.brand_name_scale ?? 100) / 100;
  let baseBrandRem = 0.98;
  if (s.brand_name_size === "small") baseBrandRem = 0.82;
  else if (s.brand_name_size === "medium") baseBrandRem = 0.92;
  else if (s.brand_name_size === "large") baseBrandRem = 1.06;
  else if (s.brand_name_size === "extra_large") baseBrandRem = 1.25;
  const finalBrandRem = (baseBrandRem * brandScaleMult).toFixed(2);

  // Customer Info Sizing & Alignment
  const custScaleMult = (s.customer_info_scale ?? 100) / 100;
  let baseCustRem = 0.80;
  if (s.customer_info_size === "compact") baseCustRem = 0.70;
  else if (s.customer_info_size === "normal") baseCustRem = 0.82;
  else if (s.customer_info_size === "large") baseCustRem = 0.94;
  else if (s.customer_info_size === "extra_large") baseCustRem = 1.08;
  const finalCustRem = (baseCustRem * custScaleMult).toFixed(2);
  const custAlign = s.customer_info_align || "left";

  const money = (n: number) => `${order.currency}${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const siteBase = order.brand.website
    ? (order.brand.website.startsWith("http") ? order.brand.website : `https://${order.brand.website}`)
    : "https://orizino.com";
  const verifyUrl = `${siteBase.replace(/\/+$/, "")}/verify?code=${encodeURIComponent(order.order_number)}`;
  const qrSvg = generateQrSvg(verifyUrl);

  const rawWebsite = order.brand.website || "www.orizino.com";
  let displayWebsite = rawWebsite.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!displayWebsite.startsWith("www.") && displayWebsite.includes("orizino")) {
    displayWebsite = "www." + displayWebsite;
  }

  const isCod = (order.payment_method || "").toLowerCase().includes("cash") || (order.payment_method || "").toLowerCase().includes("cod");

  return `<!doctype html>
<html lang="en" style="font-size: ${baseFontSize}px !important;">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Invoice Slip — ${escapeHtml(order.order_number)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800;900&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Space+Grotesk:wght@600;700;800&display=block" rel="stylesheet">
<style>
  :root {
    --accent: ${accentColor};
    --gold-line: ${goldLine};
    --gold-soft: ${goldSoft};
    --text: ${textColor};
    --muted: #5C4046;
    --bg: ${bgColor};
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  @page {
    size: ${widthIn}in auto;
    margin: 0;
  }

  html, body {
    width: ${widthIn}in;
    min-width: ${widthIn}in;
    max-width: ${widthIn}in;
    height: auto !important;
    background: transparent;
    color: var(--text);
    font-family: ${JSON.stringify(s.font_family)}, 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    font-size: ${baseFontSize}px !important;
    line-height: 1.35;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  /* ── Slip Container (Tightly fitted to content) ── */
  .pos-slip-card {
    width: ${widthIn}in;
    min-width: ${widthIn}in;
    max-width: ${widthIn}in;
    padding: 7px 8px 10px 8px;
    position: relative;
    background: var(--bg);
    box-sizing: border-box;
    display: inline-block;
    vertical-align: top;
  }

  /* Golden Double Border Frame */
  .pos-frame {
    border: 1.5px solid var(--gold-line);
    border-radius: 5px;
    padding: 8px 9px;
    position: relative;
    background: var(--bg);
  }

  .pos-inner-border {
    position: absolute;
    inset: 2.5px;
    border: 1px solid var(--gold-soft);
    border-radius: 3px;
    pointer-events: none;
  }

  /* Subtle Phoenix Watermark */
  .pos-watermark {
    position: absolute;
    top: 45%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: ${widthIn >= 3.0 ? "200px" : "150px"};
    height: ${widthIn >= 3.0 ? "200px" : "150px"};
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    user-select: none;
    z-index: 1;
    opacity: ${watermarkOpacity};
    color: var(--accent);
  }
  .pos-watermark svg {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .pos-content {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  /* ── Header ── */
  .pos-header {
    text-align: center;
    padding-bottom: 4px;
    border-bottom: 1px dashed var(--gold-line);
  }

  .pos-brand-logo {
    width: ${finalLogoPx}px;
    height: ${finalLogoPx}px;
    margin: 0 auto 3px auto;
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pos-brand-logo svg {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .pos-brand-title {
    font-family: 'Cinzel', serif;
    font-size: ${finalBrandRem}rem;
    font-weight: 900;
    letter-spacing: 0.05em;
    color: var(--text);
    text-transform: uppercase;
    line-height: 1.2;
  }

  .pos-slip-badge {
    display: inline-block;
    background: var(--accent);
    color: #FFFFFF;
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    padding: 2.5px 8px;
    border-radius: 3px;
    margin-top: 3px;
    text-transform: uppercase;
  }

  .pos-meta-line {
    display: flex;
    justify-content: space-between;
    font-size: 0.78rem;
    font-weight: 700;
    margin-top: 4px;
    color: var(--muted);
    font-family: 'Space Grotesk', monospace, sans-serif;
  }

  /* ── Recipient ── */
  .pos-customer-box {
    background: rgba(197, 160, 89, 0.08);
    border: 1px solid var(--gold-soft);
    border-radius: 4px;
    padding: 6px 8px;
    font-size: ${finalCustRem}rem;
    text-align: ${custAlign};
  }

  .pos-cust-label {
    font-family: 'Cinzel', sans-serif;
    font-size: ${(Number(finalCustRem) * 0.78).toFixed(2)}rem;
    font-weight: 800;
    color: var(--accent);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .pos-cust-name {
    font-weight: 800;
    color: var(--text);
    font-size: ${(Number(finalCustRem) * 1.15).toFixed(2)}rem;
    line-height: 1.25;
    margin-top: 1px;
  }

  .pos-cust-phone {
    font-family: 'Space Grotesk', monospace, sans-serif;
    font-weight: 800;
    color: var(--accent);
    font-size: ${(Number(finalCustRem) * 1.05).toFixed(2)}rem;
    margin-top: 2px;
  }

  .pos-cust-addr {
    font-size: ${finalCustRem}rem;
    color: var(--text);
    line-height: 1.35;
    margin-top: 2px;
  }

  /* ── Items Table ── */
  .pos-items-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.78rem;
  }

  .pos-items-table th {
    font-family: 'Cinzel', sans-serif;
    font-size: 0.68rem;
    font-weight: 800;
    text-align: left;
    padding: 3.5px 1px;
    border-bottom: 1px solid var(--gold-line);
    color: var(--accent);
    text-transform: uppercase;
  }

  .pos-items-table td {
    padding: 4px 1px;
    border-bottom: 0.5px solid rgba(197, 160, 89, 0.25);
    vertical-align: top;
  }

  .pos-item-name {
    font-weight: 700;
    color: var(--text);
    font-size: 0.86rem;
    line-height: 1.25;
  }

  .pos-item-sub {
    font-size: 0.72rem;
    color: var(--muted);
    margin-top: 1.5px;
  }

  .pos-item-total {
    text-align: right;
    font-weight: 800;
    font-size: 0.86rem;
    font-family: 'Space Grotesk', monospace, sans-serif;
    color: var(--text);
    white-space: nowrap;
  }

  /* ── Totals ── */
  .pos-totals-box {
    border-top: 1px dashed var(--gold-line);
    padding-top: 4px;
    font-size: 0.80rem;
  }

  .pos-total-row {
    display: flex;
    justify-content: space-between;
    padding: 2px 0;
    color: var(--muted);
    font-weight: 600;
  }

  .pos-grand-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--gold-line);
    border-bottom: 1px solid var(--gold-line);
    padding: 4px 0;
    margin-top: 3px;
    font-size: 1.05rem;
    font-weight: 900;
    color: var(--accent);
  }

  /* ── Payment Banner ── */
  .pos-pay-badge {
    background: ${isCod ? accentColor : "#059669"};
    color: #FFFFFF;
    text-align: center;
    border-radius: 4px;
    padding: 4px 6px;
    margin-top: 3px;
  }
  .pos-pay-title {
    font-family: 'Cinzel', sans-serif;
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .pos-pay-val {
    font-family: 'Space Grotesk', monospace, sans-serif;
    font-size: 1.15rem;
    font-weight: 900;
    line-height: 1.15;
    margin-top: 1px;
  }

  /* ── Bottom Full-Width QR & Authentication Section ── */
  .pos-footer-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 3.5px;
    padding-top: 7px;
    border-top: 1px dashed var(--gold-line);
    width: 100%;
  }

  .pos-qr-center-box {
    display: flex;
    justify-content: center;
    width: 100%;
    margin-bottom: 4px;
  }

  .pos-qr-wrap {
    width: ${finalQrPx}px;
    height: ${finalQrPx}px;
    max-width: 96%;
    padding: 3.5px;
    background: #FFFFFF;
    border: 1.5px solid var(--accent);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  }
  .pos-qr-wrap svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .pos-qr-order-id {
    font-family: 'Space Grotesk', monospace, sans-serif;
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--text);
    letter-spacing: 0.03em;
  }

  .pos-qr-auth-title {
    font-family: 'Cinzel', serif;
    font-size: clamp(0.78rem, 4.4vw, 0.96rem);
    font-weight: 900;
    color: var(--accent);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
    display: block;
    width: 100%;
    text-align: center;
    line-height: 1.25;
    margin: 2px 0 1px;
  }

  .pos-qr-guide {
    font-size: 0.70rem;
    color: var(--muted);
    line-height: 1.3;
    max-width: 95%;
  }

  .pos-qr-thankyou {
    font-size: 0.76rem;
    font-weight: 700;
    color: var(--text);
    margin-top: 2px;
    line-height: 1.3;
  }

  .pos-qr-website {
    font-family: 'Space Grotesk', monospace, sans-serif;
    font-size: 0.82rem;
    font-weight: 800;
    color: var(--accent);
    letter-spacing: 0.04em;
    margin-top: 1px;
  }

  @media print {
    html, body {
      width: ${widthIn}in !important;
      min-width: ${widthIn}in !important;
      max-width: ${widthIn}in !important;
      height: auto !important;
      background: var(--bg) !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      font-size: ${baseFontSize}px !important;
    }
    .pos-slip-card {
      width: ${widthIn}in !important;
      padding: 2.5mm !important;
    }
  }
</style>
</head>
<body>
<div class="pos-slip-card" id="pos-root">
  <div class="pos-frame">
    <div class="pos-inner-border"></div>

    <!-- Subtle Phoenix Watermark -->
    <div class="pos-watermark" aria-hidden="true">
      ${ORIZINO_LOGO_SVG_PATHS}
    </div>

    <div class="pos-content">
      <!-- 1. Header -->
      <div class="pos-header">
        <div class="pos-brand-logo">
          ${ORIZINO_LOGO_SVG_PATHS}
        </div>
        <div class="pos-brand-title">${escapeHtml(order.brand.name || "ORIZINO IMPERIAL GOODS CO.")}</div>
        <div class="pos-slip-badge">INVOICE SLIP</div>
        <div class="pos-meta-line">
          <span>#${escapeHtml(order.order_number)}</span>
          <span>${escapeHtml(order.issue_date)}</span>
        </div>
      </div>

      <!-- 2. Customer Delivery Destination -->
      <div class="pos-customer-box">
        <div class="pos-cust-label">DELIVER TO:</div>
        <div class="pos-cust-name">${escapeHtml(order.customer.full_name || "Valued Client")}</div>
        <div class="pos-cust-phone">TEL: ${escapeHtml(order.customer.phone || "(40) 253-6726")}</div>
        <div class="pos-cust-addr">${escapeHtml(order.customer.shipping_address || order.customer.billing_address || "Address Road, Capital City")}</div>
      </div>

      <!-- 3. Line Items Table -->
      <table class="pos-items-table">
        <thead>
          <tr>
            <th>ITEM DESCRIPTION</th>
            <th style="text-align:right;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${order.items
            .map(
              (it) => `
            <tr>
              <td>
                <div class="pos-item-name">${escapeHtml(it.name)}</div>
                <div class="pos-item-sub">${it.quantity} × ${money(it.unit_price)} ${it.sku ? `· ${escapeHtml(it.sku)}` : ""}</div>
              </td>
              <td class="pos-item-total">${money(it.line_total)}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>

      <!-- 4. Financial Totals -->
      <div class="pos-totals-box">
        <div class="pos-total-row">
          <span>Subtotal</span>
          <span class="font-mono">${money(order.subtotal)}</span>
        </div>
        ${
          order.shipping_fee > 0
            ? `
          <div class="pos-total-row">
            <span>Delivery Fee</span>
            <span class="font-mono">${money(order.shipping_fee)}</span>
          </div>
        `
            : ""
        }
        ${
          order.discount > 0
            ? `
          <div class="pos-total-row" style="color:var(--accent);">
            <span>Discount</span>
            <span class="font-mono">-${money(order.discount)}</span>
          </div>
        `
            : ""
        }
        <div class="pos-grand-total">
          <span>TOTAL</span>
          <span class="font-mono">${money(order.total)}</span>
        </div>
      </div>

      <!-- 5. Payment Badge -->
      <div class="pos-pay-badge">
        <div class="pos-pay-title">${isCod ? "CASH ON DELIVERY (COD)" : "PAID · PREPAID ORDER"}</div>
        <div class="pos-pay-val">${money(order.total)}</div>
      </div>

      <!-- 6. Bottom Full-Width QR & Authentication Seal -->
      <div class="pos-footer-col">
        <div class="pos-qr-center-box">
          <div class="pos-qr-wrap">
            ${qrSvg}
          </div>
        </div>
        <div class="pos-qr-order-id">#${escapeHtml(order.order_number)}</div>
        <div class="pos-qr-auth-title">GENUINE ORIZINO PRODUCT</div>
        <div class="pos-qr-guide">Scan with camera to verify full official invoice details.</div>
        <div class="pos-qr-thankyou">${escapeHtml(s.footer_text || "Thank you for choosing Orizino.")}</div>
        <div class="pos-qr-website">${escapeHtml(displayWebsite)}</div>
      </div>
    </div>
  </div>
</div>
<script>
  window.addEventListener('load', function() {
    var card = document.getElementById('pos-root');
    var h = card ? card.offsetHeight : document.body.scrollHeight;
    window.parent.postMessage({ type: 'pos-resize', height: h }, '*');
  });
</script>
</body>
</html>`;
}
