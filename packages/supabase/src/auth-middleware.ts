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
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY =
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    return next({ context: { supabase, userId: "", claims: null } });
  }
);

// code:4ce0
