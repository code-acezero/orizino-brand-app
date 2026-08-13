"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { VerifyScannerContent } from "@orizino/shared";

export type ScannerConfig = VerifyScannerContent & {
  info_hero_title?: string;
  info_hero_subtitle?: string;
};

/** Reads public scanner_config from site_settings. Falls back to {} on error. */
export function useScannerConfig() {
  const [cfg, setCfg] = useState<ScannerConfig | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "scanner_config")
          .maybeSingle();
        if (!cancel) setCfg((data?.value as ScannerConfig) ?? {});
      } catch {
        if (!cancel) setCfg({});
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);
  return { cfg: cfg ?? {}, loading };
}
