"use client";
import React, { useState, useEffect } from "react";
import { Link } from "@/lib/router-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2, Minus, Plus, ShoppingBag, ArrowRight, Globe, Tag, Gift,
  Truck, X, CheckCircle2, AlertCircle, Heart, Share2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/lib/app-toast";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StickyActionBar } from "@/components/mobile";
import ImageWithFallback from "@/components/ImageWithFallback";
import { getGuestCart, updateGuestCartQty, removeFromGuestCart, type GuestCartItem } from "@/lib/guest-cart";
import { useGuestCheckoutAllowed } from "@/lib/use-guest-checkout-allowed";

function AutoExpandingTextarea({
  value,
  onChange,
  placeholder,
  className,
  maxHeight = 140,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  maxHeight?: number;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const adjustHeight = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const nextHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${Math.max(42, nextHeight)}px`;
  }, [maxHeight]);

  React.useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        adjustHeight();
      }}
      placeholder={placeholder}
      rows={1}
      className={`w-full px-3.5 py-2.5 rounded-xl bg-background/80 border border-border/60 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary text-xs overflow-y-auto resize-none transition-[height] duration-150 ease-out ${className || ""}`}
    />
  );
}

const CartPage: React.FC = () => {
  useSeoMeta("cart", "Cart | Store");
  const { user } = useAuth();
  const { formatPrice, currency, setCurrency, enabledCurrencies, config } = useCurrency();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [giftWrap, setGiftWrap] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  const { data: cartItems, isLoading } = useQuery({
    queryKey: ["cart", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("cart_items")
        .select("*, products(id, name, price, compare_at_price, thumbnail, slug, stock_quantity), product_variants(id, size, color, price_override, stock_quantity)")
        .eq("user_id", user!.id)
        .order("created_at");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: shippingMethods } = useQuery({
    queryKey: ["shipping-methods"],
    queryFn: async () => {
      const { data } = await supabase.from("shipping_methods").select("*").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  // Fetch available coupons to show to user
  const { data: availableCoupons } = useQuery({
    queryKey: ["available-coupons"],
    queryFn: async () => {
      const { data } = await supabase.from("coupons").select("code, description, discount_type, discount_value, min_order_amount, max_discount_amount, first_order_only, target_categories, target_products")
        .eq("is_active", true);
      // Filter out expired and future ones client-side (RLS already filters is_active)
      return (data || []).filter(c => !c.first_order_only); // Don't show first-order-only to avoid confusion
    },
    staleTime: 5 * 60 * 1000,
  });

  const [showCoupons, setShowCoupons] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("orizino_applied_coupon") || sessionStorage.getItem("orizino_applied_coupon");
      if (stored && !couponCode && !appliedCoupon) {
        setCouponCode(stored);
      }
    } catch {}

    const handleCouponApplied = (e: any) => {
      if (e?.detail) setCouponCode(e.detail);
    };
    window.addEventListener("coupon-applied", handleCouponApplied);
    return () => window.removeEventListener("coupon-applied", handleCouponApplied);
  }, []);

  const updateQty = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      if (quantity <= 0) await supabase.from("cart_items").delete().eq("id", id);
      else await supabase.from("cart_items").update({ quantity }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["cart-count"] });
    },
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => { await supabase.from("cart_items").delete().eq("id", id); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["cart-count"] });
    },
  });

  const moveToWishlist = async (productId: string, cartItemId: string) => {
    if (!user) return;
    const { data: existing } = await supabase.from("wishlist_items").select("id").eq("user_id", user.id).eq("product_id", productId).maybeSingle();
    if (!existing) await supabase.from("wishlist_items").insert({ user_id: user.id, product_id: productId });
    await supabase.from("cart_items").delete().eq("id", cartItemId);
    queryClient.invalidateQueries({ queryKey: ["cart"] });
    queryClient.invalidateQueries({ queryKey: ["cart-count"] });
    queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    toast({ title: "Moved to wishlist" });
  };

  const subtotal = cartItems?.reduce((sum, item) => {
    const product = item.products as any;
    const variant = (item as any).product_variants as any;
    const price = variant?.price_override ?? product?.price ?? 0;
    return sum + price * item.quantity;
  }, 0) || 0;

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    const { data, error } = await supabase.from("coupons").select("*").eq("code", couponCode.trim().toUpperCase()).eq("is_active", true).maybeSingle();
    setCouponLoading(false);
    if (!data || error) { toast({ title: "Invalid coupon code", variant: "destructive" }); return; }
    if (data.expires_at && new Date(data.expires_at) < new Date()) { toast({ title: "Coupon expired", variant: "destructive" }); return; }
    if (data.starts_at && new Date(data.starts_at) > new Date()) { toast({ title: "Coupon not yet active", variant: "destructive" }); return; }
    if (data.usage_limit && (data.used_count ?? 0) >= data.usage_limit) { toast({ title: "Coupon usage limit reached", variant: "destructive" }); return; }
    if (data.min_order_amount && subtotal < Number(data.min_order_amount)) { toast({ title: `Min order ${formatPrice(Number(data.min_order_amount))}`, variant: "destructive" }); return; }

    // Check min items
    const itemCount = cartItems?.reduce((s, i) => s + i.quantity, 0) || 0;
    if ((data as any).min_items && itemCount < (data as any).min_items) { toast({ title: `Minimum ${(data as any).min_items} items required`, variant: "destructive" }); return; }

    // Check category targeting
    const targetCats = (data as any).target_categories as string[] || [];
    if (targetCats.length > 0 && cartItems) {
      const cartCatIds = new Set(cartItems.map(i => (i.products as any)?.category_id).filter(Boolean));
      const hasMatchingCat = targetCats.some(c => cartCatIds.has(c));
      if (!hasMatchingCat) { toast({ title: "Coupon not applicable to items in your cart", variant: "destructive" }); return; }
    }

    // Check product targeting
    const targetProds = (data as any).target_products as string[] || [];
    if (targetProds.length > 0 && cartItems) {
      const cartProdIds = new Set(cartItems.map(i => i.product_id));
      const hasMatchingProd = targetProds.some(p => cartProdIds.has(p));
      if (!hasMatchingProd) { toast({ title: "Coupon not applicable to items in your cart", variant: "destructive" }); return; }
    }

    // Check first order only
    if ((data as any).first_order_only && user) {
      const { count } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      if ((count || 0) > 0) { toast({ title: "This coupon is only for first-time orders", variant: "destructive" }); return; }
    }

    setAppliedCoupon(data);
    toast({ title: "Coupon applied!", description: data.description || `${data.discount_type === "percentage" ? `${data.discount_value}% off` : formatPrice(Number(data.discount_value)) + " off"}` });
  };

  const removeCoupon = () => { setAppliedCoupon(null); setCouponCode(""); };

  // Auto-select first shipping
  React.useEffect(() => {
    if (shippingMethods?.length && !selectedShipping) setSelectedShipping(shippingMethods[0].id);
  }, [shippingMethods, selectedShipping]);

  const { allowed: guestCheckoutAllowed, loading: guestFlagLoading } = useGuestCheckoutAllowed();

  if (!user) {
    if (guestFlagLoading) return null;
    if (guestCheckoutAllowed) return <GuestCartView formatPrice={formatPrice} t={t} />;
    return (
      <div className="min-h-screen pb-20 lg:pb-0">
          <div className="container mx-auto px-4 py-20 text-center">
          <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold font-display text-foreground mb-2">{t("nav.cart")}</h1>
          <p className="text-muted-foreground mb-6">Please sign in to view your cart</p>
          <Link to="/auth" className="btn-pill bg-gradient-primary text-primary-foreground font-semibold px-8 py-3 inline-flex items-center gap-2">{t("nav.signIn")} <ArrowRight className="w-4 h-4" /></Link>
        </div>
      </div>
    );
  }

  const itemCount = cartItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  // Coupon discount
  let couponDiscount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === "percentage") {
      couponDiscount = subtotal * (Number(appliedCoupon.discount_value) / 100);
      if (appliedCoupon.max_discount_amount) couponDiscount = Math.min(couponDiscount, Number(appliedCoupon.max_discount_amount));
    } else {
      couponDiscount = Number(appliedCoupon.discount_value);
    }
  }

  const giftWrapFee = giftWrap ? 50 : 0;
  const total = Math.max(0, subtotal - couponDiscount + giftWrapFee);

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-10 space-y-6 sm:space-y-8">
        {/* ── Header Section ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/40 pb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold font-display text-foreground tracking-tight">
              {t("nav.cart") || "Shopping Cart"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-primary shrink-0" />
              <span>{itemCount} {itemCount === 1 ? "item" : "items"} in your cart</span>
            </p>
          </div>
          <Link
            to="/inventory"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 shrink-0 hover:gap-2"
          >
            {t("cart.continueShopping") || "Continue Shopping"} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>


        {isLoading ? (
          <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="rounded-2xl border border-border/50 bg-card/60 p-6 h-32 animate-pulse" />)}</div>
        ) : !cartItems || cartItems.length === 0 ? (
          <div className="text-center py-16 px-6 sm:py-24 sm:px-10 rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md w-full shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3 text-primary shadow-xs">
              <ShoppingBag className="w-8 h-8 stroke-[1.75]" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground tracking-tight">
              {t("cart.empty") || "Your cart is empty"}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Explore our handcrafted streetwear collections and find pieces crafted just for you.
            </p>
            <div className="pt-2">
              <Link
                to="/inventory"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-bold text-xs sm:text-sm shadow-md hover:bg-primary/90 transition-all hover:gap-3"
              >
                {t("cart.continueShopping") || "Continue Shopping"} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6 sm:gap-8 items-start">
            <div className="lg:col-span-2 space-y-4">
              {/* Cart Items List */}
              <AnimatePresence>
                {cartItems.map((item) => {
                  const product = item.products as any;
                  const variant = (item as any).product_variants as any;
                  if (!product) return null;
                  const itemPrice = variant?.price_override ?? product.price;
                  const variantLabel = [variant?.size, variant?.color].filter(Boolean).join(" / ");
                  const maxQty = variant?.stock_quantity ?? product.stock_quantity;
                  const savings = product.compare_at_price ? (Number(product.compare_at_price) - itemPrice) * item.quantity : 0;

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      className="rounded-2xl border border-border/50 bg-card/80 p-4 sm:p-5 shadow-xs hover:border-primary/30 transition-all"
                    >
                      <div className="flex gap-4 sm:gap-5">
                        <Link to={`/product/${product.slug}`} className="w-24 h-28 sm:w-28 sm:h-34 overflow-hidden rounded-xl shrink-0 bg-secondary/10 group">
                          <ImageWithFallback src={product.thumbnail} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </Link>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-3">
                              <Link to={`/product/${product.slug}`} className="font-bold text-sm sm:text-base text-foreground hover:text-primary transition-colors line-clamp-2 leading-snug">
                                {product.name}
                              </Link>
                              <span className="font-bold text-sm sm:text-base text-foreground shrink-0">{formatPrice(itemPrice * item.quantity)}</span>
                            </div>
                            
                            {variantLabel && (
                              <div className="flex items-center gap-2 pt-0.5">
                                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider border-border/60">
                                  {variantLabel}
                                </Badge>
                              </div>
                            )}

                            <div className="flex items-baseline gap-2 pt-0.5">
                              <span className="text-xs text-muted-foreground">{formatPrice(itemPrice)} each</span>
                              {product.compare_at_price && (
                                <span className="text-xs text-muted-foreground/60 line-through font-medium">{formatPrice(product.compare_at_price)}</span>
                              )}
                              {savings > 0 && <span className="text-[11px] font-bold text-green-500">Save {formatPrice(savings)}</span>}
                            </div>

                            {maxQty <= 5 && (
                              <p className="text-[10px] sm:text-xs text-amber-500 font-semibold flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Only {maxQty} left in stock
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-border/30 mt-3">
                            {/* Quantity Pill Controller */}
                            <div className="h-8 flex items-center rounded-xl border border-border/60 overflow-hidden bg-secondary/30">
                              <button
                                type="button"
                                onClick={() => updateQty.mutate({ id: item.id, quantity: item.quantity - 1 })}
                                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center text-xs font-bold text-foreground tabular-nums">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQty.mutate({ id: item.id, quantity: Math.min(maxQty, item.quantity + 1) })}
                                disabled={item.quantity >= maxQty}
                                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 disabled:opacity-30 transition-colors"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => moveToWishlist(product.id, item.id)}
                                className="text-xs font-semibold text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors group"
                                title="Move to wishlist"
                              >
                                <Heart className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                <span className="hidden sm:inline">Save</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => removeItem.mutate(item.id)}
                                className="text-xs font-semibold text-muted-foreground hover:text-destructive flex items-center gap-1.5 transition-colors"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Remove</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>



              {/* Gift Wrap & Notes Section */}
              <div className="rounded-2xl border border-border/50 bg-card/80 p-5 space-y-4 shadow-xs">
                <button
                  type="button"
                  onClick={() => setGiftWrap(!giftWrap)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    giftWrap ? "border-primary bg-primary/10" : "border-border/60 hover:border-primary/40 bg-secondary/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Gift className={`w-4 h-4 ${giftWrap ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="text-left">
                      <p className="text-xs font-bold text-foreground">Gift Wrap & Ribbon</p>
                      <p className="text-[11px] text-muted-foreground">Premium gift packaging + personalized card</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">{formatPrice(50)}</span>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${giftWrap ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"}`}>
                      {giftWrap && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </button>

                {giftWrap && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}>
                    <AutoExpandingTextarea
                      value={giftMessage}
                      onChange={setGiftMessage}
                      placeholder="Add a personalized gift message..."
                      maxHeight={140}
                    />
                  </motion.div>
                )}

                <AutoExpandingTextarea
                  value={orderNotes}
                  onChange={setOrderNotes}
                  placeholder="Special instructions for your order (optional)..."
                  maxHeight={140}
                />
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/50 p-5 sm:p-6 sticky top-24 space-y-5 bg-card/90 backdrop-blur-md shadow-xs">
                <div className="pb-4 border-b border-border/40">
                  <h3 className="font-bold text-lg text-foreground">Order Summary</h3>
                </div>

                {/* Coupon Code Input */}
                <div className="space-y-2">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-green-500/10 border border-green-500/30">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-green-500" />
                        <div>
                          <p className="text-xs font-bold text-green-500">{appliedCoupon.code}</p>
                          <p className="text-[10px] text-green-500/80">{appliedCoupon.description}</p>
                        </div>
                      </div>
                      <button onClick={removeCoupon} className="p-1 rounded-full hover:bg-secondary/50 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Coupon code"
                        className="rounded-full sm:rounded-xl text-xs h-10 border-border/60 bg-background/80"
                        onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                      />
                      <Button size="sm" onClick={applyCoupon} disabled={couponLoading} className="rounded-xl px-4 h-10 font-bold text-xs whitespace-nowrap">
                        {couponLoading ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : "Apply"}
                      </Button>
                    </div>
                  )}

                  {!appliedCoupon && availableCoupons && availableCoupons.length > 0 && (
                    <div className="pt-1">
                      <button onClick={() => setShowCoupons(!showCoupons)} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" /> {showCoupons ? "Hide" : "View"} available vouchers ({availableCoupons.length})
                      </button>
                      {showCoupons && (
                        <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {availableCoupons.map((c) => (
                            <button
                              key={c.code}
                              onClick={() => { setCouponCode(c.code); setShowCoupons(false); }}
                              className="w-full text-left p-2.5 rounded-xl border border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 transition-all"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-primary">{c.code}</span>
                                <Badge variant="secondary" className="text-[10px] font-bold">
                                  {c.discount_type === "percentage" ? `${c.discount_value}% OFF` : `${formatPrice(Number(c.discount_value))} OFF`}
                                </Badge>
                              </div>
                              {c.description && <p className="text-[10px] text-muted-foreground mt-0.5">{c.description}</p>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Subtotal & Totals breakdown */}
                <div className="space-y-2.5 text-xs sm:text-sm pt-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</span>
                    <span className="font-bold text-foreground">{formatPrice(subtotal)}</span>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-green-500 font-medium">
                      <span>Discount</span>
                      <span>-{formatPrice(couponDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="text-xs text-muted-foreground/80 italic">Calculated at checkout</span>
                  </div>
                  {giftWrap && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gift Wrap</span>
                      <span className="font-bold text-foreground">{formatPrice(giftWrapFee)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-border/40 pt-4 flex justify-between font-extrabold text-foreground text-lg">
                  <span>{t("checkout.orderTotal") || "Total"}</span>
                  <span>{formatPrice(total)}</span>
                </div>

                {/* Desktop Checkout CTA Button */}
                <Link
                  to="/checkout"
                  state={{ coupon: appliedCoupon, giftWrap, giftMessage, orderNotes, shippingMethodId: selectedShipping }}
                  className="hidden md:block"
                >
                  <Button className="w-full h-12 rounded-2xl font-bold uppercase tracking-wider text-xs gap-2 shadow-xs">
                    Proceed to Checkout <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>

                <p className="hidden md:block text-center text-[10px] uppercase tracking-wider text-muted-foreground">
                  🔒 Encrypted & Secure Checkout
                </p>
              </div>
            </div>

          </div>
        )}
        {/* Mobile-only sticky checkout action bar */}
        {cartItems && cartItems.length > 0 && (
          <div className="md:hidden h-32" aria-hidden="true" />
        )}
      </main>
      {cartItems && cartItems.length > 0 && (
        <StickyActionBar aboveBottomNav className="md:hidden">
          <Link
            to="/checkout"
            state={{ coupon: appliedCoupon, giftWrap, giftMessage, orderNotes, shippingMethodId: selectedShipping }}
            className="block"
          >
            <motion.span
              whileTap={{ scale: 0.98 }}
              className="w-full bg-primary text-primary-foreground font-semibold text-sm py-3.5 flex items-center justify-center gap-2 rounded-xl"
            >
              Checkout · {formatPrice(total)} <ArrowRight className="w-4 h-4" />
            </motion.span>
          </Link>
        </StickyActionBar>
      )}
    </div>
  );
};

export default CartPage;

/** Cart view for shoppers who aren't signed in — reads/writes the
 *  localStorage guest cart and hands off to /checkout-guest. Kept
 *  intentionally simpler than the signed-in cart (no coupons/shipping
 *  picker here — guest checkout collects the rest on its own page). */
const GuestCartView: React.FC<{ formatPrice: (n: number) => string; t: (k: string) => string }> = ({ formatPrice, t }) => {
  const [items, setItems] = useState<GuestCartItem[]>(() => getGuestCart());

  const refresh = () => setItems(getGuestCart());
  const setQty = (item: GuestCartItem, qty: number) => {
    updateGuestCartQty(item.product_id, item.variant_id, qty);
    refresh();
  };
  const remove = (item: GuestCartItem) => {
    removeFromGuestCart(item.product_id, item.variant_id);
    refresh();
    toast({ title: "Removed from cart" });
  };

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  if (items.length === 0) {
    return (
      <div className="min-h-screen pb-20 lg:pb-0">
        <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-10">
          <div className="text-center py-16 px-6 sm:py-24 sm:px-10 rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md w-full shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3 text-primary shadow-xs">
              <ShoppingBag className="w-8 h-8 stroke-[1.75]" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground tracking-tight">
              {t("cart.empty") || "Your cart is empty"}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Explore our handcrafted streetwear collections and find pieces crafted just for you.
            </p>
            <div className="pt-2">
              <Link
                to="/inventory"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-bold text-xs sm:text-sm shadow-md hover:bg-primary/90 transition-all hover:gap-3"
              >
                {t("cart.continueShopping") || "Continue Shopping"} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 lg:pb-0">
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-10 space-y-6 sm:space-y-8">
        <div className="flex items-center justify-between border-b border-border/40 pb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold font-display text-foreground tracking-tight">{t("nav.cart") || "Shopping Cart"}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Guest Session · Items saved on this device</span>
            </p>
          </div>
          <Link to="/auth" className="text-xs font-semibold text-primary hover:underline">
            Sign in instead
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8 items-start">
          <div className="lg:col-span-2 space-y-3">
            {items.map((item) => (
              <div key={`${item.product_id}-${item.variant_id ?? ""}`} className="flex gap-4 p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/80 shadow-xs hover:border-primary/30 transition-all">
                <Link to={item.slug ? `/product/${item.slug}` : "#"} className="w-24 h-28 sm:w-28 sm:h-34 overflow-hidden rounded-xl shrink-0 bg-secondary/10 group">
                  <ImageWithFallback src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </Link>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div className="space-y-1">
                    <Link to={item.slug ? `/product/${item.slug}` : "#"} className="font-bold text-sm sm:text-base text-foreground hover:text-primary transition-colors line-clamp-2 leading-snug">
                      {item.name}
                    </Link>
                    {item.variant_label && (
                      <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider border-border/60">
                        {item.variant_label}
                      </Badge>
                    )}
                    <p className="text-xs sm:text-sm font-bold text-foreground pt-0.5">{formatPrice(item.price)}</p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/30 mt-3">
                    <div className="h-8 flex items-center rounded-xl border border-border/60 overflow-hidden bg-secondary/30">
                      <button type="button" onClick={() => setQty(item, item.qty - 1)} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-foreground tabular-nums">{item.qty}</span>
                      <button type="button" onClick={() => setQty(item, item.qty + 1)} disabled={!!item.max_stock && item.qty >= item.max_stock} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 disabled:opacity-30 transition-colors">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button type="button" onClick={() => remove(item)} className="text-xs font-semibold text-muted-foreground hover:text-destructive flex items-center gap-1.5 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/90 backdrop-blur-md p-6 space-y-4 shadow-xs">
            <h3 className="font-bold text-lg text-foreground pb-3 border-b border-border/40">Order Summary</h3>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-bold text-foreground">{formatPrice(subtotal)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Shipping and taxes are calculated during guest checkout.</p>
            <Link to="/checkout-guest" className="hidden lg:block">
              <Button className="w-full h-12 rounded-2xl font-bold uppercase tracking-wider text-xs gap-2 shadow-xs">
                Checkout as Guest · {formatPrice(subtotal)} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <StickyActionBar>
        <Link to="/checkout-guest" className="block">
          <motion.span whileTap={{ scale: 0.98 }} className="w-full bg-primary text-primary-foreground font-bold text-sm py-3.5 flex items-center justify-center gap-2 rounded-2xl shadow-xs">
            Checkout as Guest · {formatPrice(subtotal)} <ArrowRight className="w-4 h-4" />
          </motion.span>
        </Link>
      </StickyActionBar>
    </div>
  );
};
// code:4ce0
