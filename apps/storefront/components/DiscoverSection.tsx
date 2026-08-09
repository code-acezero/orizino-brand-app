"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { motion } from "framer-motion";
import { Compass } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";

import { useAuth } from "@/contexts/AuthContext";
import { getRecommendations } from "@/lib/recommendations.functions";

interface DiscoverSectionProps {
  surface: "home" | "shop";
  limit?: number;
  title?: string;
  subtitle?: string;
  className?: string;
}

function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("pi_session_id");
}

const DiscoverSection: React.FC<DiscoverSectionProps> = ({
  surface,
  limit = 8,
  title = "Picked for You",
  subtitle = "Based on your activity",
  className = "",
}) => {
  const { user } = useAuth();
  const fetchRecs = useServerFn(getRecommendations);
  const sessionId = getSessionId();

  const { data, isLoading } = useQuery({
    queryKey: ["recommendations", surface, user?.id ?? sessionId ?? "anon", limit],
    queryFn: () =>
      fetchRecs({
        data: {
          surface,
          userId: user?.id ?? null,
          sessionId: sessionId,
          limit,
        },
      }),
    // Keep Discover fluid — refresh recommendations frequently as browsing signals change
    staleTime: 30 * 1000,
  });

  const products = data?.products ?? [];

  if (isLoading) {
    return (
      <section className={`mt-10 sm:mt-14 ${className}`}>
        <div className="flex items-end justify-between mb-4 sm:mb-6">
          <div>
            <h2 className="font-bold font-display text-foreground text-xl sm:text-2xl flex items-center gap-2">
              <Compass className="w-5 h-5 text-primary" />
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {Array.from({ length: limit }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;


  return (
    <section className={`mt-10 sm:mt-14 ${className}`}>
      <div className="flex items-end justify-between mb-4 sm:mb-6">
        <div>
          <h2 className="font-bold font-display text-foreground text-xl sm:text-2xl flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary" />
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 auto-rows-fr">
        {products.map((p: any, i: number) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.4) }}
          >
            <ProductCard
              id={p.id}
              name={p.name}
              price={p.price}
              slug={p.slug}
              compareAtPrice={p.compare_at_price ?? undefined}
              thumbnail={p.thumbnail ?? undefined}
              avgRating={p.avg_rating ?? undefined}
              reviewCount={p.review_count ?? undefined}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default DiscoverSection;
// code:4ce0
