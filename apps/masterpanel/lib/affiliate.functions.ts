import { createServerFn } from "@/lib/server-fn-compat";
import { getRequest } from "@/lib/server-fn-compat.server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hashIp, parseUA } from "./affiliate.server";

// ============ PUBLIC ============

export const getAffiliateSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("affiliate_settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
});

export const trackAffiliateClick = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    ref_code: z.string().min(1).max(64),
    landing_url: z.string().max(2000).optional(),
    referrer: z.string().max(2000).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { data: affiliate } = await supabaseAdmin
      .from("affiliate_accounts")
      .select("id")
      .eq("code", data.ref_code)
      .eq("status", "approved")
      .maybeSingle();
    if (!affiliate) return { ok: false };

    const req = getRequest();
    const ip = req?.headers.get("cf-connecting-ip") || req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const ua = req?.headers.get("user-agent") || null;
    const { device } = parseUA(ua);

    await supabaseAdmin.from("affiliate_clicks").insert({
      affiliate_id: affiliate.id,
      ref_code: data.ref_code,
      landing_url: data.landing_url ?? null,
      referrer: data.referrer ?? null,
      ip_hash: hashIp(ip),
      user_agent: ua,
      device,
    });
    
    // increment counter
    const { data: acct } = await supabaseAdmin
      .from("affiliate_accounts").select("total_clicks").eq("id", affiliate.id).single();
    await supabaseAdmin.from("affiliate_accounts")
      .update({ total_clicks: (acct?.total_clicks ?? 0) + 1 })
      .eq("id", affiliate.id);
    return { ok: true };
  });

export const attributeSignup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ ref_code: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: affiliate } = await supabaseAdmin
      .from("affiliate_accounts").select("id, user_id, total_signups")
      .eq("code", data.ref_code).eq("status", "approved").maybeSingle();
    if (!affiliate || affiliate.user_id === userId) return { ok: false };

    const { data: existing } = await supabaseAdmin
      .from("affiliate_referrals").select("id").eq("referred_user_id", userId).maybeSingle();
    if (existing) return { ok: false, reason: "already_referred" };

    await supabaseAdmin.from("affiliate_referrals").insert({
      affiliate_id: affiliate.id,
      referred_user_id: userId,
      ref_code: data.ref_code,
    });
    await supabaseAdmin.from("affiliate_accounts")
      .update({ total_signups: (affiliate.total_signups ?? 0) + 1 })
      .eq("id", affiliate.id);
    return { ok: true };
  });

// ============ USER ============

export const getMyAffiliateAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("affiliate_accounts").select("*").eq("user_id", context.userId).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const applyForAffiliate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    payout_method: z.string().min(1).max(64),
    payout_details: z.record(z.string(), z.any()).default({}),
    website_url: z.string().max(500).optional(),
    promotion_method: z.string().max(2000).optional(),
    application_notes: z.string().max(2000).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: settings } = await supabaseAdmin
      .from("affiliate_settings").select("*").limit(1).maybeSingle();
    if (!settings?.enabled) throw new Error("Affiliate program is not active.");

    const { data: existing } = await supabaseAdmin
      .from("affiliate_accounts").select("id").eq("user_id", context.userId).maybeSingle();
    if (existing) throw new Error("You already have an affiliate account.");

    const { data: codeRow } = await supabaseAdmin.rpc("generate_affiliate_code");
    const code = (codeRow as string) || Math.random().toString(36).substring(2, 10).toUpperCase();

    const autoApprove = settings.auto_approve;
    const { data: created, error } = await supabaseAdmin.from("affiliate_accounts").insert({
      user_id: context.userId,
      code,
      status: autoApprove ? "approved" : "pending",
      payout_method: data.payout_method,
      payout_details: data.payout_details,
      website_url: data.website_url,
      promotion_method: data.promotion_method,
      application_notes: data.application_notes,
      approved_at: autoApprove ? new Date().toISOString() : null,
    }).select().single();
    if (error) throw new Error(error.message);
    return created;
  });

export const getMyAffiliateStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: acct } = await context.supabase
      .from("affiliate_accounts").select("*").eq("user_id", context.userId).maybeSingle();
    if (!acct) return null;

    const [{ data: clicks }, { data: refs }, { data: commissions }, { data: payouts }] = await Promise.all([
      context.supabase.from("affiliate_clicks").select("*").eq("affiliate_id", acct.id).order("created_at", { ascending: false }).limit(100),
      context.supabase.from("affiliate_referrals").select("*").eq("affiliate_id", acct.id).order("created_at", { ascending: false }).limit(100),
      context.supabase.from("affiliate_commissions").select("*").eq("affiliate_id", acct.id).order("created_at", { ascending: false }).limit(100),
      context.supabase.from("affiliate_payouts").select("*").eq("affiliate_id", acct.id).order("created_at", { ascending: false }).limit(50),
    ]);

    return { account: acct, clicks: clicks ?? [], referrals: refs ?? [], commissions: commissions ?? [], payouts: payouts ?? [] };
  });

export const updateMyPayoutMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    payout_method: z.string().min(1).max(64),
    payout_details: z.record(z.string(), z.any()),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("affiliate_accounts")
      .update({ payout_method: data.payout_method, payout_details: data.payout_details })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const requestPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ amount: z.number().positive() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: acct } = await supabaseAdmin
      .from("affiliate_accounts").select("*").eq("user_id", context.userId).single();
    if (!acct || acct.status !== "approved") throw new Error("Affiliate not approved.");

    const { data: settings } = await supabaseAdmin
      .from("affiliate_settings").select("min_payout").limit(1).single();
    const min = Number(settings?.min_payout ?? 0);
    if (data.amount < min) throw new Error(`Minimum payout is ${min}`);
    if (data.amount > Number(acct.available_balance)) throw new Error("Insufficient balance.");
    if (!acct.payout_method) throw new Error("Please set a payout method first.");

    const { data: payout, error } = await supabaseAdmin.from("affiliate_payouts").insert({
      affiliate_id: acct.id,
      amount: data.amount,
      method: acct.payout_method,
      details: acct.payout_details ?? {},
    }).select().single();
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("affiliate_accounts").update({
      available_balance: Number(acct.available_balance) - data.amount,
      pending_balance: Number(acct.pending_balance) + data.amount,
    }).eq("id", acct.id);

    return payout;
  });

// ============ ADMIN ============

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const adminUpdateAffiliateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    enabled: z.boolean().optional(),
    status_message: z.string().max(500).optional(),
    program_name: z.string().max(120).optional(),
    program_description: z.string().max(2000).optional(),
    commission_rate: z.number().min(0).max(100).optional(),
    min_payout: z.number().min(0).optional(),
    cookie_days: z.number().int().min(1).max(365).optional(),
    auto_approve: z.boolean().optional(),
    approval_required: z.boolean().optional(),
    terms_md: z.string().max(50000).optional(),
    payout_methods: z.array(z.string()).optional(),
    benefits: z.array(z.any()).optional(),
    faq: z.array(z.any()).optional(),
    display_style: z.enum(["console", "editorial", "pulse"]).optional(),
    referral_bonus: z.number().min(0).optional(),
    holding_period_days: z.number().int().min(0).max(365).optional(),
    allow_self_referral: z.boolean().optional(),
    attribution_model: z.enum(["last_click", "first_click"]).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: existing } = await supabaseAdmin.from("affiliate_settings").select("id").limit(1).maybeSingle();
    if (existing) {
      const { error } = await supabaseAdmin.from("affiliate_settings").update(data).eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("affiliate_settings").insert(data);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminListAffiliates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ status: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = supabaseAdmin.from("affiliate_accounts").select("*").order("created_at", { ascending: false });
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    // hydrate profiles
    const ids = (rows ?? []).map((r) => r.user_id);
    const { data: profs } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, full_name, avatar_url").in("id", ids)
      : { data: [] as any[] };
    const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return (rows ?? []).map((r) => ({ ...r, profile: map.get(r.user_id) ?? null }));
  });

export const adminUpdateAffiliate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    status: z.enum(["pending", "approved", "rejected", "suspended"]).optional(),
    custom_rate: z.number().min(0).max(100).nullable().optional(),
    tier: z.string().optional(),
    rejection_reason: z.string().max(500).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const update: any = { ...data };
    delete update.id;
    if (data.status === "approved") {
      update.approved_at = new Date().toISOString();
      update.approved_by = context.userId;
    }
    const { error } = await supabaseAdmin.from("affiliate_accounts").update(update).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListPayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ status: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = supabaseAdmin.from("affiliate_payouts").select("*, affiliate:affiliate_accounts(id, code, user_id)").order("created_at", { ascending: false });
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminProcessPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    action: z.enum(["approve", "paid", "reject", "note"]),
    txn_reference: z.string().max(200).optional(),
    rejection_reason: z.string().max(500).optional(),
    admin_notes: z.string().max(2000).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: payout } = await supabaseAdmin.from("affiliate_payouts").select("*").eq("id", data.id).single();
    if (!payout) throw new Error("Payout not found");

    const update: any = { admin_notes: data.admin_notes };

    if (data.action !== "note") {
      update.processed_at = new Date().toISOString();
      update.processed_by = context.userId;
    }

    if (data.action === "approve") update.status = "processing";
    if (data.action === "paid") {
      update.status = "paid";
      update.txn_reference = data.txn_reference;
      const { data: acct } = await supabaseAdmin.from("affiliate_accounts").select("*").eq("id", payout.affiliate_id).single();
      if (acct) {
        await supabaseAdmin.from("affiliate_accounts").update({
          pending_balance: Math.max(0, Number(acct.pending_balance) - Number(payout.amount)),
          lifetime_paid: Number(acct.lifetime_paid) + Number(payout.amount),
        }).eq("id", acct.id);
      }
    }
    if (data.action === "reject") {
      update.status = "rejected";
      update.rejection_reason = data.rejection_reason;
      const { data: acct } = await supabaseAdmin.from("affiliate_accounts").select("*").eq("id", payout.affiliate_id).single();
      if (acct) {
        await supabaseAdmin.from("affiliate_accounts").update({
          pending_balance: Math.max(0, Number(acct.pending_balance) - Number(payout.amount)),
          available_balance: Number(acct.available_balance) + Number(payout.amount),
        }).eq("id", acct.id);
      }
    }

    const { error } = await supabaseAdmin.from("affiliate_payouts").update(update).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminGetAffiliateDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);

    const [
      { count: total_affiliates },
      { count: pending_applications },
      { count: approved_affiliates },
      { data: top },
      { data: recent_clicks },
      { data: pending_payouts },
      { data: commissions_agg },
      { data: order_counts },
    ] = await Promise.all([
      supabaseAdmin.from("affiliate_accounts").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("affiliate_accounts").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdmin.from("affiliate_accounts").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabaseAdmin.from("affiliate_accounts").select("id, code, user_id, total_earnings, total_orders, total_clicks").eq("status", "approved").order("total_earnings", { ascending: false }).limit(10),
      supabaseAdmin.from("affiliate_clicks").select("created_at").order("created_at", { ascending: false }).limit(500),
      supabaseAdmin.from("affiliate_payouts").select("amount").eq("status", "requested"),
      supabaseAdmin.from("affiliate_commissions").select("commission_amount, status"),
      supabaseAdmin.from("affiliate_accounts").select("total_orders").eq("status", "approved"),
    ]);

    const totalPending = (pending_payouts ?? []).reduce((s, p) => s + Number(p.amount), 0);
    const totalCommissions = (commissions_agg ?? []).reduce((s, c) => s + Number(c.commission_amount), 0);
    const paidCommissions = (commissions_agg ?? []).filter((c) => c.status === "paid").reduce((s, c) => s + Number(c.commission_amount), 0);
    const totalOrders = (order_counts ?? []).reduce((s, a: any) => s + Number(a.total_orders ?? 0), 0);
    const totalClicks = (recent_clicks ?? []).length;
    const conversionRate = totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0;

    return {
      total_affiliates: total_affiliates ?? 0,
      pending_applications: pending_applications ?? 0,
      approved_affiliates: approved_affiliates ?? 0,
      total_clicks_recent: totalClicks,
      pending_payouts_amount: totalPending,
      total_commissions: totalCommissions,
      paid_commissions: paidCommissions,
      top_affiliates: top ?? [],
      total_orders: totalOrders,
      conversion_rate: conversionRate,
    };
  });

// ============ AMAZON-STYLE EXTENSIONS ============

export const listAffiliateProducts = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({
    search: z.string().max(200).optional(),
    featured: z.boolean().optional(),
    category_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(200).default(60),
  }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const { data: rows } = await supabaseAdmin
      .from("affiliate_products").select("*").eq("is_active", true)
      .order("is_featured", { ascending: false }).order("created_at", { ascending: false }).limit(data.limit);
    const ids = (rows ?? []).map((r) => r.product_id);
    if (!ids.length) return [];
    let q = supabaseAdmin.from("products").select("id, name, slug, thumbnail, price, sale_price, category_id").in("id", ids);
    if (data.search) q = q.ilike("name", `%${data.search}%`);
    if (data.category_id) q = q.eq("category_id", data.category_id);
    const { data: prods } = await q;
    const mapAp = new Map((rows ?? []).map((r) => [r.product_id, r]));
    return (prods ?? []).map((p: any) => ({ ...p, affiliate: mapAp.get(p.id) })).filter((p) => !data.featured || p.affiliate?.is_featured);
  });

export const getMyAffiliateLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: acct } = await context.supabase
      .from("affiliate_accounts").select("id").eq("user_id", context.userId).maybeSingle();
    if (!acct) return [];
    const { data, error } = await context.supabase
      .from("affiliate_product_links").select("*").eq("affiliate_id", acct.id).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createAffiliateLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    product_id: z.string().uuid().nullable().optional(),
    target_url: z.string().min(1).max(2000),
    label: z.string().max(120).optional(),
    utm_source: z.string().max(64).optional(),
    utm_medium: z.string().max(64).optional(),
    utm_campaign: z.string().max(64).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: acct } = await supabaseAdmin
      .from("affiliate_accounts").select("id, code, status").eq("user_id", context.userId).single();
    if (!acct || acct.status !== "approved") throw new Error("Affiliate not approved.");
    const slug = `${acct.code.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`;
    const { data: row, error } = await supabaseAdmin.from("affiliate_product_links").insert({
      affiliate_id: acct.id,
      product_id: data.product_id ?? null,
      slug,
      target_url: data.target_url,
      label: data.label,
      utm_source: data.utm_source,
      utm_medium: data.utm_medium,
      utm_campaign: data.utm_campaign,
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteAffiliateLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: acct } = await supabaseAdmin
      .from("affiliate_accounts").select("id").eq("user_id", context.userId).single();
    if (!acct) throw new Error("No affiliate account");
    const { error } = await supabaseAdmin.from("affiliate_product_links")
      .delete().eq("id", data.id).eq("affiliate_id", acct.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAffiliateCreatives = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await supabaseAdmin.from("affiliate_creatives").select("*").eq("is_active", true).order("created_at", { ascending: false });
  return data ?? [];
});

// ============ ADMIN ============

export const adminListAffiliateProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: rows } = await supabaseAdmin.from("affiliate_products").select("*").order("created_at", { ascending: false });
    const ids = (rows ?? []).map((r) => r.product_id);
    const { data: prods } = ids.length
      ? await supabaseAdmin.from("products").select("id, name, slug, thumbnail, price, category_id").in("id", ids)
      : { data: [] as any[] };
    const map = new Map((prods ?? []).map((p: any) => [p.id, p]));
    return (rows ?? []).map((r) => ({ ...r, product: map.get(r.product_id) ?? null }));
  });

export const adminUpsertAffiliateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    product_id: z.string().uuid(),
    override_rate: z.number().min(0).max(100).nullable().optional(),
    is_featured: z.boolean().optional(),
    is_active: z.boolean().optional(),
    bonus_amount: z.number().min(0).optional(),
    notes: z.string().max(2000).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin.from("affiliate_products").upsert(data, { onConflict: "product_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminBulkEnrollProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    product_ids: z.array(z.string().uuid()).min(1).max(500),
    override_rate: z.number().min(0).max(100).nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const rows = data.product_ids.map((id) => ({ product_id: id, override_rate: data.override_rate ?? null, is_active: true }));
    const { error } = await supabaseAdmin.from("affiliate_products").upsert(rows, { onConflict: "product_id" });
    if (error) throw new Error(error.message);
    return { ok: true, count: rows.length };
  });

export const adminRemoveAffiliateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin.from("affiliate_products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListCategoryRates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: rows } = await supabaseAdmin.from("affiliate_category_rates").select("*").order("created_at", { ascending: false });
    const ids = (rows ?? []).map((r) => r.category_id);
    const { data: cats } = ids.length
      ? await supabaseAdmin.from("categories").select("id, name, slug").in("id", ids)
      : { data: [] as any[] };
    const map = new Map((cats ?? []).map((c: any) => [c.id, c]));
    return (rows ?? []).map((r) => ({ ...r, category: map.get(r.category_id) ?? null }));
  });

export const adminUpsertCategoryRate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    category_id: z.string().uuid(),
    rate: z.number().min(0).max(100),
    is_active: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin.from("affiliate_category_rates").upsert(data, { onConflict: "category_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteCategoryRate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin.from("affiliate_category_rates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListCreatives = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data } = await supabaseAdmin.from("affiliate_creatives").select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

export const adminUpsertCreative = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid().optional(),
    title: z.string().min(1).max(200),
    type: z.enum(["banner", "text", "video", "social"]).default("banner"),
    content: z.string().max(5000).optional(),
    image_url: z.string().max(1000).optional(),
    target_url: z.string().max(1000).optional(),
    is_active: z.boolean().default(true),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.id) {
      const { id, ...up } = data;
      const { error } = await supabaseAdmin.from("affiliate_creatives").update(up).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("affiliate_creatives").insert(data);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminDeleteCreative = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin.from("affiliate_creatives").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSearchProductsForAffiliate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ q: z.string().max(200).optional(), limit: z.number().int().min(1).max(100).default(40) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = supabaseAdmin.from("products").select("id, name, slug, thumbnail, price, category_id").eq("is_active", true).limit(data.limit);
    if (data.q) q = q.ilike("name", `%${data.q}%`);
    const { data: rows } = await q;
    return rows ?? [];
  });

export const adminListCommissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ status: z.string().optional(), limit: z.number().int().max(500).default(200) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = supabaseAdmin.from("affiliate_commissions").select("*, affiliate:affiliate_accounts(id, code, user_id)").order("created_at", { ascending: false }).limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows } = await q;
    return rows ?? [];
  });

export const adminAdjustCommission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    status: z.enum(["pending", "approved", "paid", "reversed"]).optional(),
    commission_amount: z.number().min(0).optional(),
    notes: z.string().max(2000).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { id, ...up } = data;
    const { error } = await supabaseAdmin.from("affiliate_commissions").update(up).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// code:4ce0
