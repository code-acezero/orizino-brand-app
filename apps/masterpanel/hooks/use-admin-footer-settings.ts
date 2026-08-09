"use client";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdminFooterLink {
  label: string;
  url: string;
}

export interface AdminFooterConfig {
  show_status: boolean;
  show_brand: boolean;
  show_version: boolean;
  show_env: boolean;
  show_language: boolean;
  show_docs: boolean;
  show_support: boolean;
  show_shortcuts: boolean;
  show_copyright: boolean;
  brand_label: string;
  version_label: string;
  copyright_text: string;
  docs_url: string;
  support_url: string;
  custom_links: AdminFooterLink[];
}

export const defaultAdminFooterConfig: AdminFooterConfig = {
  show_status: true,
  show_brand: true,
  show_version: true,
  show_env: true,
  show_language: true,
  show_docs: true,
  show_support: true,
  show_shortcuts: true,
  show_copyright: true,
  brand_label: "Orizino Admin",
  version_label: "v1.0.0",
  copyright_text: "",
  docs_url: "/page/docs",
  support_url: "/support",
  custom_links: [],
};

export function useAdminFooterSettings() {
  const { data } = useQuery({
    queryKey: ["admin-footer-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "admin_footer_config")
        .maybeSingle();
      return (data?.value as unknown as Partial<AdminFooterConfig>) || null;
    },
    staleTime: 30_000,
  });

  return { ...defaultAdminFooterConfig, ...(data || {}) } as AdminFooterConfig;
}
// code:4ce0
