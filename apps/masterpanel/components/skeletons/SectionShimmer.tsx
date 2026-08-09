"use client";
import React from "react";
import { SkBlock, SkLine, SkCircle, SkPill } from "./primitives";

/**
 * Section-shaped shimmer skeletons that mirror real page layouts.
 * Use these inside the data region only — page chrome should render immediately.
 *
 *   {isLoading ? <SectionShimmer of="productGrid" count={8} /> : <Grid>...</Grid>}
 */
export type SectionShimmerKind =
  | "productGrid"
  | "productRow"
  | "productHero"
  | "reviewList"
  | "orderRow"
  | "cartLine"
  | "filterRail"
  | "categoryChips"
  | "textBlock"
  | "tableRows";

interface Props {
  of: SectionShimmerKind;
  count?: number;
  className?: string;
}

const SectionShimmer: React.FC<Props> = ({ of, count = 6, className = "" }) => {
  switch (of) {
    case "productGrid":
      return (
        <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 ${className}`}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/30 bg-card/30 overflow-hidden">
              <SkBlock className="w-full rounded-none" style={{ aspectRatio: "5/6" }} />
              <div className="p-2 sm:p-3 space-y-1.5">
                <SkLine w="85%" h="0.7rem" />
                <SkLine w="40%" h="0.55rem" />
                <SkLine w="55%" h="0.85rem" />
              </div>
            </div>
          ))}
        </div>
      );
    case "productRow":
      return (
        <div className={`flex gap-3 overflow-hidden ${className}`}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="shrink-0 w-[160px] sm:w-[200px] rounded-2xl border border-border/30 bg-card/30 overflow-hidden">
              <SkBlock className="w-full rounded-none" style={{ aspectRatio: "5/6" }} />
              <div className="p-2 space-y-1.5">
                <SkLine w="80%" h="0.65rem" />
                <SkLine w="45%" h="0.75rem" />
              </div>
            </div>
          ))}
        </div>
      );
    case "productHero":
      return (
        <div className={`grid md:grid-cols-2 gap-4 md:gap-8 ${className}`}>
          <SkBlock className="rounded-2xl md:rounded-3xl w-full" style={{ aspectRatio: "1/1" }} />
          <div className="space-y-3 md:space-y-4 py-2 md:py-4">
            <SkPill w="6rem" />
            <SkLine w="75%" h="1.5rem" />
            <SkLine w="50%" h="1rem" />
            <div className="flex gap-2 pt-1">
              {Array.from({ length: 4 }).map((_, i) => <SkCircle key={i} size={28} />)}
            </div>
            <SkLine w="35%" h="2rem" />
            <SkLine w="100%" h="0.7rem" />
            <SkLine w="90%" h="0.7rem" />
            <SkLine w="60%" h="0.7rem" />
            <div className="pt-4 flex gap-2">
              <SkBlock className="h-12 flex-1" />
              <SkBlock className="h-12 w-12 rounded-full" />
            </div>
          </div>
        </div>
      );
    case "reviewList":
      return (
        <div className={`space-y-4 ${className}`}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/30 bg-card/30 p-4 space-y-2">
              <div className="flex items-center gap-3">
                <SkCircle size={36} />
                <div className="flex-1 space-y-1.5">
                  <SkLine w="35%" h="0.7rem" />
                  <SkLine w="20%" h="0.55rem" />
                </div>
              </div>
              <SkLine w="100%" h="0.65rem" />
              <SkLine w="92%" h="0.65rem" />
              <SkLine w="60%" h="0.65rem" />
            </div>
          ))}
        </div>
      );
    case "orderRow":
      return (
        <div className={`space-y-3 ${className}`}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/30 bg-card/30 p-4 flex items-center gap-4">
              <SkBlock className="rounded-xl w-16 h-16 shrink-0" />
              <div className="flex-1 space-y-2">
                <SkLine w="50%" h="0.8rem" />
                <SkLine w="30%" h="0.6rem" />
              </div>
              <SkPill w="4rem" />
            </div>
          ))}
        </div>
      );
    case "cartLine":
      return (
        <div className={`space-y-3 ${className}`}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/30 bg-card/30 p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
              <SkBlock className="rounded-xl w-20 h-20 shrink-0" />
              <div className="flex-1 space-y-2">
                <SkLine w="70%" h="0.85rem" />
                <SkLine w="40%" h="0.6rem" />
                <SkLine w="25%" h="0.75rem" />
              </div>
              <SkPill w="3rem" />
            </div>
          ))}
        </div>
      );
    case "filterRail":
      return (
        <div className={`space-y-4 ${className}`}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <SkLine w="40%" h="0.7rem" />
              <SkLine w="100%" h="0.55rem" />
              <SkLine w="80%" h="0.55rem" />
              <SkLine w="60%" h="0.55rem" />
            </div>
          ))}
        </div>
      );
    case "categoryChips":
      return (
        <div className={`flex gap-2 flex-wrap ${className}`}>
          {Array.from({ length: count }).map((_, i) => (
            <SkPill key={i} w={`${4 + (i % 4) * 1.5}rem`} />
          ))}
        </div>
      );
    case "textBlock":
      return (
        <div className={`space-y-2 ${className}`}>
          {Array.from({ length: count }).map((_, i) => (
            <SkLine key={i} w={`${60 + (i * 13) % 35}%`} h="0.7rem" />
          ))}
        </div>
      );
    case "tableRows":
      return (
        <div className={`space-y-2 ${className}`}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/30 bg-card/30 px-3 py-2.5 flex items-center gap-3">
              <SkCircle size={28} />
              <SkLine w="30%" h="0.7rem" />
              <SkLine w="20%" h="0.65rem" className="ml-auto" />
              <SkPill w="4rem" />
            </div>
          ))}
        </div>
      );
  }
};

export default SectionShimmer;
// code:4ce0
