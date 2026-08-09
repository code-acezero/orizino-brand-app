"use client";
import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ShieldCheck, Layers, Scissors, Award, CheckCircle2 } from "lucide-react";

export interface SpecItem {
  tag: string;
  title: string;
  description: string;
}

export interface BrandSpecsConfig {
  is_enabled?: boolean;
  badge_tag?: string;
  title?: string;
  subtitle?: string;
  items?: SpecItem[];
}

const DEFAULT_SPECS: SpecItem[] = [
  {
    tag: "380+ GSM TERRY",
    title: "Heavyweight Cotton",
    description: "Dense 100% combed French Terry cotton structured for substantial drape and shape retention.",
  },
  {
    tag: "ARCHITECTURAL FIT",
    title: "Drop-Shoulder Cut",
    description: "Custom boxy silhouette with relaxed shoulder drape engineered for everyday versatility.",
  },
  {
    tag: "REACTIVE DYE",
    title: "Deep Color Fastness",
    description: "Specialized garment-dye process producing rich tonal depth that maintains vibrancy wash after wash.",
  },
  {
    tag: "TWIN-NEEDLE SEAMS",
    title: "Reinforced Construction",
    description: "High-density double-needle stitching along stress points to prevent stretching and distortion.",
  },
];

const ICONS = [Layers, Scissors, Award, ShieldCheck];

interface BrandSpecsSpotlightProps {
  config?: BrandSpecsConfig | null;
  isLoading?: boolean;
}

export const BrandSpecsSpotlightSkeleton: React.FC = () => (
  <div className="w-full animate-pulse space-y-8">
    <div className="flex flex-col items-center text-center justify-center gap-3">
      <div className="h-6 w-44 rounded-full bg-muted/60" />
      <div className="h-8 w-72 rounded-lg bg-muted/60" />
      <div className="h-4 w-80 rounded-md bg-muted/40" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-6 rounded-2xl bg-card/40 border border-border/40 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-muted/60" />
          <div className="h-3 w-24 rounded bg-muted/40" />
          <div className="h-5 w-36 rounded bg-muted/60" />
          <div className="h-10 w-full rounded bg-muted/30" />
        </div>
      ))}
    </div>
  </div>
);

const BrandSpecsSpotlight: React.FC<BrandSpecsSpotlightProps> = ({ config, isLoading }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.05 });

  if (isLoading) return <BrandSpecsSpotlightSkeleton />;
  if (config?.is_enabled === false) return null;

  const badgeTag = config?.badge_tag || "[ THE ORIZINO STANDARD ]";
  const title = config?.title || "Engineered Craftsmanship";
  const subtitle = config?.subtitle || "Uncompromising quality and custom-milled textiles built for longevity.";
  const items = Array.isArray(config?.items) && config.items.length > 0 ? config.items : DEFAULT_SPECS;

  return (
    <section ref={ref} className="w-full">
      {/* Header */}
      <motion.div
        className="flex flex-col items-center text-center justify-center mb-3 sm:mb-10 gap-1 sm:gap-2"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "100px" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="heading-editorial text-xl sm:text-4xl text-foreground font-bold tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[11px] sm:text-sm text-muted-foreground max-w-md line-clamp-2 sm:line-clamp-none">
            {subtitle}
          </p>
        )}
      </motion.div>

      {/* 4-Pillar Grid — 2 columns on mobile, 4 columns on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 w-full">
        {items.slice(0, 4).map((item, idx) => {
          const Icon = ICONS[idx % ICONS.length];
          return (
            <motion.div
              key={item.tag + idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "100px" }}
              transition={{ duration: 0.6, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="group relative p-3.5 sm:p-6 rounded-xl sm:rounded-2xl bg-card/70 dark:bg-card/50 border border-border/60 hover:border-primary/50 transition-all duration-300 flex flex-col justify-between backdrop-blur-sm"
            >
              <div>
                <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-2.5 sm:mb-5 text-primary group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary dark:text-foreground" strokeWidth={1.75} />
                </div>
                <span className="text-[9px] sm:text-[10px] font-mono tracking-[0.15em] sm:tracking-[0.2em] text-primary dark:text-foreground font-semibold uppercase block mb-1">
                  {item.tag}
                </span>
                <h3 className="font-sans-brand font-bold text-xs sm:text-base text-foreground mb-1 sm:mb-2 tracking-tight">
                  {item.title}
                </h3>
                <p className="font-sans-brand text-[10px] sm:text-xs text-muted-foreground leading-snug sm:leading-relaxed line-clamp-3 sm:line-clamp-none">
                  {item.description}
                </p>
              </div>

              <div className="mt-3 sm:mt-6 pt-2 sm:pt-4 border-t border-border/30 flex items-center justify-end">
                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary dark:text-foreground/70 transition-colors" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default BrandSpecsSpotlight;
