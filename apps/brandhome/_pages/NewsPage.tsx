"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CompanyNav } from "@/components/nav/CompanyNav";
import Footer from "@/components/Footer";
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
          className="relative group rounded-3xl overflow-hidden border border-border/40 mb-8 bg-card/40 backdrop-blur-sm"
        >
          <div className="aspect-[21/9] relative overflow-hidden">
            {item.cover_image_url ? (
              <img
                src={item.cover_image_url}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-card to-card/50" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
            <div className="flex items-center gap-3 mb-3">
              {item.category && (
                <span className="text-[10px] uppercase tracking-widest text-primary border border-border/60 rounded-full px-3 py-1 font-sans-brand bg-background/50 backdrop-blur-sm">
                  {item.category}
                </span>
              )}
              <span className="text-[10px] text-primary uppercase tracking-widest font-sans-brand">Featured</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-editorial font-black leading-none tracking-tight text-foreground mb-3 max-w-3xl">
              {item.title}
            </h2>
            {item.excerpt && (
              <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed font-sans-brand">{item.excerpt}</p>
            )}
            <div className="flex items-center justify-between mt-6">
              {dateStr && <span className="text-xs text-muted-foreground/60 font-sans-brand">{dateStr}</span>}
              <button className="flex items-center gap-2 text-foreground text-sm font-semibold group/btn font-sans-brand">
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
      className="group rounded-2xl overflow-hidden border border-border/40 bg-card/20 backdrop-blur-sm hover:border-border/80 transition-colors cursor-pointer flex flex-col"
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
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-2 font-sans-brand">
          {item.category && (
            <span className="text-[10px] uppercase tracking-widest text-primary">{item.category}</span>
          )}
          {dateStr && <span className="text-[10px] text-muted-foreground/60">· {dateStr}</span>}
        </div>
        <h3 className="text-lg font-editorial font-bold text-foreground leading-snug group-hover:text-foreground/80 transition-colors">
          {item.title}
        </h3>
        {item.excerpt && (
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-2 font-sans-brand flex-1">{item.excerpt}</p>
        )}
        <div className="flex items-center gap-1 mt-4 text-xs text-muted-foreground/50 group-hover:text-foreground/80 transition-colors font-sans-brand font-medium">
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
    <div className="min-h-screen bg-background text-foreground">
      <CompanyNav />

      {/* Hero */}
      <section className="pt-40 pb-12 w-full px-4 sm:px-6 lg:px-8 xl:px-10 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-4 font-sans-brand">Latest</p>
          <h1 className="text-6xl md:text-7xl font-editorial font-black leading-none tracking-tight">
            NEWS &amp;
            <br />
            UPDATES
          </h1>
        </motion.div>
      </section>

      {/* Content */}
      <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 mx-auto pb-24">
        {isLoading ? (
          <div className="space-y-5">
            <div className="aspect-[21/9] rounded-3xl bg-card/40 animate-pulse border border-border/40" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] rounded-2xl bg-card/40 animate-pulse border border-border/40" />
              ))}
            </div>
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground/50">
            <p className="text-2xl font-editorial">No news yet</p>
            <p className="text-sm mt-2 font-sans-brand">Articles will appear here once published from the master panel.</p>
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

      <Footer />
    </div>
  );
}
// code:4ce0
