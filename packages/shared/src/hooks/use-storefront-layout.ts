"use client";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@orizino/supabase/client";

export type StorefrontLayoutId =
  | "hero-2col"
  | "bento"
  | "card-grid"
  | "hero-grid"
  | "magazine"
  | "instagram"
  | "scroll-feed";

export const STOREFRONT_LAYOUTS: { id: StorefrontLayoutId; name: string; description: string }[] = [
  { id: "hero-2col",   name: "Hero + 2-Column",   description: "Big hero, 2-column product tiles below (default)" },
  { id: "bento",       name: "Bento Grid",        description: "Mixed-size featured tiles" },
  { id: "card-grid",   name: "Card Grid",         description: "Uniform 3–4 column cards" },
  { id: "hero-grid",   name: "Hero + Grid",       description: "Hero banner + 3-col responsive grid" },
  { id: "magazine",    name: "Magazine",          description: "Featured story + sidebar grid" },
  { id: "instagram",   name: "Instagram",         description: "Tight square tiles, 3-wide" },
  { id: "scroll-feed", name: "Scroll Feed",       description: "Single-column infinite feed" },
];

export const DEFAULT_STOREFRONT_LAYOUT: StorefrontLayoutId = "hero-2col";

export function useStorefrontLayout() {
  return useQuery({
    queryKey: ["storefront-layout"],
    queryFn: async (): Promise<StorefrontLayoutId> => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "storefront_layout")
        .maybeSingle();
      if (error) return DEFAULT_STOREFRONT_LAYOUT;
      const raw = (data?.value as any)?.value ?? (data?.value as any)?.id ?? data?.value;
      const id = typeof raw === "string" ? raw : raw?.id;
      return (STOREFRONT_LAYOUTS.find((l) => l.id === id)?.id) ?? DEFAULT_STOREFRONT_LAYOUT;
    },
    staleTime: 60 * 1000,
  });
}
// code:4ce0
