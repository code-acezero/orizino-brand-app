"use client";
import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { BrandImage, type LogoFilter } from "@/lib/brand-image";

interface SplashScreenProps {
  visible: boolean;
}

/**
 * Minimal, Clean & Luxury App Splash Loader.
 * Features a bold, prominent brand logo mark with smooth entrance and exit transitions.
 */
const SplashScreen: React.FC<SplashScreenProps> = ({ visible }) => {
  const [logoUrl, setLogoUrl] = useState<string>("/orizino-logo.svg");
  const [siteName, setSiteName] = useState<string>("ORIZINO");
  const [titleFont, setTitleFont] = useState<string>("Instrument Serif");
  const [logoFilter, setLogoFilter] = useState<LogoFilter>("none");
  const [logoTint, setLogoTint] = useState<string>("#ffffff");

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", [
        "site_name",
        "logo_url",
        "site_icon_url",
        "title_font",
        "logo_color_filter",
        "logo_tint_color",
      ])
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, any> = {};
        data.forEach((s) => {
          const val = s.value;
          map[s.key] = typeof val === "object" && val !== null ? (val as any).value ?? val : val;
        });
        if (map.logo_url || map.site_icon_url) {
          setLogoUrl(String(map.logo_url || map.site_icon_url));
        }
        if (map.site_name) setSiteName(String(map.site_name));
        if (map.title_font) setTitleFont(String(map.title_font));
        if (map.logo_color_filter) setLogoFilter(map.logo_color_filter as LogoFilter);
        if (map.logo_tint_color) setLogoTint(String(map.logo_tint_color));
      });
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="cinematic-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-background select-none pointer-events-none"
        >
          {/* Subtle ambient backdrop radial glow */}
          <div
            aria-hidden
            className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none"
          />

          {/* Centered Large Brand Logo Showcase */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col items-center justify-center space-y-4 px-4 text-center"
          >
            {/* Prominent Large Logo */}
            <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 flex items-center justify-center">
              {logoUrl ? (
                <BrandImage
                  src={logoUrl}
                  alt={siteName}
                  filter={logoFilter}
                  customColor={logoTint}
                  className="w-full h-full object-contain drop-shadow-sm"
                />
              ) : (
                <span
                  className="text-7xl sm:text-8xl font-black text-primary select-none"
                  style={{ fontFamily: `'${titleFont}', sans-serif` }}
                >
                  {siteName.charAt(0)}
                </span>
              )}
            </div>

            {/* Brand Title Watermark */}
            <h1
              className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-[0.2em] uppercase text-foreground/80"
              style={{ fontFamily: `'${titleFont}', sans-serif` }}
            >
              {siteName}
            </h1>

            <p className="text-[9.5px] sm:text-[11px] font-mono font-medium tracking-[0.3em] uppercase text-muted-foreground/60">
              EST. 2026 • LUXURY ATELIER
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
