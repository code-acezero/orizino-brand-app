import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { googleAccessToken, GOOGLE_SCOPES } from "@/integrations/google/service-account";

function normalizePhone(raw: string): string {
  const clean = (raw || "").replace(/[^\d+]/g, "");
  if (!clean) return "";
  if (clean.startsWith("01") && clean.length === 11) return `+880${clean.slice(1)}`;
  if (clean.startsWith("8801") && clean.length === 13) return `+${clean}`;
  if (!clean.startsWith("+") && clean.length >= 10) return `+${clean}`;
  return clean;
}

function extractSheetId(url: string): string | null {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const pushToSheetsIfConfigured = body.pushToSheetsIfConfigured !== false;
    const pullFromSheetsIfConfigured = body.pullFromSheetsIfConfigured !== false;

    // 1. Fetch Auth Users & Profiles
    const { data: authData } = await (supabaseAdmin as any).auth.admin.listUsers({ perPage: 1000 });
    const authUsers = authData?.users || [];

    const { data: profiles = [] } = await (supabaseAdmin as any).from("profiles").select("*");
    const profilesById = new Map((profiles || []).map((p: any) => [p.id, p]));

    // 2. Fetch Orders for checkout customers
    const { data: orders = [] } = await (supabaseAdmin as any)
      .from("orders")
      .select("id, guest_email, guest_phone, customer_name, shipping_address");

    // 3. Fetch Subscribers
    const { data: subscribers = [] } = await (supabaseAdmin as any).from("email_subscriptions").select("*");

    // 4. Fetch current Audience table & Sheet URL from site_settings
    const { data: audienceSettings } = await (supabaseAdmin as any)
      .from("site_settings")
      .select("value")
      .eq("key", "marketing_audience_table")
      .maybeSingle();

    const existingAudience: any[] = Array.isArray(audienceSettings?.value)
      ? audienceSettings.value
      : [];

    const { data: sheetUrlSettings } = await (supabaseAdmin as any)
      .from("site_settings")
      .select("value")
      .eq("key", "marketing_audience_sheet_url")
      .maybeSingle();

    const sheetUrl = (sheetUrlSettings?.value as string)?.trim() || "";

    // Contact mapping: key -> contact object
    const contactMap = new Map<string, any>();
    const existingSubEmails = new Set<string>(
      (subscribers || []).map((s: any) => s.email?.toLowerCase().trim()).filter(Boolean)
    );

    const getOrInit = (key: string, initial: any) => {
      if (!contactMap.has(key)) {
        contactMap.set(key, {
          id: initial.id || `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: initial.name || "",
          phone: initial.phone || "",
          email: initial.email || "",
          tag: initial.tag || "Customer",
          source: initial.source || "quad_sync",
          is_active: initial.is_active ?? true,
        });
      }
      return contactMap.get(key);
    };

    // A. Seed from existing Marketing Audience Table
    for (const aud of existingAudience) {
      const email = aud.email?.toLowerCase().trim() || "";
      const phone = normalizePhone(aud.phone || "");
      const key = email || phone;
      if (key) {
        getOrInit(key, {
          id: aud.id,
          name: aud.name,
          phone,
          email,
          tag: aud.tag || "Audience",
          source: aud.source || "audience_table",
          is_active: aud.is_active ?? true,
        });
      }
    }

    // B. Reconcile Auth Users & Profiles
    for (const u of authUsers) {
      const email = u.email?.toLowerCase().trim() || "";
      const phone = normalizePhone(u.phone || "");
      const prof: any = profilesById.get(u.id);
      const name = prof?.full_name || u.user_metadata?.full_name || u.user_metadata?.name || "";
      const profPhone = normalizePhone(prof?.phone || "");
      const key = email || phone || profPhone;

      if (key) {
        const c = getOrInit(key, {
          name,
          phone: phone || profPhone,
          email,
          tag: "Customer, Member",
          source: "database",
        });
        if (!c.name && name) c.name = name;
        if (!c.phone && (phone || profPhone)) c.phone = phone || profPhone;
        if (!c.email && email) c.email = email;
        if (!c.tag.includes("Member")) c.tag = `${c.tag}, Member`;
      }
    }

    // C. Reconcile Subscribers
    for (const sub of subscribers) {
      const email = sub.email?.toLowerCase().trim() || "";
      if (email) {
        const c = getOrInit(email, {
          name: sub.name || "",
          email,
          tag: "Newsletter",
          source: sub.source || "newsletter",
          is_active: sub.is_active,
        });
        if (!c.name && sub.name) c.name = sub.name;
        if (!c.tag.includes("Newsletter")) c.tag = `${c.tag}, Newsletter`;
        c.is_active = sub.is_active;
      }
    }

    // D. Reconcile Orders
    for (const o of orders) {
      const email = (o.guest_email || o.shipping_address?.email || "")?.toLowerCase().trim();
      const phone = normalizePhone(o.guest_phone || o.shipping_address?.phone || "");
      const name = o.customer_name || o.shipping_address?.full_name || "";
      const key = email || phone;

      if (key) {
        const c = getOrInit(key, {
          name,
          phone,
          email,
          tag: "Buyer",
          source: "checkout",
        });
        if (!c.name && name) c.name = name;
        if (!c.phone && phone) c.phone = phone;
        if (!c.email && email) c.email = email;
        if (!c.tag.includes("Buyer")) c.tag = `${c.tag}, Buyer`;
      }
    }

    // E. Pull from Google Sheets if configured
    let sheetsCount = 0;
    if (sheetUrl && pullFromSheetsIfConfigured) {
      try {
        const spreadsheetId = extractSheetId(sheetUrl);
        if (spreadsheetId) {
          const token = await googleAccessToken(GOOGLE_SCOPES.sheets);
          const res = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:Z`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (res.ok) {
            const data = await res.json();
            const rows: string[][] = data.values || [];
            if (rows.length > 1) {
              const headers = rows[0].map((h) => (h || "").toLowerCase().trim());
              const nameIdx = headers.findIndex((h) => h.includes("name"));
              const phoneIdx = headers.findIndex((h) => h.includes("phone") || h.includes("mobile") || h.includes("contact"));
              const emailIdx = headers.findIndex((h) => h.includes("email") || h.includes("mail"));
              const tagIdx = headers.findIndex((h) => h.includes("tag") || h.includes("type") || h.includes("segment"));

              for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const name = nameIdx >= 0 ? (row[nameIdx] || "").trim() : "";
                const phone = phoneIdx >= 0 ? (row[phoneIdx] || "").trim() : "";
                const email = emailIdx >= 0 ? (row[emailIdx] || "").trim() : "";
                const tag = tagIdx >= 0 ? (row[tagIdx] || "").trim() : "";

                const cleanEmail = email.toLowerCase();
                const cleanPhone = normalizePhone(phone);
                const key = cleanEmail || cleanPhone;
                if (!key) continue;

                sheetsCount++;
                const c = getOrInit(key, { name, phone: cleanPhone, email: cleanEmail, tag: tag || "Sheets" });
                if (!c.name && name) c.name = name;
                if (!c.phone && cleanPhone) c.phone = cleanPhone;
                if (!c.email && cleanEmail) c.email = cleanEmail;
                if (tag && !c.tag.includes(tag)) c.tag = `${c.tag}, ${tag}`;
              }
            }
          }
        }
      } catch (sheetErr) {
        console.warn("Could not pull from sheet:", sheetErr);
      }
    }

    // Build unified contact list
    const unifiedList = Array.from(contactMap.values());

    // 6. Save unified list back to site_settings.marketing_audience_table
    await (supabaseAdmin as any).from("site_settings").upsert(
      {
        key: "marketing_audience_table",
        value: unifiedList,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    // 7. Back-populate missing subscribers in email_subscriptions
    const newSubscribersToInsert: any[] = [];
    for (const c of unifiedList) {
      if (c.email && !existingSubEmails.has(c.email)) {
        newSubscribersToInsert.push({
          email: c.email,
          name: c.name || null,
          is_active: true,
          source: "quad_sync",
          tags: ["Newsletter", "Synced"],
          created_at: new Date().toISOString(),
        });
        existingSubEmails.add(c.email);
      }
    }

    if (newSubscribersToInsert.length > 0) {
      await (supabaseAdmin as any).from("email_subscriptions").upsert(newSubscribersToInsert, { onConflict: "email" });
    }

    // 8. Push to Google Sheets if configured
    let sheetsPushed = false;
    if (sheetUrl && pushToSheetsIfConfigured) {
      try {
        const spreadsheetId = extractSheetId(sheetUrl);
        if (spreadsheetId) {
          const token = await googleAccessToken(GOOGLE_SCOPES.sheets);
          const values = [
            ["Name", "Phone", "Email", "Tags", "Status", "Last Synced"],
            ...unifiedList.map((r) => [
              r.name,
              r.phone,
              r.email,
              r.tag,
              r.is_active !== false ? "Active" : "Unsubscribed",
              new Date().toLocaleDateString("en-GB"),
            ]),
          ];

          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:Z10000:clear`,
            { method: "POST", headers: { Authorization: `Bearer ${token}` } }
          );

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
          if (writeRes.ok) {
            sheetsPushed = true;
          }
        }
      } catch (pushErr) {
        console.warn("Failed to push to Google Sheet:", pushErr);
      }
    }

    return NextResponse.json({
      ok: true,
      totalUnified: unifiedList.length,
      subscribersCount: subscribers.length + newSubscribersToInsert.length,
      databaseUsersCount: authUsers.length,
      ordersCount: orders.length,
      audienceCount: unifiedList.length,
      sheetsPushed,
      sheetsCount,
      newSubscribersAdded: newSubscribersToInsert.length,
      newAudienceAdded: unifiedList.length - existingAudience.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Quad-Sync execution error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Quad-Sync failed",
      },
      { status: 500 }
    );
  }
}
