"use client";
import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BrandStoryBlockProps {
  imageUrl?: string;
  imageSide?: "left" | "right";
}

const BrandStoryBlock: React.FC<BrandStoryBlockProps> = ({
  imageUrl,
  imageSide = "left",
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });

  const { data: brandMeta } = useQuery({
    queryKey: ["brand-meta"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["site_name", "brand_establishment_year", "brand_origin", "brand_story_image_url", "hero_bg_url", "title_font"]);
      
      const map: Record<string, string> = {};
      data?.forEach((s) => {
        const val = s.value;
        map[s.key] = typeof val === "object" && val !== null ? (val as any).value ?? val : val;
      });
      return map;
    },
    staleTime: 60 * 60 * 1000,
  });

  const siteName = brandMeta?.site_name || "Orizino";
  const estYear = brandMeta?.brand_establishment_year || "2026";
  const origin = brandMeta?.brand_origin || "Kushtia";
  const titleFont = brandMeta?.title_font || "";
  const activeImageUrl = imageUrl || brandMeta?.brand_story_image_url || brandMeta?.hero_bg_url || "";

  const fallbackBg =
    "linear-gradient(135deg, hsl(var(--charcoal)) 0%, hsl(0 3% 14%) 100%)";

  const textCol = (
    <motion.div
      className="flex flex-col justify-center gap-8 py-16 px-8 lg:px-16"
      initial={{ opacity: 0, x: imageSide === "left" ? 40 : -40 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
    >
      <span className="section-label">Our Story</span>

      <h2
        className="heading-editorial text-4xl lg:text-6xl text-foreground leading-[1.02]"
        style={{ maxWidth: "22ch" }}
      >
        Designed for those who carry themselves with{" "}
        <em className="text-cherry not-italic">quiet intention.</em>
      </h2>

      <p
        className="text-muted-foreground text-sm leading-relaxed font-sans-brand"
        style={{ maxWidth: "42ch" }}
      >
        Orizino was born from a simple belief — that a perfectly engineered
        drop shoulder silhouette is not just clothing, it is a statement of
        self-assurance. Every piece is constructed with obsessive attention to
        fit, fabric weight, and finish.
      </p>

      <div className="flex flex-col gap-3 text-sm font-sans-brand text-muted-foreground">
        {[
          "240 GSM premium cotton jersey",
          "Structural drop shoulder — 3cm engineered seam drop",
          "Stone-washed & garment-dyed finishes",
        ].map((point, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-4 h-px bg-cherry flex-shrink-0" />
            <span>{point}</span>
          </div>
        ))}
      </div>

      <a
        href="/about"
        className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.15em] uppercase font-sans-brand text-foreground hover:text-cherry transition-colors group"
      >
        Read Our Story
        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
      </a>
    </motion.div>
  );

  const imageCol = (
    <motion.div
      className="relative overflow-hidden min-h-[420px] lg:min-h-0"
      initial={{ opacity: 0, scale: 1.04 }}
      animate={inView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
    >
      {activeImageUrl ? (
        <img
          src={activeImageUrl}
          alt={`${siteName} brand story`}
          className="w-full h-full object-cover absolute inset-0"
          loading="lazy"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-end p-10"
          style={{ background: fallbackBg }}
        >
          {/* Decorative editorial placeholder */}
          <div className="space-y-2">
            <div className="w-16 h-px bg-cherry" />
            <p className="font-editorial italic text-4xl text-cream opacity-80">
              {siteName}
            </p>
            <p className="section-label text-cream/40">Est. {estYear} · {origin}</p>
          </div>
          {/* Watermark */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none px-2 overflow-hidden"
          >
            <span
              className="text-cream text-[clamp(2.5rem,10vw,8.5rem)] font-extrabold tracking-normal text-center max-w-full leading-none uppercase select-none truncate"
              style={{
                opacity: 0.05,
                fontFamily: "'Playfair Display', 'Cormorant Garamond', 'Agraham', Georgia, serif"
              }}
            >
              {siteName}
            </span>
          </div>
        </div>
      )}

      {/* Cherry cola corner accent */}
      <div className="absolute bottom-0 left-0 w-20 h-1 bg-cherry" />
    </motion.div>
  );

  return (
    <section id="story" ref={ref} className="w-full overflow-hidden">
      <div className="grid lg:grid-cols-2 min-h-[520px]">
        {imageSide === "left" ? (
          <>
            {imageCol}
            {textCol}
          </>
        ) : (
          <>
            {textCol}
            {imageCol}
          </>
        )}
      </div>
    </section>
  );
};

export default BrandStoryBlock;
