/**
 * Validates that a cron/hook POST comes from within the same project.
 * Ported from TanStack Start to Next.js — uses standard Request API.
 */
export function validateCronOrigin(request: Request): Response | null {
  const expected = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!expected) return null; // Can't validate — allow

  try {
    const expectedHost = new URL(expected).hostname;
    const referer = request.headers.get("referer") ?? request.headers.get("origin") ?? "";
    if (!referer) return null; // No referer — allow (internal calls)
    const refHost = new URL(referer).hostname;
    if (refHost === expectedHost || refHost === "localhost" || refHost === "127.0.0.1") return null;
    return new Response("forbidden: cross-origin cron", { status: 403 });
  } catch {
    return null; // Invalid URL — allow
  }
}
// code:4ce0
