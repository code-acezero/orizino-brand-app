// Server-only helpers for sending email via Resend.
// Never imported from client code. Reads RESEND_API_KEY from the runtime env.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

interface ResendEmail {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
  reply_to?: string;
  headers?: Record<string, string>;
  tags?: Array<{ name: string; value: string }>;
}

/**
 * Insert a row into email_dispatch_log. Best-effort; never throws.
 */
export async function logDispatch(entry: {
  purpose: string;
  event?: string | null;
  rule_id?: string | null;
  recipient: string;
  subject?: string | null;
  status: "queued" | "sent" | "failed";
  provider_id?: string | null;
  error?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await (supabaseAdmin as any).from("email_dispatch_log").insert({
      purpose: entry.purpose,
      event: entry.event ?? null,
      rule_id: entry.rule_id ?? null,
      recipient: entry.recipient,
      subject: entry.subject ?? null,
      status: entry.status,
      provider_id: entry.provider_id ?? null,
      error: entry.error ?? null,
      meta: entry.meta ?? {},
    });
  } catch (e) {
    console.warn("[email-log] insert failed", e);
  }
}

// Resend is called directly with a real RESEND_API_KEY.
const RESEND_API = "https://api.resend.com/emails";
const RESEND_BATCH_API = "https://api.resend.com/emails/batch";

/**
 * Resolves the active Resend API key with priority:
 * 1. Runtime environment variable (RESEND_API_KEY / NEXT_PUBLIC_RESEND_API_KEY)
 * 2. Database site_settings.email_provider.value.resend_api_key
 */
export async function getResolvedApiKey(): Promise<string | null> {
  const envKey = process.env.RESEND_API_KEY || process.env.NEXT_PUBLIC_RESEND_API_KEY;
  if (envKey && typeof envKey === "string" && envKey.trim()) {
    return envKey.trim();
  }

  try {
    const { data } = await (supabaseAdmin as any)
      .from("site_settings")
      .select("value")
      .eq("key", "email_provider")
      .maybeSingle();
    const dbKey = (data?.value as any)?.resend_api_key;
    if (dbKey && typeof dbKey === "string" && dbKey.trim()) {
      return dbKey.trim();
    }
  } catch (err) {
    console.warn("[resend] failed to resolve key from site_settings:", err);
  }
  return null;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const key = await getResolvedApiKey();
  if (!key) {
    throw new Error("RESEND_API_KEY is not configured in .env or Email Provider database settings");
  }
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

/**
 * Read the admin-configured email provider defaults
 * (from_name / from_email / reply_to) from site_settings.email_provider.
 * Falls back to env / Resend verified address when unset.
 */
export async function getDefaultSender(): Promise<{ from_name: string; from_email: string; reply_to?: string }> {
  try {
    const { data } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "email_provider")
      .maybeSingle();
    const v = (data?.value ?? {}) as { from_email?: string; from_name?: string; reply_to?: string };
    return {
      from_name: v.from_name?.trim() || "ORIZINO",
      from_email: v.from_email?.trim() || process.env.RESEND_FROM_EMAIL || "orders@orizino.com",
      reply_to: v.reply_to?.trim() || "support@orizino.com",
    };
  } catch {
    return {
      from_name: "ORIZINO",
      from_email: process.env.RESEND_FROM_EMAIL || "orders@orizino.com",
      reply_to: "support@orizino.com",
    };
  }
}

export async function sendEmail(email: ResendEmail): Promise<{ id?: string; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers,
      body: JSON.stringify(email),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { error: `Resend ${res.status}: ${text || res.statusText}` };
    }
    const data = (await res.json()) as { id?: string };
    return { id: data.id };
  } catch (err: any) {
    return { error: err?.message || "Failed to dispatch email via Resend" };
  }
}

export async function sendBatch(
  emails: ResendEmail[]
): Promise<Array<{ id?: string; error?: string }>> {
  if (emails.length === 0) return [];
  try {
    const headers = await getAuthHeaders();
    // Resend batch limit is 100 per request.
    const out: Array<{ id?: string; error?: string }> = [];
    for (let i = 0; i < emails.length; i += 100) {
      const chunk = emails.slice(i, i + 100);
      let attempt = 0;
      while (attempt < 4) {
        const res = await fetch(RESEND_BATCH_API, {
          method: "POST",
          headers,
          body: JSON.stringify(chunk),
        });
        if (res.ok) {
          const data = (await res.json()) as { data?: Array<{ id?: string }> };
          const arr = data.data ?? [];
          for (let j = 0; j < chunk.length; j++) {
            out.push({ id: arr[j]?.id });
          }
          break;
        }
        if (res.status === 429 || res.status >= 500) {
          const wait = 500 * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, wait));
          attempt++;
          continue;
        }
        const text = await res.text().catch(() => "");
        for (let j = 0; j < chunk.length; j++) out.push({ error: `Resend ${res.status}: ${text}` });
        break;
      }
      if (attempt >= 4) {
        for (let j = 0; j < chunk.length; j++) out.push({ error: "rate limited after retries" });
      }
    }
    return out;
  } catch (err: any) {
    return emails.map(() => ({ error: err?.message || "Batch send failed" }));
  }
}

/**
 * Wraps campaign HTML with one-click unsubscribe footer + headers.
 */
export function withUnsubscribeFooter(html: string, unsubscribeUrl: string): string {
  const footer = `<div style="margin-top:32px;padding:24px;border-top:1px solid #e5e7eb;font-family:system-ui,-apple-system,sans-serif;font-size:12px;color:#6b7280;text-align:center">
    <p style="margin:0 0 8px 0">You're receiving this because you subscribed to our updates.</p>
    <p style="margin:0"><a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline">Unsubscribe</a></p>
  </div>`;
  if (html.includes("</body>")) return html.replace("</body>", `${footer}</body>`);
  return html + footer;
}
