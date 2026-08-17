import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildWelcomeEmailHtml } from "@orizino/shared/lib/subscribe-service.server";

export const dynamic = "force-dynamic";

function getAdminClient() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/^["']|["']$/g, "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || "").replace(/^["']|["']$/g, "").trim();

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getStorefrontBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_STOREFRONT_URL) return process.env.NEXT_PUBLIC_STOREFRONT_URL.replace(/\/+$/, "");
  if (process.env.STOREFRONT_URL) return process.env.STOREFRONT_URL.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "development") return "http://localhost:3001";
  return "https://shop.orizino.com";
}

async function getResendApiKey(supabase: any): Promise<string> {
  const envKey = process.env.RESEND_API_KEY || process.env.NEXT_PUBLIC_RESEND_API_KEY;
  if (envKey && typeof envKey === "string" && envKey.trim()) return envKey.replace(/[\r\n"'\s]/g, "");

  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "email_provider")
      .maybeSingle();

    const dbKey = (data?.value as any)?.resend_api_key;
    if (dbKey && typeof dbKey === "string" && dbKey.trim()) return dbKey.replace(/[\r\n"'\s]/g, "");
  } catch {}

  return process.env.RESEND_API_KEY ?? "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cleanEmail = (body?.email || "").toLowerCase().trim();

    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      return NextResponse.json(
        { ok: false, status: "error", message: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // 1. Check if email is already subscribed and active
    const { data: existingSub, error: checkError } = await supabase
      .from("email_subscriptions")
      .select("id, is_active, unsubscribe_token")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (checkError) {
      console.error("[subscribe-storefront] checkError:", checkError);
      throw new Error(checkError.message);
    }

    if (existingSub && existingSub.is_active !== false) {
      return NextResponse.json({
        ok: false,
        status: "already_subscribed",
        message: "You are already subscribed to ORIZINO updates.",
      });
    }

    // 2. Check if registered user account exists
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("email", cleanEmail)
      .maybeSingle();

    const hasAccount = Boolean(profile?.id);
    const subscriberName = body?.name?.trim() || profile?.full_name || null;
    const unsubscribeToken = existingSub?.unsubscribe_token || crypto.randomUUID();

    // 3. Upsert into email_subscriptions
    const { error: upsertError } = await supabase
      .from("email_subscriptions")
      .upsert(
        {
          email: cleanEmail,
          name: subscriberName,
          is_active: true,
          source: body?.source || "storefront_footer",
          tags: ["Newsletter", "WelcomeSent"],
          unsubscribe_token: unsubscribeToken,
          unsubscribed_at: null,
          created_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      );

    if (upsertError) {
      console.error("[subscribe-storefront] upsertError:", upsertError);
      throw new Error(upsertError.message);
    }

    // Also populate legacy newsletter_subscribers table if present
    try {
      await (supabase as any)
        .from("newsletter_subscribers")
        .upsert({ email: cleanEmail, status: "active" }, { onConflict: "email" });
    } catch {}

    // 4. Auto-sync to marketing_audience_table
    try {
      const { data: setRow } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "marketing_audience_table")
        .maybeSingle();

      const currentAudience: any[] = Array.isArray(setRow?.value) ? setRow.value : [];
      const existsInAudience = currentAudience.some(
        (r: any) => r.email?.toLowerCase().trim() === cleanEmail
      );

      if (!existsInAudience) {
        const newAudienceRow = {
          id: `sub_${Date.now()}`,
          name: subscriberName || "",
          phone: "",
          email: cleanEmail,
          tag: "Newsletter",
          source: body?.source || "storefront",
          is_active: true,
        };

        await supabase.from("site_settings").upsert(
          {
            key: "marketing_audience_table",
            value: [...currentAudience, newAudienceRow] as any,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );
      }
    } catch (audErr) {
      console.warn("[subscribe-storefront] audience sync error:", audErr);
    }

    // 5. Send Welcome & Thank You Email via Resend
    const storefrontUrl = getStorefrontBaseUrl();
    const unsubscribeUrl = `${storefrontUrl}/api/public/unsubscribe?token=${unsubscribeToken}`;
    const subject = hasAccount
      ? "Thank you for subscribing to ORIZINO updates"
      : "Welcome to ORIZINO — Complete your account & explore latest drops";

    const emailHtml = buildWelcomeEmailHtml({
      email: cleanEmail,
      name: subscriberName || "",
      hasAccount,
      unsubscribeUrl,
      storefrontUrl,
    });

    const apiKey = await getResendApiKey(supabase);

    try {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || "ORIZINO <team@orizino.com>",
          to: [cleanEmail],
          subject,
          html: emailHtml,
          headers: {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }),
      });

      const resendData = await resendRes.json();

      try {
        await supabase.from("email_dispatch_log").insert({
          purpose: "welcome_subscription",
          recipient: cleanEmail,
          subject,
          status: resendRes.ok ? "sent" : "failed",
          provider_id: resendData?.id || null,
          error: resendRes.ok ? null : JSON.stringify(resendData),
          meta: { hasAccount, source: body?.source },
        });
      } catch {}
    } catch (sendErr) {
      console.error("[subscribe-storefront] Resend email send error:", sendErr);
    }

    return NextResponse.json({
      ok: true,
      status: "subscribed",
      message: "Thank you for subscribing! Check your inbox for your welcome note.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, status: "error", message: err?.message || "Failed to process subscription" },
      { status: 500 }
    );
  }
}
