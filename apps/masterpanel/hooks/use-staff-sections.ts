"use client";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns the set of admin sections the current user can access.
 * Access is resolved from BOTH:
 *   1. Direct grants (staff_section_access)
 *   2. Team membership (team_members → team_section_access)
 *
 * Admins implicitly bypass all checks and see everything.
 */
export function useStaffSections() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["staff-sections", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [sectionsRes, adminRpc, directAccessRes, teamMembersRes, teamSectionRes] = await Promise.all([
        supabase.from("staff_sections").select("*").order("sort_order"),
        supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" }),
        supabase.from("staff_section_access").select("section").eq("user_id", user!.id),
        (supabase as any).from("team_members").select("team_id").eq("user_id", user!.id),
        (supabase as any).from("team_section_access").select("team_id, section"),
      ]);

      const sections = sectionsRes.data ?? [];
      const isAdmin = !!adminRpc.data;

      // Merge direct grants + team-based grants
      const directKeys = new Set((directAccessRes.data ?? []).map((r) => r.section));

      const userTeamIds = new Set((teamMembersRes.data ?? []).map((r: any) => r.team_id));
      const teamKeys = new Set(
        (teamSectionRes.data ?? [])
          .filter((r: any) => userTeamIds.has(r.team_id))
          .map((r: any) => r.section)
      );

      const grantedKeys = new Set([...directKeys, ...teamKeys]);

      return {
        isAdmin,
        sections,
        accessible: sections.filter((s) => isAdmin || grantedKeys.has(s.key)),
        hasAccess: (key: string) => isAdmin || grantedKeys.has(key),
      };
    },
  });
}
// code:4ce0
