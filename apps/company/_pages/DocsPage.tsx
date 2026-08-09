"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CompanyNav } from "@/components/nav/CompanyNav";

interface DocItem {
  id: string;
  title: string;
  category: string;
  description: string | null;
  image_url: string | null;
  year: string | null;
  tags: string[] | null;
  sort_order: number;
}

const CATEGORIES = ["All", "Campaign", "Editorial", "Lookbook", "Product"];

function DocCard({ item, index }: { item: DocItem; index: number }) {
  const [hover, setHover] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07 }}
      className="relative group overflow-hidden rounded-2xl bg-white/5 border border-white/10 cursor-pointer"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="aspect-[3/4] overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className={`w-full h-full object-cover transition-transform duration-700 ${hover ? "scale-110" : "scale-100"}`}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/2 flex items-center justify-center">
            <span className="text-white/20 text-4xl font-display">{item.title.charAt(0)}</span>
          </div>
        )}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 ${hover ? "opacity-100" : "opacity-70"}`} />
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-xs text-white/50 uppercase tracking-widest mb-1">{item.category}</p>
            <h3 className="text-lg font-display font-bold text-white leading-tight">{item.title}</h3>
            {item.description && (
              <p className={`text-sm text-white/60 mt-1 leading-snug transition-all duration-300 ${hover ? "opacity-100 max-h-20" : "opacity-0 max-h-0 overflow-hidden"}`}>
                {item.description}
              </p>
            )}
          </div>
          {item.year && <span className="text-xs text-white/40 shrink-0">{item.year}</span>}
        </div>
        {item.tags && item.tags.length > 0 && (
          <div className={`flex flex-wrap gap-1.5 mt-3 transition-all duration-300 ${hover ? "opacity-100" : "opacity-0"}`}>
            {item.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10px] bg-white/10 text-white/70 rounded-full px-2 py-0.5">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function DocsPage() {
  const [activeCategory, setActiveCategory] = useState("All");

  const { data: items = [], isLoading } = useQuery<DocItem[]>({
    queryKey: ["company-docs"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("portfolio_items")
        .select("*")
        .order("sort_order", { ascending: true });
      return (data ?? []) as DocItem[];
    },
  });

  const filtered = activeCategory === "All"
    ? items
    : items.filter((i) => i.category === activeCategory);

  const availableCategories = ["All", ...Array.from(new Set(items.map((i) => i.category))).filter(Boolean)];

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <CompanyNav />

      {/* Hero */}
      <section className="pt-40 pb-16 px-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">Creative work</p>
          <h1 className="text-6xl md:text-7xl font-display font-black leading-none tracking-tight">
            DOCS
          </h1>
          <p className="mt-6 text-lg text-white/50 leading-relaxed max-w-xl">
            A curated selection of campaigns, editorials, and visual identities that define our aesthetic.
          </p>
        </motion.div>
      </section>

      {/* Category filter */}
      <div className="px-6 max-w-7xl mx-auto mb-10">
        <div className="flex flex-wrap gap-2">
          {availableCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-sm px-5 py-2 rounded-full border transition-all duration-200 ${
                activeCategory === cat
                  ? "bg-white text-black border-white font-semibold"
                  : "border-white/20 text-white/60 hover:border-white/40 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <section className="px-6 max-w-7xl mx-auto pb-24">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-white/30">
            <p className="text-2xl font-display">No work yet</p>
            <p className="text-sm mt-2">Docs will appear here once added from the master panel.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((item, i) => (
              <DocCard key={item.id} item={item} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
// code:4ce0
