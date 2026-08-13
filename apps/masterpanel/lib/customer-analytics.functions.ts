"use server";

// Customer Analytics — cohorts, churn risk, top products/categories, activity heatmap.
import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Input = z.object({
  days: z.number().int().min(7).max(180).default(60),
});

type CohortRow = { cohort: string; size: number; retained: number[] }; // retained[0]=week0, etc.
type ChurnBucket = { label: string; count: number; avg_days_since: number };
type TopProduct = { product_id: string; name: string | null; thumbnail: string | null; score: number; views: number; carts: number; purchases: number };
type TopCategory = { category_id: string; name: string | null; score: number };
type HeatCell = { dow: number; hour: number; count: number };

export const getCustomerAnalytics = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const sinceMs = Date.now() - data.days * 86_400_000;
    const since = new Date(sinceMs).toISOString();

    // 1) Load orders in range for cohort + churn
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, total, created_at, status")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(5000);
    const orderRows = orders ?? [];

    // 2) Interactions in range for engagement signals
    const { data: interactions } = await supabaseAdmin
      .from("product_interactions")
      .select("user_id, product_id, kind, created_at")
      .gte("created_at", since)
      .limit(20000);
    const intRows = interactions ?? [];

    // ---------- Summary ----------
    const userIds = new Set<string>();
    let revenue = 0;
    for (const o of orderRows) {
      if (o.user_id) userIds.add(o.user_id);
      revenue += Number(o.total ?? 0);
    }
    const ordersByUser = new Map<string, number>();
    for (const o of orderRows) {
      if (!o.user_id) continue;
      ordersByUser.set(o.user_id, (ordersByUser.get(o.user_id) ?? 0) + 1);
    }
    const repeatBuyers = [...ordersByUser.values()].filter((c) => c > 1).length;
    const summary = {
      orders: orderRows.length,
      buyers: userIds.size,
      repeat_buyers: repeatBuyers,
      repeat_rate: userIds.size ? repeatBuyers / userIds.size : 0,
      revenue,
      aov: orderRows.length ? revenue / orderRows.length : 0,
    };

    // ---------- Weekly cohorts (acquisition week × subsequent active weeks) ----------
    // Acquisition = first order in the window.
    const firstOrderByUser = new Map<string, number>();
    for (const o of orderRows) {
      if (!o.user_id) continue;
      const t = new Date(o.created_at).getTime();
      const prev = firstOrderByUser.get(o.user_id);
      if (prev === undefined || t < prev) firstOrderByUser.set(o.user_id, t);
    }
    const weekMs = 7 * 86_400_000;
    const cohortBuckets = new Map<string, { firstWeek: number; users: Set<string> }>();
    for (const [uid, t] of firstOrderByUser.entries()) {
      const week = Math.floor((t - sinceMs) / weekMs);
      const key = new Date(sinceMs + week * weekMs).toISOString().slice(0, 10);
      const c = cohortBuckets.get(key) ?? { firstWeek: week, users: new Set<string>() };
      c.users.add(uid);
      cohortBuckets.set(key, c);
    }
    const totalWeeks = Math.ceil(data.days / 7);
    const cohorts: CohortRow[] = [...cohortBuckets.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([cohort, c]) => {
        const retained = Array<number>(Math.max(1, totalWeeks - c.firstWeek)).fill(0);
        const userSet = c.users;
        const activeWeekByUser = new Map<string, Set<number>>();
        for (const o of orderRows) {
          if (!o.user_id || !userSet.has(o.user_id)) continue;
          const w = Math.floor((new Date(o.created_at).getTime() - sinceMs) / weekMs) - c.firstWeek;
          if (w < 0 || w >= retained.length) continue;
          const set = activeWeekByUser.get(o.user_id) ?? new Set<number>();
          set.add(w);
          activeWeekByUser.set(o.user_id, set);
        }
        for (const set of activeWeekByUser.values()) {
          for (const w of set) retained[w] = (retained[w] ?? 0) + 1;
        }
        return { cohort, size: userSet.size, retained };
      });

    // ---------- Churn risk buckets (based on last activity) ----------
    const lastActivityByUser = new Map<string, number>();
    for (const o of orderRows) {
      if (!o.user_id) continue;
      const t = new Date(o.created_at).getTime();
      const cur = lastActivityByUser.get(o.user_id) ?? 0;
      if (t > cur) lastActivityByUser.set(o.user_id, t);
    }
    for (const r of intRows) {
      if (!r.user_id) continue;
      const t = new Date(r.created_at).getTime();
      const cur = lastActivityByUser.get(r.user_id) ?? 0;
      if (t > cur) lastActivityByUser.set(r.user_id, t);
    }
    const now = Date.now();
    const buckets: Record<string, { count: number; sum: number }> = {
      "Active (≤7d)": { count: 0, sum: 0 },
      "Cooling (8–30d)": { count: 0, sum: 0 },
      "At risk (31–60d)": { count: 0, sum: 0 },
      "Churned (60d+)": { count: 0, sum: 0 },
    };
    for (const t of lastActivityByUser.values()) {
      const days = Math.floor((now - t) / 86_400_000);
      const label =
        days <= 7 ? "Active (≤7d)" : days <= 30 ? "Cooling (8–30d)" : days <= 60 ? "At risk (31–60d)" : "Churned (60d+)";
      buckets[label].count += 1;
      buckets[label].sum += days;
    }
    const churn: ChurnBucket[] = Object.entries(buckets).map(([label, v]) => ({
      label,
      count: v.count,
      avg_days_since: v.count ? Math.round(v.sum / v.count) : 0,
    }));

    // ---------- Top products by interaction signal ----------
    const KIND_W: Record<string, number> = { view: 1, click: 1.5, wishlist: 2.5, cart: 3, purchase: 4, dwell: 0.5 };
    const prodAgg = new Map<string, { score: number; views: number; carts: number; purchases: number }>();
    for (const r of intRows) {
      const a = prodAgg.get(r.product_id) ?? { score: 0, views: 0, carts: 0, purchases: 0 };
      a.score += KIND_W[r.kind] ?? 1;
      if (r.kind === "view") a.views += 1;
      if (r.kind === "cart") a.carts += 1;
      if (r.kind === "purchase") a.purchases += 1;
      prodAgg.set(r.product_id, a);
    }
    const topIds = [...prodAgg.entries()].sort((a, b) => b[1].score - a[1].score).slice(0, 10);
    let topProducts: TopProduct[] = [];
    if (topIds.length) {
      const { data: prods } = await supabaseAdmin
        .from("products")
        .select("id, name, thumbnail, category_id")
        .in("id", topIds.map(([id]) => id));
      const byId = new Map((prods ?? []).map((p) => [p.id, p]));
      topProducts = topIds.map(([id, a]) => {
        const p = byId.get(id);
        return {
          product_id: id,
          name: p?.name ?? null,
          thumbnail: p?.thumbnail ?? null,
          ...a,
        };
      });
    }

    // ---------- Top categories ----------
    const catAgg = new Map<string, number>();
    if (topProducts.length || intRows.length) {
      const allProductIds = [...new Set(intRows.map((r) => r.product_id))];
      if (allProductIds.length) {
        const { data: catRows } = await supabaseAdmin
          .from("products")
          .select("id, category_id")
          .in("id", allProductIds.slice(0, 500));
        const productCat = new Map((catRows ?? []).map((p) => [p.id, p.category_id]));
        for (const [pid, a] of prodAgg.entries()) {
          const cid = productCat.get(pid);
          if (!cid) continue;
          catAgg.set(cid, (catAgg.get(cid) ?? 0) + a.score);
        }
      }
    }
    const topCatEntries = [...catAgg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    let topCategories: TopCategory[] = [];
    if (topCatEntries.length) {
      const { data: cats } = await supabaseAdmin
        .from("categories")
        .select("id, name")
        .in("id", topCatEntries.map(([id]) => id));
      const byId = new Map((cats ?? []).map((c) => [c.id, c.name]));
      topCategories = topCatEntries.map(([id, score]) => ({
        category_id: id,
        name: byId.get(id) ?? null,
        score: Math.round(score * 10) / 10,
      }));
    }

    // ---------- Activity heatmap (day-of-week × hour) ----------
    const heat = new Map<string, number>();
    for (const r of intRows) {
      const d = new Date(r.created_at);
      const key = `${d.getDay()}-${d.getHours()}`;
      heat.set(key, (heat.get(key) ?? 0) + 1);
    }
    const heatmap: HeatCell[] = [];
    for (let dow = 0; dow < 7; dow++) {
      for (let hour = 0; hour < 24; hour++) {
        heatmap.push({ dow, hour, count: heat.get(`${dow}-${hour}`) ?? 0 });
      }
    }

    return { summary, cohorts, churn, topProducts, topCategories, heatmap, totalWeeks };
  });
// code:4ce0
