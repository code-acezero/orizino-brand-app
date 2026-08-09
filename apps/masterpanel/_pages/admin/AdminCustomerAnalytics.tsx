"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Repeat, DollarSign, ShoppingBag, Flame, AlertTriangle } from "lucide-react";
import { getCustomerAnalytics } from "@/lib/customer-analytics.functions";

const RANGES = [
  { label: "30d", days: 30 },
  { label: "60d", days: 60 },
  { label: "90d", days: 90 },
  { label: "180d", days: 180 },
];

const fmtMoney = (n: number) => `৳${Math.round(n).toLocaleString()}`;
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const AdminCustomerAnalytics = () => {
  const [days, setDays] = useState(60);
  const fetchAnalytics = useServerFn(getCustomerAnalytics);

  const { data, isLoading } = useQuery({
    queryKey: ["customer-analytics", days],
    queryFn: () => fetchAnalytics({ data: { days } }),
    staleTime: 60_000,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-display font-bold">Customer Analytics</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const { summary, cohorts, churn, topProducts, topCategories, heatmap, totalWeeks } = data;
  const maxHeat = Math.max(1, ...heatmap.map((h) => h.count));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">Customer Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Cohorts, churn risk, and behavioral signals.</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {RANGES.map((r) => (
            <Button
              key={r.days}
              size="sm"
              variant={days === r.days ? "default" : "ghost"}
              onClick={() => setDays(r.days)}
              className="h-7 px-3"
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<Users className="w-4 h-4" />} label="Buyers" value={summary.buyers.toString()} />
        <KpiCard icon={<ShoppingBag className="w-4 h-4" />} label="Orders" value={summary.orders.toString()} />
        <KpiCard
          icon={<Repeat className="w-4 h-4" />}
          label="Repeat rate"
          value={fmtPct(summary.repeat_rate)}
          hint={`${summary.repeat_buyers} repeat buyers`}
        />
        <KpiCard
          icon={<DollarSign className="w-4 h-4" />}
          label="Revenue"
          value={fmtMoney(summary.revenue)}
          hint={`AOV ${fmtMoney(summary.aov)}`}
        />
      </div>

      {/* Cohorts */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly cohorts</CardTitle>
          <CardDescription>
            Each row is the cohort that placed their first order that week. Cells show repeat-active buyers per week after acquisition.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cohorts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cohorts in this range yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left pr-3 py-1.5">Cohort</th>
                    <th className="text-right pr-3 py-1.5">Size</th>
                    {Array.from({ length: totalWeeks }).map((_, i) => (
                      <th key={i} className="text-center px-1.5 py-1.5">W{i}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cohorts.map((c) => (
                    <tr key={c.cohort} className="border-t border-border">
                      <td className="pr-3 py-1.5 font-medium">{c.cohort}</td>
                      <td className="pr-3 py-1.5 text-right tabular-nums">{c.size}</td>
                      {Array.from({ length: totalWeeks }).map((_, i) => {
                        const v = c.retained[i];
                        const pct = c.size && v != null ? v / c.size : 0;
                        const bg =
                          v == null
                            ? "transparent"
                            : pct > 0
                              ? `color-mix(in oklab, hsl(var(--primary)) ${Math.min(100, Math.round(pct * 100 + 8))}%, transparent)`
                              : "hsl(var(--muted))";
                        return (
                          <td key={i} className="px-1 py-1">
                            <div
                              className="w-10 h-7 rounded text-center text-[10px] flex items-center justify-center tabular-nums"
                              style={{ background: bg }}
                              title={v != null ? `${v} / ${c.size} (${fmtPct(pct)})` : "—"}
                            >
                              {v ?? ""}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Churn risk */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Churn risk
            </CardTitle>
            <CardDescription>Buckets by days since last order or browse interaction.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {churn.map((b) => {
              const total = churn.reduce((a, c) => a + c.count, 0);
              const pct = total ? b.count / total : 0;
              return (
                <div key={b.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{b.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {b.count} · avg {b.avg_days_since}d
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.max(2, pct * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Top categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="w-4 h-4" /> Top categories
            </CardTitle>
            <CardDescription>Ranked by weighted engagement (views, carts, purchases).</CardDescription>
          </CardHeader>
          <CardContent>
            {topCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not enough interaction data yet.</p>
            ) : (
              <ul className="space-y-2">
                {topCategories.map((c, i) => {
                  const max = topCategories[0]?.score || 1;
                  return (
                    <li key={c.category_id} className="flex items-center gap-3 text-sm">
                      <span className="w-5 text-muted-foreground tabular-nums">{i + 1}</span>
                      <span className="flex-1 truncate">{c.name ?? "Uncategorized"}</span>
                      <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${(c.score / max) * 100}%` }} />
                      </div>
                      <span className="w-12 text-right tabular-nums text-muted-foreground">{c.score}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top products */}
      <Card>
        <CardHeader>
          <CardTitle>Top products by engagement</CardTitle>
          <CardDescription>Weighted score = views + clicks + cart × 3 + purchase × 4.</CardDescription>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No interactions in this range yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-xs">
                    <th className="text-left py-2">Product</th>
                    <th className="text-right py-2 pr-3">Views</th>
                    <th className="text-right py-2 pr-3">Carts</th>
                    <th className="text-right py-2 pr-3">Purchases</th>
                    <th className="text-right py-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p) => (
                    <tr key={p.product_id} className="border-t border-border">
                      <td className="py-2">
                        <div className="flex items-center gap-3">
                          {p.thumbnail ? (
                            <img src={p.thumbnail} alt="" className="w-9 h-9 rounded object-cover border border-border" />
                          ) : (
                            <div className="w-9 h-9 rounded bg-muted" />
                          )}
                          <span className="truncate max-w-[280px]">{p.name ?? "(deleted)"}</span>
                        </div>
                      </td>
                      <td className="text-right tabular-nums pr-3">{p.views}</td>
                      <td className="text-right tabular-nums pr-3">{p.carts}</td>
                      <td className="text-right tabular-nums pr-3">{p.purchases}</td>
                      <td className="text-right tabular-nums font-medium">{Math.round(p.score * 10) / 10}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Activity heatmap</CardTitle>
          <CardDescription>When buyers interact with products (day of week × hour, local time).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="inline-grid gap-px" style={{ gridTemplateColumns: "40px repeat(24, 1fr)" }}>
              <div />
              {Array.from({ length: 24 }).map((_, h) => (
                <div key={h} className="text-[9px] text-muted-foreground text-center">
                  {h % 3 === 0 ? h : ""}
                </div>
              ))}
              {DOW.map((label, dow) => (
                <React.Fragment key={`row-${dow}`}>
                  <div className="text-[10px] text-muted-foreground pr-2 flex items-center justify-end">
                    {label}
                  </div>
                  {Array.from({ length: 24 }).map((_, hour) => {
                    const cell = heatmap.find((c) => c.dow === dow && c.hour === hour);
                    const v = cell?.count ?? 0;
                    const intensity = v / maxHeat;
                    return (
                      <div
                        key={`${dow}-${hour}`}
                        className="aspect-square min-w-[14px] rounded-sm"
                        style={{
                          background:
                            v === 0
                              ? "hsl(var(--muted))"
                              : `color-mix(in oklab, hsl(var(--primary)) ${Math.round(intensity * 90 + 10)}%, transparent)`,
                        }}
                        title={`${DOW[dow]} ${hour}:00 — ${v}`}
                      />
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const KpiCard = ({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-display font-bold mt-1.5 tabular-nums">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground mt-0.5">{hint}</p> : null}
    </CardContent>
  </Card>
);

export default AdminCustomerAnalytics;
// code:4ce0
