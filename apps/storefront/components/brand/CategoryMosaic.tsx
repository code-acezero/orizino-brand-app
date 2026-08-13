"use client";
import React, { useRef, useState, useCallback } from "react";
import { motion, useInView } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const EDITORIAL_BG = [
  "linear-gradient(160deg, hsl(60 3% 14%) 0%, hsl(0 5% 11%) 100%)",
  "linear-gradient(160deg, hsl(0 10% 10%) 0%, hsl(60 3% 13%) 100%)",
  "linear-gradient(160deg, hsl(30 8% 12%) 0%, hsl(60 3% 10%) 100%)",
  "linear-gradient(160deg, hsl(60 3% 12%) 0%, hsl(0 8% 11%) 100%)",
  "linear-gradient(160deg, hsl(0 15% 12%) 0%, hsl(60 3% 14%) 100%)",
];

/* ── Parallax Tile ── */
const ParallaxTile = ({
  cat,
  bg,
  isMain,
  spanClass = "",
  delay,
  inView,
}: {
  cat: any;
  bg: string;
  isMain: boolean;
  spanClass?: string;
  delay: number;
  inView: boolean;
}) => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const tileRef = useRef<HTMLAnchorElement>(null);
  const isMobile = useIsMobile();
  const rafId = useRef<number>(0);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isMobile || !tileRef.current) return;
    cancelAnimationFrame(rafId.current);
    const clientX = e.clientX;
    const clientY = e.clientY;
    rafId.current = requestAnimationFrame(() => {
      if (!tileRef.current) return;
      const rect = tileRef.current.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width - 0.5) * 12;
      const y = ((clientY - rect.top) / rect.height - 0.5) * 12;
      setOffset({ x, y });
    });
  }, [isMobile]);

  const handleMouseLeave = useCallback(() => {
    cancelAnimationFrame(rafId.current);
    setOffset({ x: 0, y: 0 });
  }, []);

  // Priority: banner_url -> image_url -> icon_url
  const imageSrc = cat?.banner_url || cat?.image_url || cat?.icon_url || null;

  return (
    <motion.a
      ref={tileRef}
      href={`/categories/${cat?.slug}`}
      className={`group relative overflow-hidden ${spanClass} ${isMain ? "col-span-2 row-span-2" : ""}`}
      style={{
        height: isMain ? "min(70vw, 440px)" : "min(35vw, 210px)",
        background: bg,
      }}
      initial={isMain ? { opacity: 0, scale: 1.03 } : { opacity: 0, y: 20 }}
      whileInView={isMain ? { opacity: 1, scale: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "100px" }}
      transition={{
        duration: isMain ? 0.9 : 0.7,
        ease: [0.16, 1, 0.3, 1],
        delay,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {imageSrc && (
        <img
          src={imageSrc}
          alt={cat.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${offset.x !== 0 ? 1.05 : 1})`,
            transition: "transform 0.4s cubic-bezier(0.16,1,0.3,1)",
          }}
          loading="lazy"
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background: isMain
            ? "linear-gradient(180deg, transparent 30%, hsl(60 3% 8% / 0.9) 100%)"
            : "linear-gradient(180deg, transparent 20%, hsl(60 3% 8% / 0.85) 100%)",
        }}
      />

      {/* Bottom content */}
      <div className={`absolute bottom-0 left-0 right-0 ${isMain ? "p-6 lg:p-8" : "p-4"}`}>
        <h3
          className={`font-editorial ${isMain ? "text-3xl lg:text-4xl" : "text-lg"} text-cream ${isMain ? "mb-2" : "leading-tight"}`}
        >
          {cat?.name}
        </h3>

        {/* Product count badge — appears on hover */}
        {cat?.product_count !== undefined && cat.product_count > 0 && (
          <div className="mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-cream/50 text-[10px] font-sans-brand tracking-wide uppercase">
              {cat.product_count} Item{cat.product_count !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {isMain && (
          <div className="flex items-center gap-2 text-cream/60 text-xs font-sans-brand tracking-wide">
            <span>Explore</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        )}
      </div>

      {/* Cherry accent bar — animated on hover */}
      <div
        className={`absolute bottom-0 left-0 transition-all duration-500 ease-out ${isMain ? "w-1 h-0 group-hover:h-16 bg-cherry" : "w-0 group-hover:w-full h-0.5 bg-cherry"
          }`}
      />
    </motion.a>
  );
};

const CategoryMosaic: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.05 });

  const { data: dbConfig } = useQuery({
    queryKey: ["home-category-mosaic-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "home_category_mosaic_config")
        .maybeSingle();
      if (!data?.value) return null;
      const val = data.value as any;
      return val?.value ?? val;
    },
    staleTime: 5 * 60 * 1000,
  });

  const isEnabled = dbConfig?.is_enabled ?? true;
  const title = dbConfig?.title || "Shop the collection";

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories-mosaic"],
    queryFn: async () => {
      // First try featured categories
      const { data: featuredData, error: featErr } = await (supabase.from as any)("categories")
        .select("id, name, slug, banner_url, image_url, icon_url, accent_color, product_count, is_featured, sort_order")
        .eq("is_active", true)
        .eq("is_featured", true)
        .order("sort_order", { ascending: true })
        .limit(5);

      if (featErr) throw featErr;

      if (featuredData && featuredData.length > 0) {
        return featuredData;
      }

      // Fallback if no categories are marked featured: load top 5 active categories
      const { data: fallbackData, error: fallErr } = await (supabase.from as any)("categories")
        .select("id, name, slug, banner_url, image_url, icon_url, accent_color, product_count, is_featured, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(5);

      if (fallErr) throw fallErr;
      return fallbackData || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section className="w-full">
        <div className="mb-8">
          <div className="h-8 w-48 bg-card/70 animate-pulse rounded-lg" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          <div className="col-span-2 row-span-2 min-h-[300px] sm:min-h-[440px] rounded-2xl bg-card/60 animate-pulse border border-border/30" />
          <div className="min-h-[140px] sm:min-h-[210px] rounded-2xl bg-card/60 animate-pulse border border-border/30" />
          <div className="min-h-[140px] sm:min-h-[210px] rounded-2xl bg-card/60 animate-pulse border border-border/30" />
          <div className="min-h-[140px] sm:min-h-[210px] rounded-2xl bg-card/60 animate-pulse border border-border/30" />
          <div className="min-h-[140px] sm:min-h-[210px] rounded-2xl bg-card/60 animate-pulse border border-border/30" />
        </div>
      </section>
    );
  }

  if (!isEnabled) return null;
  if (categories.length === 0) return null;

  const count = categories.length;
  const [main, ...subs] = categories;

  return (
    <section ref={ref} className="w-full">
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="heading-editorial text-3xl sm:text-4xl text-foreground">
          {title}
        </h2>
      </motion.div>

      {/* Adaptive grid based on category count (1 to 5 items) */}
      {count === 1 ? (
        <div className="grid grid-cols-1 gap-1.5">
          <ParallaxTile cat={main} bg={EDITORIAL_BG[0]} isMain delay={0} inView={inView} />
        </div>
      ) : count === 2 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          <ParallaxTile cat={main} bg={EDITORIAL_BG[0]} isMain={false} delay={0} inView={inView} />
          <ParallaxTile cat={subs[0]} bg={EDITORIAL_BG[1]} isMain={false} delay={0.1} inView={inView} />
        </div>
      ) : count === 3 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
          <ParallaxTile cat={main} bg={EDITORIAL_BG[0]} isMain={false} delay={0} inView={inView} />
          {subs.map((cat, i) => (
            <ParallaxTile
              key={cat.id}
              cat={cat}
              bg={EDITORIAL_BG[(i + 1) % EDITORIAL_BG.length]}
              isMain={false}
              delay={(i + 1) * 0.1}
              inView={inView}
            />
          ))}
        </div>
      ) : (
        /* 4 or 5 items: Main hero tile + subs */
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
          <ParallaxTile cat={main} bg={EDITORIAL_BG[0]} isMain delay={0} inView={inView} />
          {subs.slice(0, 4).map((cat: any, i: number) => (
            <ParallaxTile
              key={cat.id}
              cat={cat}
              bg={EDITORIAL_BG[(i + 1) % EDITORIAL_BG.length]}
              isMain={false}
              delay={(i + 1) * 0.1}
              inView={inView}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default CategoryMosaic;
