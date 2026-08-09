import { createFileRoute } from "@orizino/shared/lib/router-compat";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Stripe webhook — verifies `Stripe-Signature`, then on
 * payment_intent.succeeded marks the linked order paid + fires customer
 * notifications. Public route so Stripe can reach it; auth is via HMAC.
 */
export const Route = createFileRoute("/api/public/hooks/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) return new Response("Webhook secret not configured", { status: 500 });

        const sigHeader = request.headers.get("stripe-signature") || "";
        const raw = await request.text();

        // Parse "t=<ts>,v1=<hex>,v1=<hex>,..."
        const parts = Object.fromEntries(
          sigHeader.split(",").map((p) => {
            const [k, ...rest] = p.split("=");
            return [k, rest.join("=")];
          }),
        ) as Record<string, string>;
        const t = parts["t"];
        const v1s = sigHeader
          .split(",")
          .filter((p) => p.startsWith("v1="))
          .map((p) => p.slice(3));
        if (!t || v1s.length === 0) {
          return new Response("Missing signature", { status: 400 });
        }

        const expected = createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
        const expBuf = Buffer.from(expected);
        const ok = v1s.some((v) => {
          const b = Buffer.from(v);
          return b.length === expBuf.length && timingSafeEqual(b, expBuf);
        });
        if (!ok) return new Response("Invalid signature", { status: 401 });

        // Optional: 5-minute freshness window
        const ageSec = Math.abs(Math.floor(Date.now() / 1000) - Number(t));
        if (!Number.isFinite(ageSec) || ageSec > 300) {
          return new Response("Stale signature", { status: 400 });
        }

        let event: any;
        try {
          event = JSON.parse(raw);
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }

        try {
          const { supabaseAdmin, hasSupabaseAdminCredentials } = await import(
            "@/integrations/supabase/client.server"
          );
          if (!hasSupabaseAdminCredentials()) {
            return new Response("Admin creds missing", { status: 500 });
          }
          const sb: any = supabaseAdmin;

          const type = event.type as string;
          const pi = event.data?.object ?? {};
          const orderId: string | undefined = pi.metadata?.order_id;

          if (type === "payment_intent.succeeded" && orderId) {
            await sb
              .from("orders")
              .update({ payment_status: "paid", status: "confirmed" })
              .eq("id", orderId);
            try {
              const { notifyNewOrder } = await import("@/lib/order-notifications.functions");
              await notifyNewOrder({ data: { order_id: orderId } });
            } catch (e) {
              console.warn("[stripe-webhook] notify failed", e);
            }
          } else if (
            (type === "payment_intent.payment_failed" || type === "payment_intent.canceled") &&
            orderId
          ) {
            await sb
              .from("orders")
              .update({ payment_status: "failed" })
              .eq("id", orderId);
          }
        } catch (e: any) {
          console.error("[stripe-webhook] handler error", e);
          return new Response(`Handler error: ${e?.message || "unknown"}`, { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
