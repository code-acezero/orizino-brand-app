"use client";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { themeMap, allThemeVars, themePalettes } from "@orizino/shared/lib/theme-palettes";
import { getStorefrontTypographyPair } from "@orizino/shared/lib/storefront-appearance";

const legacyMap: Record<string, string> = {
  default: "cherry_vanilla",
  crimson_drive: "cherry_vanilla",
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
  "--font-display", "--font-body", "--font-title",
  "--storefront-font-heading", "--storefront-font-body",
  "--navbar-height", "--section-gap", "--container-max",
  "--content-padding", "--card-padding",
];

const customFonts = [
  "Agraham", "Bilderberg", "Nevera", "OrangeAvenue", "PrimorStylish",
  "ProdesStencil", "Rostex", "SingleGrinch", "Transcity", "Zaslia",
  "Goca", "Logofontik", "Fear", "Monoo", "Monolite",
];

const loadedFonts = new Set<string>();

function loadGoogleFont(family: string, weights: string = "400,500,600,700") {
  if (typeof document === "undefined" || !family) return;
  if (customFonts.includes(family)) return;
  const key = `${family}-${weights}`;
  if (loadedFonts.has(key)) return;
  loadedFonts.add(key);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weights.split(",").concat(["300","400","500","600","700"]).filter((v, i, a) => a.indexOf(v) === i).join(";")}&display=swap`;
  document.head.appendChild(link);
}

function loadGoogleFontPair(gfUrl: string) {
  if (typeof document === "undefined" || !gfUrl) return;
  const href = gfUrl.startsWith("http") ? gfUrl : `https://fonts.googleapis.com/css2?family=${gfUrl}&display=swap`;
  if (loadedFonts.has(href)) return;
  loadedFonts.add(href);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

export const SiteThemeProvider = () => {
  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-theme"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["site_theme", "site_mode", "site_customizer", "title_font", "storefront_appearance", "custom_theme_colors"]);
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
  });

  useEffect(() => {
    if (!siteSettings) return;
    const mode = "dark"; // Explore is in dark maison aesthetic or adaptive to storefront
    const rawThemeId = String(siteSettings.site_theme || "cherry_vanilla");
    const themeId = legacyMap[rawThemeId] || (themeMap.has(rawThemeId) ? rawThemeId : "cherry_vanilla");
    const html = document.documentElement;

    // Clear all theme vars
    allThemeVars.forEach((v) => html.style.removeProperty(v));
    customizerVars.forEach((v) => html.style.removeProperty(v));

    let vars: Record<string, string> = {};

    if (themeId === "custom" && siteSettings.custom_theme_colors) {
      const colors = siteSettings.custom_theme_colors;
      const primaryHex = colors.primary || "#9a0002";
      const darkBgHex = colors.darkBg || "#0d0d0d";
      const lightBgHex = colors.lightBg || "#efe6dd";

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
      const db = hexToHsl(darkBgHex);
      const lb = hexToHsl(lightBgHex);
      const pfg = p.l > 55 ? `${db.h} 15% 8%` : "0 0% 98%";

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
        "--border": `${db.h} ${db.s}% ${Math.min(db.l + 10, 25)}%`,
        "--ring": `${p.h} ${p.s}% ${p.l}%`,
      };
    } else {
      const palette = themeMap.get(themeId) || themePalettes[0];
      if (palette) vars = palette.dark;
    }

    Object.entries(vars).forEach(([k, v]) => html.style.setProperty(k, v));

    // Storefront Appearance Typography Pair
    const appearance = siteSettings.storefront_appearance;
    if (appearance && typeof appearance === "object") {
      const appObj = (appearance as any).value ?? appearance;
      const pairId = appObj.typography_pair || "space-grotesk-dm-sans";
      const pair = getStorefrontTypographyPair(pairId);
      if (pair) {
        html.style.setProperty("--storefront-font-heading", pair.heading);
        html.style.setProperty("--storefront-font-body", pair.body);
        html.style.setProperty("--font-display", pair.heading);
        html.style.setProperty("--font-body", pair.body);
        if (pair.gfUrl) {
          loadGoogleFontPair(pair.gfUrl);
        }
      }
    }

    // Title font loading
    const titleFont = siteSettings.title_font;
    if (titleFont && typeof titleFont === "string") {
      html.style.setProperty("--font-title", `'${titleFont}', sans-serif`);
      loadGoogleFont(titleFont);
    }
  }, [siteSettings]);

  return null;
};
