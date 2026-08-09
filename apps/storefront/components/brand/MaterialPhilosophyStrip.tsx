"use client";
import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Layers, Scissors, Zap } from "lucide-react";

const PILLARS = [
  {
    icon: Layers,
    label: "Material",
    title: "240 GSM Premium Cotton",
    body:
      "Ring-spun cotton jersey, preshrunk and garment-washed for a lived-in softness from the very first wear. Zero pilling. Zero shrinkage.",
  },
  {
    icon: Scissors,
    label: "Construction",
    title: "Drop Shoulder Architecture",
    body:
      "A deliberate 3 cm seam drop creates the signature Orizino silhouette — wider shoulder, relaxed chest, intentional drape that flatters every build.",
  },
  {
    icon: Zap,
    label: "Finish",
    title: "Engineered Details",
    body:
      "Coverstitched hems, reinforced rib neckbands, and colourfast dyes tested to 40+ wash cycles. Precision is not a luxury — it is the baseline.",
  },
];

const MaterialPhilosophyStrip: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.05 });

  return (
    <section ref={ref} className="w-full py-1 sm:py-6">
      {/* Section label */}
      <motion.div
        className="mb-2 sm:mb-6 text-center"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "100px" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="section-label text-[9px] sm:section-label mb-1 block">Craftsmanship</span>
        <h2 className="heading-editorial text-xl sm:text-4xl text-foreground">
          Why Orizino feels different
        </h2>
      </motion.div>

      {/* Three columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border">
        {PILLARS.map((pillar, i) => {
          const Icon = pillar.icon;
          return (
            <motion.div
              key={i}
              className="bg-background p-3.5 sm:p-6 flex flex-col gap-2.5 sm:gap-4"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "100px" }}
              transition={{
                duration: 0.75,
                ease: [0.16, 1, 0.3, 1],
                delay: i * 0.12,
              }}
            >
              {/* Icon + Label */}
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center border border-primary/40 dark:border-foreground/40 shrink-0">
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary dark:text-foreground" strokeWidth={1.5} />
                </div>
                <span className="section-label text-[10px] sm:text-xs">{pillar.label}</span>
              </div>

              {/* Divider */}
              <div className="w-6 sm:w-8 h-px bg-primary dark:bg-foreground" />

              {/* Title */}
              <h3 className="font-editorial text-base sm:text-xl text-foreground leading-snug">
                {pillar.title}
              </h3>

              {/* Body */}
              <p className="text-xs sm:text-sm text-muted-foreground font-sans-brand leading-relaxed">
                {pillar.body}
              </p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default MaterialPhilosophyStrip;
