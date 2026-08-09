"use client";
import React from "react";

export interface SkeletonWatermarkProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

/**
 * Single source of truth for hardcoded elegant brand watermark shadow used in all skeleton loaders.
 * Zero database query latency — renders instantly with Playfair/Editorial typography.
 */
export default function SkeletonWatermark({ className = "", size = "md" }: SkeletonWatermarkProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10 sm:w-12 sm:h-12",
    lg: "w-16 h-16 sm:w-20 sm:h-20",
    xl: "w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40",
  };

  return (
    <div className={`relative inline-flex items-center justify-center select-none pointer-events-none ${className}`}>
      <img
        src="/orizino-logo.svg"
        alt="Orizino"
        className={`object-contain opacity-20 dark:opacity-30 ${sizeClasses[size]}`}
        style={{ filter: "brightness(0) invert(1)" }}
      />
    </div>
  );
}
