"use client";
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { TrendingUp } from "lucide-react";

interface SalesDataPoint {
  date: string;
  fullDate: string;
  revenue: number;
  orders: number;
}

export default function DashboardSalesChart({ isCompact = false }: { isCompact?: boolean }) {
  const [metric, setMetric] = useState<"revenue" | "orders">("revenue");
  const [days, setDays] = useState<number>(7);

  const { data: chartData = [], isLoading } = useQuery<SalesDataPoint[]>({
    queryKey: ["dashboard-sales-chart", days],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const since = subDays(startOfDay(new Date()), days - 1).toISOString();
      const { data: orders } = await supabase
        .from("orders")
        .select("id, total, status, created_at")
        .gte("created_at", since)
        .neq("status", "cancelled");

      const map: Record<string, { revenue: number; orders: number; fullDate: string }> = {};

      for (let i = days - 1; i >= 0; i--) {
        const d = subDays(new Date(), i);
        const key = format(d, "MMM dd");
        const fullDate = format(d, "EEEE, MMMM dd, yyyy");
        map[key] = { revenue: 0, orders: 0, fullDate };
      }

      (orders ?? []).forEach((o) => {
        const key = format(new Date(o.created_at), "MMM dd");
        if (map[key]) {
          map[key].revenue += Number(o.total || 0);
          map[key].orders += 1;
        }
      });

      return Object.entries(map).map(([date, val]) => ({
        date,
        fullDate: val.fullDate,
        revenue: val.revenue,
        orders: val.orders,
      }));
    },
  });

  const totals = useMemo(() => {
    const totalRev = chartData.reduce((acc, d) => acc + d.revenue, 0);
    const totalOrders = chartData.reduce((acc, d) => acc + d.orders, 0);
    const aov = totalOrders > 0 ? Math.round(totalRev / totalOrders) : 0;
    return { totalRev, totalOrders, aov };
  }, [chartData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: SalesDataPoint = payload[0].payload;
      return (
        <div className="border border-border/80 bg-background/95 p-2.5 rounded-xl shadow-xl text-xs space-y-1 min-w-[140px]">
          <p className="font-semibold text-foreground border-b border-border/40 pb-1 text-[11px] text-muted-foreground">
            {data.fullDate}
          </p>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Revenue:
            </span>
            <span className="font-bold text-foreground font-mono">
              ৳{data.revenue.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Orders:
            </span>
            <span className="font-bold text-foreground font-mono">
              {data.orders}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full flex flex-col justify-between">
      {/* Flat Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Performance Trend
            </span>
            <span className="text-[11px] font-mono text-emerald-500">
              ৳{totals.totalRev.toLocaleString()} ({totals.totalOrders} orders)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-secondary/40 p-1 rounded-xl border border-border/60 gap-1">
            <button
              onClick={() => setMetric("revenue")}
              className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                metric === "revenue"
                  ? "bg-foreground text-background shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => setMetric("orders")}
              className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                metric === "orders"
                  ? "bg-foreground text-background shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              Orders
            </button>
          </div>

          <div className="flex items-center bg-secondary/40 p-1 rounded-xl border border-border/60 gap-1">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-2.5 py-1 text-[10px] font-mono font-semibold rounded-lg transition-all cursor-pointer ${
                  days === d
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className={isCompact ? "h-44 w-full pt-2" : "h-52 sm:h-56 w-full pt-3"}>
        {isLoading ? (
          <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
            Loading telemetry...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="flatRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="flatOrdersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground)/0.4)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dy={6}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground)/0.4)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => (metric === "revenue" ? `৳${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}` : v)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey={metric}
                stroke={metric === "revenue" ? "#10b981" : "#f59e0b"}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#${metric === "revenue" ? "flatRevenueGrad" : "flatOrdersGrad"})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
