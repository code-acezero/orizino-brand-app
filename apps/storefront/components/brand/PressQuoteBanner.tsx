"use client";
import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Quote } from "lucide-react";

interface PressQuoteBannerProps {
  quote?: string;
  attribution?: string;
  publication?: string;
}

const PressQuoteBanner: React.FC<PressQuoteBannerProps> = ({
  quote: propQuote,
  attribution: propAttribution,
  publication: propPublication,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.05 });

  // Fetch press quote configuration from database
  const { data: dbConfig } = useQuery({
    queryKey: ["home-press-quote-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "home_press_quote_config")
        .maybeSingle();
      if (!data?.value) return null;
      const val = data.value as any;
      return val?.value ?? val;
    },
    staleTime: 5 * 60 * 1000,
  });

  const quote =
    propQuote ||
    dbConfig?.quote ||
    "Orizino redefines architectural streetwear — custom-milled heavyweight textiles, drop-shoulder precision, and effortless presence.";

  const attribution =
    propAttribution ||
    dbConfig?.attribution ||
    dbConfig?.publication ||
    "FASHION OBSERVER";

  const year =
    propPublication ||
    dbConfig?.year ||
    dbConfig?.date ||
    "2026 EDITION";

  const badgeTag = dbConfig?.badge_tag || "[ EDITORIAL SPOTLIGHT ]";

  return (
    <section ref={ref} className="w-full py-6 sm:py-10 lg:py-14 overflow-hidden">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-6 sm:p-10 lg:p-14 border border-border/40 bg-card/60 backdrop-blur-md"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "100px" }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Subtle Background Quote Watermark */}
          <div suppressHydrationWarning className="absolute -right-6 -bottom-10 pointer-events-none opacity-5 dark:opacity-10 text-foreground" aria-hidden="true">
            <Quote className="w-64 h-64 sm:w-80 sm:h-80 stroke-1" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row gap-6 sm:gap-10 items-start md:items-center">
            {/* Accent Vertical Bar */}
            <div className="hidden md:block w-1 self-stretch rounded-full bg-primary dark:bg-foreground shrink-0 min-h-[120px]" />

            <div className="flex-1 space-y-4 sm:space-y-6">
              {/* Badge Tag */}
              <div className="flex items-center gap-2">
                <span className="font-sans-brand text-[10px] sm:text-xs font-bold tracking-[0.22em] text-primary dark:text-foreground uppercase">
                  {badgeTag}
                </span>
              </div>

              {/* Quote Headline */}
              <blockquote className="heading-editorial text-xl sm:text-3xl lg:text-4xl text-foreground font-semibold leading-[1.2] tracking-tight">
                "{quote}"
              </blockquote>

              {/* Attribution Meta */}
              <div className="flex items-center gap-3 pt-1 sm:pt-2">
                <div className="w-8 h-px bg-primary/60 dark:bg-foreground/60" />
                <span className="font-sans-brand text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase text-foreground/90">
                  {attribution}
                </span>
                {year && (
                  <>
                    <span className="text-foreground/30 text-xs">•</span>
                    <span className="font-sans-brand text-xs tracking-[0.16em] text-muted-foreground uppercase">
                      {year}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PressQuoteBanner;
