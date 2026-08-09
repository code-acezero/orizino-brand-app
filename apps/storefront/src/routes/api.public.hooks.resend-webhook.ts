import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@orizino/shared/lib/router-compat";

export const Route = createFileRoute("/api/public/hooks/resend-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const secret = process.env.RESEND_WEBHOOK_SECRET;
        if (secret) {
          const svixId = request.headers.get("svix-id") || request.headers.get("webhook-id") || "";
          const svixTs = request.headers.get("svix-timestamp") || request.headers.get("webhook-timestamp") || "";
          const svixSig = request.headers.get("svix-signature") || request.headers.get("webhook-signature") || "";
          if (!svixId || !svixTs || !svixSig) {
            return new Response("missing signature headers", { status: 401 });
          }
          try {
            // Svix secrets are prefixed with "whsec_" and the remainder is base64-encoded raw key.
            const rawSecret = secret.startsWith("whsec_")
              ? Buffer.from(secret.slice(6), "base64")
              : Buffer.from(secret);
            const signedContent = `${svixId}.${svixTs}.${body}`;
            const expected = createHmac("sha256", rawSecret).update(signedContent).digest("base64");
            // Header format: "v1,<sig> v1,<sig2> ..."
            const provided = svixSig
              .split(" ")
              .map((s) => s.trim())
              .filter((s) => s.startsWith("v1,"))
              .map((s) => s.slice(3));
            const expBuf = Buffer.from(expected);
            const ok = provided.some((p) => {
              const pBuf = Buffer.from(p);
              return pBuf.length === expBuf.length && timingSafeEqual(pBuf, expBuf);
            });
            if (!ok) {
              return new Response("invalid signature", { status: 401 });
            }
          } catch {
            return new Response("invalid signature", { status: 401 });
          }
        }
        const payload = JSON.parse(body) as {
          type?: string;
          data?: { email_id?: string; to?: string[]; created_at?: string };
        };
        const SUPABASE_URL = process.env.SUPABASE_URL!;
        const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY)!;
        const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const event = payload.type;
        const messageId = payload.data?.email_id;
        const recipient = payload.data?.to?.[0]?.toLowerCase();
        if (!messageId && !recipient) return Response.json({ ok: true });
        const now = new Date().toISOString();
        const mapStatus: Record<string, string> = {
          "email.sent": "sent",
          "email.delivered": "delivered",
          "email.opened": "opened",
          "email.clicked": "clicked",
          "email.bounced": "bounced",
          "email.complained": "bounced",
          "email.delivery_delayed": "sent",
        };
        const newStatus = event ? mapStatus[event] : undefined;
        const update: Record<string, string> = {};
        if (newStatus) update.status = newStatus;
        if (event === "email.delivered") update.delivered_at = now;
        if (event === "email.opened") update.opened_at = now;
        if (event === "email.clicked") update.clicked_at = now;
        if (event === "email.bounced" || event === "email.complained") update.bounced_at = now;
        if (Object.keys(update).length === 0) return Response.json({ ok: true });
        const query = admin.from("email_campaign_recipients").update(update);
        const { data: updated } = messageId
          ? await query.eq("provider_message_id", messageId).select("campaign_id, email")
          : await query.eq("email", recipient!).select("campaign_id, email");
        if (updated && updated.length > 0) {
          const counterField =
            event === "email.opened"
              ? "opened_count"
              : event === "email.clicked"
              ? "clicked_count"
              : event === "email.delivered"
              ? "delivered_count"
              : event === "email.bounced" || event === "email.complained"
              ? "bounced_count"
              : null;
          if (counterField) {
            const campaignIds = [...new Set(updated.map((r: any) => r.campaign_id))];
            for (const cid of campaignIds) {
              await admin
                .rpc("increment_campaign_counter", { _campaign_id: cid, _field: counterField })
                .then(() => {}, () => {});
            }
          }
          if (event === "email.bounced" || event === "email.complained") {
            for (const row of updated as any[]) {
              await admin
                .from("email_suppressions")
                .upsert(
                  { email: row.email, reason: event === "email.complained" ? "complaint" : "bounce" },
                  { onConflict: "email" }
                );
            }
          }
        }
        return Response.json({ ok: true });
      },
    },
  },
});
// code:4ce0
