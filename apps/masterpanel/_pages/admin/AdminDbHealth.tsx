"use client";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabsWithParam } from "@/components/admin/TabsWithParam";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingRow, TableEmptyRow, EmptyState } from "@/components/admin/TableStates";
import { Activity, AlertTriangle, RefreshCw, Database, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/lib/app-toast";

type Summary = {
  http_response_rows: number;
  http_response_size: string;
  cron_jobs_active: number;
  cron_runs_24h: number;
  cron_failures_24h: number;
  recent_alerts_24h: number;
  captured_at: string;
};

type TableStat = {
  relname: string;
  seq_scan: number;
  seq_tup_read: number;
  idx_scan: number;
  idx_tup_fetch: number;
  n_live_tup: number;
  last_autoanalyze: string | null;
};

type CronRun = {
  jobid: number;
  jobname: string;
  schedule: string;
  runid: number;
  status: string;
  return_message: string | null;
  start_time: string;
  end_time: string | null;
  duration_ms: number | null;
};

type Alert = {
  id: string;
  kind: string;
  severity: string;
  message: string;
  details: Record<string, unknown>;
  created_at: string;
};

export default function AdminDbHealth() {
  const summary = useQuery({
    queryKey: ["db-health-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_db_health_summary");
      if (error) throw error;
      return data as unknown as Summary;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const stats = useQuery({
    queryKey: ["db-health-table-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_db_table_stats");
      if (error) throw error;
      return (data ?? []) as TableStat[];
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const cron = useQuery({
    queryKey: ["db-health-cron-runs"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_cron_runs", { p_hours: 24 });
      if (error) throw error;
      return (data ?? []) as CronRun[];
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const alerts = useQuery({
    queryKey: ["db-health-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("db_health_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Alert[];
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const refetchAll = () => {
    summary.refetch();
    stats.refetch();
    cron.refetch();
    alerts.refetch();
    toast.success("Refreshed");
  };

  // Per-job aggregation
  const jobAgg = (cron.data ?? []).reduce<Record<string, { name: string; total: number; ok: number; failed: number; last: string }>>((acc, r) => {
    const k = String(r.jobid);
    if (!acc[k]) acc[k] = { name: r.jobname, total: 0, ok: 0, failed: 0, last: r.start_time };
    acc[k].total++;
    if (r.status === "succeeded") acc[k].ok++;
    if (r.status === "failed") acc[k].failed++;
    if (r.start_time > acc[k].last) acc[k].last = r.start_time;
    return acc;
  }, {});

  const s = summary.data;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Database Health</h1>
          <p className="text-sm text-muted-foreground">
            Disk IO, sequential scans, cron runs & threshold alerts
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refetchAll}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryCard icon={<Database className="h-4 w-4" />} label="HTTP backlog"
          value={s ? `${s.http_response_rows} rows` : "…"} sub={s?.http_response_size} />
        <SummaryCard icon={<Clock className="h-4 w-4" />} label="Cron runs / 24h"
          value={s ? String(s.cron_runs_24h) : "…"} sub={`${s?.cron_jobs_active ?? 0} active jobs`} />
        <SummaryCard icon={<AlertTriangle className="h-4 w-4" />} label="Cron failures / 24h"
          value={s ? String(s.cron_failures_24h) : "…"}
          tone={s && s.cron_failures_24h > 0 ? "danger" : "ok"} />
        <SummaryCard icon={<Activity className="h-4 w-4" />} label="Alerts / 24h"
          value={s ? String(s.recent_alerts_24h) : "…"}
          tone={s && s.recent_alerts_24h > 0 ? "warn" : "ok"} />
      </div>

      <TabsWithParam defaultTab="tables" basePath="/system/db-health">
        <TabsList className="hidden">
          <TabsTrigger value="tables">Table stats</TabsTrigger>
          <TabsTrigger value="cron">Cron runs</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts {alerts.data && alerts.data.length > 0 ? (
              <Badge variant="secondary" className="ml-2">{alerts.data.length}</Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Hot tables — scan ratio</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table</TableHead>
                    <TableHead className="text-right">Live rows</TableHead>
                    <TableHead className="text-right">Seq scans</TableHead>
                    <TableHead className="text-right">Index scans</TableHead>
                    <TableHead className="text-right">Index hit ratio</TableHead>
                    <TableHead>Last analyze</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.isLoading && <TableLoadingRow cols={6} rows={6} />}
                  {!stats.isLoading && stats.data && stats.data.length === 0 && (
                    <TableEmptyRow cols={6} icon={<Database className="w-5 h-5" />} message="No table stats available" />
                  )}
                  {(stats.data ?? []).map((t) => {
                    const total = t.seq_scan + t.idx_scan;
                    const ratio = total > 0 ? (t.idx_scan / total) * 100 : 0;
                    return (
                      <TableRow key={t.relname}>
                        <TableCell className="font-mono">{t.relname}</TableCell>
                        <TableCell className="text-right">{t.n_live_tup.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{t.seq_scan.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{t.idx_scan.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={ratio > 70 ? "default" : ratio > 30 ? "secondary" : "destructive"}>
                            {ratio.toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {t.last_autoanalyze ? formatDistanceToNow(new Date(t.last_autoanalyze), { addSuffix: true }) : "never"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <p className="mt-3 text-xs text-muted-foreground">
                On tiny tables (&lt; 1k rows), Postgres deliberately picks seq scans because PK lookups are cheaper. As tables grow, index hit ratio should climb past 80%.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cron" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Jobs (last 24h)</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>OK</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>Last run</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cron.isLoading && <TableLoadingRow cols={5} rows={4} />}
                  {!cron.isLoading && Object.keys(jobAgg).length === 0 && (
                    <TableEmptyRow cols={5} icon={<Clock className="w-5 h-5" />} message="No cron jobs in the last 24 hours" />
                  )}
                  {Object.entries(jobAgg).map(([k, j]) => (
                    <TableRow key={k}>
                      <TableCell className="font-mono">{j.name}</TableCell>
                      <TableCell>{j.total}</TableCell>
                      <TableCell><Badge variant="secondary">{j.ok}</Badge></TableCell>
                      <TableCell>
                        {j.failed > 0 ? <Badge variant="destructive">{j.failed}</Badge> : <Badge variant="outline">0</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(j.last), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Recent runs</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cron.isLoading && <TableLoadingRow cols={5} rows={4} />}
                  {!cron.isLoading && (cron.data ?? []).length === 0 && (
                    <TableEmptyRow cols={5} icon={<Clock className="w-5 h-5" />} message="No recent runs" />
                  )}
                  {(cron.data ?? []).slice(0, 100).map((r) => (
                    <TableRow key={`${r.jobid}-${r.runid}`}>
                      <TableCell className="font-mono text-xs">{r.jobname}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "succeeded" ? "secondary" : r.status === "failed" ? "destructive" : "outline"}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDistanceToNow(new Date(r.start_time), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-xs">{r.duration_ms ? `${Math.round(r.duration_ms)}ms` : "—"}</TableCell>
                      <TableCell className="max-w-md truncate text-xs text-muted-foreground">
                        {r.return_message ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.data && alerts.data.length === 0 ? (
                <EmptyState
                  icon={<AlertTriangle className="w-5 h-5" />}
                  message="No alerts"
                  hint="Thresholds: seq_scan delta > 5000 / 15min, HTTP backlog > 5000 rows, any cron failure in last hour."
                />
              ) : (
                <div className="space-y-2">
                  {(alerts.data ?? []).map((a) => (
                    <div key={a.id} className="flex items-start gap-3 rounded-lg border p-3">
                      <AlertTriangle className={`mt-0.5 h-4 w-4 ${a.severity === "error" ? "text-destructive" : "text-yellow-500"}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{a.kind}</span>
                          <Badge variant={a.severity === "error" ? "destructive" : "secondary"}>{a.severity}</Badge>
                        </div>
                        <p className="mt-1 text-sm">{a.message}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </TabsWithParam>
    </div>
  );
}

function SummaryCard({ icon, label, value, sub, tone = "ok" }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  tone?: "ok" | "warn" | "danger";
}) {
  const toneClass = tone === "danger" ? "text-destructive" : tone === "warn" ? "text-yellow-500" : "";
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
        <div className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</div>
        {sub ? <div className="text-xs text-muted-foreground">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}
// code:4ce0
