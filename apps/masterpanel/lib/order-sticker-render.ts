/**
 * Luxury Imperial Order Shipping & Dispatch Sticker Rendering
 *
 * Exact Half of A4 Size Horizontal (A5 Landscape: 210mm x 148.5mm),
 * zero-scroll viewport, Imperial Cherry Vanilla theme matching the invoice,
 * high-contrast courier barcode, authentic verification QR, and postal stamp seal.
 */

import type { InvoiceSettings } from "./invoice-settings.schema";
import bwipjs from "bwip-js/browser";
import type { InvoiceOrderPayload } from "./invoice-render";

const ORIZINO_LOGO_SVG_PATHS = `
<svg viewBox="0 0 540 566" xmlns="http://www.w3.org/2000/svg" class="stk-watermark-svg">
  <path fill="currentColor" d="M11.31,303.01l10.42,10.61,102.73,114.11c-16.27-34.27-34.28-66.2-53.79-98.11L0,219.52l41.25-42.82,104.13-107.09C169.3,45.99,192.23,22.22,218.19,0l-71.11,101.28L55.74,232.06c26,65.57,52.95,130.16,81.76,194.32l12.16,25.25,71.16,112.86L52.01,416.82l-40.7-113.8Z"/>
  <path fill="currentColor" d="M510.24,351.74l-23.18,64.87-169.05,148.54,27.52-44.45,45.28-70.91,30.12-65.82,16.7-38.98,46-113.02-81.21-116.77-25.93-36.85L321.38.16c14.41,11.93,26.61,24.47,40.1,37.05l86.76,87.48,77.26,80.22,13.77,14.47-52.64,81.42c-26.66,41.23-50.32,83.4-72.56,127.58l33.83-36.98,79.5-88.8-17.16,49.14Z"/>
  <path fill="currentColor" d="M356.28,185.04l26.95,46.73-36.12,40.33-32.01,35.6-5.9,33.94-22.1,115.86-19.75,106.98-25.06-136.06-23.26-120.77-10.57-11.82-57.13-64.08,17.38-30.41,40.24-67.6c-.28,10.99,4.75,22.09,2.63,32.95l-18.99,63.2,44.02,68.95,9.75,55.81,20.97,113.31,20.22-107.91,10.47-61.52,44.22-68.68-19.37-63.68,2.55-32.17,30.86,51.02Z"/>
</svg>
`;

const CORNER_CLOUD_TL = `
<svg viewBox="0 0 100 100" class="stk-corner stk-corner-tl" xmlns="http://www.w3.org/2000/svg">
  <path d="M4,96 L4,28 C4,14.7 14.7,4 28,4 L96,4" fill="none" stroke="var(--gold-line)" stroke-width="2"/>
  <path d="M8,96 L8,30 C8,17.8 17.8,8 30,8 L96,8" fill="none" stroke="var(--gold-soft)" stroke-width="1"/>
  <path d="M12,42 C12,25 25,12 42,12 C52,12 60,18 64,26 C68,22 74,20 80,22 C88,24 92,32 90,40 C88,48 80,52 72,50 C66,48 64,42 66,36 C68,30 74,28 78,30" fill="none" stroke="var(--gold-line)" stroke-width="1.3" stroke-linecap="round"/>
  <circle cx="28" cy="28" r="2.5" fill="var(--accent)"/>
</svg>
`;

const CORNER_CLOUD_TR = `
<svg viewBox="0 0 100 100" class="stk-corner stk-corner-tr" xmlns="http://www.w3.org/2000/svg">
  <path d="M96,96 L96,28 C96,14.7 85.3,4 72,4 L4,4" fill="none" stroke="var(--gold-line)" stroke-width="2"/>
  <path d="M92,96 L92,30 C92,17.8 82.2,8 70,8 L4,8" fill="none" stroke="var(--gold-soft)" stroke-width="1"/>
  <path d="M88,42 C88,25 75,12 58,12 C48,12 40,18 36,26 C32,22 26,20 20,22 C12,24 8,32 10,40 C12,48 20,52 28,50 C34,48 36,42 34,36 C32,30 26,28 22,30" fill="none" stroke="var(--gold-line)" stroke-width="1.3" stroke-linecap="round"/>
  <circle cx="72" cy="28" r="2.5" fill="var(--accent)"/>
</svg>
`;

const CORNER_CLOUD_BL = `
<svg viewBox="0 0 100 100" class="stk-corner stk-corner-bl" xmlns="http://www.w3.org/2000/svg">
  <path d="M4,4 L4,72 C4,85.3 14.7,96 28,96 L96,96" fill="none" stroke="var(--gold-line)" stroke-width="2"/>
  <path d="M8,4 L8,70 C8,82.2 17.8,92 30,92 L96,92" fill="none" stroke="var(--gold-soft)" stroke-width="1"/>
  <circle cx="28" cy="72" r="2.5" fill="var(--accent)"/>
</svg>
`;

const CORNER_CLOUD_BR = `
<svg viewBox="0 0 100 100" class="stk-corner stk-corner-br" xmlns="http://www.w3.org/2000/svg">
  <path d="M96,4 L96,72 C96,85.3 85.3,96 72,96 L4,96" fill="none" stroke="var(--gold-line)" stroke-width="2"/>
  <path d="M92,4 L92,70 C92,82.2 82.2,92 70,92 L4,92" fill="none" stroke="var(--gold-soft)" stroke-width="1"/>
  <circle cx="72" cy="72" r="2.5" fill="var(--accent)"/>
</svg>
`;

const MOUNTAIN_WAVE_DIVIDER = `
<svg viewBox="0 0 800 20" class="stk-mountain-divider" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
  <path d="M0,10 L260,10 C280,10 290,2 305,2 C320,2 330,10 350,10 L375,10 C390,3 397,1 400,1 C403,1 410,3 425,10 L450,10 C470,10 480,2 495,2 C510,2 520,10 540,10 L800,10" fill="none" stroke="var(--gold-line)" stroke-width="1.3"/>
  <circle cx="400" cy="10" r="3" fill="var(--accent)"/>
</svg>
`;

const POSTAL_STAMP_SEAL = `
<div class="stk-postal-stamp" aria-hidden="true">
  <div class="stk-stamp-inner">
    <div class="stk-stamp-crest">
      <svg viewBox="0 0 100 100" class="stk-stamp-icon" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" stroke-width="2.2"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" stroke-width="1.2"/>
        <g transform="translate(26, 25) scale(0.088)" fill="currentColor">
          <path d="M11.31,303.01l10.42,10.61,102.73,114.11c-16.27-34.27-34.28-66.2-53.79-98.11L0,219.52l41.25-42.82,104.13-107.09C169.3,45.99,192.23,22.22,218.19,0l-71.11,101.28L55.74,232.06c26,65.57,52.95,130.16,81.76,194.32l12.16,25.25,71.16,112.86L52.01,416.82l-40.7-113.8Z"/>
          <path d="M510.24,351.74l-23.18,64.87-169.05,148.54,27.52-44.45,45.28-70.91,30.12-65.82,16.7-38.98,46-113.02-81.21-116.77-25.93-36.85L321.38.16c14.41,11.93,26.61,24.47,40.1,37.05l86.76,87.48,77.26,80.22,13.77,14.47-52.64,81.42c-26.66,41.23-50.32,83.4-72.56,127.58l33.83-36.98,79.5-88.8-17.16,49.14Z"/>
          <path d="M356.28,185.04l26.95,46.73-36.12,40.33-32.01,35.6-5.9,33.94-22.1,115.86-19.75,106.98-25.06-136.06-23.26-120.77-10.57-11.82-57.13-64.08,17.38-30.41,40.24-67.6c-.28,10.99,4.75,22.09,2.63,32.95l-18.99,63.2,44.02,68.95,9.75,55.81,20.97,113.31,20.22-107.91,10.47-61.52,44.22-68.68-19.37-63.68,2.55-32.17,30.86,51.02Z"/>
        </g>
      </svg>
    </div>
    <div class="stk-stamp-name">ORIZINO</div>
    <div class="stk-stamp-sub">AUTHENTIC</div>
  </div>
  <svg class="stk-postmark-waves" viewBox="0 0 60 28" xmlns="http://www.w3.org/2000/svg">
    <path d="M0,5 C12,0 20,10 32,5 C44,0 52,10 60,5" fill="none" stroke="currentColor" stroke-width="1.6"/>
    <path d="M0,14 C12,9 20,19 32,14 C44,9 52,19 60,14" fill="none" stroke="currentColor" stroke-width="1.6"/>
    <path d="M0,23 C12,18 20,28 32,23 C44,18 52,28 60,23" fill="none" stroke="currentColor" stroke-width="1.6"/>
  </svg>
</div>
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

function generate1DBarcodeSvg(text: string): string {
  try {
    return bwipjs.toSVG({
      bcid: "code128",
      text,
      scale: 2,
      height: 10,
      includetext: true,
      textsize: 8,
      backgroundcolor: "FFFFFF",
      paddingwidth: 2,
      paddingheight: 2,
    } as any);
  } catch (e) {
    return "";
  }
}

/** Render full standalone Luxury Half-A4 Horizontal Order Shipping Sticker HTML document */
export function renderOrderStickerHtml(s: InvoiceSettings, order: InvoiceOrderPayload): string {
  const accentColor = s.accent_color || "#6B0F1A";
  const goldLine = "#C5A059";
  const goldSoft = "rgba(197, 160, 89, 0.45)";
  const textColor = s.text_color || "#1D070B";
  const bgColor = s.bg_color || "#FDFBF7";
  const watermarkOpacity = typeof s.watermark_opacity === "number" ? s.watermark_opacity : 0.08;
  const baseFontSize = s.font_size || 13;

  // ── Sizing & Scaling Configurations ──
  const qrScaleMult = (s.qr_scale ?? 100) / 100;
  let baseQrPx = 70;
  if (s.qr_size === "compact") baseQrPx = 54;
  else if (s.qr_size === "medium") baseQrPx = 64;
  else if (s.qr_size === "large") baseQrPx = 74;
  else if (s.qr_size === "full_width") baseQrPx = 84;
  const finalQrPx = Math.max(40, Math.round(baseQrPx * qrScaleMult));

  const logoScaleMult = (s.logo_scale ?? 100) / 100;
  let baseLogoPx = 28;
  if (s.logo_size === "small") baseLogoPx = 20;
  else if (s.logo_size === "medium") baseLogoPx = 26;
  else if (s.logo_size === "large") baseLogoPx = 32;
  else if (s.logo_size === "extra_large") baseLogoPx = 40;
  const finalLogoPx = Math.max(16, Math.round(baseLogoPx * logoScaleMult));

  const brandScaleMult = (s.brand_name_scale ?? 100) / 100;
  let baseBrandRem = 0.92;
  if (s.brand_name_size === "small") baseBrandRem = 0.80;
  else if (s.brand_name_size === "medium") baseBrandRem = 0.88;
  else if (s.brand_name_size === "large") baseBrandRem = 0.98;
  else if (s.brand_name_size === "extra_large") baseBrandRem = 1.15;
  const finalBrandRem = (baseBrandRem * brandScaleMult).toFixed(2);

  const custScaleMult = (s.customer_info_scale ?? 100) / 100;
  let baseCustRem = 0.84;
  if (s.customer_info_size === "compact") baseCustRem = 0.74;
  else if (s.customer_info_size === "normal") baseCustRem = 0.84;
  else if (s.customer_info_size === "large") baseCustRem = 0.96;
  else if (s.customer_info_size === "extra_large") baseCustRem = 1.10;
  const finalCustRem = (baseCustRem * custScaleMult).toFixed(2);
  const custAlign = s.customer_info_align || "left";

  const money = (n: number) => `${order.currency}${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const siteBase = order.brand.website
    ? (order.brand.website.startsWith("http") ? order.brand.website : `https://${order.brand.website}`)
    : "https://orizino.com";
  const verifyUrl = `${siteBase.replace(/\/+$/, "")}/verify?code=${encodeURIComponent(order.order_number)}`;
  const qrSvg = generateQrSvg(verifyUrl);

  const trackingBarcodeSvg = generate1DBarcodeSvg(order.tracking_number || order.order_number || "ORZ-EXP-00123");

  const isCod = (order.payment_method || "").toLowerCase().includes("cash") || (order.payment_method || "").toLowerCase().includes("cod");

  return `<!doctype html>
<html lang="en" style="font-size: ${baseFontSize}px !important;">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Shipping Sticker — ${escapeHtml(order.order_number)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;0,800;0,900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --accent: ${accentColor};
    --gold-line: ${goldLine};
    --gold-soft: ${goldSoft};
    --text: ${textColor};
    --muted: #5C4046;
    --bg: ${bgColor};
    --table-border: #C5A059;
    --table-header-bg: rgba(197, 160, 89, 0.12);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  @page {
    size: 210mm 148.5mm landscape;
    margin: 0;
  }

  html, body {
    width: 210mm;
    height: 148.5mm;
    max-height: 148.5mm;
    background: var(--bg);
    color: var(--text);
    font-family: ${JSON.stringify(s.font_family)}, 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    font-size: ${baseFontSize}px !important;
    line-height: 1.3;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  /* ── Half-A4 Horizontal Master Sheet (210mm x 148.5mm) ── */
  .stk-sheet {
    width: 210mm;
    height: 148.5mm;
    max-height: 148.5mm;
    margin: 0 auto;
    padding: 4.5mm;
    position: relative;
    background: var(--bg);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ── Golden Double Border Frame ── */
  .stk-frame {
    border: 2px solid var(--gold-line);
    border-radius: 5px;
    position: relative;
    padding: 10px 14px;
    box-sizing: border-box;
    background: var(--bg);
    overflow: hidden;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .stk-inner-border {
    position: absolute;
    inset: 3px;
    border: 1px solid var(--gold-soft);
    border-radius: 3px;
    pointer-events: none;
  }

  /* Corner Filigree */
  .stk-corner {
    position: absolute;
    width: 50px;
    height: 50px;
    pointer-events: none;
    z-index: 3;
  }
  .stk-corner-tl { top: 0; left: 0; }
  .stk-corner-tr { top: 0; right: 0; }
  .stk-corner-bl { bottom: 0; left: 0; width: 55px; height: 55px; }
  .stk-corner-br { bottom: 0; right: 0; width: 55px; height: 55px; }

  /* ── Watermark Logo ── */
  .stk-watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 280px;
    height: 280px;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    user-select: none;
    z-index: 1;
    opacity: ${watermarkOpacity};
    color: var(--accent);
  }
  .stk-watermark svg {
    width: 100%;
    height: 100%;
    object-fit: contain;
    color: var(--accent);
  }

  .stk-content-layer {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    height: 100%;
    justify-content: space-between;
  }

  /* ── Top Header ── */
  .stk-top-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding-bottom: 2px;
  }

  .stk-brand-flex {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .stk-brand-logo-emblem {
    width: ${finalLogoPx}px;
    height: ${finalLogoPx}px;
    flex-shrink: 0;
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .stk-brand-logo-emblem svg {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .stk-brand-title {
    font-family: 'Cinzel', ${JSON.stringify(s.heading_font_family)}, serif;
    font-size: ${finalBrandRem}rem;
    font-weight: 900;
    letter-spacing: 0.05em;
    color: var(--text);
    text-transform: uppercase;
    line-height: 1.1;
  }

  .stk-brand-sub {
    font-size: 0.60rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    color: var(--accent);
    text-transform: uppercase;
  }

  .stk-header-center-title {
    font-family: 'Cinzel', serif;
    font-size: 1.15rem;
    font-weight: 900;
    letter-spacing: 0.14em;
    color: var(--accent);
    text-transform: uppercase;
    text-align: right;
  }

  .stk-header-order-ref {
    font-family: 'Space Grotesk', monospace, sans-serif;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--text);
    text-align: right;
  }

  .stk-mountain-divider {
    width: 100%;
    height: 10px;
    margin: 2px 0 6px 0;
  }

  /* ── 2-Column Main Dispatch Layout ── */
  .stk-main-grid {
    display: grid;
    grid-template-columns: 1.18fr 0.95fr;
    gap: 12px;
    flex-grow: 1;
    min-height: 0;
  }

  /* Left: Recipient & Package Contents */
  .stk-left-col {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 4px;
  }

  .stk-recipient-card {
    border: 1.5px solid var(--table-border);
    background: rgba(197, 160, 89, 0.06);
    border-radius: 4px;
    padding: 6px 8px;
    text-align: ${custAlign};
  }

  .stk-badge-label {
    font-family: 'Cinzel', sans-serif;
    font-size: ${(Number(finalCustRem) * 0.75).toFixed(2)}rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    color: var(--accent);
    text-transform: uppercase;
    margin-bottom: 2px;
  }

  .stk-cust-name {
    font-size: ${(Number(finalCustRem) * 1.2).toFixed(2)}rem;
    font-weight: 800;
    color: var(--text);
    line-height: 1.2;
  }

  .stk-cust-address {
    font-size: ${finalCustRem}rem;
    color: var(--text);
    line-height: 1.3;
    margin-top: 2px;
    font-weight: 500;
  }

  .stk-cust-phone {
    font-size: ${(Number(finalCustRem) * 1.05).toFixed(2)}rem;
    font-weight: 800;
    color: var(--accent);
    margin-top: 3px;
    font-family: 'Space Grotesk', monospace, sans-serif;
  }

  /* Item Contents Summary */
  .stk-contents-box {
    border: 1px solid var(--table-border);
    border-radius: 4px;
    padding: 4px 6px;
    background: #FFFFFF;
    font-size: 0.76rem;
  }

  .stk-contents-title {
    font-family: 'Cinzel', sans-serif;
    font-size: 0.62rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    color: var(--text);
    text-transform: uppercase;
    margin-bottom: 2px;
    border-bottom: 1px solid var(--gold-soft);
    padding-bottom: 1px;
  }

  .stk-item-line {
    display: flex;
    justify-content: space-between;
    padding: 1px 0;
    color: var(--text);
    font-weight: 600;
  }

  .stk-sender-note {
    font-size: 0.64rem;
    color: var(--muted);
    line-height: 1.25;
    padding-top: 2px;
  }

  /* Right: Payment Badge, Barcode & Stamp */
  .stk-right-col {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 6px;
  }

  .stk-payment-banner {
    border: 1.5px solid var(--accent);
    border-radius: 4px;
    padding: 4px 6px;
    background: var(--accent);
    color: #FFFFFF;
    text-align: center;
  }

  .stk-payment-title {
    font-family: 'Cinzel', sans-serif;
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .stk-payment-amount {
    font-family: 'Space Grotesk', monospace, sans-serif;
    font-size: 1.18rem;
    font-weight: 900;
    line-height: 1.1;
    margin-top: 1px;
  }

  .stk-barcode-card {
    background: #FFFFFF;
    border: 1px solid var(--table-border);
    border-radius: 4px;
    padding: 3px 4px;
    text-align: center;
  }
  .stk-barcode-card svg {
    max-width: 100%;
    height: 28px;
    margin: 0 auto;
    display: block;
  }

  .stk-bottom-action-flex {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  /* QR Box */
  .stk-qr-card {
    border: 1.2px solid var(--accent);
    border-radius: 4px;
    overflow: hidden;
    background: #FFFFFF;
    text-align: center;
    flex-shrink: 0;
  }

  .stk-qr-inner {
    padding: 2.5px;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #FFFFFF;
  }
  .stk-qr-inner svg {
    width: ${finalQrPx}px;
    height: ${finalQrPx}px;
    display: block;
  }

  .stk-qr-label {
    background: var(--accent);
    color: #FFFFFF;
    font-size: 0.48rem;
    font-weight: 700;
    padding: 1.5px 2px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* Postal Stamp Styling */
  .stk-postal-stamp {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--accent);
    opacity: 0.95;
  }

  .stk-stamp-inner {
    border: 1.8px solid var(--accent);
    padding: 2px 5px;
    border-radius: 3px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .stk-stamp-icon {
    width: 26px;
    height: 26px;
    color: var(--accent);
  }
  .stk-stamp-name {
    font-family: 'Cinzel', serif;
    font-size: 0.55rem;
    font-weight: 900;
    letter-spacing: 0.1em;
    line-height: 1;
    margin-top: 1px;
  }
  .stk-stamp-sub {
    font-size: 0.40rem;
    font-weight: 800;
    letter-spacing: 0.08em;
  }

  .stk-postmark-waves {
    width: 40px;
    height: 20px;
    color: var(--accent);
  }

  @media print {
    html, body { width: 210mm !important; height: 148.5mm !important; max-height: 148.5mm !important; background: var(--bg) !important; padding: 0 !important; margin: 0 !important; overflow: hidden !important; font-size: ${baseFontSize}px !important; }
    .stk-sheet { width: 210mm !important; height: 148.5mm !important; max-height: 148.5mm !important; padding: 3.5mm !important; overflow: hidden !important; }
    .stk-frame { height: 100% !important; min-height: calc(148.5mm - 7mm) !important; overflow: hidden !important; }
  }
</style>
</head>
<body>
<div class="stk-sheet">
  <div class="stk-frame">
    <div class="stk-inner-border"></div>

    ${CORNER_CLOUD_TL}
    ${CORNER_CLOUD_TR}
    ${CORNER_CLOUD_BL}
    ${CORNER_CLOUD_BR}

    <!-- Watermark Logo -->
    <div class="stk-watermark" aria-hidden="true">
      ${ORIZINO_LOGO_SVG_PATHS}
    </div>

    <div class="stk-content-layer">
      <!-- 1. Header Bar -->
      <div>
        <div class="stk-top-header">
          <div class="stk-brand-flex">
            <div class="stk-brand-logo-emblem">
              ${ORIZINO_LOGO_SVG_PATHS}
            </div>
            <div>
              <div class="stk-brand-title">${escapeHtml(order.brand.name || "ORIZINO IMPERIAL GOODS CO.")}</div>
              <div class="stk-brand-sub">Official Parcel Dispatch Label</div>
            </div>
          </div>

          <div>
            <div class="stk-header-center-title">DISPATCH STICKER</div>
            <div class="stk-header-order-ref">ORDER #${escapeHtml(order.order_number)} · ${escapeHtml(order.issue_date)}</div>
          </div>
        </div>

        ${MOUNTAIN_WAVE_DIVIDER}
      </div>

      <!-- 2. Main 2-Column Dispatch Grid -->
      <div class="stk-main-grid">
        <!-- Left: Destination & Package Summary -->
        <div class="stk-left-col">
          <div class="stk-recipient-card">
            <div class="stk-badge-label">SHIP TO / RECIPIENT</div>
            <div class="stk-cust-name">${escapeHtml(order.customer.full_name || "Valued Client")}</div>
            <div class="stk-cust-address">${escapeHtml(order.customer.shipping_address || order.customer.billing_address || "Delivery Address")}</div>
            <div class="stk-cust-phone">TEL: ${escapeHtml(order.customer.phone || "(40) 253-6726")}</div>
          </div>

          <div class="stk-contents-box">
            <div class="stk-contents-title">CONSIGNMENT CONTENTS (${order.items.length} ${order.items.length === 1 ? "ITEM" : "ITEMS"})</div>
            ${order.items
              .slice(0, 3)
              .map(
                (it) => `
              <div class="stk-item-line">
                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:82%;">${escapeHtml(it.name)}</span>
                <span class="font-mono">Qty: ${it.quantity}</span>
              </div>
            `
              )
              .join("")}
            ${order.items.length > 3 ? `<div style="font-size:0.68rem; color:var(--muted); font-style:italic;">+ ${order.items.length - 3} more items in parcel</div>` : ""}
          </div>

          <div class="stk-sender-note">
            <strong>Sender Return:</strong> ${escapeHtml(order.brand.name || "ORIZINO")}, ${escapeHtml(order.brand.address || "Capital City")} · Helpline: ${escapeHtml(order.brand.phone || "003 255 7899")}
          </div>
        </div>

        <!-- Right: Payment Status, Barcode, QR & Postal Seal -->
        <div class="stk-right-col">
          <div class="stk-payment-banner" style="${isCod ? "" : "background:#059669; border-color:#059669;"}">
            <div class="stk-payment-title">${isCod ? "CASH ON DELIVERY (COD)" : "PREPAID · FULLY VERIFIED"}</div>
            <div class="stk-payment-amount">${money(order.total)}</div>
          </div>

          <div class="stk-barcode-card">
            ${trackingBarcodeSvg}
          </div>

          <div class="stk-bottom-action-flex">
            <!-- Authentication QR -->
            <div class="stk-qr-card">
              <div class="stk-qr-inner">
                ${qrSvg}
              </div>
              <div class="stk-qr-label">Auth QR Check</div>
            </div>

            <!-- Postal Stamp -->
            ${POSTAL_STAMP_SEAL}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
}
