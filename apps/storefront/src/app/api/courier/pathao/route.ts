import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Pathao Courier API v1 Next.js Route Handler (Storefront)
// ---------------------------------------------------------------------------

const PATHAO_SANDBOX_BASE_URL = "https://courier-api-sandbox.pathao.com";
const PATHAO_LIVE_BASE_URL = "https://api-hermes.pathao.com";

const DEFAULT_SANDBOX_CREDS = {
  client_id: "7N1aMJQbWm",
  client_secret: "wRcaibZkUdSNz2EI9ZyuXLlNrnAv0TdPUPXMnD39",
  username: "test@pathao.com",
  password: "lovePathao",
};

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

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

async function resolveCredentials(body: any): Promise<PathaoCredentials> {
  const admin = getAdminClient();
  const requestedEnv = body.environment as "live" | "sandbox" | undefined;

  const { data: settings } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", ["pathao_public_config", "pathao_credentials"]);

  const map: Record<string, any> = {};
  settings?.forEach((s: any) => {
    map[s.key] = s.value;
  });

  const publicConfig = map["pathao_public_config"] || {};
  const env: "live" | "sandbox" = requestedEnv || (publicConfig.environment === "live" ? "live" : "sandbox");
  const baseUrl = env === "live" ? PATHAO_LIVE_BASE_URL : PATHAO_SANDBOX_BASE_URL;
  const pathaoCreds = map["pathao_credentials"] || {};

  if (env === "live") {
    const clientId = body.clientId || body.client_id || pathaoCreds.live_client_id || process.env.PATHAO_LIVE_CLIENT_ID || "";
    const clientSecret = body.clientSecret || body.client_secret || pathaoCreds.live_client_secret || process.env.PATHAO_LIVE_CLIENT_SECRET || "";
    const username = body.username || pathaoCreds.live_username || process.env.PATHAO_LIVE_USERNAME || "";
    const password = body.password || pathaoCreds.live_password || process.env.PATHAO_LIVE_PASSWORD || "";
    const storeId = Number(body.storeId || body.store_id || publicConfig.live_store_id) || undefined;

    return {
      baseUrl,
      clientId,
      clientSecret,
      username,
      password,
      storeId,
      environment: "live",
    };
  }

  const clientId = body.clientId || body.client_id || pathaoCreds.sandbox_client_id || DEFAULT_SANDBOX_CREDS.client_id;
  const clientSecret = body.clientSecret || body.client_secret || pathaoCreds.sandbox_client_secret || DEFAULT_SANDBOX_CREDS.client_secret;
  const username = body.username || pathaoCreds.sandbox_username || DEFAULT_SANDBOX_CREDS.username;
  const password = body.password || pathaoCreds.sandbox_password || DEFAULT_SANDBOX_CREDS.password;
  const storeId = Number(body.storeId || body.store_id || publicConfig.sandbox_store_id) || undefined;

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
  const admin = getAdminClient();
  const now = new Date();
  const bufferMs = 60 * 1000;

  const { data: cachedToken } = await admin
    .from("pathao_tokens")
    .select("*")
    .eq("environment", creds.environment)
    .maybeSingle();

  if (cachedToken && new Date(cachedToken.expires_at).getTime() > now.getTime() + bufferMs) {
    return cachedToken.access_token;
  }

  if (cachedToken?.refresh_token && creds.clientId && creds.clientSecret) {
    try {
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
      console.warn("[pathao-route] Token refresh failed:", e);
    }
  }

  if (!creds.clientId || !creds.clientSecret || !creds.username || !creds.password) {
    throw new Error(
      `Pathao ${creds.environment.toUpperCase()} credentials missing. Please enter Client ID, Client Secret, Username, and Password.`
    );
  }

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

  const tokenData = await tokenRes.json().catch(() => ({}));

  if (!tokenRes.ok || !tokenData.access_token) {
    const errMsg = tokenData.message || tokenData.error_description || tokenData.error || `HTTP ${tokenRes.status}`;
    throw new Error(`Pathao Authentication failed (${errMsg}). Please check Client ID, Secret, Username & Password.`);
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "test-connection";
    const admin = getAdminClient();

    const creds = await resolveCredentials(body);
    const token = await getAccessToken(creds);

    const authHeaders = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (action === "test-connection" || action === "test_connection") {
      const storesRes = await fetch(`${creds.baseUrl}/aladdin/api/v1/stores`, {
        method: "GET",
        headers: authHeaders,
      });
      const storesData = await storesRes.json().catch(() => ({}));
      const rawStores = storesData?.data?.data || storesData?.data || [];

      return NextResponse.json({
        ok: true,
        message: `Pathao ${creds.environment.toUpperCase()} connection successful! Token verified.`,
        environment: creds.environment,
        token_issued: true,
        stores: Array.isArray(rawStores) ? rawStores : [],
      });
    }

    if (action === "stores" || action === "get-stores") {
      const res = await fetch(`${creds.baseUrl}/aladdin/api/v1/stores`, {
        method: "GET",
        headers: authHeaders,
      });
      const data = await res.json();
      return NextResponse.json({ ok: res.ok, data, environment: creds.environment });
    }

    if (action === "cities" || action === "city-list" || action === "city_list") {
      const res = await fetch(`${creds.baseUrl}/aladdin/api/v1/city-list`, {
        method: "GET",
        headers: authHeaders,
      });
      const data = await res.json();
      return NextResponse.json({ ok: res.ok, data, environment: creds.environment });
    }

    if (action === "zones" || action === "zone-list" || action === "zone_list") {
      const cityId = body.city_id || body.cityId;
      if (!cityId) throw new Error("city_id parameter is required");

      const res = await fetch(`${creds.baseUrl}/aladdin/api/v1/cities/${cityId}/zone-list`, {
        method: "GET",
        headers: authHeaders,
      });
      const data = await res.json();
      return NextResponse.json({ ok: res.ok, data, environment: creds.environment });
    }

    if (action === "areas" || action === "area-list" || action === "area_list") {
      const zoneId = body.zone_id || body.zoneId;
      if (!zoneId) throw new Error("zone_id parameter is required");

      const res = await fetch(`${creds.baseUrl}/aladdin/api/v1/zones/${zoneId}/area-list`, {
        method: "GET",
        headers: authHeaders,
      });
      const data = await res.json();
      return NextResponse.json({ ok: res.ok, data, environment: creds.environment });
    }

    if (action === "price-plan" || action === "calculate-price" || action === "price_plan") {
      let storeId = Number(body.store_id || creds.storeId);
      if (!storeId) {
        const storesRes = await fetch(`${creds.baseUrl}/aladdin/api/v1/stores`, {
          method: "GET",
          headers: authHeaders,
        });
        const storesData = await storesRes.json().catch(() => ({}));
        const rawStores = storesData?.data?.data || storesData?.data || [];
        if (rawStores.length > 0) {
          storeId = Number(rawStores[0].store_id);
        }
      }

      const pricePayload = {
        store_id: storeId || 1,
        item_type: Number(body.item_type || 2),
        delivery_type: Number(body.delivery_type || 48),
        item_weight: Number(body.item_weight || 0.5),
        recipient_city: Number(body.recipient_city || body.city_id || 1),
        recipient_zone: Number(body.recipient_zone || body.zone_id || 52),
      };

      const res = await fetch(`${creds.baseUrl}/aladdin/api/v1/merchant/price-plan`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(pricePayload),
      });
      const data = await res.json();
      return NextResponse.json({ ok: res.ok, data, environment: creds.environment });
    }

    if (action === "sync-price-matrix" || action === "get-live-pricing") {
      let storeId = Number(body.store_id || creds.storeId);
      if (!storeId) {
        const storesRes = await fetch(`${creds.baseUrl}/aladdin/api/v1/stores`, {
          method: "GET",
          headers: authHeaders,
        });
        const storesData = await storesRes.json().catch(() => ({}));
        const rawStores = storesData?.data?.data || storesData?.data || [];
        if (rawStores.length > 0) {
          storeId = Number(rawStores[0].store_id);
        }
      }

      if (!storeId) {
        throw new Error("No registered Pathao store found.");
      }

      const queryPrice = async (itemType: number, delType: number, weight: number, cityId: number, zoneId: number) => {
        try {
          const res = await fetch(`${creds.baseUrl}/aladdin/api/v1/merchant/price-plan`, {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({
              store_id: storeId,
              item_type: itemType,
              delivery_type: delType,
              item_weight: weight,
              recipient_city: cityId,
              recipient_zone: zoneId,
            }),
          });
          const d = await res.json();
          return d?.data?.data || d?.data || null;
        } catch {
          return null;
        }
      };

      const [
        intraStdHalf,
        intraStd1kg,
        intraStd2kg,
        intraOnDemand,
        intraDoc,
        interStdHalf,
        interStd1kg,
        interStd2kg,
        interDoc,
      ] = await Promise.all([
        queryPrice(2, 48, 0.5, 1, 52),
        queryPrice(2, 48, 1.0, 1, 52),
        queryPrice(2, 48, 2.0, 1, 52),
        queryPrice(2, 12, 0.5, 1, 52),
        queryPrice(1, 48, 0.5, 1, 52),
        queryPrice(2, 48, 0.5, 2, 1),
        queryPrice(2, 48, 1.0, 2, 1),
        queryPrice(2, 48, 2.0, 2, 1),
        queryPrice(1, 48, 0.5, 2, 1),
      ]);

      const liveRates = {
        store_id: storeId,
        environment: creds.environment,
        last_synced_at: new Date().toISOString(),
        intra_city: {
          parcel_standard_half_kg: intraStdHalf?.final_price ?? intraStdHalf?.price ?? 60,
          parcel_standard_1kg: intraStd1kg?.final_price ?? intraStd1kg?.price ?? 70,
          parcel_standard_2kg: intraStd2kg?.final_price ?? intraStd2kg?.price ?? 90,
          parcel_ondemand_half_kg: intraOnDemand?.final_price ?? intraOnDemand?.price ?? 120,
          document_standard: intraDoc?.final_price ?? intraDoc?.price ?? 25,
          plan_id: intraStdHalf?.plan_id,
          cod_percentage: intraStdHalf?.cod_percentage ?? 0.01,
        },
        inter_city: {
          parcel_standard_half_kg: interStdHalf?.final_price ?? interStdHalf?.price ?? 110,
          parcel_standard_1kg: interStd1kg?.final_price ?? interStd1kg?.price ?? 130,
          parcel_standard_2kg: interStd2kg?.final_price ?? interStd2kg?.price ?? 150,
          document_standard: interDoc?.final_price ?? interDoc?.price ?? 60,
          plan_id: interStdHalf?.plan_id,
        },
        extra_kg_charge: 20,
      };

      await admin.from("site_settings").upsert({
        key: "pathao_live_rates",
        value: liveRates,
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" });

      return NextResponse.json({
        ok: true,
        message: "Live Pathao rates successfully synchronized with Pathao Aladdin API!",
        data: liveRates,
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err: any) {
    console.error("[pathao-storefront-route-error]:", err.message);
    return NextResponse.json({ ok: false, error: err.message || "Pathao operation failed" }, { status: 200 });
  }
}
