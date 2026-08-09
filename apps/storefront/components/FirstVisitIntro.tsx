"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { LogoMark } from "@/components/loaders";
import { useEffectivePerf } from "@/hooks/use-perf-settings";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "orizino-intro-seen-v1";

/** Cinematic welcome — shown once per device (localStorage-gated). */
const FirstVisitIntro: React.FC = () => {
  const { lightweightMode } = useEffectivePerf();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["site-settings-intro"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["site_name", "site_icon_url"]);
      const map: Record<string, any> = {};
      data?.forEach((s) => {
        const val = s.value as any;
        map[s.key] = typeof val === "object" && val !== null ? val.value ?? val : val;
      });
      return map;
    },
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    setMounted(true);
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }
    if (lightweightMode) {
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
      return;
    }
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    }, 2600);
    const dismiss = () => {
      setVisible(false);
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    };
    window.addEventListener("scroll", dismiss, { passive: true, once: true });
    window.addEventListener("pointerdown", dismiss, { once: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", dismiss);
      window.removeEventListener("pointerdown", dismiss);
    };
  }, [lightweightMode]);

  if (!mounted) return null;
  const siteName = (settings?.site_name as string) || "";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="fv-intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(20px)" }}
          transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-background overflow-hidden"
          aria-hidden="true"
        >
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.6] }}
            transition={{ duration: 2, times: [0, 0.5, 1] }}
            style={{
              background:
                "radial-gradient(ellipse at center, hsl(var(--primary)/0.18), transparent 55%)",
            }}
          />
          <motion.div
            className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2"
            style={{
              background:
                "linear-gradient(90deg, transparent, hsl(var(--primary)/0.8), transparent)",
              filter: "blur(1px)",
            }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: [0, 1, 1], opacity: [0, 1, 0] }}
            transition={{ duration: 1.6, times: [0, 0.5, 1], ease: "easeInOut" }}
          />

          <div className="relative flex flex-col items-center gap-5">
            <motion.div
              initial={{ scale: 0.6, opacity: 0, filter: "blur(12px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <LogoMark size={120} variant="solid" uid="fv-intro-logo" showShimmer />
            </motion.div>

            {siteName && (
              <motion.div
                initial={{ opacity: 0, y: 16, letterSpacing: "0.05em" }}
                animate={{ opacity: 1, y: 0, letterSpacing: "0.35em" }}
                transition={{ delay: 0.5, duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
                className="text-[11px] font-semibold uppercase text-muted-foreground"
              >
                {siteName}
              </motion.div>
            )}
          </div>

          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 40%, hsl(var(--background)) 100%)",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FirstVisitIntro;
// code:4ce0
