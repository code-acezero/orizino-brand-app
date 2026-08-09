import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(sb: any, userId: string) {
  const { data } = await sb.rpc("has_any_role", { _user_id: userId, _roles: ["admin", "moderator"] });
  if (!data) throw new Error("Forbidden");
}

/* ─────── Identity analytics ─────── */
export const getIdentityAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      identity_id: z.string().uuid().optional(),
      days: z.number().int().min(1).max(365).default(30),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const sb: any = context.supabase;
    const isAdmin = (await sb.rpc("has_any_role", { _user_id: context.userId, _roles: ["admin", "moderator"] })).data;
    const sinceIso = new Date(Date.now() - data.days * 86400_000).toISOString();

    // Restrict to own identity when not admin
    let identityIds: string[] | null = null;
    if (!isAdmin) {
      const { data: mine } = await sb.from("employee_identities").select("id").eq("user_id", context.userId);
      identityIds = (mine ?? []).map((r: any) => r.id);
      if (data.identity_id && !(identityIds ?? []).includes(data.identity_id)) throw new Error("Forbidden");
    }

    let evQ = sb.from("identity_scan_events").select("id, identity_id, slug, source, created_at").gte("created_at", sinceIso);
    if (data.identity_id) evQ = evQ.eq("identity_id", data.identity_id);
    else if (identityIds) evQ = evQ.in("identity_id", identityIds);
    const { data: events, error } = await evQ.order("created_at", { ascending: false }).limit(5000);
    if (error) throw new Error(error.message);

    // Aggregate by day and by source
    const byDay: Record<string, number> = {};
    const bySource: Record<string, number> = { qr: 0, nfc: 0, share: 0, direct: 0 };
    const bySlug: Record<string, { slug: string; count: number }> = {};
    (events ?? []).forEach((e: any) => {
      const day = e.created_at.slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + 1;
      bySource[e.source] = (bySource[e.source] ?? 0) + 1;
      bySlug[e.slug] = bySlug[e.slug] ?? { slug: e.slug, count: 0 };
      bySlug[e.slug].count += 1;
    });
    const series = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));
    const topSlugs = Object.values(bySlug).sort((a, b) => b.count - a.count).slice(0, 10);

    // Totals from identities
    let idQ = sb.from("employee_identities").select("id, slug, display_name, view_count, qr_scan_count, is_public");
    if (data.identity_id) idQ = idQ.eq("id", data.identity_id);
    else if (identityIds) idQ = idQ.in("id", identityIds);
    const { data: identities } = await idQ;
    const totalViews = (identities ?? []).reduce((s: number, r: any) => s + (r.view_count ?? 0), 0);
    const totalScans = (identities ?? []).reduce((s: number, r: any) => s + Number(r.qr_scan_count ?? 0), 0);

    return { series, bySource, topSlugs, totalViews, totalScans, windowEvents: events?.length ?? 0 };
  });

/* ─────── Identity audit log ─────── */
export const listIdentityAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      identity_id: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(500).default(100),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const sb: any = context.supabase;
    const isAdmin = (await sb.rpc("has_any_role", { _user_id: context.userId, _roles: ["admin", "moderator"] })).data;
    let q = sb.from("identity_audit_log").select("*").order("created_at", { ascending: false }).limit(data.limit);
    if (data.identity_id) q = q.eq("identity_id", data.identity_id);
    else if (!isAdmin) q = q.eq("target_user_id", context.userId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    // Enrich with actor names
    const actorIds = Array.from(new Set((rows ?? []).map((r: any) => r.actor_user_id).filter(Boolean)));
    let profiles: Record<string, string> = {};
    if (actorIds.length) {
      const { data: p } = await sb.from("profiles").select("id, full_name").in("id", actorIds);
      profiles = Object.fromEntries((p ?? []).map((x: any) => [x.id, x.full_name || ""]));
    }
    return (rows ?? []).map((r: any) => ({ ...r, actor_name: profiles[r.actor_user_id] || "System" }));
  });

/* ─────── Profile change requests ─────── */
const ChangeSchema = z.object({
  changes: z.record(z.string(), z.any()),
});

export const submitProfileChangeRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChangeSchema.parse(d))
  .handler(async ({ context, data }) => {
    const sb: any = context.supabase;
    const { data: row, error } = await sb
      .from("profile_change_requests")
      .insert({
        user_id: context.userId,
        requested_by: context.userId,
        changes: data.changes,
        status: "pending",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listProfileChangeRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ status: z.enum(["pending", "approved", "rejected", "all"]).default("pending") }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const sb: any = context.supabase;
    await assertAdmin(sb, context.userId);
    let q = sb.from("profile_change_requests").select("*").order("created_at", { ascending: false });
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const userIds = Array.from(new Set((rows ?? []).flatMap((r: any) => [r.user_id, r.requested_by, r.reviewer_id]).filter(Boolean)));
    let profiles: Record<string, { id: string; full_name: string | null; avatar_url: string | null }> = {};
    if (userIds.length) {
      const { data: p } = await sb.from("profiles").select("id, full_name, avatar_url").in("id", userIds);
      profiles = Object.fromEntries((p ?? []).map((x: any) => [x.id, x]));
    }
    return (rows ?? []).map((r: any) => ({
      ...r,
      user: profiles[r.user_id] ?? null,
      reviewer: r.reviewer_id ? profiles[r.reviewer_id] : null,
    }));
  });

export const reviewProfileChangeRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      decision: z.enum(["approved", "rejected"]),
      note: z.string().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const sb: any = context.supabase;
    await assertAdmin(sb, context.userId);
    const { data: req, error: reqErr } = await sb
      .from("profile_change_requests")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (reqErr || !req) throw new Error(reqErr?.message ?? "Request not found");
    if (req.status !== "pending") throw new Error("Already reviewed");

    if (data.decision === "approved") {
      // Apply the changes to the profile
      const allowed: Record<string, any> = {};
      for (const k of ["full_name", "avatar_url", "phone", "address"]) {
        if (k in (req.changes ?? {})) allowed[k] = req.changes[k];
      }
      allowed.updated_at = new Date().toISOString();
      const { error: upErr } = await sb.from("profiles").update(allowed).eq("id", req.user_id);
      if (upErr) throw new Error(upErr.message);
      // Sync display_name to public identity (auto, per spec)
      if ("full_name" in allowed) {
        await sb.from("employee_identities").update({ display_name: allowed.full_name }).eq("user_id", req.user_id);
      }
    }

    const { data: updated, error } = await sb
      .from("profile_change_requests")
      .update({
        status: data.decision,
        reviewer_id: context.userId,
        reviewer_note: data.note ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return updated;
  });

export const listMyProfileChangeRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb: any = context.supabase;
    const { data, error } = await sb
      .from("profile_change_requests")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
