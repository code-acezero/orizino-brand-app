"use client";
import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight } from "lucide-react";

const EDITORIAL_BG = [
  "linear-gradient(160deg, hsl(60 3% 14%) 0%, hsl(0 5% 11%) 100%)",
  "linear-gradient(160deg, hsl(0 10% 10%) 0%, hsl(60 3% 13%) 100%)",
  "linear-gradient(160deg, hsl(30 8% 12%) 0%, hsl(60 3% 10%) 100%)",
  "linear-gradient(160deg, hsl(60 3% 12%) 0%, hsl(0 8% 11%) 100%)",
];

const CategoryMosaic: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-6%" });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-mosaic"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, image_url, accent_color")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(4);
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const displayed = categories.length >= 4 ? categories : [
    ...categories,
    ...Array.from({ length: 4 - categories.length }, (_, i) => ({
      id: `placeholder-${i}`,
      name: ["Essentials", "Oversized", "Graphic", "Minimalist"][categories.length + i] || "Collection",
      slug: "inventory",
      image_url: null,
      accent_color: null,
    })),
  ];

  const [main, ...subs] = displayed;

  return (
    <section ref={ref} className="w-full">
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="section-label block mb-2">Categories</span>
        <h2 className="heading-editorial text-3xl sm:text-4xl text-foreground">
          Shop the collection
        </h2>
      </motion.div>

      {/* Mosaic grid: large left + 3 right */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
        {/* Main large tile — spans 2 cols and 2 rows */}
        <motion.a
          href={`/categories/${main?.slug}`}
          className="group relative col-span-2 row-span-2 overflow-hidden"
          style={{
            height: "min(70vw, 440px)",
            background: EDITORIAL_BG[0],
          }}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          {main?.image_url && (
            <img
              src={main.image_url}
              alt={main.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />
          )}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, transparent 30%, hsl(60 3% 8% / 0.9) 100%)" }}
          />
          <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
            <h3 className="font-editorial text-3xl lg:text-4xl text-cream mb-2">{main?.name}</h3>
            <div className="flex items-center gap-2 text-cream/60 text-xs font-sans-brand tracking-wide">
              <span>Explore</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
          {/* Cherry corner */}
          <div className="absolute bottom-0 left-0 w-1 h-12 bg-cherry" />
        </motion.a>

        {/* Three sub-tiles */}
        {subs.slice(0, 3).map((cat: any, i: number) => (
          <motion.a
            key={cat.id}
            href={`/categories/${cat.slug}`}
            className="group relative overflow-hidden"
            style={{
              height: "min(35vw, 210px)",
              background: EDITORIAL_BG[(i + 1) % EDITORIAL_BG.length],
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: 0.7,
              ease: [0.16, 1, 0.3, 1],
              delay: (i + 1) * 0.1,
            }}
          >
            {cat.image_url && (
              <img
                src={cat.image_url}
                alt={cat.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
            )}
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(180deg, transparent 20%, hsl(60 3% 8% / 0.85) 100%)" }}
            />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="font-editorial text-lg text-cream leading-tight">{cat.name}</h3>
            </div>
            {/* Hover line */}
            <div className="absolute bottom-0 left-0 w-0 group-hover:w-full h-0.5 bg-cherry transition-all duration-500" />
          </motion.a>
        ))}
      </div>
    </section>
  );
};

export default CategoryMosaic;
