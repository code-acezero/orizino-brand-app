"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Check, AlertTriangle } from "lucide-react";

interface Variant {
  id: string;
  size: string | null;
  color: string | null;
  stock_quantity: number;
  price_override: number | null;
  is_active: boolean;
  image_url: string | null;
}

interface VariantSelectorProps {
  productId: string;
  selectedSize: string | null;
  selectedColor: string | null;
  onSizeChange: (size: string | null) => void;
  onColorChange: (color: string | null) => void;
  layout?: "minimal" | "premium" | "editorial";
}

// Common color name → hex
const COLOR_MAP: Record<string, string> = {
  red: "#ef4444", blue: "#3b82f6", green: "#22c55e", black: "#0a0a0a",
  white: "#f5f5f5", yellow: "#eab308", orange: "#f97316", purple: "#a855f7",
  pink: "#ec4899", gray: "#6b7280", grey: "#6b7280", brown: "#78350f",
  navy: "#1e3a5f", beige: "#d2b48c", maroon: "#800000", teal: "#14b8a6",
  gold: "#d4a017", silver: "#c0c0c0", cream: "#fffdd0", coral: "#ff7f50",
  olive: "#808000", burgundy: "#800020", khaki: "#c3b091", lavender: "#e6e6fa",
  charcoal: "#374151", tan: "#d4a76a", turquoise: "#06b6d4", violet: "#7c3aed",
};

const getColorHex = (name: string) => COLOR_MAP[name.toLowerCase()] || "#888888";

const isLightColor = (name: string) =>
  ["white", "cream", "beige", "yellow", "khaki", "lavender", "silver", "gold"].includes(name.toLowerCase());

const VariantSelector: React.FC<VariantSelectorProps> = ({
  productId, selectedSize, selectedColor, onSizeChange, onColorChange,
}) => {
  const [hoveredColor, setHoveredColor] = React.useState<string | null>(null);

  const { data: variants = [] } = useQuery<Variant[]>({
    queryKey: ["product-variants", productId],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_variants")
        .select("id, size, color, stock_quantity, price_override, is_active, image_url")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("sort_order");
      return (data || []) as Variant[];
    },
    enabled: !!productId,
  });

  const sizes  = [...new Set(variants.map(v => v.size).filter(Boolean))] as string[];
  const colors = [...new Set(variants.map(v => v.color).filter(Boolean))] as string[];

  // Auto-select single size or single color options if only 1 is available
  React.useEffect(() => {
    if (variants.length === 0) return;
    const inStockVars = variants.filter(v => v.stock_quantity > 0);
    const pool = inStockVars.length > 0 ? inStockVars : variants;

    const availSizes = [...new Set(pool.map(v => v.size).filter(Boolean))] as string[];
    const availColors = [...new Set(pool.map(v => v.color).filter(Boolean))] as string[];

    if (availSizes.length === 1 && !selectedSize) {
      onSizeChange(availSizes[0]);
    }
    if (availColors.length === 1 && !selectedColor) {
      onColorChange(availColors[0]);
    }
  }, [variants, selectedSize, selectedColor, onSizeChange, onColorChange]);

  const isComboInStock = (s: string | null, c: string | null) => {
    return variants.some(v => {
      const matchSize = s === null || v.size === s;
      const matchColor = c === null || v.color === c;
      return matchSize && matchColor && (v.stock_quantity || 0) > 0;
    });
  };

  const getComboStock = (s: string | null, c: string | null) => {
    if (s !== null && c !== null) {
      return variants.find(v => v.size === s && v.color === c)?.stock_quantity ?? 0;
    }
    if (s !== null && c === null) {
      return variants.filter(v => v.size === s).reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
    }
    if (s === null && c !== null) {
      return variants.filter(v => v.color === c).reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
    }
    return variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
  };

  const sizeRequired = sizes.length > 0;
  const colorRequired = colors.length > 0;
  const hasCompleteSelection = (!sizeRequired || !!selectedSize) && (!colorRequired || !!selectedColor);
  const stock = getComboStock(selectedSize, selectedColor);

  return (
    <div className="space-y-5">

      {/* ── Size Selector ── */}
      {sizes.length > 0 && (
        <div className="w-full">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Size</span>
            {selectedSize && (
              <span className="text-xs font-medium text-primary px-2 py-0.5 rounded-md bg-primary/10">
                {selectedSize}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 w-full">
            {sizes.map(size => {
              const inStock  = isComboInStock(size, selectedColor);
              const selected = selectedSize === size;
              return (
                <button
                  key={size}
                  onClick={() => onSizeChange(selected ? null : size)}
                  disabled={!inStock}
                  className={cn(
                    "h-10 min-w-[2.75rem] px-4 rounded-xl text-sm font-semibold border-2 transition-all duration-150 flex items-center justify-center gap-1.5 shadow-xs",
                    selected
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : inStock
                        ? "border-border/80 bg-secondary/40 text-foreground hover:border-primary/60 hover:bg-primary/5"
                        : "border-border/40 text-muted-foreground/40 line-through cursor-not-allowed opacity-50"
                  )}
                >
                  <span>{size}</span>
                  {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Color Selector ── */}
      {colors.length > 0 && (
        <div className="w-full">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Color</span>
            {selectedColor && (
              <span className="text-xs font-medium text-primary px-2 py-0.5 rounded-md bg-primary/10 capitalize">
                {selectedColor}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2.5 w-full">
            {colors.map(color => {
              const inStock   = isComboInStock(selectedSize, color);
              const selected  = selectedColor === color;
              const hex       = getColorHex(color);
              const light     = isLightColor(color);
              const imgSrc    = variants.find(v => v.color === color && v.image_url && (selectedSize === null || v.size === selectedSize))?.image_url;

              return (
                <div key={color} className="relative group">
                  <button
                    onClick={() => onColorChange(selected ? null : color)}
                    onMouseEnter={() => setHoveredColor(color)}
                    onMouseLeave={() => setHoveredColor(null)}
                    disabled={!inStock}
                    title={color}
                    aria-label={`Select ${color}`}
                    className={cn(
                      "w-9 h-9 rounded-xl border-2 transition-all duration-150 flex items-center justify-center relative shadow-xs",
                      selected
                        ? "border-primary ring-2 ring-primary/40 ring-offset-1 ring-offset-background scale-105"
                        : inStock
                          ? "border-border/60 hover:border-primary/60 hover:scale-105"
                          : "opacity-30 cursor-not-allowed"
                    )}
                    style={{ backgroundColor: hex }}
                  >
                    {selected && (
                      <Check className={cn("w-3.5 h-3.5 drop-shadow-sm", light ? "text-gray-900" : "text-white")} />
                    )}
                    {!inStock && (
                      <span
                        className="absolute inset-0 rounded-xl"
                        style={{
                          background: "repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(0,0,0,0.25) 4px, rgba(0,0,0,0.25) 5px)",
                        }}
                      />
                    )}
                  </button>

                  {/* Color name tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    {imgSrc ? (
                      <div className="rounded-xl overflow-hidden border border-border shadow-xl">
                        <img src={imgSrc} alt={color} className="w-20 h-20 object-cover block" />
                        <div className="px-2 py-1 bg-card text-center">
                          <span className="text-[10px] font-medium text-foreground capitalize">{color}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="px-2 py-1 rounded-lg bg-foreground text-background text-[10px] font-medium capitalize whitespace-nowrap shadow-md">
                        {color}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Stock status pill ── */}
      {(selectedSize || selectedColor) && (
        <div className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border shadow-xs transition-all",
          stock === 0
            ? "bg-destructive/10 text-destructive border-destructive/20"
            : stock <= 5
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              : "bg-primary/10 text-primary border-primary/20"
        )}>
          {hasCompleteSelection ? (
            stock === 0 ? (
              <><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Out of stock for this selection</>
            ) : stock <= 5 ? (
              <><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Only {stock} left — order soon</>
            ) : (
              <><Check className="w-3.5 h-3.5 shrink-0" /> {stock} units available</>
            )
          ) : (
            stock === 0 ? (
              <><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Out of stock in {selectedColor || selectedSize}</>
            ) : (
              <><Check className="w-3.5 h-3.5 shrink-0" /> {stock} units available in {selectedColor || selectedSize} — Select a {sizeRequired && !selectedSize ? "Size" : "Color"}</>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default VariantSelector;
// code:4ce0
