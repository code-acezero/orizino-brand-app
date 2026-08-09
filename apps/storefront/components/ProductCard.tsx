"use client";
import * as React from "react";
import { useRef, useCallback, useState } from "react";
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
import { formatDistanceToNow } from "date-fns";

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
  // Use shared auth context — avoids a per-card getUser() query
  const { user } = useAuth();

  const [addingToCart, setAddingToCart] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [quickViewMounted, setQuickViewMounted] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [togglingWishlist, setTogglingWishlist] = useState(false);
  const [flyAnim, setFlyAnim] = useState<{ src: string; rect: DOMRect } | null>(null);
  const [hovered, setHovered] = useState(false);
  const [sharing, setSharing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // "New" badge — products < 14 days
  const isNew = createdAt
    ? Date.now() - new Date(createdAt).getTime() < 14 * 24 * 60 * 60 * 1000
    : false;

  const discount = compareAtPrice && compareAtPrice > price
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : 0;

  // ── Single merged query: variants + secondary image (was 2 separate queries) ──
  const { data: cardData } = useQuery({
    queryKey: ["product-card-data", id],
    queryFn: async () => {
      const [variantsRes, productRes] = await Promise.all([
        supabase
          .from("product_variants")
          .select("color, size, stock_quantity")
          .eq("product_id", id)
          .eq("is_active", true),
        supabase.from("products").select("images").eq("id", id).maybeSingle(),
      ]);
      const variantRows = variantsRes.data || [];
      const colors = [...new Set(variantRows.map((v) => v.color).filter(Boolean))] as string[];
      const sizes = [...new Set(variantRows.map((v) => v.size).filter(Boolean))] as string[];
      const totalStock = variantRows.reduce((s, v) => s + (v.stock_quantity || 0), 0);
      const secondaryImage = (productRes.data?.images as string[] | null)?.[1] ?? null;
      return { hasVariants: variantRows.length > 0, colors, sizes, totalStock, secondaryImage };
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const hasVariants = cardData?.hasVariants;
  const variantColors = cardData?.colors ?? [];
  const totalStock = cardData?.hasVariants ? cardData.totalStock : undefined;
  const isSoldOut = totalStock !== undefined && totalStock <= 0;
  const isLowStock = totalStock !== undefined && totalStock > 0 && totalStock <= 5;
  const secondaryImage = cardData?.secondaryImage ?? null;

  // Wishlist state
  React.useEffect(() => {
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

  return (
    <>
      <article
        className={`group relative flex flex-col overflow-hidden bg-card select-none transition-all duration-500 w-full max-w-[280px] mx-auto ${className}`}
        style={{
          borderRadius: 0,
          transform: hovered ? "translateY(-4px)" : "translateY(0)",
          boxShadow: hovered ? "0 16px 36px -12px hsl(var(--primary) / 0.15)" : "0 0 0 1px hsl(var(--border) / 0.3)",
          transition: "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
          willChange: "transform, box-shadow",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
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
            src={thumbnail}
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
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-card via-card/20 to-transparent opacity-60 z-10 pointer-events-none mix-blend-normal transition-opacity duration-300 group-hover:opacity-40" />

          {/* Sold out overlay */}
          {isSoldOut && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center z-20">
              <span className="font-editorial italic text-xl text-foreground/80 border border-foreground/20 px-4 py-1">Sold Out</span>
            </div>
          )}

          {/* Badges */}
          {brandIcon && (
            <div className="absolute top-2.5 right-2.5 z-20 w-8 h-8 flex items-center justify-center">
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

          {/* ── Action buttons: Share & Wishlist ── */}
          <div className="absolute bottom-12 right-2.5 z-20 flex flex-col gap-2">
            <button
              onClick={handleShare}
              aria-label="Share product"
              className={`w-8 h-8 rounded-full bg-background/80 backdrop-blur-md border border-cream/10 flex items-center justify-center transition-all duration-300 ${
                hovered ? "opacity-100 scale-100 translate-x-0" : "opacity-0 scale-90 translate-x-4 pointer-events-none"
              } hover:bg-primary hover:text-primary-foreground hover:scale-110`}
              style={{
                transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                willChange: "transform, opacity",
              }}
            >
              <Share2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
            <button
              className={`w-8 h-8 rounded-full flex items-center justify-center bg-background/80 backdrop-blur-md border border-cream/10 transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:scale-110 ${
                hovered ? "opacity-100 scale-100 translate-x-0" : "opacity-0 scale-90 translate-x-4 pointer-events-none"
              }`}
              style={{
                transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                transitionDelay: hovered ? "40ms" : "0ms",
                willChange: "transform, opacity",
              }}
              onClick={handleWishlist}
              aria-label={inWishlist ? "Remove from wishlist" : "Save"}
            >
              <Heart
                className="w-3.5 h-3.5 transition-colors"
                strokeWidth={1.5}
                style={{
                  fill: inWishlist ? "hsl(var(--cherry))" : "transparent",
                  stroke: inWishlist ? "hsl(var(--cherry))" : "currentColor",
                }}
              />
            </button>
          </div>

          {/* ── Add to cart — slides up smoothly ── */}
          <div
            className={`absolute bottom-0 left-0 right-0 ${
              hovered || isMobile ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
            }`}
            style={{
              transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease",
              willChange: "transform, opacity",
            }}
          >
            <button
              onClick={handleAddToCart}
              disabled={addingToCart || isSoldOut}
              className="w-full py-2.5 font-sans-brand font-medium text-[10px] tracking-[0.2em] uppercase flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
              style={{
                background: isSoldOut ? "hsl(var(--muted))" : "hsl(var(--cherry))",
                color: "hsl(var(--cream))",
                borderRadius: 0,
              }}
            >
              {addingToCart ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isSoldOut ? (
                "Sold Out"
              ) : hasVariants ? (
                "Select Options"
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Add to Bag
                </>
              )}
            </button>
          </div>

          {/* Cherry underline reveal */}
          <div
            className={`absolute bottom-0 left-0 h-0.5 ${hovered ? "w-full" : "w-0"}`}
            style={{
              background: "hsl(var(--cherry))",
              transition: "width 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </Link>

        {/* ── Product Info ── */}
        <div className="flex flex-col items-center text-center gap-1.5 p-3.5 sm:p-4">
          <Link
            href={`/product/${slug}`}
            className="font-sans-brand text-xs sm:text-sm font-medium tracking-wide text-foreground/90 truncate w-full hover:text-primary transition-colors text-center"
            title={name}
          >
            {name}
          </Link>

          {/* Color swatch dots */}
          {variantColors.length > 1 && (
            <div className="flex items-center justify-center gap-1 mt-0.5">
              {variantColors.slice(0, 5).map((color, i) => (
                <span
                  key={i}
                  className="w-2.5 h-2.5 rounded-full border border-foreground/15 shrink-0"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
              {variantColors.length > 5 && (
                <span className="text-[8px] text-muted-foreground font-sans-brand">+{variantColors.length - 5}</span>
              )}
            </div>
          )}

          {/* Bigger Price display */}
          <div className="flex items-baseline justify-center gap-2 mt-1">
            <span className="text-base sm:text-lg md:text-xl font-bold text-foreground tracking-tight">
              {formatPrice(price)}
            </span>
            {compareAtPrice && compareAtPrice > price && (
              <span className="text-xs sm:text-sm text-muted-foreground/60 line-through font-medium">
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
