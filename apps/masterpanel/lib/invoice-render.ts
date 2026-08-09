/**
 * Invoice rendering — turn an InvoiceSettings + order data payload into an
 * HTML document. Advanced mode runs the user's HTML through a small
 * Handlebars-style expander so `{{variable}}` and `{{#each items}}...{{/each}}`
 * work without pulling in the full handlebars runtime (which is Node-only).
 *
 * Kept intentionally in a shared client-safe module so the admin preview,
 * PDF generator, and email attachment can all use the exact same output.
 */

import type { InvoiceSettings } from "./invoice-settings.functions";

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

/** Return a sample payload for the live preview. */
export function sampleInvoicePayload(): InvoiceOrderPayload {
  return {
    order_number: "ORZ-000123",
    invoice_number: "INV-000123",
    issue_date: new Date().toLocaleDateString(),
    due_date: "",
    status: "confirmed",
    payment_method: "Cash on Delivery",
    payment_status: "unpaid",
    tracking_number: "TRK-88451",
    subtotal: 2400,
    shipping_fee: 120,
    tax: 60,
    discount: 100,
    total: 2480,
    currency: "৳",
    brand: {
      name: "Your Brand",
      logo_url: "",
      brand_mark_url: "",
      address: "123 Commerce St, Dhaka",
      email: "hello@brand.com",
      phone: "+880 1700 000000",
      website: "brand.com",
    },
    customer: {
      full_name: "Jane Customer",
      email: "jane@example.com",
      phone: "+880 1600 000000",
      billing_address: "12 Green Rd, Dhaka",
      shipping_address: "12 Green Rd, Dhaka",
    },
    items: [
      { name: "Wireless Headphones", sku: "WH-001", quantity: 1, unit_price: 1800, line_total: 1800 },
      { name: "USB-C Cable (2m)", sku: "CBL-2M", quantity: 2, unit_price: 300, line_total: 600 },
    ],
    notes: "Please handle with care.",
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

/** Minimal Handlebars-compatible expander. Supports {{path.to.value}} and {{#each items}}...{{/each}}. */
export function expandTemplate(tpl: string, ctx: Record<string, unknown>): string {
  // Handle {{#each key}}...{{/each}}
  let out = tpl.replace(/\{\{#each\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\/each\}\}/g, (_m, keyPath: string, body: string) => {
    const list = resolvePath(ctx, keyPath);
    if (!Array.isArray(list)) return "";
    return list.map((item) => expandTemplate(body, { ...ctx, this: item, "@item": item })).join("");
  });
  // Handle {{path}} — supports "this.name" inside each blocks
  out = out.replace(/\{\{\s*([\w.@]+)\s*\}\}/g, (_m, path: string) => {
    const v = path.startsWith("this.") || path === "this"
      ? resolvePath(ctx["this"] as any ?? {}, path.slice(5))
      : resolvePath(ctx, path);
    return escapeHtml(v);
  });
  return out;
}

function resolvePath(obj: any, path: string): unknown {
  if (!path) return obj;
  return path.split(".").reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}

/** Render the invoice as full standalone HTML. */
export function renderInvoiceHtml(s: InvoiceSettings, order: InvoiceOrderPayload): string {
  if (s.advanced_mode && s.advanced_html.trim()) {
    // Wrap user HTML with a themed shell so variable expansion works
    const body = expandTemplate(s.advanced_html, { s, order, items: order.items, brand: order.brand, customer: order.customer });
    return wrapDoc(s, body);
  }
  return wrapDoc(s, renderDefaultBody(s, order));
}

function wrapDoc(s: InvoiceSettings, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Invoice</title>
<style>
  :root { --accent:${s.accent_color}; --text:${s.text_color}; --muted:${s.muted_color}; --bg:${s.bg_color}; }
  html,body { background:var(--bg); color:var(--text); font-family:${JSON.stringify(s.font_family)}, system-ui, -apple-system, sans-serif; font-size:${s.font_size}px; margin:0; padding:0; }
  h1,h2,h3 { font-family:${JSON.stringify(s.heading_font_family)}, system-ui, sans-serif; color:var(--accent); margin:0 0 8px; }
  .inv-wrap { max-width:820px; margin:0 auto; padding:32px; }
  .inv-header { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; margin-bottom:24px; }
  .inv-brand-title { font-size:1.5em; font-weight:700; color:var(--accent); }
  .inv-muted { color:var(--muted); font-size:0.9em; }
  .inv-two-col { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin:24px 0; }
  .inv-block h3 { font-size:0.8em; text-transform:uppercase; letter-spacing:0.05em; color:var(--muted); margin-bottom:4px; }
  table.inv-items { width:100%; border-collapse:collapse; margin:24px 0; }
  table.inv-items th { text-align:left; padding:10px 8px; border-bottom:2px solid var(--accent); font-size:0.85em; text-transform:uppercase; letter-spacing:0.05em; }
  table.inv-items td { padding:10px 8px; border-bottom:1px solid #e5e7eb; vertical-align:top; }
  table.inv-items td.num, table.inv-items th.num { text-align:right; }
  .inv-totals { margin-left:auto; width:280px; }
  .inv-totals .row { display:flex; justify-content:space-between; padding:4px 0; }
  .inv-totals .grand { border-top:2px solid var(--accent); margin-top:8px; padding-top:8px; font-weight:700; font-size:1.1em; color:var(--accent); }
  .inv-footer { margin-top:32px; padding-top:16px; border-top:1px solid #e5e7eb; color:var(--muted); font-size:0.85em; text-align:center; }
  .inv-brand-mark { display:flex; align-items:center; gap:6px; color:var(--muted); font-size:0.75em; margin-top:8px; }
  .inv-brand-mark img { height:14px; }
  .inv-logo { max-height:56px; max-width:180px; object-fit:contain; }
</style>
</head><body>${body}</body></html>`;
}

function renderDefaultBody(s: InvoiceSettings, o: InvoiceOrderPayload): string {
  const money = (n: number) => `${o.currency}${n.toFixed(2)}`;
  const parts: string[] = [];
  parts.push(`<div class="inv-wrap">`);
  // Header
  parts.push(`<div class="inv-header"><div>`);
  if (s.show_logo && o.brand.logo_url) {
    parts.push(`<img class="inv-logo" src="${escapeHtml(o.brand.logo_url)}" alt="${escapeHtml(o.brand.name)}"/>`);
  } else {
    parts.push(`<div class="inv-brand-title">${escapeHtml(o.brand.name)}</div>`);
  }
  parts.push(`<div class="inv-muted">${escapeHtml(o.brand.address ?? "")}<br/>${escapeHtml(o.brand.email ?? "")} · ${escapeHtml(o.brand.phone ?? "")}</div>`);
  parts.push(`</div><div style="text-align:right"><h1>INVOICE</h1>`);
  if (s.show_invoice_number && o.invoice_number) parts.push(`<div><strong>${escapeHtml(o.invoice_number)}</strong></div>`);
  if (s.show_order_number) parts.push(`<div class="inv-muted">Order ${escapeHtml(o.order_number)}</div>`);
  if (s.show_issue_date) parts.push(`<div class="inv-muted">Issued: ${escapeHtml(o.issue_date)}</div>`);
  if (s.show_due_date && o.due_date) parts.push(`<div class="inv-muted">Due: ${escapeHtml(o.due_date)}</div>`);
  parts.push(`</div></div>`);

  if (s.header_text) parts.push(`<div class="inv-muted" style="margin-bottom:16px">${escapeHtml(s.header_text)}</div>`);

  // Bill To / Ship To
  const showBill = s.show_billing_address || s.show_customer_email || s.show_customer_phone;
  if (showBill || s.show_shipping_address) {
    parts.push(`<div class="inv-two-col">`);
    if (showBill) {
      parts.push(`<div class="inv-block"><h3>Bill To</h3><div><strong>${escapeHtml(o.customer.full_name)}</strong></div>`);
      if (s.show_billing_address && o.customer.billing_address) parts.push(`<div class="inv-muted">${escapeHtml(o.customer.billing_address)}</div>`);
      if (s.show_customer_email && o.customer.email) parts.push(`<div class="inv-muted">${escapeHtml(o.customer.email)}</div>`);
      if (s.show_customer_phone && o.customer.phone) parts.push(`<div class="inv-muted">${escapeHtml(o.customer.phone)}</div>`);
      parts.push(`</div>`);
    }
    if (s.show_shipping_address && o.customer.shipping_address) {
      parts.push(`<div class="inv-block"><h3>Ship To</h3><div class="inv-muted">${escapeHtml(o.customer.shipping_address)}</div></div>`);
    }
    parts.push(`</div>`);
  }

  // Items
  parts.push(`<table class="inv-items"><thead><tr>`);
  parts.push(`<th>Item</th>`);
  if (s.show_item_sku) parts.push(`<th>SKU</th>`);
  parts.push(`<th class="num">Qty</th><th class="num">Unit</th><th class="num">Total</th></tr></thead><tbody>`);
  for (const it of o.items) {
    parts.push(`<tr><td>`);
    if (s.show_item_image && it.image_url) parts.push(`<img src="${escapeHtml(it.image_url)}" style="height:32px;width:32px;object-fit:cover;border-radius:4px;margin-right:8px;vertical-align:middle"/>`);
    parts.push(`${escapeHtml(it.name)}</td>`);
    if (s.show_item_sku) parts.push(`<td class="inv-muted">${escapeHtml(it.sku ?? "")}</td>`);
    parts.push(`<td class="num">${it.quantity}</td><td class="num">${money(it.unit_price)}</td><td class="num">${money(it.line_total)}</td></tr>`);
  }
  parts.push(`</tbody></table>`);

  // Totals
  parts.push(`<div class="inv-totals">`);
  if (s.show_subtotal) parts.push(`<div class="row"><span>Subtotal</span><span>${money(o.subtotal)}</span></div>`);
  if (s.show_shipping_fee) parts.push(`<div class="row"><span>Shipping</span><span>${money(o.shipping_fee)}</span></div>`);
  if (s.show_tax) parts.push(`<div class="row"><span>Tax</span><span>${money(o.tax)}</span></div>`);
  if (s.show_discount && o.discount > 0) parts.push(`<div class="row"><span>Discount</span><span>-${money(o.discount)}</span></div>`);
  if (s.show_total) parts.push(`<div class="row grand"><span>Total</span><span>${money(o.total)}</span></div>`);
  parts.push(`</div>`);

  // Meta row
  const meta: string[] = [];
  if (s.show_payment_method) meta.push(`<strong>Payment:</strong> ${escapeHtml(o.payment_method)}${o.payment_status ? ` (${escapeHtml(o.payment_status)})` : ""}`);
  if (s.show_tracking_number && o.tracking_number) meta.push(`<strong>Tracking:</strong> ${escapeHtml(o.tracking_number)}`);
  if (meta.length) parts.push(`<div style="margin-top:24px" class="inv-muted">${meta.join(" · ")}</div>`);

  if (s.show_notes && (o.notes || s.notes_text)) {
    parts.push(`<div style="margin-top:16px" class="inv-block"><h3>Notes</h3><div class="inv-muted">${escapeHtml(o.notes || s.notes_text)}</div></div>`);
  }
  if (s.terms_text) parts.push(`<div style="margin-top:16px" class="inv-block"><h3>Terms</h3><div class="inv-muted">${escapeHtml(s.terms_text)}</div></div>`);

  if (s.show_footer) {
    parts.push(`<div class="inv-footer">${escapeHtml(s.footer_text)}`);
    if (s.show_brand_mark) parts.push(`<div class="inv-brand-mark">Powered by <strong>${escapeHtml(o.brand.name)}</strong></div>`);
    parts.push(`</div>`);
  }

  parts.push(`</div>`);
  return parts.join("\n");
}

/** Available template variables for the admin variable palette. */
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
