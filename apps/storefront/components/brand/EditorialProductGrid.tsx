"use client";
import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";

interface EditorialProductGridProps {
  products: any[];
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
  viewAllLink?: string;
  maxProducts?: number;
}

/**
 * Asymmetric editorial magazine product grid.
 * On desktop: first card is 2×2 (featured), remaining cards in a side column.
 * On mobile: single column stack.
 */
const EditorialProductGrid: React.FC<EditorialProductGridProps> = ({
  products,
  isLoading = false,
  title = "Featured",
  subtitle = "Handpicked essentials",
  viewAllLink = "/inventory",
  maxProducts = 5,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.05 });

  const displayed = products.slice(0, Math.min(maxProducts, 7));

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  };
  const cardVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const } },
  };

  if (!isLoading && displayed.length === 0) return null;

  return (
    <section ref={ref} className="w-full relative pt-2">
      {/* Luxury Section Header */}
      <motion.div
        className="flex flex-col items-center text-center justify-center mb-8 gap-2"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "100px" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        {isLoading ? (
          <div className="h-8 w-44 rounded-lg bg-muted/60 animate-pulse mb-1" />
        ) : (
          <h2 className="heading-editorial text-3xl sm:text-4xl text-foreground font-bold tracking-tight">
            {title}
          </h2>
        )}
        {isLoading ? (
          <div className="h-4 w-56 rounded-md bg-muted/40 animate-pulse" />
        ) : subtitle ? (
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md">{subtitle}</p>
        ) : null}
      </motion.div>

      {/* Center-aligned dynamic product grid */}
      <motion.div
        className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-5 w-full mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
      >
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-[calc(50%-0.5rem)] sm:w-[210px] md:w-[230px] lg:w-[250px] xl:w-[260px] shrink-0">
                <ProductCardSkeleton />
              </div>
            ))
          : displayed.map((product) => (
              <motion.div
                key={product.id}
                variants={cardVariants}
                className="w-[calc(50%-0.5rem)] sm:w-[210px] md:w-[230px] lg:w-[250px] xl:w-[260px] shrink-0"
              >
                <ProductCard
                  id={product.id}
                  name={product.name}
                  price={Number(product.price)}
                  compareAtPrice={product.compare_at_price ? Number(product.compare_at_price) : undefined}
                  thumbnail={product.thumbnail || (Array.isArray(product.images) ? product.images[0] : null)}
                  avgRating={product.avg_rating || 0}
                  reviewCount={product.review_count || 0}
                  slug={product.slug}
                  createdAt={product.created_at}
                />
              </motion.div>
            ))}
      </motion.div>

      {/* View All CTA */}
      {viewAllLink && (
        <div className="mt-8 flex justify-center">
          <a
            href={viewAllLink}
            suppressHydrationWarning
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-border/80 text-foreground font-sans-brand text-xs font-semibold tracking-widest uppercase hover:bg-secondary/60 transition-all duration-300 group"
          >
            <span>View All Pieces</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </a>
        </div>
      )}
    </section>
  );
};

export default React.memo(EditorialProductGrid);
// code:4ce0
