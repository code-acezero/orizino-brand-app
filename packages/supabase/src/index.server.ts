// Server-only entry point ("@orizino/supabase/server"). Only import this
// from server-only code (e.g. inside a `.functions.ts` server function's
// `.middleware([...])` array), never from client components or from the
// client-safe barrel at "./index.ts" / "@orizino/supabase".
export { requireSupabaseAuth } from "./auth-middleware";
// code:4ce0
