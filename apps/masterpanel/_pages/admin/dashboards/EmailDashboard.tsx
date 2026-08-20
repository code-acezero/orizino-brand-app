"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  Mail,
  Send,
  AtSign,
  FileText,
  Workflow,
  KeyRound,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Copy,
  Plus,
  ShieldCheck,
  MousePointerClick,
  Eye,
} from "lucide-react";
import { Link } from "@/lib/router-compat";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/app-toast";
import { formatDistanceToNow, format } from "date-fns";

export default function EmailDashboard() {
  const qc = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 1. Subscriber Counts
  const { data: subsData, isLoading: subsLoading } = useQuery({
    queryKey: ["email-dashboard-subs"],
    queryFn: async () => {
      const { count: activeCount } = await supabase
        .from("email_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      const { count: totalCount } = await supabase
        .from("email_subscriptions")
        .select("*", { count: "exact", head: true });
      return { active: activeCount || 0, total: totalCount || 0 };
    },
    staleTime: 30_000,
  });

  // 2. Campaigns Counts
  const { data: campaignsCount = 0, isLoading: campLoading } = useQuery({
    queryKey: ["email-dashboard-campaigns"],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("email_campaigns")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
    staleTime: 30_000,
  });

  // 3. Templates Counts
  const { data: templatesCount = 0, isLoading: tplLoading } = useQuery({
    queryKey: ["email-dashboard-templates"],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("email_templates")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
    staleTime: 30_000,
  });

  // 4. Automations Counts
  const { data: autosData, isLoading: autoLoading } = useQuery({
    queryKey: ["email-dashboard-automations"],
    queryFn: async () => {
      const { count: activeCount } = await (supabase as any)
        .from("email_automations")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      const { count: totalCount } = await (supabase as any)
        .from("email_automations")
        .select("*", { count: "exact", head: true });
      return { active: activeCount || 0, total: totalCount || 0 };
    },
    staleTime: 30_000,
  });

  // 5. Recent Dispatches from Log
  const { data: dispatches = [], isLoading: logLoading, refetch: refetchLog } = useQuery({
    queryKey: ["email-dashboard-dispatches"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("email_dispatch_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) {
        console.warn("Log query error:", error);
        return [];
      }
      return data || [];
    },
    staleTime: 10_000,
    refetchInterval: 20_000,
  });

  // 6. Provider status
  const { data: providerInfo } = useQuery({
    queryKey: ["email-dashboard-provider"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "email_provider")
        .maybeSingle();
      const v = (data?.value ?? {}) as Record<string, any>;
      return {
        configured: Boolean(v.resend_api_key?.trim() || v.from_email),
        fromEmail: v.from_email || "team@orizino.com",
        fromName: v.from_name || "Orizino",
      };
    },
    staleTime: 60_000,
  });

  // Realtime subscription on email_dispatch_log
  useEffect(() => {
    const ch = supabase
      .channel("email-dashboard-log-stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "email_dispatch_log" },
        () => {
          refetchLog();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [refetchLog]);

  // Compute calculated metrics
  const metrics = useMemo(() => {
    const total = dispatches.length;
    const sent = dispatches.filter((d: any) => d.status === "sent" || d.status === "delivered").length;
    const failed = dispatches.filter((d: any) => d.status === "failed" || d.status === "bounced").length;
    const rate = total > 0 ? Math.round(((total - failed) / total) * 100) : 100;
    return { total, sent, failed, rate };
  }, [dispatches]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["email-dashboard-subs"] }),
      qc.invalidateQueries({ queryKey: ["email-dashboard-campaigns"] }),
      qc.invalidateQueries({ queryKey: ["email-dashboard-templates"] }),
      qc.invalidateQueries({ queryKey: ["email-dashboard-automations"] }),
      qc.invalidateQueries({ queryKey: ["email-dashboard-dispatches"] }),
      qc.invalidateQueries({ queryKey: ["email-dashboard-provider"] }),
    ]);
    setIsRefreshing(false);
    toast.success("Email dashboard metrics refreshed");
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard`);
  };

  return (
    <div className="w-full space-y-6 pb-20">
      {/* ── HEADER HERO ── */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-card/80 via-card/50 to-[#9a0002]/10 backdrop-blur-xl p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shadow-sm">
                <Mail className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-widest bg-primary/10 text-primary border-primary/30 px-2.5 py-0.5">
                Resend Cloud v2.0
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground dark:text-[#FAF6EE]">
              Emails &amp; Marketing Hub
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Real-time delivery telemetry, subscriber growth, automated transactional invoices, and bulk campaigns with official ORIZINO brand branding.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-xs h-9 font-medium gap-1.5 rounded-xl border-border/60 bg-background/50 hover:bg-background/80"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button
              size="sm"
              asChild
              className="text-xs h-9 font-semibold gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
            >
              <Link to="/email/campaigns">
                <Plus className="w-3.5 h-3.5" /> Compose Campaign
              </Link>
            </Button>
          </div>
        </div>

        {/* Ambient cherry background glow */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      </div>

      {/* ── KPI METRICS CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Subscribers */}
        <Link
          to="/email/subscribers"
          className="group p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 hover:border-primary/40 hover:bg-card/80 transition-all duration-200 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Subscribers</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AtSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-foreground dark:text-[#FAF6EE]">
              {subsLoading ? "—" : (subsData?.active ?? 0).toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
              <span className="text-emerald-500 font-semibold flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5 inline" /> Active
              </span>
              <span>• {subsData?.total ?? 0} total</span>
            </div>
          </div>
        </Link>

        {/* Delivery Rate */}
        <Link
          to="/settings-ai/email-provider"
          className="group p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 hover:border-primary/40 hover:bg-card/80 transition-all duration-200 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Delivery Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-500">
              {metrics.rate}%
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 truncate">
              {metrics.failed === 0 ? "Zero delivery failures" : `${metrics.failed} dispatch failures`}
            </div>
          </div>
        </Link>

        {/* Campaigns */}
        <Link
          to="/email/campaigns"
          className="group p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 hover:border-primary/40 hover:bg-card/80 transition-all duration-200 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Campaigns</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-foreground dark:text-[#FAF6EE]">
              {campLoading ? "—" : campaignsCount}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Bulk marketing broadcasts
            </div>
          </div>
        </Link>

        {/* Automations */}
        <Link
          to="/email/automations"
          className="group p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 hover:border-primary/40 hover:bg-card/80 transition-all duration-200 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Automations</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Workflow className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-foreground dark:text-[#FAF6EE]">
              {autoLoading ? "—" : autosData?.active ?? 0}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {autosData?.total ?? 0} configured rules
            </div>
          </div>
        </Link>
      </div>

      {/* ── QUICK ACTION TILES ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          to="/settings-ai/email-provider"
          className="p-4 rounded-2xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/40 transition-all flex items-start gap-3.5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <KeyRound className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
              Email Provider &amp; Keys <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              Resend API key, sender mailbox identities, and Svix delivery webhooks.
            </p>
          </div>
        </Link>

        <Link
          to="/email/templates"
          className="p-4 rounded-2xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/40 transition-all flex items-start gap-3.5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground group-hover:text-amber-500 transition-colors flex items-center gap-1.5">
              Template Studio <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              Visual Cherry Vanilla presets, luxury invoices, and HTML block editors.
            </p>
          </div>
        </Link>

        <Link
          to="/email/subscribers"
          className="p-4 rounded-2xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/40 transition-all flex items-start gap-3.5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 group-hover:bg-purple-500 group-hover:text-white transition-colors">
            <AtSign className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground group-hover:text-purple-400 transition-colors flex items-center gap-1.5">
              Audience &amp; Subscribers <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              CSV import/export, audience tags, and newsletter subscribers list.
            </p>
          </div>
        </Link>
      </div>

      {/* ── LIVE DISPATCH TELEMETRY STREAM ── */}
      <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-secondary/10">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-foreground dark:text-[#FAF6EE] flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Live Email Dispatch Telemetry
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Stream
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time audit log of customer invoices, shipping notifications, and promotional dispatches.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetchLog()}
            disabled={logLoading}
            className="text-xs h-8 gap-1.5 rounded-xl self-start sm:self-auto"
          >
            <RefreshCw className={`w-3 h-3 ${logLoading ? "animate-spin" : ""}`} /> Refresh Log
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-secondary/20 text-muted-foreground uppercase tracking-wider font-semibold border-b border-border/40">
              <tr>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Recipient</th>
                <th className="px-4 py-3 text-left">Subject / Event</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Provider ID</th>
                <th className="px-4 py-3 text-right">Dispatched</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {logLoading && dispatches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading live dispatch telemetry…
                  </td>
                </tr>
              ) : dispatches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    No dispatches recorded yet. Place an order or trigger a test email.
                  </td>
                </tr>
              ) : (
                dispatches.map((row: any) => {
                  const isDelivered = row.status === "delivered" || row.status === "sent";
                  const isFailed = row.status === "failed" || row.status === "bounced";
                  const isOpened = row.status === "opened" || row.event === "email.opened";
                  const isClicked = row.status === "clicked" || row.event === "email.clicked";

                  return (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                      {/* Status */}
                      <td className="px-4 py-3 font-semibold whitespace-nowrap">
                        {isOpened ? (
                          <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30 text-[10px] gap-1">
                            <Eye className="w-3 h-3" /> Opened
                          </Badge>
                        ) : isClicked ? (
                          <Badge className="bg-sky-500/15 text-sky-400 border-sky-500/30 text-[10px] gap-1">
                            <MousePointerClick className="w-3 h-3" /> Clicked
                          </Badge>
                        ) : isDelivered ? (
                          <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px] gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Delivered
                          </Badge>
                        ) : isFailed ? (
                          <Badge className="bg-rose-500/15 text-rose-500 border-rose-500/30 text-[10px] gap-1" title={row.error || "Failed"}>
                            <XCircle className="w-3 h-3" /> Failed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {row.status || "Queued"}
                          </Badge>
                        )}
                      </td>

                      {/* Recipient */}
                      <td className="px-4 py-3 font-mono font-medium text-foreground whitespace-nowrap">
                        {row.recipient || row.email || "—"}
                      </td>

                      {/* Subject */}
                      <td className="px-4 py-3 text-muted-foreground max-w-[260px] truncate">
                        <span className="font-semibold text-foreground">{row.subject || row.event || "Transactional Message"}</span>
                        {row.error && <p className="text-[10px] text-rose-400 truncate">{row.error}</p>}
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="secondary" className="text-[10px] font-mono capitalize bg-secondary/40 text-muted-foreground">
                          {row.purpose || row.event || "general"}
                        </Badge>
                      </td>

                      {/* Provider ID */}
                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {row.provider_id ? (
                          <button
                            onClick={() => copyText(row.provider_id, "Resend ID")}
                            className="hover:text-primary flex items-center gap-1 group"
                            title="Click to copy Resend ID"
                          >
                            <span>{row.provider_id.slice(0, 10)}…</span>
                            <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                        {row.created_at ? formatDistanceToNow(new Date(row.created_at), { addSuffix: true }) : "just now"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
