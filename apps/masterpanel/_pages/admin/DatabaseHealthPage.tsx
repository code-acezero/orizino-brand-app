"use client";
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabsWithParam } from "@/components/admin/TabsWithParam";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingRow, TableEmptyRow, EmptyState } from "@/components/admin/TableStates";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  AlertTriangle,
  RefreshCw,
  Database,
  Clock,
  Search,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Zap,
  Sliders,
  Filter,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
} from "lucide-react";
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
  const [tableSearch, setTableSearch] = useState("");
  const [cronStatusFilter, setCronStatusFilter] = useState<"all" | "succeeded" | "failed">("all");
  const [cronSearch, setCronSearch] = useState("");
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<"all" | "error" | "warning" | "info">("all");
  const [expandedAlerts, setExpandedAlerts] = useState<Record<string, boolean>>({});

  const summary = useQuery({
    queryKey: ["db-health-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_db_health_summary");
      if (error) throw error;
      return data as unknown as Summary;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
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
    refetchInterval: 30_000,
    staleTime: 15_000,
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
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const refetchAll = () => {
    summary.refetch();
    stats.refetch();
    cron.refetch();
    alerts.refetch();
    toast.success("Database vitals refreshed");
  };

  // Filtered Table Stats
  const filteredTableStats = useMemo(() => {
    return (stats.data || []).filter((t) =>
      t.relname.toLowerCase().includes(tableSearch.toLowerCase())
    );
  }, [stats.data, tableSearch]);

  // Per-job aggregation
  const jobAgg = useMemo(() => {
    return (cron.data ?? []).reduce<
      Record<string, { name: string; total: number; ok: number; failed: number; last: string; schedule: string }>
    >((acc, r) => {
      const k = String(r.jobid || r.jobname);
      if (!acc[k]) {
        acc[k] = {
          name: r.jobname,
          schedule: r.schedule,
          total: 0,
          ok: 0,
          failed: 0,
          last: r.start_time,
        };
      }
      acc[k].total++;
      if (r.status === "succeeded") acc[k].ok++;
      if (r.status === "failed") acc[k].failed++;
      if (r.start_time > acc[k].last) acc[k].last = r.start_time;
      return acc;
    }, {});
  }, [cron.data]);

  // Filtered Cron Runs
  const filteredCronRuns = useMemo(() => {
    return (cron.data || []).filter((r) => {
      const matchesSearch = r.jobname.toLowerCase().includes(cronSearch.toLowerCase());
      const matchesStatus =
        cronStatusFilter === "all" ? true : r.status.toLowerCase() === cronStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [cron.data, cronSearch, cronStatusFilter]);

  // Filtered Alerts
  const filteredAlerts = useMemo(() => {
    return (alerts.data || []).filter((a) => {
      if (alertSeverityFilter === "all") return true;
      return a.severity.toLowerCase() === alertSeverityFilter;
    });
  }, [alerts.data, alertSeverityFilter]);

  const toggleAlertExpanded = (id: string) => {
    setExpandedAlerts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const s = summary.data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 animate-fade-in text-foreground">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20 shadow-xs shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-foreground">
                Database Health &amp; Table IO
              </h1>
              <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 bg-blue-500/10 text-blue-600 border-blue-500/30">
                PostgreSQL
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live sequential scans, table vacuum health, cron schedules &amp; automated threshold alerts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={refetchAll}
            className="h-9 px-3 text-xs gap-1.5 rounded-xl border-border/60 hover:bg-secondary/60 shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Vitals
          </Button>
        </div>
      </div>

      {/* ── Summary Metric Cards Grid (4 Columns) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: HTTP Backlog */}
        <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-blue-500" /> HTTP Backlog
            </span>
            <Badge variant="outline" className="text-[9px] font-mono">Buffer</Badge>
          </div>
          <div>
            <div className="text-xl font-bold font-display text-foreground">
              {s ? `${s.http_response_rows.toLocaleString()} Rows` : "..."}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Size: <span className="font-mono text-foreground font-semibold">{s?.http_response_size || "< 1 MB"}</span>
            </p>
          </div>
        </Card>

        {/* Metric 2: Cron Runs 24h */}
        <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-500" /> Cron Runs / 24h
            </span>
            <Badge variant="outline" className="text-[9px] font-mono bg-purple-500/5 text-purple-600 border-purple-500/30">
              {s?.cron_jobs_active ?? 0} Jobs
            </Badge>
          </div>
          <div>
            <div className="text-xl font-bold font-display text-foreground">
              {s ? s.cron_runs_24h.toLocaleString() : "..."}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Active recurring schedules
            </p>
          </div>
        </Card>

        {/* Metric 3: Cron Failures */}
        <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Cron Failures / 24h
            </span>
            <Badge
              variant="outline"
              className={`text-[9px] font-mono ${
                s && s.cron_failures_24h > 0
                  ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                  : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
              }`}
            >
              {s && s.cron_failures_24h > 0 ? "Issues" : "Nominal"}
            </Badge>
          </div>
          <div>
            <div className={`text-xl font-bold font-display ${s && s.cron_failures_24h > 0 ? "text-rose-600" : "text-foreground"}`}>
              {s ? String(s.cron_failures_24h) : "..."}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {s && s.cron_failures_24h === 0 ? "100% Success rate" : "Review failed cron logs"}
            </p>
          </div>
        </Card>

        {/* Metric 4: System Alerts */}
        <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-500" /> Alerts / 24h
            </span>
            <Badge
              variant="outline"
              className={`text-[9px] font-mono ${
                s && s.recent_alerts_24h > 0
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                  : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
              }`}
            >
              {s && s.recent_alerts_24h > 0 ? "Logged" : "Clean"}
            </Badge>
          </div>
          <div>
            <div className="text-xl font-bold font-display text-foreground">
              {s ? String(s.recent_alerts_24h) : "..."}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Logged performance alerts
            </p>
          </div>
        </Card>
      </div>

      {/* ── Sub-Tabs driven by URL Parameter ── */}
      <TabsWithParam defaultTab="tables" basePath="/system/db-health">
        <TabsList className="hidden">
          <TabsTrigger value="tables">Table stats</TabsTrigger>
          <TabsTrigger value="cron">Cron runs</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts{" "}
            {alerts.data && alerts.data.length > 0 ? (
              <Badge variant="secondary" className="ml-2">{alerts.data.length}</Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1: TABLE STATS & SCAN RATIOS (tables)
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="tables" className="space-y-4 m-0 focus-visible:outline-none">
          <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 overflow-hidden">
            <CardHeader className="p-5 border-b border-border/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-blue-500" />
                    Database Table IO &amp; Index Scan Efficiency
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Live sequential scans vs index lookups. High index ratios (&gt; 80%) signify optimized database querying.
                  </CardDescription>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search table name..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="h-8 pl-8 text-xs rounded-xl bg-background border-border/60"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow className="border-border/40">
                    <TableHead className="text-xs font-semibold py-3 pl-5">Table Name</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Live Rows</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Seq Scans</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Index Scans</TableHead>
                    <TableHead className="text-xs font-semibold text-center w-40">Index Hit Ratio</TableHead>
                    <TableHead className="text-xs font-semibold text-right pr-5">Last Auto-Analyze</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/40">
                  {stats.isLoading && <TableLoadingRow cols={6} rows={6} />}
                  {!stats.isLoading && filteredTableStats.length === 0 && (
                    <TableEmptyRow
                      cols={6}
                      icon={<Database className="w-5 h-5 text-muted-foreground" />}
                      message={tableSearch ? `No tables matching "${tableSearch}"` : "No table statistics available."}
                    />
                  )}
                  {filteredTableStats.map((t) => {
                    const total = t.seq_scan + t.idx_scan;
                    const ratio = total > 0 ? (t.idx_scan / total) * 100 : 100;
                    const isLowRatio = total > 100 && ratio < 60;
                    return (
                      <TableRow key={t.relname} className="hover:bg-secondary/30 transition-colors">
                        <TableCell className="font-mono text-xs font-semibold py-3 pl-5 text-foreground">
                          {t.relname}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          {t.n_live_tup.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          <span className={t.seq_scan > 5000 ? "text-amber-500 font-bold" : "text-muted-foreground"}>
                            {t.seq_scan.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-foreground font-semibold">
                          {t.idx_scan.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <Progress value={ratio} className="h-1.5 w-16 bg-secondary" />
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-mono px-1.5 py-0 ${
                                ratio >= 80
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                  : ratio >= 50
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                  : "bg-rose-500/10 text-rose-600 border-rose-500/30"
                              }`}
                            >
                              {ratio.toFixed(0)}%
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-5 text-xs text-muted-foreground font-mono">
                          {t.last_autoanalyze
                            ? formatDistanceToNow(new Date(t.last_autoanalyze), { addSuffix: true })
                            : "Never"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <div className="p-3 bg-secondary/30 border border-border/40 rounded-xl text-xs text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            <span>
              <b>Performance Tip:</b> Tables with fewer than 1,000 rows intentionally leverage sequential scans by the query planner. For tables with &gt; 10k rows and low ratios, index tuning is recommended.
            </span>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2: CRON SCHEDULES & RUNS (cron)
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="cron" className="space-y-6 m-0 focus-visible:outline-none">
          {/* Active Job Summary Cards Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-500" />
              Active Cron Schedules (Last 24 Hours)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(jobAgg).map(([k, j]) => {
                const successRate = j.total > 0 ? ((j.ok / j.total) * 100).toFixed(0) : "100";
                return (
                  <Card key={k} className="rounded-2xl border-border/60 shadow-xs bg-card/90 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-foreground truncate font-mono">{j.name}</h4>
                      <Badge variant={j.failed > 0 ? "destructive" : "secondary"} className="text-[9px] font-mono">
                        {j.failed > 0 ? `${j.failed} Fail` : "100% OK"}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Total Executions:</span>
                        <span className="font-bold text-foreground">{j.total} runs</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Last Execution:</span>
                        <span className="font-mono text-[11px] text-foreground">
                          {formatDistanceToNow(new Date(j.last), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <Progress value={Number(successRate)} className="h-1 bg-secondary" />
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Recent Cron Run History Table */}
          <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 overflow-hidden">
            <CardHeader className="p-5 border-b border-border/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-500" />
                    Cron Execution Log History
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Individual cron execution records, duration benchmarks, and return payloads
                  </CardDescription>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center bg-secondary/60 p-0.5 rounded-xl border border-border/60">
                    {(["all", "succeeded", "failed"] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setCronStatusFilter(st)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                          cronStatusFilter === st
                            ? "bg-card text-foreground shadow-xs border border-border/60"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Filter job..."
                      value={cronSearch}
                      onChange={(e) => setCronSearch(e.target.value)}
                      className="h-8 pl-8 text-xs rounded-xl bg-background border-border/60"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow className="border-border/40">
                    <TableHead className="text-xs font-semibold py-3 pl-5">Job Name</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold">Started At</TableHead>
                    <TableHead className="text-xs font-semibold">Duration</TableHead>
                    <TableHead className="text-xs font-semibold pr-5">Execution Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/40">
                  {cron.isLoading && <TableLoadingRow cols={5} rows={4} />}
                  {!cron.isLoading && filteredCronRuns.length === 0 && (
                    <TableEmptyRow
                      cols={5}
                      icon={<Clock className="w-5 h-5 text-muted-foreground" />}
                      message="No cron executions matching the selected criteria."
                    />
                  )}
                  {filteredCronRuns.slice(0, 50).map((r) => (
                    <TableRow key={`${r.jobid}-${r.runid}`} className="hover:bg-secondary/30 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold py-3 pl-5 text-foreground">
                        {r.jobname}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            r.status === "succeeded"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : r.status === "failed"
                              ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {formatDistanceToNow(new Date(r.start_time), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {r.duration_ms ? `${Math.round(r.duration_ms)}ms` : "—"}
                      </TableCell>
                      <TableCell className="max-w-md truncate text-xs text-muted-foreground font-mono pr-5">
                        {r.return_message ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3: SYSTEM ALERTS & LOGS (alerts)
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="alerts" className="space-y-4 m-0 focus-visible:outline-none">
          <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 overflow-hidden">
            <CardHeader className="p-5 border-b border-border/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Database &amp; System Health Alerts
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Automated threshold alerts (sequential scan spikes, HTTP response backlog, query delays)
                  </CardDescription>
                </div>

                {/* Severity Filter */}
                <div className="flex items-center bg-secondary/60 p-0.5 rounded-xl border border-border/60">
                  {(["all", "error", "warning", "info"] as const).map((sev) => (
                    <button
                      key={sev}
                      onClick={() => setAlertSeverityFilter(sev)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                        alertSeverityFilter === sev
                          ? "bg-card text-foreground shadow-xs border border-border/60"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5">
              {alerts.isLoading && <div className="p-8 text-center text-xs text-muted-foreground">Loading alerts...</div>}
              {!alerts.isLoading && filteredAlerts.length === 0 ? (
                <EmptyState
                  icon={<ShieldCheck className="w-6 h-6 text-emerald-500" />}
                  message="No active system alerts recorded."
                  hint="All database operations, sequential scan thresholds, and cron pipelines are running within normal parameters."
                />
              ) : (
                <div className="space-y-3">
                  {filteredAlerts.map((a) => {
                    const isExpanded = expandedAlerts[a.id];
                    const hasDetails = a.details && Object.keys(a.details).length > 0;
                    return (
                      <div
                        key={a.id}
                        className="rounded-2xl border border-border/60 bg-card/60 p-4 space-y-3 hover:border-primary/40 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                a.severity === "error"
                                  ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                  : a.severity === "warning"
                                  ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                  : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                              }`}
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] font-mono uppercase px-1.5 py-0 ${
                                    a.severity === "error"
                                      ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                                      : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                  }`}
                                >
                                  {a.severity}
                                </Badge>
                                <span className="font-mono text-xs font-bold text-foreground">{a.kind}</span>
                              </div>
                              <p className="text-xs text-foreground mt-1 font-medium">{a.message}</p>
                              <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                                {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })} · {new Date(a.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          {hasDetails && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleAlertExpanded(a.id)}
                              className="h-8 px-2 text-xs rounded-xl shrink-0 gap-1 text-muted-foreground hover:text-foreground"
                            >
                              {isExpanded ? "Hide Details" : "View Details"}
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </Button>
                          )}
                        </div>

                        {/* Expandable JSON Details */}
                        {isExpanded && hasDetails && (
                          <div className="pt-2 border-t border-border/40">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-semibold text-muted-foreground">Alert Payload &amp; Diagnostic Details</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(JSON.stringify(a.details, null, 2))}
                                className="h-6 px-2 text-[10px] rounded-lg gap-1"
                              >
                                <Copy className="w-3 h-3" /> Copy JSON
                              </Button>
                            </div>
                            <pre className="p-3 bg-secondary/30 rounded-xl text-[11px] font-mono text-foreground/90 overflow-x-auto max-h-48">
                              {JSON.stringify(a.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </TabsWithParam>
    </div>
  );
}
