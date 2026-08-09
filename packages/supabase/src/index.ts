// This is the default, package-root import path and MUST stay client-safe:
// it must never re-export anything that imports @tanstack/react-start/server
// (directly or transitively), since that pulls the whole SSR chain — down to
// Node's `node:stream` — into any client bundle that imports this module.
// `requireSupabaseAuth` (server-only, uses getCookies from
// @tanstack/react-start/server) lives in `./index.server.ts` / the
// "@orizino/supabase/server" export instead. See the storefront Netlify
// build fix for the exact failure mode this avoids:
//   "Readable" is not exported by "__vite-browser-external"
export { supabase } from "./client";
export type { Database } from "./types";
export * from "./auth-attacher";
// code:4ce0
