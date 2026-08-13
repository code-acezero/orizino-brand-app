"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const MarqueeStrip: React.FC<{ className?: string; dark?: boolean }> = ({
  className = "",
  dark = false,
}) => {
  const bg = dark ? "bg-[hsl(var(--charcoal))]" : "bg-primary";
  const text = dark ? "text-[hsl(var(--cream))]" : "text-[hsl(var(--cream))]";

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
        map[row.key] = val?.value ?? val;
      });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div
        className={`relative overflow-hidden py-3 select-none ${bg} ${className}`}
      >
        <div className="flex items-center justify-center gap-8 py-1 opacity-40 animate-pulse">
          <div className="h-3 w-32 bg-[hsl(var(--cream))]/30 rounded-full" />
          <div className="w-3.5 h-3.5 bg-[hsl(var(--cream))]/30 rounded-full" />
          <div className="h-3 w-40 bg-[hsl(var(--cream))]/30 rounded-full" />
          <div className="w-3.5 h-3.5 bg-[hsl(var(--cream))]/30 rounded-full" />
          <div className="h-3 w-28 bg-[hsl(var(--cream))]/30 rounded-full" />
        </div>
      </div>
    );
  }

  const marqueeConfig = settingsData?.marquee_config;
  const rawWords: string[] =
    Array.isArray(marqueeConfig?.words) ? marqueeConfig.words : [];

  // If no words exist in database, return null
  if (rawWords.length === 0) return null;

  const logoUrl = settingsData?.logo_url || settingsData?.site_icon_url;

  // Build list with separator token between words.
  // The CSS animation runs translateX(-50%) on a doubled-width track,
  // so we render wordsList twice but each set is one track half.
  const wordsList = rawWords.flatMap((word) => [word, "__LOGO__"]);

  const renderItem = (item: string, i: number) => {
    if (item === "__LOGO__") {
      return logoUrl ? (
        <span key={i} className="inline-flex items-center px-4 shrink-0">
          <span
            className="h-3.5 w-3.5 bg-[hsl(var(--cream))] inline-block shrink-0 opacity-80"
            style={{
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
      ) : (
        <span key={i} className="inline-block px-4 opacity-50 text-xs">
          ✦
        </span>
      );
    }
    return (
      <span
        key={i}
        className={`inline-block px-5 font-sans-brand text-[0.65rem] font-medium tracking-[0.2em] uppercase whitespace-nowrap ${text}`}
      >
        {item}
      </span>
    );
  };

  return (
    <div
      className={`relative overflow-hidden py-3 select-none ${bg} ${className} shadow-2xl shadow-black/40`}
      aria-hidden="true"
    >
      {/* Top shadow blend */}
      <div
        className="absolute top-0 left-0 right-0 h-3 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, hsl(var(--background) / 0.4), transparent)" }}
      />
      {/* Bottom shadow blend */}
      <div
        className="absolute bottom-0 left-0 right-0 h-3 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to top, hsl(var(--background) / 0.4), transparent)" }}
      />
      {/* Left fade */}
      <div
        className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background: `linear-gradient(to right, hsl(var(--${dark ? "charcoal" : "cherry"})), transparent)` }}
      />
      {/* Right fade */}
      <div
        className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background: `linear-gradient(to left, hsl(var(--${dark ? "charcoal" : "cherry"})), transparent)` }}
      />

      {/* marquee-track picks up @keyframes marquee-scroll from app.css */}
      <div className="marquee-track items-center">
        {/* First half */}
        {wordsList.map((item, i) => renderItem(item, i))}
        {/* Second half — seamless loop */}
        {wordsList.map((item, i) => renderItem(item, wordsList.length + i))}
      </div>
    </div>
  );
};

export default MarqueeStrip;
