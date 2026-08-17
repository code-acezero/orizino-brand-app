"use client";
import * as React from "react";
import { useRef, useCallback, useState, useEffect } from "react";
import { Link } from "@/lib/router-compat";
import { Heart, ShoppingCart, Loader2, Share2 } from "lucide-react";
import { trackClick } from "@/hooks/use-analytics";
import { trackInteraction } from "@/lib/track-interaction";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "@/lib/app-toast";

import ImageWithFallback from "@/components/ImageWithFallback";

const QuickViewModal = React.lazy(() => import("@/components/QuickViewModal"));
const FlyToCartAnimation = React.lazy(() => import("@/components/FlyToCartAnimation"));

export interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  thumbnail?: string;
  avgRating?: number;
  reviewCount?: number;
  slug: string;
  className?: string;
  createdAt?: string;
}

// Fetch brand icon once and cache with /orizino-logo.svg fallback
let cachedBrandIcon: string = "/orizino-logo.svg";
const fetchBrandIcon = async (): Promise<string> => {
  try {
    const { data } = await supabase.from("site_settings").select("value").eq("key", "logo_url").maybeSingle();
    const v = data?.value;
    const dbIcon = (typeof v === "object" && v !== null ? (v as any).value : v) as string | null;
    cachedBrandIcon = dbIcon || "/orizino-logo.svg";
    return cachedBrandIcon;
  } catch {
    return "/orizino-logo.svg";
  }
};
const brandIconPromise = fetchBrandIcon();

function useBrandIcon() {
  const [icon, setIcon] = React.useState<string>(cachedBrandIcon);
  React.useEffect(() => {
    brandIconPromise.then((url) => setIcon(url || "/orizino-logo.svg"));
  }, []);
  return icon;
}

const ProductCard: React.FC<ProductCardProps> = ({
  id, name, price, compareAtPrice, thumbnail,
  avgRating = 0, reviewCount = 0, slug, className = "", createdAt,
}) => {
  const { formatPrice } = useCurrency();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const brandIcon = useBrandIcon();
  const { user } = useAuth();

  const [addingToCart, setAddingToCart] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [quickViewMounted, setQuickViewMounted] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [togglingWishlist, setTogglingWishlist] = useState(false);
  const [flyAnim, setFlyAnim] = useState<{ src: string; rect: DOMRect } | null>(null);
  const [hovered, setHovered] = useState(false);
  const [showCartOnMobile, setShowCartOnMobile] = useState(false);
  const [sharing, setSharing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // "New" badge — products < 14 days
  const isNew = createdAt
    ? Date.now() - new Date(createdAt).getTime() < 14 * 24 * 60 * 60 * 1000
    : false;

  const discount = compareAtPrice && compareAtPrice > price
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : 0;

  // Variants and secondary image query
  const { data: cardData } = useQuery({
    queryKey: ["product-card-data", id],
    queryFn: async () => {
      const [variantsRes, productRes] = await Promise.all([
        supabase
          .from("product_variants")
          .select("color, size, stock_quantity, image_url")
          .eq("product_id", id)
          .eq("is_active", true),
        supabase.from("products").select("thumbnail, images").eq("id", id).maybeSingle(),
      ]);
      const variantRows = variantsRes.data || [];
      const colors = [...new Set(variantRows.map((v) => v.color).filter(Boolean))] as string[];
      const sizes = [...new Set(variantRows.map((v) => v.size).filter(Boolean))] as string[];
      const totalStock = variantRows.reduce((s, v) => s + (v.stock_quantity || 0), 0);
      const prodImages = Array.isArray(productRes.data?.images) ? (productRes.data.images as string[]).filter(Boolean) : [];
      const freshThumbnail = (productRes.data?.thumbnail as string | null) || prodImages[0] || thumbnail;
      const secondaryImage = prodImages[1] ?? (variantRows.find((v) => v.image_url && v.image_url !== freshThumbnail)?.image_url ?? null);
      return { hasVariants: variantRows.length > 0, colors, sizes, totalStock, thumbnail: freshThumbnail, secondaryImage };
    },
    staleTime: 10 * 1000,
    refetchOnWindowFocus: true,
  });

  const hasVariants = cardData?.hasVariants;
  const variantColors = cardData?.colors ?? [];
  const totalStock = cardData?.hasVariants ? cardData.totalStock : undefined;
  const isSoldOut = totalStock !== undefined && totalStock <= 0;
  const isLowStock = totalStock !== undefined && totalStock > 0 && totalStock <= 5;
  const displayThumbnail = cardData?.thumbnail || thumbnail;
  const secondaryImage = cardData?.secondaryImage ?? null;

  // Wishlist state
  useEffect(() => {
    if (!user) return;
    (supabase.from as any)("wishlists").select("id").eq("user_id", user.id).eq("product_id", id).maybeSingle()
      .then(({ data }: any) => setInWishlist(!!data));
  }, [user, id]);

  const handleWishlist = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast.error("Sign in to save items"); return; }
    if (togglingWishlist) return;
    setTogglingWishlist(true);
    try {
      if (inWishlist) {
        await (supabase.from as any)("wishlists").delete().eq("user_id", user.id).eq("product_id", id);
        setInWishlist(false);
        toast.success("Removed from wishlist");
      } else {
        await (supabase.from as any)("wishlists").insert({ user_id: user.id, product_id: id });
        setInWishlist(true);
        toast.success("Saved to wishlist");
      }
      queryClient.invalidateQueries({ queryKey: ["wishlist-count"] });
    } finally {
      setTogglingWishlist(false);
    }
  }, [user, inWishlist, togglingWishlist, id, queryClient]);

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (sharing) return;
    setSharing(true);
    const url = `${window.location.origin}/product/${slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: name, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied!");
      }
    } catch {}
    finally { setTimeout(() => setSharing(false), 1000); }
  }, [sharing, name, slug]);

  const handleAddToCart = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSoldOut || addingToCart) return;
    if (hasVariants) {
      setQuickViewMounted(true);
      setQuickViewOpen(true);
      return;
    }
    setAddingToCart(true);
    trackClick("add_to_cart", slug, window.location.pathname, { product_id: id });
    trackInteraction(id, "cart");
    if (imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect();
      setFlyAnim({ src: thumbnail || "", rect });
    }
    try {
      if (user) {
        const { data: existing } = await supabase.from("cart_items").select("id, quantity").eq("user_id", user.id).eq("product_id", id).maybeSingle();
        if (existing) await supabase.from("cart_items").update({ quantity: existing.quantity + 1 }).eq("id", existing.id);
        else await supabase.from("cart_items").insert({ user_id: user.id, product_id: id, quantity: 1 });
      } else {
        const cart = JSON.parse(localStorage.getItem("guest_cart") || "[]");
        const ex = cart.find((i: any) => i.product_id === id);
        if (ex) ex.quantity += 1;
        else cart.push({ product_id: id, quantity: 1, name, price, thumbnail, slug });
        localStorage.setItem("guest_cart", JSON.stringify(cart));
        window.dispatchEvent(new Event("guest-cart-updated"));
      }
      queryClient.invalidateQueries({ queryKey: ["cart-count"] });
      window.dispatchEvent(new CustomEvent("cart-pop-trigger"));
      toast.success("Added to cart");
    } catch {
      toast.error("Failed to add to cart");
    } finally {
      setAddingToCart(false);
    }
  }, [isSoldOut, addingToCart, hasVariants, id, slug, thumbnail, name, price, user, queryClient]);

  // ── Tap-and-Hold Touch Gesture for Mobile ──
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);

    holdTimerRef.current = setTimeout(() => {
      setShowCartOnMobile(true);
      // Auto-hide after 4.5 seconds of inactivity
      autoHideTimerRef.current = setTimeout(() => {
        setShowCartOnMobile(false);
      }, 4500);
    }, 220); // 220ms hold threshold
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    const touch = e.touches[0];
    const diffX = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const diffY = Math.abs(touch.clientY - touchStartPosRef.current.y);

    // If user scrolls > 10px, cancel tap-and-hold
    if (diffX > 10 || diffY > 10) {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  };

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    };
  }, []);

  const isCartVisible = hovered || showCartOnMobile;

  return (
    <>
      <article
        className={`group relative flex flex-col overflow-hidden bg-card select-none transition-all duration-500 w-full max-w-[280px] mx-auto ${className}`}
        style={{
          borderRadius: 0,
          transform: hovered ? "translateY(-3px)" : "translateY(0)",
          boxShadow: hovered ? "0 12px 28px -8px hsl(var(--primary) / 0.14)" : "0 0 0 1px hsl(var(--border) / 0.3)",
          transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          willChange: "transform, box-shadow",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* ── Image area ── */}
        <Link
          href={`/product/${slug}`}
          className="relative overflow-hidden block"
          style={{ aspectRatio: "3/4" }}
          onClick={() => trackClick("product_card", slug, window.location.pathname)}
        >
          {/* Primary image */}
          <ImageWithFallback
            ref={imgRef}
            src={displayThumbnail}
            alt={name}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
              hovered && secondaryImage ? "opacity-0 scale-105" : "opacity-100 scale-100 group-hover:scale-105"
            }`}
            style={{
              transition: "opacity 0.65s cubic-bezier(0.16,1,0.3,1), transform 0.65s cubic-bezier(0.16,1,0.3,1)",
              willChange: "transform, opacity",
            }}
            loading="lazy"
          />
          {/* Secondary hover image */}
          {secondaryImage && (
            <ImageWithFallback
              src={secondaryImage}
              alt={`${name} — alternate`}
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
                hovered ? "opacity-100 scale-100" : "opacity-0 scale-105"
              }`}
              style={{
                transition: "opacity 0.65s cubic-bezier(0.16,1,0.3,1), transform 0.65s cubic-bezier(0.16,1,0.3,1)",
                willChange: "transform, opacity",
              }}
              loading="lazy"
            />
          )}

          {/* Elegant bottom blend gradient */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-card via-card/15 to-transparent opacity-50 z-10 pointer-events-none transition-opacity duration-300 group-hover:opacity-30" />

          {/* Sold out overlay */}
          {isSoldOut && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center z-20">
              <span className="font-editorial italic text-xl text-foreground/80 border border-foreground/20 px-4 py-1">Sold Out</span>
            </div>
          )}

          {/* Badges */}
          {brandIcon && (
            <div className="absolute top-2.5 right-2.5 z-20 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center pointer-events-none">
              <img
                src={brandIcon}
                alt="Brand Logo"
                className="w-full h-full object-contain"
                style={{ 
                  filter: "brightness(0) invert(1)", 
                  mixBlendMode: "difference",
                  opacity: 0.9 
                }}
              />
            </div>
          )}

          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
            {isNew && !isSoldOut && (
              <span className="bg-foreground text-background text-[9px] font-sans-brand font-semibold px-2 py-0.5 rounded-full tracking-wide uppercase">
                New
              </span>
            )}
            {discount > 0 && !isSoldOut && (
              <span className="bg-primary text-primary-foreground text-[9px] font-sans-brand font-semibold px-2 py-0.5 rounded-full tracking-wide">
                -{discount}%
              </span>
            )}
            {isLowStock && (
              <span className="bg-amber-500/90 text-white text-[9px] font-sans-brand font-semibold px-2 py-0.5 rounded-full tracking-wide uppercase">
                Only {totalStock} left
              </span>
            )}
          </div>

          {/* ── Action buttons: Share & Wishlist — Shown on Hover (Desktop) or Tap-and-Hold (Mobile) ── */}
          <div className="absolute bottom-10 right-2 z-20 flex flex-col gap-2.5">
            <button
              onClick={handleShare}
              aria-label="Share product"
              className={`flex items-center justify-center transition-all duration-300 text-foreground/80 filter drop-shadow-md cursor-pointer ${
                isCartVisible ? "opacity-100 scale-100 translate-x-0" : "opacity-0 scale-90 translate-x-4 pointer-events-none"
              } hover:text-primary hover:scale-110`}
              style={{
                transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                willChange: "transform, opacity",
              }}
            >
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={1.5} />
            </button>
            <button
              className={`flex items-center justify-center transition-all duration-300 hover:text-primary hover:scale-110 text-foreground/80 filter drop-shadow-md cursor-pointer ${
                isCartVisible ? "opacity-100 scale-100 translate-x-0" : "opacity-0 scale-90 translate-x-4 pointer-events-none"
              }`}
              style={{
                transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                transitionDelay: isCartVisible ? "40ms" : "0ms",
                willChange: "transform, opacity",
              }}
              onClick={handleWishlist}
              aria-label={inWishlist ? "Remove from wishlist" : "Save"}
            >
              <Heart
                className="w-4 h-4 sm:w-5 sm:h-5 transition-colors"
                strokeWidth={1.5}
                style={{
                  fill: inWishlist ? "hsl(var(--primary))" : "transparent",
                  stroke: inWishlist ? "hsl(var(--primary))" : "currentColor",
                }}
              />
            </button>
          </div>

          {/* ── Add to Cart / Select Options — Shown on Hover (Desktop) or Tap-and-Hold (Mobile) ── */}
          <div
            className={`absolute bottom-0 left-0 right-0 z-30 ${
              isCartVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
            }`}
            style={{
              transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease",
              willChange: "transform, opacity",
            }}
          >
            <button
              onClick={handleAddToCart}
              disabled={addingToCart || isSoldOut}
              className="w-full py-2 sm:py-2.5 font-sans-brand font-semibold text-[9px] sm:text-[10px] tracking-[0.18em] uppercase flex items-center justify-center gap-1.5 disabled:opacity-60 transition-colors shadow-md cursor-pointer"
              style={{
                background: isSoldOut ? "hsl(var(--muted))" : "#9a0002",
                color: "#efe6dd",
                borderRadius: 0,
              }}
            >
              {addingToCart ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : isSoldOut ? (
                "Sold Out"
              ) : hasVariants ? (
                "Select Options"
              ) : (
                <>
                  <ShoppingCart className="w-3 h-3" strokeWidth={1.5} />
                  Add to Bag
                </>
              )}
            </button>
          </div>

          {/* Cherry underline reveal */}
          <div
            className={`absolute bottom-0 left-0 h-0.5 z-20 ${hovered ? "w-full" : "w-0"}`}
            style={{
              background: "#9a0002",
              transition: "width 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </Link>

        {/* ── Product Info: Perfectly Symmetrical Fixed Height + 3-Row Auto-Fitting Title ── */}
        <div className="flex flex-col items-center text-center px-2 py-2 sm:px-3 sm:py-2.5 w-full min-h-[96px] sm:min-h-[108px] justify-between">
          {/* 3 Rows Max with Auto-Resizing Font for Short vs Long Titles */}
          <div className="w-full h-[3.8em] sm:h-[4em] flex items-center justify-center overflow-hidden">
            <Link
              href={`/product/${slug}`}
              className={`font-sans-brand font-medium tracking-tight text-foreground/90 line-clamp-3 leading-[1.25] text-center hover:text-primary transition-colors w-full ${
                name.length <= 22
                  ? "text-[12px] sm:text-[13px] font-semibold"
                  : name.length <= 42
                    ? "text-[11px] sm:text-[12px]"
                    : "text-[10px] sm:text-[11px]"
              }`}
              title={name}
            >
              {name}
            </Link>
          </div>

          {/* Fixed-height color swatch dots slot for perfect vertical alignment */}
          <div className="h-4 sm:h-5 flex items-center justify-center">
            {variantColors.length > 1 ? (
              <div className="flex items-center justify-center gap-1">
                {variantColors.slice(0, 5).map((color, i) => (
                  <span
                    key={i}
                    className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border border-foreground/15 shrink-0"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
                {variantColors.length > 5 && (
                  <span className="text-[7.5px] sm:text-[8px] text-muted-foreground font-sans-brand">+{variantColors.length - 5}</span>
                )}
              </div>
            ) : null}
          </div>

          {/* Price display with consistent fixed height */}
          <div className="flex items-baseline justify-center gap-1.5 h-5 sm:h-6">
            <span className="text-xs sm:text-sm md:text-base font-bold text-foreground tracking-tight">
              {formatPrice(price)}
            </span>
            {compareAtPrice && compareAtPrice > price && (
              <span className="text-[10px] sm:text-xs text-muted-foreground/60 line-through font-medium">
                {formatPrice(compareAtPrice)}
              </span>
            )}
          </div>
        </div>
      </article>

      {quickViewMounted && (
        <React.Suspense fallback={null}>
          <QuickViewModal
            productId={id}
            open={quickViewOpen}
            onOpenChange={(open) => { setQuickViewOpen(open); if (!open) setQuickViewMounted(false); }}
          />
        </React.Suspense>
      )}
      {flyAnim && (
        <React.Suspense fallback={null}>
          <FlyToCartAnimation
            {...({
              src: flyAnim.src,
              startRect: flyAnim.rect,
              onComplete: () => setFlyAnim(null),
            } as any)}
          />
        </React.Suspense>
      )}
    </>
  );
};

export default ProductCard;
// code:4ce0
