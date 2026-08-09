"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import { Check, X, ArrowLeftRight, ChevronDown, ChevronUp, ShoppingCart, Loader2, Minus, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface Variant {
  id: string;
  size: string | null;
  color: string | null;
  stock_quantity: number;
  price_override: number | null;
  is_active: boolean;
  image_url: string | null;
  sku: string | null;
}

interface VariantComparisonProps {
  productId: string;
  basePrice: number;
  compareAtPrice?: number | null;
  productName: string;
  productThumbnail?: string | null;
  onAddToCart?: (variantId: string, variantLabel: string, quantity: number) => Promise<void>;
}

const COLOR_MAP: Record<string, string> = {
  red: "#ef4444", blue: "#3b82f6", green: "#22c55e", black: "#000000",
  white: "#ffffff", yellow: "#eab308", orange: "#f97316", purple: "#a855f7",
  pink: "#ec4899", gray: "#6b7280", grey: "#6b7280", brown: "#92400e",
  navy: "#1e3a5f", beige: "#d2b48c", maroon: "#800000", teal: "#14b8a6",
  gold: "#d4a017", silver: "#c0c0c0", cream: "#fffdd0", coral: "#ff7f50",
  olive: "#808000", burgundy: "#800020", khaki: "#c3b091", lavender: "#e6e6fa",
};

const getColorHex = (name: string): string =>
  COLOR_MAP[name.toLowerCase()] || "#888888";

const MAX_COMPARE = 4;

const VariantComparison: React.FC<VariantComparisonProps> = ({
  productId, basePrice, compareAtPrice, productName, productThumbnail, onAddToCart,
}) => {
  const { formatPrice } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [addingToCartId, setAddingToCartId] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const { data: variants = [] } = useQuery<Variant[]>({
    queryKey: ["product-variants-compare", productId],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_variants")
        .select("id, size, color, stock_quantity, price_override, is_active, image_url, sku")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("sort_order");
      return (data || []) as Variant[];
    },
    enabled: !!productId,
  });

  if (variants.length < 2) return null;

  const toggleVariant = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < MAX_COMPARE
        ? [...prev, id]
        : prev
    );
  };

  const selectAll = () => setSelectedIds(variants.slice(0, MAX_COMPARE).map((v) => v.id));
  const clearAll = () => setSelectedIds([]);

  const compared = variants.filter((v) => selectedIds.includes(v.id));
  const getLabel = (v: Variant) => [v.size, v.color].filter(Boolean).join(" / ") || "Default";
  const getPrice = (v: Variant) => v.price_override ?? basePrice;

  const hasSizes = variants.some((v) => v.size);
  const hasColors = variants.some((v) => v.color);
  const hasSku = variants.some((v) => v.sku);
  const hasImages = variants.some((v) => v.image_url);

  return (
    <div className="border border-border/60 rounded-xl overflow-hidden w-full shadow-xs">
      {/* Toggle header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Compare Variants</span>
          <Badge variant="outline" className="text-xs">{variants.length} options</Badge>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Variant selector chips */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Select up to {MAX_COMPARE} variants to compare</span>
                  <div className="flex gap-2">
                    <button onClick={selectAll} className="text-xs text-primary hover:underline">Select all</button>
                    <button onClick={clearAll} className="text-xs text-muted-foreground hover:underline">Clear</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v) => {
                    const isSelected = selectedIds.includes(v.id);
                    return (
                      <button
                        key={v.id}
                        onClick={() => toggleVariant(v.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        {v.color && (
                          <span
                            className="w-3 h-3 rounded-full border border-border/50 inline-block"
                            style={{ backgroundColor: getColorHex(v.color) }}
                          />
                        )}
                        {getLabel(v)}
                        {isSelected && <Check className="w-3 h-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comparison table */}
              {compared.length >= 2 && (
                <div className="overflow-x-auto -mx-4 px-4">
                  <table className="w-full text-sm border-collapse min-w-[400px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 pr-4 text-xs font-semibold text-muted-foreground w-24">Feature</th>
                        {compared.map((v) => (
                          <th key={v.id} className="text-center py-3 px-2">
                            <span className="text-xs font-semibold text-foreground">{getLabel(v)}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Image row */}
                      {hasImages && (
                        <tr className="border-b border-border/50">
                          <td className="py-3 pr-4 text-xs text-muted-foreground font-medium">Image</td>
                          {compared.map((v) => (
                            <td key={v.id} className="py-3 px-2 text-center">
                              <div className="flex justify-center">
                                <img
                                  src={v.image_url || productThumbnail || "/placeholder.svg"}
                                  alt={getLabel(v)}
                                  className="w-20 h-20 object-cover rounded-lg border border-border"
                                />
                              </div>
                            </td>
                          ))}
                        </tr>
                      )}

                      {/* Price row */}
                      <tr className="border-b border-border/50">
                        <td className="py-3 pr-4 text-xs text-muted-foreground font-medium">Price</td>
                        {compared.map((v) => {
                          const price = getPrice(v);
                          const diff = price - basePrice;
                          return (
                            <td key={v.id} className="py-3 px-2 text-center">
                              <div className="font-bold text-foreground">{formatPrice(price)}</div>
                              {diff !== 0 && (
                                <span className={cn("text-xs", diff > 0 ? "text-destructive" : "text-primary")}>
                                  {diff > 0 ? "+" : ""}{formatPrice(diff)}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Size row */}
                      {hasSizes && (
                        <tr className="border-b border-border/50">
                          <td className="py-3 pr-4 text-xs text-muted-foreground font-medium">Size</td>
                          {compared.map((v) => (
                            <td key={v.id} className="py-3 px-2 text-center text-foreground">
                              {v.size || "—"}
                            </td>
                          ))}
                        </tr>
                      )}

                      {/* Color row */}
                      {hasColors && (
                        <tr className="border-b border-border/50">
                          <td className="py-3 pr-4 text-xs text-muted-foreground font-medium">Color</td>
                          {compared.map((v) => (
                            <td key={v.id} className="py-3 px-2 text-center">
                              {v.color ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <span
                                    className="w-4 h-4 rounded-full border border-border/50 inline-block"
                                    style={{ backgroundColor: getColorHex(v.color) }}
                                  />
                                  <span className="text-foreground capitalize">{v.color}</span>
                                </div>
                              ) : "—"}
                            </td>
                          ))}
                        </tr>
                      )}

                      {/* Stock row */}
                      <tr className="border-b border-border/50">
                        <td className="py-3 pr-4 text-xs text-muted-foreground font-medium">Availability</td>
                        {compared.map((v) => (
                          <td key={v.id} className="py-3 px-2 text-center">
                            {v.stock_quantity > 5 ? (
                              <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                                <Check className="w-3 h-3 mr-1" /> In Stock
                              </Badge>
                            ) : v.stock_quantity > 0 ? (
                              <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-500">
                                Only {v.stock_quantity} left
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs border-destructive/30 text-destructive">
                                <X className="w-3 h-3 mr-1" /> Out of Stock
                              </Badge>
                            )}
                          </td>
                        ))}
                      </tr>

                      {/* SKU row */}
                      {hasSku && (
                        <tr>
                          <td className="py-3 pr-4 text-xs text-muted-foreground font-medium">SKU</td>
                          {compared.map((v) => (
                            <td key={v.id} className="py-3 px-2 text-center text-xs text-muted-foreground font-mono">
                              {v.sku || "—"}
                            </td>
                          ))}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                      )}

                      {/* Quantity row */}
                      {onAddToCart && (
                        <tr className="border-b border-border/50">
                          <td className="py-3 pr-4 text-xs text-muted-foreground font-medium">Quantity</td>
                          {compared.map((v) => {
                            const qty = quantities[v.id] || 1;
                            const max = v.stock_quantity;
                            return (
                              <td key={v.id} className="py-3 px-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    disabled={qty <= 1 || max === 0}
                                    onClick={() => setQuantities((p) => ({ ...p, [v.id]: Math.max(1, qty - 1) }))}
                                    className="w-6 h-6 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="w-6 text-center text-sm font-medium text-foreground">{max === 0 ? 0 : qty}</span>
                                  <button
                                    disabled={qty >= max}
                                    onClick={() => setQuantities((p) => ({ ...p, [v.id]: Math.min(max, qty + 1) }))}
                                    className="w-6 h-6 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      )}

                      {/* Add to Cart row */}
                      {onAddToCart && (
                        <tr>
                          <td className="py-3 pr-4 text-xs text-muted-foreground font-medium">Action</td>
                          {compared.map((v) => {
                            const isAdding = addingToCartId === v.id;
                            const label = getLabel(v);
                            const qty = quantities[v.id] || 1;
                            return (
                              <td key={v.id} className="py-3 px-2 text-center">
                                <Button
                                  size="sm"
                                  disabled={v.stock_quantity === 0 || isAdding}
                                  onClick={async () => {
                                    setAddingToCartId(v.id);
                                    await onAddToCart(v.id, label, qty);
                                    setAddingToCartId(null);
                                  }}
                                  className="gap-1.5 text-xs w-full"
                                >
                                  {isAdding ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <ShoppingCart className="w-3 h-3" />
                                  )}
                                  {v.stock_quantity === 0 ? "Sold Out" : `Add ${qty > 1 ? `(${qty})` : ""}`}
                                </Button>
                              </td>
                            );
                          })}
                        </tr>
                      )}
              {compared.length < 2 && (
                <p className="text-center text-xs text-muted-foreground py-4">
                  Select at least 2 variants above to see a side-by-side comparison
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VariantComparison;
// code:4ce0
