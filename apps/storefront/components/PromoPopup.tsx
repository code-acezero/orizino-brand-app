"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Copy, Check, ShoppingBag, ArrowRight, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/lib/app-toast";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isRouteMatched } from "./HomePopup";

interface EligiblePromo {
  id: string;
  title: string;
  coupon_code: string;
  discount_type: string;
  discount_value: number;
  popup_title: string;
  popup_message: string;
  popup_image_url: string;
  popup_bg_color: string;
  popup_text_color: string;
  min_order_amount?: number;
  target_routes?: string[];
}

const LOCAL_DISMISSED_KEY = "orizino_dismissed_promos";

const PromoPopup: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  const [activePromo, setActivePromo] = useState<EligiblePromo | null>(null);
  const [copied, setCopied] = useState(false);
  const [minimized, setMinimized] = useState(false);

  // Fetch active promos for all visitors (guests and authenticated users)
  const { data: promos = [] } = useQuery({
    queryKey: ["user-eligible-promos", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_promos")
        .select("*")
        .eq("is_active", true);
      if (error) return [];
      return data || [];
    },
    staleTime: 5 * 60_000,
  });

  // Fetch user's claimed/dismissed promos if authenticated
  const { data: userClaims = [] } = useQuery({
    queryKey: ["user-promo-claims", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_promo_claims")
        .select("promo_id, dismissed, is_used")
        .eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch user stats for targeting
  const { data: userStats } = useQuery({
    queryKey: ["user-promo-stats", user?.id],
    queryFn: async () => {
      if (!user) return { orderCount: 0, totalSpent: 0, reviewCount: 0 };
      const [ordersRes, reviewsRes] = await Promise.all([
        supabase.from("orders").select("id, total").eq("user_id", user.id),
        supabase.from("reviews").select("id").eq("user_id", user.id).eq("is_approved", true),
      ]);
      const orders = ordersRes.data || [];
      const reviews = reviewsRes.data || [];
      return {
        orderCount: orders.length,
        totalSpent: orders.reduce((s, o) => s + Number(o.total), 0),
        reviewCount: reviews.length,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  // Check eligibility and select best active promo
  useEffect(() => {
    // Reset active promo when navigating
    setActivePromo(null);

    if (!promos || promos.length === 0) return;

    let dismissedIds = new Set<string>();

    // Check local storage for guest dismissals
    try {
      const localDismissed = JSON.parse(sessionStorage.getItem(LOCAL_DISMISSED_KEY) || "[]");
      dismissedIds = new Set([...dismissedIds, ...localDismissed]);
    } catch {}

    // Check database for user claims
    if (user && userClaims) {
      userClaims
        .filter((c) => c.dismissed || c.is_used)
        .forEach((c) => dismissedIds.add(c.promo_id));
    }

    for (const promo of promos) {
      if (dismissedIds.has(promo.id)) continue;

      // Check if current route matches promo target routes (default to "/" home page only)
      if (!isRouteMatched(pathname, (promo as any).target_routes)) {
        continue;
      }

      const cond = (promo as any).condition_value || {};
      let eligible = false;
      const stats = userStats || { orderCount: 0, totalSpent: 0, reviewCount: 0 };

      switch ((promo as any).condition_type) {
        case "first_time_buyer":
          eligible = !user || stats.orderCount === 0;
          break;
        case "order_count":
          eligible = !!user && stats.orderCount >= (cond.min_orders || 0);
          break;
        case "total_spent":
        case "premium_buyer":
          eligible = !!user && stats.totalSpent >= (cond.min_total_spent || 0);
          break;
        case "review_count":
          eligible = !!user && stats.reviewCount >= (cond.min_reviews || 0);
          break;
        case "most_visited":
          const views = parseInt(sessionStorage.getItem("page_view_count") || "1");
          eligible = views >= (cond.min_views || 1);
          break;
        case "manual":
          const targetIds: string[] = (promo as any).target_user_ids || [];
          eligible = !!user && (targetIds.length === 0 || targetIds.includes(user.id));
          break;
        default:
          eligible = true;
      }

      if (eligible) {
        // Delay popup slightly for a smooth, natural first impression
        const timer = setTimeout(() => {
          setActivePromo(promo as any);
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [promos, userClaims, userStats, user, pathname]);

  const handleDismiss = async () => {
    if (!activePromo) return;

    // Save to session storage
    try {
      const localDismissed = JSON.parse(sessionStorage.getItem(LOCAL_DISMISSED_KEY) || "[]");
      if (!localDismissed.includes(activePromo.id)) {
        sessionStorage.setItem(LOCAL_DISMISSED_KEY, JSON.stringify([...localDismissed, activePromo.id]));
      }
    } catch {}

    // Save to database if logged in
    if (user) {
      await supabase.from("user_promo_claims").upsert(
        {
          promo_id: activePromo.id,
          user_id: user.id,
          dismissed: true,
        },
        { onConflict: "promo_id,user_id" }
      );
    }

    setMinimized(true);
  };

  const handleCopyAndApply = async () => {
    if (!activePromo) return;

    await navigator.clipboard.writeText(activePromo.coupon_code);
    setCopied(true);

    // Auto-save to localStorage/sessionStorage so checkout can auto-fill
    try {
      localStorage.setItem("orizino_applied_coupon", activePromo.coupon_code);
      sessionStorage.setItem("orizino_applied_coupon", activePromo.coupon_code);
      window.dispatchEvent(new CustomEvent("coupon-applied", { detail: activePromo.coupon_code }));
    } catch {}

    toast.success(`Code ${activePromo.coupon_code} copied & applied!`);

    if (user) {
      await supabase.from("user_promo_claims").upsert(
        {
          promo_id: activePromo.id,
          user_id: user.id,
          claimed_at: new Date().toISOString(),
        },
        { onConflict: "promo_id,user_id" }
      );
    }

    setTimeout(() => {
      setCopied(false);
      setMinimized(true);
    }, 1500);
  };

  if (!activePromo) return null;

  const bgColor = activePromo.popup_bg_color || "#121214";
  const textColor = activePromo.popup_text_color || "#FFFFFF";

  return (
    <>
      {/* ── Main High-Fidelity Announcement Modal ── */}
      <AnimatePresence>
        {!minimized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/65 backdrop-blur-md flex items-center justify-center p-4"
            onClick={handleDismiss}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 24 }}
              transition={{ type: "spring", damping: 28, stiffness: 380 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-[28px] overflow-hidden shadow-2xl border border-white/15 flex flex-col backdrop-blur-xl"
              style={{
                backgroundColor: bgColor,
                color: textColor,
              }}
            >
              {/* Top Close Button */}
              <button
                onClick={handleDismiss}
                aria-label="Close"
                className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white transition-all ring-1 ring-white/10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Optional Header Image Banner */}
              {activePromo.popup_image_url ? (
                <div className="w-full h-36 relative overflow-hidden bg-black/20">
                  <img
                    src={activePromo.popup_image_url}
                    alt={activePromo.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </div>
              ) : (
                <div className="pt-6 pb-2 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center mx-auto text-primary shadow-inner">
                    <Gift className="w-6 h-6" />
                  </div>
                </div>
              )}

              {/* Body Content */}
              <div className="p-6 pt-3 text-center space-y-4">
                {/* Title & Tagline */}
                <div className="space-y-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15">
                    <Gift className="w-3 h-3 text-primary" />
                    <span>Exclusive Voucher</span>
                  </span>

                  <h3 className="text-xl font-extrabold tracking-tight leading-snug">
                    {activePromo.popup_title || activePromo.title}
                  </h3>

                  {activePromo.popup_message && (
                    <p className="text-xs opacity-80 leading-relaxed max-w-xs mx-auto">
                      {activePromo.popup_message}
                    </p>
                  )}
                </div>

                {/* Perforated Luxury Voucher Ticket Card */}
                <div className="relative rounded-2xl bg-white/[0.08] border border-white/15 p-4 shadow-lg overflow-hidden backdrop-blur-sm">
                  {/* Left & Right Notches */}
                  <div className="absolute top-1/2 -left-2.5 -translate-y-1/2 w-5 h-5 rounded-full bg-black/80 border border-white/15" />
                  <div className="absolute top-1/2 -right-2.5 -translate-y-1/2 w-5 h-5 rounded-full bg-black/80 border border-white/15" />

                  <div className="flex items-center justify-between gap-2 px-2">
                    <div className="text-left space-y-0.5">
                      <span className="text-[10px] uppercase font-mono tracking-wider opacity-60 block">
                        Promo Code
                      </span>
                      <span className="font-mono font-black text-lg tracking-wider block">
                        {activePromo.coupon_code}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-primary text-primary-foreground shadow-sm inline-block">
                        {activePromo.discount_type === "percentage"
                          ? `${activePromo.discount_value}% OFF`
                          : `৳${activePromo.discount_value} OFF`}
                      </span>
                      {activePromo.min_order_amount ? (
                        <span className="text-[9px] opacity-60 block mt-0.5 font-mono">
                          Min ৳{activePromo.min_order_amount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Primary CTA Button */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleCopyAndApply}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-200 bg-white text-zinc-950 hover:bg-white/90 shadow-xl flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Code Applied to Cart!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy & Apply Code</span>
                      </>
                    )}
                  </button>

                  <Link
                    href="/products"
                    onClick={() => setMinimized(true)}
                    className="inline-flex items-center justify-center gap-1.5 text-xs opacity-70 hover:opacity-100 transition-opacity pt-1"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Browse Collection</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Minimized Floating Luxury Pill (Bottom Left) ── */}
      <AnimatePresence>
        {minimized && activePromo && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            className="fixed bottom-5 left-5 z-[70] max-w-sm"
          >
            <div className="flex items-center gap-2.5 p-2 pr-3 rounded-full bg-zinc-950/90 text-white border border-white/20 shadow-2xl backdrop-blur-xl ring-1 ring-black/40">
              <button
                onClick={() => setMinimized(false)}
                className="w-8 h-8 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center shrink-0 hover:scale-105 transition-transform"
                title="View Offer"
              >
                <Tag className="w-4 h-4" />
              </button>

              <div className="text-left cursor-pointer" onClick={() => setMinimized(false)}>
                <p className="text-xs font-bold leading-tight flex items-center gap-1.5">
                  <span>{activePromo.coupon_code}</span>
                  <span className="text-[10px] text-primary font-mono font-bold">
                    {activePromo.discount_type === "percentage"
                      ? `${activePromo.discount_value}% OFF`
                      : `৳${activePromo.discount_value} OFF`}
                  </span>
                </p>
                <p className="text-[10px] text-zinc-400 truncate max-w-[170px]">
                  Tap to apply at checkout
                </p>
              </div>

              <button
                onClick={handleCopyAndApply}
                className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors shrink-0"
              >
                {copied ? "Copied" : "Apply"}
              </button>

              <button
                onClick={() => setActivePromo(null)}
                className="w-5 h-5 rounded-full text-zinc-500 hover:text-white flex items-center justify-center"
                title="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PromoPopup;
