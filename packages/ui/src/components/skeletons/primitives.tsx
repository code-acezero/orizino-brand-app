"use client";
import React from "react";
import { cn } from "@orizino/ui/utils";

const base = "relative overflow-hidden bg-muted/40 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-foreground/[0.06] before:to-transparent";

export const SkLine: React.FC<{ w?: string; h?: string; className?: string }> = ({ w = "100%", h = "0.75rem", className }) => (
  <div className={cn(base, "rounded-full", className)} style={{ width: w, height: h }} />
);

export const SkBlock: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <div className={cn(base, "rounded-2xl", className)} style={style} />
);

export const SkCircle: React.FC<{ size?: number; className?: string }> = ({ size = 32, className }) => (
  <div className={cn(base, "rounded-full shrink-0", className)} style={{ width: size, height: size }} />
);

export const SkPill: React.FC<{ w?: string; className?: string }> = ({ w = "5rem", className }) => (
  <div className={cn(base, "rounded-full h-6", className)} style={{ width: w }} />
);
