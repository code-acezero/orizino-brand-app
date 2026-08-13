"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CompanyNav } from "@/components/nav/CompanyNav";
import Footer from "@/components/Footer";

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
      className="relative group overflow-hidden rounded-2xl bg-card/40 border border-border/40 cursor-pointer backdrop-blur-sm"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="aspect-[3/4] overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className={`w-full h-full object-cover transition-transform duration-700 ${hover ? "scale-105" : "scale-100"}`}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-card to-card/50 flex items-center justify-center">
            <span className="text-foreground/20 text-4xl font-editorial">{item.title.charAt(0)}</span>
          </div>
        )}
        <div className={`absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent transition-opacity duration-300 ${hover ? "opacity-100" : "opacity-80"}`} />
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[10px] text-primary uppercase tracking-[0.2em] mb-1.5 font-sans-brand">{item.category}</p>
            <h3 className="text-lg font-editorial font-bold text-foreground leading-tight">{item.title}</h3>
            {item.description && (
              <p className={`text-sm text-muted-foreground mt-1.5 leading-snug transition-all duration-300 font-sans-brand ${hover ? "opacity-100 max-h-20" : "opacity-0 max-h-0 overflow-hidden"}`}>
                {item.description}
              </p>
            )}
          </div>
          {item.year && <span className="text-xs text-muted-foreground/60 shrink-0 font-sans-brand">{item.year}</span>}
        </div>
        {item.tags && item.tags.length > 0 && (
          <div className={`flex flex-wrap gap-1.5 mt-3 transition-all duration-300 ${hover ? "opacity-100" : "opacity-0"}`}>
            {item.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[9px] uppercase tracking-widest bg-foreground/10 text-foreground/70 rounded-full px-2.5 py-1 font-sans-brand">{tag}</span>
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
    <div className="min-h-screen bg-background text-foreground">
      <CompanyNav />

      {/* Hero */}
      <section className="pt-40 pb-16 w-full px-4 sm:px-6 lg:px-8 xl:px-10 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <p className="font-sans-brand text-[10px] uppercase tracking-[0.3em] text-primary mb-4">Creative work</p>
          <h1 className="text-6xl md:text-7xl font-editorial font-black leading-none tracking-tight">
            DOCS
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-xl font-sans-brand">
            A curated selection of campaigns, editorials, and visual identities that define our aesthetic.
          </p>
        </motion.div>
      </section>

      {/* Category filter */}
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 mx-auto mb-10">
        <div className="flex flex-wrap gap-2">
          {availableCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`font-sans-brand text-xs uppercase tracking-[0.1em] px-6 py-3 rounded-full border transition-all duration-300 ${
                activeCategory === cat
                  ? "bg-foreground text-background border-foreground font-semibold"
                  : "bg-transparent border-border/40 text-muted-foreground hover:border-border/80 hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 mx-auto pb-24">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-card/40 animate-pulse border border-border/40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground/50">
            <p className="text-2xl font-editorial">No work yet</p>
            <p className="text-sm mt-2 font-sans-brand">Docs will appear here once added from the master panel.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((item, i) => (
              <DocCard key={item.id} item={item} index={i} />
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
// code:4ce0
