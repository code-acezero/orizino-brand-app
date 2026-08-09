// auth-attacher.ts
//
// Client-side server-function middleware that attaches the current
// Supabase session's access token as an Authorization header on outgoing
// server function RPC calls. Pairs with requireSupabaseAuth (server side),
// which can read it via getRequestHeader("Authorization") if a handler
// needs the raw bearer token rather than just the cookie-derived session.
//
// Currently unused by any .functions.ts file (auth is established from
// request cookies via requireSupabaseAuth instead), but kept as a real,
// working middleware rather than a no-op stub.

import { createMiddleware } from "@orizino/shared/lib/server-fn-compat";
import { supabase } from "./client";

export const attachSupabaseAuth = createMiddleware().client(
  async ({ next }: any) => {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    return next({
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
  }
);
// code:4ce0
