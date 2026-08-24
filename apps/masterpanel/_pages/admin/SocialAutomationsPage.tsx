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
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Bot,
  Sliders,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  Share2,
  Activity,
  ArrowRight,
  Settings,
  HelpCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/lib/app-toast";
import { useRegisterUniversalSave } from "@/contexts/UniversalSaveContext";
import { useSearchParams } from "next/navigation";

// Social Platform SVG Icons
const WhatsAppIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.04 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.04 7.61C8.86 7.61 8.56 7.68 8.31 7.95C8.06 8.22 7.36 8.87 7.36 10.22C7.36 11.57 8.34 12.87 8.48 13.06C8.62 13.24 10.41 15.98 13.14 17.16C15.41 18.14 15.87 17.94 16.37 17.9C16.87 17.85 17.98 17.24 18.21 16.59C18.44 15.94 18.44 15.38 18.37 15.27C18.3 15.15 18.11 15.09 17.83 14.95C17.55 14.81 16.19 14.14 15.93 14.05C15.68 13.96 15.5 13.91 15.31 14.19C15.12 14.47 14.59 15.09 14.43 15.27C14.27 15.46 14.11 15.48 13.83 15.34C13.55 15.2 12.65 14.91 11.58 13.95C10.75 13.21 10.19 12.3 10.03 12.02C9.87 11.74 10.01 11.59 10.15 11.45C10.28 11.32 10.44 11.11 10.58 10.95C10.72 10.79 10.77 10.67 10.86 10.49C10.95 10.3 10.91 10.14 10.84 10C10.77 9.87 10.21 8.5 9.98 7.95C9.75 7.42 9.53 7.49 9.36 7.48C9.21 7.48 9.04 7.61 9.04 7.61Z" />
  </svg>
);

const FacebookIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const InstagramIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const TikTokIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 2.89 3.5 2.76 1.25-.04 2.45-.73 3.03-1.84.4-.73.57-1.57.56-2.41V.02h-.82z" />
  </svg>
);

export interface SocialAutomationsConfig {
  whatsapp: {
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
  };
  facebook: {
    enabled: boolean;
    page_id: string;
    page_access_token: string;
    app_secret: string;
    webhook_verify_token: string;
    ai_concierge_enabled: boolean;
    welcome_greeting_enabled: boolean;
    welcome_message: string;
    order_lookup_enabled: boolean;
  };
  instagram: {
    enabled: boolean;
    business_account_id: string;
    access_token: string;
    webhook_verify_token: string;
    ai_concierge_enabled: boolean;
    story_mention_reply_enabled: boolean;
    story_mention_reply_text: string;
    catalog_inquiry_auto_reply: boolean;
  };
  tiktok: {
    enabled: boolean;
    app_id: string;
    app_secret: string;
    shop_cipher: string;
    webhook_verify_token: string;
    auto_reply_dm: boolean;
    order_status_sync: boolean;
    welcome_message: string;
  };
  global_rules: {
    ai_agent_handoff: boolean;
    business_hours_only: boolean;
    human_escalation_keywords: string;
    rate_limit_per_user: number;
  };
}

const DEFAULT_SOCIAL_CONFIG: SocialAutomationsConfig = {
  whatsapp: {
    enabled: false,
    app_id: "",
    waba_id: "",
    phone_number_id: "",
    access_token: "",
    webhook_verify_token: "orizino_wa_verify_2026",
    business_phone_display: "+880 1603-327099",
    triggers: {
      order_confirmation: true,
      order_dispatched: true,
      order_delivered: true,
      abandoned_cart: false,
      promotional_drops: false,
    },
    templates: {
      order_confirmation_template_name: "order_confirmation_v1",
      order_dispatched_template_name: "shipping_update_v1",
      promotional_template_name: "drop_announcement_v1",
    },
  },
  facebook: {
    enabled: false,
    page_id: "",
    page_access_token: "",
    app_secret: "",
    webhook_verify_token: "orizino_fb_verify_2026",
    ai_concierge_enabled: true,
    welcome_greeting_enabled: true,
    welcome_message: "Hello! Welcome to Orizino Official. How can our concierge team assist you with sizing, orders or drops today?",
    order_lookup_enabled: true,
  },
  instagram: {
    enabled: false,
    business_account_id: "",
    access_token: "",
    webhook_verify_token: "orizino_ig_verify_2026",
    ai_concierge_enabled: true,
    story_mention_reply_enabled: true,
    story_mention_reply_text: "Thank you for tagging Orizino! Here is an exclusive voucher code for our latest limited collection: ORIZINO10",
    catalog_inquiry_auto_reply: true,
  },
  tiktok: {
    enabled: false,
    app_id: "",
    app_secret: "",
    shop_cipher: "",
    webhook_verify_token: "orizino_tt_verify_2026",
    auto_reply_dm: true,
    order_status_sync: true,
    welcome_message: "Welcome to Orizino TikTok Shop! Tap our latest drop showcase to explore official drop-shoulder heavyweights.",
  },
  global_rules: {
    ai_agent_handoff: true,
    business_hours_only: false,
    human_escalation_keywords: "human, agent, manager, complaint, talk to person, refund issue",
    rate_limit_per_user: 30,
  },
};

export default function SocialAutomationsPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [config, setConfig] = useState<SocialAutomationsConfig>(DEFAULT_SOCIAL_CONFIG);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (searchParams?.get("tab")) {
      setActiveTab(searchParams.get("tab")!);
    }
  }, [searchParams]);

  // Load from site_settings
  const { data: dbSettings, isLoading } = useQuery({
    queryKey: ["social-automations-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["social_automations_config", "whatsapp_config"]);

      const res: Partial<SocialAutomationsConfig> = {};
      data?.forEach((row) => {
        if (row.key === "social_automations_config" && row.value) {
          const val = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
          Object.assign(res, val);
        } else if (row.key === "whatsapp_config" && row.value && !res.whatsapp) {
          const val = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
          res.whatsapp = val;
        }
      });
      return res;
    },
  });

  useEffect(() => {
    if (dbSettings) {
      setConfig((prev) => ({
        ...prev,
        ...dbSettings,
        whatsapp: { ...prev.whatsapp, ...(dbSettings.whatsapp || {}) },
        facebook: { ...prev.facebook, ...(dbSettings.facebook || {}) },
        instagram: { ...prev.instagram, ...(dbSettings.instagram || {}) },
        tiktok: { ...prev.tiktok, ...(dbSettings.tiktok || {}) },
        global_rules: { ...prev.global_rules, ...(dbSettings.global_rules || {}) },
      }));
    }
  }, [dbSettings]);

  // Mutation to save
  const saveMutation = useMutation({
    mutationFn: async (updated: SocialAutomationsConfig) => {
      const { error: err1 } = await supabase.from("site_settings").upsert({
        key: "social_automations_config",
        value: updated,
        updated_at: new Date().toISOString(),
      });
      if (err1) throw err1;

      // Sync whatsapp_config key for backward compatibility
      await supabase.from("site_settings").upsert({
        key: "whatsapp_config",
        value: updated.whatsapp,
        updated_at: new Date().toISOString(),
      });

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-automations-config"] });
      toast.success("Social & Chat Automations successfully saved!");
    },
    onError: (err: any) => {
      toast.error(`Failed to save configuration: ${err.message}`);
    },
  });

  useRegisterUniversalSave(
    async () => {
      await saveMutation.mutateAsync(config);
    },
    [config],
    "Save Social Automations"
  );

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getWebhookUrl = (channel: string) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/api/webhooks/${channel}`;
    }
    return `https://orizino.com/api/webhooks/${channel}`;
  };

  const activeCount = useMemo(() => {
    let c = 0;
    if (config.whatsapp.enabled) c++;
    if (config.facebook.enabled) c++;
    if (config.instagram.enabled) c++;
    if (config.tiktok.enabled) c++;
    return c;
  }, [config]);

  return (
    <div className="space-y-6 w-full pb-16 animate-in fade-in duration-300">
      {/* ━━━ HERO COMMAND HEADER ━━━ */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-secondary/15 to-background p-6 sm:p-8 shadow-sm">
        <div className="absolute right-0 top-0 -mr-20 -mt-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/25 px-2.5 py-1 rounded-full shadow-xs">
                <MessageSquare className="w-3 h-3 text-primary animate-pulse" />
                Multi-Channel Automations
              </span>
              <Badge variant="outline" className="text-[10px] font-mono border-border/60 text-muted-foreground bg-secondary/30">
                {activeCount} of 4 Channels Active
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Chat &amp; Social Automations
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Integrate, synchronize and orchestrate official customer chat automations across WhatsApp Cloud API, Facebook Messenger, Instagram Direct, and TikTok Shop from a single control center.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              onClick={() => saveMutation.mutate(config)}
              disabled={saveMutation.isPending}
              className="h-10 px-5 rounded-xl font-bold gap-2 text-xs shadow-sm shadow-primary/25"
            >
              <Zap className="w-4 h-4" /> Save All Integrations
            </Button>
          </div>
        </div>
      </div>

      {/* ━━━ PLATFORM STATUS STRIP ━━━ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* WhatsApp Card */}
        <Card
          onClick={() => setActiveTab("whatsapp")}
          className={`cursor-pointer border-border/60 bg-card/60 backdrop-blur-sm shadow-xs hover:border-emerald-500/50 hover:shadow-sm transition-all rounded-2xl overflow-hidden ${
            activeTab === "whatsapp" ? "ring-2 ring-emerald-500/30 border-emerald-500/60" : ""
          }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <WhatsAppIcon className="w-4 h-4 text-emerald-500" />
                <p className="text-xs font-bold text-foreground">WhatsApp Cloud</p>
              </div>
              <p className="text-[11px] font-medium text-muted-foreground">
                {config.whatsapp.enabled ? "Live Dispatches" : "Disconnected"}
              </p>
              <p className={`text-[10px] font-bold ${config.whatsapp.enabled ? "text-emerald-400" : "text-muted-foreground"}`}>
                ● {config.whatsapp.enabled ? "Active" : "Disabled"}
              </p>
            </div>
            <Switch
              checked={config.whatsapp.enabled}
              onCheckedChange={(val) =>
                setConfig((prev) => ({
                  ...prev,
                  whatsapp: { ...prev.whatsapp, enabled: val },
                }))
              }
              onClick={(e) => e.stopPropagation()}
            />
          </CardContent>
        </Card>

        {/* Facebook Page Card */}
        <Card
          onClick={() => setActiveTab("facebook")}
          className={`cursor-pointer border-border/60 bg-card/60 backdrop-blur-sm shadow-xs hover:border-blue-500/50 hover:shadow-sm transition-all rounded-2xl overflow-hidden ${
            activeTab === "facebook" ? "ring-2 ring-blue-500/30 border-blue-500/60" : ""
          }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <FacebookIcon className="w-4 h-4 text-blue-500" />
                <p className="text-xs font-bold text-foreground">Facebook Page</p>
              </div>
              <p className="text-[11px] font-medium text-muted-foreground">
                {config.facebook.enabled ? "Messenger Bot" : "Disconnected"}
              </p>
              <p className={`text-[10px] font-bold ${config.facebook.enabled ? "text-blue-400" : "text-muted-foreground"}`}>
                ● {config.facebook.enabled ? "Active" : "Disabled"}
              </p>
            </div>
            <Switch
              checked={config.facebook.enabled}
              onCheckedChange={(val) =>
                setConfig((prev) => ({
                  ...prev,
                  facebook: { ...prev.facebook, enabled: val },
                }))
              }
              onClick={(e) => e.stopPropagation()}
            />
          </CardContent>
        </Card>

        {/* Instagram DM Card */}
        <Card
          onClick={() => setActiveTab("instagram")}
          className={`cursor-pointer border-border/60 bg-card/60 backdrop-blur-sm shadow-xs hover:border-pink-500/50 hover:shadow-sm transition-all rounded-2xl overflow-hidden ${
            activeTab === "instagram" ? "ring-2 ring-pink-500/30 border-pink-500/60" : ""
          }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <InstagramIcon className="w-4 h-4 text-pink-500" />
                <p className="text-xs font-bold text-foreground">Instagram Direct</p>
              </div>
              <p className="text-[11px] font-medium text-muted-foreground">
                {config.instagram.enabled ? "Story & DM Bot" : "Disconnected"}
              </p>
              <p className={`text-[10px] font-bold ${config.instagram.enabled ? "text-pink-400" : "text-muted-foreground"}`}>
                ● {config.instagram.enabled ? "Active" : "Disabled"}
              </p>
            </div>
            <Switch
              checked={config.instagram.enabled}
              onCheckedChange={(val) =>
                setConfig((prev) => ({
                  ...prev,
                  instagram: { ...prev.instagram, enabled: val },
                }))
              }
              onClick={(e) => e.stopPropagation()}
            />
          </CardContent>
        </Card>

        {/* TikTok Shop Card */}
        <Card
          onClick={() => setActiveTab("tiktok")}
          className={`cursor-pointer border-border/60 bg-card/60 backdrop-blur-sm shadow-xs hover:border-cyan-500/50 hover:shadow-sm transition-all rounded-2xl overflow-hidden ${
            activeTab === "tiktok" ? "ring-2 ring-cyan-500/30 border-cyan-500/60" : ""
          }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <TikTokIcon className="w-4 h-4 text-cyan-400" />
                <p className="text-xs font-bold text-foreground">TikTok Direct</p>
              </div>
              <p className="text-[11px] font-medium text-muted-foreground">
                {config.tiktok.enabled ? "Shop Messaging" : "Disconnected"}
              </p>
              <p className={`text-[10px] font-bold ${config.tiktok.enabled ? "text-cyan-400" : "text-muted-foreground"}`}>
                ● {config.tiktok.enabled ? "Active" : "Disabled"}
              </p>
            </div>
            <Switch
              checked={config.tiktok.enabled}
              onCheckedChange={(val) =>
                setConfig((prev) => ({
                  ...prev,
                  tiktok: { ...prev.tiktok, enabled: val },
                }))
              }
              onClick={(e) => e.stopPropagation()}
            />
          </CardContent>
        </Card>
      </div>

      {/* ━━━ MAIN TABS WORKSPACE ━━━ */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        

        {/* ─── TAB 1: OVERVIEW ─── */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* WhatsApp Integration Card */}
            <Card className="border-border/60 bg-card/70 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
              <CardHeader className="p-5 border-b border-border/40 bg-secondary/15 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
                    <WhatsAppIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">WhatsApp Cloud API</CardTitle>
                    <CardDescription className="text-xs">Official Meta Cloud API gateway</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] ${config.whatsapp.enabled ? "text-emerald-400 border-emerald-500/30" : "text-muted-foreground"}`}>
                  {config.whatsapp.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </CardHeader>
              <CardContent className="p-5 space-y-3 text-xs">
                <p className="text-muted-foreground leading-relaxed">
                  Automated order status triggers, delivery OTPs, and luxury customer support on the official Meta WhatsApp Cloud API.
                </p>
                <div className="p-3 rounded-xl bg-secondary/20 border border-border/40 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone ID:</span>
                    <span className="text-foreground">{config.whatsapp.phone_number_id ? `${config.whatsapp.phone_number_id.slice(0, 6)}...` : "Not Configured"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Display Number:</span>
                    <span className="text-foreground">{config.whatsapp.business_phone_display || "+880 1603-327099"}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("whatsapp")} className="w-full text-xs font-bold gap-1.5 rounded-xl border-border/70">
                  Configure WhatsApp Credentials <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </CardContent>
            </Card>

            {/* Facebook Messenger Card */}
            <Card className="border-border/60 bg-card/70 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
              <CardHeader className="p-5 border-b border-border/40 bg-secondary/15 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center">
                    <FacebookIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">Facebook Page (Messenger)</CardTitle>
                    <CardDescription className="text-xs">Meta Messenger API &amp; Webhook</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] ${config.facebook.enabled ? "text-blue-400 border-blue-500/30" : "text-muted-foreground"}`}>
                  {config.facebook.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </CardHeader>
              <CardContent className="p-5 space-y-3 text-xs">
                <p className="text-muted-foreground leading-relaxed">
                  24/7 AI Shopper Concierge, welcome greetings, automated order lookup, and customer resolution directly inside Facebook Messenger.
                </p>
                <div className="p-3 rounded-xl bg-secondary/20 border border-border/40 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Page ID:</span>
                    <span className="text-foreground">{config.facebook.page_id || "Not Configured"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AI Concierge:</span>
                    <span className={config.facebook.ai_concierge_enabled ? "text-emerald-400" : "text-muted-foreground"}>
                      {config.facebook.ai_concierge_enabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("facebook")} className="w-full text-xs font-bold gap-1.5 rounded-xl border-border/70">
                  Configure Facebook Credentials <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </CardContent>
            </Card>

            {/* Instagram Direct Card */}
            <Card className="border-border/60 bg-card/70 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
              <CardHeader className="p-5 border-b border-border/40 bg-secondary/15 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-500 border border-pink-500/20 flex items-center justify-center">
                    <InstagramIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">Instagram Direct (DM Automation)</CardTitle>
                    <CardDescription className="text-xs">Story mention &amp; keyword responder</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] ${config.instagram.enabled ? "text-pink-400 border-pink-500/30" : "text-muted-foreground"}`}>
                  {config.instagram.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </CardHeader>
              <CardContent className="p-5 space-y-3 text-xs">
                <p className="text-muted-foreground leading-relaxed">
                  Automatic story mention thank-you vouchers, instant keyword triggers for product pricing and catalog link dispatches.
                </p>
                <div className="p-3 rounded-xl bg-secondary/20 border border-border/40 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account ID:</span>
                    <span className="text-foreground">{config.instagram.business_account_id || "Not Configured"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Story Auto-Reply:</span>
                    <span className={config.instagram.story_mention_reply_enabled ? "text-pink-400" : "text-muted-foreground"}>
                      {config.instagram.story_mention_reply_enabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("instagram")} className="w-full text-xs font-bold gap-1.5 rounded-xl border-border/70">
                  Configure Instagram Credentials <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </CardContent>
            </Card>

            {/* TikTok Shop Card */}
            <Card className="border-border/60 bg-card/70 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
              <CardHeader className="p-5 border-b border-border/40 bg-secondary/15 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                    <TikTokIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">TikTok Shop &amp; Direct</CardTitle>
                    <CardDescription className="text-xs">TikTok Shop Open API messaging</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] ${config.tiktok.enabled ? "text-cyan-400 border-cyan-500/30" : "text-muted-foreground"}`}>
                  {config.tiktok.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </CardHeader>
              <CardContent className="p-5 space-y-3 text-xs">
                <p className="text-muted-foreground leading-relaxed">
                  Direct message automation for TikTok video leads, TikTok Shop order inquiry routing, and creator collaboration prompts.
                </p>
                <div className="p-3 rounded-xl bg-secondary/20 border border-border/40 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">App Key:</span>
                    <span className="text-foreground">{config.tiktok.app_id || "Not Configured"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order Sync:</span>
                    <span className={config.tiktok.order_status_sync ? "text-cyan-400" : "text-muted-foreground"}>
                      {config.tiktok.order_status_sync ? "Active" : "Disabled"}
                    </span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("tiktok")} className="w-full text-xs font-bold gap-1.5 rounded-xl border-border/70">
                  Configure TikTok Credentials <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── TAB 2: WHATSAPP CLOUD API ─── */}
        <TabsContent value="whatsapp" className="space-y-6">
          <Card className="border-border/60 bg-card/70 backdrop-blur-sm rounded-2xl shadow-sm overflow-hidden">
            <CardHeader className="p-5 border-b border-border/40 bg-secondary/15">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <WhatsAppIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">WhatsApp Cloud API Configuration</CardTitle>
                    <CardDescription className="text-xs">Configure Meta Developer credentials and message templates.</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="wa_toggle" className="text-xs font-bold text-muted-foreground">Enable WhatsApp</Label>
                  <Switch
                    id="wa_toggle"
                    checked={config.whatsapp.enabled}
                    onCheckedChange={(val) =>
                      setConfig((prev) => ({
                        ...prev,
                        whatsapp: { ...prev.whatsapp, enabled: val },
                      }))
                    }
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-foreground">Phone Number ID</Label>
                  <Input
                    value={config.whatsapp.phone_number_id}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        whatsapp: { ...prev.whatsapp, phone_number_id: e.target.value },
                      }))
                    }
                    placeholder="e.g. 109283746592019"
                    className="rounded-xl h-10 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-foreground">WABA (WhatsApp Business Account) ID</Label>
                  <Input
                    value={config.whatsapp.waba_id}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        whatsapp: { ...prev.whatsapp, waba_id: e.target.value },
                      }))
                    }
                    placeholder="e.g. 293847561029384"
                    className="rounded-xl h-10 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-foreground">Meta App ID</Label>
                  <Input
                    value={config.whatsapp.app_id}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        whatsapp: { ...prev.whatsapp, app_id: e.target.value },
                      }))
                    }
                    placeholder="e.g. 582910482910394"
                    className="rounded-xl h-10 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-foreground">Display Business Phone</Label>
                  <Input
                    value={config.whatsapp.business_phone_display}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        whatsapp: { ...prev.whatsapp, business_phone_display: e.target.value },
                      }))
                    }
                    placeholder="+880 1603-327099"
                    className="rounded-xl h-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-foreground">Permanent System User Access Token</Label>
                <Input
                  type="password"
                  value={config.whatsapp.access_token}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      whatsapp: { ...prev.whatsapp, access_token: e.target.value },
                    }))
                  }
                  placeholder="EAAG..."
                  className="rounded-xl h-10 font-mono"
                />
              </div>

              {/* Webhook Endpoint Strip */}
              <div className="p-4 rounded-2xl bg-secondary/20 border border-border/50 space-y-2">
                <Label className="font-bold text-foreground flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-primary" /> Meta Webhook Callback URL
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={getWebhookUrl("whatsapp")}
                    className="rounded-xl h-9 bg-background/60 font-mono text-[11px]"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(getWebhookUrl("whatsapp"), "wa_url")}
                    className="h-9 px-3 rounded-xl gap-1 shrink-0"
                  >
                    {copiedKey === "wa_url" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy
                  </Button>
                </div>
              </div>

              {/* Automated Triggers */}
              <div className="space-y-3">
                <Label className="font-bold text-sm text-foreground">Automated Notification Triggers</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: "order_confirmation", label: "Order Placed & Confirmed" },
                    { key: "order_dispatched", label: "Order Dispatched with Tracking" },
                    { key: "order_delivered", label: "Order Delivered Notification" },
                    { key: "abandoned_cart", label: "Abandoned Cart Recovery Reminder" },
                    { key: "promotional_drops", label: "Limited Collection Drop Alert" },
                  ].map((trig) => (
                    <div
                      key={trig.key}
                      className="p-3 rounded-xl border border-border/40 bg-secondary/15 flex items-center justify-between"
                    >
                      <span className="font-medium text-foreground text-xs">{trig.label}</span>
                      <Switch
                        checked={(config.whatsapp.triggers as any)[trig.key] || false}
                        onCheckedChange={(val) =>
                          setConfig((prev) => ({
                            ...prev,
                            whatsapp: {
                              ...prev.whatsapp,
                              triggers: { ...prev.whatsapp.triggers, [trig.key]: val },
                            },
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: FACEBOOK PAGE (MESSENGER) ─── */}
        <TabsContent value="facebook" className="space-y-6">
          <Card className="border-border/60 bg-card/70 backdrop-blur-sm rounded-2xl shadow-sm overflow-hidden">
            <CardHeader className="p-5 border-b border-border/40 bg-secondary/15">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <FacebookIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">Facebook Messenger API</CardTitle>
                    <CardDescription className="text-xs">Connect your official Facebook Page for 24/7 AI Shopper support.</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="fb_toggle" className="text-xs font-bold text-muted-foreground">Enable Messenger</Label>
                  <Switch
                    id="fb_toggle"
                    checked={config.facebook.enabled}
                    onCheckedChange={(val) =>
                      setConfig((prev) => ({
                        ...prev,
                        facebook: { ...prev.facebook, enabled: val },
                      }))
                    }
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-foreground">Facebook Page ID</Label>
                  <Input
                    value={config.facebook.page_id}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        facebook: { ...prev.facebook, page_id: e.target.value },
                      }))
                    }
                    placeholder="e.g. 102938475610293"
                    className="rounded-xl h-10 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-foreground">App Secret</Label>
                  <Input
                    type="password"
                    value={config.facebook.app_secret}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        facebook: { ...prev.facebook, app_secret: e.target.value },
                      }))
                    }
                    placeholder="Meta App Secret"
                    className="rounded-xl h-10 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-foreground">Page Access Token (Long-Lived)</Label>
                <Input
                  type="password"
                  value={config.facebook.page_access_token}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      facebook: { ...prev.facebook, page_access_token: e.target.value },
                    }))
                  }
                  placeholder="EAAG..."
                  className="rounded-xl h-10 font-mono"
                />
              </div>

              <div className="p-4 rounded-2xl bg-secondary/20 border border-border/50 space-y-2">
                <Label className="font-bold text-foreground flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-primary" /> Messenger Webhook Callback URL
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={getWebhookUrl("facebook")}
                    className="rounded-xl h-9 bg-background/60 font-mono text-[11px]"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(getWebhookUrl("facebook"), "fb_url")}
                    className="h-9 px-3 rounded-xl gap-1 shrink-0"
                  >
                    {copiedKey === "fb_url" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/15 border border-border/40">
                  <div>
                    <p className="font-bold text-foreground">Autonomous AI Concierge for Messenger</p>
                    <p className="text-[11px] text-muted-foreground">Allows Gemini AI to reply directly to sizing and collection inquiries.</p>
                  </div>
                  <Switch
                    checked={config.facebook.ai_concierge_enabled}
                    onCheckedChange={(val) =>
                      setConfig((prev) => ({
                        ...prev,
                        facebook: { ...prev.facebook, ai_concierge_enabled: val },
                      }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-foreground">Welcome Greeting Text</Label>
                  <Textarea
                    value={config.facebook.welcome_message}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        facebook: { ...prev.facebook, welcome_message: e.target.value },
                      }))
                    }
                    rows={2}
                    className="rounded-xl resize-none text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 4: INSTAGRAM DIRECT ─── */}
        <TabsContent value="instagram" className="space-y-6">
          <Card className="border-border/60 bg-card/70 backdrop-blur-sm rounded-2xl shadow-sm overflow-hidden">
            <CardHeader className="p-5 border-b border-border/40 bg-secondary/15">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center">
                    <InstagramIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">Instagram Direct &amp; Story Automations</CardTitle>
                    <CardDescription className="text-xs">Automate DM replies and story mentions via Meta Graph API.</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="ig_toggle" className="text-xs font-bold text-muted-foreground">Enable Instagram</Label>
                  <Switch
                    id="ig_toggle"
                    checked={config.instagram.enabled}
                    onCheckedChange={(val) =>
                      setConfig((prev) => ({
                        ...prev,
                        instagram: { ...prev.instagram, enabled: val },
                      }))
                    }
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6 text-xs">
              <div className="space-y-1.5">
                <Label className="font-semibold text-foreground">Instagram Business Account ID</Label>
                <Input
                  value={config.instagram.business_account_id}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      instagram: { ...prev.instagram, business_account_id: e.target.value },
                    }))
                  }
                  placeholder="e.g. 178414058291039"
                  className="rounded-xl h-10 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-foreground">Graph API Access Token</Label>
                <Input
                  type="password"
                  value={config.instagram.access_token}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      instagram: { ...prev.instagram, access_token: e.target.value },
                    }))
                  }
                  placeholder="EAAG..."
                  className="rounded-xl h-10 font-mono"
                />
              </div>

              <div className="p-4 rounded-2xl bg-secondary/20 border border-border/50 space-y-2">
                <Label className="font-bold text-foreground flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-primary" /> Instagram Webhook Callback URL
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={getWebhookUrl("instagram")}
                    className="rounded-xl h-9 bg-background/60 font-mono text-[11px]"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(getWebhookUrl("instagram"), "ig_url")}
                    className="h-9 px-3 rounded-xl gap-1 shrink-0"
                  >
                    {copiedKey === "ig_url" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/15 border border-border/40">
                  <div>
                    <p className="font-bold text-foreground">Story Mention Auto-Responder</p>
                    <p className="text-[11px] text-muted-foreground">Instantly sends a DM whenever someone tags @orizino in their IG Story.</p>
                  </div>
                  <Switch
                    checked={config.instagram.story_mention_reply_enabled}
                    onCheckedChange={(val) =>
                      setConfig((prev) => ({
                        ...prev,
                        instagram: { ...prev.instagram, story_mention_reply_enabled: val },
                      }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-foreground">Story Reply Voucher Message</Label>
                  <Textarea
                    value={config.instagram.story_mention_reply_text}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        instagram: { ...prev.instagram, story_mention_reply_text: e.target.value },
                      }))
                    }
                    rows={2}
                    className="rounded-xl resize-none text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 5: TIKTOK SHOP & DIRECT ─── */}
        <TabsContent value="tiktok" className="space-y-6">
          <Card className="border-border/60 bg-card/70 backdrop-blur-sm rounded-2xl shadow-sm overflow-hidden">
            <CardHeader className="p-5 border-b border-border/40 bg-secondary/15">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                    <TikTokIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">TikTok Shop &amp; Direct Messaging</CardTitle>
                    <CardDescription className="text-xs">Sync TikTok Shop orders and customer inquiries directly.</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="tt_toggle" className="text-xs font-bold text-muted-foreground">Enable TikTok</Label>
                  <Switch
                    id="tt_toggle"
                    checked={config.tiktok.enabled}
                    onCheckedChange={(val) =>
                      setConfig((prev) => ({
                        ...prev,
                        tiktok: { ...prev.tiktok, enabled: val },
                      }))
                    }
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-foreground">TikTok App Key</Label>
                  <Input
                    value={config.tiktok.app_id}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        tiktok: { ...prev.tiktok, app_id: e.target.value },
                      }))
                    }
                    placeholder="e.g. 6a7b8c..."
                    className="rounded-xl h-10 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-foreground">TikTok App Secret</Label>
                  <Input
                    type="password"
                    value={config.tiktok.app_secret}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        tiktok: { ...prev.tiktok, app_secret: e.target.value },
                      }))
                    }
                    placeholder="App Secret"
                    className="rounded-xl h-10 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-foreground">Shop Cipher / Authorized Shop ID</Label>
                <Input
                  value={config.tiktok.shop_cipher}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      tiktok: { ...prev.tiktok, shop_cipher: e.target.value },
                    }))
                  }
                  placeholder="e.g. GBR_SHOP_1029384"
                  className="rounded-xl h-10 font-mono"
                />
              </div>

              <div className="p-4 rounded-2xl bg-secondary/20 border border-border/50 space-y-2">
                <Label className="font-bold text-foreground flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-primary" /> TikTok Webhook Callback URL
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={getWebhookUrl("tiktok")}
                    className="rounded-xl h-9 bg-background/60 font-mono text-[11px]"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(getWebhookUrl("tiktok"), "tt_url")}
                    className="h-9 px-3 rounded-xl gap-1 shrink-0"
                  >
                    {copiedKey === "tt_url" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-foreground">TikTok DM Greeting Text</Label>
                <Textarea
                  value={config.tiktok.welcome_message}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      tiktok: { ...prev.tiktok, welcome_message: e.target.value },
                    }))
                  }
                  rows={2}
                  className="rounded-xl resize-none text-xs"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 6: GLOBAL AI RULES ─── */}
        <TabsContent value="rules" className="space-y-6">
          <Card className="border-border/60 bg-card/70 backdrop-blur-sm rounded-2xl shadow-sm overflow-hidden">
            <CardHeader className="p-5 border-b border-border/40 bg-secondary/15">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Bot className="w-4 h-4 text-amber-400" /> Multi-Channel Automation Rules
              </CardTitle>
              <CardDescription className="text-xs">Set global orchestration policies across WhatsApp, Facebook, Instagram &amp; TikTok.</CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/15 border border-border/40">
                <div>
                  <p className="font-bold text-foreground">Master AI Concierge Auto-Responder</p>
                  <p className="text-[11px] text-muted-foreground">Gemini 2.5 autonomously answers questions about fabrics, GSM weight, and drop dates across all connected channels.</p>
                </div>
                <Switch
                  checked={config.global_rules.ai_agent_handoff}
                  onCheckedChange={(val) =>
                    setConfig((prev) => ({
                      ...prev,
                      global_rules: { ...prev.global_rules, ai_agent_handoff: val },
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-foreground">Human Escalation Trigger Keywords</Label>
                <Input
                  value={config.global_rules.human_escalation_keywords}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      global_rules: { ...prev.global_rules, human_escalation_keywords: e.target.value },
                    }))
                  }
                  placeholder="human, agent, refund, manager, complaint"
                  className="rounded-xl h-10"
                />
                <p className="text-[10px] text-muted-foreground">Comma-separated words that instantly notify staff in MasterPanel Support inbox.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-foreground">Max Messages Per Session (Rate Limit)</Label>
                <Input
                  type="number"
                  value={config.global_rules.rate_limit_per_user}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      global_rules: { ...prev.global_rules, rate_limit_per_user: Number(e.target.value) || 30 },
                    }))
                  }
                  className="rounded-xl h-10 max-w-[140px]"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
