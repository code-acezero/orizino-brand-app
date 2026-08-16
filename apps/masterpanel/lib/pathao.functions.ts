import { supabase } from "@/integrations/supabase/client";

export interface PathaoStore {
  store_id: number;
  store_name: string;
  store_address: string;
  is_active: number;
  city_id: number;
  zone_id: number;
  hub_id: number;
  is_default_store?: boolean;
}

export interface PathaoCity {
  city_id: number;
  city_name: string;
}

export interface PathaoZone {
  zone_id: number;
  zone_name: string;
}

export interface PathaoArea {
  area_id: number;
  area_name: string;
  home_delivery_available: boolean;
  pickup_available: boolean;
}

export interface PathaoPricePlanResult {
  price: number;
  discount: number;
  promo_discount: number;
  plan_id: number;
  cod_enabled: number;
  cod_percentage: number;
  additional_charge: number;
  final_price: number;
}

/**
 * Universal dispatcher: calls Next.js `/api/courier/pathao` first,
 * with fallback to Supabase Edge Function `pathao`.
 */
async function callPathaoApi(action: string, payload: Record<string, any> = {}) {
  try {
    const res = await fetch("/api/courier/pathao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.ok !== undefined) {
        return data;
      }
    }
  } catch {
    // Fall back to Supabase Edge function
  }

  const { data, error } = await supabase.functions.invoke("pathao", {
    body: { action, ...payload },
  });

  if (error) {
    let customMsg = "";
    try {
      const errJson = await (error as any)?.context?.json?.();
      if (errJson?.error) customMsg = errJson.error;
    } catch {}
    throw new Error(customMsg || error.message || "Failed to communicate with Pathao API");
  }

  return data;
}

/**
 * Test Pathao Connection by issuing an access token and retrieving store info.
 */
export async function testPathaoConnection(input?: {
  environment?: "live" | "sandbox";
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
}) {
  const data = await callPathaoApi("test-connection", input || {});

  if (!data?.ok) {
    throw new Error(data?.error || data?.message || "Pathao connection test failed");
  }

  return data;
}

/**
 * Fetch all registered merchant pickup stores from Pathao.
 */
export async function getPathaoStores(input?: { environment?: "live" | "sandbox" }) {
  const data = await callPathaoApi("stores", input || {});
  if (!data?.ok && data?.error) throw new Error(data.error);
  const rawStores = data?.stores || data?.data?.data || data?.data || [];
  return Array.isArray(rawStores) ? (rawStores as PathaoStore[]) : [];
}

/**
 * Fetch Pathao City list.
 */
export async function getPathaoCities() {
  const data = await callPathaoApi("cities");
  if (!data?.ok && data?.error) throw new Error(data.error);
  const list = data?.data?.data || data?.data || [];
  return Array.isArray(list) ? (list as PathaoCity[]) : [];
}

/**
 * Fetch Pathao Zones inside a specific City.
 */
export async function getPathaoZones(cityId: number) {
  if (!cityId) return [];
  const data = await callPathaoApi("zones", { city_id: cityId });
  if (!data?.ok && data?.error) throw new Error(data.error);
  const list = data?.data?.data || data?.data || [];
  return Array.isArray(list) ? (list as PathaoZone[]) : [];
}

/**
 * Fetch Pathao Areas inside a specific Zone.
 */
export async function getPathaoAreas(zoneId: number) {
  if (!zoneId) return [];
  const data = await callPathaoApi("areas", { zone_id: zoneId });
  if (!data?.ok && data?.error) throw new Error(data.error);
  const list = data?.data?.data || data?.data || [];
  return Array.isArray(list) ? (list as PathaoArea[]) : [];
}

/**
 * Calculate dynamic price using Pathao price-plan API.
 */
export async function calculatePathaoPrice(params: {
  store_id?: number;
  item_type?: number;
  delivery_type?: number;
  item_weight?: number;
  recipient_city: number;
  recipient_zone: number;
}) {
  const data = await callPathaoApi("price-plan", params);
  if (!data?.ok && data?.error) throw new Error(data.error);
  return (data?.data?.data || data?.data || data) as PathaoPricePlanResult;
}

/**
 * Auto-sync live rate matrix across intra-city and inter-city from Pathao Aladdin API.
 */
export async function syncPathaoPriceMatrix(input?: { environment?: "live" | "sandbox"; store_id?: number }) {
  const data = await callPathaoApi("sync-price-matrix", input || {});
  if (!data?.ok && data?.error) throw new Error(data.error);
  return data;
}

/**
 * Dispatch an order to Pathao Courier.
 */
export async function createPathaoOrder(params: {
  order_id: string;
  store_id?: number;
  recipient_name?: string;
  recipient_phone?: string;
  recipient_address?: string;
  recipient_city?: number;
  recipient_zone?: number;
  recipient_area?: number;
  recipient_city_name?: string;
  recipient_zone_name?: string;
  delivery_type?: number; // 48 Normal, 12 On Demand
  item_type?: number; // 1 Document, 2 Parcel
  item_weight?: number;
  item_quantity?: number;
  item_description?: string;
  special_instruction?: string;
  amount_to_collect?: number;
}) {
  const data = await callPathaoApi("create-order", params);
  if (!data?.ok) throw new Error(data?.error || data?.message || "Pathao order dispatch failed");
  return data;
}

/**
 * Synchronize live order tracking info from Pathao.
 */
export async function syncPathaoStatus(consignmentId: string, orderId?: string) {
  const data = await callPathaoApi("order-info", { consignment_id: consignmentId, order_id: orderId });
  if (!data?.ok && data?.error) throw new Error(data.error);
  return data;
}
