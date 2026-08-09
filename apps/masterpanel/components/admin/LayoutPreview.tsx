"use client";
import React from "react";

interface LayoutConfig {
  section_spacing: string;
  container_max_width: string;
  section_animation: string;
  animation_delay: number;
  show_section_dividers: boolean;
  divider_style: string;
  featured_bg: string;
  arrivals_bg: string;
  categories_bg: string;
  featured_columns: number;
  arrivals_columns: number;
  card_style: string;
  section_title_size: string;
  section_title_align: string;
  page_bg: string;
  page_bg_pattern: string;
}

const spacingPxMap: Record<string, number> = { "8": 8, "12": 12, "16": 16, "20": 20, "24": 24 };

const getBgClass = (bg: string) => {
  switch (bg) {
    case "subtle": return "bg-secondary/40";
    case "glass": return "bg-primary/5 backdrop-blur border border-white/10";
    case "primary-tint": return "bg-primary/10";
    case "gradient": return "bg-gradient-to-br from-primary/10 to-accent/10";
    case "dark": return "bg-foreground/10";
    default: return "";
  }
};

const getPatternStyle = (pattern: string): React.CSSProperties => {
  switch (pattern) {
    case "dots": return { backgroundImage: "radial-gradient(circle, hsl(var(--primary) / 0.12) 1px, transparent 1px)", backgroundSize: "8px 8px" };
    case "grid": return { backgroundImage: "linear-gradient(hsl(var(--primary) / 0.08) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.08) 1px, transparent 1px)", backgroundSize: "16px 16px" };
    case "diagonal": return { backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 4px, hsl(var(--primary) / 0.06) 4px, hsl(var(--primary) / 0.06) 5px)" };
    default: return {};
  }
};

const getDivider = (style: string) => {
  switch (style) {
    case "dashed": return <div className="border-t border-dashed border-border/50 mx-2" />;
    case "gradient": return <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mx-2" />;
    case "dots": return <div className="flex justify-center gap-0.5 py-0.5">{[...Array(3)].map((_, i) => <span key={i} className="w-1 h-1 rounded-full bg-border" />)}</div>;
    default: return <div className="border-t border-border/40 mx-2" />;
  }
};

const CardSkeleton = ({ style }: { style: string }) => {
  const base = "rounded bg-muted/60 flex flex-col";
  const extra = style === "bordered" ? " border-2 border-border" : style === "elevated" ? " shadow-md" : style === "minimal" ? " bg-muted/30" : "";
  return (
    <div className={`${base}${extra}`} style={{ aspectRatio: "3/4" }}>
      <div className="flex-1 bg-muted/40 rounded-t" />
      <div className="p-1 space-y-0.5">
        <div className="h-1 bg-muted rounded w-3/4" />
        <div className="h-1 bg-primary/30 rounded w-1/2" />
      </div>
    </div>
  );
};

const SectionTitle = ({ align, size, text }: { align: string; size: string; text: string }) => {
  const sizeMap: Record<string, string> = { "2xl": "text-[6px]", "3xl": "text-[7px]", "4xl": "text-[8px]", "5xl": "text-[9px]" };
  return (
    <div className={`flex items-center mb-1 ${align === "center" ? "justify-center" : "justify-between"}`}>
      <span className={`${sizeMap[size] || "text-[7px]"} font-bold text-foreground`}>{text}</span>
      {align !== "center" && <span className="text-[4px] px-1 py-0.5 rounded bg-muted text-muted-foreground">View All</span>}
    </div>
  );
};

const LayoutPreview: React.FC<{ config: LayoutConfig }> = ({ config }) => {
  const gap = spacingPxMap[config.section_spacing] || 16;
  const scaledGap = Math.max(4, gap * 0.5);

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-background">
      <div className="bg-muted/30 px-2 py-1 border-b border-border flex items-center gap-1">
        <div className="flex gap-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-destructive/60" />
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/60" />
          <div className="w-1.5 h-1.5 rounded-full bg-green-500/60" />
        </div>
        <span className="text-[5px] text-muted-foreground ml-1 font-mono">yourstore.com</span>
      </div>

      <div
        className="p-2 overflow-y-auto"
        style={{ ...getPatternStyle(config.page_bg_pattern), maxHeight: 420 }}
      >
        {/* Navbar wireframe */}
        <div className="h-3 bg-muted/40 rounded mb-2 flex items-center px-1 gap-1">
          <div className="w-4 h-1.5 bg-primary/40 rounded" />
          <div className="flex-1" />
          <div className="w-2 h-1.5 bg-muted rounded" />
          <div className="w-2 h-1.5 bg-muted rounded" />
        </div>

        <div className="mx-auto flex flex-col" style={{ gap: scaledGap, maxWidth: config.container_max_width === "100%" ? "100%" : undefined }}>
          {/* Slider */}
          <div className="h-16 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg flex items-center justify-center">
            <span className="text-[6px] text-muted-foreground font-medium">🎠 Showcase Slider</span>
          </div>

          {config.show_section_dividers && getDivider(config.divider_style)}

          {/* Categories */}
          <div className={`rounded-lg p-1.5 ${getBgClass(config.categories_bg)}`}>
            <SectionTitle align={config.section_title_align} size={config.section_title_size} text="Categories" />
            <div className="grid grid-cols-6 gap-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <div className="w-4 h-4 rounded-full bg-muted/60" />
                  <div className="h-0.5 w-3 bg-muted rounded" />
                </div>
              ))}
            </div>
          </div>

          {config.show_section_dividers && getDivider(config.divider_style)}

          {/* Featured */}
          <div className={`rounded-lg p-1.5 ${getBgClass(config.featured_bg)}`}>
            <SectionTitle align={config.section_title_align} size={config.section_title_size} text="Featured Products" />
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${config.featured_columns}, 1fr)` }}>
              {Array.from({ length: config.featured_columns }).map((_, i) => (
                <CardSkeleton key={i} style={config.card_style} />
              ))}
            </div>
          </div>

          {config.show_section_dividers && getDivider(config.divider_style)}

          {/* New Arrivals */}
          <div className={`rounded-lg p-1.5 ${getBgClass(config.arrivals_bg)}`}>
            <SectionTitle align={config.section_title_align} size={config.section_title_size} text="✨ New Arrivals" />
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${config.arrivals_columns}, 1fr)` }}>
              {Array.from({ length: config.arrivals_columns }).map((_, i) => (
                <CardSkeleton key={i} style={config.card_style} />
              ))}
            </div>
          </div>
        </div>

        {/* Footer wireframe */}
        <div className="h-6 bg-muted/30 rounded mt-3 flex items-center justify-center">
          <span className="text-[4px] text-muted-foreground">Footer</span>
        </div>
      </div>
    </div>
  );
};

export default LayoutPreview;
// code:4ce0
