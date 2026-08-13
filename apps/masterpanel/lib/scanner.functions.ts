"use server";

import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Log a scanner-access event to staff_audit_log.
 * Fires when a staff member opens the scanner tile / screen.
 */
export const logScannerAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      action: z.enum(["scanner_opened", "scanner_scan", "scanner_rejected"]),
      code: z.string().max(200).optional(),
      mode: z.enum(["camera", "hid", "manual"]).optional(),
      reason: z.string().max(200).optional(),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const sb: any = context.supabase;
    await sb.from("staff_audit_log").insert({
      actor_id: context.userId,
      action: data.action,
      entity: "barcode_scanner",
      entity_id: null,
      meta: {
        code: data.code ?? null,
        mode: data.mode ?? null,
        reason: data.reason ?? null,
        at: new Date().toISOString(),
      } as any,
    });
    return { ok: true };
  });
