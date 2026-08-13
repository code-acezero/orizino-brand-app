"use server";

import { createServerFn } from "@/lib/server-fn-compat";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { googleAccessToken, GOOGLE_SCOPES } from "@/integrations/google/service-account";

const API_BASE = "https://sheets.googleapis.com/v4";

async function callSheets(path: string, opts: { method?: string; body?: any; query?: Record<string, string> } = {}) {
  const token = await googleAccessToken(GOOGLE_SCOPES.sheets);
  const qs = opts.query ? "?" + new URLSearchParams(opts.query).toString() : "";
  const res = await fetch(`${API_BASE}${path}${qs}`, {
    method: opts.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Sheets ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

async function assertAdminOrMod(supabase: any, userId: string) {
  const { data: a } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" as any });
  if (a) return;
  const { data: m } = await supabase.rpc("has_role", { _user_id: userId, _role: "moderator" as any });
  if (!m) throw new Error("Forbidden");
}

// ---------------------------------------------------------------------------
// Column mapping (configurable via site_settings key `sheets_column_mapping`)
// ---------------------------------------------------------------------------

export const SHEET_FIELDS = [
  "serial_code",
  "product",
  "variant",
  "sku",
  "status",
  "order_id",
  "available_at",
  "sold_at",
  "cancelled_at",
  "returned_at",
  "defective_at",
  "created_at",
  "updated_at",
] as const;
export type SheetField = (typeof SHEET_FIELDS)[number];

export interface SheetMapping {
  headerRow: number;      // 1-based row containing column titles
  dataStartRow: number;   // 1-based row where data starts (usually headerRow + 1)
  statusColumn: number;   // 1-based column index used by pull-back
  serialColumn: number;   // 1-based column index of the serial code
  columns: { header: string; field: SheetField | "" }[];
}

const DEFAULT_MAPPING: SheetMapping = {
  headerRow: 1,
  dataStartRow: 2,
  serialColumn: 1,
  statusColumn: 5,
  columns: [
    { header: "Serial code",   field: "serial_code" },
    { header: "Product",       field: "product" },
    { header: "Variant",       field: "variant" },
    { header: "SKU",           field: "sku" },
    { header: "Status",        field: "status" },
    { header: "Order ID",      field: "order_id" },
    { header: "Available at",  field: "available_at" },
    { header: "Sold at",       field: "sold_at" },
    { header: "Cancelled at",  field: "cancelled_at" },
    { header: "Returned at",   field: "returned_at" },
    { header: "Defective at",  field: "defective_at" },
    { header: "Created at",    field: "created_at" },
    { header: "Updated at",    field: "updated_at" },
  ],
};

const MAPPING_KEY = "sheets_column_mapping";

async function loadMapping(sb: any): Promise<SheetMapping> {
  const { data } = await sb.from("site_settings").select("value").eq("key", MAPPING_KEY).maybeSingle();
  const v = data?.value;
  if (!v || typeof v !== "object" || !Array.isArray(v.columns) || !v.columns.length) return DEFAULT_MAPPING;
  return {
    headerRow: Number(v.headerRow) > 0 ? Number(v.headerRow) : 1,
    dataStartRow: Number(v.dataStartRow) > 0 ? Number(v.dataStartRow) : (Number(v.headerRow) || 1) + 1,
    serialColumn: Number(v.serialColumn) > 0 ? Number(v.serialColumn) : 1,
    statusColumn: Number(v.statusColumn) > 0 ? Number(v.statusColumn) : 5,
    columns: v.columns.map((c: any) => ({ header: String(c.header ?? ""), field: (SHEET_FIELDS as readonly string[]).includes(c.field) ? c.field : "" })),
  };
}

const mappingSchema = z.object({
  headerRow: z.number().int().min(1).max(100),
  dataStartRow: z.number().int().min(1).max(1000),
  serialColumn: z.number().int().min(1).max(500),
  statusColumn: z.number().int().min(1).max(500),
  columns: z.array(z.object({
    header: z.string().min(1).max(200),
    field: z.enum(["", ...SHEET_FIELDS] as [string, ...string[]]),
  })).min(1).max(200),
});

export const getSheetMapping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    const mapping = await loadMapping(context.supabase);
    return { mapping, defaults: DEFAULT_MAPPING, fields: SHEET_FIELDS as readonly string[] };
  });

export const saveSheetMapping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { mapping: SheetMapping }) => ({ mapping: mappingSchema.parse(d.mapping) as SheetMapping }))
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    const sb: any = context.supabase;
    const { error } = await sb
      .from("site_settings")
      .upsert({ key: MAPPING_KEY, value: data.mapping, description: "Google Sheets column mapping for serials sync" }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------

async function loadSheetConfig(sb: any) {
  const { data: s } = await sb
    .from("sticker_settings")
    .select("id, google_sheet_id, google_sheet_tab")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  const row = s ?? (await sb.from("sticker_settings").select("id, google_sheet_id, google_sheet_tab").limit(1).maybeSingle()).data;
  if (!row?.google_sheet_id) throw new Error("Set Google Sheet ID in Sticker Setup first");
  return { id: row.id, sheetId: row.google_sheet_id, tab: row.google_sheet_tab || "Serials" };
}

async function loadStatusDates(sb: any, serialIds: string[]): Promise<Record<string, Record<string, string>>> {
  const out: Record<string, Record<string, string>> = {};
  if (!serialIds.length) return out;
  const CHUNK = 200;
  for (let i = 0; i < serialIds.length; i += CHUNK) {
    const chunk = serialIds.slice(i, i + CHUNK);
    const { data } = await sb
      .from("product_serial_events")
      .select("serial_id, to_status, created_at")
      .in("serial_id", chunk)
      .order("created_at", { ascending: true });
    for (const ev of data ?? []) {
      if (!ev.to_status) continue;
      (out[ev.serial_id] ??= {})[ev.to_status] = ev.created_at;
    }
  }
  return out;
}

function fieldValue(field: SheetField | "", r: any, dates: Record<string, string>): string {
  switch (field) {
    case "serial_code":  return r.serial_code ?? "";
    case "product":      return r.products?.name ?? "";
    case "variant":      return [r.product_variants?.size, r.product_variants?.color].filter(Boolean).join(" / ");
    case "sku":          return r.product_variants?.sku || r.products?.sku || "";
    case "status":       return r.status ?? "";
    case "order_id":     return r.sold_order_id ?? "";
    case "available_at": return dates.available ?? "";
    case "sold_at":      return dates.sold ?? r.sold_at ?? "";
    case "cancelled_at": return dates.cancelled ?? "";
    case "returned_at":  return dates.returned ?? "";
    case "defective_at": return dates.defective ?? "";
    case "created_at":   return r.created_at ?? "";
    case "updated_at":   return r.updated_at ?? "";
    default:             return "";
  }
}

function toRow(mapping: SheetMapping, r: any, dates: Record<string, string> = {}) {
  return mapping.columns.map((c) => fieldValue(c.field, r, dates));
}

function colLetter(n: number): string {
  let s = "";
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s || "A";
}

export const pushSerialsToSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    const sb: any = context.supabase;
    const cfg = await loadSheetConfig(sb);
    const mapping = await loadMapping(sb);

    const { data: rows, error } = await sb
      .from("product_serials")
      .select("id, serial_code, status, sold_order_id, sold_at, created_at, updated_at, products(name, sku), product_variants(size, color, sku)")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);

    const datesBySerial = await loadStatusDates(sb, (rows ?? []).map((r: any) => r.id));

    const headerRow = mapping.columns.map((c) => c.header);
    const dataRows = (rows ?? []).map((r: any) => toRow(mapping, r, datesBySerial[r.id] ?? {}));

    // Build sparse write: headers land at headerRow, data at dataStartRow.
    const lastCol = colLetter(mapping.columns.length);
    const clearRange = `${cfg.tab}!A1:${lastCol}10000`;
    await callSheets(`/spreadsheets/${cfg.sheetId}/values/${clearRange}:clear`, { method: "POST", body: {} });

    await callSheets(`/spreadsheets/${cfg.sheetId}/values/${cfg.tab}!A${mapping.headerRow}`, {
      method: "PUT",
      query: { valueInputOption: "RAW" },
      body: { range: `${cfg.tab}!A${mapping.headerRow}`, majorDimension: "ROWS", values: [headerRow] },
    });
    if (dataRows.length) {
      await callSheets(`/spreadsheets/${cfg.sheetId}/values/${cfg.tab}!A${mapping.dataStartRow}`, {
        method: "PUT",
        query: { valueInputOption: "RAW" },
        body: { range: `${cfg.tab}!A${mapping.dataStartRow}`, majorDimension: "ROWS", values: dataRows },
      });
    }

    await sb.from("sticker_settings").update({ last_synced_at: new Date().toISOString() }).eq("id", cfg.id);
    return { pushed: dataRows.length, columns: mapping.columns.length };
  });

export const pullSerialsFromSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    const sb: any = context.supabase;
    const cfg = await loadSheetConfig(sb);
    const mapping = await loadMapping(sb);

    const lastCol = colLetter(mapping.columns.length);
    const range = `${cfg.tab}!A${mapping.dataStartRow}:${lastCol}10000`;
    const resp = await callSheets(`/spreadsheets/${cfg.sheetId}/values/${range}`);
    const rows = (resp.values as string[][]) || [];
    const validStatus = new Set(["available", "sold", "cancelled", "returned", "defective"]);
    const sIdx = Math.max(0, mapping.serialColumn - 1);
    const stIdx = Math.max(0, mapping.statusColumn - 1);
    let updated = 0;
    for (const r of rows) {
      const code = r[sIdx];
      const status = r[stIdx];
      if (!code || !status || !validStatus.has(status)) continue;
      const { data: existing } = await sb.from("product_serials").select("id, status").eq("serial_code", code).maybeSingle();
      if (!existing || existing.status === status) continue;
      const { error } = await sb.from("product_serials").update({ status }).eq("id", existing.id);
      if (!error) updated++;
    }
    // Keep variant/product stock consistent with whatever just changed.
    if (updated > 0) await sb.rpc("sync_stock_from_serials");
    return { updated };
  });

export const testSheetConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sheetId?: string; tab?: string } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    const sb: any = context.supabase;
    const mapping = await loadMapping(sb);
    const HEADERS = mapping.columns.map((c) => c.header);

    let sheetId = data.sheetId;
    let tab = data.tab;
    if (!sheetId) {
      const cfg = await loadSheetConfig(sb);
      sheetId = cfg.sheetId;
      tab = tab || cfg.tab;
    }
    tab = tab || "Serials";

    const steps: { step: string; ok: boolean; detail?: string }[] = [];
    const started = Date.now();

    try {
      const meta = await callSheets(`/spreadsheets/${sheetId}`, { query: { fields: "properties.title,sheets.properties.title" } });
      const tabs: string[] = (meta.sheets ?? []).map((s: any) => s.properties?.title).filter(Boolean);
      steps.push({ step: "Connect & read metadata", ok: true, detail: `Title: ${meta.properties?.title ?? "?"} · Tabs: ${tabs.join(", ") || "none"}` });
      if (tab && !tabs.includes(tab)) {
        steps.push({ step: "Tab exists", ok: false, detail: `Tab "${tab}" not found. Create it in the sheet or update the tab name.` });
        return { ok: false, ms: Date.now() - started, steps };
      }
      steps.push({ step: "Tab exists", ok: true, detail: tab! });
    } catch (e: any) {
      steps.push({ step: "Connect & read metadata", ok: false, detail: e.message });
      return { ok: false, ms: Date.now() - started, steps };
    }

    const lastCol = colLetter(HEADERS.length);
    const testRange = `${tab}!AA1:${colLetter(26 + HEADERS.length)}2`;
    const stamp = new Date().toISOString();
    const dummy = HEADERS.map((_, i) => {
      const f = mapping.columns[i]?.field;
      if (f === "serial_code") return "TEST-0001";
      if (f === "status") return "sold";
      if (f && f.endsWith("_at")) return stamp;
      return "sample";
    });
    try {
      await callSheets(`/spreadsheets/${sheetId}/values/${testRange}`, {
        method: "PUT",
        query: { valueInputOption: "RAW" },
        body: { range: testRange, majorDimension: "ROWS", values: [HEADERS, dummy] },
      });
      steps.push({ step: "Write test row", ok: true, detail: `Range ${testRange}` });
    } catch (e: any) {
      steps.push({ step: "Write test row", ok: false, detail: e.message });
      return { ok: false, ms: Date.now() - started, steps };
    }

    try {
      const resp = await callSheets(`/spreadsheets/${sheetId}/values/${testRange}`);
      const got = (resp.values as string[][]) || [];
      const headerOk = HEADERS.every((h, i) => (got[0]?.[i] ?? "") === h);
      const sIdx = Math.max(0, mapping.serialColumn - 1);
      const stIdx = Math.max(0, mapping.statusColumn - 1);
      const rowOk = got[1]?.[sIdx] === "TEST-0001" && got[1]?.[stIdx] === "sold";
      steps.push({ step: "Read back headers", ok: headerOk, detail: headerOk ? `${HEADERS.length} columns match` : "Header mismatch" });
      steps.push({ step: "Read back test row", ok: rowOk, detail: rowOk ? "Round-trip OK" : "Row values did not round-trip" });
    } catch (e: any) {
      steps.push({ step: "Read back", ok: false, detail: e.message });
    }

    try {
      await callSheets(`/spreadsheets/${sheetId}/values/${testRange}:clear`, { method: "POST", body: {} });
      steps.push({ step: "Cleanup test range", ok: true });
    } catch (e: any) {
      steps.push({ step: "Cleanup test range", ok: false, detail: e.message });
    }

    const warnings: { level: "error" | "warning"; type: string; message: string; hint?: string }[] = [];

    // Mapping sanity
    const usedFields = mapping.columns.map((c) => c.field).filter(Boolean);
    const dupFields = usedFields.filter((f, i) => usedFields.indexOf(f) !== i);
    for (const f of new Set(dupFields)) warnings.push({ level: "warning", type: "mapping", message: `Field "${f}" is mapped to multiple columns`, hint: `Open Mapping and remove the extra column bound to "${f}", or bind it to a different field.` });
    if (!usedFields.includes("serial_code")) warnings.push({ level: "error", type: "mapping", message: `No column is mapped to "serial_code"`, hint: `Open Mapping and set one column's field to "serial_code" — required to identify rows.` });
    if (!usedFields.includes("status")) warnings.push({ level: "warning", type: "mapping", message: `No column is mapped to "status" — pull-back will be disabled`, hint: `Open Mapping and bind a column to "status" if you want to sync status changes back from the sheet.` });
    if (mapping.dataStartRow <= mapping.headerRow) warnings.push({ level: "error", type: "mapping", message: `dataStartRow (${mapping.dataStartRow}) must be greater than headerRow (${mapping.headerRow})`, hint: `Set dataStartRow to ${mapping.headerRow + 1} (or higher) in Mapping so data doesn't overwrite the header row.` });

    try {
      const { data: serials } = await sb
        .from("product_serials")
        .select("id, serial_code, status, sold_at, created_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      const rows = serials ?? [];

      const seen = new Map<string, number>();
      for (const r of rows) seen.set(r.serial_code, (seen.get(r.serial_code) ?? 0) + 1);
      let dupCount = 0;
      for (const [code, n] of seen) {
        if (n > 1) {
          dupCount++;
          if (dupCount <= 5) warnings.push({ level: "error", type: "duplicate_serial", message: `Duplicate serial code "${code}" appears ${n} times`, hint: `Open Products › Serials, search "${code}", and delete or re-code the extra rows so each serial code is unique.` });
        }
      }
      if (dupCount > 5) warnings.push({ level: "error", type: "duplicate_serial", message: `…and ${dupCount - 5} more duplicate serial codes`, hint: `Run a group-by on serial_code in the DB or export to find all duplicates, then de-duplicate in bulk.` });

      const datesBySerial = await loadStatusDates(sb, rows.map((r: any) => r.id));
      const STATUS_ORDER = ["available", "sold", "cancelled", "returned", "defective"];
      let missingCount = 0;
      let oooCount = 0;

      for (const r of rows) {
        const evs = datesBySerial[r.id] ?? {};
        if (r.status && !evs[r.status]) {
          missingCount++;
          if (missingCount <= 5) warnings.push({
            level: "warning",
            type: "missing_event",
            message: `Serial "${r.serial_code}" is ${r.status} but has no ${r.status} event`,
            hint: `Insert a product_serial_events row with serial_id for "${r.serial_code}", to_status="${r.status}", and created_at set to when the change happened.`,
          });
        }
        let lastAt: number | null = null;
        let lastStatus: string | null = null;
        for (const st of STATUS_ORDER) {
          const raw = evs[st];
          if (!raw) continue;
          const t = new Date(raw).getTime();
          if (Number.isNaN(t)) continue;
          if (lastAt !== null && t < lastAt) {
            oooCount++;
            if (oooCount <= 5) warnings.push({
              level: "error",
              type: "out_of_order",
              message: `Serial "${r.serial_code}": ${st} (${new Date(t).toISOString()}) is before ${lastStatus} (${new Date(lastAt).toISOString()})`,
              hint: `Fix created_at on the ${st} event for "${r.serial_code}" so it is on/after the ${lastStatus} event, or delete the incorrect event.`,
            });
          }
          lastAt = t;
          lastStatus = st;
        }
      }
      if (missingCount > 5) warnings.push({ level: "warning", type: "missing_event", message: `…and ${missingCount - 5} more serials with missing events`, hint: `Backfill product_serial_events for all serials whose current status has no matching event (one row per serial).` });
      if (oooCount > 5) warnings.push({ level: "error", type: "out_of_order", message: `…and ${oooCount - 5} more out-of-order events`, hint: `Audit product_serial_events created_at values against the status lifecycle: available → sold → cancelled → returned → defective.` });


      const errs = warnings.filter((w) => w.level === "error").length;
      const warns = warnings.filter((w) => w.level === "warning").length;
      steps.push({
        step: "Data validation",
        ok: errs === 0,
        detail: `Scanned ${rows.length} serials · ${errs} error(s) · ${warns} warning(s)`,
      });
    } catch (e: any) {
      steps.push({ step: "Data validation", ok: false, detail: e.message });
    }

    const ok = steps.every((s) => s.ok);
    return { ok, ms: Date.now() - started, steps, headers: HEADERS, warnings, mapping };
  });
