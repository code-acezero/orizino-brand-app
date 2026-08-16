"use client";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  defaultProfileAppearance,
  getTypographyPair,
  type ProfileAppearanceConfig,
} from "@/lib/profile-appearance";

const loadedFontUrls = new Set<string>();

function loadGoogleFontPair(gfUrl: string) {
  if (typeof document === "undefined") return;
  const href = `https://fonts.googleapis.com/css2?family=${gfUrl}&display=swap`;
  if (loadedFontUrls.has(href)) return;
  loadedFontUrls.add(href);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.setAttribute("data-profile-font", "1");
  document.head.appendChild(link);
}

export function useProfileAppearance() {
  const { data } = useQuery({
    queryKey: ["site-settings", "profile_appearance"],
    queryFn: async (): Promise<ProfileAppearanceConfig> => {
      try {
        const res = await fetch("/api/site-settings?keys=profile_appearance", {
          headers: { "Accept": "application/json" },
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.profile_appearance) {
            const v = (json.profile_appearance as Partial<ProfileAppearanceConfig>) || null;
            return { ...defaultProfileAppearance, ...(v || {}) };
          }
        }
      } catch {
        // fallback
      }

      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "profile_appearance")
        .maybeSingle();
      const valObj: any = data?.value;
      const v = (typeof valObj === "object" && valObj !== null ? valObj.value ?? valObj : null) as Partial<ProfileAppearanceConfig> | null;
      return { ...defaultProfileAppearance, ...(v || {}) };
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const cfg = data ?? defaultProfileAppearance;
  const pair = getTypographyPair(cfg.typography_pair);

  useEffect(() => {
    loadGoogleFontPair(pair.gfUrl);
  }, [pair.gfUrl]);

  const style: React.CSSProperties = {
    ["--profile-font-heading" as any]: pair.heading,
    ["--profile-font-body" as any]: pair.body,
  };
  if (cfg.accent_hsl) {
    (style as any)["--primary"] = cfg.accent_hsl;
    (style as any)["--ring"] = cfg.accent_hsl;
  }

  return {
    config: cfg,
    pair,
    layoutId: cfg.layout_variant,
    rootProps: {
      "data-profile-layout": cfg.layout_variant,
      "data-profile-density": cfg.density ?? "comfortable",
      "data-profile-mobile-nav": cfg.mobile_nav ?? "tabs",
      "data-profile-rounded": cfg.rounded ?? "2xl",
      style,
    },
  };
}
