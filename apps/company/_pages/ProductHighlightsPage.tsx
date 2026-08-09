"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CompanyNav } from "@/components/nav/CompanyNav";
import { storefrontHref } from "@/lib/cross-app-urls";
import { ArrowRight, Star, ShoppingBag } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  base_price: number;
  images: string[];
  category_id: string | null;
  is_featured: boolean;
  tags: string[] | null;
  average_rating: number | null;
  review_count: number | null;
}

function ProductCard({ product, index }: { product: Product; index: number }) {
  const [imgIdx, setImgIdx] = useState(0);
  const { currency, rate } = useCurrency() as any;
  const price = product.base_price * (rate ?? 1);
  const shopUrl = storefrontHref(`/product/${product.slug}`);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.06 }}
      className="group"
    >
      {/* Image */}
      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-white/5 mb-4">
        <AnimatePresence mode="wait">
          <motion.img
            key={imgIdx}
            src={product.images[imgIdx] || "/placeholder.svg"}
            alt={product.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        </AnimatePresence>

        {/* Image dots */}
        {product.images.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {product.images.slice(0, 4).map((_, i) => (
              <button
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIdx ? "bg-white w-4" : "bg-white/40"}`}
                onMouseEnter={() => setImgIdx(i)}
                onClick={() => setImgIdx(i)}
              />
            ))}
          </div>
        )}

        {/* Featured badge */}
        {product.is_featured && (
          <div className="absolute top-3 left-3 bg-white text-black text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
            Featured
          </div>
        )}

        {/* Shop CTA overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <a
            href={shopUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white text-black text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-white/90 transition-colors"
          >
            <ShoppingBag className="w-4 h-4" /> Shop Now
          </a>
        </div>
      </div>

      {/* Info */}
      <div>
        {product.average_rating && (
          <div className="flex items-center gap-1 mb-1">
            <Star className="w-3 h-3 fill-white/40 text-white/40" />
            <span className="text-xs text-white/40">
              {product.average_rating.toFixed(1)}
              {product.review_count && <span className="ml-1">({product.review_count})</span>}
            </span>
          </div>
        )}
        <h3 className="text-base font-display font-bold text-white leading-tight">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-white/50 mt-1 line-clamp-2 leading-relaxed">{product.description}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm font-semibold text-white">
            {currency} {price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          <a
            href={shopUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors group/link"
          >
            View <ArrowRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

export default function ProductHighlightsPage() {
  const [showAll, setShowAll] = useState(false);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["company-featured-products"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("products")
        .select("id, name, slug, description, base_price, images, category_id, is_featured, tags, average_rating, review_count")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(24);
      return (data ?? []) as unknown as Product[];
    },
  });

  const displayed = showAll ? products : products.slice(0, 9);

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
          <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">Our collection</p>
          <h1 className="text-6xl md:text-7xl font-display font-black leading-none tracking-tight">
            PRODUCT
            <br />
            HIGHLIGHTS
          </h1>
          <p className="mt-6 text-lg text-white/50 leading-relaxed max-w-xl">
            Handpicked pieces from our latest collections. Premium quality, impeccable craft.
          </p>
        </motion.div>
      </section>

      {/* Grid */}
      <section className="px-6 max-w-7xl mx-auto pb-24">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse mb-4" />
                <div className="h-4 bg-white/5 rounded animate-pulse mb-2 w-3/4" />
                <div className="h-3 bg-white/5 rounded animate-pulse w-1/2" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-white/30">
            <ShoppingBag className="w-10 h-10 opacity-30 mb-4" />
            <p className="text-2xl font-display">No products yet</p>
            <p className="text-sm mt-2">Featured products will appear here from your catalog.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-10">
              {displayed.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
            {!showAll && products.length > 9 && (
              <div className="flex justify-center mt-14">
                <button
                  onClick={() => setShowAll(true)}
                  className="flex items-center gap-2 border border-white/20 text-white/70 hover:text-white hover:border-white/50 px-8 py-3 rounded-full text-sm font-medium transition-all"
                >
                  View all {products.length} products <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
// code:4ce0
