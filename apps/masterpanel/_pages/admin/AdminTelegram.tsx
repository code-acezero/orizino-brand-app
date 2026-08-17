"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useServerFn } from "@/lib/server-fn-compat";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/lib/app-toast";
import {
  Send,
  RefreshCw,
  Loader2,
  Bot,
  MessageSquare,
  Radio,
  Sliders,
  Shield,
  Zap,
  Trash2,
  ExternalLink,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Copy,
  Terminal,
  Activity,
  Users,
  Bell,
  PhoneCall,
  ShoppingBag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRegisterUniversalSave } from "@/contexts/UniversalSaveContext";
import {
  listTelegramChats,
  syncTelegramChats,
  updateTelegramChat,
  deleteTelegramChat,
  sendTelegramTest,
  broadcastTelegramMessage,
  getTelegramBotInfo,
  getTelegramWebhookInfo,
  setTelegramWebhook,
  simulateBotCommand,
} from "@/lib/telegram.functions";
import { defaultTelegramBotConfig, type TelegramBotConfig } from "@/lib/telegram.types";

type Chat = {
  chat_id: number;
  title: string | null;
  type: string | null;
  username: string | null;
  notify_orders: boolean;
  notify_support: boolean;
  notify_calls: boolean;
  last_message_at: string | null;
};

export default function AdminTelegram() {
  const qc = useQueryClient();
  const listFn = useServerFn(listTelegramChats);
  const syncFn = useServerFn(syncTelegramChats);
  const updateFn = useServerFn(updateTelegramChat);
  const deleteFn = useServerFn(deleteTelegramChat);
  const testFn = useServerFn(sendTelegramTest);
  const broadcastFn = useServerFn(broadcastTelegramMessage);
  const botInfoFn = useServerFn(getTelegramBotInfo);
  const webhookInfoFn = useServerFn(getTelegramWebhookInfo);
  const setWebhookFn = useServerFn(setTelegramWebhook);
  const simulateFn = useServerFn(simulateBotCommand);

  const [activeTab, setActiveTab] = useState<"chats" | "config" | "commands" | "broadcast">("chats");

  // Config State
  const [config, setConfig] = useState<TelegramBotConfig>(defaultTelegramBotConfig);
  const [savedConfig, setSavedConfig] = useState<TelegramBotConfig>(defaultTelegramBotConfig);
  const [showToken, setShowToken] = useState(false);

  // Broadcast State
  const [broadcastText, setBroadcastText] = useState("📣 <b>Notice:</b> Luxury New Arrivals are now live at ORIZINO!");
  const [broadcastTarget, setBroadcastTarget] = useState<"all" | "orders_team" | "support_team">("all");
  const [broadcastWithButtons, setBroadcastWithButtons] = useState(true);

  // Simulator State
  const [simCommand, setSimCommand] = useState("/start");
  const [simMessages, setSimMessages] = useState<Array<{ sender: "user" | "bot"; text: string; buttons?: any[] }>>([
    { sender: "user", text: "/start" },
    {
      sender: "bot",
      text: defaultTelegramBotConfig.welcome_text,
      buttons: defaultTelegramBotConfig.interactive_buttons,
    },
  ]);
  const [isSimulating, setIsSimulating] = useState(false);

  // Search in Chats Tab
  const [chatSearch, setChatSearch] = useState("");

  // ── Load Config from site_settings ──────────────────────────────────────────
  const { data: rawConfig } = useQuery({
    queryKey: ["telegram-bot-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "telegram_bot_config")
        .maybeSingle();
      const raw = data?.value as any;
      if (!raw) return null;
      return (typeof raw === "object" && "value" in raw && typeof raw.value === "object" ? raw.value : raw) as TelegramBotConfig;
    },
  });

  useEffect(() => {
    if (rawConfig) {
      const merged = { ...defaultTelegramBotConfig, ...rawConfig };
      setConfig(merged);
      setSavedConfig(merged);
    }
  }, [rawConfig]);

  // ── Load Chats ──────────────────────────────────────────────────────────────
  const { data: chatsData, isLoading: isChatsLoading } = useQuery({
    queryKey: ["telegram-chats"],
    queryFn: () => listFn(),
    refetchInterval: 20000,
  });

  const chats: Chat[] = (chatsData?.chats ?? []) as Chat[];

  // ── Load Bot Live Info ───────────────────────────────────────────────────────
  const { data: botInfo, refetch: refetchBotInfo, isFetching: isBotInfoLoading } = useQuery({
    queryKey: ["telegram-bot-info", config.use_direct_api, config.bot_token],
    queryFn: () => botInfoFn(),
    staleTime: 60000,
  });

  // ── Load Webhook Info ───────────────────────────────────────────────────────
  const { data: webhookInfo, refetch: refetchWebhookInfo, isFetching: isWebhookLoading } = useQuery({
    queryKey: ["telegram-webhook-info", config.use_direct_api, config.bot_token],
    queryFn: () => webhookInfoFn(),
    staleTime: 60000,
  });

  // ── Mutations ───────────────────────────────────────────────────────────────
  const syncMut = useMutation({
    mutationFn: () => syncFn(),
    onSuccess: (r: any) => {
      toast.success(`Synced Telegram chats: ${r?.upserted || 0} updated`);
      qc.invalidateQueries({ queryKey: ["telegram-chats"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to sync Telegram chats"),
  });

  const toggleMut = useMutation({
    mutationFn: (vars: { chat_id: number; field: keyof Chat; value: boolean }) =>
      updateFn({ data: { chat_id: vars.chat_id, [vars.field]: vars.value } as any }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["telegram-chats"] }),
    onError: (e: any) => toast.error(e.message || "Failed to update chat setting"),
  });

  const deleteChatMut = useMutation({
    mutationFn: (chat_id: number) => deleteFn({ data: { chat_id } }),
    onSuccess: () => {
      toast.success("Chat removed");
      qc.invalidateQueries({ queryKey: ["telegram-chats"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to remove chat"),
  });

  const testMut = useMutation({
    mutationFn: (chat_id: number) => testFn({ data: { chat_id, include_buttons: true } }),
    onSuccess: () => toast.success("Test message dispatched to Telegram chat"),
    onError: (e: any) => toast.error(e.message || "Failed to send test message"),
  });

  const broadcastMut = useMutation({
    mutationFn: () =>
      broadcastFn({
        data: {
          text: broadcastText,
          target_group: broadcastTarget,
          include_buttons: broadcastWithButtons,
        },
      }),
    onSuccess: (r: any) => {
      toast.success(`Broadcast sent: ${r.sent} delivered, ${r.failed} failed`);
    },
    onError: (e: any) => toast.error(e.message || "Broadcast failed"),
  });

  const setWebhookMut = useMutation({
    mutationFn: (url: string) => setWebhookFn({ data: { url } }),
    onSuccess: () => {
      toast.success("Telegram Webhook updated");
      refetchWebhookInfo();
    },
    onError: (e: any) => toast.error(e.message || "Failed to update webhook"),
  });

  // Save Settings Mutation
  const saveConfigMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "telegram_bot_config", value: config as any, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      setSavedConfig({ ...config });
      qc.invalidateQueries({ queryKey: ["telegram-bot-config"] });
      refetchBotInfo();
      refetchWebhookInfo();
      toast.success("Telegram Bot configuration saved");
    },
    onError: (e: any) => toast.error(e.message || "Failed to save configuration"),
  });

  // ── Universal Save Registration ─────────────────────────────────────────────
  const isDirty = useMemo(() => {
    return JSON.stringify(config) !== JSON.stringify(savedConfig);
  }, [config, savedConfig]);

  useRegisterUniversalSave({
    id: "telegram-bot-settings",
    label: "Save Telegram Bot",
    isDirty,
    isSaving: saveConfigMut.isPending,
    onSave: () => saveConfigMut.mutate(),
  });

  // ── Bot Simulator Runner ────────────────────────────────────────────────────
  const runSimulation = async (cmd: string) => {
    if (!cmd.trim()) return;
    setSimMessages((prev) => [...prev, { sender: "user", text: cmd }]);
    setSimCommand("");
    setIsSimulating(true);

    try {
      const res: any = await simulateFn({ data: { command: cmd } });
      setSimMessages((prev) => [
        ...prev,
        { sender: "bot", text: res.reply || "No response", buttons: res.buttons },
      ]);
    } catch (e: any) {
      setSimMessages((prev) => [
        ...prev,
        { sender: "bot", text: `⚠️ Error: ${e.message || "Could not execute command"}` },
      ]);
    } finally {
      setIsSimulating(false);
    }
  };

  // ── Filtered Chats ──────────────────────────────────────────────────────────
  const filteredChats = useMemo(() => {
    if (!chatSearch.trim()) return chats;
    const q = chatSearch.toLowerCase();
    return chats.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.username?.toLowerCase().includes(q) ||
        String(c.chat_id).includes(q) ||
        c.type?.toLowerCase().includes(q)
    );
  }, [chats, chatSearch]);

  const botDetails = botInfo?.bot;
  const isBotActive = botInfo?.ok && botDetails?.username;

  return (
    <div className="space-y-6 w-full pb-16">

      {/* ── HERO BANNER ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-secondary/15 to-background p-6 sm:p-8 shadow-sm">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
                <Bot className="w-3 h-3 text-primary" />
                Telegram Bot Studio
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-mono ${
                  isBotActive ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-amber-400 border-amber-500/30 bg-amber-500/10"
                }`}
              >
                {isBotActive ? `● @${botDetails.username} Online` : "● Bot Offline / Token Required"}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              Telegram Automation &amp; Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Real-time order dispatches, concierge support alerts, interactive customer self-service commands, and broadcast announcements.
            </p>
          </div>

          {/* Quick Action Header Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchBotInfo()}
              disabled={isBotInfoLoading}
              className="h-9 rounded-xl text-xs gap-1.5 border-border/60"
            >
              {isBotInfoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5 text-primary" />}
              Ping Bot
            </Button>

            <Button
              onClick={() => syncMut.mutate()}
              disabled={syncMut.isPending}
              size="sm"
              className="h-9 rounded-xl text-xs gap-1.5 font-bold shadow-xs"
            >
              {syncMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Sync Telegram Chats
            </Button>
          </div>
        </div>
      </div>

      {/* ── KPI METRICS RIBBON ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Connected Chats",  value: chats.length,                                      icon: Users,        color: "text-foreground" },
          { label: "Order Alert Hubs", value: chats.filter((c) => c.notify_orders).length,       icon: ShoppingBag,  color: "text-emerald-400" },
          { label: "Support Desks",    value: chats.filter((c) => c.notify_support).length,      icon: MessageSquare,color: "text-blue-400" },
          { label: "Voice Call Alerts",value: chats.filter((c) => c.notify_calls).length,        icon: PhoneCall,    color: "text-amber-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-border/50 bg-card/40 p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{label}</span>
              <Icon className={`w-3.5 h-3.5 ${color}`} />
            </div>
            <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* ── MAIN TABS ────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full bg-secondary/35 p-1 rounded-2xl h-11 border border-border/40">
          <TabsTrigger value="chats" className="w-full text-xs rounded-xl py-2 gap-1.5 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Users className="w-3.5 h-3.5" /> Connected Chats ({chats.length})
          </TabsTrigger>
          <TabsTrigger value="config" className="w-full text-xs rounded-xl py-2 gap-1.5 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Sliders className="w-3.5 h-3.5" /> Bot Settings &amp; API
          </TabsTrigger>
          <TabsTrigger value="commands" className="w-full text-xs rounded-xl py-2 gap-1.5 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Terminal className="w-3.5 h-3.5" /> Commands &amp; Simulator
          </TabsTrigger>
          <TabsTrigger value="broadcast" className="w-full text-xs rounded-xl py-2 gap-1.5 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Send className="w-3.5 h-3.5" /> Broadcast Studio
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: CONNECTED CHATS ─────────────────────────────────────────── */}
        <TabsContent value="chats" className="space-y-4">
          <div className="rounded-3xl border border-border/60 bg-card/30 p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search chats by title, username or ID…"
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  className="h-9 rounded-xl pl-9 text-xs bg-background border-border/70"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                To link a new group or channel, add your bot to it and type <code>/start</code>, then click <b>Sync Telegram Chats</b>.
              </p>
            </div>

            {isChatsLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground">Loading Telegram channels…</div>
            ) : filteredChats.length === 0 ? (
              <div className="py-16 text-center space-y-2 border border-dashed border-border/60 rounded-2xl">
                <Bot className="w-8 h-8 mx-auto text-muted-foreground/30" />
                <p className="text-sm font-semibold text-foreground">No Telegram chats registered yet</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Send a message to your Telegram bot or invite it to a staff group, then click <b>Sync Telegram Chats</b>.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredChats.map((c) => (
                  <div
                    key={c.chat_id}
                    className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-card/50 border border-border/50 hover:border-border/80 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                        {c.type === "channel" ? <Radio className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground truncate">
                            {c.title || `Chat ${c.chat_id}`}
                          </span>
                          <Badge variant="outline" className="text-[9px] uppercase tracking-wider text-muted-foreground">
                            {c.type || "chat"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          ID: {c.chat_id} {c.username ? `· @${c.username}` : ""}
                        </p>
                      </div>
                    </div>

                    {/* Routing Flags Matrix */}
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-4 bg-secondary/30 px-3.5 py-2 rounded-xl border border-border/50">
                        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                          <Switch
                            checked={Boolean(c.notify_orders)}
                            onCheckedChange={(v) => toggleMut.mutate({ chat_id: c.chat_id, field: "notify_orders", value: v })}
                          />
                          <span className="text-emerald-400">Orders</span>
                        </label>

                        <div className="w-px h-4 bg-border/60" />

                        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                          <Switch
                            checked={Boolean(c.notify_support)}
                            onCheckedChange={(v) => toggleMut.mutate({ chat_id: c.chat_id, field: "notify_support", value: v })}
                          />
                          <span className="text-blue-400">Support</span>
                        </label>

                        <div className="w-px h-4 bg-border/60" />

                        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                          <Switch
                            checked={Boolean(c.notify_calls)}
                            onCheckedChange={(v) => toggleMut.mutate({ chat_id: c.chat_id, field: "notify_calls", value: v })}
                          />
                          <span className="text-amber-400">Calls</span>
                        </label>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => testMut.mutate(c.chat_id)}
                          disabled={testMut.isPending}
                          className="h-8 rounded-xl text-xs gap-1 border-border/60"
                        >
                          <Send className="w-3 h-3 text-primary" /> Test
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteChatMut.mutate(c.chat_id)}
                          disabled={deleteChatMut.isPending}
                          className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-destructive"
                          title="Disconnect Chat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── TAB 2: BOT SETTINGS & API CREDENTIALS ──────────────────────────── */}
        <TabsContent value="config" className="space-y-4">
          <div className="rounded-3xl border border-border/60 bg-card/30 p-5 sm:p-6 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Telegram Bot API Credentials
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure your custom BotFather token to enable direct API communication and custom branding.
              </p>
            </div>

            {/* Direct Token vs Gateway */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-border/60 bg-secondary/15">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">Direct Telegram Bot API</span>
                <span className="text-[11px] text-muted-foreground block">
                  Use your own dedicated BotFather token directly with api.telegram.org.
                </span>
              </div>
              <Switch
                checked={config.use_direct_api}
                onCheckedChange={(v) => setConfig((c) => ({ ...c, use_direct_api: v }))}
              />
            </div>

            {/* Bot Token Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Bot Token (from @BotFather)</Label>
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1"
                >
                  {showToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showToken ? "Hide Token" : "Show Token"}
                </button>
              </div>
              <Input
                type={showToken ? "text" : "password"}
                placeholder="1234567890:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                value={config.bot_token || ""}
                onChange={(e) => setConfig((c) => ({ ...c, bot_token: e.target.value }))}
                className="h-10 rounded-xl text-xs font-mono bg-background border-border/70"
              />
              <p className="text-[11px] text-muted-foreground">
                Get a bot token by talking to{" "}
                <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold">
                  @BotFather
                </a>{" "}
                on Telegram.
              </p>
            </div>

            {/* Webhook Configuration & Diagnostics */}
            <div className="pt-4 border-t border-border/50 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-blue-400" /> Webhook Integration
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Optional: Register an HTTPS endpoint to receive instant webhook pushes instead of polling.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  placeholder="https://your-domain.com/api/public/hooks/telegram"
                  value={config.webhook_url || ""}
                  onChange={(e) => setConfig((c) => ({ ...c, webhook_url: e.target.value }))}
                  className="h-10 rounded-xl text-xs font-mono bg-background border-border/70 flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const origin = typeof window !== "undefined" ? window.location.origin : "https://admin.orizino.com";
                    setConfig((c) => ({ ...c, webhook_url: `${origin}/api/public/hooks/telegram` }));
                  }}
                  className="h-10 rounded-xl text-xs font-semibold px-3 border border-border/60"
                  title="Auto-fill webhook URL using this panel's domain"
                >
                  Use Default
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setWebhookMut.mutate(config.webhook_url || "")}
                  disabled={setWebhookMut.isPending}
                  className="h-10 rounded-xl text-xs font-semibold px-4 border-border/60"
                >
                  {setWebhookMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Set Webhook"}
                </Button>
                {config.webhook_url && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setConfig((c) => ({ ...c, webhook_url: "" }));
                      setWebhookMut.mutate("");
                    }}
                    className="h-10 rounded-xl text-xs text-destructive hover:bg-destructive/10"
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* Webhook Diagnostic Card */}
              {webhookInfo?.webhook && (
                <div className="p-3.5 rounded-2xl bg-secondary/20 border border-border/50 text-xs font-mono space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Webhook Status:</span>
                    <span className={webhookInfo.webhook.url ? "text-emerald-400 font-bold" : "text-amber-400"}>
                      {webhookInfo.webhook.url ? "Active Webhook Registered" : "Long-Polling Mode"}
                    </span>
                  </div>
                  {webhookInfo.webhook.url && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Registered URL:</span>
                      <span className="truncate max-w-xs text-foreground">{webhookInfo.webhook.url}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Pending Updates:</span>
                    <span className="text-foreground">{webhookInfo.webhook.pending_update_count ?? 0}</span>
                  </div>
                  {webhookInfo.webhook.last_error_message && (
                    <div className="text-[11px] text-destructive pt-1">
                      Last Error: {webhookInfo.webhook.last_error_message}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quiet Hours Policy */}
            <div className="pt-4 border-t border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Quiet Hours Policy</h4>
                  <p className="text-[11px] text-muted-foreground">Mute non-critical store notifications during off-hours.</p>
                </div>
                <Switch
                  checked={config.quiet_hours_enabled}
                  onCheckedChange={(v) => setConfig((c) => ({ ...c, quiet_hours_enabled: v }))}
                />
              </div>

              {config.quiet_hours_enabled && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <Label className="text-xs">Start Time (24h)</Label>
                    <Input
                      type="time"
                      value={config.quiet_hours_start}
                      onChange={(e) => setConfig((c) => ({ ...c, quiet_hours_start: e.target.value }))}
                      className="rounded-xl mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">End Time (24h)</Label>
                    <Input
                      type="time"
                      value={config.quiet_hours_end}
                      onChange={(e) => setConfig((c) => ({ ...c, quiet_hours_end: e.target.value }))}
                      className="rounded-xl mt-1 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 3: COMMANDS & BOT SIMULATOR ────────────────────────────────── */}
        <TabsContent value="commands" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Message Templates & Buttons (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Welcome Message Template */}
              <div className="rounded-3xl border border-border/60 bg-card/30 p-5 space-y-3">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-primary" /> /start Welcome Greeting Template (HTML)
                </Label>
                <textarea
                  rows={4}
                  value={config.welcome_text}
                  onChange={(e) => setConfig((c) => ({ ...c, welcome_text: e.target.value }))}
                  className="w-full rounded-2xl border border-border/70 bg-background p-3 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <p className="text-[10px] text-muted-foreground">Supports HTML formatting: &lt;b&gt;, &lt;i&gt;, &lt;code&gt;, &lt;a href="..."&gt;.</p>
              </div>

              {/* Interactive Buttons Config */}
              <div className="rounded-3xl border border-border/60 bg-card/30 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">Interactive Inline Keyboard Buttons</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setConfig((c) => ({
                        ...c,
                        interactive_buttons: [...c.interactive_buttons, { label: "New Button", url: "https://orizino.com" }],
                      }))
                    }
                    className="h-7 rounded-xl text-[11px] gap-1 px-2.5 border-border/60"
                  >
                    <Plus className="w-3 h-3" /> Add Button
                  </Button>
                </div>

                <div className="space-y-2">
                  {config.interactive_buttons.map((btn, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-secondary/20 p-2 rounded-xl border border-border/40">
                      <Input
                        placeholder="Button Title (e.g. 🛍 Shop)"
                        value={btn.label}
                        onChange={(e) => {
                          const arr = [...config.interactive_buttons];
                          arr[idx].label = e.target.value;
                          setConfig((c) => ({ ...c, interactive_buttons: arr }));
                        }}
                        className="h-8 rounded-lg text-xs bg-background flex-1"
                      />
                      <Input
                        placeholder="URL (https://…)"
                        value={btn.url || ""}
                        onChange={(e) => {
                          const arr = [...config.interactive_buttons];
                          arr[idx].url = e.target.value;
                          setConfig((c) => ({ ...c, interactive_buttons: arr }));
                        }}
                        className="h-8 rounded-lg text-xs bg-background flex-1 font-mono text-[11px]"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const arr = config.interactive_buttons.filter((_, i) => i !== idx);
                          setConfig((c) => ({ ...c, interactive_buttons: arr }));
                        }}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Notification Template */}
              <div className="rounded-3xl border border-border/60 bg-card/30 p-5 space-y-3">
                <Label className="text-xs font-bold text-foreground">Order Dispatch Message Template</Label>
                <textarea
                  rows={5}
                  value={config.order_template}
                  onChange={(e) => setConfig((c) => ({ ...c, order_template: e.target.value }))}
                  className="w-full rounded-2xl border border-border/70 bg-background p-3 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <p className="text-[10px] text-muted-foreground font-mono">
                  Available tags: &#123;&#123;order_id&#125;&#125;, &#123;&#123;customer_name&#125;&#125;, &#123;&#123;customer_phone&#125;&#125;, &#123;&#123;total_amount&#125;&#125;, &#123;&#123;items_list&#125;&#125;, &#123;&#123;shipping_address&#125;&#125;
                </p>
              </div>
            </div>

            {/* Right: Live Interactive Bot Simulator (5 cols) */}
            <div className="lg:col-span-5 rounded-3xl border border-border/60 bg-[#17212b] p-4 text-white flex flex-col justify-between shadow-xl min-h-[480px]">
              {/* Telegram App Header Bar */}
              <div className="flex items-center gap-3 pb-3 border-b border-[#232e3c]">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                  OZ
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">ORIZINO Luxury Bot</h4>
                  <p className="text-[10px] text-emerald-400">bot · online</p>
                </div>
              </div>

              {/* Messages Flow Area */}
              <div className="flex-1 py-4 space-y-3 overflow-y-auto max-h-[380px] text-xs">
                {simMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-[#2b5278] text-white rounded-br-xs"
                          : "bg-[#182533] text-gray-100 border border-[#243447] rounded-bl-xs"
                      }`}
                      dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, "<br/>") }}
                    />

                    {/* Render Interactive Buttons in Telegram Style */}
                    {msg.buttons && msg.buttons.length > 0 && (
                      <div className="mt-1.5 space-y-1 w-[85%]">
                        {msg.buttons.map((b: any, bi: number) => (
                          <div
                            key={bi}
                            className="bg-[#243447] hover:bg-[#2c3e53] text-primary text-center py-1.5 px-3 rounded-xl text-[11px] font-semibold cursor-pointer border border-[#30445c] transition-colors"
                          >
                            {b.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {isSimulating && (
                  <div className="text-[10px] text-gray-400 italic">typing…</div>
                )}
              </div>

              {/* Interactive Input Bar */}
              <div className="pt-3 border-t border-[#232e3c] flex items-center gap-2">
                <Input
                  placeholder="Type /start, /order, /status…"
                  value={simCommand}
                  onChange={(e) => setSimCommand(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") runSimulation(simCommand);
                  }}
                  className="h-9 rounded-xl bg-[#242f3d] border-[#2f3d4e] text-white text-xs placeholder:text-gray-500"
                />
                <Button
                  size="sm"
                  onClick={() => runSimulation(simCommand)}
                  disabled={isSimulating || !simCommand.trim()}
                  className="h-9 rounded-xl px-3 bg-primary text-primary-foreground font-bold text-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 4: BROADCAST STUDIO ────────────────────────────────────────── */}
        <TabsContent value="broadcast" className="space-y-4">
          <div className="rounded-3xl border border-border/60 bg-card/30 p-5 sm:p-6 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" /> Broadcast Announcement
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dispatch rich notifications and announcements instantly to your linked Telegram staff channels and community groups.
              </p>
            </div>

            {/* Target Audience Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Target Audience</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { key: "all",          label: "All Linked Chats",    desc: `Dispatches to all ${chats.length} registered chats.` },
                  { key: "orders_team",  label: "Orders Team Only",    desc: "Dispatches only to channels with Order Alerts enabled." },
                  { key: "support_team", label: "Support Desk Only",   desc: "Dispatches only to channels with Support Alerts enabled." },
                ].map(({ key, label, desc }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setBroadcastTarget(key as any)}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      broadcastTarget === key
                        ? "border-primary bg-primary/8 shadow-xs"
                        : "border-border/60 bg-secondary/15 hover:bg-secondary/30"
                    }`}
                  >
                    <span className="text-xs font-bold text-foreground block mb-0.5">{label}</span>
                    <span className="text-[11px] text-muted-foreground leading-tight block">{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Message Body */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Message Content (HTML Allowed)</Label>
              <textarea
                rows={5}
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                className="w-full rounded-2xl border border-border/70 bg-background p-3.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>

            {/* Include Buttons Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-border/60 bg-secondary/15">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">Attach Store Quick-Links</span>
                <span className="text-[11px] text-muted-foreground block">
                  Includes configured interactive buttons below the announcement.
                </span>
              </div>
              <Switch
                checked={broadcastWithButtons}
                onCheckedChange={(v) => setBroadcastWithButtons(v)}
              />
            </div>

            {/* Dispatch Action */}
            <Button
              onClick={() => broadcastMut.mutate()}
              disabled={broadcastMut.isPending || !broadcastText.trim()}
              className="h-10 rounded-xl w-full sm:w-auto font-bold gap-2 text-xs"
            >
              {broadcastMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Broadcast Now
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
