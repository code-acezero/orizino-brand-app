import { createServerFn } from "@orizino/shared/lib/server-fn-compat";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

function publicClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined as any },
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

export const getPublicIdentity = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({
      slug: z.string().min(1).max(80),
      source: z.enum(["qr", "nfc", "share", "direct"]).optional(),
      userAgent: z.string().max(500).optional(),
      referrer: z.string().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    let { data: row, error } = await (sb as any)
      .from("employee_identity_public")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();

    if (!row && !error) {
      const { data: rowIlike } = await (sb as any)
        .from("employee_identity_public")
        .select("*")
        .ilike("slug", data.slug)
        .maybeSingle();
      row = rowIlike;
    }

    if (error) return { identity: null as any, error: error.message };
    if (!row) return { identity: null as any, error: null };
    // Fire-and-forget scan recording (SECURITY DEFINER RPC handles counters).
    (sb as any).rpc("record_identity_scan", {
      _slug: row.slug || data.slug,
      _source: data.source ?? "direct",
      _user_agent: data.userAgent ?? null,
      _referrer: data.referrer ?? null,
    }).then(() => {}).catch(() => {});
    return { identity: row, error: null };
  });
