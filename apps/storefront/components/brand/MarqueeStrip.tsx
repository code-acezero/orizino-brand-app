"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_MARQUEE_WORDS = [
  "ORIZINO ATELIER",
  "ARCHITECTURAL STREETWEAR",
  "HEAVYWEIGHT TEXTILES",
  "BESPOKE CRAFTSMANSHIP",
  "LIMITED EDITION DROPS",
  "TIMELESS SILHOUETTES",
];

// Signature Cherry Cola Red & Cream Vanilla
const CHERRY_COLA_RED = "#9a0002";
const CREAM_WHITE = "#efe6dd";
const MIDNIGHT_CHARCOAL = "#1c1c1a";

interface MarqueeConfig {
  words?: string[];
  speed_seconds?: number;
  direction?: "left" | "right";
  pause_on_hover?: boolean;
  separator_type?: "logo" | "star" | "bullet" | "slash" | "custom";
  custom_separator?: string;
  // Primary strip
  bg_mode?: "accent" | "cherry" | "dark" | "vanilla" | "custom";
  custom_bg?: string;
  custom_text?: string;
  // Secondary strip (lower on page)
  strip2_bg_mode?: "dark" | "accent" | "cherry" | "vanilla" | "custom";
  strip2_custom_bg?: string;
  strip2_custom_text?: string;
  font_tracking?: "normal" | "wide" | "luxury" | "ultra";
  font_size?: "micro" | "small" | "medium" | "large";
  edge_fade?: boolean;
}

const MarqueeStrip: React.FC<{ className?: string; dark?: boolean }> = ({
  className = "",
  dark = false, // false = 1st strip (under slider), true = 2nd strip (section divider)
}) => {
  // Fetch marquee config and logo assets from site_settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["marquee-and-branding-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["marquee_config", "site_icon_url", "logo_url"]);

      if (error) throw error;

      const map: Record<string, any> = {};
      data?.forEach((row) => {
        const val = row.value as any;
        map[row.key] = typeof val === "object" && val !== null ? val.value ?? val : val;
      });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  const marqueeConfig: MarqueeConfig | undefined = settingsData?.marquee_config;

  // Resolve active background & text color mode for strip 1 vs strip 2
  const activeMode = dark
    ? marqueeConfig?.strip2_bg_mode || "dark"
    : marqueeConfig?.bg_mode || "accent";

  const resolvedBg = (() => {
    if (activeMode === "accent" || activeMode === "cherry") return "hsl(var(--accent, 359 100% 30%))";
    if (activeMode === "dark") return "hsl(var(--card, 0 0% 11%))";
    if (activeMode === "vanilla") return CREAM_WHITE;
    if (activeMode === "custom") {
      return dark
        ? marqueeConfig?.strip2_custom_bg || MIDNIGHT_CHARCOAL
        : marqueeConfig?.custom_bg || CHERRY_COLA_RED;
    }
    return dark ? "hsl(var(--card, 0 0% 11%))" : "hsl(var(--accent, 359 100% 30%))";
  })();

  const resolvedText = (() => {
    if (activeMode === "accent" || activeMode === "cherry") return "hsl(var(--accent-foreground, 30 33% 95%))";
    if (activeMode === "dark") return "hsl(var(--card-foreground, 0 0% 98%))";
    if (activeMode === "vanilla") return dark ? MIDNIGHT_CHARCOAL : CHERRY_COLA_RED;
    if (activeMode === "custom") {
      return dark
        ? marqueeConfig?.strip2_custom_text || "#fafafa"
        : marqueeConfig?.custom_text || CREAM_WHITE;
    }
    return dark ? "hsl(var(--card-foreground, 0 0% 98%))" : "hsl(var(--accent-foreground, 30 33% 95%))";
  })();

  if (isLoading) {
    return (
      <div
        suppressHydrationWarning
        className={`relative overflow-hidden py-2 sm:py-2.5 select-none ${className}`}
        style={{
          backgroundColor: resolvedBg,
          color: resolvedText,
          border: "none",
        }}
      >
        <div suppressHydrationWarning className="flex items-center justify-center gap-6 sm:gap-8 py-0.5 opacity-40 animate-pulse">
          <div className="h-2.5 sm:h-3 w-28 sm:w-32 bg-current opacity-40 rounded-full" />
          <div className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 bg-current opacity-40 rounded-full" />
          <div className="h-2.5 sm:h-3 w-32 sm:w-40 bg-current opacity-40 rounded-full" />
          <div className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 bg-current opacity-40 rounded-full" />
        </div>
      </div>
    );
  }

  const configuredWords: string[] = Array.isArray(marqueeConfig?.words)
    ? marqueeConfig.words.filter(Boolean)
    : [];
  const rawWords: string[] = configuredWords.length > 0 ? configuredWords : DEFAULT_MARQUEE_WORDS;

  const logoUrl = settingsData?.logo_url || settingsData?.site_icon_url;
  const speedSeconds = marqueeConfig?.speed_seconds || 25;
  const direction = marqueeConfig?.direction || "left";
  const pauseOnHover = marqueeConfig?.pause_on_hover !== false;
  const separatorType = marqueeConfig?.separator_type || (logoUrl ? "logo" : "star");
  const edgeFade = marqueeConfig?.edge_fade !== false;

  // Typography helpers
  const trackingClass = (() => {
    const t = marqueeConfig?.font_tracking;
    if (t === "normal") return "tracking-normal";
    if (t === "wide") return "tracking-wider";
    if (t === "ultra") return "tracking-[0.26em] sm:tracking-[0.3em]";
    return "tracking-[0.18em] sm:tracking-[0.22em]";
  })();

  const sizeClass = (() => {
    const s = marqueeConfig?.font_size;
    if (s === "micro") return "text-[0.55rem] sm:text-[0.6rem]";
    if (s === "medium") return "text-[0.68rem] sm:text-[0.75rem]";
    if (s === "large") return "text-[0.75rem] sm:text-[0.85rem]";
    return "text-[0.62rem] sm:text-[0.68rem]";
  })();

  // Build list with separator token between words
  const wordsList = rawWords.flatMap((word) => [word, "__LOGO__"]);

  const renderItem = (item: string, i: number) => {
    if (item === "__LOGO__") {
      if (separatorType === "logo" && logoUrl) {
        return (
          <span key={i} className="inline-flex items-center px-2.5 sm:px-4 shrink-0 notranslate skiptranslate" translate="no">
            <span
              className="h-3 w-3 sm:h-3.5 sm:w-3.5 inline-block shrink-0 opacity-90 notranslate"
              style={{
                backgroundColor: resolvedText,
                maskImage: `url("${logoUrl}")`,
                WebkitMaskImage: `url("${logoUrl}")`,
                maskSize: "contain",
                WebkitMaskSize: "contain",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskPosition: "center",
                WebkitMaskPosition: "center",
              }}
              role="img"
              aria-label="Orizino"
            />
          </span>
        );
      }

      const sepChar =
        separatorType === "star"
          ? "✦"
          : separatorType === "bullet"
          ? "•"
          : separatorType === "slash"
          ? "/"
          : marqueeConfig?.custom_separator || "✦";

      return (
        <span key={i} suppressHydrationWarning className="inline-block px-2.5 sm:px-4 opacity-80 text-[10px] sm:text-xs notranslate" style={{ color: resolvedText }} translate="no">
          {sepChar}
        </span>
      );
    }

    return (
      <span
        key={i}
        suppressHydrationWarning
        className={`inline-block px-3 sm:px-5 font-sans-brand font-bold uppercase whitespace-nowrap notranslate skiptranslate ${sizeClass} ${trackingClass}`}
        style={{ color: resolvedText }}
        translate="no"
      >
        {item}
      </span>
    );
  };

  return (
    <div
      suppressHydrationWarning
      className={`relative overflow-hidden py-2 sm:py-2.5 select-none notranslate skiptranslate ${className}`}
      style={{
        backgroundColor: resolvedBg,
        color: resolvedText,
        border: "none",
        outline: "none",
        boxShadow: "none",
      }}
      aria-hidden="true"
      translate="no"
    >
      {/* Left fade matching the active background (narrower on mobile to avoid obscuring text) */}
      {edgeFade && (
        <div
          suppressHydrationWarning
          className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 lg:w-24 z-10 pointer-events-none"
          style={{ background: `linear-gradient(to right, ${resolvedBg}, transparent)` }}
        />
      )}
      {/* Right fade matching the active background */}
      {edgeFade && (
        <div
          suppressHydrationWarning
          className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 lg:w-24 z-10 pointer-events-none"
          style={{ background: `linear-gradient(to left, ${resolvedBg}, transparent)` }}
        />
      )}

      {/* marquee-track picks up @keyframes marquee-scroll from app.css */}
      <div
        suppressHydrationWarning
        className="marquee-track items-center"
        style={{
          animationDuration: `${speedSeconds}s`,
          animationDirection: direction === "right" ? "reverse" : "normal",
          animationPlayState: pauseOnHover ? undefined : "running",
        }}
      >
        {/* First half */}
        {wordsList.map((item, i) => renderItem(item, i))}
        {/* Second half — seamless loop */}
        {wordsList.map((item, i) => renderItem(item, wordsList.length + i))}
      </div>
    </div>
  );
};

export default MarqueeStrip;
