import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const upsertSiteSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      entries: z.array(z.object({ key: z.string().min(1).max(120), value: z.any() })).min(1).max(200),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const [admin, moderator] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "moderator" }),
    ]);
    if (!admin.data && !moderator.data) throw new Error("Forbidden: staff only");

    const updatedAt = new Date().toISOString();
    const { error } = await context.supabase
      .from("site_settings")
      .upsert(
        data.entries.map((entry) => ({ key: entry.key, value: entry.value, updated_at: updatedAt })),
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true, saved: data.entries.length };
  });

export const sendAdminAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      title: z.string().min(1).max(200),
      message: z.string().max(2000).optional().nullable(),
      link_url: z.string().max(500).optional().nullable(),
      type: z.enum(["announcement", "offer", "update"]),
      priority: z.string().max(40).default("normal"),
      icon: z.string().max(80).optional().nullable(),
      scheduled_at: z.string().optional().nullable(),
      expires_at: z.string().optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) {
      const { data: sections } = await context.supabase.rpc("get_user_sections", { _user_id: context.userId });
      if (!(sections ?? []).some((row: any) => row.section === "seo")) throw new Error("Forbidden: SEO access required");
    }

    const { error } = await context.supabase.from("notifications").insert({ ...data, user_id: null });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAdminAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) {
      const { data: sections } = await context.supabase.rpc("get_user_sections", { _user_id: context.userId });
      if (!(sections ?? []).some((row: any) => row.section === "seo")) throw new Error("Forbidden: SEO access required");
    }

    const { error } = await context.supabase
      .from("notifications")
      .delete()
      .eq("id", data.id)
      .is("user_id", null)
      .in("type", ["announcement", "offer", "update"]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertAdminPopup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid().optional(),
      title: z.string().min(1).max(200),
      message: z.string().max(2000).optional().nullable(),
      image_url: z.string().max(1000).optional().nullable(),
      link_url: z.string().max(500).optional().nullable(),
      link_text: z.string().max(80).optional().nullable(),
      is_active: z.boolean().optional(),
      display_type: z.string().max(50).optional(),
      max_views: z.number().int().optional().nullable(),
      duration_hours: z.number().int().optional().nullable(),
      starts_at: z.string().optional().nullable(),
      ends_at: z.string().optional().nullable(),
      position: z.string().max(50).optional(),
      animation_style: z.string().max(50).optional(),
      trigger_type: z.string().max(50).optional(),
      trigger_value: z.number().int().optional(),
      bg_color: z.string().max(80).optional().nullable(),
      text_color: z.string().max(80).optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) {
      const { data: sections } = await context.supabase.rpc("get_user_sections", { _user_id: context.userId });
      if (!(sections ?? []).some((row: any) => row.section === "seo")) throw new Error("Forbidden: SEO access required");
    }

    const { id, ...rest } = data;
    const cleaned = Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== undefined));
    // starts_at/ends_at are timestamptz columns — Postgres accepts NULL but
    // rejects an empty string with "invalid input syntax for type timestamp
    // with time zone". A datetime-local input that gets cleared sends "" (not
    // null), which is what was breaking saves. Normalize defensively here so
    // this can't recur regardless of what any client sends.
    for (const key of ["starts_at", "ends_at"] as const) {
      if (cleaned[key] === "") cleaned[key] = null;
    }
    const result = id
      ? await context.supabase.from("popups").update(cleaned).eq("id", id)
      : await context.supabase.from("popups").insert(cleaned);
    if (result.error) throw new Error(result.error.message);
    return { ok: true };
  });

export const deleteAdminPopup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) {
      const { data: sections } = await context.supabase.rpc("get_user_sections", { _user_id: context.userId });
      if (!(sections ?? []).some((row: any) => row.section === "seo")) throw new Error("Forbidden: SEO access required");
    }

    const { error } = await context.supabase.from("popups").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });