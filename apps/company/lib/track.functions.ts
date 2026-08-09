import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";

/**
 * Public /track page server functions — no auth required.
 * Uses SECURITY DEFINER SQL functions with narrow, safe projections.
 */

function publicSb() {
  return (async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    return createClient(process.env.SUPABASE_URL!, key, {
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
  })();
}

export const trackOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    order_number: z.string().min(1).max(60),
    contact: z.string().min(1).max(200),
  }).parse(d))
  .handler(async ({ data }) => {
    const sb = await publicSb();
    const { data: row } = await sb.rpc("lookup_order_for_tracking", {
      _order_number: data.order_number,
      _contact: data.contact,
    });
    const first = Array.isArray(row) ? row[0] : row;
    if (!first) return { found: false as const };
    return { found: true as const, order: first };
  });

export const trackOrderByToken = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    token: z.string().min(8).max(200),
  }).parse(d))
  .handler(async ({ data }) => {
    const sb = await publicSb();
    const { data: row } = await sb.rpc("lookup_order_by_token", { _token: data.token });
    const first = Array.isArray(row) ? row[0] : row;
    if (!first) return { found: false as const };
    return { found: true as const, order: first };
  });
