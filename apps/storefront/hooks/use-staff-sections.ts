"use client";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns the set of admin sections the current user can access.
 * Admins implicitly have access to every section.
 *
 * Sections are sourced from public.staff_sections; user grants from
 * public.staff_section_access. Helper `public.has_section_access(uid, key)`
 * is the canonical check on the server.
 */
export function useStaffSections() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["staff-sections", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [sectionsRes, accessRes, adminRes] = await Promise.all([
        supabase.from("staff_sections").select("*").order("sort_order"),
        supabase.from("staff_section_access").select("section").eq("user_id", user!.id),
        supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" }),
      ]);
      const sections = sectionsRes.data ?? [];
      const isAdmin = !!adminRes.data;
      const grantedKeys = new Set((accessRes.data ?? []).map((r) => r.section));
      return {
        isAdmin,
        sections,
        accessible: sections.filter((s) => isAdmin || grantedKeys.has(s.key)),
        hasAccess: (key: string) => isAdmin || grantedKeys.has(key),
      };
    },
  });
}
