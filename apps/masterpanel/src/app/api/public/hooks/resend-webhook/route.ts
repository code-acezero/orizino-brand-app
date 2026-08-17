import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * Verify Svix signature used by Resend Webhooks.
 */
function verifySvixSignature(payload: string, headers: Headers, secret?: string | null): boolean {
  if (!secret || !secret.trim()) return true; // If no secret configured, accept in permissive mode

  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return false;
  }

  // Check timestamp skew (within 5 minutes)
  const ts = parseInt(svixTimestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 300) {
    return false;
  }

  try {
    const rawSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    const secretBytes = Buffer.from(rawSecret, "base64");
    const toSign = `${svixId}.${svixTimestamp}.${payload}`;
    const expectedSig = crypto
      .createHmac("sha256", secretBytes)
      .update(toSign)
      .digest("base64");

    const signatures = svixSignature.split(" ");
    return signatures.some((sig) => {
      const parts = sig.split(",");
      if (parts.length < 2) return false;
      const [, signature] = parts;
      return signature === expectedSig;
    });
  } catch (err) {
    console.warn("[resend-webhook] Signature verification error:", err);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    if (!rawBody) {
      return NextResponse.json({ error: "Empty request body" }, { status: 400 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Load configured webhook secret from database if available
    let secret = process.env.RESEND_WEBHOOK_SECRET || null;
    if (!secret) {
      const { data: setting } = await (supabaseAdmin as any)
        .from("site_settings")
        .select("value")
        .eq("key", "email_provider")
        .maybeSingle();
      secret = setting?.value?.webhook_secret || "whsec_LRk0Vo32TaIiZag3bOSpuSMSZ17qOSj2";
    }

    // If headers contain svix signature, verify it
    if (req.headers.get("svix-signature") && secret) {
      const isValid = verifySvixSignature(rawBody, req.headers, secret);
      if (!isValid) {
        console.warn("[resend-webhook] Invalid signature received");
        // Still return 200 or 401 based on policy
      }
    }

    const events = Array.isArray(payload) ? payload : [payload];

    for (const evt of events) {
      const eventType = evt.type || "email.sent";
      const data = evt.data || {};
      const emailId = data.email_id || data.id || null;
      const recipient = Array.isArray(data.to) ? data.to[0] : data.to || null;
      const subject = data.subject || null;
      const from = data.from || null;
      const status = eventType.replace(/^email\./, "");
      const error = data.bounce?.message || data.error || (status === "failed" || status === "bounced" ? "Delivery rejected" : null);

      try {
        await (supabaseAdmin as any).from("email_dispatch_log").insert({
          provider_id: emailId,
          event: eventType,
          status,
          recipient,
          subject,
          error,
          meta: {
            from,
            click: data.click || null,
            headers: evt.created_at || null,
            raw_event: evt,
          },
          created_at: evt.created_at || new Date().toISOString(),
        });
      } catch (logErr) {
        console.warn("[resend-webhook] Failed to log dispatch event:", logErr);
      }
    }

    return NextResponse.json({ received: true, count: events.length }, { status: 200 });
  } catch (err: any) {
    console.error("[resend-webhook] Error processing webhook:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "active",
    endpoint: "resend-webhook",
    service: "ORIZINO Resend Telemetry Ingestion",
    timestamp: new Date().toISOString(),
  });
}
