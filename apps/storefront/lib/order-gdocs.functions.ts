import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ── Connector gateway config (secrets live in the server runtime, NOT in Supabase Edge Functions) ──
const DOCS_GATEWAY = "https://connector-gateway.lovable.dev/google_docs/v1";
const DRIVE_GATEWAY = "https://connector-gateway.lovable.dev/google_drive/drive/v3";
const BUCKET = "site-assets";

function money(n: any): string {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderTemplate(tpl: string, ctx: Record<string, string>): string {
  return tpl.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => ctx[k] ?? "");
}

async function assertStaff(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const ok = (data || []).some((r: any) => r.role === "admin" || r.role === "moderator");
  if (!ok) throw new Error("Forbidden: staff only");
}

function gatewayKeys() {
  const lovable = process.env.LOVABLE_API_KEY;
  const docs = process.env.GOOGLE_DOCS_API_KEY;
  const drive = process.env.GOOGLE_DRIVE_API_KEY;
  return { lovable, docs, drive };
}

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      const status = Number((String(e?.message || "").match(/\b(\d{3})\b/) || [])[1] || 0);
      if (status >= 400 && status < 500 && status !== 408 && status !== 429) throw e;
      if (i === attempts - 1) break;
      await new Promise((r) => setTimeout(r, 400 * Math.pow(2, i) + Math.floor(Math.random() * 200)));
      console.warn(`[${label}] attempt ${i + 1} failed: ${String(e?.message || e)}`);
    }
  }
  throw lastErr;
}

async function gFetch(gateway: string, path: string, apiKey: string, init: RequestInit) {
  const { lovable } = gatewayKeys();
  const res = await fetch(`${gateway}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${lovable}`,
      "X-Connection-Api-Key": apiKey,
      ...(init.body && !(init.headers as any)?.["Content-Type"] ? { "Content-Type": "application/json" } : {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Gateway ${res.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
}

// ── Document content builders (plain text → Google Docs requests) ──
interface DocLine { text: string; style?: "h1" | "h2" | "bold" | "muted" }
interface GReq {
  insertText?: { text: string; location: { index: number } };
  updateTextStyle?: { range: { startIndex: number; endIndex: number }; textStyle: Record<string, any>; fields: string };
  updateParagraphStyle?: { range: { startIndex: number; endIndex: number }; paragraphStyle: Record<string, any>; fields: string };
}

function buildInvoiceDoc(order: any, items: any[], brand: any): DocLine[] {
  const addr = order.shipping_address || {};
  const lines: DocLine[] = [];
  lines.push({ text: `${brand.name} — INVOICE`, style: "h1" });
  lines.push({ text: `Invoice #${order.order_number}`, style: "h2" });
  lines.push({ text: `Date: ${new Date(order.created_at).toLocaleDateString()}`, style: "muted" });
  lines.push({ text: `Status: ${String(order.status || "").toUpperCase()}`, style: "muted" });
  lines.push({ text: "" });
  lines.push({ text: "Bill To", style: "bold" });
  lines.push({ text: `${addr.full_name || addr.name || ""}` });
  if (addr.phone) lines.push({ text: `Phone: ${addr.phone}` });
  if (addr.email) lines.push({ text: `Email: ${addr.email}` });
  const fullAddr = [addr.address_line1, addr.address_line2, addr.address, addr.city, addr.state, addr.postal_code, addr.country]
    .filter(Boolean).join(", ");
  if (fullAddr) lines.push({ text: fullAddr });
  lines.push({ text: "" });
  lines.push({ text: "Items", style: "bold" });
  for (const it of items) {
    lines.push({ text: `• ${it.product_name}  ×${it.quantity}  @ ${money(it.unit_price)}  =  ${money(it.total_price)}` });
  }
  lines.push({ text: "" });
  lines.push({ text: `Subtotal:   ${money(order.subtotal)}` });
  if (order.shipping_fee) lines.push({ text: `Shipping:   ${money(order.shipping_fee)}` });
  if (order.coupon_discount) lines.push({ text: `Discount:  -${money(order.coupon_discount)}` });
  if (order.loyalty_discount) lines.push({ text: `Loyalty:   -${money(order.loyalty_discount)}` });
  lines.push({ text: `TOTAL:      ${money(order.total)}`, style: "bold" });
  lines.push({ text: "" });
  lines.push({ text: `Thank you for shopping with ${brand.name}.`, style: "muted" });
  return lines;
}

function buildStickerDoc(order: any, brand: any): DocLine[] {
  const addr = order.shipping_address || {};
  const lines: DocLine[] = [];
  lines.push({ text: `SHIPPING LABEL`, style: "h1" });
  lines.push({ text: `Order #${order.order_number}`, style: "h2" });
  lines.push({ text: "" });
  lines.push({ text: "FROM:", style: "bold" });
  lines.push({ text: brand.name });
  if (brand.addr) lines.push({ text: brand.addr });
  lines.push({ text: "" });
  lines.push({ text: "DELIVER TO:", style: "bold" });
  lines.push({ text: `${addr.full_name || addr.name || ""}`, style: "bold" });
  const fullAddr = [addr.address_line1, addr.address_line2, addr.address, addr.city, addr.state, addr.postal_code, addr.country]
    .filter(Boolean).join(", ");
  if (fullAddr) lines.push({ text: fullAddr });
  if (addr.phone) lines.push({ text: `Phone: ${addr.phone}`, style: "bold" });
  lines.push({ text: "" });
  lines.push({ text: `Method: ${String(order.payment_method || "").toUpperCase()}` });
  lines.push({ text: `COD Amount: ${["paid", "delivered"].includes(String(order.status || "").toLowerCase()) ? "0.00 (PREPAID)" : money(order.total)}`, style: "bold" });
  lines.push({ text: "" });
  lines.push({ text: `Tracking: ${order.tracking_number || "—"}`, style: "muted" });
  return lines;
}

function linesToRequests(lines: DocLine[]): GReq[] {
  const reqs: GReq[] = [];
  let idx = 1;
  for (const ln of lines) {
    const text = (ln.text || "") + "\n";
    reqs.push({ insertText: { text, location: { index: idx } } });
    const start = idx;
    const end = idx + text.length - 1;
    if (ln.style === "h1") {
      reqs.push({ updateParagraphStyle: { range: { startIndex: start, endIndex: end + 1 }, paragraphStyle: { namedStyleType: "HEADING_1" }, fields: "namedStyleType" } });
    } else if (ln.style === "h2") {
      reqs.push({ updateParagraphStyle: { range: { startIndex: start, endIndex: end + 1 }, paragraphStyle: { namedStyleType: "HEADING_2" }, fields: "namedStyleType" } });
    } else if (ln.style === "bold" && end > start) {
      reqs.push({ updateTextStyle: { range: { startIndex: start, endIndex: end }, textStyle: { bold: true }, fields: "bold" } });
    } else if (ln.style === "muted" && end > start) {
      reqs.push({ updateTextStyle: { range: { startIndex: start, endIndex: end }, textStyle: { foregroundColor: { color: { rgbColor: { red: 0.4, green: 0.4, blue: 0.4 } } } }, fields: "foregroundColor" } });
    }
    idx += text.length;
  }
  return reqs;
}

async function loadBrandAndSettings() {
  let brand = { name: "Orizino", addr: "", email: "team@orizino.com" };
  let settings: any = {};
  try {
    const [{ data: b }, { data: g }] = await Promise.all([
      supabaseAdmin.from("site_settings").select("value").eq("key", "brand_settings").maybeSingle(),
      supabaseAdmin.from("site_settings").select("value").eq("key", "gdocs_settings").maybeSingle(),
    ]);
    const v: any = b?.value || {};
    brand = { name: v.brand_name || v.site_name || "Orizino", addr: v.address || "", email: v.support_email || "team@orizino.com" };
    settings = g?.value || {};
  } catch {}
  return { brand, settings };
}

/**
 * Create (archive) a Google Doc for an order's invoice or shipping sticker.
 * Uses the connector gateway via process.env — works on the TanStack server runtime.
 */
export const archiveOrderToGdocs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      order_id: z.string().uuid(),
      doc_type: z.enum(["invoice", "sticker"]),
      trigger_reason: z.string().min(1).max(60).default("manual"),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);

    const { lovable, docs, drive } = gatewayKeys();
    if (!lovable) return { error: "LOVABLE_API_KEY not configured", code: "config_missing" } as const;
    if (!docs) return { error: "Google Docs is not connected", code: "gdocs_not_connected" } as const;

    try {
      // Skip duplicate auto-archive for the same reason
      if (data.trigger_reason !== "manual") {
        const { data: existing } = await supabaseAdmin
          .from("order_documents")
          .select("id, external_url")
          .eq("order_id", data.order_id)
          .eq("doc_type", data.doc_type)
          .eq("trigger_reason", data.trigger_reason)
          .eq("status", "archived")
          .maybeSingle();
        if (existing) return { ok: true, skipped: "already_archived", document: existing } as const;
      }

      const { data: order, error: oErr } = await supabaseAdmin.from("orders").select("*").eq("id", data.order_id).maybeSingle();
      if (oErr) return { error: oErr.message, code: "db_error" } as const;
      if (!order) return { error: "Order not found", code: "not_found" } as const;

      const { data: items } = await supabaseAdmin.from("order_items").select("*").eq("order_id", data.order_id);
      const { brand, settings } = await loadBrandAndSettings();

      const addr: any = order.shipping_address || {};
      const ctx: Record<string, string> = {
        order_number: order.order_number || "",
        brand_name: brand.name,
        customer_name: addr.full_name || addr.name || "",
        status: order.status || "",
        total: money(order.total),
        date: new Date(order.created_at).toLocaleDateString(),
        trigger: data.trigger_reason,
      };
      const defaultTitles: Record<string, string> = {
        invoice: "Invoice — {{order_number}} — {{brand_name}}",
        sticker: "Shipping Label — {{order_number}} — {{customer_name}}",
      };
      const tpl = settings[`${data.doc_type}_title_template`] || defaultTitles[data.doc_type];
      const title = renderTemplate(tpl, ctx).trim() || `${data.doc_type} ${order.order_number}`;

      const lines = data.doc_type === "invoice"
        ? buildInvoiceDoc(order, items || [], brand)
        : buildStickerDoc(order, brand);

      // 1. Create the doc
      const created = await withRetry("docs.create", () =>
        gFetch(DOCS_GATEWAY, `/documents`, docs, { method: "POST", body: JSON.stringify({ title }) }),
      );
      const documentId: string = created.documentId;

      // 2. Insert content
      const requests = linesToRequests(lines);
      if (requests.length) {
        await withRetry("docs.batchUpdate", () =>
          gFetch(DOCS_GATEWAY, `/documents/${documentId}:batchUpdate`, docs, { method: "POST", body: JSON.stringify({ requests }) }),
        );
      }

      // 3. Move to folder (if configured & drive connected)
      const folders = settings.folders || {};
      const folderId: string | undefined = folders[data.trigger_reason] || folders[order.status] || undefined;
      if (folderId && drive) {
        try {
          await withRetry("drive.move", () =>
            gFetch(DRIVE_GATEWAY, `/files/${documentId}?addParents=${encodeURIComponent(folderId)}&supportsAllDrives=true&fields=id,parents`, drive, { method: "PATCH", body: JSON.stringify({}) }),
          );
        } catch (e) {
          console.warn("drive move failed:", e);
        }
      }

      const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;
      const { data: saved, error: insErr } = await supabaseAdmin.from("order_documents").insert({
        order_id: data.order_id,
        doc_type: data.doc_type,
        provider: "google_docs",
        external_doc_id: documentId,
        external_url: docUrl,
        title,
        created_by: context.userId,
        trigger_reason: data.trigger_reason,
        folder_id: folderId || null,
        status: "archived",
      }).select().single();
      if (insErr) throw new Error(insErr.message);

      try {
        await supabaseAdmin.from("staff_audit_log").insert({
          actor_id: context.userId,
          action: "gdocs_archive",
          entity: "order_documents",
          entity_id: saved.id,
          meta: { order_id: data.order_id, doc_type: data.doc_type, trigger_reason: data.trigger_reason, document_id: documentId, title },
        });
      } catch {}

      return { ok: true, document: saved } as const;
    } catch (e: any) {
      const msg = String(e?.message || "internal");
      console.error("archiveOrderToGdocs error:", msg);
      const status = Number((msg.match(/Gateway (\d{3})/) || [])[1] || 0);
      return { error: msg, code: status === 401 || status === 403 ? "gdocs_auth" : status === 429 ? "rate_limit" : "internal" } as const;
    }
  });

/**
 * Export an archived Google Doc as PDF via Drive, store it in Supabase storage, and
 * return its public URL.
 */
export const exportOrderDocPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ order_document_id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);

    const { lovable, drive } = gatewayKeys();
    if (!lovable) return { error: "LOVABLE_API_KEY not configured", code: "config_missing" } as const;
    if (!drive) return { error: "Google Drive is not connected", code: "gdrive_not_connected" } as const;

    try {
      const { data: doc, error: dErr } = await supabaseAdmin.from("order_documents").select("*").eq("id", data.order_document_id).maybeSingle();
      if (dErr || !doc) return { error: "Document not found", code: "not_found" } as const;
      if (doc.pdf_url) return { ok: true, pdf_url: doc.pdf_url } as const;

      const buf = await withRetry("drive.export", async () => {
        const r = await fetch(`${DRIVE_GATEWAY}/files/${doc.external_doc_id}/export?mimeType=${encodeURIComponent("application/pdf")}`, {
          headers: { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": drive },
        });
        if (!r.ok) {
          const txt = await r.text();
          throw new Error(`Gateway ${r.status}: ${txt.slice(0, 300)}`);
        }
        return new Uint8Array(await r.arrayBuffer());
      });

      const path = `order-docs/${doc.order_id}/${doc.doc_type}-${doc.id}.pdf`;
      const { error: upErr } = await supabaseAdmin.storage.from(BUCKET).upload(path, buf, { contentType: "application/pdf", upsert: true });
      if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);

      const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
      const pdfUrl = pub.publicUrl;

      await supabaseAdmin.from("order_documents").update({ pdf_url: pdfUrl }).eq("id", doc.id);

      try {
        await supabaseAdmin.from("staff_audit_log").insert({
          actor_id: context.userId,
          action: "gdocs_export_pdf",
          entity: "order_documents",
          entity_id: doc.id,
          meta: { order_id: doc.order_id, doc_type: doc.doc_type, pdf_url: pdfUrl },
        });
      } catch {}

      return { ok: true, pdf_url: pdfUrl } as const;
    } catch (e: any) {
      const msg = String(e?.message || "internal");
      console.error("exportOrderDocPdf error:", msg);
      return { error: msg, code: "internal" } as const;
    }
  });
