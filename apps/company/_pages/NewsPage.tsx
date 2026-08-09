"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CompanyNav } from "@/components/nav/CompanyNav";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";

interface NewsItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  cover_image_url: string | null;
  category: string | null;
  published_at: string | null;
  featured: boolean;
  tags: string[] | null;
}

function NewsCard({ item, index, featured = false }: { item: NewsItem; index: number; featured?: boolean }) {
  const dateStr = item.published_at ? format(new Date(item.published_at), "MMM d, yyyy") : null;

  if (featured) {
    return (
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative group rounded-3xl overflow-hidden border border-white/10 mb-8"
      >
        <div className="aspect-[21/9] relative overflow-hidden">
          {item.cover_image_url ? (
            <img
              src={item.cover_image_url}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-white/10 to-white/2" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
          <div className="flex items-center gap-3 mb-3">
            {item.category && (
              <span className="text-xs uppercase tracking-widest text-white/50 border border-white/20 rounded-full px-3 py-1">
                {item.category}
              </span>
            )}
            <span className="text-xs text-white/30 uppercase tracking-widest">Featured</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-black leading-none tracking-tight text-white mb-3 max-w-3xl">
            {item.title}
          </h2>
          {item.excerpt && (
            <p className="text-white/60 text-lg max-w-2xl leading-relaxed">{item.excerpt}</p>
          )}
          <div className="flex items-center justify-between mt-6">
            {dateStr && <span className="text-xs text-white/40">{dateStr}</span>}
            <button className="flex items-center gap-2 text-white text-sm font-semibold group/btn">
              Read more <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </motion.article>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="group rounded-2xl overflow-hidden border border-white/10 bg-white/3 hover:border-white/25 transition-colors cursor-pointer"
    >
      {item.cover_image_url && (
        <div className="aspect-[16/9] overflow-hidden">
          <img
            src={item.cover_image_url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-600"
          />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          {item.category && (
            <span className="text-[10px] uppercase tracking-widest text-white/40">{item.category}</span>
          )}
          {dateStr && <span className="text-[10px] text-white/30">· {dateStr}</span>}
        </div>
        <h3 className="text-lg font-display font-bold text-white leading-snug group-hover:text-white/80 transition-colors">
          {item.title}
        </h3>
        {item.excerpt && (
          <p className="text-sm text-white/50 mt-2 leading-relaxed line-clamp-2">{item.excerpt}</p>
        )}
        <div className="flex items-center gap-1 mt-4 text-xs text-white/40 group-hover:text-white/70 transition-colors">
          Read more <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </motion.article>
  );
}

export default function NewsPage() {
  const { data: articles = [], isLoading } = useQuery<NewsItem[]>({
    queryKey: ["company-news"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("news_articles")
        .select("*")
        .order("published_at", { ascending: false });
      return (data ?? []) as NewsItem[];
    },
  });

  const featured = articles.find((a) => a.featured);
  const rest = articles.filter((a) => !a.featured);

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <CompanyNav />

      {/* Hero */}
      <section className="pt-40 pb-12 px-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">Latest</p>
          <h1 className="text-6xl md:text-7xl font-display font-black leading-none tracking-tight">
            NEWS &amp;
            <br />
            UPDATES
          </h1>
        </motion.div>
      </section>

      {/* Content */}
      <section className="px-6 max-w-7xl mx-auto pb-24">
        {isLoading ? (
          <div className="space-y-5">
            <div className="aspect-[21/9] rounded-3xl bg-white/5 animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-white/30">
            <p className="text-2xl font-display">No news yet</p>
            <p className="text-sm mt-2">Articles will appear here once published from the master panel.</p>
          </div>
        ) : (
          <>
            {featured && <NewsCard item={featured} index={0} featured />}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {rest.map((item, i) => (
                  <NewsCard key={item.id} item={item} index={i} />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
// code:4ce0
