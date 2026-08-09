"use client";
import React, { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Link } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

/* ── Spec pill parser ── */
function parseSpecPills(md: string): { label: string; value: string }[] {
  if (!md) return [];
  const specs: { label: string; value: string }[] = [];
  md.split("\n").forEach((line) => {
    const t = line.trim();
    if (!t) return;
    if (t.includes(":") && !t.startsWith("http")) {
      const [key, ...v] = t.split(":");
      specs.push({ label: key.trim(), value: v.join(":").trim() });
    } else if (t.startsWith("- ") || t.startsWith("* ")) {
      specs.push({ label: "·", value: t.slice(2).trim() });
    }
  });
  return specs;
}

export interface ShowcaseEntry {
  id: string;
  title?: string;
  subtitle?: string;
  image_url?: string;
  video_url?: string;
  markdown_specs?: string;
  product_id?: string | null;
  cta_text?: string;
  cta_link?: string;
  layout_type?: "auto" | "featured" | "tall" | "wide" | "square";
  card_style?: "glass" | "dark" | "cherry" | "minimal";
  content_position?: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right" | "center" | "left" | "right" | "top" | "bottom" | "side";
  text_align?: "left" | "center" | "right";
  show_price?: boolean;
  price_position?: "top" | "bottom" | "none";
  show_gallery?: boolean; // show product image gallery carousel
  is_active?: boolean;
  sort_order?: number;
}


/* ── Image Gallery Carousel for linked products ── */
const ProductGalleryCarousel = ({ productId }: { productId: string }) => {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const { data: images = [] } = useQuery({
    queryKey: ["product-gallery-bento", productId],
    queryFn: async () => {
      const { data } = await (supabase.from as any)("product_images")
        .select("image_url, sort_order")
        .eq("product_id", productId)
        .order("sort_order", { ascending: true })
        .limit(8);
      return data?.map((r: any) => r.image_url) || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!productId,
  });

  const prev = useCallback(() => setIdx((i) => (i === 0 ? images.length - 1 : i - 1)), [images.length]);
  const next = useCallback(() => setIdx((i) => (i === images.length - 1 ? 0 : i + 1)), [images.length]);

  // Auto carousel effect
  useEffect(() => {
    if (paused || images.length <= 1) return;
    const timer = setInterval(next, 4500);
    return () => clearInterval(timer);
  }, [paused, images.length, next]);

  if (images.length === 0) return null;

  return (
    <div
      className="absolute inset-0 z-0 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="sync">
        <motion.img
          key={idx}
          src={images[idx]}
          alt=""
          className="absolute inset-0 w-full h-full object-cover brightness-[0.65] contrast-110"
          initial={{ opacity: 0, scale: 1.05, filter: "blur(8px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, filter: "blur(4px)" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ willChange: "opacity, transform, filter" }}
        />
      </AnimatePresence>
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); prev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-background/60 backdrop-blur-sm border border-cream/10 flex items-center justify-center text-cream/70 hover:text-cream transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); next(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-background/60 backdrop-blur-sm border border-cream/10 flex items-center justify-center text-cream/70 hover:text-cream transition-colors"
            aria-label="Next image"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <div className="absolute bottom-14 left-0 right-0 flex justify-center gap-1 z-20">
            {images.map((_: any, i: number) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); setIdx(i); }}
                className="transition-all duration-300"
                style={{
                  width: i === idx ? 14 : 4,
                  height: 2,
                  background: i === idx ? "hsl(var(--cherry))" : "hsl(var(--cream) / 0.3)",
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/* ── Rotated Vertical Title with Spring Marquee Animation on overflow ── */
const RotatedTitleMarquee = ({ title }: { title: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);
  const [overflowDistance, setOverflowDistance] = useState(0);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const cHeight = containerRef.current.clientHeight;
        const textH = textRef.current.scrollHeight;
        if (textH > cHeight + 4) {
          setOverflowDistance(textH - cHeight + 28);
        } else {
          setOverflowDistance(0);
        }
      }
    };

    checkOverflow();
    const timer = setTimeout(checkOverflow, 200);
    window.addEventListener("resize", checkOverflow);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkOverflow);
    };
  }, [title]);

  return (
    <div
      ref={containerRef}
      className="absolute right-1 sm:right-2 top-0 bottom-20 overflow-hidden flex items-start justify-center rotate-180 z-10 pointer-events-auto"
    >
      <motion.h3
        ref={textRef}
        initial={{ y: 0 }}
        animate={
          overflowDistance > 0
            ? { y: [0, -overflowDistance, 0] }
            : { y: 0 }
        }
        transition={
          overflowDistance > 0
            ? {
                duration: Math.max(6, overflowDistance / 18),
                repeat: Infinity,
                repeatType: "mirror",
                ease: "easeInOut",
              }
            : { type: "spring", stiffness: 300, damping: 30 }
        }
        className="heading-editorial text-2xl sm:text-3xl lg:text-4xl text-foreground font-black tracking-wider uppercase whitespace-nowrap [writing-mode:vertical-rl] group-hover:text-cherry transition-colors duration-300 shrink-0"
      >
        {title}
      </motion.h3>
    </div>
  );
};

/* ── Individual Bento Card ── */
const BentoCard = ({
  entry,
  product,
  index,
  inView,
}: {
  entry: ShowcaseEntry;
  product?: any;
  index: number;
  inView: boolean;
}) => {
  const { formatPrice } = useCurrency();
  const videoRef = useRef<HTMLVideoElement>(null);

  const imgSrc = entry.image_url || product?.thumbnail;
  const title = entry.title || product?.name || "";
  const subtitle = entry.subtitle || "";
  const ctaText = entry.cta_text || "Explore";
  const ctaLink = entry.cta_link || (product?.slug ? `/product/${product.slug}` : "/inventory");
  const specs = parseSpecPills(entry.markdown_specs || "");

  const showPrice = entry.show_price !== false;
  const pricePos = entry.price_position || (showPrice ? "bottom" : "none");

  // Content alignment based on config
  const rawPos = (entry.content_position || entry.text_align || "bottom-left").toLowerCase();

  let verticalClass = "justify-end"; // default bottom
  if (rawPos.includes("top")) {
    verticalClass = "justify-start";
  } else if (rawPos === "center" || rawPos === "middle" || rawPos === "center-center") {
    verticalClass = "justify-center";
  }

  let itemsClass = "items-start";
  let textClass = "text-left";
  if (rawPos.includes("center") || rawPos.includes("middle")) {
    itemsClass = "items-center";
    textClass = "text-center";
  } else if (rawPos.includes("right") || rawPos.includes("side")) {
    itemsClass = "items-end";
    textClass = "text-right";
  }

  // Grid span
  const layout = entry.layout_type || "auto";
  let spanClass = "col-span-1 row-span-1 min-h-[300px]";
  if (layout === "featured" || (layout === "auto" && index % 5 === 0)) {
    spanClass = "col-span-1 sm:col-span-2 row-span-2 min-h-[460px] lg:min-h-[540px]";
  } else if (layout === "tall" || (layout === "auto" && index % 5 === 2)) {
    spanClass = "col-span-1 row-span-2 min-h-[460px]";
  } else if (layout === "wide" || (layout === "auto" && index % 5 === 3)) {
    spanClass = "col-span-1 sm:col-span-2 row-span-1 min-h-[280px]";
  }

  // Style
  const styleType = entry.card_style || (index % 3 === 0 ? "glass" : index % 3 === 1 ? "dark" : "cherry");
  const bg =
    styleType === "cherry"
      ? "linear-gradient(145deg, hsl(0 60% 8%), hsl(var(--background)))"
      : styleType === "dark"
        ? "linear-gradient(145deg, hsl(220 20% 8%), hsl(var(--background)))"
        : "linear-gradient(145deg, hsl(var(--card) / 0.7), hsl(var(--background) / 0.95))";

  return (
    <motion.a
      href={ctaLink}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "100px" }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: index * 0.07 }}
      className={`group relative overflow-hidden flex flex-col ${verticalClass} ${spanClass}`}
      style={{ background: bg }}
    >
      {/* Hairline border */}
      <div className="absolute inset-0 border border-foreground/10 pointer-events-none transition-colors duration-500 group-hover:border-cherry/30 z-10" />

      {/* Top Price Badge */}
      {showPrice && pricePos === "top" && product?.price && (
        <div className="absolute top-4 right-4 z-20 px-3 py-1 rounded-full bg-background/70 dark:bg-card/75 backdrop-blur-md border border-white/20 dark:border-white/10 shadow-md">
          <span className="font-mono text-xs sm:text-sm font-extrabold text-foreground">
            {formatPrice(Number(product.price))}
          </span>
        </div>
      )}

      {/* Media — Gallery Carousel if enabled, else Video, else Image */}
      {entry.show_gallery && entry.product_id ? (
        <ProductGalleryCarousel productId={entry.product_id} />
      ) : entry.video_url ? (
        <div className="absolute inset-0 z-0 overflow-hidden">
          <video
            ref={videoRef}
            src={entry.video_url}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover brightness-[0.7] contrast-110 group-hover:scale-105 transition-transform duration-700"
          />
        </div>
      ) : imgSrc ? (
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src={imgSrc}
            alt={title}
            className="w-full h-full object-cover brightness-[0.75] contrast-110 group-hover:scale-105 transition-transform duration-700"
          />
        </div>
      ) : (
        <div className="absolute inset-0 z-0 bg-secondary/30" />
      )}

      {/* Gradient vignette */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-background via-background/60 to-transparent opacity-90 group-hover:opacity-95 transition-opacity" />

      {/* ── Content overlay ── */}
      {rawPos.includes("side") || rawPos.includes("rotate") || rawPos.includes("vertical") ? (
        /* Side Aligned — 90° Rotated Vertical Text Layout */
        <div className="relative z-10 p-4 sm:p-6 flex flex-col justify-between h-full w-full pointer-events-none">
          {/* Top Editorial Badge */}
          <div className="flex items-center justify-between w-full pointer-events-auto">
            <span className="font-mono text-[9px] font-bold tracking-[0.25em] uppercase text-cherry bg-background/60 dark:bg-card/75 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full">
              EDITORIAL SILHOUETTE
            </span>
          </div>

          {/* Static Subtitle (Fixed along side, never spring animates, truncated within card bounds) */}
          {subtitle && (
            <div className="absolute right-9 sm:right-11 top-12 max-h-[calc(100%-140px)] overflow-hidden z-10 pointer-events-auto">
              <span className="font-mono text-[10px] sm:text-xs font-bold text-foreground/75 uppercase tracking-[0.2em] whitespace-nowrap [writing-mode:vertical-rl] rotate-180 truncate block max-h-full">
                {subtitle}
              </span>
            </div>
          )}

          {/* 90-Degree Rotated Vertical Title — ONLY TITLE spring animates on overflow */}
          <RotatedTitleMarquee title={title} />

          {/* Bottom Block (Specs Panel + CTA Bar pushed to bottom) */}
          <div className="mt-auto flex flex-col w-full gap-2 pointer-events-auto">
            {/* Specs Light Blurred Panel (Bottom Left — SINGLE COLUMN) */}
            {specs.length > 0 && (
              <div className="max-w-[180px] sm:max-w-[210px] p-2.5 sm:p-3 rounded-xl bg-background/30 dark:bg-card/40 backdrop-blur-md border border-white/20 dark:border-white/10 shadow-sm flex flex-col gap-1 transition-colors group-hover:bg-background/40">
                <div className="flex items-center gap-1.5 border-b border-foreground/10 pb-1 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cherry shrink-0" />
                  <span className="font-mono text-[9px] font-bold tracking-widest uppercase text-foreground/80">
                    Material Specs
                  </span>
                </div>
                <div className="flex flex-col gap-1 text-left">
                  {specs.map((spec, i) => (
                    <div key={i} className="flex flex-col">
                      {spec.label && spec.label !== "·" && (
                        <span className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground leading-none">
                          {spec.label}
                        </span>
                      )}
                      <span className="text-[10px] font-sans-brand font-semibold text-foreground leading-tight truncate">
                        {spec.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom CTA Bar */}
            <div className="flex items-center justify-between w-full pt-2 border-t border-foreground/10">
              <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                {product ? "In Stock" : "Limited Edition"}
              </span>

              <div className="inline-flex items-center gap-1 text-xs font-bold tracking-wider uppercase text-foreground group-hover:text-cherry transition-colors">
                <span>{ctaText}</span>
                <ArrowRight className="w-3 h-3 text-foreground/50 group-hover:text-cherry group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Bottom Aligned Layout: Title & Specs pushed all the way to card bottom */
        <div className="relative z-10 p-4 sm:p-6 flex flex-col justify-between h-full w-full">
          {/* Top Subtitle Row */}
          <div className="flex items-start justify-between w-full">
            {subtitle && (
              <span className="font-mono text-[9.5px] sm:text-xs font-bold uppercase tracking-widest text-foreground/80 bg-background/60 dark:bg-card/75 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full max-w-[calc(100%-110px)] truncate">
                {subtitle}
              </span>
            )}
          </div>

          {/* Bottom Block (Specs Panel -> Title -> CTA Bar pushed to bottom) */}
          <div className="mt-auto flex flex-col w-full gap-2">
            {/* Specs Light Blurred Panel */}
            {specs.length > 0 && (
              <div className="w-full p-3 rounded-xl bg-background/30 dark:bg-card/40 backdrop-blur-md border border-white/20 dark:border-white/10 shadow-sm flex flex-col gap-1.5 transition-colors group-hover:bg-background/40">
                <div className="flex items-center gap-1.5 border-b border-foreground/10 pb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cherry shrink-0" />
                  <span className="font-mono text-[9px] font-bold tracking-widest uppercase text-foreground/80">
                    Material Specs
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-left">
                  {specs.map((spec, i) => (
                    <div key={i} className="flex flex-col">
                      {spec.label && spec.label !== "·" && (
                        <span className="text-[8.5px] font-mono uppercase tracking-wider text-muted-foreground leading-tight">
                          {spec.label}
                        </span>
                      )}
                      <span className="text-[10px] font-sans-brand font-semibold text-foreground leading-tight truncate">
                        {spec.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Title (AT THE BOTTOM OF CONTENT BLOCK) */}
            <h3 className="heading-editorial text-lg sm:text-2xl lg:text-3xl text-foreground font-bold tracking-tight group-hover:text-cherry transition-colors duration-300">
              {title}
            </h3>

            {/* Price & CTA bar */}
            <div className="flex items-center justify-between w-full pt-2 border-t border-foreground/10">
              {showPrice && pricePos !== "top" && product?.price ? (
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-xs sm:text-sm font-extrabold text-foreground">
                    {formatPrice(Number(product.price))}
                  </span>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-cherry font-semibold">
                    In Stock
                  </span>
                </div>
              ) : (
                <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                  {product ? "In Stock" : "Limited Edition"}
                </span>
              )}

              <div className="inline-flex items-center gap-1 text-xs font-bold tracking-wider uppercase text-foreground group-hover:text-cherry transition-colors">
                <span>{ctaText}</span>
                <ArrowRight className="w-3 h-3 text-foreground/50 group-hover:text-cherry group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.a>
  );
};

/* ── Main Bento Section ── */
export default function CinematicProductShowcase() {
  const ref = useRef<HTMLDivElement>(null);

  // Load admin-configured settings & entries
  const { data: rawConfig, isLoading } = useQuery({
    queryKey: ["product-showcase-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "product_showcase_config")
        .maybeSingle();
      if (!data?.value) return null;
      const val = data.value as any;
      return val?.value ?? val;
    },
    staleTime: 0,
  });

  const { isEnabled, showFeatured, entries } = useMemo(() => {
    if (!rawConfig) return { isEnabled: false, showFeatured: false, entries: [] };

    let is_enabled = true;
    let show_featured = false;
    let list: ShowcaseEntry[] = [];

    if (Array.isArray(rawConfig)) {
      list = rawConfig;
    } else if (typeof rawConfig === "object" && rawConfig !== null) {
      is_enabled = rawConfig.is_enabled !== false;
      show_featured = Boolean(rawConfig.show_featured || rawConfig.show_featured_fallback || rawConfig.show_featured_products);
      if (Array.isArray(rawConfig.entries)) {
        list = rawConfig.entries;
      }
    }

    const filtered = list
      .filter((e) => e.is_active !== false)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    return { isEnabled: is_enabled, showFeatured: show_featured, entries: filtered };
  }, [rawConfig]);

  // Featured products fallback ONLY if show_featured is turned on from master panel/DB and no custom entries configured
  const { data: fallbackProducts = [], isLoading: fallbackLoading } = useQuery({
    queryKey: ["showcase-fallback-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, price, thumbnail, slug, is_featured")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .limit(4);
      return data || [];
    },
    enabled: !isLoading && isEnabled && showFeatured && entries.length === 0,
    staleTime: 60 * 1000,
  });

  const finalEntries: ShowcaseEntry[] = useMemo(() => {
    if (entries.length > 0) return entries;
    if (!showFeatured) return [];
    return fallbackProducts.map((p, idx) => ({
      id: p.id,
      title: p.name,
      subtitle: "Heavyweight Collection",
      image_url: p.thumbnail ?? undefined,
      product_id: p.id,
      cta_text: "Shop Now",
      cta_link: `/product/${p.slug}`,
      layout_type: idx === 0 ? "featured" : "auto",
      card_style: idx % 2 === 0 ? "dark" : "glass",
      is_active: true,
      sort_order: idx,
    }));
  }, [entries, showFeatured, fallbackProducts]);

  // Fetch linked products (price, thumbnail, slug)
  const productIds = finalEntries.map((e) => e.product_id).filter(Boolean) as string[];

  const { data: linkedProducts = [] } = useQuery({
    queryKey: ["showcase-linked-products", productIds],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, price, thumbnail, slug")
        .in("id", productIds);
      return data || [];
    },
    staleTime: 60 * 1000,
    enabled: productIds.length > 0,
  });

  if (isLoading || (isEnabled && showFeatured && entries.length === 0 && fallbackLoading)) {
    return (
      <section className="w-full">
        <div className="px-4 sm:px-6 lg:px-8 xl:px-10 pb-6 lg:pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[360px] sm:h-[420px] rounded-2xl bg-card/60 animate-pulse border border-border/30"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Hide completely taking zero space if disabled or no entries and showFeatured is off
  if (!isEnabled || finalEntries.length === 0) {
    return null;
  }

  return (
    <section ref={ref} className="w-full">
      {/* ── Bento Grid ── */}
      <div className="px-4 sm:px-6 lg:px-8 xl:px-10 pb-6 lg:pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {finalEntries.map((entry, idx) => {
            const product = linkedProducts.find((p: any) => p.id === entry.product_id);
            return (
              <BentoCard
                key={entry.id}
                entry={entry}
                product={product}
                index={idx}
                inView={true}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
