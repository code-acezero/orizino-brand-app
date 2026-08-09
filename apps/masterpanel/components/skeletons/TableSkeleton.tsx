"use client";
import React from "react";
import { SkLine, SkPill, SkCircle } from "./primitives";

interface Props {
  rows?: number;
  cols?: number;
  withAvatar?: boolean;
  withActions?: boolean;
}

const TableSkeleton: React.FC<Props> = ({ rows = 8, cols = 5, withAvatar = false, withActions = true }) => (
  <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
    {/* Header */}
    <div className="grid items-center px-4 h-11 border-b border-border/50 bg-muted/30 gap-3"
      style={{ gridTemplateColumns: `${withAvatar ? "auto " : ""}repeat(${cols}, minmax(0,1fr))${withActions ? " auto" : ""}` }}>
      {withAvatar && <div className="w-8" />}
      {Array.from({ length: cols }).map((_, i) => (
        <SkPill key={i} w={i === 0 ? "8rem" : "5rem"} />
      ))}
      {withActions && <SkPill w="3rem" />}
    </div>
    {/* Rows */}
    <div className="divide-y divide-border/40">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid items-center px-4 h-14 gap-3"
          style={{ gridTemplateColumns: `${withAvatar ? "auto " : ""}repeat(${cols}, minmax(0,1fr))${withActions ? " auto" : ""}` }}>
          {withAvatar && <SkCircle size={32} />}
          {Array.from({ length: cols }).map((_, c) => (
            <SkLine key={c} w={c === 0 ? "70%" : c === cols - 1 ? "40%" : "55%"} />
          ))}
          {withActions && <SkCircle size={28} />}
        </div>
      ))}
    </div>
  </div>
);

export default TableSkeleton;
// code:4ce0
