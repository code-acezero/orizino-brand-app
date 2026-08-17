import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    if (email) {
      await (supabaseAdmin as any)
        .from("newsletter_subscribers")
        .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
        .eq("email", email.trim().toLowerCase());
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  if (email) {
    try {
      await (supabaseAdmin as any)
        .from("newsletter_subscribers")
        .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
        .eq("email", email.trim().toLowerCase());
    } catch {}
  }
  return new NextResponse(
    `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#09090b;color:#fff;text-align:center;padding:48px;"><h1 style="color:#d4af37;">ORIZINO</h1><p>You have been unsubscribed from promotional emails.</p><a href="/" style="color:#d4af37;">Return to Home</a></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
