"use client";
import { Activity, ShieldCheck, Bug, AlertTriangle } from "lucide-react";
import SectionDashboardShell from "@/components/admin/dashboards/SectionDashboardShell";
import KpiCard from "@/components/admin/dashboards/KpiCard";
import { useKpiCount } from "@/components/admin/dashboards/useKpiCount";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function SystemDashboard() {
  const summary = useQuery({
    queryKey: ["system", "db-health-summary"],
    queryFn: async () => {
      const { data } = await supabase.rpc("admin_db_health_summary");
      return (data as any) ?? null;
    },
    refetchInterval: 60_000,
  });
  const alerts24h = useKpiCount(
    ["db-alerts", "24h"],
    "db_health_alerts",
    (q) => q.gte("created_at", new Date(Date.now() - 24 * 3600_000).toISOString()),
  );
  const errors1h = useKpiCount(
    ["db-alerts", "1h", "err"],
    "db_health_alerts",
    (q) => q.eq("severity", "error").gte("created_at", new Date(Date.now() - 3600_000).toISOString()),
  );

  return (
    <SectionDashboardShell
      title="Backend & System"
      description="Database health, cron pipeline, and diagnostics"
      icon={Activity}
      color="#38bdf8"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="System health"
          value={errors1h.data ? `${errors1h.data} err` : "OK"}
          sub="Last hour"
          icon={ShieldCheck}
          color={errors1h.data ? "#ef4444" : "#10b981"}
          alert={!!errors1h.data}
          href="/system/db-health?tab=alerts"
          loading={errors1h.isLoading}
        />
        <KpiCard
          title="Alerts (24h)"
          value={alerts24h.data ?? 0}
          sub="All severities"
          icon={AlertTriangle}
          color="#f59e0b"
          href="/system/db-health?tab=alerts"
          loading={alerts24h.isLoading}
        />
        <KpiCard
          title="Cron jobs"
          value={summary.data?.cron_jobs_active ?? "—"}
          sub="Active schedules"
          icon={Activity}
          color="#a855f7"
          href="/system/db-health?tab=cron"
          loading={summary.isLoading}
        />
        <KpiCard
          title="Debug console"
          value="Open"
          sub="Inspect runtime state"
          icon={Bug}
          color="#0ea5e9"
          href="/system/debug"
        />
      </div>
    </SectionDashboardShell>
  );
}
// code:4ce0
