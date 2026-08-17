"use client";
import React, { useState } from "react";
import { useLocation } from "@/lib/router-compat";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Settings as SettingsIcon, Users, Package, Image as ImageIcon,
  DollarSign, Wallet, TrendingUp, Clock, CheckCircle2, XCircle, Plus, Trash2,
  ShieldCheck, Percent, Search, ExternalLink, Briefcase,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/lib/app-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  getAffiliateSettings, adminUpdateAffiliateSettings, adminListAffiliates, adminUpdateAffiliate,
  adminListPayouts, adminProcessPayout, adminGetAffiliateDashboard,
  adminListAffiliateProducts, adminUpsertAffiliateProduct, adminBulkEnrollProducts, adminRemoveAffiliateProduct,
  adminListCategoryRates, adminUpsertCategoryRate, adminDeleteCategoryRate,
  adminListCreatives, adminUpsertCreative, adminDeleteCreative,
  adminSearchProductsForAffiliate, adminListCommissions, adminAdjustCommission,
} from "@/lib/affiliate.functions";
import { generateAffiliateReport, getAffiliateReportConfig, getAffiliateReportHealth, exportAffiliateReport, testAffiliateReportSheetsWorkflow } from "@/lib/affiliate-report.functions";
import { FileSpreadsheet, Download, Activity, AlertTriangle, FlaskConical } from "lucide-react";
import { TableEmptyRow } from "@/components/admin/TableStates";
import Papa from "papaparse";
import * as XLSX from "xlsx";

import { useSearchParams } from "next/navigation";

type TabId = "dashboard" | "settings" | "products" | "categories" | "applications" | "affiliates" | "commissions" | "payouts" | "creatives";

const VALID_TABS: TabId[] = ["dashboard", "settings", "products", "categories", "applications", "affiliates", "commissions", "payouts", "creatives"];

const TAB_META: Record<TabId, { title: string; desc: string }> = {
  dashboard:    { title: "Affiliate Dashboard",    desc: "Overview of partner performance, earnings & reports" },
  applications: { title: "Affiliate Applications", desc: "Review and approve new affiliate program applicants" },
  affiliates:   { title: "Affiliate Partners",     desc: "Active affiliates, custom commission rates & members" },
  commissions:  { title: "Commission Ledger",      desc: "Track, approve and adjust earned referral commissions" },
  payouts:      { title: "Payouts & Withdrawals",  desc: "Process affiliate withdrawal requests and mark payments" },
  products:     { title: "Enrolled Products",      desc: "Curate products for affiliates & set custom bonuses" },
  categories:   { title: "Category Overrides",     desc: "Set special category-wide commission rates" },
  creatives:    { title: "Marketing Creatives",    desc: "Banners, copy assets and social materials for partners" },
  settings:     { title: "Affiliate Settings",     desc: "Configure commission rates, cookie windows & policies" },
};

const AffiliateHub: React.FC = () => {
  const searchParams = useSearchParams();
  const location = useLocation();

  // Read tab from query params, supporting Next.js useSearchParams, router-compat, and window.location
  const rawTab =
    searchParams?.get("tab") ||
    (location.search ? new URLSearchParams(location.search).get("tab") : null) ||
    (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null) ||
    "dashboard";

  const tab: TabId = VALID_TABS.includes(rawTab as TabId) ? (rawTab as TabId) : "dashboard";
  const meta = TAB_META[tab] ?? TAB_META.dashboard;

  return (
    <div className="flex flex-col min-h-full space-y-5">
      {/* ── Dynamic Page Header ── */}
      <div className="flex items-center justify-between gap-3 px-1 pb-2 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/40 flex items-center justify-center shadow-[0_0_20px_-4px_hsl(var(--primary)/0.5)] shrink-0">
            <Briefcase className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight tracking-tight">{meta.title}</h1>
            <p className="text-xs text-muted-foreground">{meta.desc}</p>
          </div>
        </div>
        <a
          href="/affiliate"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted/50 border border-border/40"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Public page
        </a>
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 w-full" key={tab}>
        {tab === "dashboard"    && <DashboardTab />}
        {tab === "settings"     && <SettingsTab />}
        {tab === "products"     && <ProductsTab />}
        {tab === "categories"   && <CategoriesTab />}
        {tab === "applications" && <ApplicationsTab />}
        {tab === "affiliates"   && <AffiliatesTab />}
        {tab === "commissions"  && <CommissionsTab />}
        {tab === "payouts"      && <PayoutsTab />}
        {tab === "creatives"    && <CreativesTab />}
      </div>
    </div>
  );
};

// ============ DASHBOARD ============
const StatCard: React.FC<{ icon: any; label: string; value: any; color?: string; tone?: string }> = ({ icon: Icon, label, value, color, tone }) => {
  const resolvedColor = color || (tone === "emerald-500" ? "#10b981" : tone === "violet-500" ? "#8b5cf6" : undefined);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="stat-card relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl p-5 shadow-xs hover:border-primary/40 transition-all"
    >
      <div
        className="stat-icon relative w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3"
        style={resolvedColor ? { backgroundColor: `${resolvedColor}18`, color: resolvedColor } : undefined}
      >
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
      <p className="stat-value text-2xl font-bold mt-1 tracking-tight">{value}</p>
    </motion.div>
  );
};

const DashboardTab: React.FC = () => {
  const getDash = useServerFn(adminGetAffiliateDashboard);
  const { data: dash } = useQuery({ queryKey: ["affiliate-hub-dash"], queryFn: () => getDash() });
  const getCfg = useServerFn(getAffiliateReportConfig);
  const { data: reportCfg, refetch: refetchCfg } = useQuery({ queryKey: ["affiliate-report-cfg"], queryFn: () => getCfg() });
  const getHealth = useServerFn(getAffiliateReportHealth);
  const { data: health, refetch: refetchHealth, isFetching: healthLoading } = useQuery({
    queryKey: ["affiliate-report-health"],
    queryFn: () => getHealth(),
    refetchInterval: 60_000,
  });
  const runReport = useServerFn(generateAffiliateReport);
  const exportData = useServerFn(exportAffiliateReport);
  const testWorkflow = useServerFn(testAffiliateReportSheetsWorkflow);
  const [reporting, setReporting] = useState<null | "weekly" | "monthly" | "instant">(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const handleTestWorkflow = async () => {
    setTesting(true);
    try {
      const res: any = await testWorkflow();
      setTestResult(res);
      if (res.ok) toast.success(`Google Sheets workflow OK (${res.ms} ms)`);
      else toast.error("Google Sheets workflow test failed — see details");
    } catch (err: any) {
      setTestResult({ ok: false, ms: 0, steps: [{ step: "Test", ok: false, detail: err?.message ?? "error" }] });
      toast.error(err?.message ?? "Test failed");
    } finally {
      setTesting(false);
    }
  };


  const handleReport = async (mode: "weekly" | "monthly" | "instant") => {
    setReporting(mode);
    try {
      const res: any = await runReport({ data: { mode } });
      toast.success(`Report written to "${res.tab}" (${res.rows} rows)`);
      await Promise.all([refetchCfg(), refetchHealth()]);
      if (res.spreadsheetUrl) window.open(res.spreadsheetUrl, "_blank", "noopener");
    } catch (err: any) {
      toast.error(err?.message ?? "Report failed");
    } finally {
      setReporting(null);
    }
  };

  const handleExport = async (mode: "weekly" | "monthly" | "instant", format: "csv" | "xlsx") => {
    const key = `${mode}-${format}`;
    setExporting(key);
    try {
      const res = await exportData({ data: { mode } });
      const stamp = new Date().toISOString().slice(0, 10);
      const safeName = res.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      const filename = `${safeName}-${stamp}.${format}`;
      if (format === "csv") {
        const csv = Papa.unparse([res.headers, ...res.rows]);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
      } else {
        const ws = XLSX.utils.aoa_to_sheet([res.headers, ...res.rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, res.title.slice(0, 31));
        XLSX.writeFile(wb, filename);
      }
      toast.success(`Exported ${res.rows.length} rows`);
    } catch (err: any) {
      toast.error(err?.message ?? "Export failed");
    } finally {
      setExporting(null);
    }
  };

  const { formatPrice } = useCurrency();
  const modeLabels: Record<"weekly" | "monthly" | "instant", string> = {
    weekly: "Weekly", monthly: "Monthly", instant: "Instant",
  };
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border/60 bg-card/60 p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold">Google Sheets reports</h3>
              <p className="text-xs text-muted-foreground">
                Weekly full report (auto every 7 days) · Monthly payout cycle (auto) · Instant on-demand snapshot.
                {reportCfg?.spreadsheet_url ? (
                  <> · <a href={reportCfg.spreadsheet_url} target="_blank" rel="noreferrer" className="underline">Open spreadsheet</a></>
                ) : null}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={handleTestWorkflow} disabled={testing}>
              <FlaskConical className="w-3.5 h-3.5 mr-1" />{testing ? "Testing…" : "Test workflow"}
            </Button>
            <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border ${health?.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600" : "border-amber-500/40 bg-amber-500/10 text-amber-600"}`}>
              {health?.ok ? <Activity className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              <span className="font-medium">{healthLoading ? "Checking…" : health?.ok ? "All systems healthy" : `${health?.issues?.length ?? 0} issue${(health?.issues?.length ?? 0) === 1 ? "" : "s"}`}</span>
              <button onClick={() => refetchHealth()} className="underline opacity-70 hover:opacity-100">recheck</button>
            </div>
          </div>
        </div>


        {health && !health.ok && health.issues.length > 0 && (
          <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-1 ml-8 list-disc">
            {health.issues.map((i, idx) => <li key={idx}>{i}</li>)}
          </ul>
        )}

        <div className="grid sm:grid-cols-3 gap-2 ml-8">
          {(["weekly", "monthly", "instant"] as const).map((mode) => {
            const tabName = mode === "weekly" ? "Weekly Report" : mode === "monthly" ? "Monthly Payouts" : "Instant Report";
            const tabOk = health?.tabs?.find((t) => t.tab === tabName)?.present;
            const hours = health?.freshness?.[mode];
            return (
              <div key={mode} className="rounded-2xl border border-border/60 bg-background/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{modeLabels[mode]}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${tabOk ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                    {tabOk ? "tab ready" : "not created"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {hours === null || hours === undefined ? "Never run" : hours < 1 ? "Updated just now" : `Updated ${hours}h ago`}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={!!reporting} onClick={() => handleReport(mode)}>
                    {reporting === mode ? "Running…" : "Run now"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={exporting === `${mode}-csv`} onClick={() => handleExport(mode, "csv")}>
                    <Download className="w-3 h-3 mr-1" />{exporting === `${mode}-csv` ? "…" : "CSV"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={exporting === `${mode}-xlsx`} onClick={() => handleExport(mode, "xlsx")}>
                    <Download className="w-3 h-3 mr-1" />{exporting === `${mode}-xlsx` ? "…" : "XLSX"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>


      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total affiliates" value={dash?.total_affiliates ?? 0} color="#3b82f6" />
        <StatCard icon={ShieldCheck} label="Approved" value={dash?.approved_affiliates ?? 0} color="#10b981" />
        <StatCard icon={Clock} label="Pending apps" value={dash?.pending_applications ?? 0} color="#f59e0b" />
        <StatCard icon={TrendingUp} label="Recent clicks" value={dash?.total_clicks_recent ?? 0} color="#06b6d4" />
        <StatCard icon={DollarSign} label="Commissions" value={formatPrice(dash?.total_commissions ?? 0)} color="#8b5cf6" />
        <StatCard icon={CheckCircle2} label="Paid" value={formatPrice(dash?.paid_commissions ?? 0)} color="#10b981" />
        <StatCard icon={Wallet} label="Pending payouts" value={formatPrice(dash?.pending_payouts_amount ?? 0)} color="#ec4899" />
        <StatCard icon={BarChart3} label="Conversion rate" value={`${(dash?.conversion_rate ?? 0).toFixed(2)}%`} color="#8b5cf6" />
      </div>

      <div className="rounded-3xl border border-border/60 bg-card/60 p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Top affiliates</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-3">Code</th>
                <th className="text-left p-3">Clicks</th>
                <th className="text-left p-3">Orders</th>
                <th className="text-left p-3">Earnings</th>
              </tr>
            </thead>
            <tbody>
              {(dash?.top_affiliates ?? []).map((a: any) => (
                <tr key={a.id} className="border-t border-border/40">
                  <td className="p-3 font-mono">{a.code}</td>
                  <td className="p-3">{a.total_clicks}</td>
                  <td className="p-3">{a.total_orders}</td>
                  <td className="p-3 font-semibold">{formatPrice(Number(a.total_earnings))}</td>
                </tr>
              ))}
              {!(dash?.top_affiliates?.length) && (
                <TableEmptyRow cols={4} message="No affiliate activity yet" hint="Top affiliates will appear here once they start earning." />
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!testResult} onOpenChange={(o) => !o && setTestResult(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Google Sheets workflow {testResult?.ok ? "✅ passed" : "❌ failed"}
              {typeof testResult?.ms === "number" && (
                <span className="text-xs text-muted-foreground font-normal">{testResult.ms} ms</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            {(testResult?.steps ?? []).map((s: any, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className={s.ok ? "text-emerald-600" : "text-destructive"}>{s.ok ? "✓" : "✗"}</span>
                <div>
                  <div className="font-medium">{s.step}</div>
                  {s.detail && <div className="text-xs text-muted-foreground break-all">{s.detail}</div>}
                </div>
              </li>
            ))}
          </ul>
          {testResult?.spreadsheet_url && (
            <a href={testResult.spreadsheet_url} target="_blank" rel="noreferrer" className="text-xs underline text-primary">
              Open spreadsheet ↗
            </a>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};


const DEFAULT_AFFILIATE_SETTINGS = {
  enabled: true,
  status_message: "Affiliate program is currently active",
  program_name: "Orizino Partner Program",
  program_description: "Earn commission by referring customers to our brand.",
  commission_rate: 10,
  min_payout: 50,
  cookie_days: 30,
  auto_approve: false,
  terms_md: "# Affiliate Terms & Conditions\n\nWelcome to our partner program. By participating, you agree to earn standard referral commissions on qualified sales.",
  referral_bonus: 0,
  holding_period_days: 14,
  allow_self_referral: false,
  attribution_model: "last_click",
  payout_methods: ["bkash", "nagad", "bank_transfer"],
  display_style: "console",
};

// ============ SETTINGS ============
const SettingsTab: React.FC = () => {
  const qc = useQueryClient();
  const getSettings = useServerFn(getAffiliateSettings);
  const save = useServerFn(adminUpdateAffiliateSettings);
  const { data } = useQuery({
    queryKey: ["affiliate-settings"],
    queryFn: () => getSettings(),
  });
  const [form, setForm] = useState<any>(DEFAULT_AFFILIATE_SETTINGS);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const onSave = async () => {
    setSaving(true);
    try {
      await save({ data: {
        enabled: !!form.enabled,
        status_message: form.status_message,
        program_name: form.program_name,
        program_description: form.program_description,
        commission_rate: Number(form.commission_rate),
        min_payout: Number(form.min_payout),
        cookie_days: Number(form.cookie_days),
        auto_approve: !!form.auto_approve,
        terms_md: form.terms_md ?? "",
        referral_bonus: Number(form.referral_bonus ?? 0),
        holding_period_days: Number(form.holding_period_days ?? 0),
        allow_self_referral: !!form.allow_self_referral,
        attribution_model: form.attribution_model ?? "last_click",
        payout_methods: typeof form.payout_methods === "string"
          ? form.payout_methods.split(",").map((s: string) => s.trim()).filter(Boolean)
          : form.payout_methods,
        display_style: form.display_style ?? "console",
      }});
      toast.success("Settings saved successfully");
      qc.invalidateQueries({ queryKey: ["affiliate-settings"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6 w-full">
      <Card title="Program status" desc="Switch the entire program on or off.">
        <Row label="Program enabled"><Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} /></Row>
        <Field label="Status message (shown when disabled)"><Input value={form.status_message ?? ""} onChange={(e) => setForm({ ...form, status_message: e.target.value })} /></Field>
        <Field label="Program name"><Input value={form.program_name ?? ""} onChange={(e) => setForm({ ...form, program_name: e.target.value })} /></Field>
        <Field label="Description"><Textarea rows={3} value={form.program_description ?? ""} onChange={(e) => setForm({ ...form, program_description: e.target.value })} /></Field>
      </Card>

      <Card title="Revenue & commissions" desc="Set how affiliates earn.">
        <Field label="Default commission rate (%)"><Input type="number" step="0.01" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: e.target.value })} /></Field>
        <Field label="Sign-up referral bonus"><Input type="number" step="0.01" value={form.referral_bonus ?? 0} onChange={(e) => setForm({ ...form, referral_bonus: e.target.value })} /></Field>
        <Field label="Holding period (days before commission unlocks)"><Input type="number" value={form.holding_period_days ?? 0} onChange={(e) => setForm({ ...form, holding_period_days: e.target.value })} /></Field>
        <Field label="Attribution model">
          <Select value={form.attribution_model ?? "last_click"} onValueChange={(v) => setForm({ ...form, attribution_model: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="last_click">Last click wins</SelectItem>
              <SelectItem value="first_click">First click wins</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Row label="Allow self-referral"><Switch checked={!!form.allow_self_referral} onCheckedChange={(v) => setForm({ ...form, allow_self_referral: v })} /></Row>
      </Card>

      <Card title="Tracking & payouts" desc="Cookie window and how affiliates withdraw.">
        <Field label="Cookie window (days)"><Input type="number" value={form.cookie_days} onChange={(e) => setForm({ ...form, cookie_days: e.target.value })} /></Field>
        <Field label="Minimum payout"><Input type="number" step="0.01" value={form.min_payout} onChange={(e) => setForm({ ...form, min_payout: e.target.value })} /></Field>
        <Field label="Payout methods (comma separated)">
          <Input value={Array.isArray(form.payout_methods) ? form.payout_methods.join(", ") : form.payout_methods}
            onChange={(e) => setForm({ ...form, payout_methods: e.target.value })} />
        </Field>
        <Row label="Auto-approve new applications"><Switch checked={form.auto_approve} onCheckedChange={(v) => setForm({ ...form, auto_approve: v })} /></Row>
      </Card>

      <Card title="Display style" desc="Switch the look & feel of both the admin hub and the public affiliate page.">
        <Field label="Layout treatment">
          <Select value={form.display_style ?? "console"} onValueChange={(v) => setForm({ ...form, display_style: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="console">Command Console — dense operator cockpit</SelectItem>
              <SelectItem value="editorial">Editorial Studio — calm, premium, oversized numerals</SelectItem>
              <SelectItem value="pulse">Pulse Dashboard — gradient cards, animated, gamified</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <p className="text-xs text-muted-foreground">Accent color stays linked to the admin theme tokens you've selected elsewhere.</p>
      </Card>

      <Card title="Legal" desc="Terms shown on the program page.">
        <Field label="Terms & conditions (markdown)"><Textarea rows={10} value={form.terms_md ?? ""} onChange={(e) => setForm({ ...form, terms_md: e.target.value })} /></Field>
      </Card>

      <div className="md:col-span-2">
        <Button size="lg" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </div>
  );
};

const Card: React.FC<{ title: string; desc?: string; children: React.ReactNode }> = ({ title, desc, children }) => (
  <div className="rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl p-6 space-y-4">
    <div>
      <h3 className="font-bold">{title}</h3>
      {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
    </div>
    {children}
  </div>
);
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div><Label className="mb-1.5 block">{label}</Label>{children}</div>
);
const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between gap-3"><Label>{label}</Label>{children}</div>
);

// ============ PRODUCTS ============
const ProductsTab: React.FC = () => {
  const qc = useQueryClient();
  const { formatPrice } = useCurrency();
  const list = useServerFn(adminListAffiliateProducts);
  const upsert = useServerFn(adminUpsertAffiliateProduct);
  const bulk = useServerFn(adminBulkEnrollProducts);
  const remove = useServerFn(adminRemoveAffiliateProduct);
  const searchFn = useServerFn(adminSearchProductsForAffiliate);


  const { data: rows } = useQuery({ queryKey: ["affh-products"], queryFn: () => list() });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [defaultRate, setDefaultRate] = useState<string>("");

  const { data: searchResults } = useQuery({
    queryKey: ["affh-prod-search", q],
    queryFn: () => searchFn({ data: { q, limit: 40 } }),
    enabled: pickerOpen,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["affh-products"] });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Affiliate products</h2>
          <p className="text-sm text-muted-foreground">Curate products affiliates can promote. Override commission rates and feature picks.</p>
        </div>
        <Button onClick={() => { setPickerOpen(true); setSelected(new Set()); }}>
          <Plus className="w-4 h-4 mr-2" /> Enroll products
        </Button>
      </div>

      <div className="rounded-3xl border border-border/60 bg-card/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left p-3">Product</th>
              <th className="text-left p-3">Override rate</th>
              <th className="text-left p-3">Bonus</th>
              <th className="text-left p-3">Featured</th>
              <th className="text-left p-3">Active</th>
              <th className="text-left p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r: any) => (
              <tr key={r.id} className="border-t border-border/40">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {r.product?.thumbnail && <img src={r.product.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                    <div>
                      <p className="font-medium">{r.product?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{r.product?.price != null ? formatPrice(Number(r.product.price)) : "—"}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <Input className="w-24" type="number" step="0.01" defaultValue={r.override_rate ?? ""} placeholder="Default"
                    onBlur={async (e) => {
                      const v = e.target.value === "" ? null : Number(e.target.value);
                      await upsert({ data: { product_id: r.product_id, override_rate: v } });
                      invalidate();
                    }} />
                </td>
                <td className="p-3">
                  <Input className="w-24" type="number" step="0.01" defaultValue={r.bonus_amount ?? 0}
                    onBlur={async (e) => {
                      await upsert({ data: { product_id: r.product_id, bonus_amount: Number(e.target.value || 0) } });
                      invalidate();
                    }} />
                </td>
                <td className="p-3">
                  <Switch checked={!!r.is_featured} onCheckedChange={async (v) => {
                    await upsert({ data: { product_id: r.product_id, is_featured: v } });
                    invalidate();
                  }} />
                </td>
                <td className="p-3">
                  <Switch checked={!!r.is_active} onCheckedChange={async (v) => {
                    await upsert({ data: { product_id: r.product_id, is_active: v } });
                    invalidate();
                  }} />
                </td>
                <td className="p-3">
                  <Button size="icon" variant="ghost" onClick={async () => {
                    if (!confirm("Remove from program?")) return;
                    await remove({ data: { id: r.id } });
                    invalidate();
                  }}><Trash2 className="w-4 h-4" /></Button>
                </td>
              </tr>
            ))}
            {!(rows?.length) && <TableEmptyRow cols={6} icon={<Package className="w-5 h-5" />} message="No products enrolled" hint="Enroll products to make them available to affiliates." />}
          </tbody>
        </table>
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enroll products in the affiliate program</DialogTitle>
            <DialogDescription>Select products to make available to affiliates.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <Input className="w-40" type="number" step="0.01" placeholder="Override rate (opt.)" value={defaultRate} onChange={(e) => setDefaultRate(e.target.value)} />
            </div>
            <div className="max-h-96 overflow-y-auto rounded-2xl border border-border/60 divide-y divide-border/40">
              {(searchResults ?? []).map((p: any) => {
                const checked = selected.has(p.id);
                return (
                  <label key={p.id} className="flex items-center gap-3 p-3 hover:bg-muted/40 cursor-pointer">
                    <input type="checkbox" checked={checked} onChange={(e) => {
                      const ns = new Set(selected);
                      if (e.target.checked) ns.add(p.id); else ns.delete(p.id);
                      setSelected(ns);
                    }} />
                    {p.thumbnail && <img src={p.thumbnail} className="w-10 h-10 rounded object-cover" alt="" />}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{formatPrice(Number(p.price ?? 0))}</p>
                    </div>
                  </label>
                );
              })}
              {!searchResults?.length && <div className="p-6 text-center text-muted-foreground text-sm">Type to search…</div>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickerOpen(false)}>Cancel</Button>
            <Button disabled={!selected.size} onClick={async () => {
              try {
                await bulk({ data: { product_ids: Array.from(selected), override_rate: defaultRate ? Number(defaultRate) : null } });
                toast.success(`Enrolled ${selected.size} products`);
                setPickerOpen(false); invalidate();
              } catch (e: any) { toast.error(e.message); }
            }}>Enroll {selected.size}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============ CATEGORIES ============
const CategoriesTab: React.FC = () => {
  const qc = useQueryClient();
  const list = useServerFn(adminListCategoryRates);
  const upsert = useServerFn(adminUpsertCategoryRate);
  const remove = useServerFn(adminDeleteCategoryRate);
  const { data: rows } = useQuery({ queryKey: ["affh-cat-rates"], queryFn: () => list() });
  const { data: cats } = useQuery({
    queryKey: ["all-categories-for-aff"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, slug").eq("is_active", true).order("name");
      return data ?? [];
    },
  });
  const [catId, setCatId] = useState<string>("");
  const [rate, setRate] = useState<string>("");

  return (
    <div className="space-y-4 w-full">
      <div>
        <h2 className="text-xl font-bold">Category commission overrides</h2>
        <p className="text-sm text-muted-foreground">Set higher or lower commission rates for specific categories (overrides the default).</p>
      </div>

      <div className="rounded-3xl border border-border/60 bg-card/60 p-5 space-y-3">
        <p className="font-semibold">Add override</p>
        <div className="flex gap-2 flex-wrap">
          <Select value={catId} onValueChange={setCatId}>
            <SelectTrigger className="flex-1 min-w-[200px]"><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {(cats ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" step="0.01" className="w-32" placeholder="Rate %" value={rate} onChange={(e) => setRate(e.target.value)} />
          <Button disabled={!catId || !rate} onClick={async () => {
            try {
              await upsert({ data: { category_id: catId, rate: Number(rate), is_active: true } });
              toast.success("Saved"); setCatId(""); setRate("");
              qc.invalidateQueries({ queryKey: ["affh-cat-rates"] });
            } catch (e: any) { toast.error(e.message); }
          }}><Plus className="w-4 h-4 mr-2" /> Add</Button>
        </div>
      </div>

      <div className="rounded-3xl border border-border/60 bg-card/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40"><tr><th className="text-left p-3">Category</th><th className="text-left p-3">Rate</th><th className="text-left p-3">Active</th><th></th></tr></thead>
          <tbody>
            {(rows ?? []).map((r: any) => (
              <tr key={r.id} className="border-t border-border/40">
                <td className="p-3">{r.category?.name ?? "—"}</td>
                <td className="p-3">{r.rate}%</td>
                <td className="p-3"><Switch checked={r.is_active} onCheckedChange={async (v) => {
                  await upsert({ data: { category_id: r.category_id, rate: Number(r.rate), is_active: v } });
                  qc.invalidateQueries({ queryKey: ["affh-cat-rates"] });
                }} /></td>
                <td className="p-3 text-right">
                  <Button size="icon" variant="ghost" onClick={async () => {
                    await remove({ data: { id: r.id } });
                    qc.invalidateQueries({ queryKey: ["affh-cat-rates"] });
                  }}><Trash2 className="w-4 h-4" /></Button>
                </td>
              </tr>
            ))}
            {!rows?.length && <TableEmptyRow cols={4} message="No category overrides" hint="Add category-specific rates to override the default commission." />}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============ APPLICATIONS / AFFILIATES ============
const AffiliateTable: React.FC<{ filter: "pending" | "other"; actionable: boolean }> = ({ filter, actionable }) => {
  const qc = useQueryClient();
  const { formatPrice } = useCurrency();
  const listAffs = useServerFn(adminListAffiliates);
  const updateAff = useServerFn(adminUpdateAffiliate);
  const { data } = useQuery({ queryKey: ["affh-affiliates"], queryFn: () => listAffs({ data: {} }) });
  const rows = (data ?? []).filter((r: any) => filter === "pending" ? r.status === "pending" : r.status !== "pending");

  const handle = async (id: string, status: string, reason?: string) => {
    try {
      await updateAff({ data: { id, status: status as any, rejection_reason: reason } });
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["affh-affiliates"] });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="rounded-3xl border border-border/60 bg-card/60 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40"><tr>
          <th className="text-left p-3">Name</th><th className="text-left p-3">Code</th>
          <th className="text-left p-3">Status</th><th className="text-left p-3">Earnings</th>
          <th className="text-left p-3">Clicks</th><th className="text-left p-3">Custom rate</th>
          <th className="text-left p-3"></th>
        </tr></thead>
        <tbody>
          {rows.map((r: any) => (
            <tr key={r.id} className="border-t border-border/40">
              <td className="p-3">{r.profile?.full_name ?? "—"}</td>
              <td className="p-3 font-mono text-xs">{r.code}</td>
              <td className="p-3"><Badge variant="outline">{r.status}</Badge></td>
              <td className="p-3">{formatPrice(Number(r.total_earnings))}</td>
              <td className="p-3">{r.total_clicks}</td>
              <td className="p-3">
                <Input className="w-20" type="number" step="0.01" defaultValue={r.custom_rate ?? ""} placeholder="Default"
                  onBlur={async (e) => {
                    const v = e.target.value === "" ? null : Number(e.target.value);
                    await updateAff({ data: { id: r.id, custom_rate: v } });
                    qc.invalidateQueries({ queryKey: ["affh-affiliates"] });
                  }} />
              </td>
              <td className="p-3">
                {actionable ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handle(r.id, "approved")}><CheckCircle2 className="w-3 h-3 mr-1" />Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      const reason = prompt("Reason?") ?? ""; handle(r.id, "rejected", reason);
                    }}><XCircle className="w-3 h-3 mr-1" />Reject</Button>
                  </div>
                ) : r.status === "approved" ? (
                  <Button size="sm" variant="outline" onClick={() => handle(r.id, "suspended")}>Suspend</Button>
                ) : (
                  <Button size="sm" onClick={() => handle(r.id, "approved")}>Reactivate</Button>
                )}
              </td>
            </tr>
          ))}
          {!rows.length && <TableEmptyRow cols={7} icon={<Users className="w-5 h-5" />} message="No affiliates" />}
        </tbody>
      </table>
    </div>
  );
};

const ApplicationsTab: React.FC = () => <AffiliateTable filter="pending" actionable />;
const AffiliatesTab: React.FC = () => <AffiliateTable filter="other" actionable={false} />;

// ============ COMMISSIONS ============
const CommissionsTab: React.FC = () => {
  const qc = useQueryClient();
  const { formatPrice } = useCurrency();
  const list = useServerFn(adminListCommissions);
  const adjust = useServerFn(adminAdjustCommission);
  const [status, setStatus] = useState<string>("");
  const { data: rows } = useQuery({ queryKey: ["affh-comm", status], queryFn: () => list({ data: { status: status || undefined } }) });
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="reversed">Reversed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-3xl border border-border/60 bg-card/60 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40"><tr>
            <th className="text-left p-3">Date</th><th className="text-left p-3">Affiliate</th>
            <th className="text-left p-3">Order amt</th><th className="text-left p-3">Rate</th>
            <th className="text-left p-3">Commission</th><th className="text-left p-3">Status</th>
            <th></th>
          </tr></thead>
          <tbody>
            {(rows ?? []).map((c: any) => (
              <tr key={c.id} className="border-t border-border/40">
                <td className="p-3">{new Date(c.created_at).toLocaleDateString()}</td>
                <td className="p-3 font-mono text-xs">{c.affiliate?.code}</td>
                <td className="p-3">{formatPrice(Number(c.order_amount))}</td>
                <td className="p-3">{c.commission_rate}%</td>
                <td className="p-3 font-semibold">{formatPrice(Number(c.commission_amount))}</td>
                <td className="p-3"><Badge>{c.status}</Badge></td>
                <td className="p-3">
                  <Select value={c.status} onValueChange={async (v) => {
                    await adjust({ data: { id: c.id, status: v as any } });
                    qc.invalidateQueries({ queryKey: ["affh-comm"] });
                  }}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="reversed">Reversed</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
            {!rows?.length && <TableEmptyRow cols={7} icon={<Percent className="w-5 h-5" />} message="No commissions" />}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============ PAYOUTS ============
const PayoutsTab: React.FC = () => {
  const qc = useQueryClient();
  const { formatPrice } = useCurrency();
  const list = useServerFn(adminListPayouts);
  const process = useServerFn(adminProcessPayout);
  const { data: rows } = useQuery({ queryKey: ["affh-payouts"], queryFn: () => list({ data: {} }) });
  return (
    <div className="rounded-3xl border border-border/60 bg-card/60 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40"><tr>
          <th className="text-left p-3">Date</th><th className="text-left p-3">Affiliate</th>
          <th className="text-left p-3">Amount</th><th className="text-left p-3">Method</th>
          <th className="text-left p-3">Status</th><th className="text-left p-3">Reference</th>
          <th></th>
        </tr></thead>
        <tbody>
          {(rows ?? []).map((p: any) => (
            <tr key={p.id} className="border-t border-border/40">
              <td className="p-3">{new Date(p.requested_at).toLocaleDateString()}</td>
              <td className="p-3 font-mono text-xs">{p.affiliate?.code}</td>
              <td className="p-3 font-semibold">{formatPrice(Number(p.amount))}</td>
              <td className="p-3">
                <span className="font-semibold capitalize">{p.method?.replace(/_/g, " ")}</span>
                {p.details && typeof p.details === "object" && Object.keys(p.details).length > 0 && (
                  <div className="text-[11px] text-muted-foreground mt-1 font-mono bg-secondary/30 p-1.5 rounded-lg border border-border/40 space-y-0.5 max-w-xs">
                    {p.details.account_holder && <div><span className="text-foreground/70">Holder:</span> {p.details.account_holder}</div>}
                    {p.details.mobile_number && <div><span className="text-foreground/70">MFS:</span> {p.details.mobile_number}</div>}
                    {p.details.account_number && <div><span className="text-foreground/70">A/C:</span> {p.details.account_number}</div>}
                    {p.details.bank_name && <div><span className="text-foreground/70">Bank:</span> {p.details.bank_name} {p.details.branch_name ? `(${p.details.branch_name})` : ""}</div>}
                    {p.details.routing_number && <div><span className="text-foreground/70">Routing:</span> {p.details.routing_number}</div>}
                  </div>
                )}
              </td>
              <td className="p-3"><Badge>{p.status}</Badge></td>
              <td className="p-3 text-xs font-mono">{p.txn_reference ?? "—"}</td>
              <td className="p-3">
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={async () => {
                    const note = prompt("Note to affiliate (visible on their payouts page):", p.admin_notes ?? "");
                    if (note === null) return;
                    await process({ data: { id: p.id, action: "note", admin_notes: note } });
                    qc.invalidateQueries({ queryKey: ["affh-payouts"] });
                  }}>{p.admin_notes ? "Edit note" : "Add note"}</Button>
                  {p.status === "requested" && (
                    <>
                      <Button size="sm" onClick={async () => {
                        const ref = prompt("Transaction reference?"); if (ref === null) return;
                        const note = prompt("Optional note to affiliate:", "") ?? undefined;
                        await process({ data: { id: p.id, action: "paid", txn_reference: ref, admin_notes: note || undefined } });
                        qc.invalidateQueries({ queryKey: ["affh-payouts"] });
                      }}>Mark paid</Button>
                      <Button size="sm" variant="outline" onClick={async () => {
                        const reason = prompt("Reject reason?"); if (!reason) return;
                        await process({ data: { id: p.id, action: "reject", rejection_reason: reason } });
                        qc.invalidateQueries({ queryKey: ["affh-payouts"] });
                      }}>Reject</Button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {!rows?.length && <TableEmptyRow cols={7} icon={<Wallet className="w-5 h-5" />} message="No payouts" />}
        </tbody>
      </table>
    </div>
  );
};

// ============ CREATIVES ============
const CreativesTab: React.FC = () => {
  const qc = useQueryClient();
  const list = useServerFn(adminListCreatives);
  const upsert = useServerFn(adminUpsertCreative);
  const remove = useServerFn(adminDeleteCreative);
  const { data: rows } = useQuery({ queryKey: ["affh-creatives"], queryFn: () => list() });
  const [editing, setEditing] = useState<any | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Creatives library</h2>
          <p className="text-sm text-muted-foreground">Banners, copy snippets, and social cards your affiliates can share.</p>
        </div>
        <Button onClick={() => setEditing({ type: "banner", is_active: true })}><Plus className="w-4 h-4 mr-2" /> New creative</Button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(rows ?? []).map((c: any) => (
          <div key={c.id} className="rounded-3xl border border-border/60 bg-card/60 overflow-hidden">
            {c.image_url && <img src={c.image_url} className="w-full aspect-video object-cover" alt="" />}
            <div className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{c.title}</p>
                  <Badge variant="outline" className="text-xs">{c.type}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setEditing(c)}><SettingsIcon className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={async () => {
                    if (!confirm("Delete?")) return;
                    await remove({ data: { id: c.id } });
                    qc.invalidateQueries({ queryKey: ["affh-creatives"] });
                  }}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
              {c.content && <p className="text-xs text-muted-foreground line-clamp-3">{c.content}</p>}
            </div>
          </div>
        ))}
        {!rows?.length && <div className="col-span-full p-10 text-center text-muted-foreground text-sm border border-dashed border-border/60 rounded-3xl">No creatives yet</div>}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit creative" : "New creative"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Field label="Title"><Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
              <Field label="Type">
                <Select value={editing.type} onValueChange={(v) => setEditing({ ...editing, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="banner">Banner</SelectItem>
                    <SelectItem value="text">Text snippet</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="social">Social card</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Image URL"><Input value={editing.image_url ?? ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} /></Field>
              <Field label="Target URL (where link should go)"><Input value={editing.target_url ?? ""} onChange={(e) => setEditing({ ...editing, target_url: e.target.value })} /></Field>
              <Field label="Content / copy"><Textarea rows={3} value={editing.content ?? ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} /></Field>
              <Row label="Active"><Switch checked={!!editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /></Row>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={async () => {
              try {
                await upsert({ data: editing });
                toast.success("Saved");
                setEditing(null);
                qc.invalidateQueries({ queryKey: ["affh-creatives"] });
              } catch (e: any) { toast.error(e.message); }
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AffiliateHub;
// code:4ce0
