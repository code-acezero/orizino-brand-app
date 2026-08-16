"use client";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { trackClick } from "@/hooks/use-analytics";
import ParticleOverlay from "@/components/slider/ParticleOverlay";

interface ShowcaseConfig {
  autoplay_speed: number;
  transition_duration: number;
  height: string;
  overlay_style: string;
  overlay_opacity: number;
  text_position: string;
  text_max_width: string;
  ken_burns: boolean;
  show_dots: boolean;
  show_arrows: boolean;
  dot_style: string;
  title_size: string;
  subtitle_style: string;
  cta_style: string;
  border_radius: string;
  autoplay: boolean;
  pause_on_hover: boolean;
  transition_type: string;
  parallax_intensity: number;
  content_animation: string;
  slide_gap: string;
  particle_count: number;
  particle_speed: number;
  particle_size: number;
  show_particles: boolean;
  show_vignette: boolean;
}

const defaultConfig: ShowcaseConfig = {
  autoplay_speed: 6000,
  transition_duration: 800,
  height: "50vh",
  overlay_style: "gradient-left",
  overlay_opacity: 80,
  text_position: "left",
  text_max_width: "2xl",
  ken_burns: true,
  show_dots: true,
  show_arrows: true,
  dot_style: "pill",
  title_size: "7xl",
  subtitle_style: "badge",
  cta_style: "gradient",
  border_radius: "none",
  autoplay: true,
  pause_on_hover: true,
  transition_type: "fade",
  parallax_intensity: 20,
  content_animation: "slide-up",
  slide_gap: "0",
  particle_count: 40,
  particle_speed: 1,
  particle_size: 1,
  show_particles: true,
  show_vignette: true,
};

const ParallaxSlider: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const [paused, setPaused] = useState(false);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const touchStartX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollY = useMotionValue(0);

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  // Reduced parallax: image moves only ±5px, text ±2px — subtle depth without breaking the effect
  const imgX = useSpring(useTransform(mouseX, [0, 1], [5, -5]), { stiffness: 120, damping: 35 });
  const imgY = useSpring(useTransform(mouseY, [0, 1], [4, -4]), { stiffness: 120, damping: 35 });
  const textX = useSpring(useTransform(mouseX, [0, 1], [-2, 2]), { stiffness: 140, damping: 35 });
  const textY = useSpring(useTransform(mouseY, [0, 1], [-1.5, 1.5]), { stiffness: 140, damping: 35 });

  // Very subtle 3D tilt
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [0.5, -0.5]), { stiffness: 140, damping: 35 });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-0.7, 0.7]), { stiffness: 140, damping: 35 });

  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (isMobile || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  }, [mouseX, mouseY, isMobile]);

  const onMouseLeaveReset = useCallback(() => {
    setPaused(false);
    mouseX.set(0.5);
    mouseY.set(0.5);
  }, [mouseX, mouseY]);


  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const viewH = window.innerHeight;
      if (rect.bottom > 0 && rect.top < viewH) {
        scrollY.set(rect.top);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [scrollY]);

  const parallaxScrollY = useTransform(scrollY, [300, -300], [-15, 15]);
  const smoothScrollY = useSpring(parallaxScrollY, { stiffness: 120, damping: 35 });

  const { data: dbSlides = [] } = useQuery({
    queryKey: ["showcase-slides"],
    queryFn: async () => {
      const { data, error } = await supabase.from("showcase_slides").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: titleFont } = useQuery({
    queryKey: ["site-title-font"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "title_font").maybeSingle();
      return (data?.value as string) || "";
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: configData } = useQuery({
    queryKey: ["showcase-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("value").eq("key", "showcase_config").maybeSingle();
      if (error) throw error;
      if (!data?.value) return defaultConfig;
      const val = data.value as any;
      return { ...defaultConfig, ...(val?.value ?? val) };
    },
    staleTime: 5 * 60 * 1000,
  });

  const cfg = configData || defaultConfig;

  const slides = useMemo(() => dbSlides.map((s: any) => ({
    id: s.id,
    title: s.title,
    subtitle: s.subtitle || "",
    description: s.description || "",
    image: s.image_url,
    video: s.video_url || "",
    cta: s.cta_text || "",
    ctaLink: s.cta_link || "/inventory",
    textAlign: (s.text_align as string) || "left",
  })), [dbSlides]);

  // Measure container size — re-run when slides load so ref is attached
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setContainerSize({ w: rect.width, h: rect.height });
    }
    const ro = new ResizeObserver(([entry]) => {
      setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [slides.length]);

  const wrap = useCallback((n: number) => ((n % slides.length) + slides.length) % slides.length, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || !cfg.autoplay || paused) return;
    const timer = setInterval(() => {
      setDirection(1);
      setCurrent((p) => wrap(p + 1));
    }, cfg.autoplay_speed);
    return () => clearInterval(timer);
  }, [slides.length, cfg.autoplay, cfg.autoplay_speed, paused, wrap]);

  const goPrev = useCallback(() => { setDirection(-1); setCurrent((c) => wrap(c - 1)); }, [wrap]);
  const goNext = useCallback(() => { setDirection(1); setCurrent((c) => wrap(c + 1)); }, [wrap]);

  useEffect(() => { slides.forEach((s) => { const img = new Image(); img.src = s.image; }); }, [slides]);

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.changedTouches[0].screenX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].screenX - touchStartX.current;
    if (diff < -50) goNext();
    if (diff > 50) goPrev();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  if (slides.length === 0) return null;
  const currentSlide = slides[current];
  if (!currentSlide) return null;

  const dur = cfg.transition_duration / 1000;

  const imageVariants = {
    enter: (d: number) => ({
      x: d > 0 ? "4%" : "-4%",
      scale: 1.03,
      opacity: 0,
      filter: "brightness(0.6)",
    }),
    center: {
      x: "0%",
      scale: 1,
      opacity: 1,
      filter: "brightness(1)",
      transition: { duration: dur, ease: [0.25, 0.46, 0.45, 0.94] as const },
    },
    exit: (d: number) => ({
      x: d > 0 ? "-4%" : "4%",
      scale: 0.98,
      opacity: 0,
      filter: "brightness(0.6)",
      transition: { duration: dur * 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const },
    }),
  };

  const textVariants = {
    enter: { opacity: 0, y: 30, scale: 0.98 },
    center: {
      opacity: 1, y: 0, scale: 1,
      transition: { duration: 0.5, delay: dur * 0.35, ease: "easeOut" as const },
    },
    exit: { opacity: 0, y: -15, scale: 0.98, transition: { duration: 0.25 } },
  };

  const ctaClasses: Record<string, string> = {
    gradient: "bg-gradient-primary text-primary-foreground",
    solid: "bg-primary text-primary-foreground",
    outline: "border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground",
    ghost: "bg-background/20 backdrop-blur text-foreground border border-foreground/20",
  };

  const subtitleEl = (text: string) => {
    if (!text) return null;
    if (cfg.subtitle_style === "badge") return <span className="inline-block rounded-full bg-primary/20 text-primary text-[10px] md:text-xs lg:text-sm px-3 md:px-4 py-0.5 md:py-1 mb-2 md:mb-3 font-medium">{text}</span>;
    if (cfg.subtitle_style === "underline") return <span className="inline-block text-primary text-[10px] md:text-xs lg:text-sm mb-2 md:mb-3 border-b-2 border-primary pb-0.5 md:pb-1">{text}</span>;
    return <span className="inline-block text-primary text-[10px] md:text-xs lg:text-sm mb-2 md:mb-3 font-medium">{text}</span>;
  };

  const renderDot = (i: number, variant: "mobile" | "desktop" = isMobile ? "mobile" : "desktop") => {
    const active = i === current;
    // Mobile: force tiny indicators because global mobile touch-target styles enlarge buttons.
    if (variant === "mobile") {
      return (
        <button key={i} onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
          aria-label={`Go to slide ${i + 1}`}
          className={`block shrink-0 rounded-full p-0 !min-h-0 !min-w-0 transition-all duration-300 ${active ? "h-1 w-3 bg-primary" : "h-1 w-1 bg-white/50"}`} />
      );
    }
    if (cfg.dot_style === "number") {
      return (
        <button key={i} onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
          aria-label={`Go to slide ${i + 1}`}
          className={`rounded-full font-bold flex items-center justify-center transition-all duration-300 ${active ? "w-7 h-7 bg-primary text-primary-foreground scale-110" : "w-7 h-7 bg-muted-foreground/30 text-muted-foreground hover:bg-muted-foreground/50"}`}>
          <span>{i + 1}</span>
        </button>
      );
    }
    if (cfg.dot_style === "dash" || cfg.dot_style === "pill") {
      return (
        <button key={i} onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
          aria-label={`Go to slide ${i + 1}`}
          className={`rounded-full transition-all duration-500 ${active ? "w-10 h-1.5 bg-primary" : "w-3 h-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/60"}`} />
      );
    }
    return (
      <button key={i} onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
        aria-label={`Go to slide ${i + 1}`}
        className={`rounded-full transition-all duration-300 ${active ? "w-3 h-3 bg-primary scale-125" : "w-3 h-3 bg-muted-foreground/40 hover:bg-muted-foreground/60"}`} />
    );
  };

  return (
    <div className="relative">

      <motion.div
        ref={containerRef}
        className="parallax-slider-root relative w-full overflow-hidden h-[42vh] sm:h-[48vh] md:h-[52vh] lg:h-[58vh] max-h-[360px] sm:max-h-[460px] md:max-h-[520px] lg:max-h-[620px] rounded-2xl md:rounded-3xl"
        style={{
          minHeight: isMobile ? "280px" : "320px",
          perspective: "1200px",
          rotateX: isMobile ? 0 : rotateX,
          rotateY: isMobile ? 0 : rotateY,
          transformStyle: "preserve-3d",
        }}
        onMouseEnter={() => cfg.pause_on_hover && setPaused(true)}
        onMouseLeave={onMouseLeaveReset}
        onMouseMove={onMouseMove}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Slide Counter Badge top-right */}
        {slides.length > 1 && (
          <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-30 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-[9px] sm:text-[10px] font-sans-brand font-bold tracking-widest text-white/90 uppercase select-none">
            {String(current + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
          </div>
        )}

        {/* Background image layer */}
        <AnimatePresence initial={false} custom={direction} mode="sync">
          <motion.div
            key={currentSlide.id}
            custom={direction}
            variants={imageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-[-8px] w-[calc(100%+16px)] h-[calc(100%+16px)]"
            style={isMobile ? {} : { x: imgX, y: imgY }}
          >
            <motion.div className="w-full h-full" style={isMobile ? {} : { y: smoothScrollY }}>
              {currentSlide.video ? (
                <video
                  src={currentSlide.video}
                  className={`w-full h-full object-cover ${cfg.ken_burns ? "parallax-ken-burns" : ""}`}
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <img
                  src={currentSlide.image}
                  alt={currentSlide.title}
                  className={`w-full h-full object-cover ${cfg.ken_burns ? "parallax-ken-burns" : ""}`}
                  loading="eager"
                />
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Overlay gradient */}
        <div className="absolute inset-0 z-[10] pointer-events-none parallax-overlay" />

        {/* Edge blend */}
        <div className="absolute inset-0 z-[11] pointer-events-none" style={{
          boxShadow: "inset 0 0 50px 25px hsl(var(--background)), inset 0 0 100px 10px hsl(var(--background) / 0.3)",
        }} />

        {/* Vignette */}
        {cfg.show_vignette && <div className="absolute inset-0 z-[12] pointer-events-none" style={{ boxShadow: "inset 0 0 80px 25px rgba(0,0,0,0.35)" }} />}

        {/* Particles — reduced count on mobile for performance */}
        {cfg.show_particles && containerSize.w > 0 && containerSize.h > 0 && (
          <ParticleOverlay
            width={containerSize.w}
            height={containerSize.h}
            count={isMobile ? Math.min(Math.round(cfg.particle_count * 0.4), 12) : Math.min(cfg.particle_count, 25)}
            speed={cfg.particle_speed}
            size={isMobile ? cfg.particle_size * 0.8 : cfg.particle_size}
          />
        )}

        {/* Text layer */}
        <motion.div
          className={`absolute inset-0 z-20 flex items-end ${
            currentSlide.textAlign === "center" ? "justify-center" : currentSlide.textAlign === "right" ? "justify-end" : "justify-start"
          }`}
          style={isMobile ? {} : { x: textX, y: textY, transformStyle: "preserve-3d" }}
        >
          <div className={`w-full px-4 sm:px-6 md:px-10 lg:px-16 pb-12 sm:pb-14 md:pb-16 lg:pb-18 overflow-hidden ${
            currentSlide.textAlign === "center" ? "text-center flex flex-col items-center" : currentSlide.textAlign === "right" ? "text-right flex flex-col items-end" : ""
          }`}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`text-${currentSlide.id}`}
                variants={textVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className={`max-w-[min(90%,640px)] ${currentSlide.textAlign === "center" ? "items-center mx-auto" : currentSlide.textAlign === "right" ? "items-end ml-auto" : ""}`}
              >

                {subtitleEl(currentSlide.subtitle)}
                <h1
                  className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold uppercase tracking-wider mb-1.5 md:mb-2 lg:mb-4 leading-tight text-white drop-shadow-lg line-clamp-2 break-words"
                  style={{
                    fontFamily: titleFont
                      ? `'${titleFont}', var(--font-title, var(--font-display))`
                      : 'var(--font-title, var(--font-display))',
                  }}
                >
                  {currentSlide.title}
                </h1>
                {currentSlide.description && (
                  <p className="text-[11px] sm:text-xs md:text-sm lg:text-base text-white/80 mb-2.5 md:mb-4 lg:mb-6 max-w-full line-clamp-2 sm:line-clamp-3 drop-shadow break-words">
                    {currentSlide.description}
                  </p>
                )}

                {currentSlide.cta && (
                  <motion.a
                    href={currentSlide.ctaLink}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => trackClick("slider_cta", currentSlide.id, "/", { cta_text: currentSlide.cta, cta_link: currentSlide.ctaLink })}
                    className={`inline-flex items-center rounded-full font-semibold text-[11px] md:text-sm lg:text-base px-4 md:px-6 lg:px-8 py-1.5 md:py-2.5 lg:py-3 shadow-lg transition-all duration-300 ${ctaClasses[cfg.cta_style] || ctaClasses.gradient}`}
                  >
                    {currentSlide.cta}
                  </motion.a>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Navigation controls */}
        {slides.length > 1 && (cfg.show_arrows || cfg.show_dots) && isMobile && (
          <div className="absolute bottom-2 left-0 right-0 z-30 flex items-center justify-between px-3">
            {cfg.show_arrows ? (
              <button onClick={goPrev} aria-label="Previous slide" className="flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white backdrop-blur-sm !min-h-0 !min-w-0">
                <ChevronLeft className="h-3 w-3" />
              </button>
            ) : <span />}
            {cfg.show_dots ? (
              <div className="flex items-center gap-1.5 rounded-full bg-black/25 px-2 py-1 backdrop-blur-sm">
                {slides.map((_, i) => renderDot(i, "mobile"))}
              </div>
            ) : <span />}
            {cfg.show_arrows ? (
              <button onClick={goNext} aria-label="Next slide" className="flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white backdrop-blur-sm !min-h-0 !min-w-0">
                <ChevronRight className="h-3 w-3" />
              </button>
            ) : <span />}
          </div>
        )}

        {slides.length > 1 && (cfg.show_arrows || cfg.show_dots) && !isMobile && (
          <div className="absolute bottom-2.5 md:bottom-5 lg:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 md:gap-3 lg:gap-4 z-30 px-1.5 py-0.5 md:px-3 md:py-1.5 rounded-full bg-background/30 backdrop-blur-md border border-foreground/5">
            {cfg.show_arrows && (
              <motion.button onClick={goPrev} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                className="w-5 h-5 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-full bg-foreground/10 backdrop-blur-sm border border-foreground/10 flex items-center justify-center text-white hover:bg-foreground/20 transition-colors">
                <ChevronLeft className="w-3 h-3 md:w-5 md:h-5" />
              </motion.button>
            )}
            {cfg.show_dots && (
              <div className="flex items-center gap-0.5 md:gap-1.5 lg:gap-2">
                {slides.map((_, i) => renderDot(i, "desktop"))}
              </div>
            )}
            {cfg.show_arrows && (
              <motion.button onClick={goNext} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                className="w-5 h-5 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-full bg-foreground/10 backdrop-blur-sm border border-foreground/10 flex items-center justify-center text-white hover:bg-foreground/20 transition-colors">
                <ChevronRight className="w-3 h-3 md:w-5 md:h-5" />
              </motion.button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default React.memo(ParallaxSlider);
// code:4ce0
