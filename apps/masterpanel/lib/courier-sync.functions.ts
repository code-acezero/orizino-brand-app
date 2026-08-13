"use server";

import { createServerFn } from "@orizino/shared/lib/server-fn-compat";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const InputSchema = z.object({ minutes: z.number().int().min(5).max(1440) });

export const rescheduleCourierSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: expr, error } = await supabase.rpc("admin_reschedule_courier_sync", {
      _minutes: data.minutes,
    });
    if (error) throw new Error(error.message);

    await supabase
      .from("site_settings")
      .upsert({
        key: "courier_settings",
        value: { enabled: true, sync_interval_minutes: data.minutes } as any,
      });

    return { ok: true, cron_expression: expr as string };
  });
