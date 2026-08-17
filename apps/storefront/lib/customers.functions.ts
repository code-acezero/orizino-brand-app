"use server";

import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hasSupabaseAdminCredentials, supabaseAdmin } from "@/integrations/supabase/client.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

async function assertStaff(supabase: any, userId: string) {
  const [admin, mod] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "moderator" }),
  ]);
  if (!admin.data && !mod.data) throw new Error("Forbidden: staff only");
  return { isAdmin: !!admin.data, isModerator: !!mod.data };
}

function adminClient() {
  if (!hasSupabaseAdminCredentials()) {
    throw new Error(
      "Supabase admin credentials are not configured. Add SUPABASE_SERVICE_ROLE_KEY in project Secrets for email lookup and privileged customer actions.",
    );
  }
  return supabaseAdmin;
}

async function audit(actorId: string, action: string, entity?: string, entityId?: string, meta?: Record<string, unknown>) {
  await adminClient().from("staff_audit_log").insert({ actor_id: actorId, action, entity, entity_id: entityId ?? null, meta: (meta ?? {}) as any });
}

// List customers (i.e. profiles without any admin/moderator role)
export const listCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      search: z.string().max(200).optional(),
      tag: z.string().uuid().optional(),
      hasOrders: z.boolean().optional(),
      limit: z.number().min(1).max(500).default(100),
      offset: z.number().min(0).default(0),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase as any, context.userId);
    const sb: any = context.supabase;

    let q = sb.from("profiles").select("id, full_name, avatar_url, phone, created_at, updated_at", { count: "exact" }).order("created_at", { ascending: false }).range(data.offset, data.offset + data.limit - 1);
    if (data.search) {
      const s = data.search.trim();
      q = q.or(`full_name.ilike.%${s}%,phone.ilike.%${s}%,id.ilike.%${s}%`);
    }
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((r) => r.id);
    // Roles per user (so staff are visible but clearly tagged)
    const { data: roleRows } = ids.length
      ? await sb.from("user_roles").select("user_id, role").in("user_id", ids)
      : { data: [] as any[] };
    const rolesByUser: Record<string, string[]> = {};
    (roleRows ?? []).forEach((r: any) => {
      (rolesByUser[r.user_id] ||= []).push(r.role);
    });
    // Orders aggregate
    const { data: orderRows } = ids.length
      ? await sb.from("orders").select("user_id, total, created_at").in("user_id", ids)
      : { data: [] as any[] };
    // Auth emails via admin API
    const emailMap: Record<string, string> = {};
    if (ids.length && hasSupabaseAdminCredentials()) {
      const { data: authList } = await (adminClient() as any).auth.admin.listUsers({ page: 1, perPage: 1000 });
      authList?.users?.forEach((u) => { if (ids.includes(u.id)) emailMap[u.id] = u.email ?? ""; });
    }
    // Tags
    const { data: tagRows } = ids.length
      ? await sb.from("customer_tag_assignments").select("customer_id, tag_id, customer_tags(id, name, color)").in("customer_id", ids)
      : { data: [] as any[] };

    const items = (rows ?? []).map((r) => {
      const userOrders = (orderRows ?? []).filter((o) => o.user_id === r.id);
      const lifetime = userOrders.reduce((s, o) => s + Number(o.total ?? 0), 0);
      const lastOrder = userOrders.reduce((acc: string | null, o: any) => acc && acc > o.created_at ? acc : o.created_at, null as string | null);
      const tags = (tagRows ?? []).filter((t: any) => t.customer_id === r.id).map((t: any) => t.customer_tags).filter(Boolean);
      const roles = rolesByUser[r.id] ?? [];
      return {
        ...r,
        email: emailMap[r.id] ?? null,
        order_count: userOrders.length,
        lifetime_spend: lifetime,
        last_order_at: lastOrder,
        tags,
        roles,
        is_staff: roles.some((x) => x === "admin" || x === "moderator"),
      };
    });

    let filtered = items;
    if (data.hasOrders === true) filtered = filtered.filter((i) => i.order_count > 0);
    if (data.hasOrders === false) filtered = filtered.filter((i) => i.order_count === 0);
    if (data.tag) filtered = filtered.filter((i) => i.tags.some((t: any) => t.id === data.tag));

    return { items: filtered, total: count ?? filtered.length };
  });

export const getCustomerDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ customerId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase as any, context.userId);
    const sb: any = adminClient();
    const [{ data: profile }, { data: orders }, { data: notes }, { data: addresses }, { data: tagAssign }] = await Promise.all([
      sb.from("profiles").select("*").eq("id", data.customerId).maybeSingle(),
      sb.from("orders").select("*").eq("user_id", data.customerId).order("created_at", { ascending: false }).limit(50),
      sb.from("customer_notes").select("*").eq("customer_id", data.customerId).order("created_at", { ascending: false }),
      sb.from("user_addresses").select("*").eq("user_id", data.customerId).then((r) => r, () => ({ data: [] as any[] })),
      sb.from("customer_tag_assignments").select("tag_id, customer_tags(id, name, color)").eq("customer_id", data.customerId),
    ]);
    const { data: u } = await sb.auth.admin.getUserById(data.customerId);
    return {
      profile,
      email: u?.user?.email ?? null,
      orders: orders ?? [],
      notes: notes ?? [],
      addresses: addresses ?? [],
      tags: (tagAssign ?? []).map((t: any) => t.customer_tags).filter(Boolean),
    };
  });

export const exportCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      customerIds: z.array(z.string().uuid()).max(10000).optional(),
      format: z.enum(["csv", "json", "vcard"]).default("csv"),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase as any, context.userId);
    const sb: any = adminClient();
    let q = sb.from("profiles").select("id, full_name, phone, created_at");
    if (data.customerIds && data.customerIds.length > 0) q = q.in("id", data.customerIds);
    const { data: rows } = await q;
    const ids = (rows ?? []).map((r) => r.id);
    const emailMap: Record<string, string> = {};
    if (ids.length) {
      const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
      list?.users?.forEach((u) => { if (ids.includes(u.id)) emailMap[u.id] = u.email ?? ""; });
    }
    const items = (rows ?? []).map((r) => ({ id: r.id, name: r.full_name ?? "", phone: r.phone ?? "", email: emailMap[r.id] ?? "", joined: r.created_at }));
    await audit(context.userId, "export_customers", "customers", undefined, { count: items.length, format: data.format });

    if (data.format === "json") {
      return { mime: "application/json", filename: `customers-${Date.now()}.json`, body: JSON.stringify(items, null, 2) };
    }
    if (data.format === "vcard") {
      const body = items.map((c) => `BEGIN:VCARD\nVERSION:3.0\nFN:${c.name || c.phone || c.email}\nTEL:${c.phone}\nEMAIL:${c.email}\nEND:VCARD`).join("\n");
      return { mime: "text/vcard", filename: `customers-${Date.now()}.vcf`, body };
    }
    const header = "id,name,phone,email,joined";
    const body = [header, ...items.map((c) => [c.id, c.name, c.phone, c.email, c.joined].map(csv).join(","))].join("\n");
    return { mime: "text/csv", filename: `customers-${Date.now()}.csv`, body };
  });

function csv(v: any): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// Send a promo / notification to one or many customers (with optional push)
export const sendPromoNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      customerIds: z.array(z.string().uuid()).min(1).max(5000),
      title: z.string().min(1).max(200),
      message: z.string().max(2000).optional(),
      link_url: z.string().max(500).optional(),
      type: z.enum(["promo", "update", "general"]).default("promo"),
      priority: z.enum(["low", "normal", "high"]).default("normal"),
      scheduled_at: z.string().datetime().optional(),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase as any, context.userId);
    const sb: any = adminClient();
    const rows = data.customerIds.map((uid) => ({
      user_id: uid,
      title: data.title,
      message: data.message ?? null,
      link_url: data.link_url ?? null,
      type: data.type,
      priority: data.priority,
      scheduled_at: data.scheduled_at ?? null,
    }));
    const { error } = await sb.from("notifications").insert(rows);
    if (error) throw new Error(error.message);

    // Best-effort web push for each (uses existing send-push edge function)
    if (!data.scheduled_at) {
      Promise.allSettled(
        data.customerIds.map((uid) =>
          sb.functions.invoke("send-push", {
            body: {
              user_id: uid,
              payload: { title: data.title, body: data.message ?? "", url: data.link_url ?? "/", tag: `promo-${Date.now()}` },
            },
          })
        )
      ).catch(() => {});
    }

    await audit(context.userId, "send_promo", "customers", undefined, { count: data.customerIds.length, title: data.title });
    return { sent: data.customerIds.length };
  });

// Open or reuse a support thread and post an admin message in it
export const sendInboxMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      customerId: z.string().uuid(),
      content: z.string().min(1).max(5000),
      subject: z.string().max(200).optional(),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase as any, context.userId);
    const sb: any = adminClient();
    let { data: conv } = await sb
      .from("support_conversations")
      .select("id")
      .eq("user_id", data.customerId)
      .eq("status", "open")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!conv) {
      const { data: created, error } = await sb.from("support_conversations").insert({
        user_id: data.customerId,
        subject: data.subject ?? "Message from support",
        status: "open",
        is_ai: false,
        assigned_to: context.userId,
      }).select("id").single();
      if (error) throw new Error(error.message);
      conv = created;
    }
    const { error: msgErr } = await sb.from("support_messages").insert({
      conversation_id: conv!.id,
      sender_id: context.userId,
      sender_type: "admin",
      content: data.content,
    });
    if (msgErr) throw new Error(msgErr.message);
    await sb.from("support_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conv!.id);
    await audit(context.userId, "send_inbox", "customer", data.customerId);
    return { conversationId: conv!.id };
  });

// Tags
export const listCustomerTags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase as any, context.userId);
    const sb: any = adminClient();
    const { data } = await sb.from("customer_tags").select("*").order("name");
    return data ?? [];
  });

export const createCustomerTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ name: z.string().min(1).max(40), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6366f1") }).parse(input))
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase as any, context.userId);
    const sb: any = adminClient();
    const { data: row, error } = await sb.from("customer_tags").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const setCustomerTags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ customerIds: z.array(z.string().uuid()).min(1), tagIds: z.array(z.string().uuid()) }).parse(input))
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase as any, context.userId);
    const sb: any = adminClient();
    const rows = data.customerIds.flatMap((cid) => data.tagIds.map((tid) => ({ customer_id: cid, tag_id: tid })));
    if (rows.length === 0) return { ok: true };
    await sb.from("customer_tag_assignments").upsert(rows, { onConflict: "customer_id,tag_id", ignoreDuplicates: true });
    await audit(context.userId, "tag_customers", "customers", undefined, { customers: data.customerIds.length, tags: data.tagIds.length });
    return { ok: true };
  });

export const addCustomerNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ customerId: z.string().uuid(), body: z.string().min(1).max(2000) }).parse(input))
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase as any, context.userId);
    const sb: any = adminClient();
    const { data: row, error } = await sb.from("customer_notes").insert({ customer_id: data.customerId, author_id: context.userId, body: data.body }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

// Engagement timeline + email analytics for the customer detail drawer
export const getCustomerEngagement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ customerId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase as any, context.userId);
    const sb: any = adminClient();

    // Resolve email for this customer
    const { data: au } = await sb.auth.admin.getUserById(data.customerId);
    const email = (au?.user?.email ?? "").toLowerCase();

    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 180).toISOString();
    const [ordersRes, recipRes, notifRes] = await Promise.all([
      sb.from("orders").select("created_at, total, status").eq("user_id", data.customerId).gte("created_at", since),
      email
        ? sb.from("email_campaign_recipients").select("sent_at, opened_at, clicked_at, bounced_at, status").eq("email", email).gte("created_at", since)
        : Promise.resolve({ data: [] as any[] }),
      sb.from("notifications").select("created_at, is_read").eq("user_id", data.customerId).gte("created_at", since),
    ]);

    const buckets = new Map<string, { month: string; orders: number; revenue: number; sent: number; opened: number; clicked: number; notifs: number }>();
    const monthKey = (iso: string) => iso.slice(0, 7);
    const bump = (iso: string, key: "orders" | "sent" | "opened" | "clicked" | "notifs", inc = 1, rev = 0) => {
      const k = monthKey(iso);
      const b = buckets.get(k) ?? { month: k, orders: 0, revenue: 0, sent: 0, opened: 0, clicked: 0, notifs: 0 };
      (b as any)[key] = ((b as any)[key] ?? 0) + inc;
      b.revenue += rev;
      buckets.set(k, b);
    };

    (ordersRes.data ?? []).forEach((o: any) => bump(o.created_at, "orders", 1, Number(o.total ?? 0)));
    (recipRes.data ?? []).forEach((r: any) => {
      if (r.sent_at) bump(r.sent_at, "sent");
      if (r.opened_at) bump(r.opened_at, "opened");
      if (r.clicked_at) bump(r.clicked_at, "clicked");
    });
    (notifRes.data ?? []).forEach((n: any) => bump(n.created_at, "notifs"));

    const series = Array.from(buckets.values()).sort((a, b) => a.month.localeCompare(b.month));

    const totalSent = (recipRes.data ?? []).filter((r: any) => r.sent_at).length;
    const totalOpened = (recipRes.data ?? []).filter((r: any) => r.opened_at).length;
    const totalClicked = (recipRes.data ?? []).filter((r: any) => r.clicked_at).length;
    const totalBounced = (recipRes.data ?? []).filter((r: any) => r.bounced_at).length;
    const openRate = totalSent ? Math.round((totalOpened / totalSent) * 100) : 0;
    const clickRate = totalSent ? Math.round((totalClicked / totalSent) * 100) : 0;

    return {
      email,
      series,
      email_stats: { sent: totalSent, opened: totalOpened, clicked: totalClicked, bounced: totalBounced, open_rate: openRate, click_rate: clickRate },
    };
  });

// Preview an audience size before sending
export const previewCampaignAudience = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      audience_type: z.enum(["subscribers", "customers", "custom"]),
      audience_filter: z.any().optional(),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase as any, context.userId);
    const sb: any = adminClient();
    let recipients = 0;
    let sample: string[] = [];
    if (data.audience_type === "subscribers") {
      const { data: subs } = await sb.from("email_subscriptions").select("email").eq("is_active", true).limit(5000);
      recipients = subs?.length ?? 0;
      sample = (subs ?? []).slice(0, 5).map((s: any) => s.email);
    } else if (data.audience_type === "customers") {
      const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const emails = (list?.users ?? []).filter((u: any) => u.email).map((u: any) => u.email!);
      recipients = emails.length;
      sample = emails.slice(0, 5);
    } else if (Array.isArray(data.audience_filter?.emails)) {
      recipients = data.audience_filter.emails.length;
      sample = data.audience_filter.emails.slice(0, 5);
    }
    const { data: suppressed } = await sb.from("email_suppressions").select("email");
    return { recipients, sample, suppressed: suppressed?.length ?? 0 };
  });
