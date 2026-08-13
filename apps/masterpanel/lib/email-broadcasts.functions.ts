"use server";

import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertMarketing(sb: any, userId: string) {
  const { data } = await sb.rpc("has_any_role", {
    _user_id: userId,
    _roles: ["admin", "marketing", "manager"] as any,
  });
  if (!data) throw new Error("Forbidden: marketing/admin only");
}

function siteUrl() {
  return (
    process.env.SITE_URL ||
    "https://project--5f6e4f1b-fef3-4515-994e-c3cb9b45f3f0.lovable.app"
  );
}

function esc(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function productsHtml(products: Array<any>, siteName: string): string {
  const base = siteUrl();
  const cards = products
    .map((p) => {
      const url = `${base}/product/${esc(p.slug)}`;
      const img = p.thumbnail || (p.images && p.images[0]) || "";
      const price = Number(p.price ?? 0).toFixed(2);
      const compare =
        p.compare_at_price && Number(p.compare_at_price) > Number(p.price)
          ? `<span style="text-decoration:line-through;color:#9ca3af;margin-left:8px;font-size:14px">$${Number(p.compare_at_price).toFixed(2)}</span>`
          : "";
      return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;background:#fff">
        <tr>
          ${img ? `<td width="180" style="vertical-align:top"><a href="${url}"><img src="${esc(img)}" width="180" height="180" alt="${esc(p.name)}" style="display:block;width:180px;height:180px;object-fit:cover"/></a></td>` : ""}
          <td style="padding:18px 20px;vertical-align:top">
            <h3 style="margin:0 0 6px 0;font-family:system-ui,-apple-system,sans-serif;font-size:18px;color:#111827">
              <a href="${url}" style="color:#111827;text-decoration:none">${esc(p.name)}</a>
            </h3>
            ${p.short_description ? `<p style="margin:0 0 12px 0;font-family:system-ui;font-size:13px;color:#6b7280;line-height:1.5">${esc(p.short_description)}</p>` : ""}
            <p style="margin:0 0 14px 0;font-family:system-ui;font-size:18px;font-weight:700;color:#111827">$${price}${compare}</p>
            <a href="${url}" style="display:inline-block;background:#111827;color:#fff;padding:10px 18px;border-radius:999px;font-family:system-ui;font-size:13px;font-weight:600;text-decoration:none">View product →</a>
          </td>
        </tr>
      </table>`;
    })
    .join("");

  return `<!doctype html><html><body style="margin:0;padding:0;background:#f9fafb">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 0">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
          <tr><td style="padding:0 16px 24px 16px;text-align:center">
            <h1 style="margin:0;font-family:system-ui,-apple-system,sans-serif;font-size:26px;color:#111827">New arrivals from ${esc(siteName)}</h1>
            <p style="margin:8px 0 0 0;font-family:system-ui;font-size:14px;color:#6b7280">Fresh picks we think you'll love.</p>
          </td></tr>
          <tr><td style="padding:0 16px">${cards}</td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

function categoryHtml(category: any, siteName: string): string {
  const base = siteUrl();
  const url = `${base}/categories/${esc(category.slug)}`;
  const img = category.image_url || category.banner_url || "";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f9fafb">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 0">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
          ${img ? `<tr><td><img src="${esc(img)}" alt="${esc(category.name)}" width="600" style="display:block;width:100%;height:240px;object-fit:cover"/></td></tr>` : ""}
          <tr><td style="padding:32px 28px;text-align:center;font-family:system-ui,-apple-system,sans-serif">
            <p style="margin:0 0 6px 0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#6b7280">${esc(siteName)} · new category</p>
            <h1 style="margin:0 0 12px 0;font-size:28px;color:#111827">${esc(category.name)}</h1>
            ${category.description ? `<p style="margin:0 0 22px 0;font-size:14px;color:#4b5563;line-height:1.6">${esc(category.description)}</p>` : ""}
            <a href="${url}" style="display:inline-block;background:#111827;color:#fff;padding:12px 26px;border-radius:999px;font-size:14px;font-weight:600;text-decoration:none">Explore the collection →</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

async function siteName(sb: any): Promise<string> {
  const { data } = await sb
    .from("site_settings")
    .select("value")
    .eq("key", "site_name")
    .maybeSingle();
  const v: any = data?.value;
  return (typeof v === "object" ? v?.value : v) ?? "Our Store";
}

async function resolveUpdatesSender(sb: any): Promise<{
  from_name: string;
  from_email: string;
  reply_to?: string;
}> {
  const { data } = await sb
    .from("site_settings")
    .select("value")
    .eq("key", "email_senders")
    .maybeSingle();
  const senders = (data?.value as any)?.senders ?? [];
  const updates =
    senders.find((s: any) => s.category === "updates") ||
    senders.find((s: any) => s.is_default) ||
    senders[0];
  return {
    from_name: updates?.from_name || (await siteName(sb)),
    from_email:
      updates?.from_email ||
      process.env.RESEND_FROM_EMAIL ||
      "team@orizino.com",
    reply_to: updates?.reply_to || "contact.orizino@gmail.com",
  };
}

export const notifyAboutProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        productIds: z.array(z.string().uuid()).min(1).max(50),
        audience_type: z.enum(["subscribers", "customers"]).default("subscribers"),
        subject: z.string().max(300).optional(),
        sendNow: z.boolean().default(true),
      })
      .parse(i)
  )
  .handler(async ({ context, data }) => {
    await assertMarketing(context.supabase, context.userId);
    const sb: any = supabaseAdmin;
    const { data: products, error } = await sb
      .from("products")
      .select("id, name, slug, price, compare_at_price, thumbnail, images, short_description")
      .in("id", data.productIds)
      .eq("is_active", true);
    if (error) throw new Error(error.message);
    if (!products || products.length === 0) throw new Error("No active products found");

    const name = await siteName(sb);
    const sender = await resolveUpdatesSender(sb);
    const html = productsHtml(products, name);
    const subject =
      data.subject ||
      (products.length === 1
        ? `Just in: ${products[0].name}`
        : `${products.length} new arrivals at ${name}`);

    const { data: campaign, error: cErr } = await sb
      .from("email_campaigns")
      .insert({
        name: `Product notify — ${new Date().toLocaleString()}`,
        subject,
        html,
        from_name: sender.from_name,
        from_email: sender.from_email,
        reply_to: sender.reply_to,
        audience_type: data.audience_type,
        audience_filter: {},
        status: data.sendNow ? "scheduled" : "draft",
        schedule_at: data.sendNow ? new Date().toISOString() : null,
        created_by: context.userId,
      })
      .select()
      .single();
    if (cErr) throw new Error(cErr.message);
    return { campaign };
  });

export const notifyAboutCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        categoryId: z.string().uuid(),
        audience_type: z.enum(["subscribers", "customers"]).default("subscribers"),
        subject: z.string().max(300).optional(),
        sendNow: z.boolean().default(true),
      })
      .parse(i)
  )
  .handler(async ({ context, data }) => {
    await assertMarketing(context.supabase, context.userId);
    const sb: any = supabaseAdmin;
    const { data: category, error } = await sb
      .from("categories")
      .select("id, name, slug, description, image_url, banner_url")
      .eq("id", data.categoryId)
      .single();
    if (error) throw new Error(error.message);

    const name = await siteName(sb);
    const sender = await resolveUpdatesSender(sb);
    const html = categoryHtml(category, name);
    const subject = data.subject || `Discover our new collection: ${category.name}`;

    const { data: campaign, error: cErr } = await sb
      .from("email_campaigns")
      .insert({
        name: `Category notify — ${category.name}`,
        subject,
        html,
        from_name: sender.from_name,
        from_email: sender.from_email,
        reply_to: sender.reply_to,
        audience_type: data.audience_type,
        audience_filter: {},
        status: data.sendNow ? "scheduled" : "draft",
        schedule_at: data.sendNow ? new Date().toISOString() : null,
        created_by: context.userId,
      })
      .select()
      .single();
    if (cErr) throw new Error(cErr.message);
    return { campaign };
  });
// code:4ce0
