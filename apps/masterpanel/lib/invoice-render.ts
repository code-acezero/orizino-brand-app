/**
 * Luxury Imperial Invoice Rendering — English Heritage & Cherry Vanilla
 *
 * Strict A4 layout (210mm x 297mm), zero-scroll viewport, large prominent watermark (520px),
 * single centered OFFICIAL INVOICE title, responsive font-size scaling, clean solid stamp seal.
 */

import type { InvoiceSettings } from "./invoice-settings.schema";
import bwipjs from "bwip-js/browser";

export interface InvoiceOrderPayload {
  order_number: string;
  invoice_number?: string;
  issue_date: string;
  due_date?: string;
  status: string;
  payment_method: string;
  payment_status?: string;
  tracking_number?: string;
  subtotal: number;
  shipping_fee: number;
  is_delivery_prepaid?: boolean;
  delivery_prepaid_amount?: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  brand: {
    name: string;
    logo_url?: string;
    brand_mark_url?: string;
    address?: string;
    email?: string;
    phone?: string;
    website?: string;
  };
  customer: {
    full_name: string;
    email?: string;
    phone?: string;
    billing_address?: string;
    shipping_address?: string;
  };
  items: Array<{
    name: string;
    sku?: string;
    image_url?: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  notes?: string;
}

const ORIZINO_LOGO_SVG_PATHS = `
<svg viewBox="0 0 540 566" xmlns="http://www.w3.org/2000/svg" class="imp-watermark-svg">
  <path fill="currentColor" d="M11.31,303.01l10.42,10.61,102.73,114.11c-16.27-34.27-34.28-66.2-53.79-98.11L0,219.52l41.25-42.82,104.13-107.09C169.3,45.99,192.23,22.22,218.19,0l-71.11,101.28L55.74,232.06c26,65.57,52.95,130.16,81.76,194.32l12.16,25.25,71.16,112.86L52.01,416.82l-40.7-113.8Z"/>
  <path fill="currentColor" d="M510.24,351.74l-23.18,64.87-169.05,148.54,27.52-44.45,45.28-70.91,30.12-65.82,16.7-38.98,46-113.02-81.21-116.77-25.93-36.85L321.38.16c14.41,11.93,26.61,24.47,40.1,37.05l86.76,87.48,77.26,80.22,13.77,14.47-52.64,81.42c-26.66,41.23-50.32,83.4-72.56,127.58l33.83-36.98,79.5-88.8-17.16,49.14Z"/>
  <path fill="currentColor" d="M356.28,185.04l26.95,46.73-36.12,40.33-32.01,35.6-5.9,33.94-22.1,115.86-19.75,106.98-25.06-136.06-23.26-120.77-10.57-11.82-57.13-64.08,17.38-30.41,40.24-67.6c-.28,10.99,4.75,22.09,2.63,32.95l-18.99,63.2,44.02,68.95,9.75,55.81,20.97,113.31,20.22-107.91,10.47-61.52,44.22-68.68-19.37-63.68,2.55-32.17,30.86,51.02Z"/>
</svg>
`;

/* ── VECTOR ORNAMENTS: CLOUD CORNERS & MOUNTAIN WAVES ── */

const CORNER_CLOUD_TL = `
<svg viewBox="0 0 100 100" class="imp-corner imp-corner-tl" xmlns="http://www.w3.org/2000/svg">
  <path d="M4,96 L4,28 C4,14.7 14.7,4 28,4 L96,4" fill="none" stroke="var(--gold-line)" stroke-width="2"/>
  <path d="M8,96 L8,30 C8,17.8 17.8,8 30,8 L96,8" fill="none" stroke="var(--gold-soft)" stroke-width="1"/>
  <path d="M12,42 C12,25 25,12 42,12 C52,12 60,18 64,26 C68,22 74,20 80,22 C88,24 92,32 90,40 C88,48 80,52 72,50 C66,48 64,42 66,36 C68,30 74,28 78,30" fill="none" stroke="var(--gold-line)" stroke-width="1.3" stroke-linecap="round"/>
  <path d="M18,60 C14,54 16,46 22,42 C28,38 36,40 40,46 C44,52 42,60 36,64 C30,68 22,66 18,60 Z" fill="none" stroke="var(--gold-soft)" stroke-width="1" stroke-linecap="round"/>
  <circle cx="28" cy="28" r="3" fill="var(--accent)"/>
</svg>
`;

const CORNER_CLOUD_TR = `
<svg viewBox="0 0 100 100" class="imp-corner imp-corner-tr" xmlns="http://www.w3.org/2000/svg">
  <path d="M96,96 L96,28 C96,14.7 85.3,4 72,4 L4,4" fill="none" stroke="var(--gold-line)" stroke-width="2"/>
  <path d="M92,96 L92,30 C92,17.8 82.2,8 70,8 L4,8" fill="none" stroke="var(--gold-soft)" stroke-width="1"/>
  <path d="M88,42 C88,25 75,12 58,12 C48,12 40,18 36,26 C32,22 26,20 20,22 C12,24 8,32 10,40 C12,48 20,52 28,50 C34,48 36,42 34,36 C32,30 26,28 22,30" fill="none" stroke="var(--gold-line)" stroke-width="1.3" stroke-linecap="round"/>
  <path d="M82,60 C86,54 84,46 78,42 C72,38 64,40 60,46 C56,52 58,60 64,64 C70,68 78,66 82,60 Z" fill="none" stroke="var(--gold-soft)" stroke-width="1" stroke-linecap="round"/>
  <circle cx="72" cy="28" r="3" fill="var(--accent)"/>
</svg>
`;

const CORNER_CLOUD_BL = `
<svg viewBox="0 0 120 120" class="imp-corner imp-corner-bl" xmlns="http://www.w3.org/2000/svg">
  <path d="M4,4 L4,92 C4,105.3 14.7,116 28,116 L116,116" fill="none" stroke="var(--gold-line)" stroke-width="2"/>
  <path d="M8,4 L8,90 C8,102.2 17.8,112 30,112 L116,112" fill="none" stroke="var(--gold-soft)" stroke-width="1"/>
  <path d="M10,80 C20,70 35,70 45,82 C55,94 70,94 80,82 C90,70 105,72 114,84" fill="none" stroke="var(--gold-line)" stroke-width="1.3"/>
  <path d="M10,92 C22,84 34,84 44,94 C54,104 68,104 78,94 C88,84 100,86 112,96" fill="none" stroke="var(--gold-soft)" stroke-width="1"/>
  <circle cx="28" cy="92" r="3" fill="var(--accent)"/>
</svg>
`;

const CORNER_CLOUD_BR = `
<svg viewBox="0 0 120 120" class="imp-corner imp-corner-br" xmlns="http://www.w3.org/2000/svg">
  <path d="M116,4 L116,92 C116,105.3 105.3,116 92,116 L4,116" fill="none" stroke="var(--gold-line)" stroke-width="2"/>
  <path d="M112,4 L112,90 C112,102.2 102.2,112 90,112 L4,112" fill="none" stroke="var(--gold-soft)" stroke-width="1"/>
  <path d="M110,80 C100,70 85,70 75,82 C65,94 50,94 40,82 C30,70 15,72 6,84" fill="none" stroke="var(--gold-line)" stroke-width="1.3"/>
  <path d="M110,92 C98,84 86,84 76,94 C66,104 52,104 42,94 C32,84 20,86 8,96" fill="none" stroke="var(--gold-soft)" stroke-width="1"/>
  <circle cx="92" cy="92" r="3" fill="var(--accent)"/>
</svg>
`;

const MOUNTAIN_WAVE_DIVIDER = `
<svg viewBox="0 0 800 24" class="imp-mountain-divider" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
  <path d="M0,12 L240,12 C260,12 270,3 285,3 C300,3 310,12 330,12 L370,12 C385,5 395,1 400,1 C405,1 415,5 430,12 L470,12 C490,12 500,3 515,3 C530,3 540,12 560,12 L800,12" fill="none" stroke="var(--gold-line)" stroke-width="1.4"/>
  <path d="M260,16 C275,8 295,8 310,16 M360,18 C380,8 420,8 440,18 M490,16 C505,8 525,8 540,16" fill="none" stroke="var(--gold-soft)" stroke-width="1"/>
  <circle cx="400" cy="12" r="3.5" fill="var(--accent)"/>
</svg>
`;

/* ── IMPERIAL DRAGON ILLUSTRATION ── */
const IMPERIAL_DRAGON_SVG = `
<svg viewBox="0 0 540 140" class="imp-dragon-svg" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="var(--accent)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.65">
    <path d="M40,70 C60,35 100,45 120,80 C140,115 180,115 200,80 C220,45 260,45 280,80 C300,115 340,115 360,80 C380,45 420,45 440,80 C460,110 490,90 510,65"/>
    <path d="M45,75 C65,42 95,52 115,85 C135,118 175,118 195,85 C215,52 255,52 275,85 C295,118 335,118 355,85 C375,52 415,52 435,85 C452,110 480,98 500,72"/>
    <path d="M80,45 L85,38 M100,55 L105,48 M140,90 L145,82 M160,100 L165,92 M200,70 L205,62 M220,50 L225,42 M260,90 L265,82 M280,100 L285,92 M320,70 L325,62 M340,50 L345,42 M380,90 L385,82 M400,100 L405,92 M440,70 L445,62"/>
    <path d="M120,80 C110,100 90,105 80,115 M185,105 C180,125 165,130 150,135 M305,105 C300,125 285,130 270,135 M420,80 C430,100 445,110 460,115"/>
    <path d="M40,70 C30,60 15,55 5,60 M40,70 C35,80 20,85 10,80 M30,65 C25,50 35,38 50,38 C60,38 65,48 60,58 M15,58 C2,52 0,45 5,40 M18,78 C8,88 2,95 5,102"/>
    <circle cx="525" cy="58" r="8" stroke="var(--gold-line)" stroke-width="1.6" fill="rgba(197,160,89,0.2)"/>
    <path d="M525,46 C530,52 538,58 530,68 C522,64 520,54 525,46 Z" fill="var(--accent)" opacity="0.45"/>
  </g>
</svg>
`;

/* ── RED POSTAL & CERTIFICATION STAMP SEAL (CLEAN SOLID CIRCLES + OFFICIAL EMBLEM) ── */
const POSTAL_STAMP_SEAL = `
<div class="imp-postal-stamp" aria-hidden="true">
  <div class="imp-stamp-inner">
    <div class="imp-stamp-crest">
      <svg viewBox="0 0 100 100" class="imp-stamp-icon" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" stroke-width="2.4"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" stroke-width="1.2"/>
        <g transform="translate(26, 25) scale(0.088)" fill="currentColor">
          <path d="M11.31,303.01l10.42,10.61,102.73,114.11c-16.27-34.27-34.28-66.2-53.79-98.11L0,219.52l41.25-42.82,104.13-107.09C169.3,45.99,192.23,22.22,218.19,0l-71.11,101.28L55.74,232.06c26,65.57,52.95,130.16,81.76,194.32l12.16,25.25,71.16,112.86L52.01,416.82l-40.7-113.8Z"/>
          <path d="M510.24,351.74l-23.18,64.87-169.05,148.54,27.52-44.45,45.28-70.91,30.12-65.82,16.7-38.98,46-113.02-81.21-116.77-25.93-36.85L321.38.16c14.41,11.93,26.61,24.47,40.1,37.05l86.76,87.48,77.26,80.22,13.77,14.47-52.64,81.42c-26.66,41.23-50.32,83.4-72.56,127.58l33.83-36.98,79.5-88.8-17.16,49.14Z"/>
          <path d="M356.28,185.04l26.95,46.73-36.12,40.33-32.01,35.6-5.9,33.94-22.1,115.86-19.75,106.98-25.06-136.06-23.26-120.77-10.57-11.82-57.13-64.08,17.38-30.41,40.24-67.6c-.28,10.99,4.75,22.09,2.63,32.95l-18.99,63.2,44.02,68.95,9.75,55.81,20.97,113.31,20.22-107.91,10.47-61.52,44.22-68.68-19.37-63.68,2.55-32.17,30.86,51.02Z"/>
        </g>
      </svg>
    </div>
    <div class="imp-stamp-name">ORIZINO</div>
    <div class="imp-stamp-sub">AUTHENTIC</div>
  </div>
  <svg class="imp-postmark-waves" viewBox="0 0 70 36" xmlns="http://www.w3.org/2000/svg">
    <path d="M0,6 C15,0 25,12 40,6 C55,0 65,12 70,6" fill="none" stroke="currentColor" stroke-width="1.8"/>
    <path d="M0,18 C15,12 25,24 40,18 C55,12 65,24 70,18" fill="none" stroke="currentColor" stroke-width="1.8"/>
    <path d="M0,30 C15,24 25,36 40,30 C55,24 65,36 70,30" fill="none" stroke="currentColor" stroke-width="1.8"/>
  </svg>
</div>
`;

/** Return rich sample payload for the Imperial Cherry Vanilla preview */
export function sampleInvoicePayload(brandOverrides?: Partial<InvoiceOrderPayload["brand"]>): InvoiceOrderPayload {
  return {
    order_number: "Imperial-00123",
    invoice_number: "INV-2026-0884",
    issue_date: "Oct 26, 2026",
    due_date: "Nov 25, 2026",
    status: "confirmed",
    payment_method: "Cash on Delivery",
    payment_status: "Verified Order Dispatch",
    tracking_number: "ORZ-EXP-884910-BD",
    subtotal: 1550.0,
    shipping_fee: 150.0,
    tax: 7.0,
    discount: 0,
    total: 1707.0,
    currency: "৳",
    brand: {
      name: "ORIZINO IMPERIAL GOODS CO.",
      logo_url: "/orizino-logo.svg",
      brand_mark_url: "/orizino-logo.svg",
      address: "N°1 Palace Road, Capital City, Dhaka",
      email: "info@orizino.com",
      phone: "003 255 7899",
      website: "orizino.com",
      ...brandOverrides,
    },
    customer: {
      full_name: "Mahmudul Hasan",
      email: "m.hasan@orizino.com",
      phone: "(40) 253-6726",
      billing_address: "Address Road, Capital City, Dhaka 1213",
      shipping_address: "Address Road, Capital City, Dhaka 1213",
    },
    items: [
      {
        name: "Hand-Painted Silk Fan",
        sku: "ORZ-SLK-FAN",
        quantity: 1,
        unit_price: 100.0,
        line_total: 100.0,
      },
      {
        name: "Dragon-Embossed Tea Set",
        sku: "ORZ-DRG-TEA",
        quantity: 2,
        unit_price: 200.0,
        line_total: 400.0,
      },
      {
        name: "Premium Jade Sculpture Piece",
        sku: "ORZ-JAD-SCP",
        quantity: 1,
        unit_price: 300.0,
        line_total: 300.0,
      },
      {
        name: "Silk Robe with Gold Thread",
        sku: "ORZ-SLK-ROB",
        quantity: 2,
        unit_price: 375.0,
        line_total: 750.0,
      },
    ],
    notes: "Courier Dispatch. Verified and packaged with care.",
  };
}

function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Render SVG QR Code for verification */
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

/** Minimal Handlebars-compatible expander. */
export function expandTemplate(tpl: string, ctx: Record<string, unknown>): string {
  let out = tpl.replace(/\{\{#each\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\/each\}\}/g, (_m, keyPath: string, body: string) => {
    const list = resolvePath(ctx, keyPath);
    if (!Array.isArray(list)) return "";
    return list.map((item) => expandTemplate(body, { ...ctx, this: item, "@item": item })).join("");
  });
  out = out.replace(/\{\{\s*([\w.@]+)\s*\}\}/g, (_m, path: string) => {
    const v = path.startsWith("this.") || path === "this"
      ? resolvePath((ctx["this"] as any) ?? {}, path.slice(5))
      : resolvePath(ctx, path);
    return escapeHtml(v);
  });
  return out;
}

function resolvePath(obj: any, path: string): unknown {
  if (!path) return obj;
  return path.split(".").reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}

/** Render the invoice as full standalone luxury HTML document. */
export function renderInvoiceHtml(s: InvoiceSettings, order: InvoiceOrderPayload): string {
  if (s.advanced_mode && s.advanced_html.trim()) {
    const body = expandTemplate(s.advanced_html, { s, order, items: order.items, brand: order.brand, customer: order.customer });
    return wrapDoc(s, body, order);
  }
  return wrapDoc(s, renderImperialBody(s, order), order);
}

function wrapDoc(s: InvoiceSettings, body: string, order?: InvoiceOrderPayload): string {
  const accentColor = s.accent_color || "#6B0F1A";
  const goldLine = "#C5A059";
  const goldSoft = "rgba(197, 160, 89, 0.45)";
  const textColor = s.text_color || "#1D070B";
  const bgColor = s.bg_color || "#FDFBF7";
  const watermarkOpacity = typeof s.watermark_opacity === "number" ? s.watermark_opacity : 0.09;
  const baseFontSize = s.font_size || 15;

  // ── Sizing & Scaling Configurations ──
  const qrScaleMult = (s.qr_scale ?? 100) / 100;
  let baseQrPx = 135;
  if (s.qr_size === "compact") baseQrPx = 100;
  else if (s.qr_size === "medium") baseQrPx = 120;
  else if (s.qr_size === "large") baseQrPx = 140;
  else if (s.qr_size === "full_width") baseQrPx = 160;
  const finalQrPx = Math.max(70, Math.round(baseQrPx * qrScaleMult));
  const finalQrCardWidth = finalQrPx + 20;

  const logoScaleMult = (s.logo_scale ?? 100) / 100;
  let baseLogoPx = 40;
  if (s.logo_size === "small") baseLogoPx = 28;
  else if (s.logo_size === "medium") baseLogoPx = 34;
  else if (s.logo_size === "large") baseLogoPx = 42;
  else if (s.logo_size === "extra_large") baseLogoPx = 52;
  const finalLogoPx = Math.max(20, Math.round(baseLogoPx * logoScaleMult));

  const brandScaleMult = (s.brand_name_scale ?? 100) / 100;
  let baseBrandRem = 1.12;
  if (s.brand_name_size === "small") baseBrandRem = 0.95;
  else if (s.brand_name_size === "medium") baseBrandRem = 1.05;
  else if (s.brand_name_size === "large") baseBrandRem = 1.18;
  else if (s.brand_name_size === "extra_large") baseBrandRem = 1.35;
  const finalBrandRem = (baseBrandRem * brandScaleMult).toFixed(2);

  const custScaleMult = (s.customer_info_scale ?? 100) / 100;
  let baseCustRem = 0.94;
  if (s.customer_info_size === "compact") baseCustRem = 0.82;
  else if (s.customer_info_size === "normal") baseCustRem = 0.94;
  else if (s.customer_info_size === "large") baseCustRem = 1.06;
  else if (s.customer_info_size === "extra_large") baseCustRem = 1.20;
  const finalCustRem = (baseCustRem * custScaleMult).toFixed(2);
  const custAlign = s.customer_info_align || "left";

  return `<!doctype html>
<html lang="en" style="font-size: ${baseFontSize}px !important;">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Invoice — ${escapeHtml(order?.order_number || "ORIZINO")}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Cormorant+Garamond:ital,wght@0,600;0,700;1,700&family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,500;0,600;0,700;1,600&family=Outfit:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;0,800;0,900;1,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700&display=block" rel="stylesheet">
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
    size: A4 portrait;
    margin: 0;
  }

  html, body {
    width: 210mm;
    height: 297mm;
    max-height: 297mm;
    background: var(--bg);
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

  /* ── Master Page Container (Strict A4 Paper Dimensions: 210mm x 297mm) ── */
  .imp-sheet {
    width: 210mm;
    height: 297mm;
    max-height: 297mm;
    margin: 0 auto;
    padding: 6mm;
    position: relative;
    background: var(--bg);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ── Golden Double Border Frame ── */
  .imp-frame {
    border: 2px solid var(--gold-line);
    border-radius: 6px;
    position: relative;
    padding: 16px 20px 14px 20px;
    box-sizing: border-box;
    background: var(--bg);
    overflow: hidden;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .imp-inner-border {
    position: absolute;
    inset: 4px;
    border: 1px solid var(--gold-soft);
    border-radius: 4px;
    pointer-events: none;
  }

  /* Corner Filigree */
  .imp-corner {
    position: absolute;
    width: 68px;
    height: 68px;
    pointer-events: none;
    z-index: 3;
  }
  .imp-corner-tl { top: 0; left: 0; }
  .imp-corner-tr { top: 0; right: 0; }
  .imp-corner-bl { bottom: 0; left: 0; width: 78px; height: 78px; }
  .imp-corner-br { bottom: 0; right: 0; width: 78px; height: 78px; }

  /* ── Crisp Large Logo Watermark (Prominently Visible in Center: 520px x 520px) ── */
  .imp-watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 520px;
    height: 520px;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    user-select: none;
    z-index: 1;
    opacity: ${watermarkOpacity};
    color: var(--accent);
  }
  .imp-watermark svg {
    width: 100%;
    height: 100%;
    object-fit: contain;
    color: var(--accent);
  }

  .imp-content-layer {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    height: 100%;
    justify-content: space-between;
    overflow: hidden;
  }

  /* ── Centered Header: Single OFFICIAL INVOICE Title ── */
  .imp-top-header-centered {
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 0 0 2px 0;
  }

  .imp-main-official-invoice-title {
    font-family: 'Cinzel', ${JSON.stringify(s.heading_font_family)}, 'Playfair Display', serif;
    font-size: 2.25rem;
    font-weight: 900;
    letter-spacing: 0.16em;
    color: var(--accent);
    line-height: 1;
    text-transform: uppercase;
    text-align: center;
  }

  .imp-mountain-divider {
    width: 100%;
    height: 14px;
    margin: 2px 0 10px 0;
  }

  /* ── Symmetrical 2-Column Info Block ── */
  .imp-info-grid {
    display: grid;
    grid-template-columns: 1.15fr 1fr;
    gap: 20px;
    margin-bottom: 8px;
  }

  .imp-brand-block {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .imp-brand-header-flex {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 3px;
  }

  .imp-brand-logo-emblem {
    width: ${finalLogoPx}px;
    height: ${finalLogoPx}px;
    flex-shrink: 0;
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .imp-brand-logo-emblem svg {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .imp-brand-name {
    font-family: 'Cinzel', ${JSON.stringify(s.heading_font_family)}, serif;
    font-size: ${finalBrandRem}rem;
    font-weight: 900;
    letter-spacing: 0.05em;
    color: var(--text);
    text-transform: uppercase;
    line-height: 1.2;
  }

  .imp-brand-tagline {
    font-size: 0.70rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent);
    margin-top: 1px;
  }

  .imp-brand-line {
    font-size: ${finalCustRem}rem;
    color: var(--muted);
    line-height: 1.35;
  }

  .imp-dragon-wrap {
    width: 100%;
    max-width: 250px;
    height: 30px;
    margin-top: 3px;
  }
  .imp-dragon-svg {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .imp-details-block {
    display: flex;
    flex-direction: column;
    gap: 6px;
    text-align: ${custAlign};
  }

  .imp-section-label {
    font-family: 'Cinzel', sans-serif;
    font-size: 0.88rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    color: var(--text);
    text-transform: uppercase;
    margin-bottom: 1px;
  }

  .imp-meta-table {
    width: 100%;
    font-size: ${finalCustRem}rem;
    border-collapse: collapse;
  }
  .imp-meta-table td {
    padding: 1.5px 0;
    vertical-align: top;
  }
  .imp-meta-table td.label {
    width: 100px;
    color: var(--text);
    font-weight: 700;
    font-size: ${(Number(finalCustRem) * 0.9).toFixed(2)}rem;
    text-transform: uppercase;
  }
  .imp-meta-table td.val {
    color: var(--text);
    font-family: 'Space Grotesk', 'Plus Jakarta Sans', monospace, sans-serif;
    font-weight: 700;
  }

  /* ── Items Table (Clean Golden Borders) ── */
  .imp-table-container {
    margin: 4px 0 8px 0;
    flex-grow: 1;
    overflow: hidden;
  }

  table.imp-items-table {
    width: 100%;
    border-collapse: collapse;
    border: 1.5px solid var(--table-border);
  }

  table.imp-items-table th {
    background: var(--table-header-bg);
    border: 1px solid var(--table-border);
    padding: 7px 12px;
    font-family: 'Cinzel', sans-serif;
    font-size: 0.86rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text);
    text-align: left;
  }

  table.imp-items-table td {
    border: 1px solid var(--table-border);
    padding: 7px 12px;
    font-size: 0.95rem;
    color: var(--text);
    vertical-align: middle;
  }

  table.imp-items-table th.num,
  table.imp-items-table td.num {
    text-align: right;
  }
  table.imp-items-table th.center,
  table.imp-items-table td.center {
    text-align: center;
  }

  .imp-item-title {
    font-weight: 700;
    color: var(--text);
    font-size: 0.96rem;
  }

  /* ── Bottom Summary & QR Grid (Firmly Anchored at Bottom) ── */
  .imp-bottom-grid {
    display: grid;
    grid-template-columns: ${finalQrCardWidth}px 1fr;
    gap: 20px;
    align-items: end;
    margin-top: auto;
    padding-top: 4px;
    padding-bottom: 2px;
  }

  /* QR Box in Velvet Cherry (Clean High-Contrast QR Code) */
  .imp-qr-card {
    border: 1.5px solid var(--accent);
    border-radius: 6px;
    overflow: hidden;
    background: #FFFFFF;
    text-align: center;
    box-shadow: 0 2px 8px rgba(107, 15, 26, 0.08);
  }

  .imp-qr-header-banner {
    background: var(--accent);
    color: #FFFFFF;
    font-family: 'Cinzel', sans-serif;
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    padding: 4px 6px;
    text-transform: uppercase;
  }

  .imp-qr-inner {
    padding: 5px;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #FFFFFF;
  }

  .imp-qr-inner svg {
    width: ${finalQrPx}px;
    height: ${finalQrPx}px;
    display: block;
  }

  .imp-qr-footer-banner {
    background: var(--accent);
    color: #FFFFFF;
    font-size: 0.68rem;
    font-weight: 600;
    padding: 3px 5px;
    letter-spacing: 0.02em;
  }

  /* Right Valuation & Stamp */
  .imp-valuation-block {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .imp-totals-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.96rem;
  }
  .imp-totals-table td {
    padding: 2.5px 0;
  }
  .imp-totals-table td.label {
    text-align: right;
    padding-right: 16px;
    font-weight: 600;
    color: var(--text);
  }
  .imp-totals-table td.val {
    text-align: right;
    width: 120px;
    font-family: 'Space Grotesk', 'Plus Jakarta Sans', monospace, sans-serif;
    font-weight: 700;
    color: var(--text);
  }

  .imp-grand-total-row {
    border-top: 1.5px solid var(--table-border);
    border-bottom: 2px solid var(--table-border);
  }
  .imp-grand-total-row td {
    padding: 5px 0;
    font-family: 'Cinzel', sans-serif;
    font-size: 1.18rem;
    font-weight: 900;
    color: var(--accent);
  }

  .imp-payinfo-and-stamp {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 3px;
    padding-top: 3px;
    padding-bottom: 2px;
  }

  .imp-pay-text {
    font-size: 0.84rem;
    color: var(--muted);
    line-height: 1.35;
  }

  /* Postal Stamp Styling (Zero Clipping) */
  .imp-postal-stamp {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--accent);
    opacity: 0.95;
    margin-bottom: 2px;
    margin-right: 2px;
  }

  .imp-stamp-inner {
    border: 2px solid var(--accent);
    padding: 4px 8px;
    border-radius: 4px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: transparent;
  }
  .imp-stamp-icon {
    width: 36px;
    height: 36px;
    color: var(--accent);
  }
  .imp-stamp-name {
    font-family: 'Cinzel', serif;
    font-size: 0.70rem;
    font-weight: 900;
    letter-spacing: 0.12em;
    line-height: 1;
    margin-top: 1px;
  }
  .imp-stamp-sub {
    font-size: 0.52rem;
    font-weight: 800;
    letter-spacing: 0.1em;
  }

  .imp-postmark-waves {
    width: 52px;
    height: 26px;
    color: var(--accent);
  }

  @media print {
    html, body { width: 210mm !important; height: 297mm !important; max-height: 297mm !important; background: var(--bg) !important; padding: 0 !important; margin: 0 !important; overflow: hidden !important; font-size: ${baseFontSize}px !important; }
    .imp-sheet { width: 210mm !important; height: 297mm !important; max-height: 297mm !important; padding: 5mm !important; overflow: hidden !important; }
    .imp-frame { height: 100% !important; min-height: calc(297mm - 10mm) !important; overflow: hidden !important; }
  }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

function renderImperialBody(s: InvoiceSettings, o: InvoiceOrderPayload): string {
  const money = (n: number) => `${o.currency}${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const customWatermarkUrl = s.watermark_url;
  const parts: string[] = [];

  // Generate clean verification QR for camera scanning
  const siteBase = o.brand.website
    ? (o.brand.website.startsWith("http") ? o.brand.website : `https://${o.brand.website}`)
    : "https://orizino.com";
  const verifyUrl = `${siteBase.replace(/\/+$/, "")}/verify?code=${encodeURIComponent(o.order_number)}`;
  const qrSvg = generateQrSvg(verifyUrl);

  parts.push(`<div class="imp-sheet">`);
  parts.push(`<div class="imp-frame">`);
  parts.push(`<div class="imp-inner-border"></div>`);

  // Corner Filigree Ornaments
  parts.push(CORNER_CLOUD_TL);
  parts.push(CORNER_CLOUD_TR);
  parts.push(CORNER_CLOUD_BL);
  parts.push(CORNER_CLOUD_BR);

  // ── Large Crisp Logo Watermark (520px x 520px) ──
  if (s.show_watermark ?? true) {
    parts.push(`<div class="imp-watermark" aria-hidden="true">`);
    if (customWatermarkUrl) {
      parts.push(`<img src="${escapeHtml(customWatermarkUrl)}" alt=""/>`);
    } else {
      parts.push(ORIZINO_LOGO_SVG_PATHS);
    }
    parts.push(`</div>`);
  }

  parts.push(`<div class="imp-content-layer">`);

  // ── Top Half: Header, Info Grid & Table ──
  parts.push(`<div style="display:flex; flex-direction:column; flex-grow:1; min-height:0; overflow:hidden;">`);

  // ── 1. Top Header: Single Centered INVOICE Title ──
  parts.push(`<div class="imp-top-header-centered">`);
  const headerMain = s.header_text && s.header_text.trim() ? s.header_text.trim() : "INVOICE";
  parts.push(`<div class="imp-main-official-invoice-title">${escapeHtml(headerMain)}</div>`);
  parts.push(`</div>`);
  parts.push(MOUNTAIN_WAVE_DIVIDER);

  // ── 2. Seller & Customer Symmetrical Grid ──
  parts.push(`<div class="imp-info-grid">`);
  
  // Left: Official Brand Vector Crest + Name + Dragon Vignette
  parts.push(`<div class="imp-brand-block">`);
  parts.push(`<div class="imp-brand-header-flex">`);
  if (s.show_logo) {
    parts.push(`<div class="imp-brand-logo-emblem">`);
    parts.push(ORIZINO_LOGO_SVG_PATHS);
    parts.push(`</div>`);
  }
  parts.push(`<div>`);
  parts.push(`<div class="imp-brand-name">${escapeHtml(o.brand.name || "ORIZINO IMPERIAL GOODS CO.")}</div>`);
  parts.push(`<div class="imp-brand-tagline">Official Store</div>`);
  parts.push(`</div>`);
  parts.push(`</div>`); // close .imp-brand-header-flex

  if (o.brand.address) {
    parts.push(`<div class="imp-brand-line">${escapeHtml(o.brand.address)}</div>`);
  }
  parts.push(`<div class="imp-brand-line">Contact: ${escapeHtml(o.brand.phone || "003 255 7899")}</div>`);
  if (o.brand.email) {
    parts.push(`<div class="imp-brand-line">${escapeHtml(o.brand.email)}</div>`);
  }
  parts.push(`<div class="imp-dragon-wrap">${IMPERIAL_DRAGON_SVG}</div>`);
  parts.push(`</div>`);

  // Right: Bill To + Invoice Meta
  parts.push(`<div class="imp-details-block">`);
  parts.push(`<div>`);
  parts.push(`<div class="imp-section-label">BILL TO:</div>`);
  parts.push(`<div class="imp-brand-line" style="font-weight:700; color:var(--text); font-size:1rem;">${escapeHtml(o.customer.full_name || "Customer Name")}</div>`);
  if (o.customer.shipping_address || o.customer.billing_address) {
    parts.push(`<div class="imp-brand-line">${escapeHtml(o.customer.shipping_address || o.customer.billing_address)}</div>`);
  }
  if (o.customer.phone) {
    parts.push(`<div class="imp-brand-line">Contact: ${escapeHtml(o.customer.phone)}</div>`);
  }
  parts.push(`</div>`);

  parts.push(`<div>`);
  parts.push(`<div class="imp-section-label">INVOICE DETAILS</div>`);
  parts.push(`<table class="imp-meta-table">`);
  parts.push(`<tr><td class="label">INVOICE #:</td><td class="val">${escapeHtml(o.invoice_number || o.order_number)}</td></tr>`);
  parts.push(`<tr><td class="label">DATE:</td><td class="val">${escapeHtml(o.issue_date)}</td></tr>`);
  if (o.due_date) {
    parts.push(`<tr><td class="label">DUE DATE:</td><td class="val">${escapeHtml(o.due_date)}</td></tr>`);
  }
  if (o.payment_method) {
    parts.push(`<tr><td class="label">PAYMENT:</td><td class="val">${escapeHtml(o.payment_method)}</td></tr>`);
  }
  parts.push(`</table>`);
  parts.push(`</div>`);

  parts.push(`</div>`); // close .imp-details-block
  parts.push(`</div>`); // close .imp-info-grid

  // ── 3. Line Items Table ──
  parts.push(`<div class="imp-table-container">`);
  parts.push(`<table class="imp-items-table">`);
  parts.push(`<thead><tr>`);
  parts.push(`<th style="width: 50%;">DESCRIPTION</th>`);
  parts.push(`<th class="center" style="width: 14%;">QUANTITY</th>`);
  parts.push(`<th class="num" style="width: 18%;">UNIT PRICE</th>`);
  parts.push(`<th class="num" style="width: 18%;">TOTAL</th>`);
  parts.push(`</tr></thead><tbody>`);

  for (const it of o.items) {
    parts.push(`<tr>`);
    parts.push(`<td><div class="imp-item-title">${escapeHtml(it.name)}</div></td>`);
    parts.push(`<td class="center font-mono" style="font-weight:600;">${it.quantity}</td>`);
    parts.push(`<td class="num font-mono">${money(it.unit_price)}</td>`);
    parts.push(`<td class="num font-mono" style="font-weight:700;">${money(it.line_total)}</td>`);
    parts.push(`</tr>`);
  }

  // Ensure consistent table structure if fewer than 2 items
  const emptyRowsNeeded = Math.max(0, 2 - o.items.length);
  for (let i = 0; i < emptyRowsNeeded; i++) {
    parts.push(`<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>`);
  }

  parts.push(`</tbody></table>`);
  parts.push(`</div>`);

  parts.push(`</div>`); // close top half

  // ── 4. Bottom Grid: Firmly Anchored at Bottom ──
  parts.push(`<div class="imp-bottom-grid">`);

  // Left: Clean High-Contrast Order Authentication QR Box (No center overlay)
  parts.push(`<div class="imp-qr-card">`);
  parts.push(`<div class="imp-qr-header-banner">AUTHENTICATION QR</div>`);
  parts.push(`<div class="imp-qr-inner">`);
  if (qrSvg) {
    parts.push(qrSvg);
  }
  parts.push(`</div>`);
  parts.push(`<div class="imp-qr-footer-banner">Scan to verify genuine order details</div>`);
  parts.push(`</div>`);

  // Right: Totals Table + Payment Info + Postal Stamp (with official brand emblem)
  parts.push(`<div class="imp-valuation-block">`);
  parts.push(`<table class="imp-totals-table">`);
  parts.push(`<tr><td class="label">Subtotal</td><td class="val">${money(o.subtotal)}</td></tr>`);
  if (o.shipping_fee) {
    if (o.is_delivery_prepaid) {
      parts.push(`<tr><td class="label">Delivery Fee <span style="font-size:0.75rem; color:#059669; font-weight:700;">(Pre-paid)</span></td><td class="val">${money(o.shipping_fee)}</td></tr>`);
    } else {
      parts.push(`<tr><td class="label">Delivery Fee</td><td class="val">${money(o.shipping_fee)}</td></tr>`);
    }
  }
  if (o.tax) {
    parts.push(`<tr><td class="label">Tax</td><td class="val">${money(o.tax)}</td></tr>`);
  }
  if (o.discount && o.discount > 0) {
    parts.push(`<tr><td class="label" style="color:#059669;">Discount</td><td class="val" style="color:#059669;">-${money(o.discount)}</td></tr>`);
  }
  if (o.is_delivery_prepaid) {
    const prepaidFee = Number(o.delivery_prepaid_amount || o.shipping_fee || 0);
    const balanceDue = Math.max(0, o.total - prepaidFee);
    parts.push(`<tr><td class="label" style="color:#059669;">Advance Paid (Delivery)</td><td class="val" style="color:#059669;">-${money(prepaidFee)}</td></tr>`);
    parts.push(`<tr class="imp-grand-total-row"><td class="label">BALANCE DUE ON DELIVERY</td><td class="val" style="font-size:1.18rem;">${money(balanceDue)}</td></tr>`);
  } else {
    parts.push(`<tr class="imp-grand-total-row"><td class="label">TOTAL AMOUNT</td><td class="val" style="font-size:1.18rem;">${money(o.total)}</td></tr>`);
  }
  parts.push(`</table>`);

  // Order Support & Official Postal Stamp
  parts.push(`<div class="imp-payinfo-and-stamp">`);
  parts.push(`<div>`);
  parts.push(`<div class="imp-section-label">ORDER DISPATCH &amp; SUPPORT</div>`);
  parts.push(`<div class="imp-pay-text">${escapeHtml(o.brand.name || "ORIZINO IMPERIAL GOODS CO.")}<br/>${escapeHtml(o.brand.address || "N°1 Palace Road, Capital City")}<br/>Contact: ${escapeHtml(o.brand.phone || "003 255 7899")}</div>`);
  parts.push(`</div>`);

  // Official Stamp Mark (with official brand emblem)
  parts.push(POSTAL_STAMP_SEAL);

  parts.push(`</div>`); // close .imp-payinfo-and-stamp
  parts.push(`</div>`); // close .imp-valuation-block

  parts.push(`</div>`); // close .imp-bottom-grid

  parts.push(`</div>`); // close .imp-content-layer
  parts.push(`</div>`); // close .imp-frame
  parts.push(`</div>`); // close .imp-sheet

  return parts.join("\n");
}

export const INVOICE_VARIABLES: Array<{ token: string; label: string }> = [
  { token: "{{order.order_number}}", label: "Order number" },
  { token: "{{order.invoice_number}}", label: "Invoice number" },
  { token: "{{order.issue_date}}", label: "Issue date" },
  { token: "{{order.total}}", label: "Total" },
  { token: "{{order.subtotal}}", label: "Subtotal" },
  { token: "{{order.tax}}", label: "Tax" },
  { token: "{{order.shipping_fee}}", label: "Shipping fee" },
  { token: "{{order.discount}}", label: "Discount" },
  { token: "{{order.currency}}", label: "Currency" },
  { token: "{{order.payment_method}}", label: "Payment method" },
  { token: "{{order.tracking_number}}", label: "Tracking number" },
  { token: "{{brand.name}}", label: "Brand name" },
  { token: "{{brand.logo_url}}", label: "Brand logo URL" },
  { token: "{{brand.email}}", label: "Brand email" },
  { token: "{{brand.phone}}", label: "Brand phone" },
  { token: "{{customer.full_name}}", label: "Customer name" },
  { token: "{{customer.email}}", label: "Customer email" },
  { token: "{{customer.phone}}", label: "Customer phone" },
  { token: "{{customer.billing_address}}", label: "Billing address" },
  { token: "{{customer.shipping_address}}", label: "Shipping address" },
  { token: "{{#each items}} {{this.name}} {{/each}}", label: "Iterate items" },
];
