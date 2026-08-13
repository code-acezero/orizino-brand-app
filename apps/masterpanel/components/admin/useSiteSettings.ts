"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";
import { upsertSiteSettings } from "@/lib/admin-data.functions";

/**
 * Small shared hook for reading/writing key→value rows in the `site_settings`
 * table. Each row stores `{ value: <any> }` for forward compatibility.
 */
export function useSiteSettings<T extends Record<string, any>>(defaults: T) {
  const qc = useQueryClient();
  const saveSiteSettings = useServerFn(upsertSiteSettings);
  const [form, setForm] = useState<T>(defaults);

  const { data: settings } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!settings) return;
    const map: Record<string, any> = {};
    settings.forEach((s: any) => {
      map[s.key] =
        typeof s.value === "object" && s.value !== null
          ? (s.value as any).value ?? s.value
          : s.value;
    });
    setForm((prev) => ({ ...prev, ...map }));
  }, [settings]);

  const save = useMutation({
    mutationFn: async (keys?: (keyof T)[]) => {
      const entries = Object.entries(form).filter(([k]) =>
        keys ? (keys as string[]).includes(k) : true
      );
      const updatedAt = new Date().toISOString();
      for (const [key, value] of entries) {
        const { error } = await supabase
          .from("site_settings")
          .upsert(
            { key, value: { value }, updated_at: updatedAt },
            { onConflict: "key" }
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      qc.invalidateQueries({ queryKey: ["site-settings-nav"] });
      toast.success("Settings saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  return { form, setForm, save };
}
// code:4ce0
