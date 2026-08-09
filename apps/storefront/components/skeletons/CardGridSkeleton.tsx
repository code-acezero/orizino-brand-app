"use client";
import React from "react";
import SkeletonWatermark from "./SkeletonWatermark";
import { SkBlock, SkLine } from "./primitives";

interface Props { count?: number; cols?: number; aspect?: string }

const CardGridSkeleton: React.FC<Props> = ({ count = 8, cols = 4, aspect = "3/4" }) => (
  <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cols >= 4 ? "200px" : "240px"}, 1fr))` }}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-xl border border-border/30 bg-card overflow-hidden">
        <div className="relative w-full overflow-hidden flex items-center justify-center bg-secondary/40" style={{ aspectRatio: aspect }}>
          <SkBlock className="w-full h-full rounded-none absolute inset-0" />
          <SkeletonWatermark size="md" className="z-10" />
        </div>
        <div className="p-3.5 space-y-2">
          <SkLine w="80%" h="0.75rem" />
          <SkLine w="50%" h="0.625rem" />
        </div>
      </div>
    ))}
  </div>
);

export default CardGridSkeleton;
// code:4ce0
