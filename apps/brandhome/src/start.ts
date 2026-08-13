import { createStart, createMiddleware, createCsrfMiddleware } from "@orizino/shared/lib/server-fn-compat";
import { getSupabaseServerClient } from "./lib/supabase-server";

/**
 * Ported from apps/company/middleware.ts (Next.js).
 * Refreshes the Supabase auth session cookie on every request, same as the
 * Next.js middleware did via createServerClient(...).auth.getUser().
 */
// Scoped to actual server-function RPC calls only — see the storefront
// app's src/start.ts for the full explanation. Without this filter,
// createCsrfMiddleware() rejects every plain SSR page load with a bare
// 403 "Forbidden", since ordinary navigations carry no Origin header.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

const supabaseSessionMiddleware = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url);
  const isStaticAsset = /\.(?:svg|png|jpe?g|gif|webp|ico|woff2?|ttf|otf|css|js)$/.test(
    url.pathname
  );

  if (!isStaticAsset) {
    const supabase = getSupabaseServerClient();
    await supabase.auth.getUser();
  }

  return next();
});

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [csrfMiddleware, supabaseSessionMiddleware],
  };
});
// code:4ce0
