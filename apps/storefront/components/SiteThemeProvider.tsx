"use client";
import { setExternalRedirects } from "@orizino/shared/lib/cross-app-urls";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { themeMap, allThemeVars, themePalettes } from "@/lib/theme-palettes";
import { useTheme } from "next-themes";

/* Map old theme IDs to new ones for backward compat */
const legacyMap: Record<string, string> = {
  default: "cherry_vanilla",
  crimson_drive: "cherry_vanilla",  /* renamed */
  ocean: "tidal_flame",
  sunset: "ember_city",
  rose: "rose_petal",
  violet: "midnight_orchid",
  crimson: "cherry_vanilla",
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
  const { resolvedTheme } = useTheme();

  const { data: siteSettings, isLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["site_theme", "site_mode", "site_customizer", "title_font", "external_redirects", "custom_theme_colors"]);
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

  /* Apply theme + mode */
  useEffect(() => {
    if (!siteSettings) return;
    setExternalRedirects(siteSettings.external_redirects || null);
    const mode = resolvedTheme || "dark";
    const rawThemeId = String(siteSettings.site_theme || "cherry_vanilla");
    const themeId = legacyMap[rawThemeId] || (themeMap.has(rawThemeId) ? rawThemeId : "cherry_vanilla");
    const html = document.documentElement;

    // Clear all theme vars
    allThemeVars.forEach((v) => html.style.removeProperty(v));
    customizerVars.forEach((v) => html.style.removeProperty(v));

    // Get palette
    let vars: Record<string, string> = {};

    if (themeId === "custom" && siteSettings.custom_theme_colors) {
      const colors = siteSettings.custom_theme_colors;
      const primaryHex = colors.primary || "#9a0002";
      const lightBgHex = colors.lightBg || "#efe6dd";
      const darkBgHex = colors.darkBg || "#2a2a2a";

      const hexToHsl = (hex: string) => {
        let r = 0, g = 0, b = 0;
        if (hex.length === 4) { r = parseInt(hex[1]+hex[1], 16); g = parseInt(hex[2]+hex[2], 16); b = parseInt(hex[3]+hex[3], 16); }
        else if (hex.length === 7) { r = parseInt(hex.slice(1,3), 16); g = parseInt(hex.slice(3,5), 16); b = parseInt(hex.slice(5,7), 16); }
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r,g,b), min = Math.min(r,g,b);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
      };

      const p = hexToHsl(primaryHex);
      const lb = hexToHsl(lightBgHex);
      const db = hexToHsl(darkBgHex);
      const pfg = p.l > 55 ? `${db.h} 15% 8%` : "0 0% 98%";

      if (mode === "dark") {
        vars = {
          "--background": `${db.h} ${db.s}% ${db.l}%`,
          "--foreground": `${lb.h} ${lb.s}% ${lb.l}%`,
          "--card": `${db.h} ${db.s}% ${Math.min(db.l + 3, 15)}%`,
          "--card-foreground": `${lb.h} ${lb.s}% ${lb.l}%`,
          "--popover": `${db.h} ${db.s}% ${Math.min(db.l + 3, 15)}%`,
          "--popover-foreground": `${lb.h} ${lb.s}% ${lb.l}%`,
          "--primary": `${p.h} ${p.s}% ${p.l}%`,
          "--primary-foreground": pfg,
          "--secondary": `${db.h} ${db.s}% ${Math.min(db.l + 8, 20)}%`,
          "--secondary-foreground": `${lb.h} ${lb.s}% ${Math.max(lb.l - 15, 70)}%`,
          "--muted": `${db.h} ${Math.min(db.s, 10)}% ${Math.min(db.l + 6, 18)}%`,
          "--muted-foreground": `${db.h} 8% 50%`,
          "--accent": `${p.h} ${p.s}% ${Math.min(p.l + 10, 80)}%`,
          "--accent-foreground": "0 0% 95%",
          "--destructive": "0 72% 51%",
          "--destructive-foreground": "0 0% 98%",
          "--border": `${db.h} ${db.s}% ${Math.min(db.l + 10, 25)}%`,
          "--input": `${db.h} ${db.s}% ${Math.min(db.l + 10, 25)}%`,
          "--ring": `${p.h} ${p.s}% ${p.l}%`,
          "--gradient-primary": `linear-gradient(135deg, hsl(${p.h} ${p.s}% ${p.l}%), hsl(${p.h} ${p.s}% ${Math.max(0, p.l - 15)}%))`,
          "--gradient-accent": `linear-gradient(135deg, hsl(${p.h} ${p.s}% ${p.l}%), hsl(${db.h} ${db.s}% ${Math.min(100, db.l + 15)}%))`,
          "--gradient-glow": `radial-gradient(ellipse at center, hsl(${p.h} ${p.s}% ${p.l}% / 0.15), transparent 70%)`,
          "--glass-bg": `${db.h} ${db.s}% ${db.l}% / 0.65`,
          "--glass-border": `${db.h} ${db.s}% ${Math.min(100, db.l + 15)}% / 0.35`,
          "--glass-shadow": `0 8px 32px hsl(0 0% 0% / 0.4)`,
        };
      } else {
        vars = {
          "--background": `${lb.h} ${lb.s}% ${lb.l}%`,
          "--foreground": `${db.h} ${db.s}% ${db.l}%`,
          "--card": `${lb.h} ${lb.s}% ${Math.max(lb.l - 2, 95)}%`,
          "--card-foreground": `${db.h} ${db.s}% ${db.l}%`,
          "--popover": `${lb.h} ${lb.s}% ${Math.max(lb.l - 2, 95)}%`,
          "--popover-foreground": `${db.h} ${db.s}% ${db.l}%`,
          "--primary": `${p.h} ${p.s}% ${p.l}%`,
          "--primary-foreground": pfg,
          "--secondary": `${lb.h} ${lb.s}% ${Math.max(lb.l - 6, 85)}%`,
          "--secondary-foreground": `${db.h} ${db.s}% ${Math.min(db.l + 20, 40)}%`,
          "--muted": `${lb.h} ${Math.min(lb.s, 10)}% ${Math.max(lb.l - 8, 85)}%`,
          "--muted-foreground": `${lb.h} 8% 45%`,
          "--accent": `${p.h} ${p.s}% ${Math.max(p.l - 10, 30)}%`,
          "--accent-foreground": "0 0% 98%",
          "--destructive": "0 72% 51%",
          "--destructive-foreground": "0 0% 98%",
          "--border": `${lb.h} ${lb.s}% ${Math.max(lb.l - 12, 80)}%`,
          "--input": `${lb.h} ${lb.s}% ${Math.max(lb.l - 12, 80)}%`,
          "--ring": `${p.h} ${p.s}% ${p.l}%`,
          "--gradient-primary": `linear-gradient(135deg, hsl(${p.h} ${p.s}% ${p.l}%), hsl(${p.h} ${p.s}% ${Math.min(100, p.l + 15)}%))`,
          "--gradient-accent": `linear-gradient(135deg, hsl(${p.h} ${p.s}% ${p.l}%), hsl(${lb.h} ${lb.s}% ${Math.max(0, lb.l - 10)}%))`,
          "--gradient-glow": `radial-gradient(ellipse at center, hsl(${p.h} ${p.s}% ${p.l}% / 0.1), transparent 70%)`,
          "--glass-bg": `0 0% 100% / 0.7`,
          "--glass-border": `${lb.h} ${lb.s}% ${Math.max(0, lb.l - 15)}% / 0.4`,
          "--glass-shadow": `0 8px 32px hsl(0 0% 0% / 0.08)`,
        };
      }
    } else {
      const palette = themeMap.get(themeId) || themePalettes[0];
      if (palette) vars = mode === "light" ? palette.light : palette.dark;
    }

    Object.entries(vars).forEach(([k, v]) => html.style.setProperty(k, v));

    // Note: next-themes handles adding the .light/.dark class to html element,
    // so we don't need to manually toggle classes here anymore.
    try { localStorage.setItem("storefront-mode", mode); } catch { /* ignore */ }

    // Customizer overrides
    const customizer = siteSettings.site_customizer;
    if (customizer && typeof customizer === "object") {
      const c = customizer as any;
      if (c.heading_font) {
        const hFontVal = `'${c.heading_font}', sans-serif`;
        html.style.setProperty("--font-display", hFontVal);
        html.style.setProperty("--storefront-font-heading", hFontVal);
        loadGoogleFont(c.heading_font, c.heading_weight || "700");
      }
      if (c.body_font) {
        const bFontVal = `'${c.body_font}', sans-serif`;
        html.style.setProperty("--font-body", bFontVal);
        html.style.setProperty("--storefront-font-body", bFontVal);
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
      const tFontVal = `'${titleFont}', var(--font-display)`;
      html.style.setProperty("--font-title", tFontVal);
      html.style.setProperty("--storefront-font-heading", tFontVal);
      // Only load Google font if not a custom local font
      const customFonts = ["Agraham","Bilderberg","Nevera","OrangeAvenue","PrimorStylish","ProdesStencil","Rostex","SingleGrinch","Transcity","Zaslia","Goca","Logofontik","Fear","Monoo","Monolite"];
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
