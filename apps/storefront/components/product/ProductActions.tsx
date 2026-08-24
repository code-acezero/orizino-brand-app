"use client";

import React from "react";
import { ShoppingCart, Zap, Heart, Minus, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProductActionsProps {
  quantity: number;
  setQuantity: (q: number) => void;
  maxQuantity: number;
  onAddToCart: () => void;
  onBuyNow: () => void;
  onToggleWishlist: () => void;
  inWishlist?: boolean;
  addingToCart: boolean;
  inStock: boolean;
  layout?: "minimal" | "premium" | "editorial";
  disabled?: boolean;
  disabledReason?: string;
  selectionSteps?: { label: string; complete: boolean }[];
}

const ProductActions: React.FC<ProductActionsProps> = ({
  quantity,
  setQuantity,
  maxQuantity,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
  inWishlist = false,
  addingToCart,
  inStock,
  disabled = false,
}) => {
  const isLocked = disabled || !inStock;

  return (
    <div className="pt-1 w-full">
      {/* ── Perfectly Parallel & Symmetrical Actions Bar ── */}
      <div className="flex items-center gap-2 sm:gap-2.5 w-full">
        {/* 1. Quantity Stepper */}
        <div className="h-12 sm:h-13 shrink-0 px-1 rounded-full sm:rounded-xl border-2 border-border/90 bg-card flex items-center justify-between shadow-2xs select-none">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <span className="w-7 sm:w-8 text-center text-xs sm:text-sm font-bold text-foreground tabular-nums">
            {quantity}
          </span>

          <button
            type="button"
            onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
            disabled={quantity >= maxQuantity || !inStock}
            aria-label="Increase quantity"
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 2. Add to Cart Button */}
        <motion.button
          type="button"
          whileTap={!isLocked ? { scale: 0.98 } : undefined}
          onClick={onAddToCart}
          disabled={addingToCart || !inStock}
          className={cn(
            "h-12 sm:h-13 flex-1 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold rounded-full sm:rounded-xl transition-all duration-200 border-2 shadow-2xs select-none",
            !inStock
              ? "bg-muted/40 border-border/60 text-muted-foreground/50 cursor-not-allowed"
              : "bg-card text-foreground border-border/90 hover:border-primary/80 hover:bg-primary/5 hover:text-primary cursor-pointer active:scale-[0.98]"
          )}
        >
          {addingToCart ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <ShoppingCart className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
              <span className="whitespace-nowrap">Add to Cart</span>
            </>
          )}
        </motion.button>

        {/* 3. Instant Order / Buy Now Button */}
        <motion.button
          type="button"
          whileTap={!isLocked ? { scale: 0.98 } : undefined}
          onClick={onBuyNow}
          disabled={!inStock}
          className={cn(
            "h-12 sm:h-13 flex-1 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold rounded-full sm:rounded-xl transition-all duration-200 border-2 shadow-md select-none",
            !inStock
              ? "bg-muted/40 border-border/60 text-muted-foreground/50 cursor-not-allowed"
              : "bg-primary border-primary text-primary-foreground hover:brightness-110 shadow-primary/25 cursor-pointer active:scale-[0.98]"
          )}
        >
          <Zap className="w-4 h-4 fill-current shrink-0 transition-transform duration-200 group-hover:scale-110" />
          <span className="whitespace-nowrap">Order Now</span>
        </motion.button>

        {/* 4. Wishlist Button */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          type="button"
          onClick={onToggleWishlist}
          title={inWishlist ? "Saved in Wishlist" : "Add to Wishlist"}
          className={cn(
            "h-12 w-12 sm:h-13 sm:w-13 shrink-0 flex items-center justify-center rounded-full sm:rounded-xl border-2 transition-all duration-200 shadow-2xs cursor-pointer",
            inWishlist
              ? "bg-primary text-primary-foreground border-primary shadow-primary/20 hover:bg-primary/90"
              : "bg-card border-border/90 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5"
          )}
        >
          <Heart
            className={cn(
              "w-5 h-5 transition-all duration-200",
              inWishlist
                ? "fill-current text-current scale-110"
                : "fill-transparent text-current group-hover:fill-current group-hover:scale-110"
            )}
          />
        </motion.button>
      </div>
    </div>
  );
};

export default ProductActions;
