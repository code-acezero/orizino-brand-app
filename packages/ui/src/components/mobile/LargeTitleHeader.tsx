"use client";
import * as React from "react";
import { cn } from "@orizino/ui/utils";

/**
 * iOS-style large-title header.
 * Collapses to a compact inline title as the user scrolls past the threshold.
 *
 * Usage:
 *   <LargeTitleHeader title="Shop" right={<button aria-label="Filter"><Filter/></button>} />
 */
export interface LargeTitleHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
  scrollThreshold?: number;
  className?: string;
  sticky?: boolean;
}

export function LargeTitleHeader({
  title,
  subtitle,
  left,
  right,
  scrollThreshold = 56,
  className,
  sticky = true,
}: LargeTitleHeaderProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setCollapsed(window.scrollY > scrollThreshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [scrollThreshold]);

  return (
    <header
      className={cn(
        sticky && "sticky top-0 z-30",
        "bg-background/80 backdrop-blur-xl transition-[padding,border-color] duration-200",
        "pt-[max(env(safe-area-inset-top),0.5rem)]",
        collapsed ? "border-b border-border/60" : "border-b border-transparent",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 h-11">
        <div className="flex items-center gap-2 min-w-0">{left}</div>
        <h1
          className={cn(
            "font-semibold truncate transition-opacity duration-200",
            collapsed ? "opacity-100" : "opacity-0",
          )}
        >
          {title}
        </h1>
        <div className="flex items-center gap-1">{right}</div>
      </div>
      <div
        className={cn(
          "px-4 overflow-hidden transition-all duration-200",
          collapsed ? "max-h-0 opacity-0" : "max-h-32 opacity-100 pb-3",
        )}
      >
        <h1 className="text-[2rem] leading-tight font-bold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        ) : null}
      </div>
    </header>
  );
}

export default LargeTitleHeader;
