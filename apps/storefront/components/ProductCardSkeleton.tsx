"use client";
import React from "react";
import SkeletonWatermark from "@/components/skeletons/SkeletonWatermark";

const ProductCardSkeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`relative flex flex-col overflow-hidden bg-card animate-pulse w-full max-w-[280px] mx-auto border border-border/30 ${className}`}>
    {/* Image area matching 3/4 aspect ratio */}
    <div className="relative w-full aspect-[3/4] bg-secondary/40 flex items-center justify-center overflow-hidden">
      <SkeletonWatermark size="md" />
    </div>
    {/* Product Info matching compact ProductCard layout with 2-line placeholder */}
    <div className="px-2 py-2 sm:px-3 sm:py-2.5 flex flex-col items-center justify-center text-center gap-1.5">
      <div className="h-3 bg-secondary/50 rounded w-4/5" />
      <div className="h-3 bg-secondary/40 rounded w-1/2" />
      <div className="h-4 bg-secondary/40 rounded w-1/3 mt-0.5" />
    </div>
  </div>
);

export default React.memo(ProductCardSkeleton);
// code:4ce0
