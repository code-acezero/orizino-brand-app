"use client";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resolve the public company site URL used when generating shareable
 * links (public employee identity QR codes, print sheets, share menus).
 *
 * Priority:
 *  1. site_settings.public_site_url
 *  2. site_settings.site_url
 *  3. site_settings.company_domain
 *  4. window.location.origin (dev/preview fallback)
 */
export function normalizeOrigin(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = String(raw).trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

export function useCompanyOrigin(): string {
  const { data } = useQuery({
    queryKey: ["company-origin-settings"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["public_site_url", "site_url", "company_domain"]);
      const map: Record<string, string | null> = {};
      (data ?? []).forEach((row: any) => {
        const v = row.value;
        const raw =
          typeof v === "object" && v !== null
            ? (v.value ?? v.url ?? v.href ?? null)
            : v;
        map[row.key] = normalizeOrigin(typeof raw === "string" ? raw : null);
      });
      return (
        map.public_site_url ||
        map.site_url ||
        map.company_domain ||
        null
      );
    },
  });
  if (data) return data;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

/** Build a canonical public identity URL like `${origin}/id/${slug}`. */
export function buildIdentityUrl(origin: string, slug: string, source?: "qr" | "nfc" | "share") {
  const base = `${origin.replace(/\/+$/, "")}/id/${encodeURIComponent(slug)}`;
  return source ? `${base}?src=${source}` : base;
}
