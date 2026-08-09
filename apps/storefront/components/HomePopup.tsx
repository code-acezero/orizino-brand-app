"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { X } from "lucide-react";

/* ── Animation variants by style ── */
const getAnimationVariants = (style: string): Variants => {
  switch (style) {
    case "slide-up":
      return { initial: { opacity: 0, y: 80 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 80 } };
    case "slide-down":
      return { initial: { opacity: 0, y: -80 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -80 } };
    case "slide-left":
      return { initial: { opacity: 0, x: -80 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -80 } };
    case "slide-right":
      return { initial: { opacity: 0, x: 80 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 80 } };
    case "fade":
      return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
    case "bounce":
      return {
        initial: { opacity: 0, scale: 0.3 },
        animate: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 15 } },
        exit: { opacity: 0, scale: 0.3 },
      };
    case "flip":
      return { initial: { opacity: 0, rotateX: 90 }, animate: { opacity: 1, rotateX: 0 }, exit: { opacity: 0, rotateX: 90 } };
    case "zoom":
      return { initial: { opacity: 0, scale: 1.3 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 1.3 } };
    case "scale":
    default:
      return { initial: { opacity: 0, scale: 0.9, y: 20 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.9, y: 20 } };
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
      case "top-left": return "items-start justify-start pt-4 pl-4";
      case "top-right": return "items-start justify-end pt-4 pr-4";
      case "bottom-left": return "items-end justify-start pb-4 pl-4";
      case "bottom-right": return "items-end justify-end pb-4 pr-4";
      case "top": return "items-start justify-center pt-4";
      case "bottom": return "items-end justify-center pb-4";
      default: return "items-center justify-center";
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
    default: return "max-w-md w-full";
  }
};

const HomePopup: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [popup, setPopup] = useState<any>(null);

  const { data: popups = [] } = useQuery({
    queryKey: ["active-popups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("popups")
        .select("*")
        .eq("is_active", true)
        .lte("starts_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const canShow = useCallback((p: any): boolean => {
    if (p.ends_at && new Date(p.ends_at) < new Date()) return false;
    const views = Number(localStorage.getItem(`popup_views_${p.id}`) || 0);
    if (views >= (p.max_views || 1)) return false;
    const lastShown = localStorage.getItem(`popup_last_${p.id}`);
    if (lastShown) {
      const hoursSince = (Date.now() - Number(lastShown)) / (1000 * 60 * 60);
      if (hoursSince < (p.duration_hours || 24)) return false;
    }
    return true;
  }, []);

  useEffect(() => {
    if (popups.length === 0) return;
    const p = popups[0] as any;
    if (!canShow(p)) return;

    setPopup(p);

    const triggerType = p.trigger_type || "timer";
    const triggerValue = p.trigger_value ?? 1500;

    if (triggerType === "scroll") {
      const handler = () => {
        const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
        if (scrollPercent >= triggerValue) {
          setVisible(true);
          window.removeEventListener("scroll", handler);
        }
      };
      window.addEventListener("scroll", handler, { passive: true });
      return () => window.removeEventListener("scroll", handler);
    }

    if (triggerType === "exit_intent") {
      const handler = (e: MouseEvent) => {
        if (e.clientY <= 5) {
          setVisible(true);
          document.removeEventListener("mouseout", handler);
        }
      };
      document.addEventListener("mouseout", handler);
      return () => document.removeEventListener("mouseout", handler);
    }

    // Default: timer (triggerValue in ms)
    const timer = setTimeout(() => setVisible(true), triggerValue);
    return () => clearTimeout(timer);
  }, [popups, canShow]);

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

  // Custom colors
  const customBg = popup.bg_color ? { backgroundColor: popup.bg_color } : {};
  const customText = popup.text_color ? { color: popup.text_color } : {};
  const hasCustomBg = !!popup.bg_color;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[100] flex p-4 ${posClasses}`}
          onClick={dismiss}
        >
          {/* Backdrop — skip for banners/slide-ins unless centered */}
          {displayType !== "banner" && displayType !== "slide-in" && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
          )}

          <motion.div
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={(e) => e.stopPropagation()}
            className={`relative shadow-2xl ${containerClasses} ${
              hasCustomBg ? "rounded-3xl" : "glass-strong rounded-3xl"
            } max-h-[85vh] flex flex-col overflow-hidden`}
            style={{
              ...customBg,
              perspective: animStyle === "flip" ? "800px" : undefined,
            }}
          >
            <button
              onClick={dismiss}
              aria-label="Close"
              className="absolute top-2.5 right-2.5 z-20 w-9 h-9 rounded-full bg-black/55 hover:bg-black/75 backdrop-blur-md flex items-center justify-center shadow-lg ring-1 ring-white/20 transition-colors"
            >
              <X className="w-4 h-4 text-white" strokeWidth={2.5} />
            </button>

            <div className="overflow-y-auto overscroll-contain">
              {popup.video_url ? (
                <video src={popup.video_url} className="w-full h-48 object-cover flex-shrink-0" autoPlay muted loop playsInline />
              ) : popup.image_url ? (
                <img src={popup.image_url} alt="" className="w-full h-48 object-cover flex-shrink-0" />
              ) : null}

              <div className="p-6 space-y-3">
                <h3
                  className="text-xl font-bold font-display pr-10"
                  style={customText.color ? customText : undefined}
                >
                  {!customText.color && <span className="text-foreground">{popup.title}</span>}
                  {customText.color && popup.title}
                </h3>
                {popup.message && (
                  <p
                    className={customText.color ? "text-sm opacity-80" : "text-sm text-muted-foreground"}
                    style={customText.color ? customText : undefined}
                  >
                    {popup.message}
                  </p>
                )}
                {popup.link_url && (
                  <a
                    href={popup.link_url}
                    onClick={dismiss}
                    className="inline-block btn-pill bg-gradient-primary text-primary-foreground font-semibold px-6 py-2.5 text-sm"
                  >
                    {popup.link_text || "Learn More"}
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HomePopup;
// code:4ce0
