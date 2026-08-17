"use client";
import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@orizino/supabase/client";
import { BrandImage, type LogoFilter } from "./brand-image";
import { useLanguage, getLocalizedBrandName } from "../contexts/LanguageContext";

export type TitleGroupMode = "single" | "1-1" | "2-2" | "1-2" | "custom";
export type TitleSource = "text" | "image";

export interface BrandIdentity {
  siteName: string;
  logoUrl: string;
  iconUrl: string;
  titleSource: TitleSource;
  titleImageUrl: string;
  titleColorFilter: LogoFilter;
  titleTintColor: string;
  titleGroupMode: TitleGroupMode;
  titleGroupCustom: number[];
  titleFont: string;
  titleLetterColors: Record<number, string>;
  brandTitleSizeNav: number;
  brandLogoTitleRatio: number;
}

const readVal = (v: unknown) =>
  typeof v === "object" && v !== null ? (v as any).value ?? v : v;

const VALID_FILTERS: LogoFilter[] = ["none", "white", "black", "invert", "accent", "custom"];

export type BrandApp = "masterpanel" | "company" | "storefront";

const BRAND_KEYS = [
  "site_name", "logo_url", "site_icon_url",
  "title_source", "title_image_url", "title_group_mode", "title_group_custom",
  "title_font", "title_letter_colors",
  "title_color_filter", "title_tint_color",
  "brand_title_size_nav", "brand_logo_title_ratio",
] as const;

const loadedGoogleFonts = new Set<string>();
export function loadGoogleFont(family: string, weight = 700) {
  if (typeof document === "undefined" || !family) return;
  const key = `${family}@${weight}`;
  if (loadedGoogleFonts.has(key)) return;
  loadedGoogleFonts.add(key);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}&display=swap`;
  link.setAttribute("data-brand-font", "1");
  document.head.appendChild(link);
}

export function useBrandIdentity(app?: BrandApp) {
  return useQuery({
    queryKey: ["brand-identity", app ?? "global"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<BrandIdentity> => {
      const keys = app
        ? [...BRAND_KEYS, ...BRAND_KEYS.map((k) => `${k}:${app}`)]
        : [...BRAND_KEYS];
      const raw: Record<string, any> = {};

      try {
        const res = await fetch(`/api/site-settings?keys=${keys.join(",")}`, {
          headers: { "Accept": "application/json" },
        });
        if (res.ok) {
          const json = await res.json();
          if (json && typeof json === "object" && !json.error) {
            Object.assign(raw, json);
          }
        }
      } catch {
        // fallback
      }

      if (Object.keys(raw).length === 0) {
        const { data } = await supabase
          .from("site_settings")
          .select("key, value")
          .in("key", keys);
        data?.forEach((s) => { raw[s.key] = readVal(s.value); });
      }

      // Resolve each key: app-scoped override wins, else global
      const m: Record<string, any> = {};
      BRAND_KEYS.forEach((k) => {
        const scoped = app ? raw[`${k}:${app}`] : undefined;
        m[k] = scoped !== undefined && scoped !== null && scoped !== "" ? scoped : raw[k];
      });
      return {
        siteName:          String(m.site_name ?? ""),
        logoUrl:           String(m.logo_url ?? ""),
        iconUrl:           String(m.site_icon_url ?? ""),
        titleSource:       (m.title_source === "image" ? "image" : "text"),
        titleImageUrl:     String(m.title_image_url ?? ""),
        titleColorFilter:  (VALID_FILTERS.includes(m.title_color_filter) ? m.title_color_filter : "none") as LogoFilter,
        titleTintColor:    String(m.title_tint_color ?? "#ffffff"),
        titleGroupMode:    (["single","1-1","2-2","1-2","custom"].includes(m.title_group_mode) ? m.title_group_mode : "single") as TitleGroupMode,
        titleGroupCustom:  Array.isArray(m.title_group_custom)
          ? (m.title_group_custom as any[]).map((n) => Math.max(1, Number(n) || 1))
          : [],
        titleFont:         String(m.title_font ?? ""),
        titleLetterColors: (m.title_letter_colors && typeof m.title_letter_colors === "object")
          ? (m.title_letter_colors as Record<number, string>)
          : {},
        brandTitleSizeNav: Number(m.brand_title_size_nav) || 20,
        brandLogoTitleRatio: Number(m.brand_logo_title_ratio) || 1.0,
      };
    },
  });
}

/** Split a title string into visual chunks based on group mode. */
export function groupTitle(text: string, mode: TitleGroupMode, custom?: number[]): string[] {
  if (!text) return [];
  if (mode === "single") return [text];
  const chars = Array.from(text);
  const out: string[] = [];
  if (mode === "1-1") return chars;
  if (mode === "2-2") {
    for (let i = 0; i < chars.length; i += 2) out.push(chars.slice(i, i + 2).join(""));
    return out;
  }
  if (mode === "custom") {
    const sizes = (custom || []).map((n) => Math.max(1, Math.floor(Number(n) || 1)));
    if (!sizes.length) return [text];
    let i = 0, k = 0;
    while (i < chars.length) {
      const take = sizes[k % sizes.length];
      out.push(chars.slice(i, i + take).join(""));
      i += take; k += 1;
    }
    return out;
  }
  // "1-2": alternating chunk sizes 1,2,1,2,...
  let i = 0, take = 1;
  while (i < chars.length) {
    out.push(chars.slice(i, i + take).join(""));
    i += take;
    take = take === 1 ? 2 : 1;
  }
  return out;
}

interface BrandTitleProps {
  className?: string;
  imageClassName?: string;
  /** Space between chunks (Tailwind class or inline gap in px) */
  gapClassName?: string;
  /** Fallback title when settings haven't loaded yet */
  fallback?: string;
  /** Override — force image mode off (e.g. footer wants text only) */
  forceText?: boolean;
  /** Optional app scope to prefer per-app overrides */
  app?: BrandApp;
  /** Optional override font size */
  fontSize?: string | number;
}

/**
 * Universal brand title. Reads config from site_settings and renders
 * either an uploaded image title or natural word / grouped text with per-letter colors.
 */
export function BrandTitle({
  className,
  imageClassName,
  gapClassName = "gap-[0.15em]",
  fallback = "",
  forceText = false,
  app,
  fontSize,
}: BrandTitleProps) {
  const { language } = useLanguage();
  const { data } = useBrandIdentity(app);

  useEffect(() => {
    if (data?.titleFont) {
      loadGoogleFont(data.titleFont);
    }
  }, [data?.titleFont]);

  const rawSiteName = data?.siteName || fallback;
  const siteName = getLocalizedBrandName(rawSiteName, language);
  const useImage = !forceText && data?.titleSource === "image" && !!data.titleImageUrl;

  if (useImage) {
    return (
      <BrandImage
        src={data!.titleImageUrl}
        alt={siteName || "Site title"}
        filter={data!.titleColorFilter}
        customColor={data!.titleTintColor}
        className={imageClassName || "h-6 w-auto"}
      />
    );
  }

  if (!siteName) return null;
  const mode = data?.titleGroupMode || "single";
  const colors = data?.titleLetterColors || {};
  const style: React.CSSProperties = {
    fontFamily: data?.titleFont ? `'${data.titleFont}', sans-serif` : undefined,
    fontSize: fontSize !== undefined ? (typeof fontSize === "number" ? `${fontSize}px` : fontSize) : undefined,
  };

  // When in "single" mode (single word), render continuously so custom font ligatures,
  // kerning, and cursive connections are completely preserved without character separation.
  if (mode === "single") {
    const singleColor = colors[0];
    return (
      <span
        className={(className ?? "") + " inline-block"}
        style={{ ...style, color: singleColor || undefined }}
        translate="no"
      >
        {siteName}
      </span>
    );
  }

  const chunks = groupTitle(siteName, mode, data?.titleGroupCustom);

  return (
    <span
      className={(className ?? "") + " inline-flex items-baseline " + gapClassName}
      style={style}
      translate="no"
    >
      {chunks.map((chunk, ci) => {
        const c = colors[ci];
        return (
          <span key={ci} className="inline-flex" style={c ? { color: c } : undefined}>
            {chunk}
          </span>
        );
      })}
    </span>
  );
}
// code:4ce0
