"use client";
import { motion } from "framer-motion";
import { ArrowUpRight, AlertTriangle } from "lucide-react";
import { useNavigate } from "@/lib/router-compat";
import type { LucideIcon } from "lucide-react";

export interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: LucideIcon;
  color: string;
  href?: string;
  onClick?: () => void;
  alert?: boolean;
  loading?: boolean;
}

export default function KpiCard({
  title, value, sub, icon: Icon, color, href, onClick, alert, loading,
}: KpiCardProps) {
  const navigate = useNavigate();
  const go = () => {
    if (onClick) onClick();
    else if (href) navigate(href);
  };
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      onClick={go}
      className="group relative w-full text-left rounded-xl border border-border/60 bg-card hover:border-border hover:shadow-sm transition-all overflow-hidden"
    >
      <div
        className="absolute inset-x-0 top-0 h-0.5 opacity-70 group-hover:opacity-100 transition-opacity"
        style={{ background: color }}
      />
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}18`, border: `1px solid ${color}30` }}
          >
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          {alert ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-destructive">
              <AlertTriangle className="w-3 h-3" /> Alert
            </span>
          ) : (
            <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
          )}
        </div>
        <p className="text-xs font-semibold tracking-wide text-muted-foreground/80">{title}</p>
        <p className="text-2xl font-display font-bold mt-1 tabular-nums">
          {loading ? <span className="inline-block h-6 w-16 rounded bg-muted animate-pulse align-middle" /> : value}
        </p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
      </div>
    </motion.button>
  );
}
// code:4ce0
