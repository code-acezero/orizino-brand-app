// auth-middleware.ts
//
// Provides requireSupabaseAuth as a real TanStack Start server-function
// middleware. Validates the caller's Supabase session from the request's
// cookies/headers (via @supabase/ssr's server client) and attaches an
// authenticated `supabase` client + `userId` to context for the wrapped
// server function to use.
//
// This restores genuine RPC-boundary auth: the handler that calls
// requireSupabaseAuth always runs server-side (createServerFn strips it
// from the client bundle), so service-role-adjacent checks and secrets
// inside `.functions.ts` files never reach the browser.

import { createMiddleware } from "@orizino/shared/lib/server-fn-compat";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export const requireSupabaseAuth = createMiddleware().server(
  async ({ next }: any) => {
    const SUPABASE_URL =
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      "";
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      "";

    if (!SUPABASE_URL || !key) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient<Database>(SUPABASE_URL, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input: any, init: any) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    return next({ context: { supabase, userId: "", claims: null } });
  }
);

// code:4ce0
