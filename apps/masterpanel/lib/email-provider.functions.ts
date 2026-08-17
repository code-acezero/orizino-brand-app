"use server";

import { createServerFn } from "@/lib/server-fn-compat";
import { getRequestHeader } from "@orizino/shared/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin, hasSupabaseAdminCredentials } from "@/integrations/supabase/client.server";
import { sendEmail, logDispatch } from "./resend.server";

const SETTINGS_KEY = "email_provider";

/**
 * Resolve the app's public base URL.
 * Priority: admin override (site_settings) > SITE_URL env > request Host header.
 * Returns metadata so the admin UI can warn on misconfiguration.
 */
function resolveSiteUrl(overrideRaw?: string | null) {
  const override = (overrideRaw ?? "").trim().replace(/\/+$/, "") || null;
  const envVal = (process.env.SITE_URL ?? "").trim().replace(/\/+$/, "") || null;

  let derived: string | null = null;
  try {
    const host = getRequestHeader("host") ?? getRequestHeader("x-forwarded-host") ?? null;
    const proto = getRequestHeader("x-forwarded-proto") ?? "https";
    if (host) derived = `${proto}://${host}`;
  } catch {
    // called outside a request context
  }

  const effective = override || envVal || derived || "https://mp.orizino.com";
  const source: "override" | "env" | "derived" | "fallback" = override
    ? "override"
    : envVal
      ? "env"
      : derived
        ? "derived"
        : "fallback";

  const isHttps = /^https:\/\//i.test(effective);
  const isLocal = /localhost|127\.0\.0\.1|\.lovable\.app|-dev\./i.test(effective);
  const warn = !isHttps || (source === "derived" && !isLocal ? false : source === "fallback");

  return { effective, source, override, env: envVal, derived, warn, isLocal };
}

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
      site_url_override?: string;
      resend_api_key?: string;
      webhook_secret?: string;
      senders?: Array<any>;
    };

    const siteUrlInfo = resolveSiteUrl(settings.site_url_override);
    const siteUrl = siteUrlInfo.effective;

    const rkey = process.env.RESEND_API_KEY || settings?.resend_api_key || "";
    const resendKeyPreview = rkey
      ? `${rkey.slice(0, 6)}${"•".repeat(Math.max(0, rkey.length - 10))}${rkey.slice(-4)}`
      : null;

    return {
      settings,
      env: {
        resendKeyConfigured: !!rkey,
        resendKeyPreview,
        resendKeySource: process.env.RESEND_API_KEY ? "env" : settings?.resend_api_key ? "database" : "none",
        webhookSecretConfigured: !!process.env.RESEND_WEBHOOK_SECRET || !!settings?.webhook_secret,
        serviceRoleConfigured: hasSupabaseAdminCredentials(),
      },
      siteUrl: siteUrlInfo,
      urls: {
        webhook: `${siteUrl}/api/public/hooks/resend-webhook`,
        unsubscribe: `${siteUrl}/api/public/unsubscribe`,
      },
    };
  });

/** Set or clear the SITE_URL admin override (stored in site_settings). */
export const updateSiteUrlOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        site_url: z
          .string()
          .trim()
          .max(200)
          .refine((v) => v === "" || /^https?:\/\/[^\s/]+/i.test(v), "Must be a full URL like https://mp.example.com")
          .nullable()
          .optional(),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase as any, context.userId);
    const sb: any = admin();
    const { data: existing } = await sb.from("site_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
    const cleaned = (data.site_url ?? "").trim().replace(/\/+$/, "");
    const merged = { ...(existing?.value ?? {}), site_url_override: cleaned || null };
    await sb.from("site_settings").upsert({ key: SETTINGS_KEY, value: merged }, { onConflict: "key" });
    await sb.from("staff_audit_log").insert({
      actor_id: context.userId,
      action: cleaned ? "set_site_url_override" : "clear_site_url_override",
      entity: "site_settings",
      meta: { site_url: cleaned || null },
    });
    return { ok: true, site_url_override: cleaned || null };
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
        resend_api_key: z.string().max(200).optional().nullable(),
        webhook_secret: z.string().max(200).optional().nullable(),
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
  .inputValidator((i) => z.object({ apiKey: z.string().optional() }).optional())
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase as any, context.userId);
    let key = data?.apiKey?.trim() || process.env.RESEND_API_KEY;
    if (!key) {
      const sb: any = admin();
      const { data: row } = await sb.from("site_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
      key = (row?.value as any)?.resend_api_key;
    }
    if (!key) return { ok: false, error: "RESEND_API_KEY not configured in .env or database settings" };
    try {
      const res = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { ok: false, error: `Resend ${res.status}: ${text || res.statusText}` };
      }
      const resData = (await res.json()) as { data?: Array<any> };
      const domains = (resData.data ?? []).map((d) => ({
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
    await logDispatch({
      purpose: "test",
      recipient: data.to,
      subject: data.subject,
      status: res.error ? "failed" : "sent",
      provider_id: res.id ?? null,
      error: res.error ?? null,
    });
    return { ok: !res.error, id: res.id ?? null, error: res.error ?? null };
  });

export const purgeEmailDispatchLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as any, context.userId);
    const sb: any = admin();
    const { error } = await sb.from("email_dispatch_log").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw new Error(error.message);
    await sb.from("staff_audit_log").insert({
      actor_id: context.userId,
      action: "purge_email_dispatch_log",
      entity: "email_dispatch_log",
    });
    return { ok: true };
  });
