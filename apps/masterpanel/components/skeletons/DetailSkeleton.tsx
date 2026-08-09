"use client";
import React from "react";
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
        <SkBlock className="h-48 w-full" />
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
