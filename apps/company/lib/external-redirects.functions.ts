import { createServerFn } from "@/lib/server-fn-compat";

/**
 * Fetches site_settings.external_redirects using the public (anon) key —
 * no auth required, matching the "Public can view non-sensitive settings"
 * RLS policy. Called from the root route's `loader` (see routes/__root.tsx)
 * so the admin-configured Shop/Start Shopping/Explore Categories URLs are
 * already in cross-app-urls.ts's cache *before* any page component renders
 * — including the very first SSR pass, which is what actually matters here.
 * A client-only `useEffect` (the old approach) is always too late for that
 * first paint, since the HTML the browser receives is generated in Node.
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
