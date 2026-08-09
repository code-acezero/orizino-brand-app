"use client";
import React, { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Clock } from "lucide-react";

export interface CollectionItem {
  id: string;
  title: string;
  subtitle?: string;
  image_url?: string;
  href?: string; // if empty → Coming Soon
  sort_order?: number;
  is_active?: boolean;
}

const EDITORIAL_BG = [
  "linear-gradient(160deg, hsl(60 3% 14%), hsl(60 3% 10%))",
  "linear-gradient(160deg, hsl(0 20% 10%), hsl(60 3% 12%))",
  "linear-gradient(160deg, hsl(30 15% 12%), hsl(60 3% 10%))",
  "linear-gradient(160deg, hsl(60 3% 12%), hsl(0 15% 9%))",
  "linear-gradient(160deg, hsl(0 10% 11%), hsl(60 3% 13%))",
];

/* Coming Soon overlay */
const ComingSoonOverlay = ({ title }: { title: string }) => (
  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-sm">
    <div className="w-8 h-8 rounded-full border border-cherry/40 flex items-center justify-center">
      <Clock className="w-4 h-4 text-cherry/70" />
    </div>
    <div className="text-center px-4">
      <p className="font-sans-brand text-[9px] tracking-[0.3em] uppercase text-cherry/70 mb-1">Coming Soon</p>
      <p className="font-editorial text-sm text-foreground/60">{title}</p>
    </div>
  </div>
);

export default function CollectionShowcase({ title, subtitle }: { title?: string; subtitle?: string } = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.05 });

  // Drag scroll
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({ startX: 0, scrollLeft: 0 });
  const [activeIdx, setActiveIdx] = useState(0);

  // Load from CMS
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["collection-showcase-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "collection_showcase_config")
        .maybeSingle();
      if (!data?.value) return [];
      const val = data.value as any;
      const parsed = val?.value ?? val;
      if (!Array.isArray(parsed)) return [];
      return (parsed as CollectionItem[])
        .filter((item) => item.is_active !== false)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    },
    staleTime: 5 * 60 * 1000,
  });

  // Skeleton loader when loading from Supabase
  if (isLoading) {
    return (
      <section className="w-full overflow-hidden">
        <div className="flex gap-3 overflow-hidden pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 w-[260px] sm:w-[320px] lg:w-[360px] h-[380px] sm:h-[420px] rounded-2xl bg-card/60 animate-pulse border border-border/30"
            />
          ))}
        </div>
      </section>
    );
  }

  // Don't render if no items configured
  if (items.length === 0) return null;

  // Drag handlers
  const onPointerDown = (e: React.PointerEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    dragState.current.startX = e.clientX;
    dragState.current.scrollLeft = scrollRef.current.scrollLeft;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !scrollRef.current) return;
    scrollRef.current.scrollLeft = dragState.current.scrollLeft - (e.clientX - dragState.current.startX);
  };
  const onPointerUp = () => setIsDragging(false);
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    const ratio = scrollLeft / (scrollWidth - clientWidth || 1);
    setActiveIdx(Math.max(0, Math.min(Math.round(ratio * (items.length - 1)), items.length - 1)));
  };

  return (
    <section ref={ref} className="w-full overflow-hidden">
      {/* Section Header — Centered */}
      {title && (
        <div className="flex flex-col items-center text-center justify-center mb-8 gap-2">
          <h2 className="heading-editorial text-3xl sm:text-4xl text-foreground font-bold">
            {title}
          </h2>
          {subtitle && <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      )}

      {/* Horizontal scroll strip */}
      <div
        ref={scrollRef}
        className="flex gap-3.5 sm:gap-5 overflow-x-auto no-scrollbar pb-3 pt-1 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 cursor-grab active:cursor-grabbing snap-x snap-mandatory touch-pan-x"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onScroll={handleScroll}
      >
        {items.map((item, i) => {
          const hasLink = !!item.href?.trim();
          const Tag = hasLink ? "a" : "div";
          const tagProps = hasLink
            ? { href: isDragging ? undefined : item.href, onClick: (e: any) => isDragging && e.preventDefault() }
            : {};

          return (
            <motion.div
              key={item.id}
              className="group relative flex-shrink-0 overflow-hidden rounded-2xl border border-border/40 snap-start"
              style={{
                width: "calc(82vw - 1rem)",
                maxWidth: "300px",
                height: "360px",
                background: EDITORIAL_BG[i % EDITORIAL_BG.length],
                transform: i === activeIdx ? "scale(1)" : "scale(0.98)",
                opacity: i === activeIdx ? 1 : 0.85,
                transition: "transform 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.4s ease",
              }}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "100px" }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 }}
              {...(tagProps as any)}
              as={Tag as any}
            >
              {/* Image */}
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
              )}

              {/* Gradient overlay */}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(180deg, transparent 35%, hsl(var(--background) / 0.95) 100%)" }}
              />

              {/* Coming Soon overlay (no link set) */}
              {!hasLink && <ComingSoonOverlay title={item.title} />}

              {/* Index counter */}
              <div className="absolute top-4 right-4">
                <span className="font-sans-brand text-[9px] text-foreground/50 tracking-[0.2em] bg-background/50 backdrop-blur-sm px-2 py-0.5 rounded-full border border-border/30">
                  {String(i + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
                </span>
              </div>

              {/* Bottom content */}
              <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-1 group-hover:translate-y-0 transition-transform duration-400">
                {item.subtitle && (
                  <p className="section-label text-primary dark:text-foreground mb-1.5">{item.subtitle}</p>
                )}
                <h3 className="font-editorial text-xl text-foreground leading-tight">{item.title}</h3>
                {hasLink && (
                  <div className="mt-3 h-px w-0 group-hover:w-full bg-primary dark:bg-foreground transition-all duration-500 ease-out" />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Scroll indicator dots */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              if (scrollRef.current) {
                const cardWidth = scrollRef.current.scrollWidth / items.length;
                scrollRef.current.scrollTo({ left: cardWidth * i, behavior: "smooth" });
              }
            }}
            className="transition-all duration-300 rounded-full"
            style={{
              width: i === activeIdx ? 18 : 5,
              height: 4,
              backgroundColor: i === activeIdx ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.2)",
            }}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
