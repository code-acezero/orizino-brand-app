"use server";

import { createServerFn } from "@orizino/shared/lib/server-fn-compat";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getCourierSyncStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_courier_sync_status");
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    return {
      schedule: (row?.schedule as string | null) ?? null,
      active: !!row?.active,
      last_run_at: (row?.last_run_at as string | null) ?? null,
      last_status: (row?.last_status as string | null) ?? null,
      server_now: (row?.server_now as string | null) ?? new Date().toISOString(),
    };
  });
