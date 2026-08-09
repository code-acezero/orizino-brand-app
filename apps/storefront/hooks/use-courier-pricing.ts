"use client";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CourierProvider = "pathao" | "steadfast";
export type ZoneType = "inside_city" | "sub_city" | "outside_city";

export interface PricingRule {
  id: string;
  provider: string;
  zone_type: string;
  weight_max: number;
  base_fee: number;
  per_kg_fee: number;
  hub_pickup_discount: number;
}

export interface CourierHub {
  id: string;
  provider: string;
  hub_name: string;
  address: string;
  city: string;
  area: string | null;
  contact_phone: string | null;
}

export const usePricingRules = () =>
  useQuery({
    queryKey: ["courier_pricing_rules"],
    queryFn: async () => {
      const { data } = await supabase.from("courier_pricing_rules" as any).select("*").eq("is_active", true);
      return (data || []) as unknown as PricingRule[];
    },
    staleTime: 15 * 60 * 1000,
  });

export const useCourierHubs = (provider?: CourierProvider) =>
  useQuery({
    queryKey: ["courier_hubs", provider],
    queryFn: async () => {
      let q = supabase.from("courier_hubs" as any).select("*").eq("is_active", true);
      if (provider) q = q.eq("provider", provider);
      const { data } = await q;
      return (data || []) as unknown as CourierHub[];
    },
    staleTime: 15 * 60 * 1000,
  });

/** Detect zone type given a city (simple heuristic: Dhaka=inside, near Dhaka=sub, else outside). */
export const detectZoneType = (city: string): ZoneType => {
  const c = (city || "").toLowerCase().trim();
  if (c === "dhaka") return "inside_city";
  if (["narayanganj", "gazipur", "savar", "keraniganj"].includes(c)) return "sub_city";
  return "outside_city";
};

export const calculateShippingFee = (
  rules: PricingRule[],
  provider: CourierProvider,
  zoneType: ZoneType,
  weight: number = 1,
  hubPickup: boolean = false
): number => {
  const rule = rules.find((r) => r.provider === provider && r.zone_type === zoneType);
  if (!rule) return 0;
  const extraWeight = Math.max(0, weight - rule.weight_max);
  const fee = Number(rule.base_fee) + extraWeight * Number(rule.per_kg_fee);
  return Math.max(0, fee - (hubPickup ? Number(rule.hub_pickup_discount) : 0));
};
