"use client";
import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { themeMap, allThemeVars, themePalettes } from "@orizino/shared/lib/theme-palettes";

const legacyMap: Record<string, string> = {
  default: "crimson_drive",
  crimson: "crimson_drive",
  ocean: "tidal_flame",
  sunset: "ember_city",
  rose: "rose_petal",
  violet: "midnight_orchid",
  gold: "gilded_vault",
  mint: "emerald_night",
  aurora: "arctic_aurora",
  neon: "neon_pulse",
  lavender: "lavender_dream",
  ember: "ember_city",
  sapphire: "sapphire_deep",
  coral: "terracotta_sun",
  forest: "forest_canopy",
  midnight: "midnight_orchid",
  slate: "carbon_fiber",
};

export function OrderOpsThemeProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();

  const { data: siteSettings } = useQuery({
    queryKey: ["orderops-site-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["site_theme", "site_mode", "site_customizer", "primary_color"]);
      const map: Record<string, any> = {};
      data?.forEach((s) => {
        const val = s.value;
        map[s.key] = typeof val === "object" && val !== null ? (val as any).value ?? val : val;
      });
      return map;
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!siteSettings) return;
    const rawMode = String(siteSettings.site_mode || "dark");
    const isAuto = rawMode === "auto" || rawMode === "system";
    const getSystemTheme = () => {
      if (typeof window === "undefined" || !window.matchMedia) return "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    };
    const mode = isAuto ? getSystemTheme() : rawMode;
    const rawThemeId = String(siteSettings.site_theme || "crimson_drive");
    const themeId = legacyMap[rawThemeId] || rawThemeId;
    const html = document.documentElement;

    allThemeVars.forEach((v) => html.style.removeProperty(v));

    const palette = themeMap.get(themeId) || themePalettes[0];
    if (palette) {
      const vars = mode === "light" ? palette.light : palette.dark;
      Object.entries(vars).forEach(([k, v]) => html.style.setProperty(k, v));
    }

    if (mode === "light") {
      html.classList.add("light");
      html.classList.remove("dark");
    } else {
      html.classList.add("dark");
      html.classList.remove("light");
    }

    // Live customizer radius if any
    const customizer = siteSettings.site_customizer;
    if (customizer && typeof customizer === "object") {
      const c = (customizer as any).value ?? customizer;
      if (c.border_radius != null) html.style.setProperty("--radius", `${c.border_radius}px`);
    }
  }, [siteSettings]);

  // Realtime settings changes
  useEffect(() => {
    const channel = supabase
      .channel("orderops-settings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => {
        qc.invalidateQueries({ queryKey: ["orderops-site-settings"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return <>{children}</>;
}
