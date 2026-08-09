"use client";
import React from "react";
import { motion } from "framer-motion";
import ProductCard from "@/components/ProductCard";
import {
  useStorefrontLayout,
  type StorefrontLayoutId,
} from "@/hooks/use-storefront-layout";

export interface GridProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price?: number | null;
  thumbnail?: string | null;
  avg_rating?: number | null;
  review_count?: number | null;
}

interface Props {
  products: GridProduct[];
  /** Override the admin-selected layout. */
  layout?: StorefrontLayoutId;
}

/**
 * Renders a product list in one of 7 admin-selectable layouts.
 * Default = "hero-2col": large hero (first product) + 2-col tile grid.
 */
const StorefrontProductGrid: React.FC<Props> = ({ products, layout: override }) => {
  const { data: stored } = useStorefrontLayout();
  const layout: StorefrontLayoutId = override ?? stored ?? "hero-2col";

  if (!products.length) return null;

  const renderCard = (p: GridProduct, i: number, className = "") => (
    <motion.div
      key={p.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i * 0.025, 0.4) }}
      className={className}
    >
      <ProductCard
        id={p.id}
        name={p.name}
        price={p.price}
        compareAtPrice={p.compare_at_price ?? undefined}
        thumbnail={p.thumbnail ?? undefined}
        avgRating={p.avg_rating ?? 0}
        reviewCount={p.review_count ?? 0}
        slug={p.slug}
      />
    </motion.div>
  );

  if (layout === "hero-2col") {
    const [hero, ...rest] = products;
    return (
      <div className="space-y-4">
        <div className="rounded-2xl overflow-hidden">{renderCard(hero, 0, "[&_a]:aspect-[16/10]")}</div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {rest.map((p, i) => renderCard(p, i + 1))}
        </div>
      </div>
    );
  }

  if (layout === "bento") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[180px] sm:auto-rows-[220px] gap-3 sm:gap-4">
        {products.map((p, i) => {
          const big = i % 7 === 0;
          const wide = i % 5 === 3;
          const cls = big
            ? "col-span-2 row-span-2"
            : wide
            ? "col-span-2"
            : "";
          return renderCard(p, i, cls);
        })}
      </div>
    );
  }

  if (layout === "card-grid") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {products.map((p, i) => renderCard(p, i))}
      </div>
    );
  }

  if (layout === "hero-grid") {
    const [hero, ...rest] = products;
    return (
      <div className="space-y-6">
        <div className="rounded-2xl overflow-hidden">{renderCard(hero, 0, "[&_a]:aspect-[21/9]")}</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {rest.map((p, i) => renderCard(p, i + 1))}
        </div>
      </div>
    );
  }

  if (layout === "magazine") {
    const [feature, ...rest] = products;
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 md:row-span-2">{renderCard(feature, 0, "[&_a]:aspect-[4/3]")}</div>
        {rest.map((p, i) => renderCard(p, i + 1))}
      </div>
    );
  }

  if (layout === "instagram") {
    return (
      <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
        {products.map((p, i) => renderCard(p, i, "[&_a]:aspect-square"))}
      </div>
    );
  }

  // scroll-feed
  return (
    <div className="flex flex-col gap-4 max-w-xl mx-auto">
      {products.map((p, i) => renderCard(p, i, "[&_a]:aspect-[4/5]"))}
    </div>
  );
};

export default StorefrontProductGrid;
// code:4ce0
