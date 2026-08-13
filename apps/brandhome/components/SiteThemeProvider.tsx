"use client";
import { setExternalRedirects } from "@orizino/shared/lib/cross-app-urls";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { themeMap, allThemeVars, themePalettes } from "@/lib/theme-palettes";
import { useTheme } from "next-themes";

/* Map old theme IDs to new ones for backward compat */
const legacyMap: Record<string, string> = {
  default: "crimson_drive",
  ocean: "tidal_flame",
  sunset: "ember_city",
  rose: "rose_petal",
  violet: "midnight_orchid",
  crimson: "crimson_drive",
  gold: "gilded_vault",
  mint: "emerald_night",
  aurora: "arctic_aurora",
  neon: "neon_pulse",
  lavender: "lavender_dream",
  ember: "ember_city",
  sapphire: "sapphire_deep",
  coral: "terracotta_sun",
  arctic: "arctic_aurora",
  forest: "forest_canopy",
  midnight: "midnight_orchid",
  candy: "rose_petal",
  bronze: "amber_rocks",
  plasma: "neon_pulse",
  slate: "carbon_fiber",
};

const customizerVars = [
  "--font-display", "--font-body",
  "--navbar-height", "--section-gap", "--container-max",
  "--content-padding", "--card-padding",
];

const SiteThemeProvider = () => {
  const qc = useQueryClient();

  const { data: siteSettings, isLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["site_theme", "site_mode", "site_customizer", "title_font", "external_redirects"]);
      const map: Record<string, any> = {};
      data?.forEach((s) => {
        const val = s.value;
        const resolved = typeof val === "object" && val !== null ? (val as any).value ?? val : val;
        map[s.key] = resolved;
      });
      return map;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const { resolvedTheme } = useTheme();

  /* Apply theme + mode */
  useEffect(() => {
    if (!siteSettings) return;
    setExternalRedirects(siteSettings.external_redirects || null);
    const mode = resolvedTheme || "dark";
    const rawThemeId = String(siteSettings.site_theme || "crimson_drive");
    const themeId = legacyMap[rawThemeId] || rawThemeId;
    const html = document.documentElement;

    // Clear all theme vars
    allThemeVars.forEach((v) => html.style.removeProperty(v));
    customizerVars.forEach((v) => html.style.removeProperty(v));

    // Get palette (fallback to first theme)
    const palette = themeMap.get(themeId) || themePalettes[0];
    if (palette) {
      const vars = mode === "light" ? palette.light : palette.dark;
      Object.entries(vars).forEach(([k, v]) => html.style.setProperty(k, v));
    }

    // Note: next-themes handles the .light/.dark class on html, but we might still need to set properties
    // However, we do not need to manually toggle the "light" class here, next-themes takes care of it.

    // Customizer overrides
    const customizer = siteSettings.site_customizer;
    if (customizer && typeof customizer === "object") {
      const c = customizer as any;
      if (c.heading_font) {
        html.style.setProperty("--font-display", `'${c.heading_font}', sans-serif`);
        loadGoogleFont(c.heading_font, c.heading_weight || "700");
      }
      if (c.body_font) {
        html.style.setProperty("--font-body", `'${c.body_font}', sans-serif`);
        loadGoogleFont(c.body_font, c.body_weight || "400");
      }
      if (c.border_radius != null) html.style.setProperty("--radius", `${c.border_radius}px`);
      if (c.glass_blur != null) html.style.setProperty("--glass-blur", `${c.glass_blur}px`);
      if (c.navbar_height) html.style.setProperty("--navbar-height", `${c.navbar_height}px`);
      if (c.section_gap) html.style.setProperty("--section-gap", `${c.section_gap}px`);
      if (c.container_width) html.style.setProperty("--container-max", `${c.container_width}px`);
      if (c.content_padding) html.style.setProperty("--content-padding", `${c.content_padding}px`);
      if (c.card_padding) html.style.setProperty("--card-padding", `${c.card_padding}px`);
      html.dataset.customizer = JSON.stringify(c);
    }

    // Title font
    const titleFont = siteSettings.title_font;
    if (titleFont && typeof titleFont === "string") {
      html.style.setProperty("--font-title", `'${titleFont}', var(--font-display)`);
      // Only load Google font if not a custom local font
      const customFonts = ["Agraham","Bilderberg","Nevera","OrangeAvenue","PrimorStylish","ProdesStencil","Rostex","SingleGrinch","Transcity","Zaslia"];
      if (!customFonts.includes(titleFont)) {
        loadGoogleFont(titleFont);
      }
    } else {
      html.style.removeProperty("--font-title");
    }
  }, [siteSettings, resolvedTheme]);

  /* Realtime sync */
  useEffect(() => {
    const channel = supabase
      .channel("site-settings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => {
        qc.invalidateQueries({ queryKey: ["site-settings"] });
        qc.invalidateQueries({ queryKey: ["site-settings-nav"] });
        qc.invalidateQueries({ queryKey: ["admin-settings"] });
        qc.invalidateQueries({ queryKey: ["site-customizer"] });
        qc.invalidateQueries({ queryKey: ["home-category-sections"] });
        qc.invalidateQueries({ queryKey: ["home-sales-config"] });
        qc.invalidateQueries({ queryKey: ["home-new-arrivals"] });
        qc.invalidateQueries({ queryKey: ["sale-products"] });
        qc.invalidateQueries({ queryKey: ["home-section-products"] });
        qc.invalidateQueries({ queryKey: ["home-section-categories"] });
        qc.invalidateQueries({ queryKey: ["showcase-config"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  // Don't block the UI while settings load — theme applies on hydrate.
  void isLoading;
  return null;
};

/* ── Google Fonts loader ── */
const loadedFonts = new Set<string>();
function loadGoogleFont(family: string, weights: string = "400,500,600,700") {
  const key = `${family}-${weights}`;
  if (loadedFonts.has(key)) return;
  loadedFonts.add(key);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weights.split(",").concat(["300","400","500","600","700"]).filter((v, i, a) => a.indexOf(v) === i).join(";")}&display=swap`;
  document.head.appendChild(link);
}

export default SiteThemeProvider;
// code:4ce0
