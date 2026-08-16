"use client";
import React from "react";

export interface SkeletonWatermarkProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}

/**
 * Single source of truth for hardcoded elegant brand watermark shadow used in all skeleton loaders.
 * Zero database query latency — renders logo with hardcoded ORIZINO brand title under logo.
 */
export default function SkeletonWatermark({
  className = "",
  size = "md",
  showText = true,
}: SkeletonWatermarkProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10 sm:w-12 sm:h-12",
    lg: "w-14 h-14 sm:w-18 sm:h-18",
    xl: "w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36",
  };

  const textSizes = {
    sm: "text-[9px] tracking-[0.2em]",
    md: "text-[10px] sm:text-xs tracking-[0.22em]",
    lg: "text-xs sm:text-sm tracking-[0.25em]",
    xl: "text-sm sm:text-base lg:text-lg tracking-[0.3em]",
  };

  return (
    <div className={`relative inline-flex flex-col items-center justify-center select-none pointer-events-none notranslate skiptranslate ${className}`} translate="no">
      <img
        src="/orizino-logo.svg"
        alt="Orizino"
        className={`object-contain opacity-25 dark:opacity-35 transition-opacity ${sizeClasses[size]}`}
        style={{ filter: "brightness(0) invert(1)" }}
      />
      {showText && (
        <span className={`font-extrabold uppercase font-display text-foreground/30 dark:text-foreground/40 mt-2 notranslate ${textSizes[size]}`} translate="no">
          ORIZINO
        </span>
      )}
    </div>
  );
}
// code:4ce0
