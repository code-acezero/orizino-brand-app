import { supabase } from "./supabase";

// The @orizino/sb generated Database type predates product_serials,
// product_serial_events, and the orders.order_source/customer_name columns
// (added in later migrations) — masterpanel's own server functions work
// around the same drift with `as any` at these exact call sites. Same fix
// here, scoped to just the tables/columns affected.
const sb = supabase as any;

export interface OrderRow {
  id: string;
  order_number: string;
  customer_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  status: string;
  payment_status: string;
  order_source: string;
  total: number;
  created_at: string;
}

export interface OrderFilters {
  status?: string;
  source?: string;
  search?: string;
  limit?: number;
}

export async function listOrders(filters: OrderFilters = {}): Promise<OrderRow[]> {
  let q = sb
    .from("orders")
    .select("id, order_number, customer_name, guest_email, guest_phone, status, payment_status, order_source, total, created_at")
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 50);
  if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
  if (filters.source && filters.source !== "all") q = q.eq("order_source", filters.source);
  if (filters.search) q = q.or(`order_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as OrderRow[];
}

export async function getOrder(orderId: string) {
  const { data: order, error } = await sb.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (error) throw new Error(error.message);
  const { data: items } = await sb.from("order_items").select("*").eq("order_id", orderId);
  return { order, items: items ?? [] };
}

export async function updateOrderStatus(orderId: string, status: string) {
  const { error } = await sb.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", orderId);
  if (error) throw new Error(error.message);
}

/** Dashboard KPIs — today's revenue/orders plus a breakdown by source & status. */
export async function fetchDashboardStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [{ data: todayOrders }, { data: allRecent }] = await Promise.all([
    sb.from("orders").select("id, total, status, order_source").gte("created_at", startOfToday.toISOString()),
    sb
      .from("orders")
      .select("id, total, status, order_source, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const today = todayOrders ?? [];
  const todayRevenue = today.filter((o) => o.status !== "cancelled").reduce((s, o) => s + Number(o.total || 0), 0);
  const todayCount = today.length;

  const bySource = new Map<string, number>();
  const byStatus = new Map<string, number>();
  for (const o of allRecent ?? []) {
    bySource.set(o.order_source ?? "online", (bySource.get(o.order_source ?? "online") ?? 0) + 1);
    byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1);
  }

  return {
    todayRevenue,
    todayCount,
    bySource: [...bySource.entries()].map(([source, count]) => ({ source, count })),
    byStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count })),
    recent: (allRecent ?? []).slice(0, 8),
  };
}
