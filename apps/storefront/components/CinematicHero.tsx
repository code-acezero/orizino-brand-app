"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { trackClick } from "@/hooks/use-analytics";
import { useLanguage, getLocalizedBrandName } from "@/contexts/LanguageContext";

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
  <section className="relative w-full h-[44vh] sm:h-[85vh] min-h-[260px] sm:min-h-[520px] max-h-[920px] bg-card/40 animate-pulse overflow-hidden flex items-center">
    {/* Brand mark watermark positioned on the right side where space is blank */}
    <div className="absolute right-6 sm:right-12 md:right-20 lg:right-28 top-1/2 -translate-y-1/2 pointer-events-none z-0">
      <SkeletonWatermark size="xl" />
    </div>
    <div className="w-full px-5 sm:px-9 lg:px-11 xl:px-12 pb-8 sm:pb-16 lg:pb-0 relative z-10">
      <div className="max-w-2xl flex flex-col gap-2 sm:gap-4">
        <div className="h-3 sm:h-4 w-24 sm:w-32 bg-foreground/10 rounded" />
        <div className="h-8 sm:h-16 w-3/4 bg-foreground/15 rounded-lg" />
        <div className="h-3 sm:h-4 w-1/2 bg-foreground/10 rounded" />
        <div className="h-8 sm:h-10 w-28 sm:w-36 bg-foreground/20 rounded-full mt-1 sm:mt-2" />
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
  // Detect complex non-Latin scripts (Bengali, Devanagari, Arabic, CJK, etc.)
  const isComplexScript = /[\u0980-\u09FF\u0900-\u097F\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\u1000-\u109F\u0E00-\u0E7F]/.test(text);
  const words = text.split(" ");
  const customStyle: React.CSSProperties = {
    ...style,
    fontFamily: fontFamily
      ? (FONT_FAMILY_MAP[fontFamily] || `'${fontFamily}', var(--font-title, var(--font-display))`)
      : 'var(--font-title, var(--font-display))',
    lineHeight: isComplexScript ? 1.25 : (style?.lineHeight ?? 1.18),
    letterSpacing: isComplexScript ? '0' : (style?.letterSpacing ?? '-0.01em'),
  };

  return (
    <h1 className={`${className || ''} overflow-visible py-1`} style={customStyle}>
      {words.map((word, i) => {
        const isBrandWord = /^\W*orizino/i.test(word);
        return (
          <motion.span
            key={i}
            translate={isBrandWord ? "no" : undefined}
            className={`inline-block mr-[0.25em] py-0.5 overflow-visible ${isBrandWord ? "notranslate skiptranslate brand-name" : ""}`}
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
        );
      })}
    </h1>
  );
};

const CinematicHero: React.FC = () => {
  const { language } = useLanguage();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const brandName = getLocalizedBrandName("ORIZINO", language);

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
        .eq("key", "showcase_slider_config")
        .maybeSingle();
      if (!data?.value) return null;
      const val = data.value as any;
      return val?.value ?? val;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: appearanceData } = useQuery({
    queryKey: ["site-settings-appearance"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["storefront_appearance", "title_font"]);

      const map: Record<string, any> = {};
      data?.forEach((s) => {
        const val: any = s.value;
        map[s.key] = typeof val === "object" && val !== null ? val.value ?? val : val;
      });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  const autoPlay = showcaseConfig?.auto_play !== false;
  const autoPlayInterval = (showcaseConfig?.auto_play_interval ?? 6) * 1000;
  const heroHeight = showcaseConfig?.hero_height || "88vh";
  const textPosition = showcaseConfig?.text_position || "left";
  const pauseOnHover = showcaseConfig?.pause_on_hover !== false;
  const showArrows = showcaseConfig?.show_arrows !== false;
  const showDots = showcaseConfig?.show_dots !== false;
  const imageScaleEffect = showcaseConfig?.image_scale_effect !== false;
  const idleMotion = showcaseConfig?.idle_motion || "ken_burns_zoom";
  const contentBlurVal = showcaseConfig?.content_blur || "12px";

  const titleFont =
    appearanceData?.title_font ||
    appearanceData?.storefront_appearance?.title_font ||
    undefined;

  const defaultSlides: Slide[] = [
    {
      id: "1",
      title: "Drop Shoulder Atelier",
      subtitle: "Winter Capsule 004",
      button_text: "Explore Drop",
      button_link: "/inventory",
      sort_order: 1,
    },
    {
      id: "2",
      title: "Architectural Streetwear",
      subtitle: "380 GSM Heavy French Terry",
      button_text: "Shop Heavyweight",
      button_link: "/inventory",
      sort_order: 2,
    },
    {
      id: "3",
      title: "Crafted in Dhaka",
      subtitle: "Limited Edition Pieces",
      button_text: "View Collection",
      button_link: "/inventory",
      sort_order: 3,
    },
  ];

  const slides = slidesRaw.length > 0 ? slidesRaw : defaultSlides;
  const total = slides.length;

  const goTo = useCallback(
    (index: number, dir = 1) => {
      setDirection(dir);
      setCurrent(index);
    },
    []
  );

  const next = useCallback(() => {
    goTo((current + 1) % total, 1);
  }, [current, total, goTo]);

  const prev = useCallback(() => {
    goTo((current - 1 + total) % total, -1);
  }, [current, total, goTo]);

  useEffect(() => {
    if (!autoPlay || paused || total <= 1) return;
    intervalRef.current = setInterval(next, autoPlayInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoPlay, paused, total, autoPlayInterval, next]);

  // Touch swipe support for mobile
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 48) {
      if (diff > 0) next();
      else prev();
    }
    touchStartX.current = null;
  };

  if (isLoading) {
    return <CinematicHeroSkeleton />;
  }

  const slide = slides[current] || slides[0];

  const imageVariants = {
    initial: {
      scale: imageScaleEffect ? 1.08 : 1,
      opacity: 0,
    },
    animate: {
      scale: 1,
      opacity: 1,
      transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] as const },
    },
    exit: {
      opacity: 0,
      scale: imageScaleEffect ? 0.96 : 1,
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  // Full-bleed slide wrapper
  const slideWrapperVariants = {
    initial: { opacity: 0, zIndex: 10 },
    animate: { opacity: 1, zIndex: 10, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } },
    exit: { opacity: 0, zIndex: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const } },
  };

  const textVariants = {
    initial: { opacity: 0, y: 24, filter: `blur(${contentBlurVal})` },
    animate: {
      opacity: 1, y: 0, filter: "blur(0px)",
      transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] as const },
    },
    exit: {
      opacity: 0, y: -10, filter: `blur(${contentBlurVal})`,
      transition: { duration: 0.25, ease: "easeIn" as const },
    },
  };

  // Idle motion variants
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
      className="relative w-full overflow-hidden select-none m-0 p-0 h-[44vh] sm:h-[88vh] min-h-[260px] sm:min-h-[520px] lg:min-h-[680px]"
      style={{
        height: typeof window !== "undefined" && window.innerWidth < 640 ? "44vh" : heroHeight,
      }}
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

              {/* Overlay */}
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
                  className="font-editorial brand-title text-foreground/8 dark:text-foreground/15 font-extrabold max-w-full text-center tracking-tight select-none uppercase transition-colors"
                  style={{ fontSize: "clamp(2rem, 10vw, 14rem)", lineHeight: 1 }}
                >
                  {brandName}
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

      {/* ── Content Area: Anchored towards the bottom on mobile, center-aligned with arrows on desktop ── */}
      <div
        className={`absolute inset-x-0 bottom-4 sm:bottom-auto sm:top-1/2 sm:-translate-y-3.5 flex items-start pointer-events-none z-10 ${textPosition === "center"
            ? "justify-center text-center"
            : textPosition === "right"
              ? "justify-end text-right"
              : ""
          }`}
      >
        <div className="w-full pl-9 pr-4 sm:pl-14 sm:pr-10 lg:px-14">
          <AnimatePresence mode="wait" initial={false}>
            {/* CONTENT BOX */}
            <motion.div
              key={slide.id + "-content"}
              className="w-full max-w-[340px] sm:max-w-[640px] lg:max-w-[760px] flex flex-col justify-start pointer-events-auto"
              style={{ willChange: "opacity, transform, filter" }}
              variants={textVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {/* 1. Counter Pill & Subtitle */}
              <div className="flex items-center gap-1.5 sm:gap-3 mb-1 sm:mb-2.5 shrink-0 flex-wrap">
                <span className="font-sans-brand text-foreground/80 text-[8px] sm:text-[0.62rem] tracking-[0.2em] bg-background/60 backdrop-blur-md px-2 sm:px-2.5 py-0.5 rounded-full border border-border/30 shadow-xs leading-none">
                  {String(current + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                </span>
                {slide.subtitle && (
                  <>
                    <span className="text-foreground/30 text-[9px] sm:text-[10px]">•</span>
                    <span className="font-sans-brand text-[8px] sm:text-[0.7rem] font-semibold tracking-[0.14em] sm:tracking-[0.22em] uppercase text-foreground/90 drop-shadow-xs truncate max-w-[180px] sm:max-w-none leading-none">
                      {slide.subtitle}
                    </span>
                  </>
                )}
              </div>

              {/* 2. Headline Container — Max 3 big rows */}
              <div className="flex flex-col justify-end items-start mb-0.5 sm:mb-1 overflow-visible">
                {slide.title && (
                  <KineticTitle
                    key={slide.id + "-title"}
                    text={slide.title}
                    fontFamily={titleFont}
                    className="heading-editorial text-foreground"
                    style={{
                      fontSize:
                        slide.title.length <= 35
                          ? "clamp(1.15rem, 4.8vw, 4.75rem)"
                          : slide.title.length <= 55
                            ? "clamp(1rem, 3.8vw, 3.75rem)"
                            : "clamp(0.9rem, 3vw, 3rem)",
                      lineHeight: 1.15,
                      letterSpacing: "-0.01em",
                    }}
                  />
                )}
              </div>

              {/* 3. CTA Buttons — Perfectly centered text and balanced padding */}
              <motion.div
                className="flex items-center gap-2 sm:gap-4 shrink-0 mt-1 sm:mt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                {slide.button_text && slide.button_link && (
                  <a
                    href={slide.button_link}
                    className="inline-flex items-center justify-center text-center px-3.5 py-1.5 sm:px-6 sm:py-3 rounded-full bg-primary text-primary-foreground dark:bg-foreground dark:text-background text-[10px] sm:text-xs font-sans-brand font-semibold tracking-wider uppercase hover:opacity-90 transition-all shadow-xs leading-none"
                    onClick={() => trackClick("hero_cta", slide.id, "/", { slide_title: slide.title })}
                  >
                    <span>{slide.button_text}</span>
                  </a>
                )}
                <a
                  href="/inventory"
                  className="inline-flex items-center justify-center text-center px-3.5 py-1.5 sm:px-6 sm:py-3 rounded-full bg-background/50 border border-border/50 text-foreground text-[10px] sm:text-xs font-sans-brand font-medium tracking-wider uppercase hover:bg-background/80 transition-all backdrop-blur-md leading-none"
                >
                  <span>View All</span>
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
            <ChevronLeft className="w-5 h-5 sm:w-8 sm:h-8 lg:w-9 lg:h-9 drop-shadow-md" strokeWidth={1.5} />
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
            <ChevronRight className="w-5 h-5 sm:w-8 sm:h-8 lg:w-9 lg:h-9 drop-shadow-md" strokeWidth={1.5} />
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

      {/* Dot navigation — Small, sleek micro-pills with guaranteed zero CSS button enlargement */}
      {showDots && total > 1 && (
        <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 z-20 pointer-events-auto">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i, i > current ? 1 : -1)}
              aria-label={`Go to slide ${i + 1}`}
              className="p-1 flex items-center justify-center bg-transparent border-0 outline-none !min-w-0 !min-h-0 cursor-pointer appearance-none"
            >
              <span
                className="block rounded-full transition-all duration-300 pointer-events-none"
                style={{
                  width: i === current ? 12 : 3.5,
                  height: 2.5,
                  backgroundColor: i === current ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.35)",
                }}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

export default CinematicHero;
// code:4ce0
