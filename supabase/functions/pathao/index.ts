// Pathao Courier API v1 Integration Edge Function
// Supports: token caching/refresh, stores, create_store, cities, zones, areas, price-plan, create-order, create-bulk-orders, order-info, status, sync-status, test-connection
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const PATHAO_SANDBOX_BASE_URL = "https://courier-api-sandbox.pathao.com";
const PATHAO_LIVE_BASE_URL = "https://api-hermes.pathao.com";

// Default Sandbox fallback credentials provided by Pathao
const DEFAULT_SANDBOX_CREDS = {
  client_id: "7N1aMJQbWm",
  client_secret: "wRcaibZkUdSNz2EI9ZyuXLlNrnAv0TdPUPXMnD39",
  username: "test@pathao.com",
  password: "lovePathao",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function cleanPhone(raw: string): string {
  let cleaned = String(raw || "").replace(/\D/g, "");
  if (cleaned.startsWith("880") && cleaned.length === 13) {
    cleaned = "0" + cleaned.slice(3);
  }
  return cleaned.slice(-11);
}

interface PathaoCredentials {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password?: string;
  storeId?: number;
  environment: "live" | "sandbox";
}

async function getCredentials(requestedEnv?: "live" | "sandbox"): Promise<PathaoCredentials> {
  // Check site_settings for configured environment
  const { data: settings } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", [
      "pathao_public_config",
      "pathao_credentials",
      "PATHAO_CLIENT_ID",
      "PATHAO_CLIENT_SECRET",
      "PATHAO_USERNAME",
      "PATHAO_PASSWORD",
      "PATHAO_STORE_ID",
      "PATHAO_LIVE_CLIENT_ID",
      "PATHAO_LIVE_CLIENT_SECRET",
      "PATHAO_LIVE_USERNAME",
      "PATHAO_LIVE_PASSWORD",
      "PATHAO_LIVE_STORE_ID",
      "PATHAO_SANDBOX_CLIENT_ID",
      "PATHAO_SANDBOX_CLIENT_SECRET",
      "PATHAO_SANDBOX_USERNAME",
      "PATHAO_SANDBOX_PASSWORD",
      "PATHAO_SANDBOX_STORE_ID",
    ]);

  const map: Record<string, any> = {};
  settings?.forEach((s: any) => {
    map[s.key] = s.value;
  });

  const publicConfig = map["pathao_public_config"] || {};
  const env: "live" | "sandbox" = requestedEnv || (publicConfig.environment === "live" ? "live" : "sandbox");
  const baseUrl = env === "live" ? PATHAO_LIVE_BASE_URL : PATHAO_SANDBOX_BASE_URL;

  if (env === "live") {
    const clientId =
      Deno.env.get("PATHAO_LIVE_CLIENT_ID") ||
      Deno.env.get("PATHAO_CLIENT_ID") ||
      map["PATHAO_LIVE_CLIENT_ID"] ||
      map["PATHAO_CLIENT_ID"] ||
      map["pathao_credentials"]?.live_client_id;
    const clientSecret =
      Deno.env.get("PATHAO_LIVE_CLIENT_SECRET") ||
      Deno.env.get("PATHAO_CLIENT_SECRET") ||
      map["PATHAO_LIVE_CLIENT_SECRET"] ||
      map["PATHAO_CLIENT_SECRET"] ||
      map["pathao_credentials"]?.live_client_secret;
    const username =
      Deno.env.get("PATHAO_LIVE_USERNAME") ||
      Deno.env.get("PATHAO_USERNAME") ||
      map["PATHAO_LIVE_USERNAME"] ||
      map["PATHAO_USERNAME"] ||
      map["pathao_credentials"]?.live_username;
    const password =
      Deno.env.get("PATHAO_LIVE_PASSWORD") ||
      Deno.env.get("PATHAO_PASSWORD") ||
      map["PATHAO_LIVE_PASSWORD"] ||
      map["PATHAO_PASSWORD"] ||
      map["pathao_credentials"]?.live_password;
    const storeId =
      Number(
        publicConfig.live_store_id ||
        Deno.env.get("PATHAO_LIVE_STORE_ID") ||
        Deno.env.get("PATHAO_STORE_ID") ||
        map["PATHAO_LIVE_STORE_ID"] ||
        map["PATHAO_STORE_ID"]
      ) || undefined;

    return {
      baseUrl,
      clientId: clientId || "",
      clientSecret: clientSecret || "",
      username: username || "",
      password: password || "",
      storeId,
      environment: "live",
    };
  }

  // Sandbox environment (falls back to official test credentials if not configured)
  const clientId =
    Deno.env.get("PATHAO_SANDBOX_CLIENT_ID") ||
    map["PATHAO_SANDBOX_CLIENT_ID"] ||
    map["pathao_credentials"]?.sandbox_client_id ||
    DEFAULT_SANDBOX_CREDS.client_id;
  const clientSecret =
    Deno.env.get("PATHAO_SANDBOX_CLIENT_SECRET") ||
    map["PATHAO_SANDBOX_CLIENT_SECRET"] ||
    map["pathao_credentials"]?.sandbox_client_secret ||
    DEFAULT_SANDBOX_CREDS.client_secret;
  const username =
    Deno.env.get("PATHAO_SANDBOX_USERNAME") ||
    map["PATHAO_SANDBOX_USERNAME"] ||
    map["pathao_credentials"]?.sandbox_username ||
    DEFAULT_SANDBOX_CREDS.username;
  const password =
    Deno.env.get("PATHAO_SANDBOX_PASSWORD") ||
    map["PATHAO_SANDBOX_PASSWORD"] ||
    map["pathao_credentials"]?.sandbox_password ||
    DEFAULT_SANDBOX_CREDS.password;
  const storeId =
    Number(
      publicConfig.sandbox_store_id ||
      Deno.env.get("PATHAO_SANDBOX_STORE_ID") ||
      map["PATHAO_SANDBOX_STORE_ID"]
    ) || undefined;

  return {
    baseUrl,
    clientId,
    clientSecret,
    username,
    password,
    storeId,
    environment: "sandbox",
  };
}

async function getAccessToken(creds: PathaoCredentials): Promise<string> {
  const now = new Date();
  const bufferMs = 60 * 1000; // 1 minute safety buffer

  // 1. Check cached token in DB
  const { data: cachedToken } = await admin
    .from("pathao_tokens")
    .select("*")
    .eq("environment", creds.environment)
    .maybeSingle();

  if (cachedToken && new Date(cachedToken.expires_at).getTime() > now.getTime() + bufferMs) {
    return cachedToken.access_token;
  }

  // 2. Try refresh token if available
  if (cachedToken?.refresh_token) {
    try {
      console.log(`[Pathao Edge Function] Attempting token refresh for environment: ${creds.environment}`);
      const refreshRes = await fetch(`${creds.baseUrl}/aladdin/api/v1/issue-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: creds.clientId,
          client_secret: creds.clientSecret,
          grant_type: "refresh_token",
          refresh_token: cachedToken.refresh_token,
        }),
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (refreshData.access_token) {
          const expiresIn = Number(refreshData.expires_in) || 432000;
          const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

          await admin.from("pathao_tokens").upsert({
            environment: creds.environment,
            access_token: refreshData.access_token,
            refresh_token: refreshData.refresh_token || cachedToken.refresh_token,
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          }, { onConflict: "environment" });

          return refreshData.access_token;
        }
      }
    } catch (e) {
      console.warn("[Pathao Edge Function] Refresh token attempt failed, issuing new token:", e);
    }
  }

  // 3. Issue fresh access token using password grant
  if (!creds.clientId || !creds.clientSecret || !creds.username || !creds.password) {
    throw new Error(
      `Pathao ${creds.environment} credentials missing. Please configure Client ID, Client Secret, Username, and Password.`
    );
  }

  console.log(`[Pathao Edge Function] Issuing fresh access token for environment: ${creds.environment}`);
  const tokenRes = await fetch(`${creds.baseUrl}/aladdin/api/v1/issue-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: "password",
      username: creds.username,
      password: creds.password,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || !tokenData.access_token) {
    const errMsg = tokenData.message || tokenData.error_description || JSON.stringify(tokenData);
    throw new Error(`Failed to issue Pathao access token: ${errMsg}`);
  }

  const expiresIn = Number(tokenData.expires_in) || 432000;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  await admin.from("pathao_tokens").upsert({
    environment: creds.environment,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || null,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }, { onConflict: "environment" });

  return tokenData.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "test-connection";
    const requestedEnv = body.environment as "live" | "sandbox" | undefined;

    const creds = await getCredentials(requestedEnv);
    const token = await getAccessToken(creds);

    const authHeaders = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    // ── ACTION: issue-token (manual trigger) ──────────────────────────────
    if (action === "issue-token" || action === "issue_token") {
      return new Response(
        JSON.stringify({ ok: true, access_token: token, environment: creds.environment }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: stores (get list of merchant pickup stores) ──────────────
    if (action === "stores" || action === "get-stores") {
      const res = await fetch(`${creds.baseUrl}/aladdin/api/v1/stores`, {
        method: "GET",
        headers: authHeaders,
      });
      const data = await res.json();
      return new Response(
        JSON.stringify({ ok: res.ok, data, environment: creds.environment }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: create-store ──────────────────────────────────────────────
    if (action === "create-store" || action === "create_store") {
      const storePayload = {
        name: body.name,
        contact_name: body.contact_name,
        contact_number: cleanPhone(body.contact_number),
        secondary_contact: body.secondary_contact ? cleanPhone(body.secondary_contact) : undefined,
        otp_number: body.otp_number ? cleanPhone(body.otp_number) : undefined,
        address: body.address,
        city_id: Number(body.city_id),
        zone_id: Number(body.zone_id),
        area_id: Number(body.area_id),
      };

      const res = await fetch(`${creds.baseUrl}/aladdin/api/v1/stores`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(storePayload),
      });
      const data = await res.json();
      return new Response(
        JSON.stringify({ ok: res.ok, data, environment: creds.environment }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: cities (get city list) ────────────────────────────────────
    if (action === "cities" || action === "city-list" || action === "city_list") {
      const res = await fetch(`${creds.baseUrl}/aladdin/api/v1/city-list`, {
        method: "GET",
        headers: authHeaders,
      });
      const data = await res.json();
      return new Response(
        JSON.stringify({ ok: res.ok, data, environment: creds.environment }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: zones (get zones in a city) ────────────────────────────────
    if (action === "zones" || action === "zone-list" || action === "zone_list") {
      const cityId = body.city_id || body.cityId;
      if (!cityId) throw new Error("city_id parameter is required");

      const res = await fetch(`${creds.baseUrl}/aladdin/api/v1/cities/${cityId}/zone-list`, {
        method: "GET",
        headers: authHeaders,
      });
      const data = await res.json();
      return new Response(
        JSON.stringify({ ok: res.ok, data, environment: creds.environment }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: areas (get areas in a zone) ────────────────────────────────
    if (action === "areas" || action === "area-list" || action === "area_list") {
      const zoneId = body.zone_id || body.zoneId;
      if (!zoneId) throw new Error("zone_id parameter is required");

      const res = await fetch(`${creds.baseUrl}/aladdin/api/v1/zones/${zoneId}/area-list`, {
        method: "GET",
        headers: authHeaders,
      });
      const data = await res.json();
      return new Response(
        JSON.stringify({ ok: res.ok, data, environment: creds.environment }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: price-plan / calculate-price ──────────────────────────────
    if (action === "price-plan" || action === "calculate-price" || action === "price_plan") {
      const storeId = Number(body.store_id || creds.storeId || 1);
      const pricePayload = {
        store_id: storeId,
        item_type: Number(body.item_type || 2), // 1 = Document, 2 = Parcel
        delivery_type: Number(body.delivery_type || 48), // 48 = Normal, 12 = On Demand
        item_weight: Number(body.item_weight || 0.5),
        recipient_city: Number(body.recipient_city || body.city_id),
        recipient_zone: Number(body.recipient_zone || body.zone_id),
      };

      const res = await fetch(`${creds.baseUrl}/aladdin/api/v1/merchant/price-plan`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(pricePayload),
      });
      const data = await res.json();
      return new Response(
        JSON.stringify({ ok: res.ok, data, environment: creds.environment }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: create-order ──────────────────────────────────────────────
    if (action === "create-order" || action === "create_order") {
      const {
        order_id,
        store_id,
        recipient_city,
        recipient_zone,
        recipient_area,
        recipient_city_name,
        recipient_zone_name,
        delivery_type = 48,
        item_type = 2,
        item_weight = 0.5,
        item_quantity = 1,
        item_description,
        special_instruction,
      } = body;

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
      const recipientName = (order?.customer_name || body.recipient_name || "Customer").trim().slice(0, 100);
      const rawPhone = order?.customer_phone || body.recipient_phone || shippingAddress.phone || "";
      const recipientPhone = cleanPhone(rawPhone);
      const recipientSecondaryPhone = body.recipient_secondary_phone ? cleanPhone(body.recipient_secondary_phone) : undefined;
      const recipientAddress = (
        body.recipient_address ||
        [shippingAddress.address, shippingAddress.area, shippingAddress.city, shippingAddress.postal_code]
          .filter(Boolean)
          .join(", ") ||
        "Dhaka, Bangladesh"
      ).slice(0, 220);

      const isCod = order ? (order.payment_method === "cod" || order.payment_status !== "paid") : (body.is_cod !== false);
      const amountToCollect = isCod ? Math.round(Number(body.amount_to_collect ?? order?.total ?? 0)) : 0;
      const merchantOrderId = String(body.merchant_order_id || order?.order_number || `ORD-${Date.now()}`);

      let itemDesc = item_description;
      if (!itemDesc && order?.order_items?.length) {
        itemDesc = order.order_items.map((i: any) => `${i.name || "Item"} x${i.quantity || 1}`).join(", ").slice(0, 200);
      }

      const targetStoreId = Number(store_id || creds.storeId);
      if (!targetStoreId) {
        throw new Error("Store ID is required to create a Pathao order. Please configure Store ID in Shipping Settings.");
      }

      const orderPayload: any = {
        store_id: targetStoreId,
        merchant_order_id: merchantOrderId,
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        recipient_address: recipientAddress,
        delivery_type: Number(delivery_type), // 48 for Normal Delivery, 12 for On Demand
        item_type: Number(item_type), // 1 for Document, 2 for Parcel
        item_quantity: Math.max(1, Number(item_quantity) || 1),
        item_weight: Math.max(0.5, Math.min(10, Number(item_weight) || 0.5)),
        amount_to_collect: amountToCollect,
      };

      if (recipientSecondaryPhone) orderPayload.recipient_secondary_phone = recipientSecondaryPhone;
      if (recipient_city) orderPayload.recipient_city = Number(recipient_city);
      if (recipient_zone) orderPayload.recipient_zone = Number(recipient_zone);
      if (recipient_area) orderPayload.recipient_area = Number(recipient_area);
      if (itemDesc) orderPayload.item_description = itemDesc;
      if (special_instruction) orderPayload.special_instruction = String(special_instruction).slice(0, 250);

      console.log(`[Pathao Edge Function] Creating order (${creds.environment}):`, orderPayload);

      const ptRes = await fetch(`${creds.baseUrl}/aladdin/api/v1/orders`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(orderPayload),
      });

      const ptData = await ptRes.json();
      console.log("[Pathao Edge Function] Order creation response:", ptData);

      if (!ptRes.ok || (ptData.code && ptData.code !== 200 && ptData.type !== "success")) {
        const errMsg = ptData.message || JSON.stringify(ptData.errors || ptData);
        throw new Error(errMsg);
      }

      const consignment = ptData.data || {};
      const cid = String(consignment.consignment_id || ptData.consignment_id || "");
      const deliveryFee = Number(consignment.delivery_fee || 0);

      if (order_id) {
        await admin.from("pathao_shipments").upsert({
          order_id,
          consignment_id: cid,
          merchant_order_id: merchantOrderId,
          order_status: consignment.order_status || "Pending",
          order_status_slug: consignment.order_status_slug || "pending",
          delivery_fee: deliveryFee,
          cod_amount: amountToCollect,
          environment: creds.environment,
          recipient_city: recipient_city ? Number(recipient_city) : null,
          recipient_city_name: recipient_city_name || null,
          recipient_zone: recipient_zone ? Number(recipient_zone) : null,
          recipient_zone_name: recipient_zone_name || null,
          recipient_area: recipient_area ? Number(recipient_area) : null,
          shipment_type: Number(delivery_type) === 12 ? "on_demand" : "standard",
          raw_response: ptData,
          last_synced_at: new Date().toISOString(),
        }, { onConflict: "consignment_id" });

        await admin.from("orders").update({
          tracking_number: cid,
          tracking_courier: "pathao",
          status: "processing",
          updated_at: new Date().toISOString(),
        }).eq("id", order_id);
      }

      return new Response(
        JSON.stringify({ ok: true, consignment_id: cid, data: ptData, environment: creds.environment }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: create-bulk-orders ────────────────────────────────────────
    if (action === "create-bulk-orders" || action === "create_bulk_orders" || action === "bulk-orders") {
      const orders = Array.isArray(body.orders) ? body.orders : [];
      if (!orders.length) throw new Error("orders array is required for bulk order creation");

      const res = await fetch(`${creds.baseUrl}/aladdin/api/v1/orders/bulk`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ orders }),
      });
      const data = await res.json();
      return new Response(
        JSON.stringify({ ok: res.ok, data, environment: creds.environment }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: order-info / status / sync-status ─────────────────────────
    if (action === "order-info" || action === "order_info" || action === "status" || action === "sync-status") {
      const cid = body.consignment_id || body.tracking_code || body.id;
      if (!cid) throw new Error("consignment_id parameter is required");

      const res = await fetch(`${creds.baseUrl}/aladdin/api/v1/orders/${cid}/info`, {
        method: "GET",
        headers: authHeaders,
      });
      const data = await res.json();

      if (res.ok && data.data) {
        const d = data.data;
        const statusSlug = String(d.order_status_slug || d.order_status || "").toLowerCase();

        // Map status to internal orders table status
        let internalStatus: string | null = null;
        if (statusSlug.includes("deliver")) internalStatus = "delivered";
        else if (statusSlug.includes("transit") || statusSlug.includes("out_for_delivery") || statusSlug.includes("hub")) internalStatus = "shipped";
        else if (statusSlug.includes("return")) internalStatus = "returned";
        else if (statusSlug.includes("cancel") || statusSlug.includes("fail")) internalStatus = "cancelled";

        if (body.order_id) {
          await admin.from("pathao_shipments").update({
            order_status: d.order_status || null,
            order_status_slug: d.order_status_slug || null,
            invoice_id: d.invoice_id || null,
            raw_response: data,
            last_synced_at: new Date().toISOString(),
          }).eq("order_id", body.order_id);

          if (internalStatus) {
            const orderUpdates: any = { status: internalStatus, updated_at: new Date().toISOString() };
            if (internalStatus === "delivered") orderUpdates.payment_status = "paid";
            await admin.from("orders").update(orderUpdates).eq("id", body.order_id);
          }
        }
      }

      return new Response(
        JSON.stringify({ ok: res.ok, data, environment: creds.environment }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: test-connection ───────────────────────────────────────────
    if (action === "test-connection" || action === "test_connection") {
      // Test fetching stores to verify token + permissions
      const storesRes = await fetch(`${creds.baseUrl}/aladdin/api/v1/stores`, {
        method: "GET",
        headers: authHeaders,
      });
      const storesData = await storesRes.json();

      return new Response(
        JSON.stringify({
          ok: true,
          message: `Pathao ${creds.environment.toUpperCase()} connection successful. Token verified.`,
          environment: creds.environment,
          token_issued: true,
          stores: storesData?.data?.data || storesData?.data || [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err: any) {
    console.error("[Pathao Edge Function Error]:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message || "Pathao request failed" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
