"use server";

import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin, auditStaffAction } from "@/lib/staff.functions";
import { hasSupabaseAdminCredentials, supabaseAdmin } from "@/integrations/supabase/client.server";

function getAdminOrUserSb(context: any) {
  if (hasSupabaseAdminCredentials()) {
    return supabaseAdmin;
  }
  return context.supabase;
}

export interface TeamMemberItem {
  user_id: string;
  full_name?: string;
  avatar_url?: string;
  email?: string;
  added_at: string;
}

export interface TeamDetailed {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  members: TeamMemberItem[];
  sections: string[];
}

export const listTeamsDetailed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TeamDetailed[]> => {
    await assertAdmin(context.supabase, context.userId);
    const sb: any = getAdminOrUserSb(context);

    const [teamsRes, membersRes, sectionsRes, profilesRes, identitiesRes] = await Promise.all([
      sb.from("teams").select("*").order("created_at", { ascending: true }),
      sb.from("team_members").select("team_id, user_id, added_at"),
      sb.from("team_section_access").select("team_id, section"),
      sb.from("profiles").select("id, full_name, avatar_url"),
      sb.from("employee_identities").select("user_id, display_name, avatar_url"),
    ]);

    if (teamsRes.error) throw new Error(teamsRes.error.message);

    const profilesMap = new Map<string, any>((profilesRes.data ?? []).map((p: any) => [p.id, p]));
    const identitiesMap = new Map<string, any>((identitiesRes.data ?? []).map((i: any) => [i.user_id, i]));

    const teams: TeamDetailed[] = (teamsRes.data ?? []).map((team: any) => {
      const members: TeamMemberItem[] = (membersRes.data ?? [])
        .filter((m: any) => m.team_id === team.id)
        .map((m: any) => {
          const profile = profilesMap.get(m.user_id);
          const identity = identitiesMap.get(m.user_id);
          return {
            user_id: m.user_id,
            full_name: identity?.display_name || profile?.full_name || undefined,
            avatar_url: identity?.avatar_url || profile?.avatar_url || undefined,
            added_at: m.added_at,
          };
        });

      const sections: string[] = (sectionsRes.data ?? [])
        .filter((s: any) => s.team_id === team.id)
        .map((s: any) => s.section as string);

      return {
        id: team.id,
        name: team.name,
        description: team.description,
        color: team.color || "#6366f1",
        created_at: team.created_at,
        updated_at: team.updated_at,
        created_by: team.created_by,
        members,
        sections,
      };
    });

    return teams;
  });

export const createTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      name: z.string().trim().min(2).max(60),
      description: z.string().trim().max(300).optional().nullable(),
      color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).default("#6366f1"),
      initialMemberIds: z.array(z.string().uuid()).optional(),
      initialSections: z.array(z.string()).optional(),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb: any = getAdminOrUserSb(context);

    const { data: team, error } = await sb
      .from("teams")
      .insert({
        name: data.name,
        description: data.description ?? null,
        color: data.color,
        created_by: context.userId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Initial members
    if (data.initialMemberIds && data.initialMemberIds.length > 0) {
      const memberRows = data.initialMemberIds.map((uId) => ({
        team_id: team.id,
        user_id: uId,
        added_by: context.userId,
      }));
      await sb.from("team_members").insert(memberRows);
    }

    // Initial sections
    if (data.initialSections && data.initialSections.length > 0) {
      const sectionRows = data.initialSections.map((sec) => ({
        team_id: team.id,
        section: sec,
        granted_by: context.userId,
      }));
      await sb.from("team_section_access").insert(sectionRows);
    }

    // Log to team_audit_log and staff_audit_log
    try {
      await sb.from("team_audit_log").insert({
        team_id: team.id,
        team_name: team.name,
        action: "team_created",
        performed_by: context.userId,
        metadata: { color: data.color, members_count: data.initialMemberIds?.length || 0 },
      });
    } catch {}

    await auditStaffAction(context.supabase, context.userId, "create_team", "teams", team.id, {
      name: data.name,
      color: data.color,
    });

    return team;
  });

export const updateTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      name: z.string().trim().min(2).max(60),
      description: z.string().trim().max(300).optional().nullable(),
      color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb: any = getAdminOrUserSb(context);

    const { error } = await sb
      .from("teams")
      .update({
        name: data.name,
        description: data.description ?? null,
        color: data.color,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (error) throw new Error(error.message);

    try {
      await sb.from("team_audit_log").insert({
        team_id: data.id,
        team_name: data.name,
        action: "team_updated",
        performed_by: context.userId,
        metadata: { name: data.name, color: data.color },
      });
    } catch {}

    await auditStaffAction(context.supabase, context.userId, "update_team", "teams", data.id, {
      name: data.name,
      color: data.color,
    });

    return { ok: true };
  });

export const deleteTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), name: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb: any = getAdminOrUserSb(context);

    // Delete relations first
    await sb.from("team_section_access").delete().eq("team_id", data.id);
    await sb.from("team_members").delete().eq("team_id", data.id);
    const { error } = await sb.from("teams").delete().eq("id", data.id);

    if (error) throw new Error(error.message);

    try {
      await sb.from("team_audit_log").insert({
        team_id: data.id,
        team_name: data.name,
        action: "team_deleted",
        performed_by: context.userId,
        metadata: { deleted_team: data.name },
      });
    } catch {}

    await auditStaffAction(context.supabase, context.userId, "delete_team", "teams", data.id, {
      team_name: data.name,
    });

    return { ok: true };
  });

export const setTeamMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      teamId: z.string().uuid(),
      teamName: z.string(),
      memberUserIds: z.array(z.string().uuid()),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb: any = getAdminOrUserSb(context);

    // Wipe and replace team members
    await sb.from("team_members").delete().eq("team_id", data.teamId);

    if (data.memberUserIds.length > 0) {
      const rows = data.memberUserIds.map((uId) => ({
        team_id: data.teamId,
        user_id: uId,
        added_by: context.userId,
      }));
      const { error } = await sb.from("team_members").insert(rows);
      if (error) throw new Error(error.message);
    }

    try {
      await sb.from("team_audit_log").insert({
        team_id: data.teamId,
        team_name: data.teamName,
        action: "members_updated",
        performed_by: context.userId,
        metadata: { count: data.memberUserIds.length },
      });
    } catch {}

    await auditStaffAction(context.supabase, context.userId, "update_team_members", "team_members", data.teamId, {
      team_name: data.teamName,
      members_count: data.memberUserIds.length,
    });

    return { ok: true };
  });

export const setTeamSections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      teamId: z.string().uuid(),
      teamName: z.string(),
      sections: z.array(z.string()),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb: any = getAdminOrUserSb(context);

    // Wipe and replace team sections
    await sb.from("team_section_access").delete().eq("team_id", data.teamId);

    if (data.sections.length > 0) {
      const rows = data.sections.map((sec) => ({
        team_id: data.teamId,
        section: sec,
        granted_by: context.userId,
      }));
      const { error } = await sb.from("team_section_access").insert(rows);
      if (error) throw new Error(error.message);
    }

    try {
      await sb.from("team_audit_log").insert({
        team_id: data.teamId,
        team_name: data.teamName,
        action: "sections_updated",
        performed_by: context.userId,
        metadata: { sections: data.sections },
      });
    } catch {}

    await auditStaffAction(context.supabase, context.userId, "update_team_sections", "team_section_access", data.teamId, {
      team_name: data.teamName,
      sections: data.sections,
    });

    return { ok: true };
  });
