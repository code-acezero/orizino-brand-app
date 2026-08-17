"use server";

import { hasSupabaseAdminCredentials, supabaseAdmin } from "@/integrations/supabase/client.server";

function adminClient() {
  if (!hasSupabaseAdminCredentials()) {
    throw new Error(
      "Supabase admin credentials are not configured. Add SUPABASE_SERVICE_ROLE_KEY in project Secrets for subscriber imports, exports, and bulk actions.",
    );
  }
  return supabaseAdmin;
}

function csv(v: any): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function listSubscribers(rawInput?: {
  search?: string;
  status?: "all" | "active" | "unsubscribed";
  source?: string;
  limit?: number;
  offset?: number;
}) {
  const data: any = (rawInput as any)?.data || rawInput || {};
  const search = typeof data.search === "string" ? data.search.trim() : "";
  const status = data.status || "all";
  const source = data.source;
  const limit = typeof data.limit === "number" ? Math.min(Math.max(data.limit, 1), 500) : 100;
  const offset = typeof data.offset === "number" ? Math.max(data.offset, 0) : 0;

  const sb = adminClient();
  let q = sb
    .from("email_subscriptions")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) q = q.ilike("email", `%${search}%`);
  if (status === "active") q = q.eq("is_active", true);
  if (status === "unsubscribed") q = q.eq("is_active", false);
  if (source && source !== "all") q = q.eq("source", source);

  const { data: rows, count, error } = await q;
  if (error) throw new Error(error.message);
  return { items: rows ?? [], total: count ?? 0 };
}

export async function importSubscribers(rawInput: {
  entries: Array<{ email: string; name?: string }>;
  tags?: string[];
  source?: string;
}) {
  const data: any = (rawInput as any)?.data || rawInput;
  if (!data?.entries || !Array.isArray(data.entries) || data.entries.length === 0) {
    throw new Error("No subscriber entries provided");
  }

  const sb = adminClient();
  const rows = data.entries.map((e: any) => ({
    email: (e.email || "").toLowerCase().trim(),
    name: e.name?.trim() || null,
    is_active: true,
    source: data.source || "import",
    tags: data.tags ?? [],
  })).filter((r: any) => r.email && r.email.includes("@"));

  const { error, count } = await sb
    .from("email_subscriptions")
    .upsert(rows, { onConflict: "email", ignoreDuplicates: true, count: "exact" });
  if (error) throw new Error(error.message);

  // Auto-sync into marketing_audience_table
  try {
    const { data: setRow } = await sb
      .from("site_settings")
      .select("value")
      .eq("key", "marketing_audience_table")
      .maybeSingle();

    const currentAudience: any[] = Array.isArray(setRow?.value) ? setRow.value : [];
    const audEmails = new Set(currentAudience.map((r: any) => r.email?.toLowerCase()).filter(Boolean));

    const newAudienceRows = rows
      .filter((r: any) => !audEmails.has(r.email))
      .map((r: any, idx: number) => ({
        id: `sub_${Date.now()}_${idx}`,
        name: r.name || "",
        phone: "",
        email: r.email,
        tag: "Newsletter",
      }));

    if (newAudienceRows.length > 0) {
      await sb.from("site_settings").upsert(
        {
          key: "marketing_audience_table",
          value: [...currentAudience, ...newAudienceRows] as any,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
    }
  } catch (audErr) {
    console.warn("Auto-sync to audience table error:", audErr);
  }

  return { inserted: count ?? 0, total: rows.length };
}

export async function exportSubscribers(rawInput?: { ids?: string[] }) {
  const data: any = (rawInput as any)?.data || rawInput || {};
  const sb = adminClient();
  let q = sb.from("email_subscriptions").select("email, name, is_active, source, tags, created_at");
  if (data.ids && data.ids.length) q = q.in("id", data.ids);
  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);

  const header = "email,name,is_active,source,tags,created_at";
  const body = [
    header,
    ...(rows ?? []).map((r) =>
      [r.email, r.name ?? "", r.is_active, r.source ?? "", (r.tags ?? []).join("|"), r.created_at]
        .map(csv)
        .join(","),
    ),
  ].join("\n");

  return { mime: "text/csv", filename: `subscribers-${Date.now()}.csv`, body };
}

export async function bulkUpdateSubscribers(rawInput: {
  ids: string[];
  action: "unsubscribe" | "resubscribe" | "delete" | "add_tag";
  tag?: string;
}) {
  const data: any = (rawInput as any)?.data || rawInput;
  if (!data?.ids || !Array.isArray(data.ids) || data.ids.length === 0) {
    throw new Error("No IDs provided for bulk action");
  }

  const sb = adminClient();
  if (data.action === "delete") {
    await sb.from("email_subscriptions").delete().in("id", data.ids);
  } else if (data.action === "unsubscribe") {
    await sb
      .from("email_subscriptions")
      .update({ is_active: false, unsubscribed_at: new Date().toISOString() })
      .in("id", data.ids);
  } else if (data.action === "resubscribe") {
    await sb
      .from("email_subscriptions")
      .update({ is_active: true, unsubscribed_at: null })
      .in("id", data.ids);
  } else if (data.action === "add_tag" && data.tag) {
    const { data: rows } = await sb
      .from("email_subscriptions")
      .select("id, tags")
      .in("id", data.ids);
    for (const r of rows ?? []) {
      const next = Array.from(new Set([...(r.tags ?? []), data.tag]));
      await sb.from("email_subscriptions").update({ tags: next }).eq("id", r.id);
    }
  }

  return { ok: true };
}
