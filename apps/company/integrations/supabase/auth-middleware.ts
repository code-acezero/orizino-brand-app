// Re-export from @orizino/supabase package. Server-only — must come from
// the "/server" export, not the bare package specifier (which is
// client-safe and must not carry @tanstack/react-start/server code).
export { requireSupabaseAuth } from "@orizino/supabase/server";
