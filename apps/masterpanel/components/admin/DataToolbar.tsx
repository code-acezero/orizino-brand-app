"use client";
import React from "react";
import { cn } from "@/lib/utils";

interface Props {
  /** Left slot — usually a SearchInput or filter chips. */
  left?: React.ReactNode;
  /** Right slot — usually action buttons / bulk controls. */
  right?: React.ReactNode;
  className?: string;
  /** Optional caption/description below the toolbar. */
  caption?: React.ReactNode;
}

/**
 * Standard toolbar row above a data table.
 * - Mobile: stacks vertically, right slot wraps.
 * - Desktop: left grows, right hugs the trailing edge.
 */
const DataToolbar: React.FC<Props> = ({ left, right, caption, className }) => (
  <div className={cn("space-y-2", className)}>
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      {left && <div className="min-w-0 flex-1 sm:max-w-md">{left}</div>}
      {right && <div className="flex flex-wrap items-center gap-2 sm:ml-auto">{right}</div>}
    </div>
    {caption && <p className="text-xs text-muted-foreground">{caption}</p>}
  </div>
);

export default DataToolbar;
// code:4ce0
