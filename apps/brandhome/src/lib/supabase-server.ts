import { getCookies, setCookie } from "@orizino/shared/lib/server-fn-compat";
import { createServerClient } from "@supabase/ssr";

/**
 * Server-side Supabase client wired into TanStack Start's request-scoped
 * cookie store. Mirrors the cookie bridging that @supabase/ssr expects from
 * Next.js middleware, but backed by TanStack Start's getCookies/setCookie.
 */
export function getSupabaseServerClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL ??
    process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY;

  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return Object.entries(getCookies()).map(([name, value]) => ({
            name,
            value,
          }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            setCookie(name, value, options as any);
          });
        },
      },
    }
  );
}
// code:4ce0
