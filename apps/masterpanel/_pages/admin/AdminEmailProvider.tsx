"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRegisterUniversalSave } from "@/contexts/UniversalSaveContext";
import { useServerFn } from "@/lib/server-fn-compat";
import {
  getEmailProviderSettings,
  updateEmailProviderSettings,
  verifyResendKey,
  sendProviderTestEmail,
  purgeEmailDispatchLog,
  updateSiteUrlOverride,
} from "@/lib/email-provider.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { APP_URLS } from "@orizino/shared";
import { useTabParam } from "@/hooks/use-tab-param";
import { toast } from "@/lib/app-toast";
import {
  AtSign,
  CheckCircle2,
  XCircle,
  Copy,
  Send,
  ShieldCheck,
  Activity,
  ExternalLink,
  KeyRound,
  RefreshCw,
  Plus,
  Trash2,
  Star,
  Users,
  AlertTriangle,
  ListChecks,
  Mail,
  Sliders,
  Check,
  Eye,
  EyeOff,
  Save,
} from "lucide-react";
import { Sparkle } from "@/components/icons/Sparkle";

export type Sender = {
  id: string;
  category: string;
  label: string;
  from_name: string;
  from_email: string;
  reply_to?: string | null;
  is_default?: boolean;
};

export type EmailProviderConfig = {
  resend_api_key?: string;
  webhook_secret?: string;
  from_email: string;
  from_name: string;
  reply_to: string;
  footer_address: string;
  tracking_opens: boolean;
  tracking_clicks: boolean;
  site_url_override?: string;
  senders: Sender[];
};

const ORIZINO_DEFAULTS: EmailProviderConfig = {
  resend_api_key: "",
  webhook_secret: "",
  from_email: "team@orizino.com",
  from_name: "Orizino",
  reply_to: "contact.orizino@gmail.com",
  footer_address: "Orizino Luxury Apparel Co.",
  tracking_opens: true,
  tracking_clicks: true,
  site_url_override: "",
  senders: [
    { id: "s_team", category: "team", label: "Universal default (team)", from_name: "Orizino", from_email: "team@orizino.com", reply_to: "contact.orizino@gmail.com", is_default: true },
    { id: "s_updates", category: "updates", label: "Product updates & newsletters", from_name: "Orizino Updates", from_email: "updates@orizino.com", reply_to: "contact.orizino@gmail.com" },
    { id: "s_contact", category: "contact", label: "Contact & support replies", from_name: "Orizino Support", from_email: "contact@orizino.com", reply_to: "contact.orizino@gmail.com" },
    { id: "s_admin", category: "admin", label: "Admin & transactional", from_name: "Orizino Admin", from_email: "admin@orizino.com", reply_to: "contact.orizino@gmail.com" },
  ],
};

export default function AdminEmailProvider() {
  const qc = useQueryClient();
  const getSettingsFn = useServerFn(getEmailProviderSettings);
  const saveSettingsFn = useServerFn(updateEmailProviderSettings);
  const verifyFn = useServerFn(verifyResendKey);
  const sendTestFn = useServerFn(sendProviderTestEmail);
  const saveSiteUrlFn = useServerFn(updateSiteUrlOverride);

  const [form, setForm] = useState<EmailProviderConfig>(ORIZINO_DEFAULTS);
  const [initialForm, setInitialForm] = useState<EmailProviderConfig>(ORIZINO_DEFAULTS);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testSubject, setTestSubject] = useState("Test email from Orizino Resend integration");
  const [testCategory, setTestCategory] = useState("team");
  const [testResponse, setTestResponse] = useState<null | { ok: boolean; id?: string | null; error?: string | null }>(null);
  const [domains, setDomains] = useState<any[] | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [epTab, setEpTab] = useTabParam("sender", "/settings-ai/email-provider");
  const activeTab =
    epTab === "senders" || epTab === "keys"
      ? "sender"
      : epTab === "stats" || epTab === "log"
      ? "activity"
      : epTab;

  // 1. Direct Supabase Query (Instant, non-blocking, reliable)
  const { data: dbSettings, isLoading: isDbLoading, refetch: refetchDb } = useQuery({
    queryKey: ["admin-email-provider-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "email_provider")
        .maybeSingle();
      if (error) console.warn("Email provider config note:", error);
      return (data?.value as any) || null;
    },
    staleTime: 10_000,
  });

  // 2. Server Fn Query for Environment & Server-side secrets (background)
  const { data: serverInfo } = useQuery({
    queryKey: ["email-provider-server-info"],
    queryFn: async () => {
      try {
        return await getSettingsFn();
      } catch (err) {
        console.warn("Server fn getSettings error:", err);
        return null;
      }
    },
    retry: false,
    staleTime: 60_000,
  });

  // 3. Dispatch Log Query directly from Supabase
  const { data: logRows = [], refetch: refetchLog, isFetching: logLoading } = useQuery({
    queryKey: ["admin-email-dispatch-log"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("email_dispatch_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) {
        console.warn("Dispatch log query note:", error);
        return [];
      }
      return data || [];
    },
    staleTime: 5_000,
    refetchInterval: 15_000,
  });

  // Hydrate form on load
  useEffect(() => {
    if (dbSettings) {
      const s = dbSettings as Partial<EmailProviderConfig>;
      const merged: EmailProviderConfig = {
        resend_api_key: s.resend_api_key ?? "",
        webhook_secret: s.webhook_secret ?? "",
        from_email: s.from_email ?? ORIZINO_DEFAULTS.from_email,
        from_name: s.from_name ?? ORIZINO_DEFAULTS.from_name,
        reply_to: s.reply_to ?? ORIZINO_DEFAULTS.reply_to,
        footer_address: s.footer_address ?? ORIZINO_DEFAULTS.footer_address,
        tracking_opens: s.tracking_opens ?? true,
        tracking_clicks: s.tracking_clicks ?? true,
        site_url_override: s.site_url_override ?? "",
        senders: Array.isArray(s.senders) && s.senders.length ? s.senders : ORIZINO_DEFAULTS.senders,
      };
      setForm(merged);
      setInitialForm(merged);
    }
  }, [dbSettings]);

  const isDirty = useMemo(() => {
    try {
      return JSON.stringify(form) !== JSON.stringify(initialForm);
    } catch {
      return false;
    }
  }, [form, initialForm]);

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // 1. Direct Supabase Upsert
      const { error } = await supabase.from("site_settings").upsert(
        {
          key: "email_provider",
          value: form as any,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
      if (error) throw error;

      // 2. Best-effort server function sync
      try {
        await saveSettingsFn({ data: form });
      } catch {
        // Ignored if server fn runtime is unavailable
      }
    },
    onSuccess: () => {
      setInitialForm(form);
      qc.invalidateQueries({ queryKey: ["admin-email-provider-settings"] });
      qc.invalidateQueries({ queryKey: ["email-provider"] });
      qc.invalidateQueries({ queryKey: ["email-provider-summary"] });
      toast.success("Email provider settings saved successfully");
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Failed to save email provider settings");
    },
  });

  // Register Universal Floating Save Button
  useRegisterUniversalSave({
    id: "admin-email-provider",
    label: "Save Email Provider Settings",
    onSave: () => saveMutation.mutate(),
    isSaving: saveMutation.isPending,
    isDirty,
  });

  // Key verification
  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const res = await verifyFn();
      if (res?.ok) {
        setDomains(res.domains || []);
        toast.success(`Resend API key verified. Found ${res.domains?.length ?? 0} domains.`);
      } else {
        toast.error(res?.error || "Key verification failed. Ensure RESEND_API_KEY is valid.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Verification request failed");
    } finally {
      setIsVerifying(false);
    }
  };

  // Send Test Email
  const handleSendTest = async () => {
    if (!testTo.trim()) {
      toast.error("Please enter a recipient email address");
      return;
    }
    setIsSendingTest(true);
    setTestResponse(null);
    try {
      const res = await sendTestFn({
        data: {
          to: testTo.trim(),
          subject: testSubject.trim() || "Test Email from Orizino",
          category: testCategory,
        },
      });
      setTestResponse(res);
      if (res?.ok) {
        toast.success(`Test email sent successfully! Resend ID: ${res.id || "OK"}`);
        refetchLog();
      } else {
        toast.error(res?.error || "Test send failed. Check Resend logs.");
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to dispatch test email";
      setTestResponse({ ok: false, error: errorMsg });
      toast.error(errorMsg);
    } finally {
      setIsSendingTest(false);
    }
  };

  // Clear log
  const handleClearLog = async () => {
    if (!confirm("Are you sure you want to clear all email dispatch log entries?")) return;
    try {
      await (supabase as any).from("email_dispatch_log").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      toast.success("Dispatch log cleared");
      refetchLog();
    } catch (err: any) {
      toast.error(err?.message || "Failed to clear dispatch log");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard`);
  };

  // Resolved Site Base URL & Webhook URL (Always HTTPS Production)
  const effectiveBaseUrl =
    form.site_url_override?.trim() ||
    (typeof window !== "undefined" && !window.location.hostname.includes("localhost")
      ? window.location.origin
      : "https://mp.orizino.com");

  const webhookEndpointUrl = `${effectiveBaseUrl.replace(/\/+$/, "")}/api/public/hooks/resend-webhook`;
  const unsubscribeEndpointUrl = `${effectiveBaseUrl.replace(/\/+$/, "")}/api/public/unsubscribe`;

  const isResendConfigured =
    Boolean(form.resend_api_key?.trim()) ||
    Boolean(serverInfo?.env?.resendKeyConfigured);

  const isWebhookConfigured =
    Boolean(form.webhook_secret?.trim()) ||
    Boolean(serverInfo?.env?.webhookSecretConfigured);

  // Compute live stats from log rows
  const calculatedStats = useMemo(() => {
    const total = logRows.length;
    const sent = logRows.filter((r: any) => r.status === "sent" || r.status === "delivered").length;
    const delivered = logRows.filter((r: any) => r.status === "delivered").length;
    const failed = logRows.filter((r: any) => r.status === "failed" || r.status === "bounced").length;
    const opened = logRows.filter((r: any) => r.event === "email.opened" || r.status === "opened").length;
    const clicked = logRows.filter((r: any) => r.event === "email.clicked" || r.status === "clicked").length;
    return { total, sent, delivered, failed, opened, clicked };
  }, [logRows]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card/60 backdrop-blur-md border border-border/50 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-xs">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                Email Provider Studio
              </h1>
              <Badge variant="outline" className="text-[10px] font-mono uppercase bg-primary/10 text-primary border-primary/20">
                Resend Cloud
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Configure transactional &amp; marketing sender identities, Resend API key, webhooks, and live delivery logs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetchDb()}
            className="text-xs h-9 gap-1.5"
            title="Refresh database state"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isDbLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !isDirty}
            className="text-xs h-9 font-semibold gap-1.5 shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            {saveMutation.isPending ? "Saving…" : isDirty ? "Save Changes" : "Saved"}
          </Button>
        </div>
      </div>

      {/* ── STATUS KPIS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl border border-border/40 bg-card/60 flex items-center justify-between shadow-2xs">
          <div className="space-y-1 min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">Resend API Key</p>
            <p className="text-base sm:text-lg font-bold text-foreground flex items-center gap-1.5">
              {isResendConfigured ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-emerald-500 truncate">Configured</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="text-rose-500 truncate">Missing Key</span>
                </>
              )}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <KeyRound className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border/40 bg-card/60 flex items-center justify-between shadow-2xs">
          <div className="space-y-1 min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">Default Sender</p>
            <p className="text-xs sm:text-sm font-bold text-foreground font-mono truncate">
              {form.from_email || "team@orizino.com"}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <AtSign className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border/40 bg-card/60 flex items-center justify-between shadow-2xs">
          <div className="space-y-1 min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">Webhook Ingestion</p>
            <p className="text-base sm:text-lg font-bold text-foreground flex items-center gap-1.5">
              {isWebhookConfigured ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-emerald-500 truncate">Active</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-amber-500 truncate">Secret Optional</span>
                </>
              )}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border/40 bg-card/60 flex items-center justify-between shadow-2xs">
          <div className="space-y-1 min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">Recent Dispatches</p>
            <p className="text-base sm:text-lg font-bold text-foreground">
              {calculatedStats.total} <span className="text-xs font-normal text-muted-foreground">in log</span>
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ── SECTIONS (SINGLE SEAMLESS PAGE) ── */}
      <div className="space-y-6">
        {/* 1. Universal Default Sender Identity & Compliance Card */}
        <Card className="rounded-2xl border-border/50 bg-card/60 shadow-xs">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AtSign className="w-5 h-5 text-primary" /> Universal Default Sender Identity
                </CardTitle>
                <CardDescription>
                  Primary sender name and email address applied to automated orders, receipts, announcements and newsletters.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Default Mailbox
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">From Display Name</Label>
                <Input
                  value={form.from_name ?? ""}
                  onChange={(e) => setForm({ ...form, from_name: e.target.value })}
                  placeholder="ORIZINO"
                  className="bg-background/60 text-sm rounded-xl font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Verified From Email Address</Label>
                <Input
                  type="email"
                  value={form.from_email ?? ""}
                  onChange={(e) => setForm({ ...form, from_email: e.target.value })}
                  placeholder="orders@orizino.com"
                  className="bg-background/60 font-mono text-sm rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Reply-To Address (Optional)</Label>
                <Input
                  type="email"
                  value={form.reply_to ?? ""}
                  onChange={(e) => setForm({ ...form, reply_to: e.target.value })}
                  placeholder="support@orizino.com"
                  className="bg-background/60 font-mono text-sm rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Physical Postal Address (CAN-SPAM)</Label>
                <Input
                  value={form.footer_address ?? ""}
                  onChange={(e) => setForm({ ...form, footer_address: e.target.value })}
                  placeholder="Dhaka, Bangladesh"
                  className="bg-background/60 text-sm rounded-xl"
                />
              </div>
            </div>

            {/* Engagement Tracking Toggles */}
            <div className="pt-3 border-t border-border/40 grid sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-secondary/15">
                <div>
                  <p className="text-xs font-semibold text-foreground">Email Open Tracking</p>
                  <p className="text-[11px] text-muted-foreground">Injects 1px invisible beacon to measure open rates</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.tracking_opens ?? true}
                  onChange={(e) => setForm({ ...form, tracking_opens: e.target.checked })}
                  className="w-4 h-4 rounded text-primary focus:ring-primary/40 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-secondary/15">
                <div>
                  <p className="text-xs font-semibold text-foreground">Link Click Tracking</p>
                  <p className="text-[11px] text-muted-foreground">Wraps outbound hyperlinks to measure engagement clicks</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.tracking_clicks ?? true}
                  onChange={(e) => setForm({ ...form, tracking_clicks: e.target.checked })}
                  className="w-4 h-4 rounded text-primary focus:ring-primary/40 cursor-pointer"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. API Credentials & Webhooks Card (2-Column Grid) */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Card A: Resend API Key & Domains */}
          <Card className="rounded-2xl border-border/50 bg-card/60 shadow-xs flex flex-col justify-between">
            <div>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-primary" /> Resend Cloud API Credentials
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleVerify}
                    disabled={isVerifying || (!form.resend_api_key?.trim() && !serverInfo?.env?.resendKeyConfigured)}
                    className="text-xs h-8 gap-1.5 rounded-xl font-semibold"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? "animate-spin" : ""}`} />
                    {isVerifying ? "Verifying…" : "Verify Key"}
                  </Button>
                </div>
                <CardDescription className="text-xs">
                  Configure your Resend API Key (<code className="text-[11px] font-mono px-1 py-0.5 bg-muted rounded">re_...</code>) for high-deliverability email dispatch.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Resend API Key Token</Label>
                    {serverInfo?.env?.resendKeyConfigured && !form.resend_api_key && (
                      <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
                        Env Active ({serverInfo.env.resendKeyPreview || "Set"})
                      </Badge>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={form.resend_api_key ?? ""}
                      onChange={(e) => setForm({ ...form, resend_api_key: e.target.value })}
                      placeholder={
                        serverInfo?.env?.resendKeyConfigured
                          ? `Configured in .env (${serverInfo.env.resendKeyPreview || "Active"}) — or type key to override in database`
                          : "re_1234567890abcdef..."
                      }
                      className="bg-background/60 font-mono text-xs pr-10 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Runtime Key Resolution:{" "}
                    <span className="font-mono text-foreground font-semibold">
                      {form.resend_api_key ? "Database override active" : serverInfo?.env?.resendKeyPreview ? `Environment variable (${serverInfo.env.resendKeyPreview})` : "Missing key — enter above"}
                    </span>
                  </p>
                </div>

                {/* Verified Domains Section */}
                {domains && (
                  <div className="rounded-xl border border-border/50 divide-y divide-border/40 overflow-hidden bg-background/50">
                    <div className="p-2.5 bg-secondary/30 text-xs font-bold flex items-center justify-between">
                      <span>Registered Sending Domains</span>
                      <Badge variant="outline" className="text-[10px]">{domains.length}</Badge>
                    </div>
                    {domains.length === 0 ? (
                      <p className="text-xs p-3 text-muted-foreground text-center">
                        No domains found in your Resend account.
                      </p>
                    ) : (
                      domains.map((d: any) => (
                        <div key={d.id} className="p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-foreground">{d.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">Region: {d.region || "us-east-1"}</p>
                          </div>
                          <Badge
                            className={`text-[10px] capitalize ${
                              d.status === "verified"
                                ? "bg-emerald-500/20 text-emerald-500 border-0"
                                : "bg-amber-500/20 text-amber-500 border-0"
                            }`}
                          >
                            {d.status || "unverified"}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </div>

            <div className="p-4 border-t border-border/40 bg-secondary/10 rounded-b-2xl">
              <a
                href="https://resend.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Generate or manage Resend API keys &rarr;</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </Card>

          {/* Card B: Webhook Ingestion & Signing Secret */}
          <Card className="rounded-2xl border-border/50 bg-card/60 shadow-xs flex flex-col justify-between">
            <div>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" /> Delivery Webhook &amp; Public Endpoints
                  </CardTitle>
                  <Badge className="bg-emerald-500/20 text-emerald-500 border-0 text-[10px] gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Resend Active
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Copy these endpoints into your Resend Dashboard &gt; Webhooks to receive real-time delivery, open, click and bounce telemetry.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Webhook Ingestion Endpoint URL</Label>
                    <Badge variant="outline" className="text-[10px] font-mono text-emerald-500 border-emerald-500/30">
                      HTTPS 200 OK
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={webhookEndpointUrl}
                      className="bg-background/80 font-mono text-xs select-all rounded-xl"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(webhookEndpointUrl, "Webhook URL")}
                      className="h-9 px-3 gap-1 rounded-xl shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">One-Click Unsubscribe Endpoint URL</Label>
                    <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                      RFC 8058
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={unsubscribeEndpointUrl}
                      className="bg-background/80 font-mono text-xs select-all rounded-xl"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(unsubscribeEndpointUrl, "Unsubscribe URL")}
                      className="h-9 px-3 gap-1 rounded-xl shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Webhook Signing Secret (whsec_...)</Label>
                    {form.webhook_secret && (
                      <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
                        Configured
                      </Badge>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type={showWebhookSecret ? "text" : "password"}
                      value={form.webhook_secret ?? ""}
                      onChange={(e) => setForm({ ...form, webhook_secret: e.target.value })}
                      placeholder="whsec_LRk0Vo32TaIiZag3bOSpuSMSZ17qOSj2"
                      className="bg-background/60 font-mono text-xs pr-10 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Signature verification token provided by Resend for payload tamper protection.
                  </p>
                </div>
              </CardContent>
            </div>

            <div className="p-4 border-t border-border/40 bg-secondary/10 rounded-b-2xl">
              <a
                href="https://resend.com/webhooks"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Setup Webhooks in Resend Dashboard &rarr;</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </Card>
        </div>

        {/* 3. Categorized Sender Profiles Studio */}
        <Card className="rounded-2xl border-border/50 bg-card/60 shadow-xs">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" /> Categorized Sender Profiles Studio
              </CardTitle>
              <CardDescription>
                Assign dedicated sender mailboxes per transmission department (e.g. <code className="font-mono text-xs">orders@</code> for receipts, <code className="font-mono text-xs">support@</code> for helpdesk, <code className="font-mono text-xs">newsletter@</code> for marketing).
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                const newSender: Sender = {
                  id: `s_${Math.random().toString(36).slice(2, 8)}`,
                  category: "",
                  label: "",
                  from_name: form.from_name || "Orizino",
                  from_email: form.from_email || "team@orizino.com",
                  reply_to: form.reply_to || "",
                };
                setForm({ ...form, senders: [...form.senders, newSender] });
              }}
              className="text-xs font-semibold h-9 gap-1.5 rounded-xl self-start sm:self-auto shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add Sender Profile
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {form.senders.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border/60 rounded-2xl bg-secondary/10 space-y-3">
                <AtSign className="w-8 h-8 mx-auto text-muted-foreground/50" />
                <div>
                  <p className="text-sm font-semibold text-foreground">No additional sender profiles configured</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    All transactional and marketing emails will fall back to your Universal Default Sender.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {form.senders.map((s, idx) => (
                  <div
                    key={s.id || idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      s.is_default
                        ? "border-primary/40 bg-primary/5 shadow-xs"
                        : "border-border/50 bg-background/50 hover:border-border"
                    } space-y-3`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="font-mono text-[10px] uppercase font-bold tracking-wider">
                          {s.category || `sender-${idx + 1}`}
                        </Badge>
                        {s.is_default && (
                          <Badge className="bg-primary/20 text-primary border-0 text-[10px]">
                            Default
                          </Badge>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const senders = form.senders.filter((_, i) => i !== idx);
                          setForm({ ...form, senders });
                        }}
                        className="w-7 h-7 text-muted-foreground hover:text-destructive rounded-lg"
                        title="Delete profile"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Category Key</Label>
                        <Input
                          value={s.category}
                          onChange={(e) => {
                            const senders = [...form.senders];
                            senders[idx] = { ...s, category: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") };
                            setForm({ ...form, senders });
                          }}
                          placeholder="e.g. orders, support"
                          className="h-8 text-xs font-mono bg-background/60 rounded-lg"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Friendly Label</Label>
                        <Input
                          value={s.label}
                          onChange={(e) => {
                            const senders = [...form.senders];
                            senders[idx] = { ...s, label: e.target.value };
                            setForm({ ...form, senders });
                          }}
                          placeholder="e.g. Order Confirmations"
                          className="h-8 text-xs bg-background/60 rounded-lg"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">From Name</Label>
                        <Input
                          value={s.from_name}
                          onChange={(e) => {
                            const senders = [...form.senders];
                            senders[idx] = { ...s, from_name: e.target.value };
                            setForm({ ...form, senders });
                          }}
                          placeholder="e.g. ORIZINO Orders"
                          className="h-8 text-xs bg-background/60 rounded-lg"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">From Email Address</Label>
                        <Input
                          type="email"
                          value={s.from_email}
                          onChange={(e) => {
                            const senders = [...form.senders];
                            senders[idx] = { ...s, from_email: e.target.value };
                            setForm({ ...form, senders });
                          }}
                          placeholder="orders@orizino.com"
                          className="h-8 text-xs font-mono bg-background/60 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. Unified Actions Bar */}
        <div className="p-4 rounded-2xl border border-border/50 bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isDirty ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
            <p className="text-xs font-medium text-foreground">
              {isDirty ? "You have unsaved email configuration changes" : "All email provider settings are synchronized with database"}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isDirty && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setForm(initialForm)}
                disabled={saveMutation.isPending}
                className="text-xs rounded-xl h-9"
              >
                Discard Changes
              </Button>
            )}
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !isDirty}
              className="font-bold text-xs rounded-xl h-9 px-5 gap-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              {saveMutation.isPending ? "Saving Configuration…" : "Save All Configuration"}
            </Button>
          </div>
        </div>

        {/* 5. Deliverability & Engagement Telemetry */}
        <Card className="rounded-2xl border-border/50 bg-card/60 shadow-xs">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> Deliverability &amp; Engagement Telemetry
            </CardTitle>
            <CardDescription>
              Live dispatch metrics computed from your Resend delivery webhooks and automated campaign transmissions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-4 rounded-2xl border border-border/40 bg-secondary/15">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Dispatched</p>
                <p className="text-2xl font-black text-foreground mt-1 tabular-nums">{calculatedStats.total}</p>
              </div>

              <div className="p-4 rounded-2xl border border-border/40 bg-secondary/15">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Sent Successfully</p>
                <p className="text-2xl font-black text-emerald-500 mt-1 tabular-nums">{calculatedStats.sent}</p>
              </div>

              <div className="p-4 rounded-2xl border border-border/40 bg-secondary/15">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Delivered (200 OK)</p>
                <p className="text-2xl font-black text-emerald-400 mt-1 tabular-nums">{calculatedStats.delivered}</p>
              </div>

              <div className="p-4 rounded-2xl border border-border/40 bg-secondary/15">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Email Opens</p>
                <p className="text-2xl font-black text-purple-400 mt-1 tabular-nums">{calculatedStats.opened}</p>
              </div>

              <div className="p-4 rounded-2xl border border-border/40 bg-secondary/15">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Link Clicks</p>
                <p className="text-2xl font-black text-sky-400 mt-1 tabular-nums">{calculatedStats.clicked}</p>
              </div>

              <div className="p-4 rounded-2xl border border-border/40 bg-secondary/15">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Bounced / Failed</p>
                <p className={`text-2xl font-black mt-1 tabular-nums ${calculatedStats.failed > 0 ? "text-rose-500" : "text-muted-foreground"}`}>
                  {calculatedStats.failed}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 6. Live Email Dispatch Log */}
        <Card className="rounded-2xl border-border/50 bg-card/60 shadow-xs overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-primary" /> Live Email Dispatch Log
              </CardTitle>
              <CardDescription>
                Real-time history of all transactional invoices, notifications, marketing, and test emails sent across the ecosystem.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetchLog()}
                disabled={logLoading}
                className="text-xs h-8 gap-1.5 rounded-xl"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${logLoading ? "animate-spin" : ""}`} /> Refresh Log
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleClearLog}
                disabled={logLoading || logRows.length === 0}
                className="text-xs h-8 gap-1.5 rounded-xl"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Log
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {logRows.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground space-y-2">
                <Mail className="w-8 h-8 mx-auto text-muted-foreground/40" />
                <p className="text-sm font-semibold">No email dispatch entries found</p>
                <p className="text-xs">Customer order invoices, receipts and test emails will be logged here automatically.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/30 text-muted-foreground uppercase tracking-wider text-[10px] font-semibold border-b border-border/40">
                    <tr>
                      <th className="text-left p-3.5">Timestamp</th>
                      <th className="text-left p-3.5">Purpose / Subject</th>
                      <th className="text-left p-3.5">Event</th>
                      <th className="text-left p-3.5">Recipient</th>
                      <th className="text-left p-3.5">Status</th>
                      <th className="text-left p-3.5">Resend ID / Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {logRows.map((r: any) => (
                      <tr key={r.id} className="hover:bg-secondary/15 transition-colors">
                        <td className="p-3.5 text-muted-foreground font-mono text-[11px] whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString()}
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-foreground block">{r.purpose || "notification"}</span>
                          {r.subject && <span className="text-[10px] text-muted-foreground truncate max-w-[200px] block">{r.subject}</span>}
                        </td>
                        <td className="p-3.5">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {r.event || "dispatch"}
                          </Badge>
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-foreground">
                          {r.recipient || "—"}
                        </td>
                        <td className="p-3.5">
                          <Badge
                            className={`text-[10px] capitalize ${
                              r.status === "sent" || r.status === "delivered"
                                ? "bg-emerald-500/20 text-emerald-500 border-0"
                                : r.status === "failed" || r.status === "bounced"
                                ? "bg-rose-500/20 text-rose-500 border-0"
                                : "bg-secondary text-foreground"
                            }`}
                          >
                            {r.status || "sent"}
                          </Badge>
                        </td>
                        <td className="p-3.5 font-mono text-[10px] break-all max-w-[220px]">
                          {r.error ? (
                            <span className="text-rose-500">{r.error}</span>
                          ) : (
                            <span className="text-muted-foreground">{r.provider_id || "—"}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 7. Interactive Live Test Email Transmission (Moved to Bottom) */}
        <Card className="rounded-2xl border-border/50 bg-card/60 shadow-xs">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" /> Live Test Email Transmission
            </CardTitle>
            <CardDescription>
              Dispatch an immediate test email through your configured Resend credentials to verify sender deliverability and DNS records.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Recipient Email Address</Label>
                <Input
                  type="email"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="youremail@example.com"
                  className="bg-background/60 font-mono text-sm rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Email Subject Line</Label>
                <Input
                  value={testSubject}
                  onChange={(e) => setTestSubject(e.target.value)}
                  placeholder="Test Email Subject"
                  className="bg-background/60 text-sm rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Sender Profile Category</Label>
                <select
                  value={testCategory}
                  onChange={(e) => setTestCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background/60 text-xs font-mono"
                >
                  <option value="team">team ({form.from_email})</option>
                  {form.senders.map((s) => (
                    <option key={s.id} value={s.category || s.id}>
                      {s.category || s.label} ({s.from_email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleSendTest}
                disabled={isSendingTest || !testTo.trim()}
                className="font-semibold text-xs rounded-xl gap-2 shadow-sm"
              >
                <Send className={`w-3.5 h-3.5 ${isSendingTest ? "animate-pulse" : ""}`} />
                {isSendingTest ? "Sending Test Email…" : "Dispatch Test Email"}
              </Button>
              <span className="text-xs text-muted-foreground">
                The test dispatch will automatically appear in your Dispatch Log above.
              </span>
            </div>

            {testResponse && (
              <div
                className={`rounded-2xl border p-4 text-xs space-y-2 mt-4 ${
                  testResponse.ok
                    ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                    : "border-rose-500/40 bg-rose-500/5 text-rose-600 dark:text-rose-400"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {testResponse.ok ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Test Email Successfully Dispatched
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-500" /> Test Email Dispatch Failed
                    </>
                  )}
                </div>
                <pre className="p-3 rounded-xl bg-background/80 border border-border/50 text-[11px] font-mono whitespace-pre-wrap break-all text-foreground">
                  {JSON.stringify(testResponse, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
// code:4ce0
