"use server";

import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Mirrors the RLS policy on `designations`/`employee_identities`: a master
// admin, or any staff member granted the "employees" section, can manage
// designations and assign them to staff. This check is a fast, friendly
// error for the UI — Postgres RLS is still the real enforcement boundary.
async function assertDesignationManager(supabase: any, userId: string) {
  const { data: isMaster } = await supabase.rpc("is_master_admin", { _user_id: userId });
  if (isMaster) return;
  const { data: access } = await supabase
    .from("staff_section_access")
    .select("user_id")
    .eq("user_id", userId)
    .eq("section", "employees")
    .maybeSingle();
  if (!access) throw new Error("Forbidden: master admins or HR (Employees access) only");
}

async function audit(supabase: any, actorId: string, action: string, entityId: string | null, meta?: Record<string, unknown>) {
  try {
    await supabase.from("staff_audit_log").insert({ actor_id: actorId, action, entity: "designations", entity_id: entityId, meta: meta ?? null });
  } catch {
    // Best-effort logging only; never block the primary action on it.
  }
}

export const listDesignations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("designations")
      .select("id, title, description, sort_order, created_at")
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createDesignation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      title: z.string().trim().min(2).max(80),
      description: z.string().trim().max(300).optional().nullable(),
      sortOrder: z.number().int().min(0).max(9999).default(0),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    await assertDesignationManager(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("designations")
      .insert({ title: data.title, description: data.description ?? null, sort_order: data.sortOrder, created_by: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message.includes("duplicate") ? "A designation with this title already exists." : error.message);
    await audit(context.supabase, context.userId, "create_designation", row.id, { title: data.title });
    return row;
  });

export const updateDesignation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      title: z.string().trim().min(2).max(80),
      description: z.string().trim().max(300).optional().nullable(),
      sortOrder: z.number().int().min(0).max(9999).default(0),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    await assertDesignationManager(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("designations")
      .update({ title: data.title, description: data.description ?? null, sort_order: data.sortOrder })
      .eq("id", data.id);
    if (error) throw new Error(error.message.includes("duplicate") ? "A designation with this title already exists." : error.message);
    await audit(context.supabase, context.userId, "update_designation", data.id, { title: data.title });
    return { ok: true };
  });

export const deleteDesignation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertDesignationManager(context.supabase, context.userId);
    const { error } = await context.supabase.from("designations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context.supabase, context.userId, "delete_designation", data.id);
    return { ok: true };
  });

// Applies a designation to a staff member's employee identity — this is
// what makes the title show up on that person's public employee ID.
export const assignDesignation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      userId: z.string().uuid(),
      designationId: z.string().uuid().nullable(),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    await assertDesignationManager(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("employee_identities")
      .update({ designation_id: data.designationId })
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    await audit(context.supabase, context.userId, "assign_designation", data.userId, { designationId: data.designationId });
    return { ok: true };
  });
