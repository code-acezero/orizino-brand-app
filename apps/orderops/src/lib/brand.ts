import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";

export interface BrandSettings {
  siteName: string;
  brandTagline: string;
  logoUrl: string;
  siteIconUrl: string;
  logoStyle: string;
}

export function useBrandSettings(): BrandSettings {
  const { data } = useQuery({
    queryKey: ["orderops-brand-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", [
          "site_name",
          "brand_name",
          "site_tagline",
          "site_description",
          "logo_url",
          "site_icon_url",
          "logo_display_style",
        ]);
      if (error) {
        console.warn("Could not fetch brand settings:", error.message);
        return {
          siteName: "Orizino",
          brandTagline: "Order Fulfillment & Verification Operations",
          logoUrl: "/orizino-logo.svg",
          siteIconUrl: "/orizino-logo.svg",
          logoStyle: "rounded",
        };
      }
      const map: Record<string, any> = {};
      data?.forEach((row) => {
        const val = row.value as any;
        map[row.key] = typeof val === "object" && val !== null ? (val.value ?? val) : val;
      });
      return {
        siteName: (map.brand_name || map.site_name || "Orizino") as string,
        brandTagline: (map.site_tagline || map.site_description || "Order Fulfillment & Verification Operations") as string,
        logoUrl: (map.logo_url || "/orizino-logo.svg") as string,
        siteIconUrl: (map.site_icon_url || "/orizino-logo.svg") as string,
        logoStyle: (map.logo_display_style || "rounded") as string,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    data || {
      siteName: "Orizino",
      brandTagline: "Order Fulfillment & Verification Operations",
      logoUrl: "/orizino-logo.svg",
      siteIconUrl: "/orizino-logo.svg",
      logoStyle: "rounded",
    }
  );
}
