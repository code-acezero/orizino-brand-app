"use client";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns a live COUNT for a table with an optional filter callback.
 * Errors resolve to null so widgets show "—" instead of crashing.
 */
export function useKpiCount(
  key: readonly unknown[],
  table: string,
  build?: (q: any) => any,
  refetchInterval = 60_000,
) {
  return useQuery({
    queryKey: ["kpi-count", ...key],
    queryFn: async () => {
      let q: any = supabase.from(table as any).select("*", { count: "exact", head: true });
      if (build) q = build(q);
      const { count, error } = await q;
      if (error) return null;
      return count ?? 0;
    },
    refetchInterval,
    retry: false,
  });
}
// code:4ce0
