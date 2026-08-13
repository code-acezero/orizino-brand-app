"use server";

import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hasSupabaseAdminCredentials, supabaseAdmin } from "@/integrations/supabase/client.server";

function adminClient() {
  if (!hasSupabaseAdminCredentials()) {
    throw new Error(
      "Supabase admin credentials are not configured. Add SUPABASE_SERVICE_ROLE_KEY in project Secrets for subscriber imports, exports, and bulk actions.",
    );
  }
  return supabaseAdmin;
}

async function assertStaff(supabase: any, userId: string) {
  const [admin, mod] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" as any }),
    supabase.rpc("has_role", { _user_id: userId, _role: "moderator" as any }),
  ]);
  if (!admin.data && !mod.data) throw new Error("Forbidden");
}

export const listSubscribers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        search: z.string().max(200).optional(),
        status: z.enum(["all", "active", "unsubscribed"]).default("all"),
        source: z.string().max(40).optional(),
        limit: z.number().min(1).max(500).default(100),
        offset: z.number().min(0).default(0),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const sb: any = context.supabase;
    let q = sb
      .from("email_subscriptions")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.search) q = q.ilike("email", `%${data.search.trim()}%`);
    if (data.status === "active") q = q.eq("is_active", true);
    if (data.status === "unsubscribed") q = q.eq("is_active", false);
    if (data.source) q = q.eq("source", data.source);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [], total: count ?? 0 };
  });

export const importSubscribers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        entries: z
          .array(
            z.object({
              email: z.string().email().max(254),
              name: z.string().max(120).optional(),
            }),
          )
          .min(1)
          .max(10000),
        tags: z.array(z.string().max(40)).optional(),
        source: z.string().max(40).default("import"),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const sb = adminClient();
    const rows = data.entries.map((e) => ({
      email: e.email.toLowerCase(),
      name: e.name?.trim() || null,
      is_active: true,
      source: data.source,
      tags: data.tags ?? [],
    }));
    const { error, count } = await sb
      .from("email_subscriptions")
      .upsert(rows, { onConflict: "email", ignoreDuplicates: true, count: "exact" });
    if (error) throw new Error(error.message);
    await sb
      .from("staff_audit_log")
      .insert({
        actor_id: context.userId,
        action: "import_subscribers",
        entity: "subscribers",
        meta: { count: data.entries.length },
      });
    return { inserted: count ?? 0, total: data.entries.length };
  });

export const exportSubscribers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ ids: z.array(z.string().uuid()).optional() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const sb = adminClient();
    let q = sb.from("email_subscriptions").select("email, name, is_active, source, tags, created_at");
    if (data.ids && data.ids.length) q = q.in("id", data.ids);
    const { data: rows } = await q;
    const header = "email,name,is_active,source,tags,created_at";
    const body = [
      header,
      ...(rows ?? []).map((r) =>
        [r.email, r.name ?? "", r.is_active, r.source ?? "", (r.tags ?? []).join("|"), r.created_at]
          .map(csv)
          .join(","),
      ),
    ].join("\n");
    await sb
      .from("staff_audit_log")
      .insert({
        actor_id: context.userId,
        action: "export_subscribers",
        entity: "subscribers",
        meta: { count: rows?.length ?? 0 },
      });
    return { mime: "text/csv", filename: `subscribers-${Date.now()}.csv`, body };
  });

export const bulkUpdateSubscribers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(1).max(10000),
        action: z.enum(["unsubscribe", "resubscribe", "delete", "add_tag"]),
        tag: z.string().max(40).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
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
    await sb
      .from("staff_audit_log")
      .insert({
        actor_id: context.userId,
        action: `bulk_${data.action}`,
        entity: "subscribers",
        meta: { count: data.ids.length },
      });
    return { ok: true };
  });

function csv(v: any): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
// code:4ce0
