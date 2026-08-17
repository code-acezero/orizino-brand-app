"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { X, ArrowRight, Tag, ExternalLink } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Route matching utility:
 * Checks if current pathname matches any of the popup target route patterns.
 * If targetRoutes is not defined or empty, defaults to Home page only ("/").
 */
export function isRouteMatched(currentPath: string, targetRoutes?: string[] | string | null): boolean {
  // If targetRoutes is not set or empty, default to home page only ("/")
  if (!targetRoutes) {
    return currentPath === "/" || currentPath === "";
  }

  let list: string[] = [];
  if (Array.isArray(targetRoutes)) {
    list = targetRoutes.map((r) => String(r).trim()).filter(Boolean);
  } else if (typeof targetRoutes === "string") {
    list = targetRoutes.split(",").map((r) => r.trim()).filter(Boolean);
  }

  if (list.length === 0) {
    return currentPath === "/" || currentPath === "";
  }

  // Normalize current path (e.g. "/products/" -> "/products", "" -> "/")
  const normCurrent = (currentPath || "/").replace(/\/+$/, "") || "/";

  return list.some((pattern) => {
    const p = (pattern || "").trim();
    if (!p) return false;

    // Sitewide wildcard: all pages
    if (p === "*" || p.toLowerCase() === "all" || p === "/*") {
      return true;
    }

    // Home page pattern
    if (p === "/" || p.toLowerCase() === "home") {
      return normCurrent === "/";
    }

    const normPattern = p.replace(/\/+$/, "");

    // Wildcard prefix, e.g. "/products/*", "/product/*", "/categories/*"
    if (normPattern.endsWith("/*")) {
      const base = normPattern.slice(0, -2);
      return normCurrent === base || normCurrent.startsWith(base + "/");
    }
    if (normPattern.endsWith("*")) {
      const base = normPattern.slice(0, -1);
      return normCurrent.startsWith(base);
    }

    // Exact route match (case-insensitive)
    return normCurrent.toLowerCase() === normPattern.toLowerCase();
  });
}

/* ── Animation variants by style ── */
const getAnimationVariants = (style: string): Variants => {
  switch (style) {
    case "slide-up":
      return {
        initial: { opacity: 0, y: 60, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 40, scale: 0.96 },
      };
    case "slide-down":
      return {
        initial: { opacity: 0, y: -60, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -40, scale: 0.96 },
      };
    case "fade":
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };
    case "bounce":
      return {
        initial: { opacity: 0, scale: 0.6 },
        animate: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 350, damping: 18 } },
        exit: { opacity: 0, scale: 0.8 },
      };
    case "flip":
      return {
        initial: { opacity: 0, rotateX: 75, scale: 0.9 },
        animate: { opacity: 1, rotateX: 0, scale: 1 },
        exit: { opacity: 0, rotateX: 45, scale: 0.9 },
      };
    case "zoom":
      return {
        initial: { opacity: 0, scale: 1.2 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 1.1 },
      };
    case "scale":
    default:
      return {
        initial: { opacity: 0, scale: 0.92, y: 15 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.94, y: 10 },
      };
  }
};

/* ── Position classes ── */
const getPositionClasses = (position: string, displayType: string): string => {
  if (displayType === "banner") {
    switch (position) {
      case "top": return "items-start justify-center pt-4";
      case "bottom": return "items-end justify-center pb-4";
      default: return "items-center justify-center";
    }
  }
  if (displayType === "slide-in") {
    switch (position) {
      case "top-left": return "items-start justify-start pt-6 pl-6";
      case "top-right": return "items-start justify-end pt-6 pr-6";
      case "bottom-left": return "items-end justify-start pb-6 pl-6";
      case "bottom-right": return "items-end justify-end pb-6 pr-6";
      case "top": return "items-start justify-center pt-6";
      case "bottom": return "items-end justify-center pb-6";
      default: return "items-end justify-end pb-6 pr-6";
    }
  }
  // modal / popup default
  switch (position) {
    case "top": return "items-start justify-center pt-16";
    case "bottom": return "items-end justify-center pb-16";
    case "top-left": return "items-start justify-start pt-16 pl-6";
    case "top-right": return "items-start justify-end pt-16 pr-6";
    case "bottom-left": return "items-end justify-start pb-16 pl-6";
    case "bottom-right": return "items-end justify-end pb-16 pr-6";
    case "center":
    default: return "items-center justify-center";
  }
};

/* ── Container size by display type ── */
const getContainerClasses = (displayType: string): string => {
  switch (displayType) {
    case "banner": return "w-full max-w-2xl";
    case "slide-in": return "max-w-sm w-full";
    case "fullscreen": return "w-full h-full max-w-none rounded-none";
    default: return "max-w-md w-full";
  }
};

const HomePopup: React.FC = () => {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [popup, setPopup] = useState<any>(null);

  /* ── Query Active Popups ── */
  const { data: popups = [] } = useQuery({
    queryKey: ["active-popups-storefront"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("popups")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 1000,
  });

  const canShow = useCallback((p: any, currentPath: string): boolean => {
    if (!p || !p.is_active) return false;

    // Route matching check: default to "/" if no target_routes set
    if (!isRouteMatched(currentPath, p.target_routes)) {
      return false;
    }

    const now = new Date();
    if (p.starts_at && new Date(p.starts_at) > now) return false;
    if (p.ends_at && new Date(p.ends_at) < now) return false;

    // Views limit check
    const maxViews = Number(p.max_views) > 0 ? Number(p.max_views) : 3;
    const views = Number(localStorage.getItem(`popup_views_${p.id}`) || 0);
    if (views >= maxViews) return false;

    // Cooldown duration check
    const cooldownHours = Number(p.duration_hours) > 0 ? Number(p.duration_hours) : 24;
    const lastShown = localStorage.getItem(`popup_last_${p.id}`);
    if (lastShown) {
      const hoursSince = (Date.now() - Number(lastShown)) / (1000 * 60 * 60);
      if (hoursSince < cooldownHours) return false;
    }
    return true;
  }, []);

  useEffect(() => {
    // Reset visibility when route changes
    setVisible(false);

    if (!popups || popups.length === 0) {
      setPopup(null);
      return;
    }

    // Find the first eligible active popup that matches current route
    const eligible = popups.find((p: any) => canShow(p, pathname));
    if (!eligible) {
      setPopup(null);
      return;
    }

    setPopup(eligible);

    const triggerType = eligible.trigger_type || "timer";
    const triggerValue = Number(eligible.trigger_value) >= 0 ? Number(eligible.trigger_value) : 2000;

    if (triggerType === "immediate") {
      const t = setTimeout(() => setVisible(true), 250);
      return () => clearTimeout(t);
    }

    if (triggerType === "scroll") {
      const handleScroll = () => {
        const totalScrollable = document.body.scrollHeight - window.innerHeight;
        if (totalScrollable <= 0) return;
        const scrollPercent = (window.scrollY / totalScrollable) * 100;
        if (scrollPercent >= triggerValue) {
          setVisible(true);
          window.removeEventListener("scroll", handleScroll);
        }
      };
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }

    if (triggerType === "exit_intent") {
      const handleMouseOut = (e: MouseEvent) => {
        if (e.clientY <= 10) {
          setVisible(true);
          document.removeEventListener("mouseout", handleMouseOut);
        }
      };
      document.addEventListener("mouseout", handleMouseOut);
      return () => document.removeEventListener("mouseout", handleMouseOut);
    }

    // Default: Timer (in milliseconds, e.g. 2000 = 2 seconds)
    const timer = setTimeout(() => setVisible(true), triggerValue);
    return () => clearTimeout(timer);
  }, [popups, canShow, pathname]);

  const dismiss = () => {
    if (popup) {
      const views = Number(localStorage.getItem(`popup_views_${popup.id}`) || 0);
      localStorage.setItem(`popup_views_${popup.id}`, String(views + 1));
      localStorage.setItem(`popup_last_${popup.id}`, String(Date.now()));
    }
    setVisible(false);
  };

  if (!popup) return null;

  const animStyle = popup.animation_style || "scale";
  const position = popup.position || "center";
  const displayType = popup.display_type || "popup";
  const variants = getAnimationVariants(animStyle);
  const posClasses = getPositionClasses(position, displayType);
  const containerClasses = getContainerClasses(displayType);

  const customBg = popup.bg_color ? { backgroundColor: popup.bg_color } : {};
  const customText = popup.text_color ? { color: popup.text_color } : {};

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={`fixed inset-0 z-[150] flex p-4 sm:p-6 ${posClasses} pointer-events-auto`}
          onClick={dismiss}
        >
          {/* Backdrop Blur */}
          {displayType !== "banner" && displayType !== "slide-in" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
            />
          )}

          {/* Popup Card */}
          <motion.div
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={`relative ${containerClasses} rounded-3xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_30px_rgba(255,255,255,0.05)] border border-white/10 bg-[#0d0e12]/95 backdrop-blur-2xl flex flex-col`}
            style={{
              ...customBg,
              perspective: animStyle === "flip" ? "1000px" : undefined,
            }}
          >
            {/* Elegant Circular Close Button */}
            <button
              onClick={dismiss}
              aria-label="Close"
              className="absolute top-3.5 right-3.5 z-30 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md flex items-center justify-center border border-white/15 transition-all text-white/80 hover:text-white hover:scale-105 active:scale-95 shadow-md"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Media Banner Section */}
            {popup.image_url ? (
              <div className="relative w-full h-44 sm:h-52 overflow-hidden bg-black/40 shrink-0">
                <img
                  src={popup.image_url}
                  alt={popup.title || "Promotional Banner"}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0e12] via-transparent to-transparent opacity-90" />
              </div>
            ) : popup.video_url ? (
              <div className="relative w-full h-44 sm:h-52 overflow-hidden bg-black shrink-0">
                <video
                  src={popup.video_url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0e12] via-transparent to-transparent opacity-90" />
              </div>
            ) : null}

            {/* Copy & CTA Section */}
            <div className={`p-6 ${popup.image_url || popup.video_url ? "pt-3" : "pt-6"} space-y-3.5 flex-1 flex flex-col justify-between`}>
              <div className="space-y-2">
                <h3
                  className="text-lg sm:text-xl font-bold font-display tracking-tight text-white leading-snug"
                  style={customText.color ? customText : undefined}
                >
                  {popup.title}
                </h3>

                {popup.message && (
                  <p
                    className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-normal opacity-90"
                    style={customText.color ? customText : undefined}
                  >
                    {popup.message}
                  </p>
                )}
              </div>

              {popup.link_url && (
                <div className="pt-2">
                  <Link
                    href={popup.link_url}
                    onClick={dismiss}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-semibold tracking-wide shadow-lg transition-all active:scale-[0.98]"
                  >
                    <span>{popup.link_text || "Learn More"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HomePopup;
