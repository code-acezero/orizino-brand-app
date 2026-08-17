/**
 * subscribe-service.server.ts
 *
 * Core service for processing email subscriptions, duplicate prevention,
 * and dispatching Cherry Vanilla luxury Welcome / Thank You emails via Resend.
 */

import { createClient } from "@supabase/supabase-js";

export interface SubscriptionParams {
  email: string;
  name?: string;
  source?: string;
}

export interface SubscriptionResponse {
  ok: boolean;
  status: "subscribed" | "already_subscribed" | "error";
  message: string;
}

function getAdminClient() {
  const url = "https://oectjdngvrqnxwhnwfrt.supabase.co";
  const key =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lY3RqZG5ndnJxbnh3aG53ZnJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjg5MTM1NCwiZXhwIjoyMDg4NDY3MzU0fQ.tTGgSv0_6aSRjekzCFB7VlA0jC-vUn8FECt21PiDPwk";
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
  if (envKey && typeof envKey === "string" && envKey.trim()) return envKey.trim();

  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "email_provider")
      .maybeSingle();

    const dbKey = (data?.value as any)?.resend_api_key;
    if (dbKey && typeof dbKey === "string" && dbKey.trim()) return dbKey.trim();
  } catch {}

  return process.env.RESEND_API_KEY ?? "";
}

export function buildWelcomeEmailHtml(params: {
  email: string;
  name?: string;
  hasAccount: boolean;
  unsubscribeUrl: string;
  storefrontUrl: string;
}): string {
  const { email, name, hasAccount, unsubscribeUrl, storefrontUrl } = params;
  const greeting = name ? `Dear ${name},` : "Hello,";
  const authUrl = `${storefrontUrl}/auth?email=${encodeURIComponent(email)}`;
  const shopUrl = `${storefrontUrl}/collections`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ORIZINO</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d0c0e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FAF6EE; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0d0c0e; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #141217; border-radius: 20px; border: 1px solid rgba(250, 246, 238, 0.08); overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
          <!-- Top Cherry Accent Strip -->
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #9a0002, #c41e3a, #9a0002);"></td>
          </tr>

          <!-- Header / Brand Mark -->
          <tr>
            <td align="center" style="padding: 40px 32px 20px 32px;">
              <img src="https://shop.orizino.com/apple-touch-icon.png" width="48" height="48" alt="ORIZINO" style="display: block; border-radius: 12px; margin-bottom: 16px; border: 1px solid rgba(250, 246, 238, 0.1);" />
              <div style="font-size: 18px; font-weight: 900; letter-spacing: 4px; color: #FAF6EE; text-transform: uppercase;">ORIZINO</div>
              <div style="display: inline-block; margin-top: 10px; padding: 4px 12px; background-color: rgba(154, 0, 2, 0.15); border: 1px solid rgba(154, 0, 2, 0.4); border-radius: 20px; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #f87171;">
                Exclusive Access Activated
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 10px 36px 30px 36px;">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 800; color: #FAF6EE; line-height: 1.3; text-align: center;">
                Thank You for Subscribing
              </h1>
              
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.7; color: #d1ccd6;">
                ${greeting}
              </p>
              
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.7; color: #d1ccd6;">
                Thank you for subscribing to ORIZINO. You are now part of our private circle, receiving first access to seasonal editorial drops, exclusive private sales, and limited sartorial releases.
              </p>

              ${
                !hasAccount
                  ? `<!-- Callout Card: No Account Yet -->
              <div style="background-color: rgba(154, 0, 2, 0.08); border: 1px solid rgba(154, 0, 2, 0.25); border-radius: 14px; padding: 20px; margin: 24px 0;">
                <div style="font-size: 13px; font-weight: 700; color: #FAF6EE; margin-bottom: 6px;">
                  ✦ Complete Your Member Profile
                </div>
                <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #c4bfc9;">
                  We noticed there is no registered customer account for <strong style="color: #FAF6EE;">${email}</strong> yet. Creating an account unlocks instant checkout, saved delivery preferences, and real-time package tracking.
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center">
                      <a href="${authUrl}" style="display: inline-block; padding: 12px 28px; background-color: #9a0002; color: #FAF6EE; text-decoration: none; border-radius: 10px; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(154, 0, 2, 0.4);">
                        Create Free Account
                      </a>
                    </td>
                  </tr>
                </table>
              </div>`
                  : `<!-- Callout Card: Account Connected -->
              <div style="background-color: rgba(250, 246, 238, 0.04); border: 1px solid rgba(250, 246, 238, 0.08); border-radius: 14px; padding: 18px; margin: 24px 0;">
                <div style="font-size: 13px; font-weight: 700; color: #FAF6EE; margin-bottom: 4px;">
                  ✓ Connected to Your Member Account
                </div>
                <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #c4bfc9;">
                  Your subscription is linked to your existing ORIZINO account. You'll receive instant notification when our next drop goes live.
                </p>
              </div>`
              }

              <!-- Shop CTA -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0 10px 0;">
                <tr>
                  <td align="center">
                    <a href="${shopUrl}" style="display: inline-block; padding: 14px 36px; background-color: ${!hasAccount ? "#1e1b24" : "#9a0002"}; color: #FAF6EE; text-decoration: none; border-radius: 10px; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; border: ${!hasAccount ? "1px solid rgba(250, 246, 238, 0.15)" : "none"};">
                      Explore Latest Drops &amp; Shop
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Value Strip -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 36px; padding-top: 24px; border-top: 1px solid rgba(250, 246, 238, 0.08);">
                <tr>
                  <td width="33%" align="center" style="padding: 8px;">
                    <div style="font-size: 16px; margin-bottom: 4px;">⚜️</div>
                    <div style="font-size: 11px; font-weight: 700; color: #FAF6EE;">Limited Drops</div>
                    <div style="font-size: 10px; color: #8e8a94; margin-top: 2px;">Small batch pieces</div>
                  </td>
                  <td width="33%" align="center" style="padding: 8px;">
                    <div style="font-size: 16px; margin-bottom: 4px;">🚀</div>
                    <div style="font-size: 11px; font-weight: 700; color: #FAF6EE;">Priority Dispatch</div>
                    <div style="font-size: 10px; color: #8e8a94; margin-top: 2px;">Express delivery</div>
                  </td>
                  <td width="33%" align="center" style="padding: 8px;">
                    <div style="font-size: 16px; margin-bottom: 4px;">🛡️</div>
                    <div style="font-size: 11px; font-weight: 700; color: #FAF6EE;">Authentic</div>
                    <div style="font-size: 10px; color: #8e8a94; margin-top: 2px;">Verified garments</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0d0c0e; padding: 24px 32px; border-top: 1px solid rgba(250, 246, 238, 0.06); text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 11px; color: #736f78;">
                You are receiving this email because you subscribed to ORIZINO updates.
              </p>
              <p style="margin: 0; font-size: 11px; color: #736f78;">
                <a href="${unsubscribeUrl}" style="color: #a8a3ad; text-decoration: underline;">Unsubscribe</a> · 
                <a href="${storefrontUrl}/privacy" style="color: #a8a3ad; text-decoration: underline;">Privacy Policy</a> · 
                <a href="${storefrontUrl}" style="color: #a8a3ad; text-decoration: underline;">Visit Store</a>
              </p>
              <p style="margin: 12px 0 0 0; font-size: 10px; color: #5a5660; letter-spacing: 0.5px;">
                © ${new Date().getFullYear()} ORIZINO. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function processEmailSubscription(params: SubscriptionParams): Promise<SubscriptionResponse> {
  const cleanEmail = (params.email || "").toLowerCase().trim();
  if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
    return {
      ok: false,
      status: "error",
      message: "Please provide a valid email address.",
    };
  }

  const supabase = getAdminClient();

  try {
    console.log("[subscribe-service] Checking subscription for:", cleanEmail);
    const { data: existingSub, error: checkError } = await supabase
      .from("email_subscriptions")
      .select("id, is_active, unsubscribe_token")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (checkError) {
      console.error("[subscribe-service] checkError:", checkError);
      throw new Error(`Check error: ${checkError.message}`);
    }

    if (existingSub && existingSub.is_active !== false) {
      return {
        ok: false,
        status: "already_subscribed",
        message: "You are already subscribed to ORIZINO updates.",
      };
    }

    // 2. Check if a registered user account exists with this email
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("email", cleanEmail)
      .maybeSingle();

    const hasAccount = Boolean(profile?.id);
    const subscriberName = params.name?.trim() || profile?.full_name || null;
    const unsubscribeToken = existingSub?.unsubscribe_token || crypto.randomUUID();

    // 3. Upsert into email_subscriptions
    const { error: upsertError } = await supabase
      .from("email_subscriptions")
      .upsert(
        {
          email: cleanEmail,
          name: subscriberName,
          is_active: true,
          source: params.source || "storefront_footer",
          tags: ["Newsletter", "WelcomeSent"],
          unsubscribe_token: unsubscribeToken,
          unsubscribed_at: null,
          created_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      );

    if (upsertError) {
      console.error("[subscribe-service] Database insert error:", upsertError);
      throw new Error(upsertError.message);
    }

    // Also populate legacy newsletter_subscribers table for backward compatibility if present
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
          source: params.source || "storefront",
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
      console.warn("[subscribe-service] audience sync error:", audErr);
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

      // Log dispatch
      try {
        await supabase.from("email_dispatch_log").insert({
          purpose: "welcome_subscription",
          recipient: cleanEmail,
          subject,
          status: resendRes.ok ? "sent" : "failed",
          provider_id: resendData?.id || null,
          error: resendRes.ok ? null : JSON.stringify(resendData),
          meta: { hasAccount, source: params.source },
        });
      } catch {}
    } catch (sendErr) {
      console.error("[subscribe-service] Resend email send error:", sendErr);
    }

    return {
      ok: true,
      status: "subscribed",
      message: "Thank you for subscribing! Check your inbox for your welcome note.",
    };
  } catch (err: any) {
    console.error("[subscribe-service] Error:", err);
    return {
      ok: false,
      status: "error",
      message: err?.message || "Failed to process subscription. Please try again.",
    };
  }
}
