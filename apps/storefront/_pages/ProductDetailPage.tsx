"use client";
import React, { useState, lazy, Suspense, useEffect, useRef } from "react";
import { useLayout } from "@/contexts/LayoutContext";
import { useParams, Link, useNavigate } from "@/lib/router-compat";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Shield, Truck, RotateCcw, Package, X, Zap, Tag, Flame, TicketPercent, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/lib/app-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useProductSeoMeta } from "@/hooks/use-product-seo-meta";
import { useIsMobile } from "@/hooks/use-mobile";
import { addRecentlyViewed } from "@/hooks/use-recently-viewed";
import { trackInteraction } from "@/lib/track-interaction";
import Breadcrumbs from "@/components/Breadcrumbs";
import SectionShimmer from "@/components/skeletons/SectionShimmer";
import SkeletonWatermark from "@/components/skeletons/SkeletonWatermark";
import ProductCard from "@/components/ProductCard";
import ImageGallery from "@/components/product/ImageGallery";
import InfinityGallery from "@/components/product/InfinityGallery";
import ProductTabs from "@/components/product/ProductTabs";
import ProductActions from "@/components/product/ProductActions";
import CurrencyWidget from "@/components/product/CurrencyWidget";
import ShareButton from "@/components/ShareButton";
import { getVariantLabels } from "@/lib/variant-labels";
import VariantSelector from "@/components/product/VariantSelector";
import VariantComparison from "@/components/product/VariantComparison";
import NotifyWhenAvailable from "@/components/product/NotifyWhenAvailable";
import { Badge } from "@/components/ui/badge";
import LogoLoader from "@/components/LogoLoader";
import ProductVideo from "@/components/product/ProductVideo";
import { addToGuestCart } from "@/lib/guest-cart";
import { useGuestCheckoutAllowed } from "@/lib/use-guest-checkout-allowed";

// Lazy load gallery variants
const CoverflowGallery = lazy(() => import("@/components/product/CoverflowGallery"));
const FilmstripGallery = lazy(() => import("@/components/product/FilmstripGallery"));
const GridMosaicGallery = lazy(() => import("@/components/product/GridMosaicGallery"));
const ParallaxStackGallery = lazy(() => import("@/components/product/ParallaxStackGallery"));
const EditorialSplitGallery = lazy(() => import("@/components/product/EditorialSplitGallery"));
const HorizonCarouselGallery = lazy(() => import("@/components/product/HorizonCarouselGallery"));
const StudioTurntableGallery = lazy(() => import("@/components/product/StudioTurntableGallery"));

// Helper component to set product tray in layout context
const ProductTrayEffect: React.FC<{
  product: any; effectivePrice: number; selectedVariant: any;
  effectiveStock: number; addToCart: () => void; buyNow: () => void; addingToCart: boolean;
  disabled?: boolean; disabledReason?: string;
}> = ({ product, effectivePrice, selectedVariant, effectiveStock, addToCart, buyNow, addingToCart, disabled, disabledReason }) => {
  const { setProductTray } = useLayout();
  const addToCartRef = useRef(addToCart);
  const buyNowRef = useRef(buyNow);

  useEffect(() => {
    addToCartRef.current = addToCart;
    buyNowRef.current = buyNow;
  });

  const thumbnail = selectedVariant?.image_url ?? product.thumbnail;

  useEffect(() => {
    setProductTray({
      product: {
        name: product.name,
        price: effectivePrice,
        thumbnail,
        stockQuantity: effectiveStock,
      },
      onAddToCart: () => addToCartRef.current(),
      onBuyNow: () => buyNowRef.current(),
      addingToCart,
      disabled,
      disabledReason,
    } as any);
    return () => setProductTray(undefined);
  }, [product.name, effectivePrice, thumbnail, effectiveStock, addingToCart, disabled, disabledReason, setProductTray]);

  return null;
};

export type LayoutStyle = "dark-luxury" | "glass" | "neon" | "minimal" | "magazine" | "glass-minimal";
export type GalleryStyle =
  | "default"
  | "infinity"
  | "coverflow"
  | "filmstrip"
  | "mosaic"
  | "parallax-stack"
  | "editorial-split"
  | "carousel-cards"
  | "studio-turntable"
  | "immersive-zoom";

export interface LayoutConfigTokens {
  containerClass: string;
  textClass: string;
  priceClass: string;
  mobilePriceClass: string;
  cardClass: string;
  accentBorder: string;
  buttonPrimary?: string;
  buttonSecondary?: string;
  badgeClass?: string;
}

const LAYOUT_CONFIGS: Record<LayoutStyle, LayoutConfigTokens> = {
  "dark-luxury": {
    containerClass: "bg-[#09090b] text-zinc-100 selection:bg-amber-500/30 selection:text-amber-200",
    textClass: "text-zinc-100",
    priceClass: "text-4xl md:text-5xl font-black tracking-tight text-amber-300 drop-shadow-[0_0_20px_rgba(251,191,36,0.25)]",
    mobilePriceClass: "text-2xl sm:text-3xl font-black tracking-tight text-amber-300",
    cardClass: "bg-zinc-900/70 border border-amber-500/20 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/60",
    accentBorder: "border-amber-500/30",
    buttonPrimary: "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black font-extrabold shadow-lg shadow-amber-500/20 hover:brightness-110",
    buttonSecondary: "bg-zinc-900 text-amber-300 border border-amber-500/40 hover:bg-zinc-800 font-bold",
    badgeClass: "bg-amber-500/10 text-amber-300 border-amber-500/30 font-mono",
  },
  glass: {
    containerClass: "bg-background/80 text-foreground",
    textClass: "text-foreground",
    priceClass: "text-4xl md:text-5xl font-extrabold tracking-tight text-foreground",
    mobilePriceClass: "text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground",
    cardClass: "bg-card/75 border border-border/80 backdrop-blur-xl rounded-3xl shadow-xl",
    accentBorder: "border-primary/30",
    buttonPrimary: "bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/25 hover:brightness-110",
    buttonSecondary: "bg-secondary/70 text-foreground border border-border/80 hover:bg-secondary font-bold",
    badgeClass: "bg-primary/10 text-primary border-primary/20",
  },
  neon: {
    containerClass: "bg-[#07070d] text-white selection:bg-primary/40 selection:text-white",
    textClass: "text-white",
    priceClass: "text-4xl md:text-5xl font-black text-primary drop-shadow-[0_0_20px_hsl(var(--primary)/0.7)] tracking-tight",
    mobilePriceClass: "text-2xl sm:text-3xl font-black text-primary drop-shadow-[0_0_15px_hsl(var(--primary)/0.7)]",
    cardClass: "bg-black/70 border border-primary/40 backdrop-blur-xl shadow-[0_0_35px_hsl(var(--primary)/0.18)] rounded-3xl",
    accentBorder: "border-primary/50",
    buttonPrimary: "bg-primary text-primary-foreground font-black shadow-[0_0_25px_hsl(var(--primary)/0.5)] border border-primary/50 hover:brightness-110",
    buttonSecondary: "bg-black/80 text-primary border border-primary/60 hover:bg-primary/15 font-bold shadow-[0_0_15px_hsl(var(--primary)/0.25)]",
    badgeClass: "bg-primary/20 text-primary border border-primary/50 font-mono shadow-[0_0_10px_hsl(var(--primary)/0.3)]",
  },
  minimal: {
    containerClass: "bg-background text-foreground",
    textClass: "text-foreground",
    priceClass: "text-3xl md:text-4xl font-medium text-foreground tracking-tight",
    mobilePriceClass: "text-xl sm:text-2xl font-medium text-foreground tracking-tight",
    cardClass: "bg-secondary/20 border border-border/40 rounded-2xl shadow-none",
    accentBorder: "border-border/60",
    buttonPrimary: "bg-foreground text-background font-semibold hover:opacity-90 rounded-full",
    buttonSecondary: "bg-transparent text-foreground border border-foreground/20 hover:bg-secondary/40 font-semibold rounded-full",
    badgeClass: "bg-secondary/40 text-muted-foreground border-border/40 font-mono",
  },
  magazine: {
    containerClass: "bg-background/90 text-foreground",
    textClass: "text-foreground font-serif",
    priceClass: "text-4xl md:text-5xl font-serif italic font-bold text-foreground tracking-tight",
    mobilePriceClass: "text-2xl sm:text-3xl font-serif italic font-bold text-foreground",
    cardClass: "bg-card/60 border border-border/60 backdrop-blur-md rounded-2xl shadow-sm",
    accentBorder: "border-border/80",
    buttonPrimary: "bg-foreground text-background font-serif italic font-bold hover:opacity-90 tracking-wide",
    buttonSecondary: "bg-secondary/50 text-foreground border border-border/80 hover:bg-secondary font-serif italic font-bold",
    badgeClass: "bg-secondary/40 text-foreground border border-border/60 font-serif italic",
  },
  "glass-minimal": {
    containerClass: "bg-background/80 text-foreground",
    textClass: "text-foreground",
    priceClass: "text-4xl md:text-5xl font-bold tracking-tight text-foreground",
    mobilePriceClass: "text-2xl sm:text-3xl font-bold text-foreground",
    cardClass: "bg-card/50 border border-border/50 backdrop-blur-md rounded-3xl shadow-sm",
    accentBorder: "border-border/60",
    buttonPrimary: "bg-primary text-primary-foreground font-bold hover:brightness-110 shadow-md shadow-primary/15",
    buttonSecondary: "bg-secondary/40 text-foreground border border-border/60 hover:bg-secondary/70 font-semibold",
    badgeClass: "bg-secondary/40 text-muted-foreground border border-border/40 font-mono",
  },
};

const GalleryLoader = () => (
  <div className="w-full aspect-square rounded-3xl bg-secondary/10 flex items-center justify-center relative overflow-hidden border border-border/20">
    <SkeletonWatermark size="lg" />
  </div>
);

const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { allowed: guestCheckoutAllowed } = useGuestCheckoutAllowed();
  const { setHeaderSubtitle, setHeaderCustomBack } = useLayout() as any;
  const { formatPrice, userCurrency } = useCurrency() as any;
  const isMobile = useIsMobile();

  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("description");
  const [comparing, setComparing] = useState(false);

  // Fetch product page layout setting
  const { data: pageSettings } = useQuery({
    queryKey: ["product-page-layout"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "product_page_layout")
        .maybeSingle();
      let val = data?.value;
      if (typeof val === "string") {
        try {
          val = JSON.parse(val);
        } catch {
          val = { layout: val };
        }
      }
      if (val && typeof val === "object" && "value" in val && typeof (val as any).value === "object" && (val as any).value !== null) {
        val = (val as any).value;
      }
      const obj: any = (val && typeof val === "object") ? val : {};
      return {
        layout: (obj.layout || "glass") as LayoutStyle,
        gallery: (obj.gallery || "carousel-cards") as GalleryStyle,
      };
    },
    staleTime: 2000,
  });

  // URL query param override for instant testing & live preview (?gallery=studio-turntable / ?layout=glass)
  const [urlGalleryOverride, setUrlGalleryOverride] = useState<GalleryStyle | null>(null);
  const [urlLayoutOverride, setUrlLayoutOverride] = useState<LayoutStyle | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const g = params.get("gallery");
      const l = params.get("layout");
      if (g) setUrlGalleryOverride(g as GalleryStyle);
      if (l) setUrlLayoutOverride(l as LayoutStyle);

      const handleMessage = (e: MessageEvent) => {
        if (e.data?.type === "ORIZINO_PRODUCT_LAYOUT_UPDATE" && e.data.config) {
          if (e.data.config.gallery) setUrlGalleryOverride(e.data.config.gallery);
          if (e.data.config.layout) setUrlLayoutOverride(e.data.config.layout);
        }
      };
      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    }
  }, []);

  const layout: LayoutStyle = urlLayoutOverride || pageSettings?.layout || "glass";
  const galleryStyle: GalleryStyle = urlGalleryOverride || pageSettings?.gallery || "default";
  const cfg = LAYOUT_CONFIGS[layout] || LAYOUT_CONFIGS.glass;

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, categories(name, slug, parent_id)")
        .eq("slug", slug!)
        .eq("is_active", true)
        .single();
      return data;
    },
    enabled: !!slug,
  });

  useProductSeoMeta(product as any);

  // Track recently viewed + product_interactions (view + dwell on unmount)
  useEffect(() => {
    if (!product?.id) return;
    addRecentlyViewed(product.id);
    trackInteraction(product.id, "view", { source: "product_detail" });
    const start = Date.now();
    return () => {
      const dwell = Date.now() - start;
      if (dwell > 3000) trackInteraction(product.id, "dwell", { dwell_ms: dwell, source: "product_detail" });
    };
  }, [product?.id]);

  const productCat = product?.categories as any;
  const { data: parentCategory } = useQuery({
    queryKey: ["parent-category", productCat?.parent_id],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("name, slug").eq("id", productCat.parent_id).single();
      return data;
    },
    enabled: !!productCat?.parent_id,
  });

  const { data: reviews } = useQuery<any[]>({
    queryKey: ["reviews", product?.id],
    queryFn: async () => {
      const { data } = await supabase.from("public_reviews" as any).select("id, product_id, rating, title, comment, created_at, is_approved")
        .eq("product_id", product!.id).eq("is_approved", true).order("created_at", { ascending: false });
      return (data as any) || [];
    },
    enabled: !!product?.id,
  });

  const { data: ownReviews } = useQuery<any[]>({
    queryKey: ["own-reviews", product?.id],
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("id, product_id, rating, title, comment, created_at, is_approved")
        .eq("product_id", product!.id).eq("user_id", user!.id).order("created_at", { ascending: false });
      return (data || []) as any;
    },
    enabled: !!product?.id && !!user,
  });

  const ownReviewIds = new Set((ownReviews || []).map((r: any) => r.id));
  const pendingOwnReviews = (ownReviews || []).filter((r: any) => !r.is_approved);
  const mergedReviews = [...pendingOwnReviews, ...(reviews || [])].filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i);

  const { data: relatedProducts } = useQuery({
    queryKey: ["related-products", product?.category_id, product?.id],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("category_id", product!.category_id!)
        .eq("is_active", true).neq("id", product!.id).order("avg_rating", { ascending: false }).limit(4);
      return data || [];
    },
    enabled: !!product?.category_id && !!product?.id,
  });

  const { data: variants = [] } = useQuery({
    queryKey: ["product-variants", product?.id],
    queryFn: async () => {
      const { data } = await (supabase.from as any)("product_variants").select("id, size, color, stock_quantity, price_override, is_active, image_url, use_custom_media, images, video_url")
        .eq("product_id", product!.id).eq("is_active", true).order("sort_order");
      return (data || []) as any[];
    },
    enabled: !!product?.id,
  });

  // Fetch applicable coupons and delivery offers for this product
  const { data: applicableCoupons } = useQuery({
    queryKey: ["product-coupons", product?.id, product?.category_id],
    queryFn: async () => {
      const { data } = await supabase.from("coupons").select("code, description, discount_type, discount_value, min_order_amount, target_categories, target_products")
        .eq("is_active", true);
      return (data || []).filter(c => {
        const cats = (c as any).target_categories as string[] || [];
        const prods = (c as any).target_products as string[] || [];
        if (cats.length > 0 && product?.category_id && !cats.includes(product.category_id)) return false;
        if (prods.length > 0 && product?.id && !prods.includes(product.id)) return false;
        return true;
      });
    },
    enabled: !!product?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: deliveryOffers } = useQuery({
    queryKey: ["active-delivery-offers"],
    queryFn: async () => {
      const { data } = await supabase.from("delivery_offers").select("*").eq("is_active", true);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const hasVariants = variants.length > 0;
  const availableSizes = [...new Set(variants.filter(v => v.size).map(v => v.size))] as string[];
  const availableColors = [...new Set(variants.filter(v => v.color).map(v => v.color))] as string[];
  const sizeRequired = availableSizes.length > 0;
  const colorRequired = availableColors.length > 0;
  const hasCompleteSelection = (!sizeRequired || !!selectedSize) && (!colorRequired || !!selectedColor);
  const requiresSelection = hasVariants && !hasCompleteSelection;

  const selectedVariant = hasVariants && hasCompleteSelection
    ? variants.find(v => (!sizeRequired || v.size === selectedSize) && (!colorRequired || v.color === selectedColor)) || null
    : null;

  const totalProductStock = hasVariants
    ? variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0)
    : (product?.stock_quantity ?? 0);

  const effectiveStock = hasVariants
    ? (() => {
        if (hasCompleteSelection) return selectedVariant?.stock_quantity ?? 0;
        if (selectedColor && !selectedSize) {
          return variants.filter(v => v.color === selectedColor).reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
        }
        if (selectedSize && !selectedColor) {
          return variants.filter(v => v.size === selectedSize).reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
        }
        return totalProductStock;
      })()
    : (product?.stock_quantity ?? 0);

  const effectivePrice = selectedVariant?.price_override ?? product?.price ?? 0;

  // Build selection guide for the buy box + disabled reason for the dynamic island
  const { sizeLabel, colorLabel } = getVariantLabels(product as any);
  const selectionSteps = hasVariants
    ? [
        availableSizes.length > 0 ? { label: sizeLabel, complete: !!selectedSize } : null,
        availableColors.length > 0 ? { label: colorLabel, complete: !!selectedColor } : null,
      ].filter(Boolean) as { label: string; complete: boolean }[]
    : [];
  const missingLabels = selectionSteps.filter(s => !s.complete).map(s => s.label.toLowerCase());
  const disabledReason = missingLabels.length > 0
    ? `Select a ${missingLabels.join(" & ")} to continue`
    : undefined;

  const baseImages = product?.images?.length ? product.images : [product?.thumbnail || "/placeholder.svg"];
  const variantHasCustomMedia = !!(selectedVariant as any)?.use_custom_media && ((selectedVariant as any)?.images?.length > 0);
  const variantImages = variantHasCustomMedia
    ? (selectedVariant as any).images as string[]
    : selectedColor
    ? variants.filter(v => v.color === selectedColor && (v as any).image_url).map(v => (v as any).image_url as string)
    : [];
  const images = variantImages.length > 0 ? [...variantImages, ...(variantHasCustomMedia ? [] : baseImages)] : baseImages;
  const videoUrl = variantHasCustomMedia && (selectedVariant as any)?.video_url ? (selectedVariant as any).video_url : product?.video_url;
  const discount = product?.compare_at_price
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;

  // === Cart / Wishlist actions ===
  const addToCart = async () => {
    if (!product) return;
    if (hasVariants) {
      const sizes = [...new Set(variants.filter(v => v.size).map(v => v.size))];
      const colors = [...new Set(variants.filter(v => v.color).map(v => v.color))];
      if (sizes.length > 0 && !selectedSize) { toast({ title: "Please select a size", variant: "destructive" }); return; }
      if (colors.length > 0 && !selectedColor) { toast({ title: "Please select a color", variant: "destructive" }); return; }
      if (!selectedVariant) { toast({ title: "This combination is unavailable", variant: "destructive" }); return; }
    }
    const variantId = selectedVariant?.id || null;
    const variantLabel = [selectedSize, selectedColor].filter(Boolean).join(" / ");

    // Trigger Cart Icon Jump-Off & Pop Event
    window.dispatchEvent(new CustomEvent("cart-pop-trigger"));

    if (!user) {
      if (!guestCheckoutAllowed) {
        toast({ title: "Please sign in", description: "You need to be logged in to add items to cart.", variant: "destructive" });
        return;
      }
      addToGuestCart(
        { product_id: product.id, variant_id: variantId, name: product.name, price: effectivePrice, image: images[0], slug: product.slug, variant_label: variantLabel, max_stock: effectiveStock },
        quantity,
      );
      queryClient.invalidateQueries({ queryKey: ["cart-count"] });
      toast({ title: "Added to cart!", description: `${product.name}${variantLabel ? ` (${variantLabel})` : ""} x${quantity}` });
      return;
    }

    setAddingToCart(true);
    let query = supabase.from("cart_items").select("id, quantity").eq("user_id", user.id).eq("product_id", product.id);
    if (variantId) query = query.eq("variant_id", variantId); else query = query.is("variant_id", null);
    const { data: existing } = await query.maybeSingle();
    if (existing) await supabase.from("cart_items").update({ quantity: existing.quantity + quantity }).eq("id", existing.id);
    else await supabase.from("cart_items").insert({ user_id: user.id, product_id: product.id, quantity, variant_id: variantId } as any);
    setAddingToCart(false);
    queryClient.invalidateQueries({ queryKey: ["cart-count"] });
    toast({ title: "Added to cart!", description: `${product.name}${variantLabel ? ` (${variantLabel})` : ""} x${quantity}` });
  };

  const addVariantToCart = async (variantId: string, variantLabel: string, qty: number = 1) => {
    if (!product) return;
    window.dispatchEvent(new CustomEvent("cart-pop-trigger"));
    if (!user) {
      if (!guestCheckoutAllowed) { toast({ title: "Please sign in", variant: "destructive" }); return; }
      addToGuestCart({ product_id: product.id, variant_id: variantId, name: product.name, price: effectivePrice, image: images[0], slug: product.slug, variant_label: variantLabel }, qty);
      queryClient.invalidateQueries({ queryKey: ["cart-count"] });
      toast({ title: "Added to cart!", description: `${product.name}${variantLabel ? ` (${variantLabel})` : ""} x${qty}` });
      return;
    }
    const query = supabase.from("cart_items").select("id, quantity").eq("user_id", user.id).eq("product_id", product.id).eq("variant_id", variantId);
    const { data: existing } = await query.maybeSingle();
    if (existing) await supabase.from("cart_items").update({ quantity: existing.quantity + qty }).eq("id", existing.id);
    else await supabase.from("cart_items").insert({ user_id: user.id, product_id: product.id, quantity: qty, variant_id: variantId } as any);
    queryClient.invalidateQueries({ queryKey: ["cart-count"] });
    toast({ title: "Added to cart!", description: `${product.name}${variantLabel ? ` (${variantLabel})` : ""} x${qty}` });
  };

  const buyNow = async () => {
    if (!product) return;
    if (hasVariants) {
      const sizes = [...new Set(variants.filter(v => v.size).map(v => v.size))];
      const colors = [...new Set(variants.filter(v => v.color).map(v => v.color))];
      if (sizes.length > 0 && !selectedSize) { toast({ title: "Please select a size", variant: "destructive" }); return; }
      if (colors.length > 0 && !selectedColor) { toast({ title: "Please select a color", variant: "destructive" }); return; }
      if (!selectedVariant) { toast({ title: "This combination is unavailable", variant: "destructive" }); return; }
    }
    // Navigate to checkout with buy-now state (only this product)
    const variantLabel = [selectedSize, selectedColor].filter(Boolean).join(" / ");
    const item = {
      productId: product.id,
      variantId: selectedVariant?.id || null,
      quantity,
      name: product.name,
      price: effectivePrice,
      thumbnail: selectedVariant?.image_url ?? product.thumbnail,
      selectedSize: selectedSize || null,
      selectedColor: selectedColor || null,
      variantLabel,
    };
    if (typeof window !== "undefined") {
      sessionStorage.setItem("orizino_is_buy_now", "true");
      sessionStorage.setItem("orizino_buy_now_item", JSON.stringify(item));
      localStorage.setItem("orizino_is_buy_now", "true");
      localStorage.setItem("orizino_buy_now_item", JSON.stringify(item));
    }
    navigate("/checkout?buyNow=true", {
      state: { buyNow: true, buyNowItem: item },
    });
  };

  const { data: inWishlist = false } = useQuery({
    queryKey: ["in-wishlist", user?.id, product?.id],
    queryFn: async () => {
      if (!user || !product) return false;
      const { data } = await supabase.from("wishlist_items").select("id").eq("user_id", user.id).eq("product_id", product.id).maybeSingle();
      return !!data;
    },
    enabled: !!user && !!product,
  });

  const toggleWishlist = async () => {
    if (!user) { toast({ title: "Please sign in", variant: "destructive" }); return; }
    if (!product) return;
    const { data: existing } = await supabase.from("wishlist_items").select("id").eq("user_id", user.id).eq("product_id", product.id).maybeSingle();
    if (existing) {
      await supabase.from("wishlist_items").delete().eq("id", existing.id);
      toast({ title: "Removed from wishlist" });
    } else {
      await supabase.from("wishlist_items").insert({ user_id: user.id, product_id: product.id });
      toast({ title: "Added to wishlist!" });
    }
    queryClient.invalidateQueries({ queryKey: ["in-wishlist", user.id, product.id] });
  };

  // === Render gallery ===
  const renderGallery = () => {
    const galleryProps = { images, productName: product!.name, discount };
    switch (galleryStyle) {
      case "infinity":
        return <InfinityGallery key={selectedColor || "default"} {...galleryProps} />;
      case "coverflow":
        return <Suspense fallback={<GalleryLoader />}><CoverflowGallery key={selectedColor || "default"} {...galleryProps} /></Suspense>;
      case "filmstrip":
        return <Suspense fallback={<GalleryLoader />}><FilmstripGallery key={selectedColor || "default"} {...galleryProps} /></Suspense>;
      case "mosaic":
        return <Suspense fallback={<GalleryLoader />}><GridMosaicGallery key={selectedColor || "default"} {...galleryProps} /></Suspense>;
      case "parallax-stack":
        return <Suspense fallback={<GalleryLoader />}><ParallaxStackGallery key={selectedColor || "default"} {...galleryProps} /></Suspense>;
      case "editorial-split":
        return <Suspense fallback={<GalleryLoader />}><EditorialSplitGallery key={selectedColor || "default"} {...galleryProps} /></Suspense>;
      case "carousel-cards":
        return <Suspense fallback={<GalleryLoader />}><HorizonCarouselGallery key={selectedColor || "default"} {...galleryProps} /></Suspense>;
      case "studio-turntable":
      case "immersive-zoom":
        return <Suspense fallback={<GalleryLoader />}><StudioTurntableGallery key={selectedColor || "default"} {...galleryProps} /></Suspense>;
      default:
        return <ImageGallery key={selectedColor || "default"} {...galleryProps} layout="premium" />;
    }
  };

  // === Skeleton: render page chrome instantly, only shimmer the data region ===
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-4 md:py-6">
          <div className="mb-3 md:mb-4">
            <SectionShimmer of="categoryChips" count={3} />
          </div>
          <SectionShimmer of="productHero" />
          <div className="mt-8 md:mt-10">
            <SectionShimmer of="reviewList" count={2} />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-16 md:py-20 text-center">
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Product not found</h1>
        </div>
      </div>
    );
  }

  const trustBadges = [
    { icon: Truck, label: "Free Shipping", sub: "On orders over $50" },
    { icon: Shield, label: "Secure Payment", sub: "100% protected" },
    { icon: RotateCcw, label: "Easy Returns", sub: "30-day policy" },
    { icon: Package, label: "Quality Guaranteed", sub: "Authentic products" },
  ];

  // === Shared variant badge section ===
  const VariantBadges = () => (
    <AnimatePresence>
      {(selectedSize || selectedColor) && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-[10px] sm:text-xs text-muted-foreground">Selected:</span>
          <AnimatePresence mode="popLayout">
            {selectedSize && (
              <motion.div key="size" layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 sm:py-1 text-[10px] sm:text-xs">
                  Size: {selectedSize}
                  <button onClick={() => setSelectedSize(null)} className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5"><X className="w-2.5 h-2.5 sm:w-3 sm:h-3" /></button>
                </Badge>
              </motion.div>
            )}
            {selectedColor && (
              <motion.div key="color" layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                <Badge variant="secondary" className="gap-1 pl-1.5 pr-1 py-0.5 sm:py-1 text-[10px] sm:text-xs">
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-border/50 inline-block shrink-0" style={{ backgroundColor: selectedColor.toLowerCase() }} />
                  {selectedColor}
                  <button onClick={() => setSelectedColor(null)} className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5"><X className="w-2.5 h-2.5 sm:w-3 sm:h-3" /></button>
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // === Shared product info section ===
  const ProductInfo = () => {
    return (
    <div className="space-y-4 sm:space-y-5 w-full">
      {productCat && (
        <span className="inline-block text-[10px] sm:text-xs font-semibold tracking-[0.18em] sm:tracking-[0.2em] uppercase text-primary">
          {productCat.name}
        </span>
      )}

      <h1 className={`font-display leading-[1.08] tracking-tight ${
        layout === "magazine"
          ? "text-3xl sm:text-4xl md:text-5xl italic font-normal"
          : "text-2xl sm:text-3xl md:text-4xl font-semibold"
      } ${cfg.textClass}`} style={{ fontFamily: 'var(--font-title, var(--font-display))' }}>
        {product.name}
      </h1>

      {/* Rating */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${i < Math.round(product.avg_rating || 0)
              ? layout === "neon" ? "fill-primary text-primary drop-shadow-[0_0_4px_hsl(var(--primary)/0.6)]" : "fill-primary text-primary"
              : "text-muted-foreground/30"}`} />
          ))}
        </div>
        <span className="text-xs sm:text-sm text-muted-foreground font-medium">{product.avg_rating?.toFixed(1) || "0"} ({product.review_count || 0} reviews)</span>
      </div>

      {/* Price & Share — full width alignment with subtle hairline border */}
      <div className="flex items-center justify-between gap-3 w-full py-2.5 border-y border-border/30">
        <div className="flex items-baseline gap-2.5 flex-wrap notranslate skiptranslate" translate="no">
          <span className={`${cfg.priceClass} notranslate`} translate="no">{formatPrice(effectivePrice)}</span>
          {product.compare_at_price && (
            <span className="text-sm sm:text-base text-muted-foreground line-through notranslate" translate="no">{formatPrice(product.compare_at_price)}</span>
          )}
          {discount > 0 && (
            <span className={`text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 rounded-full notranslate ${
              layout === "neon" ? "bg-primary/20 text-primary border border-primary/30" : "bg-primary/10 text-primary border border-primary/20"
            }`} translate="no">
              {layout === "neon" && <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline mr-0.5 sm:mr-1" />}
              Save {discount}%
            </span>
          )}
        </div>
        <ShareButton size="sm" className="shrink-0" />
      </div>

      <CurrencyWidget price={effectivePrice} />

      {/* Available Offers / Voucher Strip */}
      {applicableCoupons && applicableCoupons.length > 0 && (
        <div className="p-3 rounded-2xl bg-secondary/30 border border-border/50 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span className="flex items-center gap-1.5 text-primary">
              <TicketPercent className="w-3.5 h-3.5" />
              <span>Available Offers & Coupons</span>
            </span>
            <span className="text-[10px] text-muted-foreground">Tap to copy code</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {applicableCoupons.map((c: any) => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(c.code);
                  try {
                    localStorage.setItem("orizino_applied_coupon", c.code);
                    sessionStorage.setItem("orizino_applied_coupon", c.code);
                    window.dispatchEvent(new CustomEvent("coupon-applied", { detail: c.code }));
                  } catch {}
                  toast.success(`Coupon ${c.code} applied!`);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-primary/20 hover:border-primary/50 text-xs shrink-0 transition-all font-mono shadow-xs group"
              >
                <span className="font-bold text-foreground group-hover:text-primary">{c.code}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-sans font-bold">
                  {c.discount_type === "percentage" ? `${c.discount_value}% OFF` : `৳${c.discount_value} OFF`}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {hasVariants && (
        <VariantSelector productId={product.id} selectedSize={selectedSize} selectedColor={selectedColor}
          onSizeChange={setSelectedSize} onColorChange={setSelectedColor} layout={layout === "minimal" ? "minimal" : "premium"} />
      )}

      <VariantBadges />

      {hasVariants && product && (
        <VariantComparison productId={product.id} basePrice={product.price} compareAtPrice={product.compare_at_price}
          productName={product.name} productThumbnail={product.thumbnail} onAddToCart={addVariantToCart} />
      )}

      <ProductActions
        quantity={quantity} setQuantity={setQuantity} maxQuantity={Math.max(1, effectiveStock)}
        onAddToCart={addToCart} onBuyNow={buyNow} onToggleWishlist={toggleWishlist}
        inWishlist={inWishlist}
        addingToCart={addingToCart}
        inStock={hasCompleteSelection ? effectiveStock > 0 : totalProductStock > 0}
        layout={layout === "minimal" ? "minimal" : "premium"}
        disabled={requiresSelection}
        disabledReason={disabledReason}
        selectionSteps={selectionSteps}
      />

      {hasCompleteSelection && effectiveStock === 0 && (
        <NotifyWhenAvailable productId={product.id} variantId={selectedVariant?.id}
          variantLabel={[selectedSize, selectedColor].filter(Boolean).join(" / ") || undefined} />
      )}

      {/* Trust badges — editorial hairline row */}
      {layout !== "minimal" && (
        <div className="grid grid-cols-2 gap-px bg-border/40 border border-border/40 rounded-xl overflow-hidden mt-1 sm:mt-2">
          {trustBadges.map((badge) => (
            <div key={badge.label} className="bg-background/40 backdrop-blur-sm px-3 py-2.5 sm:px-4 sm:py-3 flex items-center gap-2.5">
              <badge.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" strokeWidth={1.25} />
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.15em] font-medium text-foreground leading-tight truncate">{badge.label}</p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight truncate">{badge.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Available offers & vouchers — refined luxury UI */}
      {((applicableCoupons && applicableCoupons.length > 0) || (deliveryOffers && deliveryOffers.length > 0)) && layout !== "minimal" && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/80 flex items-center gap-2">
              <TicketPercent className="w-4 h-4 text-primary" /> Available Offers & Vouchers
            </p>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-foreground/5 text-muted-foreground border border-border/50">
              {(applicableCoupons?.length || 0) + (deliveryOffers?.length || 0)} available
            </span>
          </div>

          <div className="space-y-2.5">
            {applicableCoupons?.slice(0, 3).map(c => (
              <div
                key={c.code}
                className="group relative flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-border/70 dark:border-white/10 bg-gradient-to-r from-card/80 via-card/50 to-background/50 backdrop-blur-md hover:border-primary/40 transition-all duration-300 shadow-xs"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary group-hover:scale-105 transition-transform">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold tracking-wider text-primary border border-dashed border-primary/40 px-2.5 py-0.5 rounded-lg bg-background/80 shadow-2xs">
                        {c.code}
                      </span>
                      <span className="text-[11px] font-bold text-foreground bg-primary/15 border border-primary/20 px-2 py-0.5 rounded-md">
                        {c.discount_type === "percentage" ? `${c.discount_value}% OFF` : `৳${Number(c.discount_value).toFixed(0)} OFF`}
                      </span>
                    </div>
                    {c.description && (
                      <p className="text-[11.5px] text-muted-foreground mt-1 leading-relaxed truncate">{c.description}</p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    try {
                      navigator.clipboard.writeText(c.code);
                      toast.success(`Coupon code ${c.code} copied!`);
                    } catch {}
                  }}
                  className="shrink-0 text-xs font-semibold text-primary hover:text-primary-foreground hover:bg-primary border border-primary/30 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  title="Copy coupon code"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
            ))}

            {deliveryOffers?.slice(0, 2).map(offer => (
              <div
                key={offer.id}
                className="group relative flex items-center gap-3.5 p-3.5 rounded-2xl border border-border/70 dark:border-white/10 bg-gradient-to-r from-card/80 via-card/50 to-background/50 backdrop-blur-md hover:border-primary/40 transition-all duration-300 shadow-xs"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary group-hover:scale-105 transition-transform">
                  <Truck className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/25 px-2 py-0.5 rounded-md shrink-0">
                        Shipping
                      </span>
                      <p className="text-xs font-semibold text-foreground tracking-tight truncate">{offer.title}</p>
                    </div>
                    <span className="hidden sm:inline-flex text-[9.5px] font-mono font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                      Auto Applied
                    </span>
                  </div>
                  {offer.description && (
                    <p className="text-[11.5px] text-muted-foreground mt-1 leading-relaxed truncate">{offer.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
    );
  };

  // === MAGAZINE layout: full-width gallery, then split content ===
  const isMagazine = layout === "magazine";

  if (isLoading || !product) {
    return (
      <div className="min-h-screen bg-background/50 animate-pulse">
        <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 space-y-6">
          {/* Breadcrumb Skeleton */}
          <div className="flex items-center gap-2 h-4 w-48 bg-muted/60 rounded-md" />

          {/* Product Grid Skeleton */}
          <div className="grid lg:grid-cols-12 gap-6 lg:gap-12 items-start">
            {/* Gallery Skeleton */}
            <div className="lg:col-span-7 space-y-4">
              <div className="w-full aspect-square rounded-3xl bg-muted/50 border border-border/40" />
              <div className="grid grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="aspect-square rounded-2xl bg-muted/40 border border-border/30" />
                ))}
              </div>
            </div>

            {/* Details Skeleton */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-3">
                <div className="h-4 w-24 bg-primary/20 rounded-md" />
                <div className="h-8 w-3/4 bg-muted/70 rounded-lg" />
                <div className="h-4 w-32 bg-muted/50 rounded-md" />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="h-9 w-36 bg-muted/80 rounded-lg" />
                <div className="h-6 w-24 bg-muted/50 rounded-full" />
              </div>

              <div className="h-px bg-border/60" />

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="h-4 w-20 bg-muted/60 rounded" />
                  <div className="flex gap-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-9 w-14 rounded-xl bg-muted/50 border border-border/40" />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-20 bg-muted/60 rounded" />
                  <div className="flex gap-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-9 w-16 rounded-xl bg-muted/50 border border-border/40" />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <div className="h-12 w-full rounded-full bg-muted/70" />
                <div className="h-12 w-full rounded-full bg-primary/30" />
              </div>

              <div className="grid grid-cols-3 gap-3 pt-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-16 rounded-2xl bg-muted/40 border border-border/30" />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${cfg.containerClass}`}>
      <ProductTrayEffect product={product} effectivePrice={effectivePrice} selectedVariant={selectedVariant} effectiveStock={effectiveStock} addToCart={addToCart} buyNow={buyNow} addingToCart={addingToCart} disabled={requiresSelection} disabledReason={disabledReason} />
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-4 sm:py-6 md:py-8 max-w-[1520px] mx-auto">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            ...(parentCategory ? [{ label: parentCategory.name, href: `/categories/${parentCategory.slug}` }] : []),
            ...(productCat ? [{ label: productCat.name, href: `/categories/${productCat.slug}` }] : []),
            { label: product.name },
          ]}
          className="mb-3 sm:mb-4 md:mb-6"
        />

        {isMagazine ? (
          /* Magazine: Full-width gallery then split content */
          <div className="space-y-6 sm:space-y-8 md:space-y-12">
            {renderGallery()}
            {videoUrl && (
              <ProductVideo url={videoUrl} title={product.name} className="max-w-4xl mx-auto" />
            )}
            <div className="grid md:grid-cols-5 gap-6 sm:gap-8 md:gap-12">
              <div className="md:col-span-3 space-y-6 sm:space-y-8">
                <ProductInfo />
              </div>
              <div className="md:col-span-2">
                <ProductTabs
                  product={{ id: product.id, description: product.description, specifications: product.specifications as any }}
                  reviews={mergedReviews} ownReviewIds={ownReviewIds} layout="editorial"
                />
              </div>
            </div>
          </div>
        ) : (
          /* All other layouts: side-by-side on desktop, stacked on mobile */
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-10 items-start">
              <div className="space-y-4 md:sticky md:top-20 md:self-start">
                {renderGallery()}
                {videoUrl && (
                  <ProductVideo url={videoUrl} title={product.name} />
                )}
                {/* Fill space under gallery: product highlights / specs preview */}
                {product.specifications && Object.keys(product.specifications as Record<string, any>).length > 0 && (
                  <div className={`${cfg.cardClass} rounded-2xl p-4 sm:p-5 space-y-3`}>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" /> Quick Specs
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(product.specifications as Record<string, any>).slice(0, 6).map(([key, val]) => (
                        <div key={key} className="text-xs">
                          <span className="text-muted-foreground">{key}</span>
                          <p className="text-foreground font-medium truncate">{String(val)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Tags */}
                {product.tags && product.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {product.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <ProductInfo />
              </div>
            </div>
            <section className="mt-10 sm:mt-14">
              <ProductTabs
                product={{ id: product.id, description: product.description, specifications: product.specifications as any }}
                reviews={mergedReviews} ownReviewIds={ownReviewIds} layout={layout === "minimal" ? "minimal" : "premium"}
              />
            </section>
          </>
        )}

        {/* Related Products */}
        {relatedProducts && relatedProducts.length > 0 && (
          <section className="mt-10 sm:mt-14">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className={`font-bold font-display text-foreground ${layout === "minimal" ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"}`}>
                {layout === "neon" && <Flame className="w-4 h-4 sm:w-5 sm:h-5 inline mr-1.5 sm:mr-2 text-primary" />}
                You May Also Like
              </h2>
              {productCat && (
                <Link to={`/categories/${productCat.slug}`} className="text-xs sm:text-sm text-primary hover:underline">
                  View all
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 auto-rows-fr">
              {relatedProducts.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <ProductCard id={p.id} name={p.name} price={p.price}
                    compareAtPrice={p.compare_at_price ?? undefined} thumbnail={p.thumbnail ?? undefined}
                    avgRating={p.avg_rating ?? undefined} reviewCount={p.review_count ?? undefined} slug={p.slug} />
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default ProductDetailPage;
// code:4ce0
