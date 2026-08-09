"use client";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@orizino/supabase/client";
import { useAuth } from "../contexts/AuthContext";

export interface LoyaltyTier {
  id: string;
  name: string;
  slug: string;
  min_lifetime_spend: number;
  points_multiplier: number;
  discount_percentage: number;
  perks: string[];
  badge_color: string;
  badge_icon: string;
  sort_order: number;
}

export interface UserLoyalty {
  user_id: string;
  points_balance: number;
  lifetime_points: number;
  lifetime_spend: number;
  current_tier_id: string | null;
  total_orders: number;
  total_reviews: number;
  referral_code: string | null;
}

export const useLoyaltyTiers = () =>
  useQuery({
    queryKey: ["loyalty_tiers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("loyalty_tiers" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return (data || []) as unknown as LoyaltyTier[];
    },
    staleTime: 15 * 60 * 1000,
  });

export const useUserLoyalty = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user_loyalty", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("user_loyalty" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return (data as unknown) as UserLoyalty | null;
    },
    enabled: !!user,
  });
};

export const useLoyaltyTransactions = (limit = 20) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["loyalty_transactions", user?.id, limit],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("loyalty_transactions" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      return (data || []) as any[];
    },
    enabled: !!user,
  });
};

/** Compute next tier + progress for a UI bar. */
export const computeTierProgress = (
  loyalty: UserLoyalty | null | undefined,
  tiers: LoyaltyTier[] | undefined
) => {
  if (!tiers || tiers.length === 0) return null;
  const sorted = [...tiers].sort((a, b) => a.min_lifetime_spend - b.min_lifetime_spend);
  const spend = loyalty?.lifetime_spend || 0;
  let current = sorted[0];
  let next: LoyaltyTier | null = null;
  for (let i = 0; i < sorted.length; i++) {
    if (spend >= sorted[i].min_lifetime_spend) current = sorted[i];
    else { next = sorted[i]; break; }
  }
  const progress = next
    ? Math.min(100, ((spend - current.min_lifetime_spend) / (next.min_lifetime_spend - current.min_lifetime_spend)) * 100)
    : 100;
  const remaining = next ? Math.max(0, next.min_lifetime_spend - spend) : 0;
  return { current, next, progress, remaining };
};
// code:4ce0
