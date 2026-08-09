"use client";
import * as React from "react";
import { cn } from "@orizino/ui/utils";

/**
 * Sticky bottom action bar with safe-area padding.
 * Place at the bottom of a screen for primary CTAs (e.g. Add to cart, Checkout).
 */
export interface StickyActionBarProps {
  children: React.ReactNode;
  className?: string;
  /** Render above the BottomNav (adds extra bottom offset). */
  aboveBottomNav?: boolean;
}

export function StickyActionBar({
  children,
  className,
  aboveBottomNav = false,
}: StickyActionBarProps) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 z-30 border-t border-border bg-background/85 backdrop-blur-xl",
        "px-4 pt-3",
        aboveBottomNav ? "bottom-[64px]" : "bottom-0",
        "pb-[max(env(safe-area-inset-bottom),0.75rem)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export default StickyActionBar;
