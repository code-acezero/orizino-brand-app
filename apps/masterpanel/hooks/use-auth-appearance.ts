"use client";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuthAppearance {
  layout: "split" | "centered";
  show_brand_panel: boolean;
  headline_signin: string;
  headline_signup: string;
  headline_forgot: string;
  subheadline: string;
  welcome_kicker: string;
  testimonials: { quote: string; author: string }[];
  show_remember_me: boolean;
  show_robot_check: boolean;
  background_style: "gradient" | "solid" | "mesh";
  secured_label: string;
}

export const DEFAULT_AUTH_APPEARANCE: AuthAppearance = {
  layout: "split",
  show_brand_panel: true,
  headline_signin: "Step inside.\nThe drop awaits.",
  headline_signup: "Start something\nbeautiful.",
  headline_forgot: "We'll send you\na reset link.",
  subheadline: "Continue to your account.",
  welcome_kicker: "Welcome",
  testimonials: [
    { quote: "Crafted with care, delivered with grace.", author: "— The Atelier" },
    { quote: "Quiet luxury, loud confidence.", author: "— Editorial Vol. 04" },
    { quote: "Where craft meets curiosity.", author: "— Brand Manifesto" },
  ],
  show_remember_me: true,
  show_robot_check: true,
  background_style: "gradient",
  secured_label: "Secured by encrypted authentication",
};

export function useAuthAppearance() {
  const { data } = useQuery({
    queryKey: ["site-settings", "auth_appearance"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "auth_appearance")
        .maybeSingle();
      const v: any = data?.value;
      const raw = typeof v === "object" && v !== null && "value" in v ? (v as any).value : v;
      return { ...DEFAULT_AUTH_APPEARANCE, ...(raw || {}) } as AuthAppearance;
    },
    staleTime: 5 * 60 * 1000,
  });
  return data || DEFAULT_AUTH_APPEARANCE;
}
// code:4ce0
