"use client";
import React from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "@/lib/router-compat";

export type SectionRowItem = {
  key: string;
  title: string;
  sub?: string;
  url: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
};

const rowAnim = {
  hidden:  { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.03, duration: 0.22, ease: "easeOut" } }),
} as Variants;

/** Single ControlPanel-style row (icon tile + title/sub + chevron). */
export function SectionRow({ item, index = 0 }: { item: SectionRowItem; index?: number }) {
  const navigate = useNavigate();
  const Icon = item.icon;
  return (
    <motion.button
      custom={index}
      variants={rowAnim}
      initial="hidden"
      animate="visible"
      onClick={() => navigate({ to: item.url })}
      className="w-full flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3 text-left hover:bg-card hover:border-border hover:shadow-sm transition-all group"
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${item.color}20`, border: `1px solid ${item.color}33` }}
      >
        <Icon className="w-4 h-4" style={{ color: item.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight">{item.title}</p>
        {item.sub && (
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{item.sub}</p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
    </motion.button>
  );
}

/** Titled block of SectionRow items — used for grouped mobile views. */
export function SectionRowGroup({ title, items }: { title?: string; items: SectionRowItem[] }) {
  return (
    <div>
      {title && (
        <p className="text-xs font-semibold tracking-wide text-muted-foreground mb-3">
          {title}
        </p>
      )}
      <div className="space-y-2">
        {items.map((it, i) => (
          <SectionRow key={it.key} item={it} index={i} />
        ))}
      </div>
    </div>
  );
}
// code:4ce0
