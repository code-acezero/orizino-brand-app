"use client";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeVisitors } from "@/hooks/use-realtime-visitors";
import { useNavigate } from "@/lib/router-compat";
import { motion } from "framer-motion";
import {
  Radio, ShoppingCart, ShieldCheck, Headphones, ArrowUpRight,
  AlertTriangle, Activity,
} from "lucide-react";

function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function VitalCard({
  title, value, sub, icon: Icon, color, href, alert, onClick,
}: {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ComponentType<any>;
  color: string;
  href?: string;
  alert?: boolean;
  onClick?: () => void;
}) {
  const navigate = useNavigate();
  const go = () => {
    if (onClick) onClick();
    else if (href) navigate(href);
  };
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      onClick={go}
      className="group relative w-full text-left rounded-xl border border-border/60 bg-card hover:border-border hover:shadow-sm transition-all overflow-hidden"
    >
      <div
        className="absolute inset-x-0 top-0 h-0.5 opacity-70 group-hover:opacity-100 transition-opacity"
        style={{ background: color }}
      />
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}18`, border: `1px solid ${color}30` }}
          >
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          {alert ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-destructive">
              <AlertTriangle className="w-3 h-3" /> Alert
            </span>
          ) : (
            <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
          )}
        </div>
        <p className="text-xs font-semibold tracking-[0.02em] text-muted-foreground/80">{title}</p>
        <p className="text-2xl font-display font-bold mt-1 tabular-nums">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
      </div>
    </motion.button>
  );
}

export default function LiveVitals() {
  const qc = useQueryClient();

  // 1. Visitors + active sessions
  const visitors = useRealtimeVisitors();
  const { data: activeSessions = 0 } = useQuery({
    queryKey: ["vitals", "sessions"],
    queryFn: async () => {
      const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("user_sessions")
        .select("*", { count: "exact", head: true })
        .gte("last_seen_at", since);
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });

  // 2. Orders + revenue today
  const { data: ordersToday } = useQuery({
    queryKey: ["vitals", "orders-today"],
    queryFn: async () => {
      const { data, count } = await supabase
        .from("orders")
        .select("total", { count: "exact" })
        .gte("created_at", todayISO());
      const revenue = (data ?? []).reduce((sum: number, r: any) => sum + Number(r.total ?? 0), 0);
      return { count: count ?? 0, revenue };
    },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const ch = supabase
      .channel("vitals-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        qc.invalidateQueries({ queryKey: ["vitals", "orders-today"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  // 3. DB health
  const { data: health } = useQuery({
    queryKey: ["vitals", "db-health"],
    queryFn: async () => {
      const [summaryRes, alertsRes] = await Promise.all([
        supabase.rpc("admin_db_health_summary"),
        supabase
          .from("db_health_alerts")
          .select("severity", { count: "exact" })
          .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()),
      ]);
      const summary = (summaryRes.data as any) ?? null;
      const alerts = alertsRes.data ?? [];
      const errorCount = alerts.filter((a: any) => a.severity === "error").length;
      return { summary, alertCount: alerts.length, errorCount };
    },
    refetchInterval: 60_000,
  });

  // 4. Support + calls
  const { data: support } = useQuery({
    queryKey: ["vitals", "support"],
    queryFn: async () => {
      const [conv, calls] = await Promise.all([
        supabase.from("support_conversations").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase
          .from("call_logs")
          .select("*", { count: "exact", head: true })
          .in("status", ["ringing", "in_progress", "queued"]),
      ]);
      return { openConversations: conv.count ?? 0, activeCalls: calls.count ?? 0 };
    },
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const ch = supabase
      .channel("vitals-support")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_conversations" }, () => {
        qc.invalidateQueries({ queryKey: ["vitals", "support"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "call_logs" }, () => {
        qc.invalidateQueries({ queryKey: ["vitals", "support"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const currency = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-primary" />
        <p className="text-xs font-semibold tracking-[0.02em] text-muted-foreground">Live Vitals</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <VitalCard
          title="Visitors"
          value={visitors ?? 0}
          sub={`${activeSessions} active session${activeSessions === 1 ? "" : "s"} · last 5 min`}
          icon={Radio}
          color="#38bdf8"
          href="/sales/customer-analytics"
        />
        <VitalCard
          title="Orders today"
          value={ordersToday?.count ?? 0}
          sub={`Revenue ${currency(ordersToday?.revenue ?? 0)}`}
          icon={ShoppingCart}
          color="#f59e0b"
          href="/sales/orders"
        />
        <VitalCard
          title="System health"
          value={health?.errorCount ? `${health.errorCount} err` : "OK"}
          sub={
            health?.summary
              ? `${health.summary.cron_jobs_active ?? 0} cron · ${health.summary.recent_alerts_24h ?? 0} alerts 24h`
              : "Loading…"
          }
          icon={ShieldCheck}
          color={health?.errorCount ? "#ef4444" : "#10b981"}
          alert={!!health?.errorCount}
          href="/system/db-health"
        />
        <VitalCard
          title="Live support"
          value={(support?.openConversations ?? 0) + (support?.activeCalls ?? 0)}
          sub={`${support?.openConversations ?? 0} open chat · ${support?.activeCalls ?? 0} on call`}
          icon={Headphones}
          color="#a855f7"
          href="/sales/support"
        />
      </div>
    </div>
  );
}
// code:4ce0
