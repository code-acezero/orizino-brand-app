"use server";

import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin, hasSupabaseAdminCredentials } from "@/integrations/supabase/client.server";
import { sendEmail } from "./resend.server";

const SETTINGS_KEY = "email_provider";

function admin() {
  return supabaseAdmin;
}

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admins only");
}

export const getEmailProviderSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as any, context.userId);
    const sb: any = admin();
    const { data: row } = await sb.from("site_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
    const settings = (row?.value ?? {}) as {
      from_email?: string;
      from_name?: string;
      reply_to?: string;
      footer_address?: string;
      tracking_opens?: boolean;
      tracking_clicks?: boolean;
    };

    const siteUrl =
      process.env.SITE_URL ||
      "https://project--5f6e4f1b-fef3-4515-994e-c3cb9b45f3f0.lovable.app";

    return {
      settings,
      env: {
        resendKeyConfigured: !!process.env.RESEND_API_KEY,
        webhookSecretConfigured: !!process.env.RESEND_WEBHOOK_SECRET,
        serviceRoleConfigured: hasSupabaseAdminCredentials(),
      },
      urls: {
        webhook: `${siteUrl}/api/public/hooks/resend-webhook`,
        unsubscribe: `${siteUrl}/api/public/unsubscribe`,
      },
    };
  });

const senderSchema = z.object({
  id: z.string().min(1).max(40),
  category: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9_-]+$/i, "lowercase letters, numbers, _ or -"),
  label: z.string().min(1).max(100),
  from_name: z.string().min(1).max(100),
  from_email: z.string().email().max(200),
  reply_to: z.string().email().max(200).optional().nullable().or(z.literal("")),
  is_default: z.boolean().optional(),
});

export const updateEmailProviderSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        from_email: z.string().email().max(200).optional().nullable(),
        from_name: z.string().min(1).max(100).optional().nullable(),
        reply_to: z.string().email().max(200).optional().nullable().or(z.literal("")),
        footer_address: z.string().max(500).optional().nullable(),
        tracking_opens: z.boolean().optional(),
        tracking_clicks: z.boolean().optional(),
        senders: z.array(senderSchema).max(50).optional(),
      })
      .parse(i)
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase as any, context.userId);
    const sb: any = admin();
    const { data: existing } = await sb.from("site_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
    if (Array.isArray(data.senders)) {
      const defaults = data.senders.filter((s) => s.is_default);
      if (defaults.length > 1) throw new Error("Only one sender can be marked as default");
      const cats = new Set<string>();
      for (const s of data.senders) {
        if (cats.has(s.category)) throw new Error(`Duplicate sender category: ${s.category}`);
        cats.add(s.category);
      }
    }
    const merged = { ...(existing?.value ?? {}), ...data };
    await sb.from("site_settings").upsert({ key: SETTINGS_KEY, value: merged }, { onConflict: "key" });
    await sb.from("staff_audit_log").insert({
      actor_id: context.userId,
      action: "update_email_provider_settings",
      entity: "site_settings",
      meta: { keys: Object.keys(data) },
    });
    return { ok: true, settings: merged };
  });

/** Verify the Resend API key by listing domains. */
export const verifyResendKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as any, context.userId);
    const key = process.env.RESEND_API_KEY;
    if (!key) return { ok: false, error: "RESEND_API_KEY not set in project secrets" };
    try {
      const res = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { ok: false, error: `Resend ${res.status}: ${text || res.statusText}` };
      }
      const data = (await res.json()) as { data?: Array<any> };
      const domains = (data.data ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        status: d.status,
        region: d.region,
        created_at: d.created_at,
      }));
      return { ok: true, domains };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "request failed" };
    }
  });

export const sendProviderTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        to: z.string().email(),
        subject: z.string().min(1).max(200).default("Test email"),
        html: z.string().max(10000).optional(),
        sender_id: z.string().min(1).max(40).optional(),
      })
      .parse(i)
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase as any, context.userId);
    const sb: any = admin();
    const { data: row } = await sb.from("site_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
    const settings = (row?.value ?? {}) as any;
    const senders: Array<z.infer<typeof senderSchema>> = Array.isArray(settings.senders) ? settings.senders : [];
    const picked =
      (data.sender_id && senders.find((s) => s.id === data.sender_id)) ||
      senders.find((s) => s.is_default) ||
      null;
    let fromEmail = picked?.from_email || settings.from_email || process.env.RESEND_FROM_EMAIL || "team@orizino.com";
    let fromName = picked?.from_name || settings.from_name || "Orizino";
    const replyTo = picked?.reply_to || settings.reply_to || undefined;
    // Resolve special "admin-name@" sender: replace local part with the
    // current admin's first name (lowercased, ascii-only, hyphen-separated).
    if (/^admin-name@/i.test(fromEmail)) {
      const { data: profile } = await sb
        .from("profiles")
        .select("full_name")
        .eq("id", context.userId)
        .maybeSingle();
      const full = (profile?.full_name || "").trim();
      const first = full.split(/\s+/)[0] || "admin";
      const slug =
        first
          .normalize("NFKD")
          .replace(/[^\w-]+/g, "")
          .toLowerCase() || "admin";
      fromEmail = fromEmail.replace(/^admin-name@/i, `${slug}@`);
      if (/admin-name/i.test(fromName) || !picked?.from_name) {
        fromName = full || fromName;
      }
    }
    const html =
      data.html ||
      `<div style="font-family:system-ui;padding:24px"><h2>It works ✅</h2><p>This is a test from your Resend integration. Sent at ${new Date().toISOString()}.</p></div>`;
    const res = await sendEmail({
      from: `${fromName} <${fromEmail}>`,
      to: [data.to],
      subject: data.subject,
      html,
      reply_to: replyTo,
    });
    await sb.from("staff_audit_log").insert({
      actor_id: context.userId,
      action: "send_resend_test_email",
      entity: "email_provider",
      meta: { to: data.to, ok: !res.error, id: res.id, error: res.error },
    });
    if (res.error) return { ok: false, error: res.error };
    return { ok: true, id: res.id };
  });

/** Read aggregated provider stats from our local recipient log. */
export const getEmailProviderStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as any, context.userId);
    const sb: any = admin();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [{ count: sent }, { count: delivered }, { count: opened }, { count: clicked }, { count: bounced }, { count: suppressed }] =
      await Promise.all([
        sb.from("email_campaign_recipients").select("id", { count: "exact", head: true }).eq("status", "sent").gte("created_at", since),
        sb.from("email_campaign_recipients").select("id", { count: "exact", head: true }).not("delivered_at", "is", null).gte("created_at", since),
        sb.from("email_campaign_recipients").select("id", { count: "exact", head: true }).not("opened_at", "is", null).gte("created_at", since),
        sb.from("email_campaign_recipients").select("id", { count: "exact", head: true }).not("clicked_at", "is", null).gte("created_at", since),
        sb.from("email_campaign_recipients").select("id", { count: "exact", head: true }).not("bounced_at", "is", null).gte("created_at", since),
        sb.from("email_suppressions").select("id", { count: "exact", head: true }),
      ]);
    return {
      window_days: 30,
      sent: sent ?? 0,
      delivered: delivered ?? 0,
      opened: opened ?? 0,
      clicked: clicked ?? 0,
      bounced: bounced ?? 0,
      suppressed: suppressed ?? 0,
    };
  });
