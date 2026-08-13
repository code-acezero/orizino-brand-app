"use server";

import { createServerFn } from "@orizino/shared/lib/server-fn-compat";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { googleAccessToken, GOOGLE_SCOPES } from "@/integrations/google/service-account";

const API_BASE = "https://www.googleapis.com";

async function gcall(path: string, init?: RequestInit) {
  const token = await googleAccessToken(GOOGLE_SCOPES.searchConsole);
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Search Console [${res.status}]: ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : {};
}

export const listSearchConsoleSites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const data = await gcall("/webmasters/v3/sites");
    const sites: Array<{ siteUrl: string; permissionLevel: string }> =
      data.siteEntry ?? [];
    return { sites };
  });

export const getSearchConsoleSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteUrl: string; days?: number }) => input)
  .handler(async ({ data }) => {
    const days = data.days ?? 28;
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const encoded = encodeURIComponent(data.siteUrl);

    const body = JSON.stringify({
      startDate: fmt(start),
      endDate: fmt(end),
      dimensions: ["date"],
      rowLimit: 1000,
    });

    const analytics = await gcall(
      `/webmasters/v3/sites/${encoded}/searchAnalytics/query`,
      { method: "POST", body }
    );

    const rows: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> =
      analytics.rows ?? [];

    const totals = rows.reduce(
      (acc, r) => {
        acc.clicks += r.clicks;
        acc.impressions += r.impressions;
        return acc;
      },
      { clicks: 0, impressions: 0 }
    );
    const avgCtr = totals.impressions ? totals.clicks / totals.impressions : 0;
    const avgPos =
      rows.length > 0 ? rows.reduce((s, r) => s + r.position, 0) / rows.length : 0;

    // Top queries
    const topQ = await gcall(
      `/webmasters/v3/sites/${encoded}/searchAnalytics/query`,
      {
        method: "POST",
        body: JSON.stringify({
          startDate: fmt(start),
          endDate: fmt(end),
          dimensions: ["query"],
          rowLimit: 10,
        }),
      }
    );

    return {
      totals: { ...totals, avgCtr, avgPos },
      series: rows.map((r) => ({
        date: r.keys[0],
        clicks: r.clicks,
        impressions: r.impressions,
      })),
      topQueries: (topQ.rows ?? []).map((r: any) => ({
        query: r.keys[0],
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        position: r.position,
      })),
    };
  });

export const listSearchConsoleSitemaps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteUrl: string }) => input)
  .handler(async ({ data }) => {
    const encoded = encodeURIComponent(data.siteUrl);
    const res = await gcall(`/webmasters/v3/sites/${encoded}/sitemaps`);
    return { sitemaps: res.sitemap ?? [] };
  });

export const submitSearchConsoleSitemap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteUrl: string; feedpath: string }) => input)
  .handler(async ({ data }) => {
    const encSite = encodeURIComponent(data.siteUrl);
    const encFeed = encodeURIComponent(data.feedpath);
    await gcall(`/webmasters/v3/sites/${encSite}/sitemaps/${encFeed}`, {
      method: "PUT",
    });
    return { ok: true };
  });
