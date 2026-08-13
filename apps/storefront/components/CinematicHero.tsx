"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { trackClick } from "@/hooks/use-analytics";

interface Slide {
  id: string;
  title?: string;
  subtitle?: string;
  button_text?: string;
  button_link?: string;
  image_url?: string;
  mobile_image_url?: string;
  video_url?: string;
  sort_order: number;
}

import SkeletonWatermark from "@/components/skeletons/SkeletonWatermark";

const CinematicHeroSkeleton: React.FC = () => (
  <section className="relative w-full h-[85vh] min-h-[580px] max-h-[920px] bg-card/40 animate-pulse overflow-hidden flex items-center">
    {/* Brand mark watermark positioned on the right side where space is blank */}
    <div className="absolute right-6 sm:right-12 md:right-20 lg:right-28 top-1/2 -translate-y-1/2 pointer-events-none z-0">
      <SkeletonWatermark size="xl" />
    </div>
    <div className="w-full px-7 sm:px-9 lg:px-11 xl:px-12 pb-20 lg:pb-0 relative z-10">
      <div className="max-w-2xl flex flex-col gap-4">
        <div className="h-4 w-32 bg-foreground/10 rounded" />
        <div className="h-12 sm:h-16 w-3/4 bg-foreground/15 rounded-lg" />
        <div className="h-4 w-1/2 bg-foreground/10 rounded" />
        <div className="h-12 w-40 bg-foreground/20 rounded-full mt-2" />
      </div>
    </div>
  </section>
);

const EDITORIAL_BG = [
  "linear-gradient(160deg, hsl(var(--background)) 0%, hsl(var(--secondary)) 100%)",
  "linear-gradient(160deg, hsl(var(--secondary)) 0%, hsl(var(--background)) 100%)",
  "linear-gradient(160deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)",
];

const FONT_FAMILY_MAP: Record<string, string> = {
  "Playfair Display": "'Playfair Display', serif",
  "Space Grotesk": "'Space Grotesk', sans-serif",
  "DM Sans": "'DM Sans', sans-serif",
  "Inter": "'Inter', sans-serif",
  "Agraham": "'Agraham', serif",
  "Bilderberg": "'Bilderberg', serif",
  "Nevera": "'Nevera', sans-serif",
  "OrangeAvenue": "'OrangeAvenue', sans-serif",
  "PrimorStylish": "'PrimorStylish', sans-serif",
  "Goca": "'Goca', sans-serif",
  "Logofontik": "'Logofontik', sans-serif",
};

/* ── Kinetic word-by-word title ── */
const KineticTitle = ({
  text,
  className,
  style,
  fontFamily,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  fontFamily?: string;
}) => {
  const words = text.split(" ");
  const customStyle: React.CSSProperties = {
    ...style,
    fontFamily: fontFamily
      ? (FONT_FAMILY_MAP[fontFamily] || `'${fontFamily}', var(--font-title, var(--font-display))`)
      : 'var(--font-title, var(--font-display))',
  };

  return (
    <h1 className={className} style={customStyle}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block mr-[0.25em]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.55,
            delay: i * 0.06,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          {word}
        </motion.span>
      ))}
    </h1>
  );
};

const CinematicHero: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: slidesRaw = [], isLoading } = useQuery({
    queryKey: ["showcase-slides"],
    queryFn: async () => {
      const { data } = await supabase
        .from("showcase_slides")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      return (data || []) as Slide[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: showcaseConfig } = useQuery({
    queryKey: ["showcase-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "showcase_config")
        .maybeSingle();
      if (!data?.value) return null;
      const val = data.value as any;
      return val?.value ?? val;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: dbTitleFont } = useQuery({
    queryKey: ["site-title-font"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "title_font").maybeSingle();
      return (data?.value as string) || "";
    },
    staleTime: 5 * 60 * 1000,
  });

  const config = showcaseConfig || {};
  const autoplaySpeed = config.autoplay_speed ?? 6500;
  const pauseOnHover = config.pause_on_hover !== false;
  const isAutoplay = config.autoplay !== false;
  const titleFont = dbTitleFont || config.title_font || "";
  const blurLevel = config.blur_level || "cinematic"; // "none" | "subtle" | "cinematic"
  const idleMotion = config.idle_motion || "ken_burns_zoom"; // "none" | "ken_burns_zoom" | "subtle_drift" | "floating_pan"
  const heroHeight = config.height || "100svh";
  const showDots = config.show_dots !== false;
  const showArrows = config.show_arrows !== false;
  const textPosition = config.text_position || "left";

  const slides: Slide[] = slidesRaw;
  const total = slides.length;

  const goTo = useCallback(
    (idx: number, dir: number) => {
      setCurrent(idx);
      setDirection(dir);
    },
    []
  );

  const next = useCallback(() => {
    goTo((current + 1) % total, 1);
  }, [current, total, goTo]);

  const prev = useCallback(() => {
    goTo((current - 1 + total) % total, -1);
  }, [current, total, goTo]);

  // Autoplay
  useEffect(() => {
    if (!isAutoplay || (paused && pauseOnHover) || total <= 1) return;
    intervalRef.current = setInterval(next, autoplaySpeed);
    return () => clearInterval(intervalRef.current!);
  }, [isAutoplay, paused, pauseOnHover, next, autoplaySpeed, total]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  // Touch swipe
  const touchStartX = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 40) dx > 0 ? next() : prev();
  };

  if (isLoading) return <CinematicHeroSkeleton />;
  if (total === 0) return null;

  const slide = slides[current];

  // Blur mapping
  const blurVal =
    blurLevel === "none" ? "0px" : blurLevel === "subtle" ? "6px" : "14px";
  const contentBlurVal =
    blurLevel === "none" ? "0px" : blurLevel === "subtle" ? "3px" : "6px";

  // ── Seamless Gapless Image Dissolve Variants ──
  const imageVariants = {
    initial: {
      opacity: 0,
      scale: 1.05,
      filter: `blur(${blurVal})`,
    },
    animate: {
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      transition: { duration: 1.0, ease: [0.16, 1, 0.3, 1] as const },
    },
    exit: {
      opacity: 0,
      scale: 0.98,
      filter: `blur(${blurVal})`,
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  // Full-bleed slide wrapper: zero x-shift on images prevents gaps/seams between slides
  const slideWrapperVariants = {
    initial: { opacity: 0, zIndex: 10 },
    animate: { opacity: 1, zIndex: 10, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } },
    exit: { opacity: 0, zIndex: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const } },
  };

  const textVariants = {
    initial: { opacity: 0, y: 28, filter: `blur(${contentBlurVal})` },
    animate: {
      opacity: 1, y: 0, filter: "blur(0px)",
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
    },
    exit: {
      opacity: 0, y: -12, filter: `blur(${contentBlurVal})`,
      transition: { duration: 0.3, ease: "easeIn" as const },
    },
  };

  // Idle motion variants for continuous background motion
  const getIdleAnimation = () => {
    if (idleMotion === "ken_burns_zoom") {
      return { scale: [1, 1.08, 1] };
    }
    if (idleMotion === "subtle_drift") {
      return { x: ["-1%", "1%", "-1%"], y: ["-1%", "1%", "-1%"], scale: [1.03, 1.05, 1.03] };
    }
    if (idleMotion === "floating_pan") {
      return { x: ["-2%", "2%", "-2%"] };
    }
    return {};
  };

  const idleDuration =
    idleMotion === "subtle_drift" ? 16 : idleMotion === "floating_pan" ? 12 : 14;

  return (
    <section
      className="relative w-full overflow-hidden select-none m-0 p-0 min-h-[560px] sm:min-h-[620px] lg:min-h-[680px]"
      style={{ height: heroHeight, minHeight: 560 }}
      onMouseEnter={() => pauseOnHover && setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Slides */}
      <AnimatePresence mode="sync" initial={false} custom={direction}>
        <motion.div
          key={slide.id}
          className="absolute inset-0"
          style={{ willChange: "opacity, transform" }}
          custom={direction}
          variants={slideWrapperVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {/* Background media with continuous GPU idle motion */}
          {slide.video_url ? (
            <>
              <motion.div
                className="absolute inset-0 overflow-hidden"
                style={{ willChange: "filter, transform" }}
                variants={imageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <video
                  src={slide.video_url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </motion.div>
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, hsl(var(--background) / 0.55) 0%, hsl(var(--background) / 0.3) 35%, hsl(var(--background) / 0.08) 65%, transparent 100%), linear-gradient(180deg, transparent 40%, hsl(var(--background) / 0.45) 100%)",
                }}
              />
            </>
          ) : (slide.image_url || slide.mobile_image_url) ? (
            <>
              <motion.div
                className="absolute inset-0 overflow-hidden"
                style={{ willChange: "filter, transform" }}
                variants={imageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {/* Continuous Idle Motion Layer */}
                <motion.div
                  className="absolute inset-0"
                  animate={getIdleAnimation()}
                  transition={{
                    duration: idleDuration,
                    repeat: Infinity,
                    repeatType: "mirror",
                    ease: "easeInOut",
                  }}
                  style={{ willChange: "transform" }}
                >
                  {slide.mobile_image_url ? (
                    <picture className="absolute inset-0 w-full h-full">
                      <source media="(max-width: 768px)" srcSet={slide.mobile_image_url} />
                      <img
                        src={slide.image_url || slide.mobile_image_url}
                        alt={slide.title || ""}
                        className="w-full h-full object-cover"
                        loading="eager"
                        fetchPriority={current === 0 ? "high" : undefined}
                      />
                    </picture>
                  ) : (
                    <img
                      src={slide.image_url}
                      alt={slide.title || ""}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="eager"
                      fetchPriority={current === 0 ? "high" : undefined}
                    />
                  )}
                </motion.div>
              </motion.div>

              {/* Overlay — Seamless bottom shadow blend */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, hsl(var(--background) / 0.55) 0%, hsl(var(--background) / 0.3) 35%, hsl(var(--background) / 0.08) 65%, transparent 100%), linear-gradient(180deg, transparent 30%, hsl(var(--background) / 0.5) 75%, hsl(var(--background)) 100%)",
                }}
              />
            </>
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: EDITORIAL_BG[current % EDITORIAL_BG.length] }}
            >
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden px-4" aria-hidden="true">
                <span
                  className="font-editorial text-foreground/8 dark:text-foreground/15 font-extrabold max-w-full text-center tracking-tight select-none uppercase transition-colors"
                  style={{ fontSize: "clamp(3.5rem, 14vw, 14rem)", lineHeight: 1 }}
                >
                  ORIZINO
                </span>
              </div>
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, transparent 40%, hsl(var(--background) / 0.35) 100%)",
                }}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Content Area with Safe Zone Box & Auto-Scaling Typography ── */}
      <div
        className={`absolute inset-0 flex items-end lg:items-center pointer-events-none z-10 ${textPosition === "center"
            ? "justify-center text-center"
            : textPosition === "right"
              ? "justify-end text-right"
              : ""
          }`}
      >
        <div className="w-full px-5 sm:px-9 lg:px-11 xl:px-12 pb-14 sm:pb-20 lg:pb-0">
          <AnimatePresence mode="wait" initial={false}>
            {/* SAFE ZONE BOX — Fixed width layout with top counter, bottom CTA buttons, and bottom-up 3 big rows */}
            <motion.div
              key={slide.id + "-content"}
              className="w-full max-w-[480px] sm:max-w-[640px] lg:max-w-[760px] flex flex-col justify-end pointer-events-auto min-h-[280px] sm:min-h-[340px] lg:min-h-[400px]"
              style={{ willChange: "opacity, transform, filter" }}
              variants={textVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {/* 1. Counter Row — Fixed at Top */}
              <div className="flex items-center gap-2 sm:gap-3.5 mb-3 sm:mb-4 shrink-0 flex-wrap">
                <span className="font-sans-brand text-foreground/70 text-[10px] sm:text-[0.6rem] tracking-[0.2em] bg-background/50 backdrop-blur-md px-2 py-0.5 rounded-full border border-border/30">
                  {String(current + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                </span>
                {slide.subtitle && (
                  <>
                    <span className="text-foreground/30 text-xs">•</span>
                    <span className="font-sans-brand text-[10px] sm:text-[0.7rem] font-medium tracking-[0.16em] sm:tracking-[0.22em] uppercase text-foreground/90">
                      {slide.subtitle}
                    </span>
                  </>
                )}
              </div>

              {/* 2. Headline Container — Starts from Bottom above CTA Buttons, max 3 big rows */}
              <div className="flex-1 flex flex-col justify-end items-start my-auto">
                {slide.title && (
                  <KineticTitle
                    key={slide.id + "-title"}
                    text={slide.title}
                    fontFamily={titleFont}
                    className="heading-editorial text-foreground line-clamp-3"
                    style={{
                      fontSize:
                        slide.title.length <= 35
                          ? "clamp(2.25rem, 6.5vw, 4.75rem)"
                          : slide.title.length <= 55
                            ? "clamp(1.75rem, 5vw, 3.75rem)"
                            : "clamp(1.4rem, 3.8vw, 3rem)",
                      lineHeight: 1.08,
                      letterSpacing: "-0.02em",
                    }}
                  />
                )}
              </div>

              {/* 3. CTA Buttons — Fixed at Bottom */}
              <motion.div
                className="flex items-center gap-2.5 sm:gap-4 shrink-0 mt-3 sm:mt-4"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                {slide.button_text && slide.button_link && (
                  <a
                    href={slide.button_link}
                    className="px-4 py-2 sm:px-6 sm:py-3 rounded-full bg-primary text-primary-foreground dark:bg-foreground dark:text-background text-xs font-sans-brand font-semibold tracking-wider uppercase hover:opacity-90 transition-all"
                    onClick={() => trackClick("hero_cta", slide.id, "/", { slide_title: slide.title })}
                  >
                    {slide.button_text}
                  </a>
                )}
                <a href="/inventory" className="px-4 py-2 sm:px-6 sm:py-3 rounded-full bg-background/50 border border-border/50 text-foreground text-xs font-sans-brand font-medium tracking-wider uppercase hover:bg-background/80 transition-all backdrop-blur-md">
                  View All
                </a>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Navigation Arrows — Clean transparent arrows ── */}
      {showArrows && total > 1 && (
        <>
          <motion.button
            onClick={prev}
            className="absolute left-1 sm:left-2 lg:left-3 top-1/2 -translate-y-1/2 z-30 p-1 text-foreground/75 hover:text-primary dark:hover:text-foreground focus:outline-none bg-transparent transition-colors duration-200"
            whileHover={{
              x: [-4, 2, -4],
              transition: { repeat: Infinity, duration: 1.1, ease: "easeInOut" },
            }}
            style={{ willChange: "transform" }}
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 lg:w-9 lg:h-9 drop-shadow-md" strokeWidth={1.5} />
          </motion.button>

          <motion.button
            onClick={next}
            className="absolute right-1 sm:right-2 lg:right-3 top-1/2 -translate-y-1/2 z-30 p-1 text-foreground/75 hover:text-primary dark:hover:text-foreground focus:outline-none bg-transparent transition-colors duration-200"
            whileHover={{
              x: [4, -2, 4],
              transition: { repeat: Infinity, duration: 1.1, ease: "easeInOut" },
            }}
            style={{ willChange: "transform" }}
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 lg:w-9 lg:h-9 drop-shadow-md" strokeWidth={1.5} />
          </motion.button>
        </>
      )}

      {/* Scroll indicator */}
      <div className="absolute bottom-8 right-8 hidden lg:flex flex-col items-center gap-2 text-foreground/40 z-20">
        <span
          className="font-sans-brand text-[0.55rem] tracking-[0.25em] uppercase"
          style={{ writingMode: "vertical-rl" }}
        >
          Scroll
        </span>
        <ChevronDown className="w-3 h-3 animate-bounce" strokeWidth={1.5} />
      </div>

      {/* Dot navigation */}
      {showDots && total > 1 && (
        <div className="absolute bottom-5 sm:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 z-20">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i, i > current ? 1 : -1)}
              aria-label={`Go to slide ${i + 1}`}
              className="relative overflow-hidden transition-all duration-300 rounded-full"
              style={{
                width: i === current ? 18 : 5,
                height: i === current ? 3 : 3,
                backgroundColor: i === current ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.25)",
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default CinematicHero;
