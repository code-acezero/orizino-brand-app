import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SHEETS_GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

function gatewayHeaders() {
  const lovable = process.env.LOVABLE_API_KEY;
  if (!lovable) throw new Error("LOVABLE_API_KEY is not configured");
  const sheets = process.env.GOOGLE_SHEETS_API_KEY;
  if (!sheets) throw new Error("GOOGLE_SHEETS_API_KEY is not configured (link Google Sheets connector)");
  return {
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": sheets,
    "Content-Type": "application/json",
  } as Record<string, string>;
}

async function sheetsFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${SHEETS_GATEWAY}${path}`, {
    ...init,
    headers: { ...gatewayHeaders(), ...(init.headers as any) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Google Sheets ${path} failed [${res.status}]: ${JSON.stringify(data)}`);
  }
  return data;
}

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" as any });
  if (!data) throw new Error("Forbidden: admins only");
}

type ReportMode = "weekly" | "monthly" | "instant";

async function ensureSpreadsheet(): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const { data: cfg } = await supabaseAdmin
    .from("affiliate_report_config")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (cfg?.spreadsheet_id) {
    return { spreadsheetId: cfg.spreadsheet_id, spreadsheetUrl: cfg.spreadsheet_url ?? "" };
  }

  const created = await sheetsFetch("/spreadsheets", {
    method: "POST",
    body: JSON.stringify({
      properties: { title: `Affiliate Reports` },
      sheets: [
        { properties: { title: "Weekly Report" } },
        { properties: { title: "Monthly Payouts" } },
        { properties: { title: "Instant Report" } },
      ],
    }),
  });

  const spreadsheetId = created.spreadsheetId as string;
  const spreadsheetUrl = created.spreadsheetUrl as string;

  await supabaseAdmin
    .from("affiliate_report_config")
    .update({ spreadsheet_id: spreadsheetId, spreadsheet_url: spreadsheetUrl })
    .eq("id", 1);

  return { spreadsheetId, spreadsheetUrl };
}

async function getOrCreateSheetId(spreadsheetId: string, title: string): Promise<number> {
  const meta = await sheetsFetch(`/spreadsheets/${spreadsheetId}?fields=sheets.properties`);
  const found = (meta.sheets ?? []).find((s: any) => s.properties?.title === title);
  if (found) return found.properties.sheetId as number;
  const res = await sheetsFetch(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] }),
  });
  return res.replies[0].addSheet.properties.sheetId as number;
}

async function clearSheet(spreadsheetId: string, title: string) {
  // Clear values
  await sheetsFetch(`/spreadsheets/${spreadsheetId}/values/${title}:clear`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  // Also unmerge + reset formatting so we can rewrite cleanly
  const sheetId = await getOrCreateSheetId(spreadsheetId, title);
  await sheetsFetch(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: [
        { unmergeCells: { range: { sheetId } } },
        { updateCells: { range: { sheetId }, fields: "userEnteredFormat" } },
      ],
    }),
  }).catch(() => {});
}

async function writeValues(spreadsheetId: string, range: string, values: (string | number)[][]) {
  await sheetsFetch(
    `/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    { method: "PUT", body: JSON.stringify({ range, values }) },
  );
}

/** Brand-styled formatting: title bar, sticky header, banding, currency. */
async function applyProFormatting(opts: {
  spreadsheetId: string;
  sheetId: number;
  title: string;
  subtitle: string;
  headerCount: number;
  rowCount: number;
  currencyColumns: number[];
  numericColumns: number[];
}) {
  const { spreadsheetId, sheetId, title, subtitle, headerCount, rowCount, currencyColumns, numericColumns } = opts;
  const totalCols = headerCount;

  const requests: any[] = [
    { mergeCells: { range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: totalCols }, mergeType: "MERGE_ALL" } },
    { updateCells: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 },
        rows: [{ values: [{
          userEnteredValue: { stringValue: title },
          userEnteredFormat: {
            backgroundColor: { red: 0.094, green: 0.125, blue: 0.243 },
            horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE",
            padding: { top: 10, bottom: 10, left: 12, right: 12 },
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 16, bold: true },
          },
        }] }],
        fields: "userEnteredValue,userEnteredFormat",
    } },
    { mergeCells: { range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: totalCols }, mergeType: "MERGE_ALL" } },
    { updateCells: {
        range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 1 },
        rows: [{ values: [{
          userEnteredValue: { stringValue: subtitle },
          userEnteredFormat: {
            backgroundColor: { red: 0.957, green: 0.965, blue: 0.984 },
            horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE",
            padding: { top: 6, bottom: 6, left: 12, right: 12 },
            textFormat: { foregroundColor: { red: 0.29, green: 0.33, blue: 0.42 }, fontSize: 10, italic: true },
          },
        }] }],
        fields: "userEnteredValue,userEnteredFormat",
    } },
    { updateDimensionProperties: { range: { sheetId, dimension: "ROWS", startIndex: 0, endIndex: 1 }, properties: { pixelSize: 44 }, fields: "pixelSize" } },
    { updateDimensionProperties: { range: { sheetId, dimension: "ROWS", startIndex: 1, endIndex: 2 }, properties: { pixelSize: 26 }, fields: "pixelSize" } },
    { updateDimensionProperties: { range: { sheetId, dimension: "ROWS", startIndex: 2, endIndex: 3 }, properties: { pixelSize: 32 }, fields: "pixelSize" } },
    { repeatCell: {
        range: { sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: totalCols },
        cell: { userEnteredFormat: {
          backgroundColor: { red: 0.184, green: 0.243, blue: 0.376 },
          horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE",
          padding: { top: 6, bottom: 6, left: 8, right: 8 },
          textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 11, bold: true },
        } },
        fields: "userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,padding,textFormat)",
    } },
    { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 3 } }, fields: "gridProperties.frozenRowCount" } },
  ];

  if (rowCount > 0) {
    requests.push({ repeatCell: {
      range: { sheetId, startRowIndex: 3, endRowIndex: 3 + rowCount, startColumnIndex: 0, endColumnIndex: totalCols },
      cell: { userEnteredFormat: {
        verticalAlignment: "MIDDLE",
        padding: { top: 4, bottom: 4, left: 8, right: 8 },
        textFormat: { fontSize: 10 },
      } },
      fields: "userEnteredFormat(verticalAlignment,padding,textFormat)",
    } });
    requests.push({ addBanding: { bandedRange: {
      range: { sheetId, startRowIndex: 2, endRowIndex: 3 + rowCount, startColumnIndex: 0, endColumnIndex: totalCols },
      rowProperties: {
        headerColor: { red: 0.184, green: 0.243, blue: 0.376 },
        firstBandColor: { red: 1, green: 1, blue: 1 },
        secondBandColor: { red: 0.973, green: 0.976, blue: 0.984 },
      },
    } } });
  }

  for (const col of currencyColumns) {
    requests.push({ repeatCell: {
      range: { sheetId, startRowIndex: 3, endRowIndex: Math.max(4, 3 + rowCount), startColumnIndex: col, endColumnIndex: col + 1 },
      cell: { userEnteredFormat: { numberFormat: { type: "CURRENCY", pattern: "[$$-409]#,##0.00" }, horizontalAlignment: "RIGHT" } },
      fields: "userEnteredFormat.numberFormat,userEnteredFormat.horizontalAlignment",
    } });
  }
  for (const col of numericColumns) {
    requests.push({ repeatCell: {
      range: { sheetId, startRowIndex: 3, endRowIndex: Math.max(4, 3 + rowCount), startColumnIndex: col, endColumnIndex: col + 1 },
      cell: { userEnteredFormat: { numberFormat: { type: "NUMBER", pattern: "#,##0" }, horizontalAlignment: "RIGHT" } },
      fields: "userEnteredFormat.numberFormat,userEnteredFormat.horizontalAlignment",
    } });
  }

  requests.push({ autoResizeDimensions: { dimensions: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: totalCols } } });

  await sheetsFetch(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ requests }),
  });
}

async function loadAffiliateRows() {
  const { data: accts } = await supabaseAdmin
    .from("affiliate_accounts")
    .select("id, code, user_id, status, tier, total_clicks, total_signups, total_orders, total_earnings, available_balance, pending_balance, lifetime_paid, payout_method, created_at")
    .order("total_earnings", { ascending: false });

  const userIds = (accts ?? []).map((a: any) => a.user_id);
  const { data: profs } = userIds.length
    ? await supabaseAdmin.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] as any[] };
  const profMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));

  return (accts ?? []).map((a: any) => ({
    ...a,
    full_name: profMap.get(a.user_id) ?? "",
  }));
}

const REPORT_HEADERS = [
  "Affiliate Code", "Name", "Status", "Tier", "Clicks", "Signups", "Orders",
  "Total Earnings", "Available Balance", "Pending Balance", "Lifetime Paid", "Joined",
];

function dataValuesFor(accts: any[]): (string | number)[][] {
  const rows: (string | number)[][] = [REPORT_HEADERS];
  for (const a of accts) {
    rows.push([
      a.code, a.full_name, a.status, a.tier ?? "", Number(a.total_clicks ?? 0),
      Number(a.total_signups ?? 0), Number(a.total_orders ?? 0), Number(a.total_earnings ?? 0),
      Number(a.available_balance ?? 0), Number(a.pending_balance ?? 0),
      Number(a.lifetime_paid ?? 0), a.created_at?.slice(0, 10) ?? "",
    ]);
  }
  return rows;
}

async function writeFullReportTab(spreadsheetId: string, tab: string, label: string) {
  const accts = await loadAffiliateRows();
  const sheetId = await getOrCreateSheetId(spreadsheetId, tab);
  await clearSheet(spreadsheetId, tab);
  const stamp = new Date().toUTCString();
  const subtitle = `Generated ${stamp} • ${accts.length} affiliates`;
  await writeValues(spreadsheetId, `${tab}!A1`, [[label]]);
  await writeValues(spreadsheetId, `${tab}!A2`, [[subtitle]]);
  await writeValues(spreadsheetId, `${tab}!A3`, dataValuesFor(accts));
  await applyProFormatting({
    spreadsheetId, sheetId, title: label, subtitle,
    headerCount: REPORT_HEADERS.length,
    rowCount: accts.length,
    currencyColumns: [7, 8, 9, 10],
    numericColumns: [4, 5, 6],
  });
  return accts.length;
}

async function writeMonthlyPayoutTab(spreadsheetId: string) {
  const accts = await loadAffiliateRows();
  const owed = accts.filter((a: any) => Number(a.available_balance) > 0);
  const total = owed.reduce((s: number, a: any) => s + Number(a.available_balance), 0);
  const month = new Date().toISOString().slice(0, 7);
  const tab = "Monthly Payouts";
  const sheetId = await getOrCreateSheetId(spreadsheetId, tab);
  await clearSheet(spreadsheetId, tab);

  const headers = ["Affiliate Code", "Name", "Payout Method", "Available Balance"];
  const dataRows: (string | number)[][] = [headers];
  for (const a of owed) {
    dataRows.push([a.code, a.full_name, a.payout_method ?? "—", Number(a.available_balance)]);
  }
  dataRows.push(["", "", "TOTAL TO PAY", total]);

  const label = `Monthly Payouts — ${month}`;
  const subtitle = `${owed.length} affiliates owed • Total $${total.toFixed(2)}`;
  await writeValues(spreadsheetId, `${tab}!A1`, [[label]]);
  await writeValues(spreadsheetId, `${tab}!A2`, [[subtitle]]);
  await writeValues(spreadsheetId, `${tab}!A3`, dataRows);
  await applyProFormatting({
    spreadsheetId, sheetId, title: label, subtitle,
    headerCount: headers.length,
    rowCount: owed.length + 1,
    currencyColumns: [3],
    numericColumns: [],
  });
  return owed.length;
}

async function runReport(mode: ReportMode) {
  const { spreadsheetId, spreadsheetUrl } = await ensureSpreadsheet();

  if (mode === "weekly") {
    const rows = await writeFullReportTab(spreadsheetId, "Weekly Report", "Weekly Affiliate Report");
    await supabaseAdmin.from("affiliate_report_config")
      .update({ last_weekly_at: new Date().toISOString() }).eq("id", 1);
    return { spreadsheetId, spreadsheetUrl, tab: "Weekly Report", rows };
  }

  if (mode === "monthly") {
    const rows = await writeMonthlyPayoutTab(spreadsheetId);
    await supabaseAdmin.from("affiliate_report_config")
      .update({ last_monthly_at: new Date().toISOString() }).eq("id", 1);
    return { spreadsheetId, spreadsheetUrl, tab: "Monthly Payouts", rows };
  }

  // instant: overwrite the same "Instant Report" tab each time (no new tabs created)
  const rows = await writeFullReportTab(spreadsheetId, "Instant Report", "Instant Affiliate Report");
  await supabaseAdmin.from("affiliate_report_config")
    .update({ last_instant_at: new Date().toISOString() }).eq("id", 1);
  return { spreadsheetId, spreadsheetUrl, tab: "Instant Report", rows };
}

export const getAffiliateReportConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data } = await supabaseAdmin.from("affiliate_report_config").select("*").eq("id", 1).maybeSingle();
    return data;
  });

export const generateAffiliateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ mode: z.enum(["weekly", "monthly", "instant"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    return runReport(data.mode);
  });

export async function runScheduledReport(mode: "weekly" | "monthly") {
  return runReport(mode);
}

// ============ HEALTH CHECK ============
const REQUIRED_TABS = ["Weekly Report", "Monthly Payouts", "Instant Report"] as const;

export const getAffiliateReportHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const issues: string[] = [];
    const checks: Record<string, { ok: boolean; detail?: string }> = {};

    const { data: cfg } = await supabaseAdmin
      .from("affiliate_report_config").select("*").eq("id", 1).maybeSingle();

    let connectorOk = true;
    try { gatewayHeaders(); } catch (e: any) {
      connectorOk = false;
      issues.push(e?.message ?? "Connector not configured");
    }
    checks.connector = { ok: connectorOk, detail: connectorOk ? "Google Sheets linked" : "Missing API keys" };

    let spreadsheetOk = false;
    let foundTabs: string[] = [];
    if (connectorOk && cfg?.spreadsheet_id) {
      try {
        const meta = await sheetsFetch(`/spreadsheets/${cfg.spreadsheet_id}?fields=sheets.properties`);
        foundTabs = (meta.sheets ?? []).map((s: any) => s.properties?.title).filter(Boolean);
        spreadsheetOk = true;
      } catch (e: any) {
        issues.push(`Spreadsheet unreachable: ${e?.message ?? "error"}`);
      }
    } else if (!cfg?.spreadsheet_id) {
      issues.push("Spreadsheet not yet created (run a report once)");
    }
    checks.spreadsheet = { ok: spreadsheetOk, detail: cfg?.spreadsheet_url ?? "" };

    const tabsStatus = REQUIRED_TABS.map((t) => ({ tab: t, present: foundTabs.includes(t) }));
    const missing = tabsStatus.filter((t) => !t.present).map((t) => t.tab);
    if (missing.length) issues.push(`Missing tabs: ${missing.join(", ")}`);

    const now = Date.now();
    const freshness = {
      weekly: cfg?.last_weekly_at ? Math.round((now - new Date(cfg.last_weekly_at).getTime()) / 3_600_000) : null,
      monthly: cfg?.last_monthly_at ? Math.round((now - new Date(cfg.last_monthly_at).getTime()) / 3_600_000) : null,
      instant: cfg?.last_instant_at ? Math.round((now - new Date(cfg.last_instant_at).getTime()) / 3_600_000) : null,
    };
    if (freshness.weekly !== null && freshness.weekly > 24 * 10) issues.push("Weekly report stale (>10 days)");
    if (freshness.monthly !== null && freshness.monthly > 24 * 40) issues.push("Monthly report stale (>40 days)");

    let generationOk = false;
    let rowCount = 0;
    try {
      const rows = await loadAffiliateRows();
      rowCount = rows.length;
      generationOk = true;
    } catch (e: any) {
      issues.push(`Report generation failed: ${e?.message ?? "error"}`);
    }
    checks.generation = { ok: generationOk, detail: `${rowCount} affiliate rows available` };

    return {
      ok: issues.length === 0,
      issues,
      checks,
      tabs: tabsStatus,
      freshness,
      spreadsheet_url: cfg?.spreadsheet_url ?? null,
      checked_at: new Date().toISOString(),
    };
  });

// ============ EXPORT DATA (for CSV/XLSX download) ============
export const exportAffiliateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ mode: z.enum(["weekly", "monthly", "instant"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const accts = await loadAffiliateRows();

    if (data.mode === "monthly") {
      const owed = accts.filter((a: any) => Number(a.available_balance) > 0);
      const total = owed.reduce((s: number, a: any) => s + Number(a.available_balance), 0);
      const headers = ["Affiliate Code", "Name", "Payout Method", "Available Balance"];
      const rows: (string | number)[][] = owed.map((a: any) => [
        a.code, a.full_name, a.payout_method ?? "—", Number(a.available_balance),
      ]);
      rows.push(["", "", "TOTAL TO PAY", total]);
      return { title: `Monthly Payouts ${new Date().toISOString().slice(0, 7)}`, headers, rows };
    }

    const headers = REPORT_HEADERS;
    const rows: (string | number)[][] = accts.map((a: any) => [
      a.code, a.full_name, a.status, a.tier ?? "", Number(a.total_clicks ?? 0),
      Number(a.total_signups ?? 0), Number(a.total_orders ?? 0), Number(a.total_earnings ?? 0),
      Number(a.available_balance ?? 0), Number(a.pending_balance ?? 0),
      Number(a.lifetime_paid ?? 0), a.created_at?.slice(0, 10) ?? "",
    ]);
    return {
      title: data.mode === "weekly" ? "Weekly Affiliate Report" : "Instant Affiliate Report",
      headers,
      rows,
    };
  });

// ============ TEST WORKFLOW ============
// End-to-end connectivity/permissions test for the Google Sheets workflow.
// Verifies: connector env vars → verify_credentials → spreadsheet exists →
// required tabs → write + read + clear a probe cell → affiliate rows load.
export const testAffiliateReportSheetsWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const started = Date.now();
    const steps: { step: string; ok: boolean; detail?: string }[] = [];
    const push = (step: string, ok: boolean, detail?: string) => steps.push({ step, ok, detail });

    // 1. Env / connector keys
    let headersOk = false;
    try { gatewayHeaders(); headersOk = true; push("Connector keys present", true); }
    catch (e: any) { push("Connector keys present", false, e?.message); }

    // 2. Verify credentials against gateway
    if (headersOk) {
      try {
        const res = await fetch("https://connector-gateway.lovable.dev/api/v1/verify_credentials", {
          method: "POST", headers: gatewayHeaders(),
        });
        const body = await res.json().catch(() => ({}));
        push("Verify credentials", res.ok && body?.outcome !== "failed",
          `outcome=${body?.outcome ?? res.status} ${body?.error ?? ""}`.trim());
      } catch (e: any) { push("Verify credentials", false, e?.message); }
    }

    // 3. Spreadsheet reachable
    let spreadsheetId = ""; let spreadsheetUrl = "";
    if (headersOk) {
      try {
        const r = await ensureSpreadsheet();
        spreadsheetId = r.spreadsheetId; spreadsheetUrl = r.spreadsheetUrl;
        push("Spreadsheet reachable", true, spreadsheetUrl || spreadsheetId);
      } catch (e: any) { push("Spreadsheet reachable", false, e?.message); }
    }

    // 4. Required tabs present
    let tabTitles: string[] = [];
    if (spreadsheetId) {
      try {
        const meta = await sheetsFetch(`/spreadsheets/${spreadsheetId}?fields=sheets.properties`);
        tabTitles = (meta.sheets ?? []).map((s: any) => s.properties?.title).filter(Boolean);
        const missing = REQUIRED_TABS.filter((t) => !tabTitles.includes(t));
        push("Required tabs exist", missing.length === 0,
          missing.length ? `Missing: ${missing.join(", ")}` : tabTitles.join(", "));
      } catch (e: any) { push("Required tabs exist", false, e?.message); }
    }

    // 5. Write + read + clear a probe cell in a dedicated __Test__ tab
    if (spreadsheetId) {
      const probeTab = "__Test__";
      const stamp = new Date().toISOString();
      try {
        if (!tabTitles.includes(probeTab)) {
          await sheetsFetch(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
            method: "POST",
            body: JSON.stringify({ requests: [{ addSheet: { properties: { title: probeTab } } }] }),
          });
        }
        await sheetsFetch(
          `/spreadsheets/${spreadsheetId}/values/${probeTab}!A1?valueInputOption=RAW`,
          { method: "PUT", body: JSON.stringify({ values: [["lovable-test", stamp]] }) },
        );
        const read = await sheetsFetch(`/spreadsheets/${spreadsheetId}/values/${probeTab}!A1:B1`);
        const gotStamp = read?.values?.[0]?.[1];
        const roundTripOk = gotStamp === stamp;
        push("Write + read probe", roundTripOk, roundTripOk ? `round-trip ok (${stamp})` : `expected "${stamp}" got "${gotStamp}"`);
        await sheetsFetch(`/spreadsheets/${spreadsheetId}/values/${probeTab}!A1:B1:clear`, {
          method: "POST", body: JSON.stringify({}),
        });
      } catch (e: any) { push("Write + read probe", false, e?.message); }
    }

    // 6. Affiliate data loads
    try {
      const rows = await loadAffiliateRows();
      push("Affiliate rows load", true, `${rows.length} rows`);
    } catch (e: any) { push("Affiliate rows load", false, e?.message); }

    return {
      ok: steps.every((s) => s.ok),
      steps,
      ms: Date.now() - started,
      spreadsheet_url: spreadsheetUrl || null,
    };
  });

