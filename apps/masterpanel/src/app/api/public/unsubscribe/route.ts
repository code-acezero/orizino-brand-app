import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const dynamic = "force-dynamic";

/**
 * Handles RFC 8058 One-Click Unsubscribe (POST) and link clicks (GET).
 */
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email") || (await req.formData().catch(() => null))?.get("email")?.toString() || null;

    if (email) {
      await (supabaseAdmin as any)
        .from("newsletter_subscribers")
        .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
        .eq("email", email.trim().toLowerCase());
    }

    return NextResponse.json({ ok: true, message: "Unsubscribed successfully" }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unsubscribe failed" }, { status: 500 });
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
    `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>Unsubscribed — ORIZINO</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #09090b; color: #fafafa; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { max-width: 480px; width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 36px; text-align: center; }
          h1 { font-size: 24px; font-weight: 800; letter-spacing: 2px; color: #d4af37; margin: 0 0 12px; }
          p { font-size: 14px; color: #a1a1aa; line-height: 1.6; margin: 0 0 24px; }
          a { display: inline-block; background: #d4af37; color: #000; font-weight: 700; font-size: 13px; padding: 10px 24px; border-radius: 12px; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>ORIZINO</h1>
          <p>You have been successfully unsubscribed from marketing and promotional emails.</p>
          <a href="https://shop.orizino.com">Return to Storefront</a>
        </div>
      </body>
    </html>`,
    {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}
