"use client";
import React from "react";
import SkeletonWatermark from "./SkeletonWatermark";
import { SkLine, SkBlock } from "./primitives";

const DetailSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="space-y-2">
      <SkLine w="60%" h="1.5rem" />
      <SkLine w="30%" h="0.75rem" />
    </div>
    <div className="flex gap-2">
      {Array.from({ length: 4 }).map((_, i) => <SkBlock key={i} className="h-8 w-20" />)}
    </div>
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <div className="relative h-56 w-full rounded-2xl overflow-hidden flex items-center justify-center bg-card/30 border border-border/30">
          <SkBlock className="h-full w-full rounded-none absolute inset-0" />
          <SkeletonWatermark size="xl" className="z-10" />
        </div>
        <SkBlock className="h-32 w-full" />
      </div>
      <div className="space-y-4">
        <SkBlock className="h-40 w-full" />
        <SkBlock className="h-32 w-full" />
      </div>
    </div>
  </div>
);

export default DetailSkeleton;
// code:4ce0
