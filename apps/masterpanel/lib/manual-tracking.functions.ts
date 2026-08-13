"use server";

import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Manual courier tracking:
 *  - Admin pastes a consignment ID for any order.
 *  - We validate immediately against the courier API.
 *  - On success we upsert into pathao_shipments / steadfast_shipments and stamp orders.tracking_number + tracking_courier.
 */

async function assertAdmin(sb: any, userId: string) {
  const { data: ok } = await sb.rpc("has_any_role", { _user_id: userId, _roles: ["admin", "moderator"] });
  if (!ok) throw new Error("Forbidden");
}

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
  const data = await res.json();
  return data.access_token || null;
}

async function fetchPathaoInfo(consignmentId: string, env: "sandbox" | "live") {
  const token = await getPathaoToken(env);
  if (!token) return { ok: false, error: "Pathao credentials not configured" };
  const host = env === "live" ? "https://api-hermes.pathao.com" : "https://courier-api-sandbox.pathao.com";
  const res = await fetch(`${host}/aladdin/api/v1/orders/${consignmentId}/info`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (res.status === 404) return { ok: false, error: "Consignment not found in Pathao" };
  if (!res.ok) return { ok: false, error: `Pathao API returned ${res.status}` };
  const json = await res.json();
  return { ok: true as const, data: json };
}

async function fetchSteadfastInfo(consignmentId: string) {
  const api_key = process.env.STEADFAST_API_KEY;
  const secret = process.env.STEADFAST_SECRET_KEY;
  if (!api_key || !secret) return { ok: false, error: "Steadfast credentials not configured" };
  const res = await fetch(`https://portal.packzy.com/api/v1/status_by_cid/${consignmentId}`, {
    headers: { "Api-Key": api_key, "Secret-Key": secret, "Content-Type": "application/json" },
  });
  if (res.status === 404) return { ok: false, error: "Consignment not found in Steadfast" };
  if (!res.ok) return { ok: false, error: `Steadfast API returned ${res.status}` };
  const json = await res.json();
  if (json?.status && json.status !== 200 && json.status !== "delivered" && json.delivery_status === undefined) {
    return { ok: false, error: json?.message || "Consignment not found in Steadfast" };
  }
  return { ok: true as const, data: json };
}

/* ============ Attach manual tracking (validates immediately) ============ */
export const attachManualTracking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      order_id: z.string().uuid(),
      courier: z.enum(["pathao", "steadfast"]),
      consignment_id: z.string().min(3).max(64),
      environment: z.enum(["sandbox", "live"]).default("live").optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const sb: any = context.supabase;
    await assertAdmin(sb, context.userId);

    const { data: order, error } = await sb
      .from("orders").select("id, order_number, user_id").eq("id", data.order_id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found");

    const env = (data.environment || "live") as "sandbox" | "live";
    const cid = data.consignment_id.trim();

    if (data.courier === "pathao") {
      const result = await fetchPathaoInfo(cid, env);
      if (!result.ok) throw new Error(result.error);
      const d = result.data?.data || {};
      const { error: upErr } = await sb.from("pathao_shipments").upsert({
        order_id: data.order_id,
        consignment_id: cid,
        environment: env,
        shipment_type: "delivery",
        order_status: d.order_status || d.status || "pending",
        order_status_slug: d.order_status_slug || d.status_slug || null,
        recipient_city_name: d.recipient_city_name || null,
        recipient_zone_name: d.recipient_zone_name || null,
        delivery_fee: d.delivery_fee || 0,
        cod_amount: d.cod_amount || 0,
        raw_response: result.data,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: "consignment_id" });
      if (upErr) throw new Error(upErr.message);
    } else {
      const result = await fetchSteadfastInfo(cid);
      if (!result.ok) throw new Error(result.error);
      const d = result.data || {};
      const { error: upErr } = await sb.from("steadfast_shipments").upsert({
        order_id: data.order_id,
        consignment_id: cid,
        tracking_code: d.tracking_code || cid,
        status: d.delivery_status || d.status || "pending",
        tracking_message: d.message || null,
        raw_response: result.data,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: "consignment_id" });
      if (upErr) throw new Error(upErr.message);
    }

    await sb.from("orders").update({
      tracking_number: cid,
      tracking_courier: data.courier,
      updated_at: new Date().toISOString(),
    }).eq("id", data.order_id);

    return { ok: true as const, order_number: order.order_number, courier: data.courier, consignment_id: cid };
  });

/* ============ Detach manual tracking ============ */
export const detachManualTracking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb: any = context.supabase;
    await assertAdmin(sb, context.userId);
    const { data: order } = await sb.from("orders").select("id, tracking_courier, tracking_number").eq("id", data.order_id).maybeSingle();
    if (!order) throw new Error("Order not found");
    if (order.tracking_courier === "pathao" && order.tracking_number) {
      await sb.from("pathao_shipments").delete().eq("order_id", data.order_id).eq("consignment_id", order.tracking_number);
    } else if (order.tracking_courier === "steadfast" && order.tracking_number) {
      await sb.from("steadfast_shipments").delete().eq("order_id", data.order_id).eq("consignment_id", order.tracking_number);
    }
    await sb.from("orders").update({ tracking_number: null, tracking_courier: null, updated_at: new Date().toISOString() }).eq("id", data.order_id);
    return { ok: true as const };
  });
