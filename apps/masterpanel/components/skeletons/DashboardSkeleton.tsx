"use client";
import React from "react";
import { SkLine, SkBlock, SkCircle } from "./primitives";

const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <SkLine w="12rem" h="1.25rem" />
        <SkLine w="18rem" h="0.75rem" />
      </div>
      <SkBlock className="h-9 w-28" />
    </div>
    {/* Stat cards */}
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <SkLine w="5rem" h="0.625rem" />
            <SkCircle size={28} />
          </div>
          <SkLine w="60%" h="1.5rem" />
          <SkLine w="40%" h="0.5rem" />
        </div>
      ))}
    </div>
    {/* Chart + list */}
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card p-4">
        <SkLine w="8rem" h="0.875rem" />
        <SkBlock className="mt-4 h-64 w-full" />
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
        <SkLine w="6rem" h="0.875rem" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <SkCircle size={32} />
            <div className="flex-1 space-y-1.5">
              <SkLine w="70%" h="0.625rem" />
              <SkLine w="40%" h="0.5rem" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default DashboardSkeleton;
// code:4ce0
