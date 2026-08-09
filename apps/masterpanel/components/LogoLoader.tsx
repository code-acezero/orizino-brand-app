"use client";
import React from "react";
import SectionLoader from "./loaders/SectionLoader";
import FullScreenLoader from "./loaders/FullScreenLoader";

interface LogoLoaderProps {
  size?: number;
  className?: string;
  /** "platinum" (default) for section/inline; "stroke" for page-level. */
  variant?: "platinum" | "stroke";
}

/**
 * Backwards-compatible wrapper.
 * - Inline / section use → platinum SectionLoader.
 * - Page-level callers can opt into the stroke-fill loader.
 */
const LogoLoader: React.FC<LogoLoaderProps> = ({
  size = 48,
  className = "",
  variant = "platinum",
}) => {
  if (variant === "stroke") {
    return (
      <FullScreenLoader variant="stroke" size={size} withBackdrop={false} className={className} />
    );
  }
  return <SectionLoader tone="platinum" size={size} className={className} />;
};

export default LogoLoader;
// code:4ce0
