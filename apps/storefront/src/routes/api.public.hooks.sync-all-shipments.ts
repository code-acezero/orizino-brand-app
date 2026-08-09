import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@orizino/shared/lib/router-compat";
import { validateCronOrigin } from "@/lib/cron-guard";

async function getPathaoToken(env: "sandbox" | "live"): Promise<string | null> {
  const prefix = env === "live" ? "PATHAO_LIVE" : "PATHAO_SANDBOX";
  const client_id = process.env[`${prefix}_CLIENT_ID`];
  const client_secret = process.env[`${prefix}_CLIENT_SECRET`];
  const username = process.env[`${prefix}_USERNAME`];
  const password = process.env[`${prefix}_PASSWORD`];
  if (!client_id || !client_secret || !username || !password) return null;
  const host = env === "live" ? "https://api-hermes.pathao.com" : "https://courier-api-sandbox.pathao.com";
  const res = await fetch(`${host}/aladdin/api/v1/issue-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id, client_secret, username, password, grant_type: "password" }),
  });
  if (!res.ok) return null;
  const j = await res.json();
  return j.access_token || null;
}

const TERMINAL_PATHAO = new Set(["delivered", "returned", "cancelled", "returned-to-merchant"]);
const TERMINAL_STEADFAST = new Set(["delivered", "cancelled", "return", "returned"]);

async function syncPathao(sb: any, row: any) {
  const env = (row.environment === "live" ? "live" : "sandbox") as "sandbox" | "live";
  const token = await getPathaoToken(env);
  if (!token) return { ok: false, error: "pathao token unavailable" };
  const host = env === "live" ? "https://api-hermes.pathao.com" : "https://courier-api-sandbox.pathao.com";
  const res = await fetch(`${host}/aladdin/api/v1/orders/${row.consignment_id}/info`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) return { ok: false, error: `pathao ${res.status}` };
  const json = await res.json();
  const d = json?.data || {};
  const status = d.order_status || d.status || row.order_status;
  const status_slug = d.order_status_slug || d.status_slug || row.order_status_slug;
  await sb.from("pathao_shipments").update({
    order_status: status,
    order_status_slug: status_slug,
    raw_response: json,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", row.id);
  return { ok: true, status };
}

async function syncSteadfast(sb: any, row: any) {
  const api_key = process.env.STEADFAST_API_KEY;
  const secret = process.env.STEADFAST_SECRET_KEY;
  if (!api_key || !secret) return { ok: false, error: "steadfast keys missing" };
  const res = await fetch(`https://portal.packzy.com/api/v1/status_by_cid/${row.consignment_id}`, {
    headers: { "Api-Key": api_key, "Secret-Key": secret, "Content-Type": "application/json" },
  });
  if (!res.ok) return { ok: false, error: `steadfast ${res.status}` };
  const json = await res.json();
  const status = json.delivery_status || json.status || row.status;
  await sb.from("steadfast_shipments").update({
    status,
    tracking_message: json.message || row.tracking_message,
    raw_response: json,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", row.id);
  return { ok: true, status };
}

export const Route = createFileRoute("/api/public/hooks/sync-all-shipments")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const wrongHost = validateCronOrigin(request);
        if (wrongHost) return wrongHost;
        const provided =
          request.headers.get("apikey") ||
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
          "";
        const expected = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
        if (!expected || provided !== expected) return new Response("unauthorized", { status: 401 });

        const sb = createClient(
          process.env.SUPABASE_URL!,
          (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY)!,
          { auth: { autoRefreshToken: false, persistSession: false } },
        );

        // Check master toggle
        const { data: setting } = await sb.from("site_settings").select("value").eq("key", "courier_settings").maybeSingle();
        const cfg = (setting?.value as any) || {};
        if (cfg.enabled === false) return Response.json({ ok: true, skipped: "disabled" });

        // Fetch non-terminal shipments
        const { data: pRows } = await sb.from("pathao_shipments").select("*").limit(200);
        const { data: sRows } = await sb.from("steadfast_shipments").select("*").limit(200);

        const results = { pathao: { ok: 0, failed: 0 }, steadfast: { ok: 0, failed: 0 } };

        for (const r of (pRows || []).filter((r: any) => !TERMINAL_PATHAO.has((r.order_status_slug || r.order_status || "").toLowerCase()))) {
          try {
            const out = await syncPathao(sb, r);
            out.ok ? results.pathao.ok++ : results.pathao.failed++;
          } catch { results.pathao.failed++; }
        }
        for (const r of (sRows || []).filter((r: any) => !TERMINAL_STEADFAST.has(String(r.status || "").toLowerCase()))) {
          try {
            const out = await syncSteadfast(sb, r);
            out.ok ? results.steadfast.ok++ : results.steadfast.failed++;
          } catch { results.steadfast.failed++; }
        }

        return Response.json({ ok: true, results, at: new Date().toISOString() });
      },
    },
  },
});
