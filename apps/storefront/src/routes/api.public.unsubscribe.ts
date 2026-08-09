import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@orizino/shared/lib/router-compat";

function htmlResponse(body: string, status = 200) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title></head><body style="background:#f6f7fb;padding:40px;text-align:center">${body}</body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export const Route = createFileRoute("/api/public/unsubscribe")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token");
        if (!token) return htmlResponse("Invalid unsubscribe link.", 400);
        const admin = createClient(
          process.env.SUPABASE_URL!,
          (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY)!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );
        const { data: sub } = await admin
          .from("email_subscriptions")
          .select("id, email")
          .eq("unsubscribe_token", token)
          .maybeSingle();
        if (!sub) return htmlResponse("Unsubscribe link not recognised.", 404);
        await admin
          .from("email_subscriptions")
          .update({ is_active: false, unsubscribed_at: new Date().toISOString() })
          .eq("id", sub.id);
        await admin
          .from("email_suppressions")
          .upsert({ email: (sub as any).email.toLowerCase(), reason: "unsubscribe" }, { onConflict: "email" });
        return htmlResponse(
          `<h1 style="font-family:system-ui;color:#111">You're unsubscribed.</h1><p style="font-family:system-ui;color:#444">${escapeHtml((sub as any).email)} will no longer receive emails from us.</p>`
        );
      },
    },
  },
});
// code:4ce0
