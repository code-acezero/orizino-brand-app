import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendBatch, withUnsubscribeFooter, getDefaultSender } from "./resend.server";

function adminClient() {
  return supabaseAdmin;
}

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" as any });
  if (!data) throw new Error("Forbidden: admins only");
}

async function siteName(sb: any): Promise<string> {
  const { data } = await sb.from("site_settings").select("value").eq("key", "site_name").maybeSingle();
  const v: any = data?.value;
  return (typeof v === "object" ? v?.value : v) ?? "Our Store";
}

function defaultFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || "team@orizino.com";
}

// CRUD
export const listCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("email_campaigns").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb: any = context.supabase;
    const { data: c } = await sb.from("email_campaigns").select("*").eq("id", data.id).single();
    const { data: recipients } = await sb.from("email_campaign_recipients").select("status").eq("campaign_id", data.id);
    const stats: Record<string, number> = {};
    (recipients ?? []).forEach((r) => { stats[r.status] = (stats[r.status] ?? 0) + 1; });
    return { campaign: c, stats };
  });

export const upsertCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1).max(200),
      subject: z.string().max(300).default(""),
      from_name: z.string().max(100).optional(),
      from_email: z.string().email().optional(),
      reply_to: z.string().email().optional(),
      html: z.string().default(""),
      design: z.any().optional(),
      template_id: z.string().uuid().nullable().optional(),
      audience_type: z.enum(["subscribers", "customers", "custom"]).default("subscribers"),
      audience_filter: z.any().optional(),
      schedule_at: z.string().datetime().nullable().optional(),
      status: z.enum(["draft", "scheduled"]).default("draft"),
    }).parse(i)
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb: any = context.supabase;
    const payload: Record<string, unknown> = {
      name: data.name,
      subject: data.subject,
      from_name: data.from_name ?? null,
      from_email: data.from_email ?? null,
      reply_to: data.reply_to ?? null,
      html: data.html,
      design: data.design ?? {},
      template_id: data.template_id ?? null,
      audience_type: data.audience_type,
      audience_filter: data.audience_filter ?? {},
      schedule_at: data.schedule_at ?? null,
      status: data.schedule_at ? "scheduled" : data.status,
      created_by: context.userId,
    };
    if (data.id) {
      const { data: row, error } = await sb.from("email_campaigns").update(payload).eq("id", data.id).select().single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await sb.from("email_campaigns").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("email_campaigns").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function resolveRecipients(sb: any, audience: string, filter: any): Promise<Array<{ email: string; name?: string; user_id?: string }>> {
  if (audience === "subscribers") {
    const { data } = await sb.from("email_subscriptions").select("email, name, user_id").eq("is_active", true);
    return (data ?? []).map((r) => ({ email: r.email, name: r.name ?? undefined, user_id: r.user_id ?? undefined }));
  }
  if (audience === "customers") {
    const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 5000 });
    const { data: profiles } = await sb.from("profiles").select("id, full_name");
    const nameMap: Record<string, string> = {};
    profiles?.forEach((p) => { if (p.full_name) nameMap[p.id] = p.full_name; });
    return (list?.users ?? []).filter((u) => !!u.email).map((u) => ({ email: u.email!, name: nameMap[u.id], user_id: u.id }));
  }
  if (audience === "custom" && Array.isArray(filter?.emails)) {
    return (filter.emails as string[]).map((email: string) => ({ email: email.toLowerCase() }));
  }
  return [];
}

async function actuallySend(campaignId: string) {
  const sb: any = adminClient();
  const { data: campaign } = await sb.from("email_campaigns").select("*").eq("id", campaignId).single();
  if (!campaign) throw new Error("Campaign not found");
  if (campaign.status === "sending" || campaign.status === "sent") return { skipped: true };

  await sb.from("email_campaigns").update({ status: "sending", started_at: new Date().toISOString() }).eq("id", campaignId);

  // Build recipient pool, filter suppressions
  const raw = await resolveRecipients(sb, campaign.audience_type, campaign.audience_filter);
  const { data: suppressed } = await sb.from("email_suppressions").select("email");
  const suppressedSet = new Set((suppressed ?? []).map((s) => s.email.toLowerCase()));
  const seen = new Set<string>();
  const recipients = raw.filter((r) => {
    const e = r.email.toLowerCase();
    if (suppressedSet.has(e) || seen.has(e)) return false;
    seen.add(e);
    return true;
  });

  // Pre-fetch unsubscribe tokens for known subscribers
  const tokenMap = new Map<string, string>();
  if (recipients.length) {
    const { data: subs } = await sb.from("email_subscriptions").select("email, unsubscribe_token").in("email", recipients.map((r) => r.email));
    subs?.forEach((s) => { if (s.unsubscribe_token) tokenMap.set(s.email.toLowerCase(), s.unsubscribe_token); });
  }

  await sb.from("email_campaigns").update({ total_recipients: recipients.length }).eq("id", campaignId);

  // Persist pending recipient rows
  const recRows = recipients.map((r) => ({ campaign_id: campaignId, email: r.email.toLowerCase(), name: r.name, user_id: r.user_id, status: "pending" }));
  if (recRows.length) {
    for (let i = 0; i < recRows.length; i += 500) {
      await sb.from("email_campaign_recipients").insert(recRows.slice(i, i + 500));
    }
  }

  const siteUrl = process.env.SITE_URL || "https://project--5f6e4f1b-fef3-4515-994e-c3cb9b45f3f0.lovable.app";
  const defaults = await getDefaultSender();
  const fromAddr = campaign.from_email || defaults.from_email;
  const fromName = campaign.from_name || defaults.from_name || (await siteName(sb));
  const replyTo = campaign.reply_to || defaults.reply_to;

  let sentCount = 0, failedCount = 0;
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100);
    const emails = chunk.map((r) => {
      const token = tokenMap.get(r.email.toLowerCase()) ?? "";
      const unsub = token ? `${siteUrl}/api/public/unsubscribe?token=${token}` : `${siteUrl}/`;
      const html = withUnsubscribeFooter(campaign.html, unsub);
      return {
        from: `${fromName} <${fromAddr}>`,
        to: [r.email],
        subject: campaign.subject,
        html,
        reply_to: replyTo || undefined,
        headers: token ? { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : undefined,
        tags: [{ name: "campaign", value: campaignId }],
      };
    });
    const res = await sendBatch(emails);
    for (let j = 0; j < chunk.length; j++) {
      const r = chunk[j];
      const rr = res[j];
      if (rr.id) {
        sentCount++;
        await sb.from("email_campaign_recipients").update({ status: "sent", provider_message_id: rr.id, sent_at: new Date().toISOString() }).eq("campaign_id", campaignId).eq("email", r.email.toLowerCase());
      } else {
        failedCount++;
        await sb.from("email_campaign_recipients").update({ status: "failed", error: rr.error ?? "unknown" }).eq("campaign_id", campaignId).eq("email", r.email.toLowerCase());
      }
    }
  }

  await sb.from("email_campaigns").update({
    status: "sent",
    finished_at: new Date().toISOString(),
    sent_count: sentCount,
    failed_count: failedCount,
  }).eq("id", campaignId);

  // Update last_emailed_at for subscribers in this batch
  if (recipients.length) {
    await sb.from("email_subscriptions").update({ last_emailed_at: new Date().toISOString() }).in("email", recipients.map((r) => r.email.toLowerCase()));
  }

  return { sent: sentCount, failed: failedCount, total: recipients.length };
}

export const sendCampaignNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const result = await actuallySend(data.id);
    await adminClient().from("staff_audit_log").insert({ actor_id: context.userId, action: "send_campaign", entity: "email_campaigns", entity_id: data.id, meta: result });
    return result;
  });

// Internal: callable from cron route via service-role guard
export async function dispatchDueCampaigns() {
  const sb: any = adminClient();
  const { data: due } = await sb
    .from("email_campaigns")
    .select("id")
    .eq("status", "scheduled")
    .lte("schedule_at", new Date().toISOString())
    .limit(20);
  const results: any[] = [];
  for (const c of due ?? []) {
    try { results.push({ id: c.id, ...(await actuallySend(c.id)) }); }
    catch (e: any) {
      await sb.from("email_campaigns").update({ status: "failed" }).eq("id", c.id);
      results.push({ id: c.id, error: e?.message });
    }
  }
  return results;
}

// Templates
export const listTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("email_templates").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1).max(200),
      category: z.string().max(40).default("general"),
      subject: z.string().max(300).default(""),
      html: z.string().default(""),
      design: z.any().optional(),
    }).parse(i)
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb: any = context.supabase;
    const payload = { ...data, created_by: context.userId };
    if (data.id) {
      const { data: row, error } = await sb.from("email_templates").update(payload).eq("id", data.id).select().single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await sb.from("email_templates").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("email_templates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Test send
export const sendTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ to: z.string().email(), subject: z.string().max(300), html: z.string() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const defaults = await getDefaultSender();
    const out: { id?: string; error?: string; warning?: string } = {};
    if (!process.env.RESEND_API_KEY) {
      out.error = "RESEND_API_KEY is not configured. Add it in Lovable secrets to send emails.";
      return out;
    }
    const fromEmail = defaults.from_email;
    const isSandbox = /@resend\.dev$/i.test(fromEmail);
    const res = await sendBatch([{
      from: `${defaults.from_name} <${fromEmail}>`,
      to: [data.to],
      subject: `[TEST] ${data.subject || "Email preview"}`,
      html: data.html,
      reply_to: defaults.reply_to,
      tags: [{ name: "type", value: "test" }],
    }]);
    const r = res[0] ?? { error: "no response from email provider" };
    out.id = r.id;
    out.error = r.error;
    if (!r.id && !r.error) {
      out.error = "Provider accepted the request but returned no message id. Check Resend dashboard.";
    }
    if (r.id && isSandbox) {
      out.warning =
        "Sent via Resend sandbox (onboarding@resend.dev). Sandbox only delivers to the email on your Resend account. " +
        "Verify a domain and set From email in Email Provider settings to send to anyone.";
    }
    return out;
  });
// code:4ce0
