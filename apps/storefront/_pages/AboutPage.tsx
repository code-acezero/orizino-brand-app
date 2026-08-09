"use client";
import React from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import BrandStoryBlock from "@/components/brand/BrandStoryBlock";
import MaterialPhilosophyStrip from "@/components/brand/MaterialPhilosophyStrip";
import BrandSpecsSpotlight from "@/components/brand/BrandSpecsSpotlight";
import PressQuoteBanner from "@/components/brand/PressQuoteBanner";
import MarqueeStrip from "@/components/brand/MarqueeStrip";

const AboutPage: React.FC = () => {
  useSeoMeta("about", "Story & Craftsmanship — Orizino Company");

  const { data: homeSpecsConfig, isLoading: specsLoading } = useQuery({
    queryKey: ["home-specs-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "home_specs_config")
        .maybeSingle();
      if (!data?.value) return null;
      const val = data.value as any;
      return val?.value ?? val;
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="min-h-screen relative w-full overflow-x-hidden pt-6 pb-20 lg:pb-12 space-y-12 sm:space-y-16">
      {/* ── 1. Company Banner Header ── */}
      <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 text-center max-w-4xl mx-auto pt-6 sm:pt-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-4"
        >
          <span className="font-sans-brand text-xs sm:text-sm font-semibold tracking-[0.25em] text-primary dark:text-foreground uppercase">
            [ ORIZINO COMPANY & CRAFT ]
          </span>
          <h1 className="heading-editorial text-3xl sm:text-5xl lg:text-6xl text-foreground font-bold tracking-tight">
            Architectural Heavyweight Streetwear
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Founded with a singular commitment to custom-milled textiles, drop-shoulder silhouettes, and uncompromising quality. Built for everyday versatility and built to last.
          </p>
        </motion.div>
      </section>

      {/* ── 2. Brand Story Block ("Our Story") ── */}
      <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-10">
        <BrandStoryBlock />
      </section>

      {/* Marquee Divider */}
      <MarqueeStrip />

      {/* ── 3. Material Philosophy Strip (3 Pillars of Craftsmanship) ── */}
      <section className="w-full px-3.5 sm:px-6 lg:px-8 xl:px-10">
        <MaterialPhilosophyStrip />
      </section>

      {/* ── 4. Craftsmanship & Specs Spotlight ("Engineered Craftsmanship / The Orizino Standard") ── */}
      <section className="w-full px-3.5 sm:px-6 lg:px-8 xl:px-10">
        <BrandSpecsSpotlight config={homeSpecsConfig} isLoading={specsLoading} />
      </section>

      {/* ── 5. Press Quote Banner ── */}
      <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-10">
        <PressQuoteBanner />
      </section>
    </div>
  );
};

export default AboutPage;
