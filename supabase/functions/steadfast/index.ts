// Steadfast Courier API v1 Integration Edge Function
// Supports: create_order, status, sync_status, get_balance, police_stations, return_requests
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const STEADFAST_BASE_URL = "https://portal.packzy.com/api/v1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function cleanPhone(raw: string): string {
  let cleaned = raw.replace(/\D/g, "");
  if (cleaned.startsWith("880") && cleaned.length === 13) {
    cleaned = "0" + cleaned.slice(3);
  }
  return cleaned.slice(-11);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "create-order";

    // 1. Get Steadfast credentials from Env or site_settings
    let apiKey = Deno.env.get("STEADFAST_API_KEY");
    let secretKey = Deno.env.get("STEADFAST_SECRET_KEY");

    if (!apiKey || !secretKey) {
      const { data: settings } = await admin
        .from("site_settings")
        .select("key, value")
        .in("key", ["STEADFAST_API_KEY", "STEADFAST_SECRET_KEY", "steadfast_api_key", "steadfast_secret_key"]);

      settings?.forEach((s: any) => {
        const k = s.key.toLowerCase();
        const val = typeof s.value === "string" ? s.value : s.value?.value;
        if (k.includes("api_key") && val) apiKey = val;
        if (k.includes("secret_key") && val) secretKey = val;
      });
    }

    if (!apiKey || !secretKey) {
      return new Response(
        JSON.stringify({ error: "Steadfast credentials (API Key & Secret Key) are not configured." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeaders = {
      "Api-Key": apiKey,
      "Secret-Key": secretKey,
      "Content-Type": "application/json",
    };

    // ── ACTION: create-order ──────────────────────────────────────────────
    if (action === "create-order" || action === "create_order") {
      const { order_id, invoice, note, item_description, delivery_type = 0, total_lot = 1 } = body;

      let order: any = null;
      if (order_id) {
        const { data: ord, error: ordErr } = await admin
          .from("orders")
          .select("*, order_items(*)")
          .eq("id", order_id)
          .single();
        if (ordErr || !ord) throw new Error("Order not found: " + (ordErr?.message || ""));
        order = ord;
      }

      const shippingAddress = order?.shipping_address || body.shipping_address || {};
      const recipientName = (order?.customer_name || body.recipient_name || "Customer").trim();
      const rawPhone = order?.customer_phone || body.recipient_phone || shippingAddress.phone || "";
      const recipientPhone = cleanPhone(rawPhone);
      const recipientAddress = (
        body.recipient_address ||
        [shippingAddress.address, shippingAddress.area, shippingAddress.city, shippingAddress.postal_code]
          .filter(Boolean)
          .join(", ") ||
        "Dhaka, Bangladesh"
      ).slice(0, 250);

      const isCod = order ? (order.payment_method === "cod" || order.payment_status !== "paid") : (body.is_cod !== false);
      const codAmount = isCod ? Number(body.cod_amount ?? order?.total ?? 0) : 0;
      const orderInvoice = String(invoice || order?.order_number || `ORD-${Date.now()}`);

      let itemDesc = item_description;
      if (!itemDesc && order?.order_items?.length) {
        itemDesc = order.order_items.map((i: any) => `${i.name || "Item"} x${i.quantity || 1}`).join(", ").slice(0, 250);
      }

      const sfPayload = {
        invoice: orderInvoice,
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        recipient_address: recipientAddress,
        recipient_email: order?.customer_email || body.recipient_email || undefined,
        cod_amount: codAmount,
        note: (note || order?.notes || "Fragile - Handle with care").slice(0, 250),
        item_description: itemDesc || "Apparel & Accessories",
        total_lot: Number(total_lot) || 1,
        delivery_type: Number(delivery_type) || 0, // 0 = Home Delivery, 1 = Hub Pick Up
      };

      console.log("[Steadfast Edge Function] Creating order:", sfPayload);

      const sfRes = await fetch(`${STEADFAST_BASE_URL}/create_order`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(sfPayload),
      });

      const sfData = await sfRes.json();
      console.log("[Steadfast Edge Function] Response:", sfData);

      if (!sfRes.ok || (sfData.status && sfData.status !== 200 && sfData.status !== "success")) {
        throw new Error(sfData.message || JSON.stringify(sfData.errors || sfData));
      }

      const consignment = sfData.consignment || sfData;
      const cid = String(consignment.consignment_id || sfData.consignment_id || "");
      const trackingCode = String(consignment.tracking_code || sfData.tracking_code || cid);

      // Record into database
      if (order_id) {
        await admin.from("steadfast_shipments").upsert({
          order_id,
          consignment_id: cid,
          tracking_code: trackingCode,
          status: consignment.status || "in_review",
          tracking_message: consignment.note || null,
          raw_response: sfData,
          last_synced_at: new Date().toISOString(),
        }, { onConflict: "consignment_id" });

        await admin.from("orders").update({
          tracking_number: trackingCode,
          tracking_courier: "steadfast",
          status: "processing",
          updated_at: new Date().toISOString(),
        }).eq("id", order_id);
      }

      return new Response(
        JSON.stringify({ ok: true, consignment_id: cid, tracking_code: trackingCode, data: sfData }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: status / sync-status ──────────────────────────────────────
    if (action === "status" || action === "sync-status" || action === "sync_status") {
      const cid = body.consignment_id || body.tracking_code || body.id;
      const invoice = body.invoice;

      let url = `${STEADFAST_BASE_URL}/status_by_cid/${cid}`;
      if (invoice) {
        url = `${STEADFAST_BASE_URL}/status_by_invoice/${invoice}`;
      } else if (body.tracking_code && !body.consignment_id) {
        url = `${STEADFAST_BASE_URL}/status_by_trackingcode/${body.tracking_code}`;
      }

      const sfRes = await fetch(url, { method: "GET", headers: authHeaders });
      const sfData = await sfRes.json();

      if (sfData.delivery_status && body.order_id) {
        const statusLower = String(sfData.delivery_status || "").toLowerCase();
        let internalStatus: string | null = null;
        if (statusLower.includes("delivered")) internalStatus = "delivered";
        else if (statusLower.includes("in_transit") || statusLower.includes("out_for_delivery") || statusLower.includes("shipped")) internalStatus = "shipped";
        else if (statusLower.includes("return")) internalStatus = "returned";
        else if (statusLower.includes("cancel") || statusLower.includes("fail")) internalStatus = "cancelled";
        else if (statusLower.includes("pending") || statusLower.includes("in_review")) internalStatus = "processing";

        await admin.from("steadfast_shipments").update({
          status: sfData.delivery_status,
          raw_response: sfData,
          last_synced_at: new Date().toISOString(),
        }).eq("order_id", body.order_id);

        if (internalStatus) {
          const orderUpdates: any = { status: internalStatus, updated_at: new Date().toISOString() };
          if (internalStatus === "delivered") orderUpdates.payment_status = "paid";
          await admin.from("orders").update(orderUpdates).eq("id", body.order_id);
        }
      }

      return new Response(
        JSON.stringify({ ok: true, data: sfData, delivery_status: sfData.delivery_status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: balance ───────────────────────────────────────────────────
    if (action === "balance" || action === "get_balance") {
      const sfRes = await fetch(`${STEADFAST_BASE_URL}/get_balance`, { method: "GET", headers: authHeaders });
      const sfData = await sfRes.json();
      return new Response(
        JSON.stringify({ ok: true, data: sfData }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: police-stations (coverage options) ────────────────────────
    if (action === "police_stations" || action === "police-stations" || action === "coverage") {
      const sfRes = await fetch(`${STEADFAST_BASE_URL}/police_stations`, { method: "GET", headers: authHeaders });
      const sfData = await sfRes.json();
      return new Response(
        JSON.stringify({ ok: true, data: sfData }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: create-return-request ─────────────────────────────────────
    if (action === "create_return_request" || action === "return-request") {
      const sfRes = await fetch(`${STEADFAST_BASE_URL}/create_return_request`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          consignment_id: body.consignment_id,
          reason: body.reason || "Customer requested return",
        }),
      });
      const sfData = await sfRes.json();
      return new Response(
        JSON.stringify({ ok: true, data: sfData }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err: any) {
    console.error("[Steadfast Edge Function Error]:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message || "Steadfast request failed" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
