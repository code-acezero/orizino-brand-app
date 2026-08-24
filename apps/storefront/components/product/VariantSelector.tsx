"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Ruler } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Variant {
  id: string;
  size: string | null;
  color: string | null;
  price_override: number | null;
  stock_quantity: number;
  image_url?: string | null;
}

interface VariantSelectorProps {
  productId: string;
  selectedSize: string | null;
  selectedColor: string | null;
  onSizeChange: (size: string | null) => void;
  onColorChange: (color: string | null) => void;
  layout?: "minimal" | "premium";
}

const COLOR_MAP: Record<string, string> = {
  black: "#0a0a0a",
  white: "#f8fafc",
  charcoal: "#27272a",
  navy: "#0f172a",
  "royal blue": "#1d4ed8",
  "sky blue": "#38bdf8",
  "emerald green": "#059669",
  olive: "#556b2f",
  "crimson red": "#dc2626",
  "rose pink": "#f43f5e",
  "amber gold": "#d97706",
  "purple violet": "#7c3aed",
  "caramel brown": "#92400e",
  "beige cream": "#f5f5dc",
  beige: "#f5f5dc",
  cream: "#fffdd0",
  grey: "#6b7280",
  gray: "#6b7280",
  "bone white": "#f5f5f0",
};

const getColorHex = (name: string): string => {
  const lower = name.toLowerCase().trim();
  if (COLOR_MAP[lower]) return COLOR_MAP[lower];
  if (/^#[0-9a-f]{3,6}$/i.test(name)) return name;
  return "#3f3f46";
};

const VariantSelector: React.FC<VariantSelectorProps> = ({
  productId,
  selectedSize,
  selectedColor,
  onSizeChange,
  onColorChange,
}) => {
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);

  const { data: variants = [] } = useQuery<Variant[]>({
    queryKey: ["product-variants", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variants" as any)
        .select("*")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as Variant[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const sizes = React.useMemo(() => {
    const set = new Set<string>();
    variants.forEach((v) => {
      if (v.size) set.add(v.size.trim());
    });
    return Array.from(set);
  }, [variants]);

  const colors = React.useMemo(() => {
    const set = new Set<string>();
    variants.forEach((v) => {
      if (v.color) set.add(v.color.trim());
    });
    return Array.from(set);
  }, [variants]);

  const isComboInStock = React.useCallback(
    (s: string | null, c: string | null) => {
      if (variants.length === 0) return true;
      return variants.some((v) => {
        const matchSize = !s || !v.size || v.size.toLowerCase().trim() === s.toLowerCase().trim();
        const matchColor = !c || !v.color || v.color.toLowerCase().trim() === c.toLowerCase().trim();
        return matchSize && matchColor && (v.stock_quantity || 0) > 0;
      });
    },
    [variants]
  );

  const getComboStock = React.useCallback(
    (s: string | null, c: string | null) => {
      if (s && c) {
        const match = variants.find(
          (v) =>
            v.size?.toLowerCase().trim() === s.toLowerCase().trim() &&
            v.color?.toLowerCase().trim() === c.toLowerCase().trim()
        );
        return match?.stock_quantity ?? 0;
      }
      if (s && !c) {
        return variants
          .filter((v) => v.size?.toLowerCase().trim() === s.toLowerCase().trim())
          .reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
      }
      if (!s && c) {
        return variants
          .filter((v) => v.color?.toLowerCase().trim() === c.toLowerCase().trim())
          .reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
      }
      return variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
    },
    [variants]
  );

  // Auto-select single color if only 1 exists
  useEffect(() => {
    if (colors.length === 1 && (!selectedColor || selectedColor.toLowerCase() !== colors[0].toLowerCase())) {
      onColorChange(colors[0]);
    }
  }, [colors, selectedColor, onColorChange]);

  // SMART AUTO-SELECT: Auto-select the first in-stock size for the active color
  useEffect(() => {
    if (sizes.length === 0 || variants.length === 0) return;

    const isCurrentInStock = selectedSize ? isComboInStock(selectedSize, selectedColor) : false;

    if (!selectedSize || !isCurrentInStock) {
      const firstInStockSize = sizes.find((sz) => isComboInStock(sz, selectedColor));

      if (firstInStockSize) {
        if (selectedSize !== firstInStockSize) {
          onSizeChange(firstInStockSize);
        }
      } else if (!selectedSize) {
        onSizeChange(sizes[0]);
      }
    }
  }, [sizes, selectedColor, variants, selectedSize, onSizeChange, isComboInStock]);

  if (sizes.length === 0 && colors.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/80 bg-card/50 backdrop-blur-sm p-4 sm:p-5 space-y-4 shadow-2xs w-full">
      {/* ── 1. Edition / Color Header Section ── */}
      {colors.length === 1 && (
        <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-border/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Edition:
            </span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-card border border-border text-foreground font-bold text-xs shadow-2xs">
              <span
                className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                style={{ backgroundColor: getColorHex(colors[0]) }}
              />
              <span className="capitalize">{colors[0]}</span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground font-medium">Standard Edition</span>
        </div>
      )}

      {/* ── Multi-Variant Color Selector ── */}
      {colors.length > 1 && (
        <div className="w-full space-y-2.5 pb-3.5 border-b border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Select Color
            </span>
            {selectedColor && (
              <span className="text-xs font-bold text-primary px-2.5 py-0.5 rounded-md bg-primary/10 border border-primary/20 capitalize">
                {selectedColor}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2.5 w-full">
            {colors.map((color) => {
              const inStock = isComboInStock(selectedSize, color);
              const selected = selectedColor?.toLowerCase().trim() === color.toLowerCase().trim();
              const hex = getColorHex(color);

              return (
                <div key={color} className="relative group">
                  <button
                    type="button"
                    onClick={() => onColorChange(color)}
                    onMouseEnter={() => setHoveredColor(color)}
                    onMouseLeave={() => setHoveredColor(null)}
                    title={color}
                    aria-label={`Select ${color}`}
                    className={cn(
                      "w-10 h-10 rounded-xl border-2 transition-all duration-200 flex items-center justify-center relative shadow-xs cursor-pointer",
                      selected
                        ? "border-primary ring-2 ring-primary/40 ring-offset-2 ring-offset-background scale-105"
                        : inStock
                        ? "border-border/80 hover:border-primary/60 hover:scale-105"
                        : "border-border/40 opacity-50 hover:opacity-100"
                    )}
                    style={{ backgroundColor: hex }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 2. Size Selector Section ── */}
      {sizes.length > 0 && (
        <div className="w-full space-y-3">
          {/* Header Row: Label (Left) + Size Guide Modal Link (Right) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Select Size:
              </span>
              {selectedSize && (
                <span className="text-xs font-bold text-primary px-2.5 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                  {selectedSize}
                </span>
              )}
            </div>

            {/* Size Guide Modal Link */}
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  <Ruler className="w-3.5 h-3.5 text-primary" />
                  <span>Size Guide</span>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold text-foreground">
                    Size & Measurements Chart
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-xs pt-2">
                  <div className="grid grid-cols-4 gap-2 text-center p-2 rounded-xl bg-muted/40 font-bold text-muted-foreground">
                    <span>Size</span>
                    <span>Chest (in)</span>
                    <span>Length (in)</span>
                    <span>Sleeve (in)</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center p-2 rounded-lg border border-border/50 font-medium">
                    <span className="font-bold text-primary">M</span>
                    <span>40 - 42</span>
                    <span>28.5</span>
                    <span>9.0</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center p-2 rounded-lg border border-border/50 font-medium">
                    <span className="font-bold text-primary">L</span>
                    <span>42 - 44</span>
                    <span>29.5</span>
                    <span>9.5</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center p-2 rounded-lg border border-border/50 font-medium">
                    <span className="font-bold text-primary">XL</span>
                    <span>44 - 46</span>
                    <span>30.5</span>
                    <span>10.0</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center p-2 rounded-lg border border-border/50 font-medium">
                    <span className="font-bold text-primary">XXL</span>
                    <span>46 - 48</span>
                    <span>31.5</span>
                    <span>10.5</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center pt-1">
                    European oversized drop shoulder cut. Order your true size for intended relaxed fit.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Symmetrical Buttons Row: Size Chips (Left) + Stock Status (Right Corner) */}
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            {/* Left: Size Chips */}
            <div className="flex flex-wrap gap-2 sm:gap-2.5 items-center">
              {sizes.map((size) => {
                const inStock = isComboInStock(size, selectedColor);
                const selected = selectedSize?.toLowerCase().trim() === size.toLowerCase().trim();

                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => onSizeChange(size)}
                    className={cn(
                      "h-11 min-w-[3.25rem] px-4 rounded-xl text-xs sm:text-sm font-bold border-2 transition-all duration-150 flex items-center justify-center shadow-2xs cursor-pointer select-none",
                      selected
                        ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30 scale-[1.02]"
                        : inStock
                        ? "border-border/90 bg-card text-foreground font-bold hover:border-primary/70 hover:bg-primary/5 hover:text-primary shadow-xs hover:scale-[1.02]"
                        : "border-dashed border-border/60 bg-muted/20 text-muted-foreground/60 hover:border-border hover:text-foreground"
                    )}
                  >
                    <span>{size}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Corner: In-Stock / Out-of-Stock Status Pill matching exact button height h-11 */}
            {selectedSize && (
              <div className="ml-auto shrink-0">
                {isComboInStock(selectedSize, selectedColor) ? (
                  <div className="h-11 px-4 rounded-xl text-xs font-bold bg-primary/10 text-primary border-2 border-primary/30 flex items-center shadow-2xs select-none">
                    <span>In Stock</span>
                    {getComboStock(selectedSize, selectedColor) <= 8 && (
                      <span className="text-[11px] font-semibold text-amber-500 ml-1.5">
                        ({getComboStock(selectedSize, selectedColor)} left)
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="h-11 px-4 rounded-xl text-xs font-bold bg-destructive/10 text-destructive border-2 border-destructive/30 flex items-center shadow-2xs select-none">
                    <span>Out of Stock</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VariantSelector;
