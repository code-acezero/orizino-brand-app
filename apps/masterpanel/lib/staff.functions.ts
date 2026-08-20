"use server";

import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hasSupabaseAdminCredentials, supabaseAdmin } from "@/integrations/supabase/client.server";

import { STAFF_ROLES, ROLE_LABELS, ROLE_COLORS, type StaffRole } from "./staff.constants";
export type { StaffRole };

function adminClient() {
  if (!hasSupabaseAdminCredentials()) {
    throw new Error("Supabase admin credentials are not configured. Add SUPABASE_SERVICE_ROLE_KEY in project Secrets to manage staff by email.");
  }
  return supabaseAdmin;
}

export async function assertAdmin(supabaseClient: any, userId: string) {
  if (hasSupabaseAdminCredentials()) return;
  if (!userId) throw new Error("Unauthorized: authentication required");
  const sb = supabaseClient;
  const { data } = await sb.rpc("has_role", { _user_id: userId, _role: "admin" as any });
  if (!data) {
    const { data: roleCheck } = await sb
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "master_admin"])
      .maybeSingle();
    if (!roleCheck) {
      throw new Error("Forbidden: admins only");
    }
  }
}

export async function assertMasterAdmin(supabaseClient: any, userId: string) {
  if (hasSupabaseAdminCredentials()) return;
  if (!userId) throw new Error("Unauthorized: authentication required");
  const sb = supabaseClient;
  const { data } = await sb.rpc("has_role", { _user_id: userId, _role: "master_admin" as any });
  if (!data) throw new Error("Forbidden: master admins only");
}

export async function auditStaffAction(
  supabase: any,
  actorId: string,
  action: string,
  entity: string,
  entityId?: string | null,
  meta?: Record<string, unknown>
) {
  try {
    await supabase.from("staff_audit_log").insert({
      actor_id: actorId,
      action,
      entity,
      entity_id: entityId ?? null,
      meta: (meta ?? {}) as any,
    });
  } catch {
    // Non-blocking best-effort logging
  }
}

export interface StaffMemberDetail {
  user_id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  roles: StaffRole[];
  designation_id?: string | null;
  designation_title?: string | null;
  employee_code?: string;
  slug?: string;
  is_public?: boolean;
  status?: "active" | "suspended" | "fired";
  status_reason?: string | null;
  suspended_at?: string | null;
  fired_at?: string | null;
  reinstated_at?: string | null;
  department?: string | null;
  title?: string | null;
  bio?: string | null;
  show_email?: boolean;
  show_phone?: boolean;
  show_socials?: boolean;
  allow_indexing?: boolean;
  teams: { id: string; name: string; color: string }[];
  direct_sections: string[];
  team_sections: string[];
  effective_sections: string[];
  created_at?: string;
  last_sign_in_at?: string;
}

export async function getStaffActorContext(sb: any, userId: string) {
  const { data: userRoles } = await sb.from("user_roles").select("role").eq("user_id", userId);
  const roles: string[] = (userRoles ?? []).map((r: any) => r.role);
  const isMasterAdmin = roles.includes("master_admin");
  const isAdmin = isMasterAdmin || roles.includes("admin");

  const { data: identity } = await sb
    .from("employee_identities")
    .select("*, designations(title)")
    .eq("user_id", userId)
    .maybeSingle();

  const designationTitle = (identity?.designations?.title || identity?.title || "").toLowerCase();

  const { data: teamMemberships } = await sb
    .from("team_members")
    .select("teams(name)")
    .eq("user_id", userId);

  const teamNames = (teamMemberships ?? []).map((tm: any) => (tm.teams?.name || "").toLowerCase());
  const isHRTeamMember = teamNames.some((n: string) => n.includes("hr") || n.includes("human resource"));

  const isHRLead =
    isMasterAdmin ||
    isAdmin ||
    designationTitle.includes("hr manager") ||
    designationTitle.includes("hr lead") ||
    designationTitle.includes("general manager") ||
    designationTitle.includes("chairman") ||
    designationTitle.includes("ceo") ||
    designationTitle.includes("coo") ||
    (isHRTeamMember && (roles.includes("manager") || designationTitle.includes("manager") || designationTitle.includes("lead")));

  const isHRStaff = isHRLead || isHRTeamMember || roles.includes("moderator") || roles.includes("support");

  return { isMasterAdmin, isAdmin, isHRLead, isHRStaff, roles, identity, designationTitle };
}

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffMemberDetail[]> => {
    await assertAdmin(context.supabase, context.userId);
    const sb: any = hasSupabaseAdminCredentials() ? supabaseAdmin : context.supabase;

    // Fetch user roles
    const { data: roles, error: rolesError } = await sb
      .from("user_roles")
      .select("user_id, role")
      .in("role", STAFF_ROLES as unknown as string[]);
    if (rolesError) throw new Error(rolesError.message);

    const ids: string[] = Array.from(new Set((roles ?? []).map((r: any) => String(r.user_id))));
    if (ids.length === 0) return [];

    // Parallel fetch related data
    const [profilesRes, directAccessRes, teamMembersRes, teamsRes, teamAccessRes, identitiesRes, designationsRes] = await Promise.all([
      sb.from("profiles").select("id, full_name, avatar_url, phone, created_at").in("id", ids),
      sb.from("staff_section_access").select("user_id, section, preset_id").in("user_id", ids),
      sb.from("team_members").select("team_id, user_id").in("user_id", ids),
      sb.from("teams").select("id, name, color"),
      sb.from("team_section_access").select("team_id, section"),
      sb.from("employee_identities").select("*").in("user_id", ids),
      sb.from("designations").select("id, title"),
    ]);

    const profilesMap = new Map<string, any>((profilesRes.data ?? []).map((p: any) => [p.id, p]));
    const designationsMap = new Map<string, string>((designationsRes.data ?? []).map((d: any) => [d.id, d.title]));
    const identitiesMap = new Map<string, any>((identitiesRes.data ?? []).map((i: any) => [i.user_id, i]));
    const teamsMap = new Map<string, any>((teamsRes.data ?? []).map((t: any) => [t.id, t]));

    // Map emails if admin credentials available
    const emailsMap: Record<string, { email?: string; last_sign_in_at?: string }> = {};
    if (hasSupabaseAdminCredentials()) {
      try {
        const { data: list } = await (adminClient() as any).auth.admin.listUsers({ page: 1, perPage: 1000 });
        list?.users?.forEach((u: any) => {
          if (ids.includes(u.id)) {
            emailsMap[u.id] = { email: u.email ?? "", last_sign_in_at: u.last_sign_in_at };
          }
        });
      } catch {
        // Fallback gracefully
      }
    }

    // Compute team sections per team
    const teamSectionsMap = new Map<string, string[]>();
    (teamAccessRes.data ?? []).forEach((ta: any) => {
      if (!teamSectionsMap.has(ta.team_id)) teamSectionsMap.set(ta.team_id, []);
      teamSectionsMap.get(ta.team_id)!.push(ta.section);
    });

    // Group by user
    const byUser: Record<string, StaffMemberDetail> = {};

    for (const id of ids) {
      const profile = profilesMap.get(id);
      const identity = identitiesMap.get(id);
      const designationTitle = identity?.designation_id ? designationsMap.get(identity.designation_id) : null;
      const authInfo = emailsMap[id] ?? {};

      // Direct sections
      const directSecs = (directAccessRes.data ?? [])
        .filter((a: any) => a.user_id === id)
        .map((a: any) => a.section as string);

      // Teams for this user
      const userTeamMemberships = (teamMembersRes.data ?? []).filter((tm: any) => tm.user_id === id);
      const userTeams = userTeamMemberships
        .map((tm: any) => teamsMap.get(tm.team_id))
        .filter(Boolean)
        .map((t: any) => ({ id: t.id, name: t.name, color: t.color || "#6366f1" }));

      // Team sections inherited
      const teamSecsSet = new Set<string>();
      for (const tm of userTeamMemberships) {
        const secs = teamSectionsMap.get(tm.team_id) ?? [];
        secs.forEach((s) => teamSecsSet.add(s));
      }
      const teamSecs = Array.from(teamSecsSet);

      byUser[id] = {
        user_id: id,
        email: authInfo.email || undefined,
        full_name: identity?.display_name || profile?.full_name || undefined,
        avatar_url: identity?.avatar_url || profile?.avatar_url || undefined,
        phone: profile?.phone || undefined,
        roles: [],
        designation_id: identity?.designation_id ?? null,
        designation_title: designationTitle || undefined,
        employee_code: identity?.employee_code || undefined,
        slug: identity?.slug || undefined,
        is_public: identity?.is_public ?? true,
        status: (identity?.status as any) || "active",
        status_reason: identity?.status_reason || undefined,
        suspended_at: identity?.suspended_at || undefined,
        fired_at: identity?.fired_at || undefined,
        reinstated_at: identity?.reinstated_at || undefined,
        department: identity?.department || undefined,
        title: identity?.title || undefined,
        bio: identity?.bio || undefined,
        show_email: identity?.show_email ?? true,
        show_phone: identity?.show_phone ?? true,
        show_socials: identity?.show_socials ?? true,
        allow_indexing: identity?.allow_indexing ?? true,
        teams: userTeams,
        direct_sections: directSecs,
        team_sections: teamSecs,
        effective_sections: [],
        created_at: profile?.created_at,
        last_sign_in_at: authInfo.last_sign_in_at,
      };
    }

    // Attach roles and compute effective permissions
    (roles ?? []).forEach((r: any) => {
      if (byUser[r.user_id]) {
        byUser[r.user_id].roles.push(r.role as StaffRole);
      }
    });

    const ALL_SECTIONS = [
      "products", "orders", "offline_orders", "customers", "affiliate",
      "seo", "storefront_ui", "portfolio", "ai", "analytics", "employees", "settings"
    ];

    Object.values(byUser).forEach((member) => {
      const isAdmin = member.roles.includes("admin") || member.roles.includes("master_admin");
      if (isAdmin) {
        member.effective_sections = ALL_SECTIONS;
      } else {
        const combined = new Set([...member.direct_sections, ...member.team_sections]);
        member.effective_sections = Array.from(combined);
      }
    });

    return Object.values(byUser).sort((a, b) =>
      (a.full_name || a.email || a.user_id).localeCompare(b.full_name || b.email || b.user_id)
    );
  });

async function resolveDefaultTeamId(sb: any, role: string, designationId?: string | null): Promise<string | null> {
  let designationTitle = "";
  if (designationId) {
    const { data: des } = await sb.from("designations").select("title").eq("id", designationId).maybeSingle();
    designationTitle = (des?.title || "").toLowerCase();
  }
  const roleLower = (role || "").toLowerCase();

  const { data: allTeams } = await sb.from("teams").select("id, name");
  if (!allTeams || allTeams.length === 0) return null;

  const findTeam = (nameQuery: string) => allTeams.find((t: any) => t.name.toLowerCase().includes(nameQuery.toLowerCase()))?.id;

  // 1. HR
  if (designationTitle.includes("hr") || designationTitle.includes("human resource")) {
    return findTeam("human resources") || findTeam("hr") || null;
  }

  // 2. Executive C-Suite
  if (
    roleLower === "admin" ||
    roleLower === "master_admin" ||
    designationTitle.includes("ceo") ||
    designationTitle.includes("coo") ||
    designationTitle.includes("cmo") ||
    designationTitle.includes("cto") ||
    designationTitle.includes("cfo") ||
    designationTitle.includes("gm") ||
    designationTitle.includes("general manager") ||
    designationTitle.includes("chairman") ||
    designationTitle.includes("director")
  ) {
    return findTeam("executive") || null;
  }

  // 3. Marketing & Growth
  if (roleLower === "marketing" || designationTitle.includes("marketing") || designationTitle.includes("seo") || designationTitle.includes("brand")) {
    return findTeam("marketing") || null;
  }

  // 4. Support & Customer
  if (roleLower === "support" || designationTitle.includes("support") || designationTitle.includes("customer")) {
    return findTeam("customer") || findTeam("support") || null;
  }

  // 5. Commerce / Sales Operations
  if (designationTitle.includes("sales") || designationTitle.includes("commerce") || designationTitle.includes("operation")) {
    return findTeam("commerce") || findTeam("sales") || null;
  }

  // 6. Engineering & IT
  if (roleLower === "maintainer" || designationTitle.includes("engineer") || designationTitle.includes("developer") || designationTitle.includes("it")) {
    return findTeam("engineering") || findTeam("it") || null;
  }

  return null;
}

export const grantStaffRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      email: z.string().email(),
      role: z.enum(STAFF_ROLES),
      designationId: z.string().uuid().optional().nullable(),
      teamIds: z.array(z.string().uuid()).optional(),
      sections: z.array(z.string()).optional(),
      presetId: z.string().uuid().optional().nullable(),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    if (data.role === "master_admin") {
      await assertMasterAdmin(context.supabase, context.userId);
    } else {
      await assertAdmin(context.supabase, context.userId);
    }

    const sb: any = adminClient();

    // Find registered user by email
    const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const targetUser = list?.users?.find((u: any) => u.email?.toLowerCase() === data.email.toLowerCase());
    if (!targetUser) throw new Error("User not found. They must register an account first with this email.");

    // Grant base role
    const { error: roleError } = await sb
      .from("user_roles")
      .upsert({ user_id: targetUser.id, role: data.role }, { onConflict: "user_id,role" });
    if (roleError) throw new Error(roleError.message);

    // Optional: Assign designation via employee_identities
    if (data.designationId) {
      await sb
        .from("employee_identities")
        .upsert(
          { user_id: targetUser.id, designation_id: data.designationId },
          { onConflict: "user_id" }
        );
    }

    // Auto-resolve matching corporate default team
    const defaultTeamId = await resolveDefaultTeamId(sb, data.role, data.designationId);
    const finalTeamIds = new Set(data.teamIds || []);
    if (defaultTeamId) {
      finalTeamIds.add(defaultTeamId);
    }

    // Assign initial teams
    if (finalTeamIds.size > 0) {
      const teamRows = Array.from(finalTeamIds).map((tId) => ({
        team_id: tId,
        user_id: targetUser.id,
        added_by: context.userId,
      }));
      await sb.from("team_members").upsert(teamRows, { onConflict: "team_id,user_id" });
    }

    // Optional: Assign initial section grants
    if (data.sections && data.sections.length > 0) {
      const sectionRows = data.sections.map((sec) => ({
        user_id: targetUser.id,
        section: sec,
        preset_id: data.presetId ?? null,
        granted_by: context.userId,
      }));
      await sb.from("staff_section_access").insert(sectionRows);
    }

    await auditStaffAction(context.supabase, context.userId, "grant_role", "user_roles", targetUser.id, {
      role: data.role,
      email: data.email,
      designation_id: data.designationId,
      team_ids: Array.from(finalTeamIds),
      sections: data.sections,
    });

    return { ok: true, userId: targetUser.id };
  });

export const revokeStaffRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid(), role: z.enum(STAFF_ROLES) }).parse(input))
  .handler(async ({ context, data }) => {
    if (data.role === "master_admin") {
      await assertMasterAdmin(context.supabase, context.userId);
      const sb0: any = context.supabase;
      const { count } = await sb0
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "master_admin");
      if ((count ?? 0) <= 1) throw new Error("At least one Master Admin must remain to protect system access.");
    } else {
      await assertAdmin(context.supabase, context.userId);
    }

    const sb: any = adminClient();
    await sb.from("user_roles").delete().eq("user_id", data.userId).eq("role", data.role);
    await auditStaffAction(context.supabase, context.userId, "revoke_role", "user_roles", data.userId, {
      role: data.role,
    });

    return { ok: true };
  });

export const setStaffSections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      userId: z.string().uuid(),
      sections: z.array(z.string()),
      presetId: z.string().uuid().optional().nullable(),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb: any = context.supabase;

    // Delete existing direct grants
    await sb.from("staff_section_access").delete().eq("user_id", data.userId);

    // Insert new direct grants
    if (data.sections.length > 0) {
      const rows = data.sections.map((section) => ({
        user_id: data.userId,
        section,
        preset_id: data.presetId ?? null,
        granted_by: context.userId,
      }));
      const { error } = await sb.from("staff_section_access").insert(rows);
      if (error) throw new Error(error.message);
    }

    await auditStaffAction(context.supabase, context.userId, "update_section_access", "staff_section_access", data.userId, {
      sections: data.sections,
      preset_id: data.presetId,
    });

    return { ok: true };
  });

export const assignStaffDesignation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      userId: z.string().uuid(),
      designationId: z.string().uuid().optional().nullable(),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb: any = context.supabase;

    await sb
      .from("employee_identities")
      .upsert(
        { user_id: data.userId, designation_id: data.designationId ?? null },
        { onConflict: "user_id" }
      );

    await auditStaffAction(context.supabase, context.userId, "assign_designation", "employee_identities", data.userId, {
      designation_id: data.designationId,
    });

    return { ok: true };
  });

export const setStaffStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      userId: z.string().uuid(),
      status: z.enum(["active", "suspended", "fired"]),
      reason: z.string().max(500).optional(),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const actorCtx = await getStaffActorContext(context.supabase, context.userId);
    if (!actorCtx.isHRLead && !actorCtx.isAdmin) {
      throw new Error("Only HR Leaders and Admins can alter staff status (suspend, fire, or reinstate).");
    }

    const sb: any = hasSupabaseAdminCredentials() ? supabaseAdmin : context.supabase;
    const now = new Date().toISOString();

    const updates: any = {
      status: data.status,
      status_reason: data.reason || null,
      updated_at: now,
    };

    if (data.status === "suspended") {
      updates.suspended_at = now;
    } else if (data.status === "fired") {
      updates.fired_at = now;
    } else if (data.status === "active") {
      updates.reinstated_at = now;
      updates.status_reason = null;
    }

    const { error } = await sb
      .from("employee_identities")
      .update(updates)
      .eq("user_id", data.userId);

    if (error) throw new Error(error.message);

    await auditStaffAction(context.supabase, context.userId, `set_status_${data.status}`, "employee_identities", data.userId, {
      status: data.status,
      reason: data.reason,
    });

    return { success: true, status: data.status };
  });

export const submitStaffChangeRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      targetUserId: z.string().uuid(),
      requestType: z.enum(["staff_self_request", "hr_propose_edit", "hr_propose_new_staff", "status_change"]),
      changes: z.record(z.string(), z.any()),
      note: z.string().min(2).max(1000),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    const sb: any = hasSupabaseAdminCredentials() ? supabaseAdmin : context.supabase;

    const { data: row, error } = await sb
      .from("profile_change_requests")
      .insert({
        user_id: data.targetUserId,
        requested_by: context.userId,
        request_type: data.requestType,
        changes: data.changes,
        note: data.note,
        status: "pending",
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await auditStaffAction(context.supabase, context.userId, "submit_change_request", "profile_change_requests", row.id, {
      target_user_id: data.targetUserId,
      request_type: data.requestType,
    });

    return row;
  });

export const listStaffChangeRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      status: z.enum(["pending", "approved", "rejected", "all"]).default("pending"),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb: any = hasSupabaseAdminCredentials() ? supabaseAdmin : context.supabase;

    let q = sb.from("profile_change_requests").select("*").order("created_at", { ascending: false });
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const userIds = Array.from(
      new Set((rows ?? []).flatMap((r: any) => [r.user_id, r.requested_by, r.reviewer_id]).filter(Boolean))
    );

    let profilesMap = new Map<string, any>();
    let identitiesMap = new Map<string, any>();

    if (userIds.length > 0) {
      const [profilesRes, identitiesRes] = await Promise.all([
        sb.from("profiles").select("id, full_name, avatar_url, phone").in("id", userIds),
        sb.from("employee_identities").select("user_id, employee_code, title, department, slug, designation_id, designations(title)").in("user_id", userIds),
      ]);
      (profilesRes.data ?? []).forEach((p: any) => profilesMap.set(p.id, p));
      (identitiesRes.data ?? []).forEach((i: any) => identitiesMap.set(i.user_id, i));
    }

    return (rows ?? []).map((r: any) => ({
      ...r,
      targetUser: {
        profile: profilesMap.get(r.user_id),
        identity: identitiesMap.get(r.user_id),
      },
      requester: {
        profile: profilesMap.get(r.requested_by),
        identity: identitiesMap.get(r.requested_by),
      },
      reviewer: r.reviewer_id
        ? {
            profile: profilesMap.get(r.reviewer_id),
            identity: identitiesMap.get(r.reviewer_id),
          }
        : null,
    }));
  });

export const getMyPendingChangeRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      userId: z.string().uuid().optional(),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    const sb: any = hasSupabaseAdminCredentials() ? supabaseAdmin : context.supabase;
    const targetUserId = data?.userId || context.userId;

    const { data: latest } = await sb
      .from("profile_change_requests")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return latest || null;
  });

export const reviewStaffChangeRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      requestId: z.string().uuid(),
      decision: z.enum(["approved", "rejected"]),
      reviewerNote: z.string().max(500).optional(),
      adjustedChanges: z.record(z.string(), z.any()).optional(),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const actorCtx = await getStaffActorContext(context.supabase, context.userId);
    if (!actorCtx.isHRStaff && !actorCtx.isAdmin) {
      throw new Error("Only HR team members and Admins can approve or reject staff change requests.");
    }

    if (data.decision === "rejected" && (!data.reviewerNote || data.reviewerNote.trim().length < 3)) {
      throw new Error("A rejection reason note is strictly required from the HR team.");
    }

    const sb: any = hasSupabaseAdminCredentials() ? supabaseAdmin : context.supabase;
    const { data: req, error: reqErr } = await sb
      .from("profile_change_requests")
      .select("*")
      .eq("id", data.requestId)
      .single();
    if (reqErr || !req) throw new Error("Change request not found");
    if (req.status !== "pending") throw new Error(`Request has already been ${req.status}`);

    // Self-approval is strictly forbidden
    if (context.userId === req.user_id) {
      throw new Error("You cannot review or approve your own profile change request.");
    }

    // Check if the target user is an HR staff member
    const targetActorCtx = await getStaffActorContext(sb, req.user_id);
    const isTargetHR = targetActorCtx.isHRStaff || targetActorCtx.isHRLead;

    // HR's own profile applications MUST be approved by Admin, CEO, or Executive Leadership
    if (isTargetHR && !actorCtx.isAdmin && !actorCtx.isMasterAdmin) {
      const reviewerTitle = (actorCtx.designationTitle || "").toLowerCase();
      const isExecutive = reviewerTitle.includes("ceo") || reviewerTitle.includes("chairman") || reviewerTitle.includes("general manager") || reviewerTitle.includes("coo");
      if (!isExecutive) {
        throw new Error("HR staff profile applications must be approved by the Admin, CEO, or Executive Leadership.");
      }
    }

    if (data.decision === "approved") {
      const changesToApply = data.adjustedChanges || req.changes || {};

      // 1. If profile fields present
      const profileUpdates: any = { updated_at: new Date().toISOString() };
      if (changesToApply.fullName || changesToApply.full_name) profileUpdates.full_name = changesToApply.fullName || changesToApply.full_name;
      if (changesToApply.avatarUrl !== undefined || changesToApply.avatar_url !== undefined) profileUpdates.avatar_url = changesToApply.avatarUrl ?? changesToApply.avatar_url;
      if (changesToApply.phone !== undefined) profileUpdates.phone = changesToApply.phone;
      if (Object.keys(profileUpdates).length > 1) {
        await sb.from("profiles").update(profileUpdates).eq("id", req.user_id);
      }

      // 2. Identity fields
      const identityUpdates: any = { updated_at: new Date().toISOString() };
      if (changesToApply.display_name || changesToApply.fullName) identityUpdates.display_name = changesToApply.display_name || changesToApply.fullName;
      if (changesToApply.avatar_url || changesToApply.avatarUrl) identityUpdates.avatar_url = changesToApply.avatar_url || changesToApply.avatarUrl;
      if (changesToApply.title !== undefined) identityUpdates.title = changesToApply.title;
      if (changesToApply.department !== undefined) identityUpdates.department = changesToApply.department;
      if (changesToApply.employeeCode !== undefined || changesToApply.employee_code !== undefined) {
        identityUpdates.employee_code = changesToApply.employeeCode ?? changesToApply.employee_code;
      }
      if (changesToApply.slug !== undefined) identityUpdates.slug = changesToApply.slug;
      if (changesToApply.designationId !== undefined || changesToApply.designation_id !== undefined) {
        identityUpdates.designation_id = changesToApply.designationId ?? changesToApply.designation_id;
      }
      if (changesToApply.bio !== undefined) identityUpdates.bio = changesToApply.bio;
      if (changesToApply.isPublic !== undefined || changesToApply.is_public !== undefined) {
        identityUpdates.is_public = changesToApply.isPublic ?? changesToApply.is_public;
      }
      if (changesToApply.showEmail !== undefined || changesToApply.show_email !== undefined) {
        identityUpdates.show_email = changesToApply.showEmail ?? changesToApply.show_email;
      }
      if (changesToApply.showPhone !== undefined || changesToApply.show_phone !== undefined) {
        identityUpdates.show_phone = changesToApply.showPhone ?? changesToApply.show_phone;
      }
      if (changesToApply.showSocials !== undefined || changesToApply.show_socials !== undefined) {
        identityUpdates.show_socials = changesToApply.showSocials ?? changesToApply.show_socials;
      }
      if (changesToApply.allowIndexing !== undefined || changesToApply.allow_indexing !== undefined) {
        identityUpdates.allow_indexing = changesToApply.allowIndexing ?? changesToApply.allow_indexing;
      }

      // Upsert identity
      const { data: existingIdent } = await sb.from("employee_identities").select("id").eq("user_id", req.user_id).maybeSingle();
      if (existingIdent) {
        await sb.from("employee_identities").update(identityUpdates).eq("user_id", req.user_id);
      } else {
        identityUpdates.user_id = req.user_id;
        if (!identityUpdates.employee_code) identityUpdates.employee_code = `ORZ-${Math.floor(1000 + Math.random() * 9000)}`;
        if (!identityUpdates.slug) identityUpdates.slug = `staff-${req.user_id.slice(0, 6)}`;
        await sb.from("employee_identities").insert(identityUpdates);
      }

      // 3. If role change requested
      if (changesToApply.role && typeof changesToApply.role === "string") {
        await sb.from("user_roles").upsert({ user_id: req.user_id, role: changesToApply.role }, { onConflict: "user_id,role" });
      }
    }

    // Update request status
    const { data: updated, error: updErr } = await sb
      .from("profile_change_requests")
      .update({
        status: data.decision,
        reviewer_id: context.userId,
        reviewer_note: data.reviewerNote || null,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.requestId)
      .select("*")
      .single();

    if (updErr) throw new Error(updErr.message);

    await auditStaffAction(context.supabase, context.userId, `review_request_${data.decision}`, "profile_change_requests", data.requestId, {
      decision: data.decision,
      target_user_id: req.user_id,
    });

    return updated;
  });

export const listAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      limit: z.number().min(1).max(500).default(100),
      offset: z.number().min(0).default(0),
      action: z.string().max(60).optional(),
      actorId: z.string().uuid().optional(),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb: any = hasSupabaseAdminCredentials() ? supabaseAdmin : context.supabase;

    let q = sb
      .from("staff_audit_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    if (data.action && data.action !== "all") q = q.eq("action", data.action);
    if (data.actorId) q = q.eq("actor_id", data.actorId);

    const { data: rows, count } = await q;

    const actorIds = [...new Set((rows ?? []).map((r: any) => r.actor_id as string).filter(Boolean))];
    const targetUserIds = [...new Set((rows ?? []).map((r: any) => r.entity_id as string).filter(Boolean))];
    const allUserIds = [...new Set([...actorIds, ...targetUserIds])];

    const profilesMap = new Map<string, string>();
    if (allUserIds.length > 0) {
      const { data: profiles } = await sb.from("profiles").select("id, full_name").in("id", allUserIds);
      profiles?.forEach((p: any) => profilesMap.set(p.id, p.full_name || ""));
    }

    return {
      items: (rows ?? []).map((r: any) => ({
        ...r,
        actor_name: profilesMap.get(r.actor_id) || r.actor_id?.slice(0, 8) || "System",
        target_name: r.entity_id ? profilesMap.get(r.entity_id) || r.entity_id.slice(0, 8) : null,
      })),
      total: count ?? 0,
    };
  });

export const bulkGrantSections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      userIds: z.array(z.string().uuid()).min(1),
      sections: z.array(z.string()).min(1),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb: any = context.supabase;

    const rows = data.userIds.flatMap((uid) =>
      data.sections.map((sec) => ({
        user_id: uid,
        section: sec,
        granted_by: context.userId,
      }))
    );

    const { error } = await sb.from("staff_section_access").upsert(rows, { onConflict: "user_id,section" });
    if (error) throw new Error(error.message);

    for (const uid of data.userIds) {
      await auditStaffAction(context.supabase, context.userId, "bulk_grant_sections", "staff_section_access", uid, {
        sections: data.sections,
      });
    }

    return { ok: true, count: data.userIds.length };
  });

export const bulkRevokeSections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      userIds: z.array(z.string().uuid()).min(1),
      sections: z.array(z.string()).min(1),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb: any = context.supabase;

    for (const uid of data.userIds) {
      const { error } = await sb
        .from("staff_section_access")
        .delete()
        .eq("user_id", uid)
        .in("section", data.sections);
      if (error) throw new Error(error.message);

      await auditStaffAction(context.supabase, context.userId, "bulk_revoke_sections", "staff_section_access", uid, {
        sections: data.sections,
      });
    }

    return { ok: true, count: data.userIds.length };
  });

export const cloneRolePreset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      presetId: z.string().uuid(),
      newName: z.string().trim().min(2).max(60),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb: any = context.supabase;

    const { data: original, error: fetchErr } = await sb
      .from("staff_role_presets")
      .select("*")
      .eq("id", data.presetId)
      .single();
    if (fetchErr || !original) throw new Error("Original preset not found");

    const { data: created, error: insErr } = await sb
      .from("staff_role_presets")
      .insert({
        name: data.newName,
        description: `Copy of ${original.name}${original.description ? `: ${original.description}` : ""}`,
        sections: original.sections ?? [],
        is_system: false,
      })
      .select()
      .single();
    if (insErr) throw new Error(insErr.message);

    await auditStaffAction(context.supabase, context.userId, "clone_preset", "staff_role_presets", created.id, {
      original_id: data.presetId,
      new_name: data.newName,
    });

    return created;
  });

export const updateStaffProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      userId: z.string().uuid(),
      fullName: z.string().min(1).max(120).optional(),
      avatarUrl: z.string().url().nullable().optional().or(z.literal("")),
      phone: z.string().max(40).nullable().optional(),
      designationId: z.string().uuid().nullable().optional(),
      department: z.string().max(120).nullable().optional(),
      title: z.string().max(120).nullable().optional(),
      bio: z.string().max(4000).nullable().optional(),
      employeeCode: z.string().max(40).optional(),
      slug: z.string().min(2).max(60).optional(),
      isPublic: z.boolean().optional(),
      showEmail: z.boolean().optional(),
      showPhone: z.boolean().optional(),
      showSocials: z.boolean().optional(),
      allowIndexing: z.boolean().optional(),
      requestNote: z.string().max(1000).optional(),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    const sb: any = hasSupabaseAdminCredentials() ? supabaseAdmin : context.supabase;
    const actorCtx = await getStaffActorContext(context.supabase, context.userId);
    const isSelf = context.userId === data.userId;

    // Check if target is fired
    const { data: existingIdent } = await sb.from("employee_identities").select("*").eq("user_id", data.userId).maybeSingle();
    if (existingIdent?.status === "fired" && !actorCtx.isAdmin && !actorCtx.isHRLead) {
      throw new Error("This employee is marked as FIRED / TERMINATED. Their profile is locked. An HR Leader or Admin must reinstate them first.");
    }

    const hasRestrictedChanges =
      data.title !== undefined ||
      data.department !== undefined ||
      data.employeeCode !== undefined ||
      data.slug !== undefined ||
      data.designationId !== undefined;

    // Case 1: Normal staff updating profile (all edits saved as draft pending HR approval)
    if (!actorCtx.isHRStaff && !actorCtx.isAdmin) {
      const draftPayload: any = {
        fullName: data.fullName,
        avatarUrl: data.avatarUrl,
        phone: data.phone,
        title: data.title,
        department: data.department,
        employeeCode: data.employeeCode,
        slug: data.slug,
        designationId: data.designationId,
        bio: data.bio,
        isPublic: data.isPublic,
        showEmail: data.showEmail,
        showPhone: data.showPhone,
        showSocials: data.showSocials,
        allowIndexing: data.allowIndexing,
      };

      // Check if there is an active pending or rejected draft for this user
      const { data: existingDraft } = await sb
        .from("profile_change_requests")
        .select("id, status")
        .eq("user_id", data.userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingDraft && (existingDraft.status === "pending" || existingDraft.status === "rejected")) {
        await sb
          .from("profile_change_requests")
          .update({
            changes: draftPayload,
            note: data.requestNote || (existingDraft.status === "rejected" ? "Re-applied profile application after revision" : "Updated draft profile application"),
            status: "pending",
            reviewer_id: null,
            reviewer_note: null,
            reviewed_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingDraft.id);
      } else {
        await sb.from("profile_change_requests").insert({
          user_id: data.userId,
          requested_by: context.userId,
          request_type: isSelf ? "staff_self_request" : "hr_propose_edit",
          changes: draftPayload,
          note: data.requestNote || "Staff application for profile update",
          status: "pending",
        });
      }

      return {
        success: true,
        pendingApproval: true,
        message: "Profile changes saved as draft and submitted for HR review. They will take effect once approved.",
      };
    }

    // Case 2: HR Staff / Leader / Admin direct update (Immediate application)
    if (data.fullName || data.avatarUrl !== undefined || data.phone !== undefined) {
      const profileUpdates: any = { updated_at: new Date().toISOString() };
      if (data.fullName) profileUpdates.full_name = data.fullName;
      if (data.avatarUrl !== undefined) profileUpdates.avatar_url = data.avatarUrl || null;
      if (data.phone !== undefined) profileUpdates.phone = data.phone || null;
      await sb.from("profiles").update(profileUpdates).eq("id", data.userId);
    }

    const identityPayload: any = {
      user_id: data.userId,
      display_name: data.fullName || existingIdent?.display_name,
      avatar_url: data.avatarUrl !== undefined ? (data.avatarUrl || null) : existingIdent?.avatar_url,
      phone_public: data.phone !== undefined ? (data.phone || null) : existingIdent?.phone_public,
      department: data.department !== undefined ? data.department : existingIdent?.department,
      title: data.title !== undefined ? data.title : existingIdent?.title,
      bio: data.bio !== undefined ? data.bio : existingIdent?.bio,
      designation_id: data.designationId !== undefined ? data.designationId : existingIdent?.designation_id,
      is_public: data.isPublic !== undefined ? data.isPublic : (existingIdent?.is_public ?? true),
      show_email: data.showEmail !== undefined ? data.showEmail : (existingIdent?.show_email ?? true),
      show_phone: data.showPhone !== undefined ? data.showPhone : (existingIdent?.show_phone ?? true),
      show_socials: data.showSocials !== undefined ? data.showSocials : (existingIdent?.show_socials ?? true),
      allow_indexing: data.allowIndexing !== undefined ? data.allowIndexing : (existingIdent?.allow_indexing ?? true),
      updated_at: new Date().toISOString(),
    };

    if (data.employeeCode) identityPayload.employee_code = data.employeeCode;
    if (data.slug) identityPayload.slug = data.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    if (existingIdent) {
      await sb.from("employee_identities").update(identityPayload).eq("user_id", data.userId);
    } else {
      if (!identityPayload.slug) {
        const base = (data.fullName || "staff").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "staff";
        identityPayload.slug = `${base}-${data.userId.slice(0, 4)}`;
      }
      if (!identityPayload.employee_code) {
        identityPayload.employee_code = `ORZ-${Math.floor(1000 + Math.random() * 9000)}`;
      }
      await sb.from("employee_identities").insert(identityPayload);
    }

    await auditStaffAction(context.supabase, context.userId, "update_profile_direct", "profiles", data.userId, {
      full_name: data.fullName,
      is_public: data.isPublic,
      designation_id: data.designationId,
    });

    return { success: true, pendingApproval: false };
  });

