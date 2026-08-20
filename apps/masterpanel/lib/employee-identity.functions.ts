"use server";

import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const IdentityUpdateSchema = z.object({
  display_name: z.string().min(1).max(120).nullable().optional(),
  title: z.string().max(120).nullable().optional(),
  department: z.string().max(120).nullable().optional(),
  bio: z.string().max(4000).nullable().optional(),
  pronouns: z.string().max(40).nullable().optional(),
  avatar_url: z.string().url().max(2000).nullable().optional(),
  cover_url: z.string().url().max(2000).nullable().optional(),
  accent_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
  email_public: z.string().email().nullable().optional().or(z.literal("")),
  phone_public: z.string().max(40).nullable().optional(),
  location: z.string().max(120).nullable().optional(),
  timezone: z.string().max(80).nullable().optional(),
  socials: z.record(z.string(), z.string().max(500)).optional(),
  skills: z.array(z.string().max(60)).max(30).optional(),
  languages: z.array(z.string().max(40)).max(20).optional(),
  is_public: z.boolean().optional(),
  show_email: z.boolean().optional(),
  show_phone: z.boolean().optional(),
  show_socials: z.boolean().optional(),
  allow_indexing: z.boolean().optional(),
  slug: z
    .string()
    .regex(/^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/, "Letters, digits, hyphens only")
    .min(3)
    .max(60)
    .optional(),
  layout_preset: z.string().max(40).optional(),
  theme_preset: z.string().max(60).optional(),
});

async function ensureIdentity(sb: any, userId: string) {
  if (!userId || typeof userId !== "string" || !userId.includes("-")) return null;
  const { data } = await sb.from("employee_identities").select("*").eq("user_id", userId).maybeSingle();
  if (data) return data;
  // Try to create one on demand (for staff who don't yet have an entry)
  const { data: prof } = await sb.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  const firstName = (prof?.full_name || "staff").trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, "") || "staff";
  let slug = `${firstName}-${userId.slice(0, 4)}`;
  const { data: created, error } = await sb
    .from("employee_identities")
    .insert({ user_id: userId, slug, display_name: prof?.full_name ?? null })
    .select("*")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") {
      const fallbackSlug = `${firstName}-${Math.random().toString(36).slice(2, 6)}`;
      const { data: fallbackCreated } = await sb
        .from("employee_identities")
        .insert({ user_id: userId, slug: fallbackSlug, display_name: prof?.full_name ?? null })
        .select("*")
        .maybeSingle();
      if (fallbackCreated) return fallbackCreated;
    }
    const { data: fallback } = await sb.from("employee_identities").select("*").eq("user_id", userId).maybeSingle();
    return fallback || null;
  }
  return created;
}

export const getMyIdentity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb: any = context.supabase;
    if (!context.userId) return null;
    return ensureIdentity(sb, context.userId);
  });

export const updateMyIdentity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdentityUpdateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const sb: any = context.supabase;
    if (!context.userId) throw new Error("Unauthorized");
    const existing = await ensureIdentity(sb, context.userId);
    // Slug uniqueness pre-check for a nicer error
    if (data.slug && existing && data.slug !== existing.slug) {
      const { data: taken } = await sb
        .from("employee_identities")
        .select("id")
        .eq("slug", data.slug)
        .neq("user_id", context.userId)
        .maybeSingle();
      if (taken) throw new Error("That slug is already taken");
    }
    const payload: any = { ...data };
    if (payload.email_public === "") payload.email_public = null;
    const { data: updated, error } = await sb
      .from("employee_identities")
      .update(payload)
      .eq("user_id", context.userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return updated;
  });

export const adminListIdentities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb: any = context.supabase;
    const { data: role } = await sb.rpc("has_any_role", { _user_id: context.userId, _roles: ["admin", "moderator"] });
    if (!role) throw new Error("Forbidden");
    const { data, error } = await sb
      .from("employee_identities")
      .select("id, user_id, employee_code, slug, display_name, title, department, avatar_url, is_public, published_at, view_count, updated_at, designation_id, designations(title)")
      .order("employee_code", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminUpsertIdentityForUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        slug: z
          .string()
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
          .min(3)
          .max(60)
          .optional(),
        title: z.string().max(120).nullable().optional(),
        department: z.string().max(120).nullable().optional(),
        is_public: z.boolean().optional(),
      })
      .parse(d)
  )
  .handler(async ({ context, data }) => {
    const sb: any = context.supabase;
    const { data: role } = await sb.rpc("has_any_role", { _user_id: context.userId, _roles: ["admin", "moderator"] });
    if (!role) throw new Error("Forbidden");
    const existing = await ensureIdentity(sb, data.user_id);
    const { data: updated, error } = await sb
      .from("employee_identities")
      .update({
        slug: data.slug || existing.slug,
        title: data.title ?? existing.title,
        department: data.department ?? existing.department,
        is_public: data.is_public ?? existing.is_public,
      })
      .eq("user_id", data.user_id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return updated;
  });

export const adminRegenerateEmployeeCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ user_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const sb: any = context.supabase;
    const { data: role } = await sb.rpc("has_any_role", { _user_id: context.userId, _roles: ["admin"] });
    if (!role) throw new Error("Forbidden");
    const { data: next } = await sb.rpc("mint_employee_code");
    const { data: updated, error } = await sb
      .from("employee_identities")
      .update({ employee_code: next })
      .eq("user_id", data.user_id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return updated;
  });

export const getUserIdentityAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ targetUserId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb: any = context.supabase;
    const { data: role } = await sb.rpc("has_any_role", { _user_id: context.userId, _roles: ["admin", "moderator"] });
    if (!role) throw new Error("Forbidden");
    return ensureIdentity(sb, data.targetUserId);
  });

export const updateUserIdentityAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ targetUserId: z.string().uuid(), identityData: IdentityUpdateSchema }).parse(d))
  .handler(async ({ context, data }) => {
    const sb: any = context.supabase;
    const { data: role } = await sb.rpc("has_any_role", { _user_id: context.userId, _roles: ["admin", "moderator"] });
    if (!role) throw new Error("Forbidden");
    const existing = await ensureIdentity(sb, data.targetUserId);
    if (data.identityData.slug && existing && data.identityData.slug !== existing.slug) {
      const { data: taken } = await sb
        .from("employee_identities")
        .select("id")
        .eq("slug", data.identityData.slug)
        .neq("user_id", data.targetUserId)
        .maybeSingle();
      if (taken) throw new Error("That slug is already taken");
    }
    const payload: any = { ...data.identityData };
    if (payload.email_public === "") payload.email_public = null;
    const { data: updated, error } = await sb
      .from("employee_identities")
      .update(payload)
      .eq("user_id", data.targetUserId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return updated;
  });
