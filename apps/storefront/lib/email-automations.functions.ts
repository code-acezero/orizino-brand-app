"use server";

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
