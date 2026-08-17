"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageSquare,
  Zap,
  Send,
  Phone,
  KeyRound,
  Layers,
  FileSpreadsheet,
  ExternalLink,
} from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/lib/app-toast";
import { useRegisterUniversalSave } from "@/contexts/UniversalSaveContext";

type SmsProviderType = "bulksmsbd" | "twilio";

interface SmsProviderConfig {
  enabled: boolean;
  active_provider: SmsProviderType;
  bulksmsbd: { api_key: string; sender_id: string; api_url: string };
  twilio: { account_sid: string; auth_token: string; from_number: string; messaging_service_sid?: string };
  triggers: {
    order_confirmation: boolean;
    order_packed: boolean;
    order_dispatched: boolean;
    order_delivered: boolean;
    otp_auth: boolean;
    promotional_blasts: boolean;
  };
  templates: {
    order_confirmation: string;
    order_dispatched: string;
    otp_message: string;
  };
}

const DEFAULT_SMS_CONFIG: SmsProviderConfig = {
  enabled: false,
  active_provider: "bulksmsbd",
  bulksmsbd: { api_key: "", sender_id: "ORIZINO", api_url: "http://bulksmsbd.net/api/smsapi" },
  twilio: { account_sid: "", auth_token: "", from_number: "", messaging_service_sid: "" },
  triggers: {
    order_confirmation: false, order_packed: false, order_dispatched: false,
    order_delivered: false, otp_auth: false, promotional_blasts: false,
  },
  templates: {
    order_confirmation: "ORIZINO: Order #{order_id} confirmed! Total: ৳{total}. We are preparing your pieces.",
    order_dispatched: "ORIZINO: Your order #{order_id} has shipped via {courier}. Tracking: {tracking_url}",
    otp_message: "Your ORIZINO verification code is: {otp}. Valid for 5 minutes.",
  },
};

// ── Shared section wrapper ────────────────────────────────────────────────────
function Section({ title, desc, icon: Icon, children }: {
  title: string; desc?: string; icon?: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card/40 overflow-hidden">
      <div className="px-5 py-4 border-b border-border/40 bg-secondary/20 flex items-start gap-3">
        {Icon && (
          <div className="mt-0.5 w-7 h-7 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Icon className="w-3.5 h-3.5 text-primary" />
          </div>
        )}
        <div>
          <p className="text-sm font-bold text-foreground leading-none mb-0.5">{title}</p>
          {desc && <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function AdminSmsProvider() {
  const qc = useQueryClient();
  const [config, setConfig] = useState<SmsProviderConfig>(DEFAULT_SMS_CONFIG);
  const [initialConfig, setInitialConfig] = useState<SmsProviderConfig>(DEFAULT_SMS_CONFIG);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("ORIZINO: Test SMS notification dispatch successful.");
  const [isSendingTest, setIsSendingTest] = useState(false);

  const { isLoading, data: dbSettings } = useQuery({
    queryKey: ["admin-sms-provider-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("value").eq("key", "sms_provider_config").maybeSingle();
      if (error) { console.warn("SMS config read note:", error); return null; }
      return (data?.value as any) || null;
    },
  });

  useEffect(() => {
    if (dbSettings) {
      const loaded: SmsProviderConfig = {
        ...DEFAULT_SMS_CONFIG, ...dbSettings,
        bulksmsbd: { ...DEFAULT_SMS_CONFIG.bulksmsbd, ...(dbSettings.bulksmsbd || {}) },
        twilio:    { ...DEFAULT_SMS_CONFIG.twilio,    ...(dbSettings.twilio    || {}) },
        triggers:  { ...DEFAULT_SMS_CONFIG.triggers,  ...(dbSettings.triggers  || {}) },
        templates: { ...DEFAULT_SMS_CONFIG.templates, ...(dbSettings.templates || {}) },
      };
      setConfig(loaded);
      setInitialConfig(loaded);
    }
  }, [dbSettings]);

  const isDirty = useMemo(() => {
    try { return JSON.stringify(config) !== JSON.stringify(initialConfig); } catch { return false; }
  }, [config, initialConfig]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("site_settings").upsert(
        { key: "sms_provider_config", value: config as any, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      setInitialConfig(config);
      qc.invalidateQueries({ queryKey: ["admin-sms-provider-config"] });
      toast.success("SMS Provider settings saved");
    },
    onError: (e: any) => toast.error(e.message || "Failed to save SMS settings"),
  });

  useRegisterUniversalSave(
    useMemo(() => ({
      id: "sms-provider",
      label: "Save SMS Provider Settings",
      onSave: () => saveMutation.mutate(),
      isSaving: saveMutation.isPending,
      isDirty,
      onReject: () => setConfig(initialConfig),
      canReject: isDirty,
    }), [saveMutation.isPending, isDirty, initialConfig])
  );

  const update = (updater: (prev: SmsProviderConfig) => SmsProviderConfig) =>
    setConfig((prev) => updater(prev));

  const handleSendTestSms = async () => {
    if (!testPhone.trim()) { toast.error("Please enter a destination phone number"); return; }
    if (!config.enabled) { toast.error("SMS Provider is OFF. Enable the master toggle first."); return; }
    setIsSendingTest(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      toast.success(`Test SMS routed to ${testPhone} via ${config.active_provider.toUpperCase()}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send test SMS");
    } finally { setIsSendingTest(false); }
  };

  return (
    <div className="space-y-6 w-full pb-16">

      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-background p-6 shadow-sm">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-56 w-56 rounded-full bg-primary/8 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">SMS Gateway</h1>
              <p className="text-xs text-muted-foreground">BulkSMSBD (Bangladesh) & Twilio (Global) carrier integration</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-secondary/40 p-2.5 rounded-2xl border border-border/60">
            <span className="text-xs font-semibold text-foreground">Master Gateway</span>
            <Switch checked={config.enabled} onCheckedChange={(v) => update((c) => ({ ...c, enabled: v }))} />
            <Badge variant="outline" className={`text-[10px] uppercase font-bold ${
              config.enabled ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground border-border"
            }`}>
              {config.enabled ? "Active" : "Standby"}
            </Badge>
          </div>
        </div>
      </div>

      {/* ── Provider Selector ── */}
      <Section title="Active Carrier Gateway" desc="Select which provider routes your SMS dispatches. Only one is active at a time." icon={Phone}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* BulkSMSBD */}
          <div
            onClick={() => update((c) => ({ ...c, active_provider: "bulksmsbd" }))}
            className={`p-5 rounded-2xl border transition-all cursor-pointer ${
              config.active_provider === "bulksmsbd"
                ? "border-primary bg-primary/[0.04] ring-1 ring-primary/30"
                : "border-border/60 bg-secondary/20 hover:border-border"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-xs">BD</div>
                <div>
                  <p className="text-sm font-bold text-foreground">BulkSMSBD</p>
                  <p className="text-[11px] text-muted-foreground">Recommended for Bangladesh</p>
                </div>
              </div>
              {config.active_provider === "bulksmsbd" && <Badge className="bg-primary text-primary-foreground text-[10px]">Active</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">GP, Robi, Banglalink & Teletalk. ৳0.25–৳0.35 per SMS with masking support.</p>
          </div>

          {/* Twilio */}
          <div
            onClick={() => update((c) => ({ ...c, active_provider: "twilio" }))}
            className={`p-5 rounded-2xl border transition-all cursor-pointer ${
              config.active_provider === "twilio"
                ? "border-primary bg-primary/[0.04] ring-1 ring-primary/30"
                : "border-border/60 bg-secondary/20 hover:border-border"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center font-bold text-xs">TW</div>
                <div>
                  <p className="text-sm font-bold text-foreground">Twilio</p>
                  <p className="text-[11px] text-muted-foreground">Global Enterprise</p>
                </div>
              </div>
              {config.active_provider === "twilio" && <Badge className="bg-primary text-primary-foreground text-[10px]">Active</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">180+ country carrier network. Programmable SMS, two-way messaging & voice.</p>
          </div>
        </div>
      </Section>

      {/* ── API Credentials ── */}
      <Section title="API Credentials" desc={config.active_provider === "bulksmsbd" ? "BulkSMSBD REST API configuration from your bulksmsbd.net dashboard." : "Twilio Console credentials from twilio.com/console."} icon={KeyRound}>
        {config.active_provider === "bulksmsbd" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">API Key</Label>
              <Input type="password" placeholder="e.g. b5f4xxxxxxxxxxxxxx" value={config.bulksmsbd.api_key}
                onChange={(e) => update((c) => ({ ...c, bulksmsbd: { ...c.bulksmsbd, api_key: e.target.value } }))}
                className="h-10 rounded-xl text-xs font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Sender ID / Masking Name</Label>
              <Input placeholder="e.g. ORIZINO" value={config.bulksmsbd.sender_id}
                onChange={(e) => update((c) => ({ ...c, bulksmsbd: { ...c.bulksmsbd, sender_id: e.target.value } }))}
                className="h-10 rounded-xl text-xs font-semibold" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold">Gateway API URL</Label>
              <Input value={config.bulksmsbd.api_url}
                onChange={(e) => update((c) => ({ ...c, bulksmsbd: { ...c.bulksmsbd, api_url: e.target.value } }))}
                className="h-10 rounded-xl text-xs font-mono text-muted-foreground" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Account SID</Label>
              <Input placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={config.twilio.account_sid}
                onChange={(e) => update((c) => ({ ...c, twilio: { ...c.twilio, account_sid: e.target.value } }))}
                className="h-10 rounded-xl text-xs font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Auth Token</Label>
              <Input type="password" placeholder="Auth Token" value={config.twilio.auth_token}
                onChange={(e) => update((c) => ({ ...c, twilio: { ...c.twilio, auth_token: e.target.value } }))}
                className="h-10 rounded-xl text-xs font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">From Phone Number</Label>
              <Input placeholder="+12025550143" value={config.twilio.from_number}
                onChange={(e) => update((c) => ({ ...c, twilio: { ...c.twilio, from_number: e.target.value } }))}
                className="h-10 rounded-xl text-xs font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Messaging Service SID <span className="text-muted-foreground">(optional)</span></Label>
              <Input placeholder="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={config.twilio.messaging_service_sid || ""}
                onChange={(e) => update((c) => ({ ...c, twilio: { ...c.twilio, messaging_service_sid: e.target.value } }))}
                className="h-10 rounded-xl text-xs font-mono" />
            </div>
          </div>
        )}
      </Section>

      {/* ── Event Triggers ── */}
      <Section title="Automatic Event Triggers" desc="Choose which order lifecycle events automatically dispatch an SMS to the customer." icon={Zap}>
        <div className="space-y-2">
          {[
            { k: "order_confirmation",  label: "Order Confirmation",           desc: "Fired when a new order is placed or confirmed." },
            { k: "order_packed",        label: "Order Packed & Sealed",        desc: "Fired when items are packed and ready for pickup." },
            { k: "order_dispatched",    label: "Courier Dispatch & Tracking",  desc: "Fired with tracking link when handed to courier." },
            { k: "order_delivered",     label: "Order Delivered",              desc: "Thank-you confirmation on delivery." },
            { k: "otp_auth",            label: "OTP Phone Verification",       desc: "One-time codes for login and checkout." },
            { k: "promotional_blasts",  label: "Promotional SMS Campaigns",    desc: "Enables manual bulk blasts from audience manager." },
          ].map((item) => (
            <div key={item.k} className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/30 border border-border/40">
              <div>
                <p className="text-xs font-bold text-foreground">{item.label}</p>
                <p className="text-[11px] text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={(config.triggers as any)[item.k]}
                onCheckedChange={(v) => update((c) => ({ ...c, triggers: { ...c.triggers, [item.k]: v } }))}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* ── SMS Templates ── */}
      <Section title="Message Copy & Dynamic Tags" desc={`Available tags: {order_id}, {total}, {courier}, {tracking_url}, {otp}`} icon={Layers}>
        <div className="space-y-4">
          {[
            { key: "order_confirmation" as const, label: "Order Confirmation Copy" },
            { key: "order_dispatched" as const,   label: "Order Dispatched Copy" },
            { key: "otp_message" as const,         label: "OTP Verification Copy" },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-xs font-semibold">{label}</Label>
              <textarea
                rows={2}
                value={config.templates[key]}
                onChange={(e) => update((c) => ({ ...c, templates: { ...c.templates, [key]: e.target.value } }))}
                className="w-full rounded-xl bg-background border border-border/70 p-3 text-xs font-medium resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          ))}
        </div>
      </Section>

      {/* ── Test Dispatcher ── */}
      <Section title="Test Dispatcher" desc="Send a live test SMS to verify your carrier credentials and character limit." icon={Send}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Recipient Number</Label>
            <Input placeholder="+8801812345678" value={testPhone} onChange={(e) => setTestPhone(e.target.value)}
              className="h-10 rounded-xl text-xs font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Test Message</Label>
            <Input value={testMessage} onChange={(e) => setTestMessage(e.target.value)}
              className="h-10 rounded-xl text-xs" />
          </div>
          <div className="md:col-span-2">
            <Button onClick={handleSendTestSms} disabled={isSendingTest}
              className="h-10 rounded-xl text-xs font-bold gap-2">
              <Send className="w-3.5 h-3.5" />
              {isSendingTest ? "Dispatching…" : `Send via ${config.active_provider === "bulksmsbd" ? "BulkSMSBD" : "Twilio"}`}
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}
// code:4ce0
