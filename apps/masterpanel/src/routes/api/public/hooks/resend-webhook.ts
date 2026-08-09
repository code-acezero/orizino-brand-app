// Resend webhook receiver. Verifies the Svix-signed request, then updates
// email_campaign_recipients tracking columns and logs the raw event.
//
// Configure in Resend → Webhooks:
//   Endpoint: <site>/api/public/hooks/resend-webhook
//   Signing secret: copy the whsec_... value and save it as
//     RESEND_WEBHOOK_SECRET in Netlify site env AND Supabase Edge Function secrets.

import { createFileRoute } from "@orizino/shared/lib/router-compat";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/hooks/resend-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.RESEND_WEBHOOK_SECRET;
        const body = await request.text();

        // Signature verification (Svix format used by Resend)
        if (secret) {
          const svixId = request.headers.get("svix-id") ?? "";
          const svixTs = request.headers.get("svix-timestamp") ?? "";
          const svixSig = request.headers.get("svix-signature") ?? "";
          if (!svixId || !svixTs || !svixSig) {
            return new Response("Missing signature headers", { status: 401 });
          }
          const rawSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
          let keyBuf: Buffer;
          try {
            keyBuf = Buffer.from(rawSecret, "base64");
          } catch {
            return new Response("Bad secret", { status: 500 });
          }
          const signed = `${svixId}.${svixTs}.${body}`;
          const expected = createHmac("sha256", keyBuf).update(signed).digest("base64");
          const provided = svixSig
            .split(" ")
            .map((p) => p.split(",")[1])
            .filter(Boolean);
          const ok = provided.some((sig) => {
            try {
              const a = Buffer.from(sig, "base64");
              const b = Buffer.from(expected, "base64");
              return a.length === b.length && timingSafeEqual(a, b);
            } catch {
              return false;
            }
          });
          if (!ok) return new Response("Invalid signature", { status: 401 });
        }

        let payload: any;
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const sb: any = supabaseAdmin;

        const type: string = payload?.type ?? "";
        const data = payload?.data ?? {};
        const providerId: string | undefined = data?.email_id ?? data?.id;
        const to: string | undefined = Array.isArray(data?.to) ? data.to[0] : data?.to;
        const nowIso = new Date().toISOString();

        const patch: Record<string, string> = {};
        let status: string | null = null;
        switch (type) {
          case "email.sent":
            status = "sent";
            break;
          case "email.delivered":
            patch.delivered_at = nowIso;
            status = "delivered";
            break;
          case "email.opened":
            patch.opened_at = nowIso;
            break;
          case "email.clicked":
            patch.clicked_at = nowIso;
            break;
          case "email.bounced":
          case "email.hard_bounced":
            patch.bounced_at = nowIso;
            status = "bounced";
            break;
          case "email.complained":
            status = "complained";
            break;
        }

        if (providerId && (Object.keys(patch).length || status)) {
          try {
            const upd: Record<string, unknown> = { ...patch };
            if (status) upd.status = status;
            await sb.from("email_campaign_recipients").update(upd).eq("provider_id", providerId);
          } catch (e) {
            console.warn("[resend-webhook] recipient update failed", e);
          }
        }

        try {
          await sb.from("email_dispatch_log").insert({
            purpose: "webhook_event",
            event: type,
            recipient: to ?? "unknown",
            status: status === "bounced" || status === "complained" ? "failed" : "sent",
            provider_id: providerId ?? null,
            meta: payload,
          });
        } catch (e) {
          console.warn("[resend-webhook] log insert failed", e);
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
