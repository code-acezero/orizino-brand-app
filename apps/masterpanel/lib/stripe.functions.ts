"use server";

import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Stripe minimum charge amounts (in major units) — keeps validation simple.
// Currencies that use no decimals (JPY, KRW, etc.). Stripe expects the
// amount in the smallest currency unit; for zero-decimal currencies that's
// the integer amount itself.
const ZERO_DECIMAL = new Set([
  "bif","clp","djf","gnf","jpy","kmf","krw","mga","pyg","rwf","ugx","vnd","vuv","xaf","xof","xpf",
]);

function toStripeAmount(amountMajor: number, currency: string): number {
  const cur = currency.toLowerCase();
  if (ZERO_DECIMAL.has(cur)) return Math.round(amountMajor);
  return Math.round(amountMajor * 100);
}


async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" as any });
  if (!data) throw new Error("Forbidden: admins only");
}

/** Test Stripe connection by calling /v1/account with the configured STRIPE_SECRET_KEY. */
export const testStripeConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return {
        ok: false,
        configured: false,
        message: "STRIPE_SECRET_KEY is not configured. Add it from the control panel.",
      };
    }

    const mode = key.startsWith("sk_live_") ? "live" : key.startsWith("sk_test_") ? "test" : "unknown";

    try {
      const res = await fetch("https://api.stripe.com/v1/account", {
        headers: { Authorization: `Bearer ${key}` },
      });
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          ok: false,
          configured: true,
          mode,
          message: data?.error?.message || `Stripe responded with ${res.status}`,
        };
      }
      return {
        ok: true,
        configured: true,
        mode,
        account_id: data.id,
        business_name: data.business_profile?.name || data.settings?.dashboard?.display_name || null,
        country: data.country,
        email: data.email,
        charges_enabled: data.charges_enabled,
        payouts_enabled: data.payouts_enabled,
        default_currency: data.default_currency,
      };
    } catch (err: any) {
      return {
        ok: false,
        configured: true,
        mode,
        message: `Network error: ${err?.message || String(err)}`,
      };
    }
  });

/**
 * Create (or update) a Stripe PaymentIntent for the current cart.
 * Returns clientSecret + publishable key so the browser can mount Stripe Elements.
 *
 * Idempotent on the client side: re-call with the same paymentIntentId to update
 * the amount (e.g. when shipping/discounts change before confirmation).
 */
export const createStripePaymentIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      amount: z.number().positive().max(1_000_000),
      currency: z.string().min(3).max(8).default("usd"),
      paymentIntentId: z.string().optional(),
      description: z.string().max(500).optional(),
      metadata: z.record(z.string(), z.string()).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) throw new Error("Stripe is not configured. Admin must add STRIPE_SECRET_KEY.");

    // Resolve publishable key from site_settings so the admin UI is the source of truth.
    const { supabase } = context;
    const { data: cfg } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "payment_gateways_config")
      .maybeSingle();
    const stripeCfg = (cfg?.value as any)?.stripe || {};
    const publishableKey: string = stripeCfg.publishable_key || "";
    if (!publishableKey) {
      throw new Error("Stripe publishable key is not set. Configure it in Payment Gateways → Stripe.");
    }
    if (!stripeCfg.enabled) {
      throw new Error("Stripe is disabled in the admin control center.");
    }

    const currency = data.currency.toLowerCase();
    const amount = toStripeAmount(data.amount, currency);
    if (amount < 1) throw new Error("Amount too small for Stripe.");

    const body = new URLSearchParams();
    body.set("amount", String(amount));
    body.set("currency", currency);
    body.set("automatic_payment_methods[enabled]", "true");
    if (data.description) body.set("description", data.description);
    body.set("metadata[user_id]", userId);
    if (data.metadata) {
      for (const [k, v] of Object.entries(data.metadata)) body.set(`metadata[${k}]`, v);
    }

    const url = data.paymentIntentId
      ? `https://api.stripe.com/v1/payment_intents/${data.paymentIntentId}`
      : "https://api.stripe.com/v1/payment_intents";

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const pi: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(pi?.error?.message || `Stripe error ${res.status}`);
    }

    return {
      paymentIntentId: pi.id as string,
      clientSecret: pi.client_secret as string,
      publishableKey,
      amount,
      currency,
      mode: secret.startsWith("sk_live_") ? "live" : "test",
    };
  });
// code:4ce0
