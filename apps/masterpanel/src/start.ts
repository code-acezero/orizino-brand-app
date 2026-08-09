import { createStart, createMiddleware, createCsrfMiddleware } from "@orizino/shared/lib/server-fn-compat";
import { getSupabaseServerClient } from "./lib/supabase-server";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

/**
 * Ported from apps/masterpanel/proxy.ts (Next.js middleware).
 * Route-level auth redirects are handled via beforeLoad in each section
 * layout route (src/routes/_admin.tsx etc.) rather than here, because
 * TanStack Start's global request middleware has known limitations with
 * short-circuit redirects. The session cookie is still refreshed here on
 * every non-asset request so tokens stay valid throughout a session.
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

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, supabaseSessionMiddleware],
  functionMiddleware: [attachSupabaseAuth],
}));
// code:4ce0
