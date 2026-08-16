"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import {
  getGoogleSheetsOverview,
  saveGoogleServiceAccountCredentials,
  saveGoogleSheetTarget,
  saveSheetMapping,
  testSheetConnection,
  pushSerialsToSheet,
  pullSerialsFromSheet,
  pushStockSummaryToSheet,
  autoFormatGoogleSheet,
} from "@/lib/serials-sheets.functions";
import { SheetMapping, SheetField, SHEET_FIELDS } from "@/lib/serials-sheets.types";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  KeyRound,
  RefreshCw,
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  Sliders,
  Stethoscope,
  Layers,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  Info,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TabKey = "overview" | "setup" | "credentials" | "mapping" | "diagnostics";

const NAV_ITEMS: { key: TabKey; label: string; icon: any; iconColor: string }[] = [
  { key: "overview", label: "Sync", icon: Layers, iconColor: "text-primary" },
  { key: "setup", label: "Setup", icon: FileSpreadsheet, iconColor: "text-emerald-500" },
  { key: "credentials", label: "Auth", icon: KeyRound, iconColor: "text-amber-500" },
  { key: "mapping", label: "Columns", icon: Sliders, iconColor: "text-indigo-500" },
  { key: "diagnostics", label: "Health", icon: Stethoscope, iconColor: "text-blue-500" },
];

export const GoogleSheetsConfigModal: React.FC<Props> = ({ open, onOpenChange }) => {
  const qc = useQueryClient();
  const getOverviewFn = useServerFn(getGoogleSheetsOverview);
  const saveCredsFn = useServerFn(saveGoogleServiceAccountCredentials);
  const saveTargetFn = useServerFn(saveGoogleSheetTarget);
  const saveMapFn = useServerFn(saveSheetMapping);
  const testFn = useServerFn(testSheetConnection);
  const pushFn = useServerFn(pushSerialsToSheet);
  const pullFn = useServerFn(pullSerialsFromSheet);
  const pushStockFn = useServerFn(pushStockSummaryToSheet);
  const autoFormatFn = useServerFn(autoFormatGoogleSheet);

  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  // Form States
  const [sheetUrlInput, setSheetUrlInput] = useState("");
  const [sheetId, setSheetId] = useState("");
  const [sheetTab, setSheetTab] = useState("Serials");
  const [syncEnabled, setSyncEnabled] = useState(false);

  // Credentials form
  const [jsonKeyInput, setJsonKeyInput] = useState("");
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Column Mapping state
  const [mapping, setMapping] = useState<SheetMapping>({
    headerRow: 1,
    dataStartRow: 2,
    serialColumn: 1,
    statusColumn: 5,
    columns: [],
  });

  // Diagnostics test state
  const [testResult, setTestResult] = useState<any>(null);

  // Fetch overview data
  const { data: overview } = useQuery({
    queryKey: ["google-sheets-overview"],
    queryFn: () => getOverviewFn(),
    enabled: open,
  });

  useEffect(() => {
    if (overview) {
      if (overview.config) {
        setSheetId(overview.config.sheetId || "");
        setSheetTab(overview.config.tab || "Serials");
        setSyncEnabled(overview.config.syncEnabled || false);
      }
      if (overview.mapping) {
        setMapping(overview.mapping);
      }
    }
  }, [overview]);

  // Handle URL Paste & Extraction
  const handleSheetUrlChange = (val: string) => {
    setSheetUrlInput(val);
    const urlMatch = val.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch && urlMatch[1]) {
      setSheetId(urlMatch[1]);
      toast.success("Spreadsheet ID detected!");
    } else if (val.length > 20 && !val.includes("http")) {
      setSheetId(val.trim());
    }
  };

  const copyServiceEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    toast.success("Service account email copied!");
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  // Mutations
  const saveTargetMutation = useMutation({
    mutationFn: () => saveTargetFn({ data: { sheetId, tab: sheetTab, syncEnabled } }),
    onSuccess: () => {
      toast.success("Google Sheet configuration saved");
      qc.invalidateQueries({ queryKey: ["google-sheets-overview"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const saveCredsMutation = useMutation({
    mutationFn: () => saveCredsFn({ data: { raw_json: jsonKeyInput } }),
    onSuccess: (res: any) => {
      toast.success(`Service Account saved (${res.email})`);
      setJsonKeyInput("");
      qc.invalidateQueries({ queryKey: ["google-sheets-overview"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const saveMappingMutation = useMutation({
    mutationFn: () => saveMapFn({ data: { mapping } }),
    onSuccess: () => {
      toast.success("Column mapping saved");
      qc.invalidateQueries({ queryKey: ["google-sheets-overview"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const testMutation = useMutation({
    mutationFn: () => testFn({ data: { sheetId: sheetId || undefined, tab: sheetTab || undefined } }),
    onSuccess: (res: any) => {
      setTestResult(res);
      if (res.ok) toast.success("Google Sheet connection verified!");
      else toast.error("Connection test found issues");
    },
    onError: (err: any) => {
      setTestResult({ ok: false, steps: [{ step: "Authentication & Connection", ok: false, detail: err.message }] });
      toast.error(err.message);
    },
  });

  const autoFormatMutation = useMutation({
    mutationFn: () => autoFormatFn({ data: { sheetId: sheetId || undefined, tab: sheetTab || undefined } }),
    onSuccess: (res: any) => {
      toast.success(res.message || "Sheet tabs & formatting created successfully!");
      qc.invalidateQueries({ queryKey: ["google-sheets-overview"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const pushMutation = useMutation({
    mutationFn: () => pushFn(),
    onSuccess: (res: any) => toast.success(`Pushed ${res.pushed} serials to Google Sheets`),
    onError: (err: any) => toast.error(err.message),
  });

  const pullMutation = useMutation({
    mutationFn: () => pullFn(),
    onSuccess: (res: any) => {
      toast.success(`Synced ${res.updated} serial statuses from sheet`);
      qc.invalidateQueries({ queryKey: ["serials"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const pushStockMutation = useMutation({
    mutationFn: () => pushStockFn(),
    onSuccess: (res: any) => toast.success(`Stock summary pushed to "${res.tab}" tab`),
    onError: (err: any) => toast.error(err.message),
  });

  const serviceEmail = overview?.auth?.email || "sheets-orz@orizino-integrations.iam.gserviceaccount.com";
  const isAuthReady = !!overview?.auth?.configured;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-xl md:max-w-2xl max-h-[88vh] p-0 gap-0 overflow-hidden rounded-2xl border-border/80 bg-background/95 backdrop-blur-xl shadow-2xl flex flex-col">
        {/* ── 1. Top Header ── */}
        <div className="px-4 sm:px-5 py-3 border-b border-border/60 bg-secondary/15 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20 shadow-2xs">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                Google Sheets Integration
              </DialogTitle>
              <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground">
                Two-way live sync for product serial numbers and inventory stock.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* ── 2. Segmented Pill Navigation (Guaranteed 0-Cutoff) ── */}
        <div className="px-3 sm:px-5 pt-2.5 pb-2 border-b border-border/50 bg-secondary/5 shrink-0">
          <div className="grid grid-cols-5 p-1 rounded-xl bg-secondary/30 border border-border/40 gap-1 text-xs">
            {NAV_ITEMS.map((item) => {
              const active = activeTab === item.key;
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={`py-1.5 px-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all text-center ${
                    active
                      ? "bg-foreground text-background font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? "text-background" : item.iconColor}`} />
                  <span className="truncate">{item.label}</span>

                  {item.key === "credentials" && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isAuthReady ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 3. Scrollable Content Area ── */}
        <div className="p-3.5 sm:p-5 flex-1 overflow-y-auto min-h-0 space-y-3">
          {/* ══════════════ TAB 1: SYNC ══════════════ */}
          {activeTab === "overview" && (
            <div className="space-y-3">
              {/* Connection Status Header */}
              <div
                className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${
                  isAuthReady && sheetId
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-amber-500/30 bg-amber-500/5"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isAuthReady && sheetId ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">
                        {isAuthReady && sheetId ? "Sheet Connected" : "Setup Incomplete"}
                      </span>
                      {sheetId && (
                        <a
                          href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-0.5"
                        >
                          Open Sheet <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {sheetId ? `Tab: "${sheetTab}" · ID: ...${sheetId.slice(-8)}` : "Add Spreadsheet ID in Setup tab."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => autoFormatMutation.mutate()}
                    disabled={autoFormatMutation.isPending || !sheetId}
                    className="h-7 text-xs font-semibold rounded-lg px-2.5 gap-1 border-primary/30 text-primary hover:bg-primary/10"
                    title="Auto-create and format tabs with styled headers & status dropdowns"
                  >
                    {autoFormatMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                    Auto-Design
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab("diagnostics")}
                    className="h-7 text-xs font-semibold rounded-lg px-2.5 border-border/60 bg-background"
                  >
                    Test
                  </Button>
                </div>
              </div>

              {/* 3 Action Rows */}
              <div className="space-y-2">
                {/* 1. Export Serials */}
                <div className="p-3 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                  <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 mt-0.5 sm:mt-0">
                      <Upload className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground">Export Product Serials</h4>
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        Auto-formats sheet &amp; pushes live serial tags, orders, and statuses.
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => pushMutation.mutate()}
                    disabled={pushMutation.isPending || !sheetId}
                    size="sm"
                    className="text-xs font-bold h-7.5 rounded-lg gap-1.5 px-3.5 w-full sm:w-auto shrink-0 shadow-2xs"
                  >
                    {pushMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    Push Serials
                  </Button>
                </div>

                {/* 2. Import Serials */}
                <div className="p-3 rounded-xl border border-border/60 bg-card hover:border-emerald-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                  <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold shrink-0 mt-0.5 sm:mt-0">
                      <Download className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground">Import &amp; Reconcile</h4>
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        Read sheet updates and reconcile database stock levels.
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => pullMutation.mutate()}
                    disabled={pullMutation.isPending || !sheetId}
                    variant="outline"
                    size="sm"
                    className="text-xs font-bold h-7.5 rounded-lg gap-1.5 px-3.5 w-full sm:w-auto shrink-0 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  >
                    {pullMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    Pull Updates
                  </Button>
                </div>

                {/* 3. Stock Summary */}
                <div className="p-3 rounded-xl border border-border/60 bg-card hover:border-blue-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                  <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold shrink-0 mt-0.5 sm:mt-0">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground">Push Stock Matrix</h4>
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        Auto-creates "Stock_Overview" tab and populates SKU summary.
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => pushStockMutation.mutate()}
                    disabled={pushStockMutation.isPending || !sheetId}
                    variant="secondary"
                    size="sm"
                    className="text-xs font-bold h-7.5 rounded-lg gap-1.5 px-3.5 w-full sm:w-auto shrink-0 border border-border/50"
                  >
                    {pushStockMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Sync Stock
                  </Button>
                </div>
              </div>

              {/* Step-by-Step Setup Guidance Callout */}
              <div className="p-3 rounded-xl border border-border/60 bg-secondary/15 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-primary" />
                    Setup Instructions
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("setup")}
                    className="text-[11px] text-primary font-semibold hover:underline"
                  >
                    Sheet Setup →
                  </button>
                </div>

                <p className="text-[11px] text-muted-foreground leading-normal">
                  Open your Google Sheet › Click <strong>Share</strong> › Add the service account email as <strong>Editor</strong>.
                </p>

                <div className="flex items-center gap-1.5 pt-0.5">
                  <code className="text-[10.5px] font-mono bg-background px-2 py-1 rounded-lg border border-border/50 text-foreground flex-1 truncate select-all">
                    {serviceEmail}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyServiceEmail(serviceEmail)}
                    className="h-7 text-xs font-semibold px-2.5 gap-1 bg-background shrink-0"
                  >
                    {copiedEmail ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    Copy
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ TAB 2: SETUP ══════════════ */}
          {activeTab === "setup" && (
            <div className="space-y-3 p-3.5 rounded-xl border border-border/60 bg-card shadow-2xs">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Google Spreadsheet URL or ID</span>
                  {sheetId && (
                    <span className="text-[10px] text-emerald-500 font-mono font-normal">
                      ID: {sheetId}
                    </span>
                  )}
                </Label>
                <Input
                  value={sheetUrlInput || sheetId}
                  onChange={(e) => handleSheetUrlChange(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                  className="text-xs font-mono h-8 bg-background/80"
                />
                <p className="text-[11px] text-muted-foreground">
                  Paste your Google Sheets link. The ID will be extracted automatically.
                </p>
              </div>

              {/* 🪄 Auto-Design Callout Box */}
              <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5 text-primary" />
                    Auto-Design &amp; Create Sheet Tabs
                  </h5>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    Creates "Serials" &amp; "Stock_Overview" with dark styled headers, frozen top rows, and status dropdowns.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => autoFormatMutation.mutate()}
                  disabled={autoFormatMutation.isPending || !sheetId}
                  size="sm"
                  className="text-xs font-bold h-7.5 rounded-lg gap-1.5 px-3 shrink-0"
                >
                  {autoFormatMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                  Auto-Design Sheet
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-border/50">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground">Tab / Sheet Name</Label>
                  <Input
                    value={sheetTab}
                    onChange={(e) => setSheetTab(e.target.value)}
                    placeholder="Serials"
                    className="text-xs font-mono h-8 bg-background/80"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Sheet tab name for serial records (default: "Serials").
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground">Auto-Sync on Orders</Label>
                  <div className="flex items-center justify-between px-3 rounded-lg border border-border/60 bg-background/80 h-8">
                    <span className="text-xs text-muted-foreground font-medium">Automatic sync</span>
                    <Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Sync status automatically when products are sold or scanned.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-border/50 flex items-center justify-end">
                <Button
                  onClick={() => saveTargetMutation.mutate()}
                  disabled={saveTargetMutation.isPending}
                  size="sm"
                  className="text-xs font-bold h-7.5 rounded-lg gap-1.5 px-3.5"
                >
                  {saveTargetMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Save Settings
                </Button>
              </div>
            </div>
          )}

          {/* ══════════════ TAB 3: AUTH ══════════════ */}
          {activeTab === "credentials" && (
            <div className="space-y-3 p-3.5 rounded-xl border border-border/60 bg-card shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-primary" />
                    Service Account Credentials
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Authenticates with Google Sheets API without token expiration.
                  </p>
                </div>

                <Badge variant={isAuthReady ? "default" : "secondary"} className={`text-[10px] font-bold ${isAuthReady ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : ""}`}>
                  {isAuthReady ? "Authenticated" : "Not Configured"}
                </Badge>
              </div>

              {isAuthReady && (
                <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-bold">Active Service Email:</p>
                    <code className="text-[11px] font-mono text-foreground truncate block select-all">
                      {serviceEmail}
                    </code>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyServiceEmail(serviceEmail)}
                    className="h-6.5 text-xs font-semibold px-2 gap-1 bg-background shrink-0"
                  >
                    {copiedEmail ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    Copy
                  </Button>
                </div>
              )}

              {/* Paste JSON Key */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">
                  Service Account JSON Key
                </Label>
                <Textarea
                  value={jsonKeyInput}
                  onChange={(e) => setJsonKeyInput(e.target.value)}
                  placeholder={`{\n  "type": "service_account",\n  "project_id": "orizino-integrations",\n  "private_key": "...",\n  "client_email": "sheets-orz@orizino-integrations.iam.gserviceaccount.com"\n}`}
                  rows={4}
                  className="text-[11px] font-mono bg-background/80 leading-relaxed resize-none border-border/60"
                />
                <p className="text-[11px] text-muted-foreground">
                  Obtain from Google Cloud Console › IAM &amp; Admin › Service Accounts › Keys.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <a
                  href="https://console.cloud.google.com/iam-admin/serviceaccounts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  Google Cloud Console <ExternalLink className="w-3 h-3" />
                </a>

                <Button
                  onClick={() => saveCredsMutation.mutate()}
                  disabled={saveCredsMutation.isPending || !jsonKeyInput.trim()}
                  size="sm"
                  className="text-xs font-bold h-7.5 rounded-lg gap-1.5 px-3.5"
                >
                  {saveCredsMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Save Credentials
                </Button>
              </div>
            </div>
          )}

          {/* ══════════════ TAB 4: COLUMNS ══════════════ */}
          {activeTab === "mapping" && (
            <div className="space-y-3 p-3.5 rounded-xl border border-border/60 bg-card shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Column Mapping</h4>
                  <p className="text-[11px] text-muted-foreground">Map sheet columns to database fields.</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setMapping({
                      ...mapping,
                      columns: [...mapping.columns, { header: "New Column", field: "" }],
                    });
                  }}
                  className="h-7 text-xs font-semibold gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Column
                </Button>
              </div>

              <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                {mapping.columns.map((col, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-1.5 rounded-lg border border-border/50 bg-background/80 text-xs">
                    <span className="w-4 text-center text-muted-foreground font-mono font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <Input
                      value={col.header}
                      onChange={(e) => {
                        const updated = [...mapping.columns];
                        updated[idx].header = e.target.value;
                        setMapping({ ...mapping, columns: updated });
                      }}
                      placeholder="Header"
                      className="h-7 text-xs flex-1 bg-secondary/15 font-semibold"
                    />
                    <select
                      value={col.field}
                      onChange={(e) => {
                        const updated = [...mapping.columns];
                        updated[idx].field = e.target.value as SheetField | "";
                        setMapping({ ...mapping, columns: updated });
                      }}
                      className="h-7 text-xs bg-secondary/30 rounded-md px-2 border border-border/50 flex-1 font-mono"
                    >
                      <option value="">(None / Blank)</option>
                      {SHEET_FIELDS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const updated = mapping.columns.filter((_, i) => i !== idx);
                        setMapping({ ...mapping, columns: updated });
                      }}
                      className="h-6.5 w-6.5 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end pt-2 border-t border-border/50">
                <Button
                  onClick={() => saveMappingMutation.mutate()}
                  disabled={saveMappingMutation.isPending}
                  size="sm"
                  className="text-xs font-bold h-7.5 rounded-lg gap-1.5 px-3.5"
                >
                  {saveMappingMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Save Mapping
                </Button>
              </div>
            </div>
          )}

          {/* ══════════════ TAB 5: HEALTH ══════════════ */}
          {activeTab === "diagnostics" && (
            <div className="space-y-3 p-3.5 rounded-xl border border-border/60 bg-card shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Health &amp; Connection Diagnostics</h4>
                  <p className="text-[11px] text-muted-foreground">Test authentication, sheet permissions and latency.</p>
                </div>
                <Button
                  onClick={() => testMutation.mutate()}
                  disabled={testMutation.isPending || !sheetId}
                  size="sm"
                  className="text-xs font-bold h-7.5 rounded-lg gap-1.5 px-3"
                >
                  {testMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Stethoscope className="w-3 h-3" />}
                  Run Test
                </Button>
              </div>

              {testResult ? (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      {testResult.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
                      {testResult.ok ? "All Checks Passed" : "Diagnostics Found Issues"}
                    </span>
                    {testResult.ms && <span className="text-[11px] text-muted-foreground font-mono">{testResult.ms}ms</span>}
                  </div>

                  <div className="space-y-1.5">
                    {testResult.steps?.map((s: any, idx: number) => (
                      <div key={idx} className={`p-2 rounded-lg border text-xs flex items-start gap-2 ${
                        s.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"
                      }`}>
                        {s.ok ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs">{s.step}</p>
                          {s.detail && <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">{s.detail}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-border/60 rounded-xl space-y-1 bg-secondary/5">
                  <Stethoscope className="w-6 h-6 text-muted-foreground mx-auto" />
                  <p className="text-xs text-muted-foreground">Click "Run Test" to verify the connection to your Google Sheet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
