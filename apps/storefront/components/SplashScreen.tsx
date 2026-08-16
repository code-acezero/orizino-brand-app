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
          {/* Centered Luxury Brand Logo & Title Watermark */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col items-center justify-center space-y-3 sm:space-y-4 px-6 text-center max-w-sm sm:max-w-md w-full"
          >
            {/* Watermark Logo with gentle luxury opacity */}
            <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 flex items-center justify-center opacity-30 transition-opacity">
              {logoUrl ? (
                <BrandImage
                  src={logoUrl}
                  alt={siteName}
                  filter={logoFilter}
                  customColor={logoTint}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span
                  className="text-6xl sm:text-7xl md:text-8xl font-black text-foreground select-none"
                  style={{ fontFamily: `'${titleFont}', sans-serif` }}
                >
                  {siteName.charAt(0)}
                </span>
              )}
            </div>

            {/* Brand Title Watermark */}
            <h1
              className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-[0.25em] uppercase text-foreground/40"
              style={{ fontFamily: `'${titleFont}', sans-serif` }}
            >
              {siteName}
            </h1>

            <p className="text-[9px] sm:text-[10px] font-mono tracking-[0.35em] uppercase text-muted-foreground/40">
              EST. 2026 • LUXURY ATELIER
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
