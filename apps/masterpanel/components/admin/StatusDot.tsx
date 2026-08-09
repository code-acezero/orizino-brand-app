"use client";
import React from "react";
import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "muted" | "info";

const toneClass: Record<Tone, string> = {
  success: "bg-[hsl(var(--success))]",
  warning: "bg-[hsl(var(--warning))]",
  danger: "bg-destructive",
  info: "bg-[hsl(var(--info))]",
  muted: "bg-muted-foreground",
};

interface Props {
  tone?: Tone;
  pulse?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/** Small status indicator dot with optional ping halo. */
export const StatusDot: React.FC<Props> = ({ tone = "muted", pulse = false, size = "sm", className }) => {
  const dim = size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";
  return (
    <span className={cn("relative flex", dim, className)} aria-hidden>
      {pulse && (
        <span
          className={cn("absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping", toneClass[tone])}
        />
      )}
      <span className={cn("relative inline-flex rounded-full", dim, toneClass[tone])} />
    </span>
  );
};

export default StatusDot;
// code:4ce0
