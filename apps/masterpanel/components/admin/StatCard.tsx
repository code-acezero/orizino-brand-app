"use client";
import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Tone = "default" | "primary" | "success" | "warning" | "danger" | "accent";

const toneRing: Record<Tone, string> = {
  default: "bg-secondary/60 text-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
  warning: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
  danger: "bg-destructive/10 text-destructive",
  accent: "bg-accent/10 text-accent",
};

interface Props {
  title: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tone?: Tone;
  trend?: number;
  trendLabel?: string;
  hint?: string;
  className?: string;
  onClick?: () => void;
}

/**
 * Unified metric card. Replaces the per-page StatCard implementations in
 * SalesDashboard, AffiliateHub, and similar pages.
 */
const StatCard: React.FC<Props> = ({
  title,
  value,
  icon,
  tone = "default",
  trend,
  trendLabel,
  hint,
  className,
  onClick,
}) => {
  const Root = onClick ? motion.button : motion.div;
  return (
    <Root
      {...(onClick ? { type: "button", onClick } : {})}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "group relative w-full text-left rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 sm:p-5 transition-colors",
        "hover:border-primary/30",
        onClick && "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">{title}</p>
          <p className="text-2xl md:text-[1.75rem] font-display font-bold leading-tight tracking-tight truncate">
            {value}
          </p>
          {trend !== undefined && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs font-medium",
                trend >= 0 ? "text-[hsl(var(--success))]" : "text-destructive",
              )}
            >
              {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{trend >= 0 ? "+" : ""}{trend}%</span>
              {trendLabel && <span className="text-muted-foreground font-normal">{trendLabel}</span>}
            </div>
          )}
          {hint && !trend && <p className="text-xs text-muted-foreground truncate">{hint}</p>}
        </div>
        {icon && (
          <div
            className={cn(
              "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
              toneRing[tone],
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </Root>
  );
};

export default StatCard;
// code:4ce0
