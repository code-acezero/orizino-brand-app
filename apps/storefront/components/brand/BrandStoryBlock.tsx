"use client";
import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface BrandStoryBlockProps {
  imageUrl?: string;
  imageSide?: "left" | "right";
}

const BrandStoryBlock: React.FC<BrandStoryBlockProps> = ({
  imageUrl,
  imageSide = "left",
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.05 });

  const fallbackBg =
    "linear-gradient(135deg, hsl(var(--charcoal)) 0%, hsl(0 3% 14%) 100%)";

  const textCol = (
    <motion.div
      className="flex flex-col justify-center gap-5 py-8 px-6 lg:px-12"
      initial={{ opacity: 0, x: imageSide === "left" ? 40 : -40 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "100px" }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
    >
      <span className="section-label">Our Story</span>

      <h2
        className="heading-editorial text-3xl lg:text-5xl text-foreground leading-[1.05]"
        style={{ maxWidth: "22ch" }}
      >
        Designed for those who carry themselves with{" "}
        <em className="text-primary dark:text-foreground not-italic">quiet intention.</em>
      </h2>

      <p
        className="text-muted-foreground text-xs sm:text-sm leading-relaxed font-sans-brand"
        style={{ maxWidth: "42ch" }}
      >
        Orizino was born from a simple belief — that a perfectly engineered
        drop shoulder silhouette is not just clothing, it is a statement of
        self-assurance. Every piece is constructed with obsessive attention to
        fit, fabric weight, and finish.
      </p>

      <div className="flex flex-col gap-2.5 text-xs sm:text-sm font-sans-brand text-muted-foreground">
        {[
          "240 GSM premium cotton jersey",
          "Structural drop shoulder — 3cm engineered seam drop",
          "Garment-dyed & stone-washed finishes",
        ].map((point, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className="w-4 h-px bg-primary dark:bg-foreground flex-shrink-0" />
            <span>{point}</span>
          </div>
        ))}
      </div>

      <a
        href="/page/about"
        className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.15em] uppercase font-sans-brand text-foreground hover:text-primary dark:hover:text-primary transition-colors group pt-1"
      >
        Read Our Story
        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1 text-primary dark:text-foreground" />
      </a>
    </motion.div>
  );

  const imageCol = (
    <motion.div
      className="relative overflow-hidden min-h-[320px] lg:min-h-0"
      initial={{ opacity: 0, scale: 1.04 }}
      animate={inView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Orizino brand story"
          className="w-full h-full object-cover absolute inset-0"
          loading="lazy"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-end p-8"
          style={{ background: fallbackBg }}
        >
          {/* Decorative editorial placeholder */}
          <div className="space-y-2">
            <div className="w-16 h-px bg-primary dark:bg-foreground" />
            <p className="font-editorial italic text-3xl text-foreground/90 opacity-90">
              Orizino
            </p>
            <p className="section-label text-foreground/40">Est. 2023 · Kushtia</p>
          </div>
          {/* Watermark */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ opacity: 0.04 }}
          >
            <span
              className="font-editorial text-foreground text-[12vw] font-bold tracking-tighter whitespace-nowrap"
            >
              ORIZINO
            </span>
          </div>
        </div>
      )}

      {/* Accent corner bar */}
      <div className="absolute bottom-0 left-0 w-20 h-1 bg-primary dark:bg-foreground" />
    </motion.div>
  );

  return (
    <section ref={ref} className="w-full overflow-hidden">
      <div className="grid lg:grid-cols-2 min-h-[380px] lg:min-h-[440px]">
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
