import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    if (!rawBody) return NextResponse.json({ error: "Empty body" }, { status: 400 });

    const payload = JSON.parse(rawBody);
    const events = Array.isArray(payload) ? payload : [payload];

    for (const evt of events) {
      const eventType = evt.type || "email.sent";
      const data = evt.data || {};
      const emailId = data.email_id || data.id || null;
      const recipient = Array.isArray(data.to) ? data.to[0] : data.to || null;
      const subject = data.subject || null;
      const status = eventType.replace(/^email\./, "");
      const error = data.bounce?.message || data.error || null;

      try {
        await (supabaseAdmin as any).from("email_dispatch_log").insert({
          provider_id: emailId,
          event: eventType,
          status,
          recipient,
          subject,
          error,
          meta: { raw_event: evt },
          created_at: evt.created_at || new Date().toISOString(),
        });
      } catch {}
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "active", endpoint: "resend-webhook" });
}
