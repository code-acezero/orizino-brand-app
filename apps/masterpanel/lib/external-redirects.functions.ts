"use server";

import { createServerFn } from "@/lib/server-fn-compat";

/**
 * Fetches site_settings.external_redirects using the public (anon) key —
 * matches the "Public can view non-sensitive settings" RLS policy, no auth
 * needed. Called from the root route's `loader` so cross-app-urls.ts's
 * cache is populated *before* any page renders (SSR pass included) — e.g.
 * the sidebar's "Open Order Ops" / "Back to Shop" links.
 */
export const getExternalRedirects = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const sb = createClient(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.from("site_settings").select("value").eq("key", "external_redirects").maybeSingle();
  if (error || !data) return null;
  const raw = data.value as any;
  return (raw && typeof raw === "object" && "value" in raw ? raw.value : raw) ?? null;
});
