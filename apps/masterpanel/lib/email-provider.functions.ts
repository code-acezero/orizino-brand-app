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
    };

    const siteUrlInfo = resolveSiteUrl((settings as any).site_url_override);
    const siteUrl = siteUrlInfo.effective;

    const rkey = process.env.RESEND_API_KEY ?? "";
    const resendKeyPreview = rkey
      ? `${rkey.slice(0, 6)}${"•".repeat(Math.max(0, rkey.length - 10))}${rkey.slice(-4)}`
      : null;

    return {
      settings,
      env: {
        resendKeyConfigured: !!rkey,
        resendKeyPreview,
        webhookSecretConfigured: !!process.env.RESEND_WEBHOOK_SECRET,
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
        // empty string / null clears the override
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
    await logDispatch({
      purpose: "provider_test",
      recipient: data.to,
      subject: data.subject,
      status: res.error ? "failed" : "sent",
      provider_id: res.id ?? null,
      error: res.error ?? null,
      meta: { from: `${fromName} <${fromEmail}>`, actor_id: context.userId },
    });
    return { ok: !res.error, id: res.id ?? null, error: res.error ?? null };
  });

/** List recent email dispatch attempts (log). */
export const listEmailDispatchLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        purpose: z.string().max(40).optional(),
        status: z.enum(["queued", "sent", "failed"]).optional(),
        limit: z.number().min(1).max(200).default(50),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase as any, context.userId);
    const sb: any = admin();
    let q = sb
      .from("email_dispatch_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.purpose) q = q.eq("purpose", data.purpose);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Delete all rows from email_dispatch_log. */
export const clearEmailDispatchLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as any, context.userId);
    const sb: any = admin();
    const { error, count } = await sb
      .from("email_dispatch_log")
      .delete({ count: "exact" })
      .not("id", "is", null);
    if (error) throw new Error(error.message);
    await sb.from("staff_audit_log").insert({
      actor_id: context.userId,
      action: "clear_email_dispatch_log",
      entity: "email_dispatch_log",
      meta: { deleted: count ?? 0 },
    });
    return { ok: true, deleted: count ?? 0 };
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

/** Send a Svix-signed sample event to our own webhook to verify E2E setup. */
export const sendSampleWebhookEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        type: z
          .enum(["email.sent", "email.delivered", "email.opened", "email.clicked", "email.bounced", "email.complained"])
          .default("email.delivered"),
        to: z.string().email().default("test@example.com"),
      })
      .parse(i ?? {})
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase as any, context.userId);
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) return { ok: false, error: "RESEND_WEBHOOK_SECRET is not set" };

    const sb: any = admin();
    const { data: row } = await sb.from("site_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
    const siteUrl = resolveSiteUrl(row?.value?.site_url_override).effective;
    const url = `${siteUrl}/api/public/hooks/resend-webhook`;

    const payload = {
      type: data.type,
      created_at: new Date().toISOString(),
      data: {
        email_id: `sample_${crypto.randomUUID()}`,
        from: "test@resend.dev",
        to: [data.to],
        subject: "Sample webhook event",
        created_at: new Date().toISOString(),
      },
    };
    const body = JSON.stringify(payload);

    const { createHmac } = await import("crypto");
    const svixId = `msg_${crypto.randomUUID()}`;
    const svixTs = Math.floor(Date.now() / 1000).toString();
    const rawSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    const keyBuf = Buffer.from(rawSecret, "base64");
    const sig = createHmac("sha256", keyBuf).update(`${svixId}.${svixTs}.${body}`).digest("base64");

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "svix-id": svixId,
          "svix-timestamp": svixTs,
          "svix-signature": `v1,${sig}`,
        },
        body,
      });
      const text = await res.text().catch(() => "");
      return { ok: res.ok, status: res.status, response: text.slice(0, 500), url, type: data.type };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "request failed", url };
    }
  });
// code:4ce0
