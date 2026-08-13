"use server";

import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Invoice designer settings — persisted as a single row in
 * public.site_settings under key = 'invoice_settings'. Any admin can edit;
 * anyone (including anon) can read the settings so guest invoices render
 * with the same branding.
 */

export const InvoiceSettingsSchema = z.object({
  preset: z.enum(["classic", "modern", "minimal", "bold", "custom"]).default("classic"),
  accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#0F172A"),
  text_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#0F172A"),
  muted_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#64748B"),
  bg_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#FFFFFF"),
  font_family: z.string().max(80).default("Inter"),
  heading_font_family: z.string().max(80).default("Inter"),
  font_size: z.number().int().min(8).max(24).default(12),
  show_logo: z.boolean().default(true),
  show_brand_mark: z.boolean().default(true),
  show_invoice_number: z.boolean().default(true),
  show_order_number: z.boolean().default(true),
  show_issue_date: z.boolean().default(true),
  show_due_date: z.boolean().default(false),
  show_billing_address: z.boolean().default(true),
  show_shipping_address: z.boolean().default(true),
  show_customer_email: z.boolean().default(true),
  show_customer_phone: z.boolean().default(true),
  show_item_sku: z.boolean().default(true),
  show_item_image: z.boolean().default(false),
  show_subtotal: z.boolean().default(true),
  show_shipping_fee: z.boolean().default(true),
  show_tax: z.boolean().default(true),
  show_discount: z.boolean().default(true),
  show_total: z.boolean().default(true),
  show_payment_method: z.boolean().default(true),
  show_tracking_number: z.boolean().default(true),
  show_notes: z.boolean().default(true),
  show_footer: z.boolean().default(true),
  header_text: z.string().max(400).default(""),
  footer_text: z.string().max(800).default("Thank you for your business."),
  notes_text: z.string().max(2000).default(""),
  terms_text: z.string().max(4000).default(""),
  advanced_mode: z.boolean().default(false),
  advanced_html: z.string().max(60000).default(""),
});

export type InvoiceSettings = z.infer<typeof InvoiceSettingsSchema>;

export const getInvoiceSettings = createServerFn({ method: "GET" }).handler(
  async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const sb = createClient(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data } = await sb
      .from("site_settings")
      .select("value")
      .eq("key", "invoice_settings")
      .maybeSingle();
    const parsed = InvoiceSettingsSchema.safeParse(data?.value ?? {});
    return parsed.success ? parsed.data : InvoiceSettingsSchema.parse({});
  },
);

export const saveInvoiceSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InvoiceSettingsSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Require admin/manager role
    const { data: isAdmin } = await supabase.rpc("has_any_role", {
      _user_id: userId,
      _roles: ["admin", "manager", "moderator"],
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "invoice_settings", value: data }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
