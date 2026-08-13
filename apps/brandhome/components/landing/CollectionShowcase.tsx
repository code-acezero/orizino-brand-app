"use client";
import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";

interface CollectionItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  href: string;
}

interface CollectionShowcaseProps {
  items?: CollectionItem[];
  title?: string;
}

const FALLBACK_ITEMS: CollectionItem[] = [
  { id: "1", title: "Essentials", subtitle: "Always in season", imageUrl: undefined, href: "/categories/essentials" },
  { id: "2", title: "Oversized", subtitle: "Architectural silhouette", imageUrl: undefined, href: "/categories/oversized" },
  { id: "3", title: "Drop Shoulder", subtitle: "Signature cut", imageUrl: undefined, href: "/categories/drop-shoulder" },
  { id: "4", title: "Graphic Series", subtitle: "Wearable art", imageUrl: undefined, href: "/categories/graphic" },
  { id: "5", title: "Minimalist", subtitle: "Quiet luxury", imageUrl: undefined, href: "/categories/minimalist" },
];

const EDITORIAL_BG = [
  "linear-gradient(160deg, hsl(60 3% 14%), hsl(60 3% 10%))",
  "linear-gradient(160deg, hsl(0 20% 10%), hsl(60 3% 12%))",
  "linear-gradient(160deg, hsl(30 15% 12%), hsl(60 3% 10%))",
  "linear-gradient(160deg, hsl(60 3% 12%), hsl(0 15% 9%))",
  "linear-gradient(160deg, hsl(0 10% 11%), hsl(60 3% 13%))",
];

const CollectionShowcase: React.FC<CollectionShowcaseProps> = ({
  items,
  title = "Collections",
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-5%" });
  const displayItems = items?.length ? items : FALLBACK_ITEMS;

  return (
    <section ref={ref} className="w-full overflow-hidden">
      {/* Header */}
      <motion.div
        className="flex items-end justify-between mb-6"
        initial={{ opacity: 0, y: 12 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="section-label">{title}</span>
        <p className="text-xs text-muted-foreground font-sans-brand tracking-wide">
          Scroll to explore →
        </p>
      </motion.div>

      {/* Horizontal scroll strip */}
      <div
        className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {displayItems.map((item, i) => (
          <motion.a
            key={item.id}
            href={item.href}
            className="group relative flex-shrink-0 overflow-hidden"
            style={{
              width: "min(72vw, 280px)",
              height: "min(90vw, 380px)",
              scrollSnapAlign: "start",
              background: EDITORIAL_BG[i % EDITORIAL_BG.length],
            }}
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: 0.75,
              ease: [0.16, 1, 0.3, 1],
              delay: i * 0.08,
            }}
          >
            {/* Image */}
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
            )}

            {/* Overlay gradient */}
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(180deg, transparent 40%, hsl(60 3% 8% / 0.95) 100%)" }}
            />

            {/* Top index */}
            <div className="absolute top-4 right-4">
              <span className="font-sans-brand text-[0.6rem] text-cream/40 tracking-[0.2em]">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>

            {/* Bottom content */}
            <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-2 group-hover:translate-y-0 transition-transform duration-400">
              {item.subtitle && (
                <p className="section-label text-cream/50 mb-1.5">{item.subtitle}</p>
              )}
              <h3 className="font-editorial text-xl text-cream leading-tight">
                {item.title}
              </h3>
              {/* Cherry accent line — reveals on hover */}
              <div className="mt-3 h-px w-0 group-hover:w-full bg-cherry transition-all duration-500 ease-out" />
            </div>
          </motion.a>
        ))}
      </div>
    </section>
  );
};

export default CollectionShowcase;
