"use client";
import React from "react";
import { SkBlock, SkLine } from "./primitives";

interface Props { count?: number; cols?: number; aspect?: string }

const CardGridSkeleton: React.FC<Props> = ({ count = 8, cols = 4, aspect = "1/1" }) => (
  <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cols >= 4 ? "200px" : "240px"}, 1fr))` }}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-2xl border border-border/40 bg-card overflow-hidden">
        <SkBlock className="w-full rounded-none" style={{ aspectRatio: aspect }} />
        <div className="p-3 space-y-2">
          <SkLine w="80%" h="0.75rem" />
          <SkLine w="50%" h="0.625rem" />
        </div>
      </div>
    ))}
  </div>
);

export default CardGridSkeleton;
