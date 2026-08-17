"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Heart, Minus, Plus, Zap, Check, AlertCircle } from "lucide-react";
import ShareButton from "@/components/ShareButton";

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
  quantity, setQuantity, maxQuantity, onAddToCart, onBuyNow, onToggleWishlist, inWishlist = false,
  addingToCart, inStock, layout = "premium", disabled = false, disabledReason, selectionSteps,
}) => {
  const isLocked = disabled || !inStock;
  const allStepsDone = !selectionSteps || selectionSteps.every(s => s.complete);

  return (
    <div className="space-y-3 sm:space-y-4">

      {/* ── Stock badge & Quantity Stepper row ── */}
      <div className="flex items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border ${
            inStock
              ? "bg-primary/10 text-primary border-primary/25"
              : "bg-destructive/10 text-destructive border-destructive/25"
          }`}>
            {inStock ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {inStock ? (disabled ? "In Stock" : "In Stock") : "Out of Stock"}
          </span>
          {inStock && !disabled && maxQuantity <= 10 && (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/8 border border-amber-500/20 px-2.5 py-1 rounded-xl">
              Only {maxQuantity} left
            </span>
          )}
        </div>

        {/* Quantity Stepper */}
        <div className="h-9 shrink-0 flex items-center justify-between rounded-xl border border-border bg-card/90 px-1 shadow-xs">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-lg transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-7 text-center text-xs font-bold text-foreground select-none">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
            disabled={quantity >= maxQuantity}
            className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-lg transition-colors disabled:opacity-30"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ── Selection progress ── */}
      <AnimatePresence>
        {selectionSteps && selectionSteps.length > 0 && !allStepsDone && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 w-full"
          >
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Please complete your selection
            </p>
            <div className="flex flex-wrap gap-2">
              {selectionSteps.map(step => (
                <span
                  key={step.label}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                    step.complete
                      ? "bg-primary/10 text-primary border-primary/25"
                      : "bg-background text-muted-foreground border-border"
                  }`}
                >
                  {step.complete
                    ? <Check className="w-3 h-3" />
                    : <span className="w-3 h-3 rounded-full border-2 border-current opacity-50" />
                  }
                  {step.label}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Action Buttons Row: Add to Cart + Order Now + Wishlist stay in the SAME ROW ── */}
      <div className="flex items-center gap-2 sm:gap-3 w-full">
        {/* Add to Cart Button — clean hover fill */}
        <motion.button
          whileTap={!isLocked ? { scale: 0.97 } : undefined}
          onClick={onAddToCart}
          disabled={addingToCart || isLocked}
          className={`group relative flex-1 h-12 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-300 border shadow-xs overflow-hidden ${
            isLocked
              ? "bg-muted border-border text-muted-foreground cursor-not-allowed"
              : "bg-secondary/80 text-foreground border-border/80 hover:bg-foreground hover:text-background hover:border-foreground active:scale-[0.98]"
          }`}
        >
          {addingToCart ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <ShoppingCart className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:scale-110" />
              <span className="whitespace-nowrap">Add to Cart</span>
            </>
          )}
        </motion.button>

        {/* Order Now Button — clean hover fill */}
        <motion.button
          whileTap={!isLocked ? { scale: 0.97 } : undefined}
          onClick={onBuyNow}
          disabled={isLocked}
          className={`group relative flex-1 h-12 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-300 border-2 shadow-xs overflow-hidden ${
            isLocked
              ? "bg-muted border-border text-muted-foreground cursor-not-allowed"
              : "bg-primary/10 text-primary border-primary hover:bg-primary hover:text-primary-foreground hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98]"
          }`}
        >
          <Zap className="w-4 h-4 fill-primary group-hover:fill-primary-foreground text-primary group-hover:text-primary-foreground shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6" />
          <span className="whitespace-nowrap">Order Now</span>
        </motion.button>

        {/* Wishlist Button — solid hover fill */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          type="button"
          onClick={onToggleWishlist}
          title={inWishlist ? "Saved in Wishlist" : "Add to Wishlist"}
          className={`group w-12 h-12 shrink-0 flex items-center justify-center rounded-xl border transition-all duration-300 ${
            inWishlist
              ? "bg-primary text-primary-foreground border-primary shadow-xs hover:bg-primary/90"
              : "bg-secondary/80 border-border text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-xs"
          }`}
        >
          <Heart
            className={`w-5 h-5 transition-all duration-300 ${
              inWishlist
                ? "fill-current text-current scale-110"
                : "fill-transparent text-current group-hover:fill-current group-hover:scale-110"
            }`}
          />
        </motion.button>
      </div>

      {/* Disabled reason hint */}
      {disabled && disabledReason && (
        <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {disabledReason}
        </p>
      )}
    </div>
  );
};

export default ProductActions;
// code:4ce0
