"use server";

import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { googleAccessToken, GOOGLE_SCOPES } from "@/integrations/google/service-account";

const rowSchema = z.object({
  id: z.string(),
  name: z.string().default(""),
  phone: z.string().default(""),
  email: z.string().default(""),
  tag: z.string().default(""),
});

/** Extract Google Spreadsheet ID from a sheets URL */
function extractSheetId(url: string): string {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) throw new Error("Invalid Google Sheets URL. Expected format: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/...");
  return m[1];
}

/** Normalize BD phone number to +880... */
function normalizePhone(raw: string): string {
  const clean = (raw || "").replace(/[^\d+]/g, "");
  if (!clean) return "";
  if (clean.startsWith("01") && clean.length === 11) return `+880${clean.slice(1)}`;
  if (clean.startsWith("8801") && clean.length === 13) return `+${clean}`;
  if (!clean.startsWith("+") && clean.length >= 10) return `+${clean}`;
  return clean;
}

const isEmailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email?.trim() || "");
const isPhoneValid = (phone: string) => normalizePhone(phone).length >= 10;

/** Push audience rows to Google Sheet (overwrites from row 2 onward, keeps header) */
export const pushAudienceToSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      sheetUrl: z.string().min(10),
      rows: z.array(rowSchema).max(10000),
    }).parse(input)
  )
  .handler(async ({ data }) => {
    const spreadsheetId = extractSheetId(data.sheetUrl);
    const token = await googleAccessToken(GOOGLE_SCOPES.sheets);

    // Header row + data rows
    const values = [
      ["Name", "Phone", "Email", "Tag"],
      ...data.rows.map((r) => [r.name, r.phone, r.email, r.tag]),
    ];

    // Clear the sheet first (A1:Z)
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:Z10001:clear`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` } }
    );

    // Write new values
    const writeRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ range: "A1", majorDimension: "ROWS", values }),
      }
    );

    if (!writeRes.ok) {
      const err: any = await writeRes.json().catch(() => ({}));
      if (writeRes.status === 403) {
        throw new Error(
          "Permission denied (403). Please add the service account email as an Editor on this Google Sheet: sheets-orz@orizino-integrations.iam.gserviceaccount.com"
        );
      }
      throw new Error(err.error?.message || `Sheets API error ${writeRes.status}`);
    }

    return { written: data.rows.length };
  });

/** Pull CSV from Google Sheet (public read), merge with existing audience rows, and return merged + diff */
export const pullAndMergeSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      sheetUrl: z.string().min(10),
      existingRows: z.array(rowSchema).max(10000),
    }).parse(input)
  )
  .handler(async ({ data }) => {
    let exportUrl = data.sheetUrl.trim();

    // Convert edit URL to CSV export URL
    if (exportUrl.includes("/edit")) {
      exportUrl = exportUrl.replace(/\/edit.*$/, "/export?format=csv");
    } else if (!exportUrl.includes("export?format=csv")) {
      const id = extractSheetId(exportUrl);
      exportUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
    }

    const res = await fetch(exportUrl, { headers: { "User-Agent": "Orizino-Masterpanel/1.0" } });
    if (!res.ok) {
      throw new Error(
        "Could not fetch Google Sheet. Ensure the sheet sharing is set to 'Anyone with the link can view'."
      );
    }

    const csvText = await res.text();
    const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) throw new Error("Google Sheet appears empty.");

    // Detect and skip header
    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes("phone") || firstLine.includes("email") || firstLine.includes("name");
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const sheetRows: Array<{ id: string; name: string; phone: string; email: string; tag: string }> = dataLines
      .map((line, idx) => {
        const parts = line.split(/[,\t]/).map((p) => p.trim().replace(/^["']|["']$/g, ""));
        let name = "";
        let phone = "";
        let email = "";
        let tag = "Imported";

        if (parts.length === 1) {
          if (parts[0].includes("@")) email = parts[0];
          else phone = parts[0];
        } else if (parts.length === 2) {
          if (parts[0].includes("@")) { email = parts[0]; phone = parts[1]; }
          else if (parts[1].includes("@")) { name = parts[0]; email = parts[1]; }
          else { name = parts[0]; phone = parts[1]; }
        } else {
          name = parts[0];
          if (parts[1].includes("@")) { email = parts[1]; phone = parts[2] || ""; }
          else { phone = parts[1]; email = parts[2] || ""; }
          if (parts[3]) tag = parts[3];
        }

        return { id: `sheet_${idx}_${Date.now()}`, name, phone, email, tag };
      })
      .filter((r) => isEmailValid(r.email) || isPhoneValid(r.phone));

    // Merge: deduplicate by email (primary) or phone (fallback)
    const existing = [...data.existingRows];
    let added = 0;
    let unchanged = existing.length;

    for (const sheetRow of sheetRows) {
      const emailMatch = sheetRow.email && existing.find((r) => r.email.toLowerCase() === sheetRow.email.toLowerCase());
      const phoneMatch = !emailMatch && sheetRow.phone && existing.find((r) => normalizePhone(r.phone) === normalizePhone(sheetRow.phone));

      if (!emailMatch && !phoneMatch) {
        existing.push(sheetRow);
        added++;
      }
    }

    return {
      mergedRows: existing,
      sheetCount: sheetRows.length,
      added,
      unchanged,
    };
  });
