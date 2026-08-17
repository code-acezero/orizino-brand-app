"use server";

import { createServerFn } from "@/lib/server-fn-compat";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { googleAccessToken, GOOGLE_SCOPES, getGoogleServiceAccountInfo } from "@/integrations/google/service-account";
import { runTwoWayStockSync } from "./serials.functions";
import { SHEET_FIELDS, type SheetField, type SheetMapping } from "./serials-sheets.types";

const API_BASE = "https://sheets.googleapis.com/v4";

async function callSheets(
  path: string,
  opts: { method?: string; body?: any; query?: Record<string, string> } = {}
) {
  const token = await googleAccessToken(GOOGLE_SCOPES.sheets);
  const qs = opts.query ? "?" + new URLSearchParams(opts.query).toString() : "";
  const url = `${API_BASE}${path}${qs}`;

  let lastErr: any = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: opts.method ?? "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      });

      const text = await res.text();
      if (!res.ok) {
        let errorDetail = text.slice(0, 300);
        try {
          const parsed = JSON.parse(text);
          if (parsed.error?.message) errorDetail = parsed.error.message;
        } catch {}
        if (res.status === 403) {
          throw new Error(
            `Google Sheets Permission Denied (403): Please ensure sheets-orz@orizino-integrations.iam.gserviceaccount.com has Editor role on your spreadsheet.`
          );
        }
        if (res.status === 404) {
          throw new Error(
            `Spreadsheet not found (404). Please verify your Google Sheet ID in settings.`
          );
        }
        throw new Error(`Google Sheets API error (${res.status}): ${errorDetail}`);
      }

      return text ? JSON.parse(text) : {};
    } catch (err: any) {
      lastErr = err;
      if (err.message?.includes("Permission Denied") || err.message?.includes("not found")) {
        throw err;
      }
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, attempt * 500));
      }
    }
  }

  const causeMsg = lastErr?.cause?.message ? ` (${lastErr.cause.message})` : "";
  throw new Error(lastErr?.message ? `${lastErr.message}${causeMsg}` : "Google Sheets connection failed");
}

async function assertAdminOrMod(supabase: any, userId: string) {
  if (!supabase) throw new Error("Database client not available");
  if (!userId) return;
  const [admin, mod] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }).catch(() => ({ data: false })),
    supabase.rpc("has_role", { _user_id: userId, _role: "moderator" }).catch(() => ({ data: false })),
  ]);
  if (admin?.data || mod?.data) return;
  throw new Error("Forbidden: admin/moderator only");
}

const DEFAULT_MAPPING: SheetMapping = {
  headerRow: 1,
  dataStartRow: 2,
  serialColumn: 1,
  statusColumn: 5,
  columns: [
    { header: "Serial code",          field: "serial_code" },
    { header: "Product",              field: "product" },
    { header: "Variant",              field: "variant" },
    { header: "SKU",                  field: "sku" },
    { header: "Status",               field: "status" },
    { header: "Price (৳)",            field: "price" },
    { header: "Discount Price (৳)",   field: "discount_price" },
    { header: "Discounted (৳)",       field: "discounted" },
    { header: "Sold Price (৳)",       field: "sold_price" },
    { header: "Order ID",             field: "order_id" },
    { header: "Available at",         field: "available_at" },
    { header: "Sold at",              field: "sold_at" },
    { header: "Cancelled at",         field: "cancelled_at" },
    { header: "Returned at",          field: "returned_at" },
    { header: "Defective at",         field: "defective_at" },
    { header: "Created at",           field: "created_at" },
    { header: "Updated at",           field: "updated_at" },
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
    columns: v.columns.map((c: any) => ({
      header: String(c.header ?? ""),
      field: (SHEET_FIELDS as readonly string[]).includes(c.field) ? c.field : "",
    })),
  };
}

const mappingSchema = z.object({
  headerRow: z.number().int().min(1).max(100),
  dataStartRow: z.number().int().min(1).max(1000),
  serialColumn: z.number().int().min(1).max(500),
  statusColumn: z.number().int().min(1).max(500),
  columns: z.array(
    z.object({
      header: z.string().min(1).max(200),
      field: z.enum(["", ...SHEET_FIELDS] as [string, ...string[]]),
    })
  ).min(1).max(200),
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
      .upsert(
        { key: MAPPING_KEY, value: data.mapping, description: "Google Sheets column mapping for serials sync" },
        { onConflict: "key" }
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ══════════════════════════════════════════════════════════════
   CREDENTIALS & CONFIG MANAGEMENT
   ══════════════════════════════════════════════════════════════ */

export const getGoogleSheetsOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    const sb: any = context.supabase;

    const [authInfo, sheetRow, mapping] = await Promise.all([
      getGoogleServiceAccountInfo(),
      sb.from("sticker_settings").select("id, google_sheet_id, google_sheet_tab, sync_enabled, last_synced_at").eq("is_active", true).limit(1).maybeSingle(),
      loadMapping(sb),
    ]);

    const fallbackRow = sheetRow?.data || (await sb.from("sticker_settings").select("id, google_sheet_id, google_sheet_tab, sync_enabled, last_synced_at").limit(1).maybeSingle()).data;

    return {
      auth: authInfo,
      config: {
        id: fallbackRow?.id || "",
        sheetId: fallbackRow?.google_sheet_id || "",
        tab: fallbackRow?.google_sheet_tab || "Serials",
        syncEnabled: !!fallbackRow?.sync_enabled,
        lastSyncedAt: fallbackRow?.last_synced_at || null,
      },
      mapping,
      fields: SHEET_FIELDS as readonly string[],
    };
  });

export const saveGoogleServiceAccountCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { client_email?: string; private_key?: string; raw_json?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    const sb: any = context.supabase;

    let email = data.client_email?.trim();
    let privateKey = data.private_key?.trim();

    if (data.raw_json?.trim()) {
      try {
        const parsed = JSON.parse(data.raw_json.trim());
        if (parsed.client_email) email = parsed.client_email;
        if (parsed.private_key) privateKey = parsed.private_key;
      } catch {
        throw new Error("Invalid JSON format. Please paste a valid Google Service Account JSON key.");
      }
    }

    if (!email || !privateKey) {
      throw new Error("Both client_email and private_key are required.");
    }

    const { error } = await sb.from("site_settings").upsert(
      {
        key: "google_service_account",
        value: { client_email: email, private_key: privateKey },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (error) throw new Error(`Database error saving credentials: ${error.message}`);
    return { ok: true, email };
  });

export const saveGoogleSheetTarget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sheetId: string; tab?: string; syncEnabled?: boolean }) => ({
    sheetId: d.sheetId.trim(),
    tab: d.tab?.trim() || "Serials",
    syncEnabled: d.syncEnabled ?? false,
  }))
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    const sb: any = context.supabase;

    // Clean sheetId if user pasted full URL
    let cleanSheetId = data.sheetId;
    const urlMatch = cleanSheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch && urlMatch[1]) {
      cleanSheetId = urlMatch[1];
    }

    const { data: active } = await sb
      .from("sticker_settings")
      .select("id")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const targetId = active?.id;

    if (targetId) {
      await sb
        .from("sticker_settings")
        .update({
          google_sheet_id: cleanSheetId,
          google_sheet_tab: data.tab,
          sync_enabled: data.syncEnabled,
        })
        .eq("id", targetId);
    } else {
      await sb.from("sticker_settings").update({
        google_sheet_id: cleanSheetId,
        google_sheet_tab: data.tab,
        sync_enabled: data.syncEnabled,
      }).neq("id", "00000000-0000-0000-0000-000000000000");
    }

    return { ok: true, sheetId: cleanSheetId, tab: data.tab };
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
  if (!row?.google_sheet_id) throw new Error("Please configure your Google Sheet ID in settings first.");
  return { id: row.id, sheetId: row.google_sheet_id, tab: row.google_sheet_tab || "Serials" };
}

async function loadStatusDatesAndPricing(
  sb: any,
  rows: any[]
): Promise<{
  datesBySerial: Record<string, Record<string, string>>;
  pricingBySerial: Record<
    string,
    {
      mainPrice: number;
      normalDiscountPrice: number;
      discount: number;
      soldPrice: number | string;
      isOverridden: boolean;
    }
  >;
}> {
  const datesBySerial: Record<string, Record<string, string>> = {};
  const pricingBySerial: Record<
    string,
    {
      mainPrice: number;
      normalDiscountPrice: number;
      discount: number;
      soldPrice: number | string;
      isOverridden: boolean;
    }
  > = {};

  const serialIds = rows.map((r) => r.id);
  if (!serialIds.length) return { datesBySerial, pricingBySerial };

  for (const r of rows) {
    const mainPrice = Number(
      r.product_variants?.price_override ||
      r.products?.compare_at_price ||
      r.products?.price ||
      0
    );
    const normalDiscountPrice = Number(
      r.product_variants?.price_override ||
      r.products?.price ||
      mainPrice ||
      0
    );
    pricingBySerial[r.id] = {
      mainPrice,
      normalDiscountPrice,
      discount: r.status === "sold" ? Math.max(0, mainPrice - normalDiscountPrice) : 0,
      soldPrice: r.status === "sold" ? normalDiscountPrice : "",
      isOverridden: false,
    };
  }

  const CHUNK = 200;
  const soldOrderIds = new Set<string>();

  for (let i = 0; i < serialIds.length; i += CHUNK) {
    const chunk = serialIds.slice(i, i + CHUNK);
    const { data: events } = await sb
      .from("product_serial_events")
      .select("serial_id, to_status, created_at, action, metadata, order_id")
      .in("serial_id", chunk)
      .order("created_at", { ascending: true });

    for (const ev of events ?? []) {
      if (ev.to_status) {
        (datesBySerial[ev.serial_id] ??= {})[ev.to_status] = ev.created_at;
      }
      if (ev.order_id) soldOrderIds.add(ev.order_id);

      if (ev.action === "sell" && ev.metadata) {
        const meta = ev.metadata;
        const main = meta.main_price !== undefined ? Number(meta.main_price) : pricingBySerial[ev.serial_id]?.mainPrice ?? 0;
        const normDisc = meta.discounted_price !== undefined ? Number(meta.discounted_price) : pricingBySerial[ev.serial_id]?.normalDiscountPrice ?? main;
        const sold = meta.sold_price !== undefined ? Number(meta.sold_price) : normDisc;
        const disc = meta.discount !== undefined ? Number(meta.discount) : Math.max(0, main - sold);
        const isOverride = meta.is_override === true || (typeof sold === "number" && typeof normDisc === "number" && sold !== normDisc);
        pricingBySerial[ev.serial_id] = {
          mainPrice: main,
          normalDiscountPrice: normDisc,
          discount: disc,
          soldPrice: sold,
          isOverridden: isOverride,
        };
      }
    }
  }

  const orderIdList = [...soldOrderIds];
  if (orderIdList.length > 0) {
    for (let i = 0; i < orderIdList.length; i += CHUNK) {
      const orderChunk = orderIdList.slice(i, i + CHUNK);
      const { data: orderItems } = await sb
        .from("order_items")
        .select("order_id, product_id, variant_id, unit_price")
        .in("order_id", orderChunk);

      const itemsMap = new Map<string, number>();
      for (const it of orderItems ?? []) {
        itemsMap.set(`${it.order_id}::${it.product_id}::${it.variant_id ?? ""}`, Number(it.unit_price ?? 0));
      }

      for (const r of rows) {
        if (r.status === "sold" && r.sold_order_id) {
          const key = `${r.sold_order_id}::${r.product_id}::${r.variant_id ?? ""}`;
          if (itemsMap.has(key)) {
            const soldPrice = itemsMap.get(key)!;
            const mainPrice =
              pricingBySerial[r.id]?.mainPrice ||
              Number(r.products?.compare_at_price || r.products?.price || 0);
            const normalDiscountPrice =
              pricingBySerial[r.id]?.normalDiscountPrice ||
              Number(r.product_variants?.price_override || r.products?.price || mainPrice);
            const discount = Math.max(0, mainPrice - soldPrice);
            const isOverride = pricingBySerial[r.id]?.isOverridden || soldPrice !== normalDiscountPrice;
            pricingBySerial[r.id] = {
              mainPrice,
              normalDiscountPrice,
              discount,
              soldPrice,
              isOverridden: isOverride,
            };
          }
        }
      }
    }
  }

  return { datesBySerial, pricingBySerial };
}

function fieldValue(
  field: SheetField | "",
  r: any,
  dates: Record<string, string>,
  pricingBySerial: Record<
    string,
    { mainPrice: number; normalDiscountPrice: number; discount: number; soldPrice: number | string; isOverridden: boolean }
  > = {}
): string {
  const mainPrice = Number(r.product_variants?.price_override || r.products?.compare_at_price || r.products?.price || 0);
  const normalDiscountPrice = Number(r.product_variants?.price_override || r.products?.price || 0);
  const p = pricingBySerial[r.id] || {
    mainPrice,
    normalDiscountPrice,
    discount: Math.max(0, mainPrice - normalDiscountPrice),
    soldPrice: r.status === "sold" ? normalDiscountPrice : "",
    isOverridden: false,
  };

  switch (field) {
    case "serial_code":       return r.serial_code ?? "";
    case "product":           return r.products?.name ?? "";
    case "variant":           return [r.product_variants?.size, r.product_variants?.color].filter(Boolean).join(" / ");
    case "sku":               return r.product_variants?.sku || r.products?.sku || "";
    case "status":            return r.status ?? "";
    case "price":             return p.mainPrice ? String(p.mainPrice) : "";
    case "discount_price":
    case "discounted_price":  return p.normalDiscountPrice ? String(p.normalDiscountPrice) : "";
    case "discounted":
    case "discount": {
      if (p.isOverridden && p.soldPrice !== "" && typeof p.soldPrice === "number") {
        const overriddenDiscount = Math.max(0, p.mainPrice - p.soldPrice);
        return String(overriddenDiscount);
      }
      const regularDiscount = Math.max(0, p.mainPrice - p.normalDiscountPrice);
      return regularDiscount ? String(regularDiscount) : "0";
    }
    case "sold_price":        return p.soldPrice !== "" ? String(p.soldPrice) : "";
    case "order_id":          return r.sold_order_id ?? "";
    case "available_at":      return dates.available ?? "";
    case "sold_at":           return dates.sold ?? r.sold_at ?? "";
    case "cancelled_at":      return dates.cancelled ?? "";
    case "returned_at":       return dates.returned ?? "";
    case "defective_at":      return dates.defective ?? "";
    case "created_at":        return r.created_at ? new Date(r.created_at).toLocaleString() : "";
    case "updated_at":        return r.updated_at ? new Date(r.updated_at).toLocaleString() : "";
    default:                  return "";
  }
}

function toRow(
  mapping: SheetMapping,
  r: any,
  dates: Record<string, string> = {},
  pricingBySerial: Record<
    string,
    { mainPrice: number; normalDiscountPrice: number; discount: number; soldPrice: number | string; isOverridden: boolean }
  > = {}
) {
  return mapping.columns.map((c) => fieldValue(c.field, r, dates, pricingBySerial));
}

function colLetter(n: number): string {
  let s = "";
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s || "A";
}

async function initializeAndDesignSpreadsheet(sheetId: string, primaryTab = "Serials", mapping?: SheetMapping) {
  // 1. Fetch metadata
  const meta = await callSheets(`/spreadsheets/${sheetId}`, {
    query: { fields: "sheets.properties" },
  });

  const existingSheets: Array<{ sheetId: number; title: string; index: number }> =
    (meta.sheets ?? []).map((s: any) => ({
      sheetId: s.properties?.sheetId ?? 0,
      title: s.properties?.title ?? "",
      index: s.properties?.index ?? 0,
    }));

  const requests: any[] = [];
  const foundPrimary = existingSheets.find((s) => s.title === primaryTab);
  const foundStock = existingSheets.find((s) => s.title === "Stock_Overview");
  const onlySheet1 = existingSheets.length === 1 && existingSheets[0].title === "Sheet1";

  if (!foundPrimary) {
    if (onlySheet1) {
      // Rename default Sheet1 to primaryTab (e.g. Serials)
      requests.push({
        updateSheetProperties: {
          properties: {
            sheetId: existingSheets[0].sheetId,
            title: primaryTab,
            gridProperties: { frozenRowCount: 1, rowCount: 2000, columnCount: 26 },
          },
          fields: "title,gridProperties(frozenRowCount,rowCount,columnCount)",
        },
      });
    } else {
      const newSheetId = Math.floor(100000 + Math.random() * 900000);
      requests.push({
        addSheet: {
          properties: {
            sheetId: newSheetId,
            title: primaryTab,
            gridProperties: { frozenRowCount: 1, rowCount: 2000, columnCount: 26 },
          },
        },
      });
    }
  }

  if (!foundStock) {
    const newStockId = Math.floor(100000 + Math.random() * 900000);
    requests.push({
      addSheet: {
        properties: {
          sheetId: newStockId,
          title: "Stock_Overview",
          gridProperties: { frozenRowCount: 1, rowCount: 1000, columnCount: 20 },
        },
      },
    });
  }

  // Execute tab creation / renaming if needed
  if (requests.length > 0) {
    await callSheets(`/spreadsheets/${sheetId}:batchUpdate`, {
      method: "POST",
      body: { requests },
    });
  }

  // 2. Fetch updated metadata to get accurate sheetId numbers
  const updatedMeta = await callSheets(`/spreadsheets/${sheetId}`, {
    query: { fields: "sheets.properties" },
  });
  const updatedSheets: Array<{ sheetId: number; title: string }> =
    (updatedMeta.sheets ?? []).map((s: any) => ({
      sheetId: s.properties?.sheetId ?? 0,
      title: s.properties?.title ?? "",
    }));

  const actualPrimary = updatedSheets.find((s) => s.title === primaryTab);
  const actualStock = updatedSheets.find((s) => s.title === "Stock_Overview");

  const formattingRequests: any[] = [];
  const headers = mapping?.columns?.map((c) => c.header) || DEFAULT_MAPPING.columns.map((c) => c.header);
  const numCols = headers.length;

  if (actualPrimary) {
    const sId = actualPrimary.sheetId;

    // Freeze header row
    formattingRequests.push({
      updateSheetProperties: {
        properties: {
          sheetId: sId,
          gridProperties: { frozenRowCount: 1 },
        },
        fields: "gridProperties.frozenRowCount",
      },
    });

    // Style Header Row (Dark Slate Background, White Bold Text)
    formattingRequests.push({
      repeatCell: {
        range: {
          sheetId: sId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: numCols,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.06, green: 0.09, blue: 0.16 }, // Slate 900
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 10 },
            horizontalAlignment: "LEFT",
            verticalAlignment: "MIDDLE",
            padding: { top: 6, bottom: 6, left: 8, right: 8 },
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding)",
      },
    });

    // Set Status column (col index 4) validation dropdown
    formattingRequests.push({
      setDataValidation: {
        range: {
          sheetId: sId,
          startRowIndex: 1,
          endRowIndex: 2000,
          startColumnIndex: 4,
          endColumnIndex: 5,
        },
        rule: {
          condition: {
            type: "ONE_OF_LIST",
            values: [
              { userEnteredValue: "available" },
              { userEnteredValue: "sold" },
              { userEnteredValue: "cancelled" },
              { userEnteredValue: "returned" },
              { userEnteredValue: "defective" },
            ],
          },
          showCustomUi: true,
          strict: false,
        },
      },
    });
  }

  if (actualStock) {
    const stockId = actualStock.sheetId;
    formattingRequests.push({
      updateSheetProperties: {
        properties: {
          sheetId: stockId,
          gridProperties: { frozenRowCount: 1 },
        },
        fields: "gridProperties.frozenRowCount",
      },
    });

    formattingRequests.push({
      repeatCell: {
        range: {
          sheetId: stockId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 9,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.12, green: 0.11, blue: 0.29 }, // Indigo 950
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 10 },
            horizontalAlignment: "LEFT",
            verticalAlignment: "MIDDLE",
            padding: { top: 6, bottom: 6, left: 8, right: 8 },
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding)",
      },
    });
  }

  if (formattingRequests.length > 0) {
    try {
      await callSheets(`/spreadsheets/${sheetId}:batchUpdate`, {
        method: "POST",
        body: { requests: formattingRequests },
      });
    } catch (fErr) {
      console.warn("Formatting batch warning:", fErr);
    }
  }

  // 3. Write default header labels
  try {
    await callSheets(`/spreadsheets/${sheetId}/values/${primaryTab}!A1:${colLetter(numCols)}1`, {
      method: "PUT",
      query: { valueInputOption: "RAW" },
      body: { range: `${primaryTab}!A1`, majorDimension: "ROWS", values: [headers] },
    });

    const stockHeaders = [
      "Product Name",
      "Product SKU",
      "Variant / Size",
      "Color",
      "Variant SKU",
      "Available Serials (Live)",
      "Database Stock Qty",
      "Stock Health",
      "Status",
    ];

    await callSheets(`/spreadsheets/${sheetId}/values/Stock_Overview!A1:I1`, {
      method: "PUT",
      query: { valueInputOption: "RAW" },
      body: { range: "Stock_Overview!A1", majorDimension: "ROWS", values: [stockHeaders] },
    });
  } catch (wErr) {
    console.warn("Writing headers warning:", wErr);
  }

  return { ok: true, tabs: [primaryTab, "Stock_Overview"] };
}

async function formatOverriddenSheetRows(
  sheetId: string,
  tabTitle: string,
  mapping: SheetMapping,
  rows: any[],
  pricingBySerial: Record<string, { isOverridden?: boolean }>
) {
  try {
    const meta = await callSheets(`/spreadsheets/${sheetId}`, {
      query: { fields: "sheets.properties" },
    });
    const sheets: Array<{ sheetId: number; title: string }> = (meta.sheets ?? []).map((s: any) => ({
      sheetId: s.properties?.sheetId ?? 0,
      title: s.properties?.title ?? "",
    }));
    const targetSheet = sheets.find((s) => s.title === tabTitle);
    if (!targetSheet || rows.length === 0) return;

    const sId = targetSheet.sheetId;
    const numCols = mapping.columns.length;
    const startRow = mapping.dataStartRow - 1; // 0-based row index in sheet
    const endRow = startRow + rows.length;

    const requests: any[] = [
      // Reset all data rows to clean background
      {
        repeatCell: {
          range: {
            sheetId: sId,
            startRowIndex: startRow,
            endRowIndex: endRow,
            startColumnIndex: 0,
            endColumnIndex: numCols,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
            },
          },
          fields: "userEnteredFormat.backgroundColor",
        },
      },
    ];

    // Highlight each overridden row with warm yellow background
    rows.forEach((r, idx) => {
      if (pricingBySerial[r.id]?.isOverridden) {
        requests.push({
          repeatCell: {
            range: {
              sheetId: sId,
              startRowIndex: startRow + idx,
              endRowIndex: startRow + idx + 1,
              startColumnIndex: 0,
              endColumnIndex: numCols,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 1.0, green: 0.95, blue: 0.65 }, // Yellow highlight for price override
              },
            },
            fields: "userEnteredFormat.backgroundColor",
          },
        });
      }
    });

    if (requests.length > 0) {
      await callSheets(`/spreadsheets/${sheetId}:batchUpdate`, {
        method: "POST",
        body: { requests },
      });
    }
  } catch (err) {
    console.warn("Overridden row styling warning:", err);
  }
}

export const autoFormatGoogleSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sheetId?: string; tab?: string } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    const sb: any = context.supabase;
    let sheetId = data?.sheetId;
    let tab = data?.tab;
    if (!sheetId) {
      const cfg = await loadSheetConfig(sb);
      sheetId = cfg.sheetId;
      tab = tab || cfg.tab;
    }
    const mapping = await loadMapping(sb);
    const res = await initializeAndDesignSpreadsheet(sheetId, tab || "Serials", mapping);
    return { ok: true, message: `Tabs "${tab || "Serials"}" and "Stock_Overview" created & styled successfully!`, ...res };
  });

export const pushSerialsToSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    const sb: any = context.supabase;
    const cfg = await loadSheetConfig(sb);
    const mapping = await loadMapping(sb);

    await initializeAndDesignSpreadsheet(cfg.sheetId, cfg.tab, mapping);

    const { data: rows, error } = await sb
      .from("product_serials")
      .select("id, serial_code, status, product_id, variant_id, sold_order_id, sold_at, created_at, updated_at, products(name, sku, price, compare_at_price), product_variants(size, color, sku, price_override)")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);

    const { datesBySerial, pricingBySerial } = await loadStatusDatesAndPricing(sb, rows ?? []);

    const headerRow = mapping.columns.map((c) => c.header);
    const dataRows = (rows ?? []).map((r: any) => toRow(mapping, r, datesBySerial[r.id] ?? {}, pricingBySerial));

    const lastCol = colLetter(mapping.columns.length);
    const clearRange = `${cfg.tab}!A1:${lastCol}10000`;
    try {
      await callSheets(`/spreadsheets/${cfg.sheetId}/values/${clearRange}:clear`, { method: "POST", body: {} });
    } catch {}

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

      // Highlight overridden rows in yellow
      await formatOverriddenSheetRows(cfg.sheetId, cfg.tab, mapping, rows ?? [], pricingBySerial);
    }

    if (cfg.id) {
      await sb.from("sticker_settings").update({ last_synced_at: new Date().toISOString() }).eq("id", cfg.id);
    }
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
      const code = r[sIdx]?.trim();
      const status = r[stIdx]?.trim()?.toLowerCase();
      if (!code || !status || !validStatus.has(status)) continue;
      const { data: existing } = await sb.from("product_serials").select("id, status").eq("serial_code", code).maybeSingle();
      if (!existing || existing.status === status) continue;
      const { error } = await sb.from("product_serials").update({ status }).eq("id", existing.id);
      if (!error) updated++;
    }
    // Keep variant/product stock consistent with whatever changed
    if (updated > 0) await runTwoWayStockSync(sb);
    return { updated };
  });

export const pushStockSummaryToSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    const sb: any = context.supabase;
    const cfg = await loadSheetConfig(sb);
    const stockTab = "Stock_Overview";

    await initializeAndDesignSpreadsheet(cfg.sheetId, cfg.tab);

    // Query products, variants, and live available serial counts
    const [{ data: products }, { data: variants }, { data: serials }] = await Promise.all([
      sb.from("products").select("id, name, sku, price, compare_at_price, stock_quantity, is_active").order("name"),
      sb.from("product_variants").select("id, product_id, size, color, sku, price_override, stock_quantity"),
      sb.from("product_serials").select("id, product_id, variant_id, status").eq("status", "available"),
    ]);

    const serialsByVariant = new Map<string, number>();
    const serialsByProduct = new Map<string, number>();

    for (const s of serials ?? []) {
      if (s.variant_id) {
        serialsByVariant.set(s.variant_id, (serialsByVariant.get(s.variant_id) ?? 0) + 1);
      }
      if (s.product_id) {
        serialsByProduct.set(s.product_id, (serialsByProduct.get(s.product_id) ?? 0) + 1);
      }
    }

    const headers = [
      "Product Name",
      "Product SKU",
      "Variant / Size",
      "Color",
      "Variant SKU",
      "Base Price (৳)",
      "Available Serials (Live)",
      "Database Stock Qty",
      "Stock Health",
      "Status",
    ];

    const rows: string[][] = [];

    for (const p of products ?? []) {
      const prodVariants = (variants ?? []).filter((v: any) => v.product_id === p.id);
      if (prodVariants.length > 0) {
        for (const v of prodVariants) {
          const availCount = serialsByVariant.get(v.id) ?? 0;
          const dbStock = v.stock_quantity ?? 0;
          const health = availCount === dbStock ? "Synced" : `Mismatch (Serials: ${availCount} vs Stock: ${dbStock})`;
          rows.push([
            p.name,
            p.sku || "",
            v.size || "Standard",
            v.color || "",
            v.sku || "",
            String(v.price_override || p.compare_at_price || p.price || 0),
            String(availCount),
            String(dbStock),
            health,
            p.is_active ? "Active" : "Archived",
          ]);
        }
      } else {
        const availCount = serialsByProduct.get(p.id) ?? 0;
        const dbStock = p.stock_quantity ?? 0;
        const health = availCount === dbStock ? "Synced" : `Mismatch (Serials: ${availCount} vs Stock: ${dbStock})`;
        rows.push([
          p.name,
          p.sku || "",
          "All",
          "",
          p.sku || "",
          String(p.compare_at_price || p.price || 0),
          String(availCount),
          String(dbStock),
          health,
          p.is_active ? "Active" : "Archived",
        ]);
      }
    }

    const clearRange = `${stockTab}!A1:J1000`;
    try {
      await callSheets(`/spreadsheets/${cfg.sheetId}/values/${clearRange}:clear`, { method: "POST", body: {} });
    } catch {}

    await callSheets(`/spreadsheets/${cfg.sheetId}/values/${stockTab}!A1`, {
      method: "PUT",
      query: { valueInputOption: "RAW" },
      body: { range: `${stockTab}!A1`, majorDimension: "ROWS", values: [headers, ...rows] },
    });

    return { pushedRows: rows.length, tab: stockTab };
  });

/**
 * Background / silent helper to keep connected Google Sheets synchronized in real-time
 * whenever an offline/online order or invoice is confirmed.
 */
export async function syncSerialsAndStockToSheetSilently(sb: any): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: cfg } = await sb
      .from("sticker_settings")
      .select("id, google_sheet_id, google_sheet_tab, sync_enabled")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!cfg?.google_sheet_id || cfg.sync_enabled === false) {
      return { ok: false, error: "No active Google Sheet configured or sync disabled" };
    }

    const mapping = await loadMapping(sb);
    const primaryTab = cfg.google_sheet_tab || "Serials";

    const { data: rows, error: rErr } = await sb
      .from("product_serials")
      .select("id, serial_code, status, product_id, variant_id, sold_order_id, sold_at, created_at, updated_at, products(name, sku, price, compare_at_price), product_variants(size, color, sku, price_override)")
      .order("created_at", { ascending: false })
      .limit(5000);

    if (rErr) throw new Error(rErr.message);

    const { datesBySerial, pricingBySerial } = await loadStatusDatesAndPricing(sb, rows ?? []);
    const headerRow = mapping.columns.map((c) => c.header);
    const dataRows = (rows ?? []).map((r: any) => toRow(mapping, r, datesBySerial[r.id] ?? {}, pricingBySerial));

    const lastCol = colLetter(mapping.columns.length);
    const clearRange = `${primaryTab}!A1:${lastCol}10000`;
    try {
      await callSheets(`/spreadsheets/${cfg.google_sheet_id}/values/${clearRange}:clear`, { method: "POST", body: {} });
    } catch {}

    await callSheets(`/spreadsheets/${cfg.google_sheet_id}/values/${primaryTab}!A${mapping.headerRow}`, {
      method: "PUT",
      query: { valueInputOption: "RAW" },
      body: { range: `${primaryTab}!A${mapping.headerRow}`, majorDimension: "ROWS", values: [headerRow] },
    });

    if (dataRows.length) {
      await callSheets(`/spreadsheets/${cfg.google_sheet_id}/values/${primaryTab}!A${mapping.dataStartRow}`, {
        method: "PUT",
        query: { valueInputOption: "RAW" },
        body: { range: `${primaryTab}!A${mapping.dataStartRow}`, majorDimension: "ROWS", values: dataRows },
      });

      // Highlight overridden rows in yellow
      await formatOverriddenSheetRows(cfg.google_sheet_id, primaryTab, mapping, rows ?? [], pricingBySerial);
    }

    if (cfg.id) {
      await sb.from("sticker_settings").update({ last_synced_at: new Date().toISOString() }).eq("id", cfg.id);
    }
    return { ok: true };
  } catch (err: any) {
    console.warn("Silent sheet sync warning:", err?.message || err);
    return { ok: false, error: err?.message };
  }
}

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

    // 1. Service account check
    const authInfo = await getGoogleServiceAccountInfo();
    if (!authInfo.configured) {
      steps.push({
        step: "Google Service Account credentials",
        ok: false,
        detail: "No Service Account credentials found. Please paste your Google Service Account JSON key in Settings.",
      });
      return { ok: false, ms: Date.now() - started, steps };
    }
    steps.push({
      step: "Google Service Account credentials",
      ok: true,
      detail: `Authenticated as ${authInfo.email} (${authInfo.source === "db" ? "from Database" : "from Environment"})`,
    });

    // 2. Read spreadsheet metadata
    try {
      const meta = await callSheets(`/spreadsheets/${sheetId}`, { query: { fields: "properties.title,sheets.properties.title" } });
      const tabs: string[] = (meta.sheets ?? []).map((s: any) => s.properties?.title).filter(Boolean);
      steps.push({ step: "Connect & read spreadsheet", ok: true, detail: `Spreadsheet: "${meta.properties?.title ?? "?"}" · Tabs: [${tabs.join(", ")}]` });

      if (tab && !tabs.includes(tab)) {
        // Auto-initialize the sheet and create/format all missing tabs immediately
        await initializeAndDesignSpreadsheet(sheetId, tab, mapping);
        steps.push({ step: `Tab "${tab}" exists`, ok: true, detail: `Tab "${tab}" and "Stock_Overview" auto-created & styled.` });
      } else {
        steps.push({ step: `Tab "${tab}" exists`, ok: true, detail: `Found active tab "${tab}"` });
      }
    } catch (e: any) {
      steps.push({
        step: "Connect & read spreadsheet",
        ok: false,
        detail: e.message || "Failed to connect to Google Sheets API.",
      });
      return { ok: false, ms: Date.now() - started, steps };
    }

    // 3. Write & read test row (in-bounds temporary scratch cells)
    const testRange = `${tab}!A998:${colLetter(HEADERS.length)}999`;
    const stamp = new Date().toISOString();
    const dummy = HEADERS.map((_, i) => {
      const f = mapping.columns[i]?.field;
      if (f === "serial_code") return "TEST-0001";
      if (f === "status") return "available";
      if (f && f.endsWith("_at")) return stamp;
      return "test_val";
    });

    try {
      await callSheets(`/spreadsheets/${sheetId}/values/${testRange}`, {
        method: "PUT",
        query: { valueInputOption: "RAW" },
        body: { range: testRange, majorDimension: "ROWS", values: [HEADERS, dummy] },
      });
      steps.push({ step: "Write test cell data", ok: true, detail: `Range ${testRange} written successfully` });
    } catch (e: any) {
      steps.push({
        step: "Write test cell data",
        ok: false,
        detail: e.message || "Failed to write test cells to sheet.",
      });
      return { ok: false, ms: Date.now() - started, steps };
    }

    try {
      const resp = await callSheets(`/spreadsheets/${sheetId}/values/${testRange}`);
      const got = (resp.values as string[][]) || [];
      const headerOk = HEADERS.every((h, i) => (got[0]?.[i] ?? "") === h);
      steps.push({ step: "Read back verification", ok: headerOk, detail: headerOk ? `${HEADERS.length} columns verified` : "Header mismatch" });
    } catch (e: any) {
      steps.push({ step: "Read back verification", ok: false, detail: e.message });
    }

    try {
      await callSheets(`/spreadsheets/${sheetId}/values/${testRange}:clear`, { method: "POST", body: {} });
      steps.push({ step: "Cleanup temporary test cells", ok: true });
    } catch (e: any) {
      steps.push({ step: "Cleanup temporary test cells", ok: false, detail: e.message });
    }

    const ok = steps.every((s) => s.ok);
    return { ok, ms: Date.now() - started, steps, headers: HEADERS, mapping, serviceAccountEmail: authInfo.email };
  });
