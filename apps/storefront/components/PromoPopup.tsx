"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/lib/app-toast";

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
}

const PromoPopup: React.FC = () => {
  const { user } = useAuth();
  const [activePromo, setActivePromo] = useState<EligiblePromo | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch active promos
  const { data: promos } = useQuery({
    queryKey: ["user-eligible-promos", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_promos")
        .select("*")
        .eq("is_active", true);
      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  // Fetch user's claimed/dismissed promos
  const { data: claims } = useQuery({
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

  // Fetch user stats for eligibility checking
  const { data: userStats } = useQuery({
    queryKey: ["user-promo-stats", user?.id],
    queryFn: async () => {
      if (!user) return null;
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

  // Determine eligible promo to show
  useEffect(() => {
    if (!promos || !claims || !userStats || !user) return;

    const dismissedIds = new Set(claims.filter((c) => c.dismissed || c.is_used).map((c) => c.promo_id));

    for (const promo of promos) {
      if (dismissedIds.has(promo.id)) continue;

      // Check condition
      const cond = (promo as any).condition_value || {};
      let eligible = false;

      switch ((promo as any).condition_type) {
        case "first_time_buyer":
          eligible = userStats.orderCount === 0;
          break;
        case "order_count":
          eligible = userStats.orderCount >= (cond.min_orders || 0);
          break;
        case "total_spent":
        case "premium_buyer":
          eligible = userStats.totalSpent >= (cond.min_total_spent || 0);
          break;
        case "review_count":
          eligible = userStats.reviewCount >= (cond.min_reviews || 0);
          break;
        case "most_visited":
          // For page views we check session storage count
          const views = parseInt(sessionStorage.getItem("page_view_count") || "0");
          eligible = views >= (cond.min_views || 0);
          break;
        case "manual":
          const targetIds: string[] = (promo as any).target_user_ids || [];
          eligible = targetIds.length === 0 || targetIds.includes(user.id);
          break;
        default:
          eligible = true;
      }

      if (eligible) {
        setActivePromo(promo as any);
        break;
      }
    }
  }, [promos, claims, userStats, user]);

  const handleDismiss = async () => {
    if (!user || !activePromo) return;
    // Record dismissal
    await supabase.from("user_promo_claims").upsert({
      promo_id: activePromo.id,
      user_id: user.id,
      dismissed: true,
    }, { onConflict: "promo_id,user_id" });
    setActivePromo(null);
  };

  const handleCopy = async () => {
    if (!activePromo) return;
    await navigator.clipboard.writeText(activePromo.coupon_code);
    setCopied(true);
    toast.success(`Code ${activePromo.coupon_code} copied!`);

    // Record claim
    if (user) {
      await supabase.from("user_promo_claims").upsert({
        promo_id: activePromo.id,
        user_id: user.id,
        claimed_at: new Date().toISOString(),
      }, { onConflict: "promo_id,user_id" });
    }

    setTimeout(() => setCopied(false), 2000);
  };

  if (!activePromo) return null;

  const bgColor = activePromo.popup_bg_color || "hsl(var(--card))";
  const textColor = activePromo.popup_text_color || "hsl(var(--card-foreground))";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
        onClick={handleDismiss}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          style={{ background: bgColor, color: textColor }}
        >
          <button
            onClick={handleDismiss}
            aria-label="Close"
            className="absolute top-2.5 right-2.5 z-20 w-9 h-9 rounded-full bg-black/55 hover:bg-black/75 backdrop-blur-md flex items-center justify-center shadow-lg ring-1 ring-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-white" strokeWidth={2.5} />
          </button>

          <div className="overflow-y-auto overscroll-contain">
            {activePromo.popup_image_url && (
              <div className="w-full h-36 overflow-hidden flex-shrink-0">
                <img src={activePromo.popup_image_url} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="p-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto">
                <Gift className="w-7 h-7" />
              </div>

              <h3 className="text-xl font-bold font-display">
                {activePromo.popup_title || activePromo.title}
              </h3>

              {activePromo.popup_message && (
                <p className="text-sm opacity-80">{activePromo.popup_message}</p>
              )}

              <div className="space-y-2">
                <p className="text-xs opacity-60">Your exclusive code</p>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl px-5 py-3 font-mono text-lg font-bold tracking-wider transition-colors"
                >
                  {activePromo.coupon_code}
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4 opacity-60" />}
                </button>
              </div>

              <p className="text-xs opacity-50">
                {activePromo.discount_type === "percentage"
                  ? `${activePromo.discount_value}% off`
                  : `৳${activePromo.discount_value} off`}
                {" · Tap code to copy"}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PromoPopup;
// code:4ce0
