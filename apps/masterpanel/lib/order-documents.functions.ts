"use server";

import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertStaff(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const ok = (data || []).some((r: any) => r.role === "admin" || r.role === "moderator");
  if (!ok) throw new Error("Forbidden: staff only");
}

export const removeOrderDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const { data: doc } = await supabaseAdmin
      .from("order_documents")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!doc) throw new Error("Document not found");

    const { error } = await supabaseAdmin.from("order_documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("staff_audit_log").insert({
      actor_id: context.userId,
      action: "gdocs_remove",
      entity: "order_documents",
      entity_id: data.id,
      meta: {
        order_id: doc.order_id,
        doc_type: doc.doc_type,
        external_doc_id: doc.external_doc_id,
        external_url: doc.external_url,
        title: doc.title,
        trigger_reason: doc.trigger_reason,
      },
    });
    return { ok: true };
  });

export const getGdocsSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    const { data } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "gdocs_settings")
      .maybeSingle();
    return (data?.value as Record<string, any>) || {};
  });

const SettingsSchema = z.object({
  invoice_title_template: z.string().min(1).max(200).optional(),
  sticker_title_template: z.string().min(1).max(200).optional(),
  auto_archive: z.record(z.string(), z.boolean()).optional(),
  folders: z
    .object({
      pending: z.string().max(200).optional(),
      paid: z.string().max(200).optional(),
      delivered: z.string().max(200).optional(),
    })
    .optional(),
  edge_url: z.string().max(500).optional(),
  service_role_jwt: z.string().max(2000).optional(),
});

export const updateGdocsSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SettingsSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const { data: cur } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "gdocs_settings")
      .maybeSingle();
    const merged = { ...(cur?.value as object || {}), ...data };
    const { error } = await supabaseAdmin
      .from("site_settings")
      .upsert({ key: "gdocs_settings", value: merged }, { onConflict: "key" });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("staff_audit_log").insert({
      actor_id: context.userId,
      action: "gdocs_settings_update",
      entity: "site_settings",
      entity_id: null,
      meta: { keys: Object.keys(data) },
    });
    return { ok: true, value: merged };
  });
// code:4ce0
