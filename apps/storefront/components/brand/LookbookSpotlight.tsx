"use client";
import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Compass, Tag } from "lucide-react";
import Link from "next/link";

export interface LookbookConfig {
  is_enabled?: boolean;
  badge_tag?: string;
  edition_tag?: string;
  campaign_subtitle?: string;
  campaign_title?: string;
  campaign_description?: string;
  image_url?: string;
  featured_look_title?: string;
  featured_look_description?: string;
  item_1_name?: string;
  item_1_price?: string;
  item_2_name?: string;
  item_2_price?: string;
  cta_text?: string;
  cta_link?: string;
}

interface LookbookSpotlightProps {
  config?: LookbookConfig | null;
  isLoading?: boolean;
}

export const LookbookSpotlightSkeleton: React.FC = () => (
  <div className="w-full animate-pulse rounded-3xl bg-secondary/20 dark:bg-card/40 border border-border/40 p-6 sm:p-8 lg:p-12">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
      <div className="lg:col-span-7 h-[380px] sm:h-[460px] lg:h-[520px] rounded-2xl bg-muted/50 border border-border/30 relative flex flex-col justify-between p-6">
        <div className="flex justify-between">
          <div className="h-6 w-36 rounded-full bg-muted/60" />
          <div className="h-4 w-24 rounded bg-muted/40" />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-32 rounded bg-muted/40" />
          <div className="h-8 w-3/4 rounded-lg bg-muted/60" />
          <div className="h-4 w-1/2 rounded bg-muted/30" />
        </div>
      </div>
      <div className="lg:col-span-5 space-y-6">
        <div className="space-y-3">
          <div className="h-4 w-40 rounded bg-muted/40" />
          <div className="h-8 w-64 rounded-lg bg-muted/60" />
          <div className="h-12 w-full rounded bg-muted/30" />
        </div>
        <div className="space-y-3">
          <div className="h-12 w-full rounded-xl bg-muted/40" />
          <div className="h-12 w-full rounded-xl bg-muted/40" />
        </div>
        <div className="h-12 w-full rounded-xl bg-muted/60" />
      </div>
    </div>
  </div>
);

const LookbookSpotlight: React.FC<LookbookSpotlightProps> = ({ config, isLoading }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.05 });

  if (isLoading) return <LookbookSpotlightSkeleton />;
  if (config?.is_enabled === false) return null;

  const badgeTag = config?.badge_tag || "[ CAMPAIGN EDITION ]";
  const editionTag = config?.edition_tag || "DROP 01 / 2026";
  const campaignSubtitle = config?.campaign_subtitle || "EDITORIAL SPOTLIGHT";
  const campaignTitle = config?.campaign_title || "Architectural Heavyweight Series";
  const campaignDescription = config?.campaign_description || "Proportionally engineered drop-shoulder silhouettes in 380GSM French Terry.";
  const imageUrl = config?.image_url || "/orizino-logo.svg";
  const featuredLookTitle = config?.featured_look_title || "The Oversized Signature Set";
  const featuredLookDescription = config?.featured_look_description || "Curated pairing of our flagship Heavyweight Drop Shoulder Tee with the Utility Cargo Pants. Styled for minimal elegance and maximal durability.";
  const item1Name = config?.item_1_name || "Heavyweight Tee (380GSM)";
  const item1Price = config?.item_1_price || "৳ 1,850";
  const item2Name = config?.item_2_name || "Architectural Utility Cargo";
  const item2Price = config?.item_2_price || "৳ 2,450";
  const ctaText = config?.cta_text || "Shop The Full Look";
  const ctaLink = config?.cta_link || "/inventory";

  return (
    <section ref={ref} className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "100px" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl bg-secondary/20 dark:bg-card/40 border border-border/40 p-6 sm:p-8 lg:p-12 w-full"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column — Campaign Editorial Card */}
          <div className="lg:col-span-7 relative h-[380px] sm:h-[460px] lg:h-[520px] rounded-2xl overflow-hidden group border border-border/40 bg-card/60">
            <div className="absolute inset-0 bg-secondary/40 flex items-center justify-center">
              <img
                src={imageUrl}
                alt={campaignTitle}
                className="w-full h-full object-cover object-center opacity-85 group-hover:scale-105 transition-all duration-700 ease-out"
              />
            </div>
            
            {/* Theme-aware Gradient Overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/50 to-transparent" />

            {/* Campaign Overlay Badges */}
            <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-background/70 backdrop-blur-md border border-border/60 text-[10px] font-mono tracking-[0.2em] text-foreground uppercase font-medium">
                <Compass className="w-3 h-3 text-primary" />
                {badgeTag}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase font-semibold">
                {editionTag}
              </span>
            </div>

            {/* Bottom Campaign Title */}
            <div className="absolute bottom-6 left-6 right-6 z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cream-deep/10 border border-cream-deep/30 text-[10px] font-mono tracking-[0.22em] text-cream-deep uppercase font-bold mb-2">
                {campaignSubtitle}
              </span>
              <h3 className="heading-editorial text-2xl sm:text-3xl lg:text-4xl text-foreground font-bold mb-2 tracking-tight">
                {campaignTitle}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-lg leading-relaxed font-sans-brand">
                {campaignDescription}
              </p>
            </div>
          </div>

          {/* Right Column — Shop The Look Details */}
          <div className="lg:col-span-5 flex flex-col justify-between h-full space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-3.5 h-3.5 text-cream-deep" />
                <span className="text-[10px] font-mono tracking-[0.2em] text-cream-deep uppercase font-semibold">
                  FEATURED LOOKBOOK OUTFIT
                </span>
              </div>
              <h3 className="heading-editorial text-2xl sm:text-3xl text-foreground font-bold mb-3 tracking-tight">
                {featuredLookTitle}
              </h3>
              <p className="font-sans-brand text-xs sm:text-sm text-muted-foreground/90 leading-relaxed mb-6">
                {featuredLookDescription}
              </p>

              {/* Specs & Highlights */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/40 border border-border/50">
                  <span className="font-sans-brand text-xs font-semibold text-foreground">{item1Name}</span>
                  <span className="font-mono text-xs font-bold text-cream-deep">{item1Price}</span>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/40 border border-border/50">
                  <span className="font-sans-brand text-xs font-semibold text-foreground">{item2Name}</span>
                  <span className="font-mono text-xs font-bold text-cream-deep">{item2Price}</span>
                </div>
              </div>
            </div>

            {/* Action CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Link
                href={ctaLink}
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-sans-brand text-xs font-bold tracking-wider uppercase hover:bg-primary/90 transition-all active:scale-[0.98]"
              >
                {ctaText}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/page/about"
                className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3.5 rounded-xl bg-secondary/70 border border-border/60 font-sans-brand text-xs font-semibold tracking-wider text-foreground hover:bg-secondary transition-all"
              >
                Read Story
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default LookbookSpotlight;
