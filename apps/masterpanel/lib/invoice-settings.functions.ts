"use server";

import { createServerFn } from "@/lib/server-fn-compat";
import { InvoiceSettingsSchema, type InvoiceSettings } from "./invoice-settings.schema";
import { createClient } from "@supabase/supabase-js";

function getAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key, {
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
}

export const getInvoiceSettings = createServerFn({ method: "GET" })
  .handler(async (): Promise<InvoiceSettings> => {
    try {
      const sb = getAdminSupabaseClient();
      const { data, error } = await sb
        .from("site_settings")
        .select("value")
        .eq("key", "invoice_settings")
        .maybeSingle();

      if (error) {
        console.warn("[getInvoiceSettings] Fetch error:", error.message);
      }
      const parsed = InvoiceSettingsSchema.safeParse(data?.value ?? {});
      return parsed.success ? parsed.data : InvoiceSettingsSchema.parse({});
    } catch (err: any) {
      console.error("[getInvoiceSettings] Exception:", err);
      return InvoiceSettingsSchema.parse({});
    }
  });

export const saveInvoiceSettings = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InvoiceSettingsSchema.parse(data))
  .handler(async ({ data }) => {
    const sb = getAdminSupabaseClient();
    const { error } = await sb
      .from("site_settings")
      .upsert({ key: "invoice_settings", value: data }, { onConflict: "key" });

    if (error) {
      console.error("[saveInvoiceSettings] Upsert error:", error);
      throw new Error(error.message);
    }
    return { ok: true };
  });
