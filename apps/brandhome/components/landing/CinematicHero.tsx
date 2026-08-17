"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Slide {
  id: string;
  title?: string;
  subtitle?: string;
  button_text?: string;
  button_link?: string;
  image_url?: string;
  video_url?: string;
  sort_order: number;
}

const FALLBACK_SLIDES: Slide[] = [
  {
    id: "f1",
    title: "Crafted for Quiet Intention",
    subtitle: "Premium drop shoulder essentials — season-less, effortless.",
    button_text: "Shop Now",
    button_link: "/inventory",
    sort_order: 0,
  },
  {
    id: "f2",
    title: "The Drop Shoulder Series",
    subtitle: "240 GSM cotton. Engineered 3cm seam drop. Zero compromise.",
    button_text: "Explore Collection",
    button_link: "/inventory",
    sort_order: 1,
  },
];

const EDITORIAL_BG = [
  "linear-gradient(160deg, hsl(60 3% 9%) 0%, hsl(0 8% 10%) 100%)",
  "linear-gradient(160deg, hsl(0 10% 10%) 0%, hsl(60 3% 8%) 100%)",
  "linear-gradient(160deg, hsl(30 8% 10%) 0%, hsl(60 3% 8%) 100%)",
];

const CinematicHero: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  const { data: slidesRaw = [] } = useQuery({
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

  const autoplaySpeed = showcaseConfig?.autoplay_speed ?? 6500;
  const slides: Slide[] = slidesRaw.length > 0 ? slidesRaw : FALLBACK_SLIDES;
  const total = slides.length;

  const goTo = useCallback(
    (idx: number, dir: number) => {
      setCurrent(idx);
      setDirection(dir);
      setProgress(0);
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
    if (paused || total <= 1) return;
    intervalRef.current = setInterval(next, autoplaySpeed);
    return () => clearInterval(intervalRef.current!);
  }, [paused, next, autoplaySpeed, total]);

  // Progress bar
  useEffect(() => {
    setProgress(0);
    if (paused || total <= 1) return;
    const step = 100 / (autoplaySpeed / 50);
    progressRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + step, 100));
    }, 50);
    return () => clearInterval(progressRef.current!);
  }, [current, paused, autoplaySpeed, total]);

  // Touch swipe
  const touchStartX = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 40) dx > 0 ? next() : prev();
  };

  const slide = slides[current];

  // Cinematic text animation variants
  const textVariants: any = {
    initial: { opacity: 0, y: 36, filter: "blur(4px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, y: -16, filter: "blur(2px)", transition: { duration: 0.5, ease: "easeIn" } },
  };

  const imageVariants: any = {
    initial: { opacity: 0, scale: 1.06 },
    animate: { opacity: 1, scale: 1, transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.6 } },
  };

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ height: "100svh", minHeight: 480 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Slides */}
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={slide.id}
          className="absolute inset-0"
          variants={imageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {/* Background image or editorial gradient */}
          {slide.image_url ? (
            <>
              <img
                src={slide.image_url}
                alt={slide.title || ""}
                className="absolute inset-0 w-full h-full object-cover"
                loading="eager"
                fetchPriority={current === 0 ? "high" : undefined}
              />
              {/* Cinematic overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, hsl(60 3% 8% / 0.82) 0%, hsl(60 3% 8% / 0.5) 40%, hsl(60 3% 8% / 0.2) 70%, transparent 100%), linear-gradient(180deg, transparent 40%, hsl(60 3% 8% / 0.75) 100%)",
                }}
              />
            </>
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: EDITORIAL_BG[current % EDITORIAL_BG.length] }}
            >
              {/* Watermark text */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ opacity: 0.035 }}
              >
                <span
                  className="font-editorial text-cream font-bold"
                  style={{ fontSize: "clamp(5rem, 18vw, 18rem)", letterSpacing: "-0.04em", lineHeight: 1 }}
                  translate="no"
                >
                  ORIZINO
                </span>
              </div>
              {/* Bottom gradient */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, transparent 30%, hsl(60 3% 8% / 0.6) 100%)",
                }}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="absolute inset-0 flex items-end lg:items-center pointer-events-none">
        <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-14 pb-24 lg:pb-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={slide.id + "-content"}
              className="max-w-2xl pointer-events-auto"
              variants={textVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {/* Slide index */}
              <div className="flex items-center gap-3 mb-6">
                <span
                  className="font-sans-brand text-cream/40 text-[0.6rem] tracking-[0.25em]"
                >
                  {String(current + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                </span>
                <div className="flex-1 max-w-[80px] h-px bg-cream/20">
                  <div
                    className="h-full bg-cherry transition-none"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Headline */}
              {slide.title && (
                <h1
                  className="heading-editorial text-cream mb-5"
                  style={{
                    fontSize: "clamp(2.4rem, 6.5vw, 5.5rem)",
                    lineHeight: 1.02,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {slide.title}
                </h1>
              )}

              {/* Subtitle */}
              {slide.subtitle && (
                <p
                  className="font-sans-brand text-cream/65 mb-10 max-w-[50ch]"
                  style={{ fontSize: "clamp(0.85rem, 1.5vw, 1.05rem)", lineHeight: 1.6 }}
                >
                  {slide.subtitle}
                </p>
              )}

              {/* CTA */}
              <div className="flex items-center gap-4">
                {slide.button_text && slide.button_link && (
                  <a
                    href={slide.button_link}
                    className="btn-cherry"
                  >
                    {slide.button_text}
                  </a>
                )}
                <a
                  href="/inventory"
                  className="btn-ghost-cream"
                >
                  View All
                </a>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 right-8 hidden lg:flex flex-col items-center gap-2 text-cream/40">
        <span
          className="font-sans-brand text-[0.55rem] tracking-[0.25em] uppercase"
          style={{ writingMode: "vertical-rl" }}
        >
          Scroll
        </span>
        <ChevronDown className="w-3 h-3 animate-bounce" strokeWidth={1.5} />
      </div>

      {/* Dot navigation */}
      {total > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i, i > current ? 1 : -1)}
              aria-label={`Go to slide ${i + 1}`}
              className="relative overflow-hidden transition-all duration-300"
              style={{
                width: i === current ? 24 : 6,
                height: 2,
                background: i === current ? "hsl(var(--cream))" : "hsl(var(--cream) / 0.3)",
              }}
            />
          ))}
        </div>
      )}

      {/* Progress bar — bottom edge */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cream/10">
        <div
          className="h-full bg-cherry transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
    </section>
  );
};

export default CinematicHero;
