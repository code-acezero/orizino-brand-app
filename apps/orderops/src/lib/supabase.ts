// Order Ops is a pure client SPA with no TanStack Start Vite plugin, so we
// import the "/client" and "/types" subpaths directly rather than the bare
// "@orizino/supabase" package. The bare entrypoint also re-exports
// auth-attacher.ts, which imports `createMiddleware` from
// "@tanstack/react-start" — fine inside TanStack Start's own build pipeline,
// but it drags Node's AsyncLocalStorage into a plain Vite SPA bundle and
// breaks the build. We don't use that middleware here anyway (no server
// functions to attach a bearer token to), so this sidesteps it entirely.
export { supabase } from "@orizino/supabase/client";
export type { Database } from "@orizino/supabase/types";
