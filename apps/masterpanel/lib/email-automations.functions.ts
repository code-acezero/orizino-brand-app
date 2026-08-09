import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function adminClient() {
  return supabaseAdmin;
}
async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" as any });
  if (!data) throw new Error("Forbidden");
}

export const listAutomations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data } = await adminClient().from("email_automations").select("*, template:email_templates(id, name)").order("created_at", { ascending: false });
    return data ?? [];
  });

export const upsertAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1).max(200),
      event: z.enum([
        "announcement_created", "product_published", "promo_created", "offer_created",
        "popup_created", "category_published", "support_request_created",
        "order_placed", "order_confirmed", "order_shipped", "order_delivered",
        "order_cancelled", "order_returned", "order_refunded",
      ]),
      template_id: z.string().uuid().nullable().optional(),
      subject_override: z.string().max(300).nullable().optional(),
      audience_type: z.enum(["subscribers", "customers", "staff_support", "order_customer"]).default("subscribers"),
      delay_minutes: z.number().min(0).max(10080).default(0),
      quiet_hours_start: z.number().min(0).max(23).nullable().optional(),
      quiet_hours_end: z.number().min(0).max(23).nullable().optional(),
      is_active: z.boolean().default(true),
    }).parse(i)
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = adminClient();
    if (data.id) {
      const { data: row, error } = await sb.from("email_automations").update(data).eq("id", data.id).select().single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await sb.from("email_automations").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    await adminClient().from("email_automations").delete().eq("id", data.id);
    return { ok: true };
  });

// Sample payload used when previewing a rule so template placeholders
// ({{order_number}}, {{first_name}}, etc.) render with realistic values.
const SAMPLE_PAYLOADS: Record<string, Record<string, string>> = {
  order_placed: { order_number: "TEST-1001", first_name: "Alex", full_name: "Alex Rahman", total: "2499", subtotal: "2299", shipping_fee: "200", payment_method: "COD", tracking_number: "", phone: "+880-1XXX-XXXXXX", city: "Dhaka" },
  order_confirmed: { order_number: "TEST-1001", first_name: "Alex", total: "2499" },
  order_shipped: { order_number: "TEST-1001", first_name: "Alex", tracking_number: "SF123456" },
  order_delivered: { order_number: "TEST-1001", first_name: "Alex" },
  order_cancelled: { order_number: "TEST-1001", first_name: "Alex" },
  order_returned: { order_number: "TEST-1001", first_name: "Alex" },
  order_refunded: { order_number: "TEST-1001", first_name: "Alex" },
  announcement_created: { title: "Something new is here", message: "We just launched a summer collection.", link_url: "https://orizino.com" },
  product_published: { name: "Sample Product", slug: "sample-product" },
  promo_created: { code: "WELCOME10", description: "10% off your first order.", discount_type: "percent", discount_value: "10" },
  offer_created: { title: "Free delivery weekend", description: "No shipping fees Fri–Sun." },
  popup_created: { title: "Hi there!", message: "Check out our latest offers.", image_url: "", link_url: "" },
  category_published: { name: "New Category", slug: "new-cat", description: "Browse our new arrivals." },
  support_request_created: { subject: "I need help with my order", type: "chat", user_id: "" },
};

export const sendAutomationTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        automation_id: z.string().uuid().optional(),
        template_id: z.string().uuid().optional(),
        event: z.string().optional(),
        subject_override: z.string().nullable().optional(),
        to: z.string().email(),
      })
      .parse(i),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = adminClient();

    let templateId = data.template_id ?? null;
    let subjectOverride = data.subject_override ?? null;
    let eventName = data.event ?? "order_placed";
    if (data.automation_id) {
      const { data: rule } = await sb
        .from("email_automations")
        .select("template_id, subject_override, event")
        .eq("id", data.automation_id)
        .maybeSingle();
      if (!rule) throw new Error("Automation not found");
      templateId = rule.template_id;
      subjectOverride = rule.subject_override ?? null;
      eventName = rule.event;
    }
    if (!templateId) throw new Error("No template selected");
    const { data: tpl } = await sb
      .from("email_templates")
      .select("subject, html")
      .eq("id", templateId)
      .maybeSingle();
    if (!tpl) throw new Error("Template not found");

    const payload = SAMPLE_PAYLOADS[eventName] ?? {};
    const subject = `[Test] ${subjectOverride || tpl.subject || eventName}`.replace(
      /\{\{\s*(\w+)\s*\}\}/g,
      (_: string, k: string) => (payload[k] == null ? "" : String(payload[k])),
    );
    const html = (tpl.html || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_: string, k: string) =>
      payload[k] == null ? "" : String(payload[k]),
    );

    const { sendBatch, getDefaultSender, logDispatch } = await import("@/lib/resend.server");
    const sender = await getDefaultSender();
    const from = `${sender.from_name} <${sender.from_email}>`;
    const res = await sendBatch([{ from, to: [data.to], subject, html }]);
    const r = res[0];
    await logDispatch({
      purpose: "automation_test",
      event: eventName,
      rule_id: data.automation_id ?? null,
      recipient: data.to,
      subject,
      status: r?.error ? "failed" : "sent",
      provider_id: r?.id ?? null,
      error: r?.error ?? null,
    });
    return { ok: !r?.error, id: r?.id ?? null, error: r?.error ?? null, result: res };
  });


