"use client";
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Link, useNavigate } from "@/lib/router-compat";
import {
  Star,
  ShoppingCart,
  Heart,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Search,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ZoomableImage from "@/components/product/ZoomableImage";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { addToGuestCart } from "@/lib/guest-cart";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "@/lib/app-toast";

interface QuickViewModalProps {
  productId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuantity?: number;
  initialSize?: string | null;
  initialColor?: string | null;
}

const QuickViewModal: React.FC<QuickViewModalProps> = ({
  productId,
  open,
  onOpenChange,
  initialQuantity = 1,
  initialSize = null,
  initialColor = null,
}) => {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();
  const [currentImg, setCurrentImg] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCurrentImg(0);
    setQuantity(Math.max(1, initialQuantity));
    setSelectedSize(initialSize);
    setSelectedColor(initialColor);
  }, [open, initialQuantity, initialSize, initialColor, productId]);

  const { data: product, isLoading } = useQuery({
    queryKey: ["quick-view", productId],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();
      return data;
    },
    enabled: open && !!productId,
  });

  const { data: variants = [] } = useQuery({
    queryKey: ["quick-view-variants", productId],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
    enabled: open && !!productId,
  });

  const sizes = useMemo(
    () => Array.from(new Set(variants.filter((v) => v.size).map((v) => v.size!))),
    [variants]
  );
  const colors = useMemo(
    () => Array.from(new Set(variants.filter((v) => v.color).map((v) => v.color!))),
    [variants]
  );

  const sizeRequired = sizes.length > 0;
  const colorRequired = colors.length > 0;
  const requiresVariantSelection = sizeRequired || colorRequired;
  const hasCompleteSelection = (!sizeRequired || !!selectedSize) && (!colorRequired || !!selectedColor);

  const selectedVariant = requiresVariantSelection && hasCompleteSelection
    ? variants.find((v) =>
        (!sizeRequired || v.size === selectedSize) &&
        (!colorRequired || v.color === selectedColor)
      ) || null
    : null;

  const baseImages = product?.images?.length
    ? [...product.images]
    : product?.thumbnail
      ? [product.thumbnail]
      : ["/placeholder.svg"];
  const variantImages = selectedColor
    ? variants
        .filter((v) => v.color === selectedColor && v.image_url && (!selectedSize || v.size === selectedSize))
        .map((v) => v.image_url as string)
    : [];
  const images = Array.from(new Set(variantImages.length > 0 ? [...variantImages, ...baseImages] : baseImages));

  useEffect(() => {
    if (currentImg >= images.length) setCurrentImg(0);
  }, [images.length, currentImg]);

  const effectivePrice = selectedVariant?.price_override ?? product?.price ?? 0;
  const currentStock = selectedVariant?.stock_quantity ?? product?.stock_quantity ?? 0;
  const maxSelectableQuantity = Math.max(
    selectedVariant?.stock_quantity ?? 0,
    ...variants.map((variant) => variant.stock_quantity ?? 0),
    product?.stock_quantity ?? 0,
    1
  );
  const discount = product?.compare_at_price
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;

  const missingSelections = [
    sizeRequired && !selectedSize ? "size" : null,
    colorRequired && !selectedColor ? "color" : null,
  ].filter(Boolean) as string[];

  const helperText = missingSelections.length > 0
    ? `Select ${missingSelections.join(" and ")} to continue.`
    : requiresVariantSelection && !selectedVariant
      ? "This combination is unavailable. Please choose another option."
      : currentStock <= 0
        ? "This selection is out of stock."
        : null;

  const nextImg = () => setCurrentImg((i) => (i + 1) % images.length);
  const prevImg = () => setCurrentImg((i) => (i - 1 + images.length) % images.length);

  const getVariantLabel = () => [selectedSize, selectedColor].filter(Boolean).join(" / ");

  const handleAddToCart = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (requiresVariantSelection && !selectedVariant) {
      toast.error("Please select all product options");
      return;
    }
    if (currentStock <= 0) {
      toast.error("This selection is out of stock");
      return;
    }

    if (!user) {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "allow_guest_checkout").maybeSingle();
      const raw = data?.value as any;
      const v = raw && typeof raw === "object" ? raw.value : raw;
      const guestAllowed = v === undefined || v === null ? true : !!v;
      if (!guestAllowed) {
        toast.error("Please sign in to add items to cart");
        return;
      }
      addToGuestCart(
        {
          product_id: productId,
          variant_id: selectedVariant?.id ?? null,
          name: product?.name ?? "",
          price: effectivePrice,
          image: images?.[0],
          slug: product?.slug,
          variant_label: getVariantLabel(),
          max_stock: currentStock,
        },
        quantity,
      );
      toast.success(`${product?.name}${getVariantLabel() ? ` (${getVariantLabel()})` : ""} added to cart`);
      onOpenChange(false);
      return;
    }

    setAddingToCart(true);
    try {
      let query = supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("product_id", productId);

      if (selectedVariant?.id) {
        query = query.eq("variant_id", selectedVariant.id);
      } else {
        query = query.is("variant_id", null);
      }

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        await supabase
          .from("cart_items")
          .update({ quantity: existing.quantity + quantity })
          .eq("id", existing.id);
      } else {
        await supabase.from("cart_items").insert({
          user_id: user.id,
          product_id: productId,
          quantity,
          variant_id: selectedVariant?.id ?? null,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["cart-count"] });
      toast.success(`${product?.name}${getVariantLabel() ? ` (${getVariantLabel()})` : ""} added to cart`);
      onOpenChange(false);
    } catch {
      toast.error("Failed to add to cart");
    } finally {
      setAddingToCart(false);
    }
  }, [productId, product?.name, product?.slug, quantity, selectedVariant, queryClient, onOpenChange, requiresVariantSelection, currentStock, selectedSize, selectedColor, effectivePrice, images]);

  const handleBuyNow = useCallback(async () => {
    if (requiresVariantSelection && !selectedVariant) {
      toast.error("Please select all product options");
      return;
    }
    if (!product) return;
    if (currentStock <= 0) {
      toast.error("This selection is out of stock");
      return;
    }

    const item = {
      productId: product.id,
      variantId: selectedVariant?.id || null,
      quantity,
      name: product.name,
      price: effectivePrice,
      thumbnail: selectedVariant?.image_url ?? product.thumbnail,
      variantLabel: getVariantLabel(),
      selectedSize,
      selectedColor,
    };
    if (typeof window !== "undefined") {
      sessionStorage.setItem("orizino_is_buy_now", "true");
      sessionStorage.setItem("orizino_buy_now_item", JSON.stringify(item));
      localStorage.setItem("orizino_is_buy_now", "true");
      localStorage.setItem("orizino_buy_now_item", JSON.stringify(item));
    }
    onOpenChange(false);
    navigate("/checkout?buyNow=true", {
      state: { buyNow: true, buyNowItem: item },
    });
  }, [requiresVariantSelection, selectedVariant, product, currentStock, onOpenChange, navigate, quantity, effectivePrice, selectedSize, selectedColor]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(95vw,1100px)] max-w-[1100px] sm:max-w-[1100px] p-0 gap-0 overflow-hidden border-border/50 bg-background/95 backdrop-blur-xl rounded-2xl max-h-[90vh] flex flex-col">
        {isLoading || !product ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 min-h-0 flex-1 overflow-hidden">
            <div className="relative aspect-square md:aspect-auto md:h-full bg-secondary/10 overflow-hidden">

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${currentImg}-${selectedSize || "size"}-${selectedColor || "color"}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="w-full h-full"
                >
                  <ZoomableImage
                    src={images[currentImg]}
                    alt={product.name}
                    className="w-full h-full"
                    zoomScale={2.5}
                  />
                </motion.div>
              </AnimatePresence>

              <div className="absolute top-3 right-3 glass rounded-full p-1.5 opacity-50 pointer-events-none z-10">
                <Search className="w-3 h-3 text-foreground" />
              </div>

              {images.length > 1 && (
                <>
                  <button onClick={prevImg} className="absolute left-2 top-1/2 -translate-y-1/2 glass rounded-full p-1.5 text-foreground hover:text-primary z-10">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={nextImg} className="absolute right-2 top-1/2 -translate-y-1/2 glass rounded-full p-1.5 text-foreground hover:text-primary z-10">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {discount > 0 && (
                <span className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-xs py-1 px-3 rounded-full font-semibold z-10">
                  -{discount}%
                </span>
              )}

              {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {images.map((img, i) => (
                    <button
                      key={`${img}-${i}`}
                      onClick={() => setCurrentImg(i)}
                      className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                        i === currentImg ? "border-primary scale-110" : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 sm:p-6 flex flex-col overflow-y-auto min-h-0">
              <h2 className="text-lg font-bold text-foreground mb-1 leading-tight">{product.name}</h2>

              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(product.avg_rating || 0) ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                ))}
                <span className="text-xs text-muted-foreground ml-1">({product.review_count || 0})</span>
              </div>

              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-xl font-bold text-foreground">{formatPrice(effectivePrice)}</span>
                {product.compare_at_price && (
                  <span className="text-sm text-muted-foreground line-through">{formatPrice(product.compare_at_price)}</span>
                )}
              </div>

              {product.short_description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{product.short_description}</p>
              )}

              {sizes.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-foreground mb-2">Size <span className="text-destructive">*</span></p>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(selectedSize === size ? null : size)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                          selectedSize === size
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {colors.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-foreground mb-2">Color <span className="text-destructive">*</span></p>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(selectedColor === color ? null : color)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                          selectedColor === color
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {helperText && (
                <div className="mb-4 rounded-xl border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
                  {helperText}
                </div>
              )}

              <div className="mb-4">
                <p className="text-xs font-semibold text-foreground mb-2">Quantity</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-foreground hover:bg-secondary/50"
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-sm font-semibold text-foreground">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(maxSelectableQuantity, q + 1))}
                    className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-foreground hover:bg-secondary/50"
                  >
                    +
                  </button>
                  <span className="text-xs text-muted-foreground ml-2">
                    {currentStock > 0 ? `${currentStock} in stock` : "Out of stock"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-auto pt-4">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleAddToCart}
                  disabled={addingToCart || !!helperText}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
                >
                  {addingToCart ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                  {addingToCart ? "Adding..." : "Add to Cart"}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleBuyNow}
                  disabled={!!helperText}
                  className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/40 text-foreground py-3 text-sm font-semibold hover:border-primary/40 hover:text-primary disabled:opacity-50 transition-all"
                >
                  <Zap className="w-4 h-4" />
                  Buy Now
                </motion.button>
              </div>

              <div className="flex gap-2 mt-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  className="w-12 h-12 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-all"
                >
                  <Heart className="w-4 h-4" />
                </motion.button>
              </div>

              <Link
                to={`/product/${product.slug}`}
                onClick={() => onOpenChange(false)}
                className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                View full details
              </Link>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QuickViewModal;
// code:4ce0
