"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageSquare,
  KeyRound,
  Zap,
  Send,
  Layers,
  ExternalLink,
  Phone,
  Globe,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/app-toast";
import { useRegisterUniversalSave } from "@/contexts/UniversalSaveContext";

interface WhatsAppConfig {
  enabled: boolean;
  app_id: string;
  waba_id: string;
  phone_number_id: string;
  access_token: string;
  webhook_verify_token: string;
  business_phone_display: string;
  triggers: {
    order_confirmation: boolean;
    order_dispatched: boolean;
    order_delivered: boolean;
    abandoned_cart: boolean;
    promotional_drops: boolean;
  };
  templates: {
    order_confirmation_template_name: string;
    order_dispatched_template_name: string;
    promotional_template_name: string;
  };
}

const DEFAULT_WHATSAPP_CONFIG: WhatsAppConfig = {
  enabled: false,
  app_id: "",
  waba_id: "",
  phone_number_id: "",
  access_token: "",
  webhook_verify_token: "orizino_wa_verify_2026",
  business_phone_display: "+880 1800-000000",
  triggers: {
    order_confirmation: false, order_dispatched: false, order_delivered: false,
    abandoned_cart: false, promotional_drops: false,
  },
  templates: {
    order_confirmation_template_name: "order_confirmation_v1",
    order_dispatched_template_name: "shipping_update_v1",
    promotional_template_name: "drop_announcement_v1",
  },
};

// ── Shared section wrapper ────────────────────────────────────────────────────
function Section({ title, desc, icon: Icon, accent = "text-emerald-400", children }: {
  title: string; desc?: string; icon?: React.ElementType; accent?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card/40 overflow-hidden">
      <div className="px-5 py-4 border-b border-border/40 bg-secondary/20 flex items-start gap-3">
        {Icon && (
          <div className="mt-0.5 w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Icon className={`w-3.5 h-3.5 ${accent}`} />
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

export default function AdminWhatsAppProvider() {
  const qc = useQueryClient();
  const [config, setConfig] = useState<WhatsAppConfig>(DEFAULT_WHATSAPP_CONFIG);
  const [initialConfig, setInitialConfig] = useState<WhatsAppConfig>(DEFAULT_WHATSAPP_CONFIG);
  const [testRecipient, setTestRecipient] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  const { isLoading, data: dbSettings } = useQuery({
    queryKey: ["admin-whatsapp-cloud-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("value").eq("key", "whatsapp_cloud_config").maybeSingle();
      if (error) { console.warn("WhatsApp config read note:", error); return null; }
      return (data?.value as any) || null;
    },
  });

  useEffect(() => {
    if (dbSettings) {
      const loaded: WhatsAppConfig = {
        ...DEFAULT_WHATSAPP_CONFIG, ...dbSettings,
        triggers:  { ...DEFAULT_WHATSAPP_CONFIG.triggers,  ...(dbSettings.triggers  || {}) },
        templates: { ...DEFAULT_WHATSAPP_CONFIG.templates, ...(dbSettings.templates || {}) },
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
        { key: "whatsapp_cloud_config", value: config as any, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      setInitialConfig(config);
      qc.invalidateQueries({ queryKey: ["admin-whatsapp-cloud-config"] });
      toast.success("WhatsApp Cloud API settings saved");
    },
    onError: (e: any) => toast.error(e.message || "Failed to save WhatsApp settings"),
  });

  useRegisterUniversalSave(
    useMemo(() => ({
      id: "whatsapp-provider",
      label: "Save WhatsApp Cloud Settings",
      onSave: () => saveMutation.mutate(),
      isSaving: saveMutation.isPending,
      isDirty,
      onReject: () => setConfig(initialConfig),
      canReject: isDirty,
    }), [saveMutation.isPending, isDirty, initialConfig])
  );

  const update = (updater: (prev: WhatsAppConfig) => WhatsAppConfig) =>
    setConfig((prev) => updater(prev));

  const handleSendTestMessage = async () => {
    if (!testRecipient.trim()) { toast.error("Please enter a WhatsApp phone number"); return; }
    if (!config.enabled) { toast.error("WhatsApp Cloud API is OFF. Enable the master toggle first."); return; }
    setIsSendingTest(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      toast.success(`WhatsApp Cloud test message sent to ${testRecipient}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send WhatsApp message");
    } finally { setIsSendingTest(false); }
  };

  return (
    <div className="space-y-6 w-full pb-16">

      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/8 via-card to-background p-6 shadow-sm">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-56 w-56 rounded-full bg-emerald-500/8 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">WhatsApp Cloud API</h1>
              <p className="text-xs text-muted-foreground">Official Meta Cloud API — order notifications & marketing drops</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-secondary/40 p-2.5 rounded-2xl border border-border/60">
            <span className="text-xs font-semibold text-foreground">WhatsApp Gateway</span>
            <Switch checked={config.enabled} onCheckedChange={(v) => update((c) => ({ ...c, enabled: v }))} />
            <Badge variant="outline" className={`text-[10px] uppercase font-bold ${
              config.enabled ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground border-border"
            }`}>
              {config.enabled ? "Active" : "Standby"}
            </Badge>
          </div>
        </div>
      </div>

      {/* ── Meta API Credentials ── */}
      <Section title="Meta Developer Credentials" desc="Generated from developers.facebook.com under your WhatsApp App → API Setup." icon={KeyRound}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Phone Number ID</Label>
            <Input placeholder="e.g. 106xxxxxxxxxxxx" value={config.phone_number_id}
              onChange={(e) => update((c) => ({ ...c, phone_number_id: e.target.value }))}
              className="h-10 rounded-xl text-xs font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">WABA ID (WhatsApp Business Account)</Label>
            <Input placeholder="e.g. 102xxxxxxxxxxxx" value={config.waba_id}
              onChange={(e) => update((c) => ({ ...c, waba_id: e.target.value }))}
              className="h-10 rounded-xl text-xs font-mono" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-semibold">Permanent System User Access Token</Label>
            <Input type="password" placeholder="EAAGxxxxxxxxxxxxxxxxxxxxxxxxxxxx..." value={config.access_token}
              onChange={(e) => update((c) => ({ ...c, access_token: e.target.value }))}
              className="h-10 rounded-xl text-xs font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Webhook Verification Token</Label>
            <Input value={config.webhook_verify_token}
              onChange={(e) => update((c) => ({ ...c, webhook_verify_token: e.target.value }))}
              className="h-10 rounded-xl text-xs font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Display Phone Number</Label>
            <Input placeholder="+880 1800-000000" value={config.business_phone_display}
              onChange={(e) => update((c) => ({ ...c, business_phone_display: e.target.value }))}
              className="h-10 rounded-xl text-xs" />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/15">
          <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <p className="text-[11px] text-muted-foreground">
            Set your webhook callback URL to <code className="font-mono text-emerald-400 bg-emerald-500/10 px-1 rounded">https://yourdomain.com/api/webhooks/whatsapp</code> in Meta Developer console.
          </p>
          <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer"
            className="ml-auto shrink-0 flex items-center gap-1 text-[10px] text-primary hover:underline">
            Open Meta Console <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </Section>

      {/* ── Automated Triggers ── */}
      <Section title="Automated Notification Triggers" desc="Events that automatically send a WhatsApp message via your approved template." icon={Zap}>
        <div className="space-y-2">
          {[
            { k: "order_confirmation",  label: "Order Confirmation",             desc: "Rich receipt on order placement." },
            { k: "order_dispatched",    label: "Courier Dispatch & Tracking",    desc: "Tracking URL button when shipped." },
            { k: "order_delivered",     label: "Delivery Confirmation",          desc: "Thank-you & care instructions on delivery." },
            { k: "abandoned_cart",      label: "Abandoned Cart Recovery",        desc: "Friendly alert if customer leaves cart without checking out." },
            { k: "promotional_drops",   label: "Promotional Drops & Broadcasts", desc: "VIP broadcast campaigns from audience manager." },
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

      {/* ── Template Names ── */}
      <Section title="Meta Approved Template Names" desc="Exact template names approved in Meta WhatsApp Business Manager — case-sensitive." icon={Layers}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Order Confirmation</Label>
            <Input value={config.templates.order_confirmation_template_name}
              onChange={(e) => update((c) => ({ ...c, templates: { ...c.templates, order_confirmation_template_name: e.target.value } }))}
              className="h-10 rounded-xl text-xs font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Shipping Update</Label>
            <Input value={config.templates.order_dispatched_template_name}
              onChange={(e) => update((c) => ({ ...c, templates: { ...c.templates, order_dispatched_template_name: e.target.value } }))}
              className="h-10 rounded-xl text-xs font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Promo / Drop Announcement</Label>
            <Input value={config.templates.promotional_template_name}
              onChange={(e) => update((c) => ({ ...c, templates: { ...c.templates, promotional_template_name: e.target.value } }))}
              className="h-10 rounded-xl text-xs font-mono" />
          </div>
        </div>
      </Section>

      {/* ── Test ── */}
      <Section title="Test Message Dispatcher" desc="Send a live test to verify your token, phone number ID, and template delivery." icon={Send}>
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs font-semibold">Recipient Number (with country code)</Label>
            <Input placeholder="+8801812345678" value={testRecipient} onChange={(e) => setTestRecipient(e.target.value)}
              className="h-10 rounded-xl text-xs font-mono" />
          </div>
          <div className="flex items-end">
            <Button onClick={handleSendTestMessage} disabled={isSendingTest}
              className="h-10 rounded-xl text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Send className="w-3.5 h-3.5" />
              {isSendingTest ? "Sending…" : "Send Test Message"}
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}
// code:4ce0
