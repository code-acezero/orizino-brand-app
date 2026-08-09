"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@orizino/supabase/client";
import { BrandImage, type LogoFilter } from "./brand-image";

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
] as const;

export function useBrandIdentity(app?: BrandApp) {
  return useQuery({
    queryKey: ["brand-identity", app ?? "global"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<BrandIdentity> => {
      const keys = app
        ? [...BRAND_KEYS, ...BRAND_KEYS.map((k) => `${k}:${app}`)]
        : [...BRAND_KEYS];
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", keys);
      const raw: Record<string, any> = {};
      data?.forEach((s) => { raw[s.key] = readVal(s.value); });
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
}

/**
 * Universal brand title. Reads config from site_settings and renders
 * either an uploaded image title or grouped text with per-letter colors.
 */
export function BrandTitle({
  className,
  imageClassName,
  gapClassName = "gap-[0.15em]",
  fallback = "",
  forceText = false,
  app,
}: BrandTitleProps) {
  const { data } = useBrandIdentity(app);


  const siteName = data?.siteName || fallback;
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
  const chunks = groupTitle(siteName, mode, data?.titleGroupCustom);
  const colors = data?.titleLetterColors || {};
  const style = data?.titleFont ? { fontFamily: `'${data.titleFont}', sans-serif` } : undefined;

  // Colors are keyed by group index (chunk index). In "single" mode there's
  // one group; in "1-1" every letter is its own group; in "2-2" / "1-2" /
  // "custom" every visual chunk shares one color.
  return (
    <span
      className={(className ?? "") + " inline-flex items-baseline " + gapClassName}
      style={style}
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
