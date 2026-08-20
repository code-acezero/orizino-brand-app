/**
 * Luxury Order Shipping Sticker & Dispatch Label Rendering — English Heritage & Cherry Vanilla
 *
 * Designed specifically for shipping packages, courier dispatch, and parcel labeling.
 * Features:
 * - ORIZINO Branding with Red Crest Logo on the left, official link, phone on top, and email bottom to the right of brand name
 * - Straight, properly visible watermark in background shining through semi-transparent cards
 * - Customer deliver header with vertical divider line and ORDER DATE on the right
 * - Large High-Visibility Customer Name, Phone, Email (if available), and Delivery Address (with monochrome vector icons)
 * - Vertically centered Header Right Badge (#ORZ-884910 + Official Parcel) matching brand alignment
 * - Maximized Authentication QR Code with proper left/right/top/bottom fit
 * - Dividing right column: Item Count (e.g. "1 Item", "6 Items") on top, horizontal gold divider, Authentication QR on bottom with scan note
 * - Split footer: full text "CASH ON DELIVERY DUE" in left box, and amount only in red box on right, perfectly parallel to body columns
 * - Luxury Imperial Gold & Velvet Cherry double border aesthetic matching Tax Invoice & POS Slip
 */

import type { InvoiceSettings } from "./invoice-settings.schema";
import bwipjs from "bwip-js/browser";
import type { InvoiceOrderPayload } from "./invoice-render";

export type OrderStickerSize = "4x2" | "4x3" | "4x4" | "4x6";

export const ORDER_STICKER_SIZES: Record<
  OrderStickerSize,
  { label: string; widthIn: number; heightIn: number; widthMm: number; heightMm: number; desc: string }
> = {
  "4x2": {
    label: '4" × 2" (Standard Shipping Label)',
    widthIn: 4.0,
    heightIn: 2.0,
    widthMm: 101.6,
    heightMm: 50.8,
    desc: "Compact courier sticker (Zebra, Rollo, Xprinter, Dymo)",
  },
  "4x3": {
    label: '4" × 3" (Dispatch & Logistics Label)',
    widthIn: 4.0,
    heightIn: 3.0,
    widthMm: 101.6,
    heightMm: 76.2,
    desc: "Standard e-commerce parcel sticker with item manifest",
  },
  "4x4": {
    label: '4" × 4" (Square Courier Parcel Label)',
    widthIn: 4.0,
    heightIn: 4.0,
    widthMm: 101.6,
    heightMm: 101.6,
    desc: "Universal logistics label with extra notes and return info",
  },
  "4x6": {
    label: '4" × 6" (Full Thermal Shipping Waybill)',
    widthIn: 4.0,
    heightIn: 6.0,
    widthMm: 101.6,
    heightMm: 152.4,
    desc: "Standard courier waybill for multi-item luxury orders",
  },
};

const ORIZINO_LOGO_SVG_PATHS = `
<svg viewBox="0 0 540 566" xmlns="http://www.w3.org/2000/svg" class="sticker-watermark-svg">
  <path fill="currentColor" d="M11.31,303.01l10.42,10.61,102.73,114.11c-16.27-34.27-34.28-66.2-53.79-98.11L0,219.52l41.25-42.82,104.13-107.09C169.3,45.99,192.23,22.22,218.19,0l-71.11,101.28L55.74,232.06c26,65.57,52.95,130.16,81.76,194.32l12.16,25.25,71.16,112.86L52.01,416.82l-40.7-113.8Z"/>
  <path fill="currentColor" d="M510.24,351.74l-23.18,64.87-169.05,148.54,27.52-44.45,45.28-70.91,30.12-65.82,16.7-38.98,46-113.02-81.21-116.77-25.93-36.85L321.38.16c14.41,11.93,26.61,24.47,40.1,37.05l86.76,87.48,77.26,80.22,13.77,14.47-52.64,81.42c-26.66,41.23-50.32,83.4-72.56,127.58l33.83-36.98,79.5-88.8-17.16,49.14Z"/>
  <path fill="currentColor" d="M356.28,185.04l26.95,46.73-36.12,40.33-32.01,35.6-5.9,33.94-22.1,115.86-19.75,106.98-25.06-136.06-23.26-120.77-10.57-11.82-57.13-64.08,17.38-30.41,40.24-67.6c-.28,10.99,4.75,22.09,2.63,32.95l-18.99,63.2,44.02,68.95,9.75,55.81,20.97,113.31,20.22-107.91,10.47-61.52,44.22-68.68-19.37-63.68,2.55-32.17,30.86,51.02Z"/>
</svg>
`;

// Monochrome SVG Icons
const PHONE_ICON_SVG = `<svg class="mono-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;

const MAIL_ICON_SVG = `<svg class="mono-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;

const PIN_ICON_SVG = `<svg class="mono-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;

const BOX_ICON_SVG = `<svg class="mono-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`;

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

/** Render standalone Order Shipping Sticker HTML */
export function renderOrderStickerHtml(
  s: InvoiceSettings,
  order: InvoiceOrderPayload,
  labelSize: OrderStickerSize = "4x2"
): string {
  const sizeConfig = ORDER_STICKER_SIZES[labelSize] || ORDER_STICKER_SIZES["4x2"];
  const widthIn = sizeConfig.widthIn;
  const heightIn = sizeConfig.heightIn;
  const rightColWidth = heightIn >= 3.0 ? "100px" : "90px";
  const qrSizePx = heightIn >= 3.0 ? 70 : 56;

  const accentColor = s.accent_color || "#6B0F1A";
  const goldLine = "#C5A059";
  const goldSoft = "rgba(197, 160, 89, 0.4)";
  const textColor = s.text_color || "#1D070B";
  const bgColor = s.bg_color || "#FDFBF7";
  const watermarkOpacity = typeof s.watermark_opacity === "number" ? Math.max(0.12, s.watermark_opacity) : 0.12;

  const rawOrderNum = order.order_number || "ORZ-884910";
  const orderNum = escapeHtml(rawOrderNum.startsWith("ORZ-") ? rawOrderNum : `ORZ-${rawOrderNum.replace(/[^0-9A-Za-z]/g, "") || "884910"}`);
  
  const qrUrl = `https://orizino.com/verify/order/${encodeURIComponent(orderNum)}`;
  const qrSvg = generateQrSvg(qrUrl);

  const brandName = escapeHtml(order.brand?.name || "ORIZINO");
  const brandPhone = escapeHtml(order.brand?.phone || "+880 1800-000000");
  const brandEmail = escapeHtml(order.brand?.email || "concierge@orizino.com");
  const brandWebsite = "www.orizino.com";

  const customerName = escapeHtml(order.customer?.full_name || "VALUED CLIENT");
  const customerPhone = escapeHtml(order.customer?.phone || "+880 1700-000000");
  const customerEmail = escapeHtml(order.customer?.email || "");
  const customerAddress = escapeHtml(order.customer?.shipping_address || order.customer?.billing_address || "Dhaka, Bangladesh");

  const orderDate = escapeHtml(
    order.issue_date ||
      ((order as any).created_at
        ? new Date((order as any).created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()
        : "21 AUG 2026")
  );

  const isCod = (order.payment_method || "").toLowerCase().includes("cash") || (order.payment_status || "").toLowerCase() === "pending" || order.total > 0;
  const codAmount = order.total || 0;
  const currency = escapeHtml(order.currency || "৳");

  const itemsCount = (order.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0);
  const itemsLabel = `${itemsCount} ${itemsCount === 1 ? "Item" : "Items"}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Order Shipping Sticker — ${orderNum}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --accent: ${accentColor};
    --gold-line: ${goldLine};
    --gold-soft: ${goldSoft};
    --text-primary: ${textColor};
    --bg-page: ${bgColor};
    --font-heading: 'Cinzel', 'Playfair Display', serif;
    --font-body: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-mono: 'Space Grotesk', monospace;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  html, body {
    width: 100%;
    height: 100%;
    background: transparent;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: var(--font-body);
    color: var(--text-primary);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  @page {
    size: ${widthIn}in ${heightIn}in;
    margin: 0;
  }

  @media print {
    body {
      background: #FFFFFF !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .sticker-card {
      box-shadow: none !important;
      border: 1.5pt solid var(--gold-line) !important;
    }
  }

  .sticker-card {
    position: relative;
    width: ${widthIn}in;
    height: ${heightIn}in;
    min-width: ${widthIn}in;
    min-height: ${heightIn}in;
    background: var(--bg-page);
    padding: 0.08in 0.1in;
    border: 2px solid var(--gold-line);
    border-radius: 2px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
    flex-shrink: 0;
  }

  /* Inner Luxury Double Border */
  .sticker-inner-border {
    position: absolute;
    inset: 3px;
    border: 1px solid var(--gold-soft);
    border-radius: 1px;
    pointer-events: none;
    z-index: 1;
  }

  /* Straight & Properly Visible Center Watermark */
  .sticker-watermark {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: ${watermarkOpacity};
    color: var(--accent);
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
  }
  .sticker-watermark-svg {
    width: ${heightIn >= 3.0 ? "240px" : "180px"};
    height: ${heightIn >= 3.0 ? "240px" : "180px"};
    transform: none !important;
  }

  .content-layer {
    position: relative;
    z-index: 2;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 3.5px;
  }

  /* Monochrome Vector Icons */
  .mono-icon {
    width: 10px;
    height: 10px;
    display: inline-block;
    vertical-align: middle;
    color: var(--accent);
    flex-shrink: 0;
  }

  /* ── Header: ORIZINO Branding with RED Crest Logo & Phone on Top / Email on Bottom ── */
  .sticker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1.2px solid var(--gold-line);
    padding-bottom: 2.5px;
    gap: 6px;
    min-height: 34px;
  }

  .brand-left-group {
    display: flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
  }

  .brand-logo-frame {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #FFFFFF;
    border: 1.2px solid var(--gold-line);
    border-radius: 3px;
    padding: 3px;
    flex-shrink: 0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    color: var(--accent);
  }

  .brand-logo-svg {
    width: 100%;
    height: 100%;
    display: block;
    color: var(--accent);
    fill: var(--accent);
  }

  .brand-meta-group {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .brand-name-col {
    display: flex;
    flex-direction: column;
    justify-content: center;
    line-height: 1.1;
  }

  .brand-title {
    font-family: var(--font-heading);
    font-size: 12.5px;
    font-weight: 800;
    letter-spacing: 0.12em;
    color: var(--accent);
    line-height: 1.05;
    text-transform: uppercase;
  }

  .official-url {
    font-size: 8px;
    color: var(--accent);
    font-weight: 800;
    letter-spacing: 0.02em;
    margin-top: 1px;
    white-space: nowrap;
  }

  .brand-v-divider {
    width: 1px;
    height: 22px;
    background: var(--gold-line);
    opacity: 0.75;
    flex-shrink: 0;
  }

  .brand-contact-col {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1.5px;
    min-width: 0;
  }

  .brand-contact-item {
    font-size: 7.5px;
    color: #475569;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 3.5px;
    white-space: nowrap;
    line-height: 1.15;
  }

  .brand-contact-item .mono-icon {
    width: 8.5px;
    height: 8.5px;
    color: var(--accent);
  }

  .header-right-badge {
    text-align: right;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: center;
    gap: 1.5px;
  }

  .dispatch-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--accent);
    color: #FFFFFF;
    font-size: 7px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 2px 6px;
    border-radius: 2px;
    line-height: 1;
  }

  .order-ref-code {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 800;
    color: var(--accent);
    letter-spacing: 0.04em;
    line-height: 1.1;
  }

  /* ── Body: Left Customer Info Box + Right Divided QR Box (Width: ${rightColWidth}) ── */
  .sticker-body {
    display: grid;
    grid-template-columns: 1fr ${rightColWidth};
    gap: 6px;
    flex: 1;
    align-items: stretch;
    min-height: 0;
  }

  .customer-address-box {
    background: rgba(255, 255, 255, 0.45);
    border: 1.2px solid var(--gold-line);
    border-radius: 3px;
    padding: 4px 6.5px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-width: 0;
  }

  .customer-deliver-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    border-bottom: 1px solid var(--gold-soft);
    padding-bottom: 1.5px;
    margin-bottom: 2px;
    font-size: 7px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--accent);
  }

  .deliver-label-title {
    white-space: nowrap;
  }

  .deliver-label-divider {
    width: 1px;
    height: 9px;
    background: var(--gold-line);
    opacity: 0.6;
    flex-shrink: 0;
  }

  .deliver-label-date {
    font-family: var(--font-mono);
    white-space: nowrap;
    font-weight: 700;
  }

  .customer-name {
    font-family: var(--font-body);
    font-size: ${heightIn >= 3.0 ? "13.5px" : "12px"};
    font-weight: 800;
    color: #0F172A;
    line-height: 1.15;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    margin-bottom: 1px;
  }

  .customer-phone {
    font-family: var(--font-mono);
    font-size: ${heightIn >= 3.0 ? "11.5px" : "10.5px"};
    font-weight: 800;
    color: var(--accent);
    display: flex;
    align-items: center;
    gap: 4px;
    letter-spacing: 0.03em;
    margin-bottom: 1px;
  }

  .customer-email {
    font-size: ${heightIn >= 3.0 ? "9.5px" : "8.5px"};
    font-weight: 600;
    color: #475569;
    display: flex;
    align-items: center;
    gap: 4px;
    letter-spacing: 0.01em;
    margin-bottom: 1.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .customer-email .mono-icon {
    width: 8.5px;
    height: 8.5px;
    color: var(--accent);
  }

  .customer-address {
    font-size: ${heightIn >= 3.0 ? "10px" : "9px"};
    font-weight: 600;
    color: #1E293B;
    line-height: 1.2;
    display: flex;
    align-items: flex-start;
    gap: 4px;
  }

  .customer-address span {
    display: -webkit-box;
    -webkit-line-clamp: ${heightIn >= 3.0 ? "3" : "2"};
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* ── Right Column: Item Count on Top + Divider Line + Maximized QR on Bottom ── */
  .right-box-wrapper {
    background: rgba(255, 255, 255, 0.45);
    border: 1.2px solid var(--gold-line);
    border-radius: 3px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: 100%;
    justify-content: space-between;
    width: 100%;
  }

  .item-count-box {
    padding: 3px 4px;
    background: rgba(253, 244, 231, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    flex-shrink: 0;
  }

  .item-count-value {
    font-family: var(--font-body);
    font-size: 8.5px;
    font-weight: 800;
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3.5px;
    line-height: 1.1;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .item-count-value .mono-icon {
    width: 9px;
    height: 9px;
    color: var(--accent);
  }

  .right-box-divider {
    height: 1px;
    background: var(--gold-line);
    width: 100%;
    flex-shrink: 0;
  }

  .qr-section {
    padding: 2px 2px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    flex: 1;
    text-align: center;
    min-height: 0;
  }

  .qr-tag-top {
    font-size: 5.5px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent);
    background: #FDF4E7;
    border: 1px solid var(--gold-soft);
    padding: 1px 2px;
    border-radius: 2px;
    width: 100%;
    margin-bottom: 1px;
    white-space: nowrap;
    line-height: 1.1;
    flex-shrink: 0;
  }

  .qr-svg-holder {
    width: ${qrSizePx}px;
    height: ${qrSizePx}px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #FFFFFF;
    border-radius: 2px;
    padding: 1px;
    margin: 1px auto;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    flex-shrink: 0;
  }

  .qr-svg-holder svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .qr-tag-bot {
    font-size: 5px;
    font-weight: 700;
    color: #475569;
    line-height: 1.1;
    margin-top: 1px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* ── Footer: Full Text on Left + Amount Only on Right in Red Box (PERFECTLY PARALLEL) ── */
  .sticker-footer {
    border-top: 1.2px solid var(--gold-line);
    padding-top: 2.5px;
    display: grid;
    grid-template-columns: 1fr ${rightColWidth};
    align-items: stretch;
    gap: 6px;
  }

  .footer-left-box {
    background: rgba(255, 255, 255, 0.45);
    border: 1px solid var(--gold-line);
    border-radius: 2px;
    padding: 2px 6px;
    display: flex;
    align-items: center;
    min-width: 0;
    width: 100%;
    box-sizing: border-box;
  }

  .footer-cod-text {
    font-family: var(--font-body);
    font-size: 8px;
    font-weight: 800;
    color: var(--accent);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .footer-amount-box {
    padding: 2px 4px;
    border-radius: 2px;
    font-weight: 800;
    font-family: var(--font-mono);
    font-size: 10.5px;
    letter-spacing: 0.04em;
    white-space: nowrap;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    box-sizing: border-box;
  }

  .footer-amount-box.due {
    background: #FFEBEF;
    color: #9F1239;
    border: 1.2px solid #FDA4AF;
  }

  .footer-amount-box.paid {
    background: #ECFDF5;
    color: #047857;
    border: 1.2px solid #A7F3D0;
  }
</style>
</head>
<body>

<div class="sticker-card">
  <div class="sticker-inner-border"></div>
  <div class="sticker-watermark">${ORIZINO_LOGO_SVG_PATHS}</div>

  <div class="content-layer">
    <!-- Top Header: ORIZINO Branding with Red Crest Logo & Phone on Top / Email on Bottom -->
    <div class="sticker-header">
      <div class="brand-left-group">
        <div class="brand-logo-frame">
          <svg viewBox="0 0 540 566" class="brand-logo-svg">
            <path fill="currentColor" d="M11.31,303.01l10.42,10.61,102.73,114.11c-16.27-34.27-34.28-66.2-53.79-98.11L0,219.52l41.25-42.82,104.13-107.09C169.3,45.99,192.23,22.22,218.19,0l-71.11,101.28L55.74,232.06c26,65.57,52.95,130.16,81.76,194.32l12.16,25.25,71.16,112.86L52.01,416.82l-40.7-113.8Z"/>
            <path fill="currentColor" d="M510.24,351.74l-23.18,64.87-169.05,148.54,27.52-44.45,45.28-70.91,30.12-65.82,16.7-38.98,46-113.02-81.21-116.77-25.93-36.85L321.38.16c14.41,11.93,26.61,24.47,40.1,37.05l86.76,87.48,77.26,80.22,13.77,14.47-52.64,81.42c-26.66,41.23-50.32,83.4-72.56,127.58l33.83-36.98,79.5-88.8-17.16,49.14Z"/>
            <path fill="currentColor" d="M356.28,185.04l26.95,46.73-36.12,40.33-32.01,35.6-5.9,33.94-22.1,115.86-19.75,106.98-25.06-136.06-23.26-120.77-10.57-11.82-57.13-64.08,17.38-30.41,40.24-67.6c-.28,10.99,4.75,22.09,2.63,32.95l-18.99,63.2,44.02,68.95,9.75,55.81,20.97,113.31,20.22-107.91,10.47-61.52,44.22-68.68-19.37-63.68,2.55-32.17,30.86,51.02Z"/>
          </svg>
        </div>
        <div class="brand-meta-group">
          <div class="brand-name-col">
            <span class="brand-title">${brandName}</span>
            <span class="official-url">${brandWebsite}</span>
          </div>
          <div class="brand-v-divider"></div>
          <div class="brand-contact-col">
            <div class="brand-contact-item">
              ${PHONE_ICON_SVG}
              <span>${brandPhone}</span>
            </div>
            <div class="brand-contact-item">
              ${MAIL_ICON_SVG}
              <span>${brandEmail}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="header-right-badge">
        <div class="dispatch-pill">Official Parcel</div>
        <div class="order-ref-code">#${orderNum}</div>
      </div>
    </div>

    <!-- Main Body: Large Customer Info & Delivery Address + Divided QR & Item Count -->
    <div class="sticker-body">
      <div class="customer-address-box">
        <div class="customer-deliver-label">
          <span class="deliver-label-title">DELIVER TO CUSTOMER</span>
          <span class="deliver-label-divider"></span>
          <span class="deliver-label-date">ORDER DATE: ${orderDate}</span>
        </div>
        <div class="customer-name">${customerName}</div>
        <div class="customer-phone">
          ${PHONE_ICON_SVG}
          <span>${customerPhone}</span>
        </div>
        ${
          customerEmail
            ? `<div class="customer-email">
                ${MAIL_ICON_SVG}
                <span>${customerEmail}</span>
              </div>`
            : ""
        }
        <div class="customer-address">
          ${PIN_ICON_SVG}
          <span>${customerAddress}</span>
        </div>
      </div>

      <!-- Right Column: Item Count on Top + Divider Line + Maximized QR on Bottom -->
      <div class="right-box-wrapper">
        <div class="item-count-box">
          <div class="item-count-value">
            ${BOX_ICON_SVG}
            <span>${itemsLabel}</span>
          </div>
        </div>
        <div class="right-box-divider"></div>
        <div class="qr-section">
          <div class="qr-tag-top">AUTHENTICATION QR</div>
          <div class="qr-svg-holder">
            ${qrSvg}
          </div>
          <div class="qr-tag-bot">Scan to check the order details</div>
        </div>
      </div>
    </div>

    <!-- Bottom Footer: Full text on left + amount only in red box on right (PERFECTLY PARALLEL) -->
    <div class="sticker-footer">
      <div class="footer-left-box">
        <span class="footer-cod-text">
          ${isCod && codAmount > 0 ? "CASH ON DELIVERY DUE" : "PREPAID ORDER — NO PAYMENT DUE"}
        </span>
      </div>
      <div class="footer-amount-box ${isCod && codAmount > 0 ? 'due' : 'paid'}">
        ${isCod && codAmount > 0 ? `${currency}${codAmount.toLocaleString()}` : 'PAID'}
      </div>
    </div>
  </div>
</div>

</body>
</html>`;
}
