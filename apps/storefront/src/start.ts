import { createStart, createMiddleware, createCsrfMiddleware } from "@orizino/shared/lib/server-fn-compat";

/**
 * Ported from apps/storefront/middleware.ts (Next.js).
 * Refreshes the Supabase auth session cookie on every request, same as the
 * Next.js middleware did via createServerClient(...).auth.getUser().
 */
// Scoped to actual server-function RPC calls only. createCsrfMiddleware()
// with no `filter` runs its Origin/Referer check on every request this
// global `requestMiddleware` sees — including plain SSR page navigations,
// which normally carry no Origin header at all. That rejected every page
// load with a bare 403 "Forbidden" once requests actually started reaching
// the server (i.e. once the deploy config/build issues were fixed). Server
// functions are same-origin RPC endpoints that need CSRF protection; a
// full-page SSR render is not one, so we exclude it here, matching the
// documented pattern: https://tanstack.com/start/latest/docs/framework/react/guide/middleware
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

const supabaseSessionMiddleware = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url);
  const isStaticAsset = /\.(?:svg|png|jpe?g|gif|webp|ico|woff2?|ttf|otf|css|js)$/.test(
    url.pathname
  );

  if (!isStaticAsset) {
    const { getSupabaseServerClient } = await import("./lib/supabase-server");
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
