"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  Bell,
  Phone,
  Radio,
  Server,
  Check,
  X,
  Loader2,
  Send,
  Search,
  Wifi,
  Terminal,
  RefreshCw,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  ArrowUpRight,
  Smartphone,
  Laptop,
  Globe,
  Sliders,
  Trash2,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTabParam } from "@/hooks/use-tab-param";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { EDGE_FUNCTION_PROBES, runProbe, type PingResult } from "@/lib/edge-function-probes";

const EDGE_FUNCTIONS = EDGE_FUNCTION_PROBES.map((p) => p.name);

export default function AdminDebug() {
  const [tab, setTab] = useTabParam("push", "/system/debug");

  /* ── 1. Push tools ─────────────────────────────────────────────── */
  const [targetUserId, setTargetUserId] = useState("");
  const [pushTitle, setPushTitle] = useState("🔔 Orizino Test Push");
  const [pushBody, setPushBody] = useState("Live push notification dispatched from the Developer Diagnostics Console.");
  const [pushType, setPushType] = useState<"general" | "call" | "order" | "promo">("general");
  const [pushUrl, setPushUrl] = useState("/support");
  const [pushBusy, setPushBusy] = useState(false);

  const { data: pushSubs = [], refetch: refetchSubs, isLoading: subsLoading } = useQuery({
    queryKey: ["debug-push-subs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("push_subscriptions")
        .select("id, user_id, endpoint, user_agent, last_used_at, created_at")
        .order("last_used_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const sendTestPush = async () => {
    if (!targetUserId) return toast.error("Please enter or select a target user_id (UUID)");
    setPushBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-push", {
        body: {
          user_id: targetUserId,
          payload: {
            type: pushType,
            title: pushTitle,
            body: pushBody,
            url: pushUrl || "/support",
            tag: `debug-${Date.now()}`,
          },
        },
      });
      if (error) throw error;
      const sent = (data as any)?.sent ?? 0;
      if (sent > 0) {
        toast.success(`Successfully dispatched push to ${sent} active device(s)`);
      } else {
        toast.error("No active push subscriptions found for this user_id.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to dispatch test push notification");
    } finally {
      setPushBusy(false);
    }
  };

  /* ── Service worker status ──────────────────────────────────── */
  const [swState, setSwState] = useState<{
    scope?: string;
    active?: boolean;
    perm?: NotificationPermission | "unsupported";
  }>({});

  useEffect(() => {
    (async () => {
      const perm = typeof Notification === "undefined" ? "unsupported" : Notification.permission;
      if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
        return setSwState({ perm });
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        setSwState({ scope: reg?.scope, active: !!reg?.active, perm });
      } catch {
        setSwState({ perm });
      }
    })();
  }, []);

  /* ── 2. Call Signaling & STUN/TURN ──────────────────────────── */
  const [iceBusy, setIceBusy] = useState(false);
  const [iceServersResult, setIceServersResult] = useState<any>(null);
  const [callerName, setCallerName] = useState("Orizino Concierge Support");

  const probeIceServers = async () => {
    setIceBusy(true);
    try {
      const startTime = performance.now();
      const { data, error } = await supabase.functions.invoke("get-ice-servers", { body: {} });
      const latency = Math.round(performance.now() - startTime);
      if (error) throw error;
      setIceServersResult({ ...data, latency });
      toast.success(`ICE servers resolved successfully in ${latency}ms`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to reach get-ice-servers edge function");
    } finally {
      setIceBusy(false);
    }
  };

  const simulateIncomingCall = async () => {
    if (!targetUserId) return toast.error("Please enter a target user_id");
    setPushBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-push", {
        body: {
          user_id: targetUserId,
          payload: {
            type: "call",
            title: `Incoming Call from ${callerName}`,
            body: "Tap to answer live video/audio consultation",
            url: "/support",
            tag: "incoming-support-call",
          },
        },
      });
      if (error) throw error;
      const sent = (data as any)?.sent ?? 0;
      if (sent > 0) {
        toast.success(`Dispatched high-urgency call ring to ${sent} device(s)`);
      } else {
        toast.error("User has no registered push subscriptions");
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to ring user");
    } finally {
      setPushBusy(false);
    }
  };

  /* ── 3. Edge function pings ────────────────────────────────── */
  const [pingStatus, setPingStatus] = useState<
    Record<string, PingResult & { latency?: number }>
  >({});
  const [pingSearch, setPingSearch] = useState("");
  const [isPingingAll, setIsPingingAll] = useState(false);

  const ping = async (name: string) => {
    const probe = EDGE_FUNCTION_PROBES.find((p) => p.name === name);
    if (!probe) return;
    setPingStatus((s) => ({ ...s, [name]: { state: "pending" } }));
    const startTime = performance.now();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const result = await runProbe(probe, {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
      accessToken: session?.access_token,
    });
    const latency = Math.round(performance.now() - startTime);
    setPingStatus((s) => ({ ...s, [name]: { ...result, latency } }));
  };

  const pingAllFunctions = async () => {
    setIsPingingAll(true);
    for (const name of EDGE_FUNCTIONS) {
      await ping(name);
    }
    setIsPingingAll(false);
    toast.success("Completed probe check for all Edge Functions.");
  };

  /* ── 4. Realtime channel inspector ─────────────────────────── */
  const [channelName, setChannelName] = useState("system-vitals");
  const [broadcastEvent, setBroadcastEvent] = useState("DIAGNOSTIC_PING");
  const [broadcastPayload, setBroadcastPayload] = useState('{\n  "message": "Hello from Masterpanel Debug"\n}');
  const [channelMessages, setChannelMessages] = useState<
    Array<{ at: string; event: string; payload: any }>
  >([]);
  const [channelActive, setChannelActive] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (channelActive) {
        supabase
          .getChannels()
          .forEach(
            (c) => c.topic.includes(channelActive) && supabase.removeChannel(c)
          );
      }
    };
  }, [channelActive]);

  const subscribeChannel = (targetName?: string) => {
    const name = targetName || channelName;
    if (!name) return;
    if (channelActive) {
      supabase
        .getChannels()
        .forEach(
          (c) => c.topic.includes(channelActive) && supabase.removeChannel(c)
        );
    }
    setChannelMessages([]);
    const ch = supabase.channel(name);
    ch.on("broadcast", { event: "*" }, ({ event, payload }) => {
      setChannelMessages((m) =>
        [{ at: new Date().toISOString(), event, payload }, ...m].slice(0, 50)
      );
    });
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setChannelActive(name);
        toast.success(`Subscribed to Realtime channel: ${name}`);
      }
    });
  };

  const sendBroadcast = async () => {
    if (!channelActive) return toast.error("Please subscribe to a channel first");
    try {
      let parsed = {};
      try {
        parsed = JSON.parse(broadcastPayload);
      } catch {
        return toast.error("Invalid JSON payload");
      }
      const ch = supabase.channel(channelActive);
      await ch.send({
        type: "broadcast",
        event: broadcastEvent || "DEBUG_EVENT",
        payload: { ...parsed, sent_at: new Date().toISOString() },
      });
      toast.success(`Broadcasted event [${broadcastEvent}]`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to broadcast");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const filteredEdgeFunctions = useMemo(() => {
    return EDGE_FUNCTIONS.filter((n) =>
      n.toLowerCase().includes(pingSearch.toLowerCase())
    );
  }, [pingSearch]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 animate-fade-in text-foreground">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs shrink-0">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-foreground">
                Developer Diagnostics &amp; Network Debug
              </h1>
              <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 bg-primary/10 text-primary border-primary/30">
                PRO v3.2
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Simulate Web Push payloads, WebRTC signaling, probe Supabase Edge Functions &amp; inspect Realtime WebSocket events
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB 1: WEB PUSH DIAGNOSTICS (push)
      ══════════════════════════════════════════════════════════════════ */}
      {tab === "push" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Test Push Dispatch Form (2 Columns) */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Send className="w-4 h-4 text-primary" />
                      Dispatch Test Web Push Notification
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Sends encrypted VAPID web push payloads to verified user subscriptions
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    VAPID Protocol
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Target User ID (UUID)</label>
                    <Input
                      placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                      value={targetUserId}
                      onChange={(e) => setTargetUserId(e.target.value)}
                      className="h-9 font-mono text-xs rounded-xl bg-background border-border/60"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Click any registered subscription below to auto-populate.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Notification Urgency</label>
                    <select
                      value={pushType}
                      onChange={(e) => setPushType(e.target.value as any)}
                      className="w-full h-9 px-3 rounded-xl border border-border/60 bg-background text-xs text-foreground"
                    >
                      <option value="general">General Notice (Normal Priority)</option>
                      <option value="call">Call Ring (High Urgency Audio Ring)</option>
                      <option value="order">Order Tracking Update</option>
                      <option value="promo">Promotional Flash Notice</option>
                    </select>
                    <p className="text-[10px] text-muted-foreground">
                      Urgent types trigger vibration and persistent sound.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Notification Title</label>
                    <Input
                      value={pushTitle}
                      onChange={(e) => setPushTitle(e.target.value)}
                      className="h-9 text-xs rounded-xl bg-background border-border/60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Deep-Link Target URL</label>
                    <Input
                      placeholder="/support or /orders"
                      value={pushUrl}
                      onChange={(e) => setPushUrl(e.target.value)}
                      className="h-9 text-xs rounded-xl bg-background border-border/60"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="font-semibold text-foreground">Notification Body</label>
                    <Input
                      value={pushBody}
                      onChange={(e) => setPushBody(e.target.value)}
                      className="h-9 text-xs rounded-xl bg-background border-border/60"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-border/40">
                  <div className="text-[11px] text-muted-foreground">
                    Endpoint: <span className="font-mono text-primary">/functions/v1/send-push</span>
                  </div>
                  <Button
                    onClick={sendTestPush}
                    disabled={pushBusy || !targetUserId}
                    className="h-9 px-4 text-xs font-semibold gap-1.5 rounded-xl shadow-xs"
                  >
                    {pushBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Dispatch Push
                  </Button>
                </div>
              </Card>
            </div>

            {/* Right: Service Worker & Local Browser Diagnostics */}
            <div className="space-y-4">
              <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-emerald-500" />
                    Local Browser State
                  </h3>
                  <Badge variant="outline" className="text-[10px]">Client Vitals</Badge>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Notification Permission:</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          swState.perm === "granted"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                        }`}
                      >
                        {swState.perm || "Checking..."}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Service Worker Active:</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          swState.active
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {swState.active ? "Registered (/sw.js)" : "Inactive"}
                      </Badge>
                    </div>
                    {swState.scope && (
                      <p className="text-[10px] font-mono text-muted-foreground truncate">
                        Scope: {swState.scope}
                      </p>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 space-y-1">
                    <span className="text-muted-foreground">Registered Devices:</span>
                    <p className="text-base font-bold font-display text-foreground">
                      {pushSubs.length} Active Subscriptions
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Device Subscriptions Table */}
          <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 overflow-hidden">
            <CardHeader className="p-5 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    Verified Device Subscriptions ({pushSubs.length})
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Active web push endpoints registered in the PostgreSQL <code>push_subscriptions</code> table
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchSubs()}
                  className="h-8 px-2.5 text-xs gap-1.5 rounded-xl border-border/60"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <div className="divide-y divide-border/40">
                {subsLoading && <div className="p-8 text-center text-xs text-muted-foreground">Loading subscriptions...</div>}
                {!subsLoading && pushSubs.length === 0 && (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No web push subscriptions registered yet.
                  </div>
                )}
                {pushSubs.map((s: any) => {
                  const isSelected = targetUserId === s.user_id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        setTargetUserId(s.user_id);
                        toast.success(`Selected user_id: ${s.user_id}`);
                      }}
                      className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                        isSelected ? "bg-primary/5 border-l-4 border-l-primary" : "hover:bg-secondary/30"
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-foreground truncate">{s.user_id}</span>
                          <Badge variant="outline" className="text-[9px] font-mono">
                            {s.user_agent?.includes("Mobile") ? "Mobile Device" : "Desktop"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate max-w-xl">
                          {s.user_agent || "Standard Web Browser"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-[11px] text-muted-foreground font-mono">
                        <span>Last used {formatDistanceToNow(new Date(s.last_used_at || s.created_at), { addSuffix: true })}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(s.user_id);
                          }}
                          className="h-7 px-2 text-[10px] rounded-lg gap-1 border-border/60"
                        >
                          <Copy className="w-3 h-3" /> Copy UUID
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 2: CALL SIGNALING & WEBRTC (calls)
      ══════════════════════════════════════════════════════════════════ */}
      {tab === "calls" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Simulate Call Ring Card */}
            <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-500" />
                    Simulate Incoming Call Ring
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Dispatches high-urgency WebRTC signaling payload to ring the user device
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  WebRTC Voip
                </Badge>
              </div>

              <div className="space-y-3 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Target User UUID</label>
                  <Input
                    placeholder="user_id (uuid)"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="h-9 font-mono text-xs rounded-xl bg-background border-border/60"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Caller Display Name</label>
                  <Input
                    value={callerName}
                    onChange={(e) => setCallerName(e.target.value)}
                    className="h-9 text-xs rounded-xl bg-background border-border/60"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  disabled={!targetUserId || pushBusy}
                  onClick={simulateIncomingCall}
                  className="h-9 px-4 text-xs font-semibold gap-1.5 rounded-xl shadow-xs"
                >
                  {pushBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />}
                  Ring User Device
                </Button>
              </div>
            </Card>

            {/* STUN / TURN Server ICE Probe */}
            <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                    STUN / TURN ICE Server Probe
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tests WebRTC NAT traversal and relay server credentials
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={iceBusy}
                  onClick={probeIceServers}
                  className="h-8 px-2.5 text-xs gap-1.5 rounded-xl border-border/60"
                >
                  {iceBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-500" />}
                  Probe ICE Servers
                </Button>
              </div>

              <div className="space-y-3 text-xs">
                {iceServersResult ? (
                  <div className="p-3 bg-secondary/30 rounded-xl space-y-2 border border-border/40">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">Probe Latency:</span>
                      <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 bg-emerald-500/10 border-emerald-500/30">
                        {iceServersResult.latency}ms
                      </Badge>
                    </div>
                    <pre className="text-[10px] font-mono text-muted-foreground overflow-x-auto max-h-40 p-2 bg-background/50 rounded-lg">
                      {JSON.stringify(iceServersResult, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-muted-foreground bg-secondary/20 rounded-xl">
                    Click "Probe ICE Servers" to benchmark WebRTC STUN/TURN relay latency.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 3: EDGE FUNCTION PROBES (edge)
      ══════════════════════════════════════════════════════════════════ */}
      {tab === "edge" && (
        <div className="space-y-6">
          <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 overflow-hidden">
            <CardHeader className="p-5 border-b border-border/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Server className="w-4 h-4 text-blue-500" />
                    Supabase Edge Functions Fleet Probes ({EDGE_FUNCTIONS.length})
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Real-time reachability, CORS preflight and response benchmarking across all deployed serverless microservices
                  </CardDescription>
                </div>

                {/* Search & Probe All Button */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search function..."
                      value={pingSearch}
                      onChange={(e) => setPingSearch(e.target.value)}
                      className="h-8 pl-8 text-xs rounded-xl bg-background border-border/60"
                    />
                  </div>

                  <Button
                    size="sm"
                    disabled={isPingingAll}
                    onClick={pingAllFunctions}
                    className="h-8 px-3 text-xs font-semibold gap-1.5 rounded-xl shadow-xs"
                  >
                    {isPingingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    Probe Entire Fleet
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredEdgeFunctions.map((name) => {
                  const st = pingStatus[name] || { state: "idle" as const };
                  const probe = EDGE_FUNCTION_PROBES.find((p) => p.name === name);
                  return (
                    <div
                      key={name}
                      className="p-3.5 rounded-2xl bg-card border border-border/60 hover:border-primary/40 transition-all flex flex-col justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-mono text-xs font-bold text-foreground truncate block">
                            {name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {probe?.mode === "reachability" ? "OPTIONS Preflight" : "POST / GET"}
                          </span>
                        </div>

                        {/* Status Chip */}
                        <div>
                          {st.state === "ok" && (
                            <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 bg-emerald-500/10 border-emerald-500/30 flex items-center gap-1">
                              <Check className="w-3 h-3" /> {st.code}
                            </Badge>
                          )}
                          {st.state === "warn" && (
                            <Badge variant="outline" className="text-[10px] font-mono text-amber-600 bg-amber-500/10 border-amber-500/30">
                              {st.code} (Reachable)
                            </Badge>
                          )}
                          {st.state === "fail" && (
                            <Badge variant="outline" className="text-[10px] font-mono text-rose-600 bg-rose-500/10 border-rose-500/30 flex items-center gap-1">
                              <X className="w-3 h-3" /> {st.code ?? "Net Err"}
                            </Badge>
                          )}
                          {st.state === "pending" && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                          )}
                          {st.state === "idle" && (
                            <Badge variant="outline" className="text-[9px] text-muted-foreground">
                              Standby
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {st.latency ? `${st.latency}ms latency` : "—"}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => ping(name)}
                          className="h-6 px-2 text-[10px] rounded-lg hover:bg-primary/10 hover:text-primary gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Ping
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 4: REALTIME WEBSOCKETS (realtime)
      ══════════════════════════════════════════════════════════════════ */}
      {tab === "realtime" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Channel Subscriber & Custom Broadcast (1 Col) */}
            <div className="space-y-4">
              <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 p-5 space-y-4">
                <div className="border-b border-border/40 pb-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Radio className="w-4 h-4 text-purple-500" />
                    Channel Subscription
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Subscribe to any Realtime WebSocket broadcast topic
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <label className="font-semibold text-foreground">Channel Topic</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. system-vitals"
                      value={channelName}
                      onChange={(e) => setChannelName(e.target.value)}
                      className="h-9 font-mono text-xs rounded-xl bg-background border-border/60"
                    />
                    <Button
                      onClick={() => subscribeChannel()}
                      className="h-9 px-3 text-xs font-semibold rounded-xl shrink-0"
                    >
                      Subscribe
                    </Button>
                  </div>
                </div>

                {/* Popular Presets */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-semibold text-muted-foreground">Quick Channel Presets:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {["system-vitals", "order-status", "admin-chat", "presence-room"].map((ch) => (
                      <button
                        key={ch}
                        onClick={() => {
                          setChannelName(ch);
                          subscribeChannel(ch);
                        }}
                        className="px-2 py-1 bg-secondary/50 hover:bg-secondary rounded-lg text-[10px] font-mono text-foreground transition-colors border border-border/40"
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active Listening Status */}
                <div className="p-3 bg-secondary/30 border border-border/40 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${channelActive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
                    <span className="text-muted-foreground">Listening:</span>
                    <span className="font-mono font-bold text-foreground">{channelActive || "None"}</span>
                  </div>
                </div>
              </Card>

              {/* Custom Event Broadcast Form */}
              <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 p-5 space-y-4">
                <div className="border-b border-border/40 pb-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Send className="w-4 h-4 text-primary" />
                    Broadcast Custom Event
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Push a test event payload into the active WebSocket channel
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Event Name</label>
                    <Input
                      placeholder="e.g. TEST_PING"
                      value={broadcastEvent}
                      onChange={(e) => setBroadcastEvent(e.target.value)}
                      className="h-8 font-mono text-xs rounded-xl bg-background border-border/60"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">JSON Payload</label>
                    <textarea
                      rows={3}
                      value={broadcastPayload}
                      onChange={(e) => setBroadcastPayload(e.target.value)}
                      className="w-full p-2 rounded-xl border border-border/60 bg-background font-mono text-[11px] text-foreground resize-none"
                    />
                  </div>

                  <Button
                    onClick={sendBroadcast}
                    disabled={!channelActive}
                    className="w-full h-8 text-xs font-semibold gap-1.5 rounded-xl shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" /> Broadcast Event
                  </Button>
                </div>
              </Card>
            </div>

            {/* Right: Live Realtime Event Stream (2 Cols) */}
            <div className="lg:col-span-2">
              <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 overflow-hidden h-full flex flex-col justify-between">
                <CardHeader className="p-5 border-b border-border/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-emerald-500" />
                        Live WebSocket Message Stream ({channelMessages.length})
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-0.5">
                        Real-time events received on channel <code>{channelActive || "standby"}</code>
                      </CardDescription>
                    </div>
                    {channelMessages.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setChannelMessages([])}
                        className="h-7 px-2 text-[10px] rounded-lg gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <Trash2 className="w-3 h-3" /> Clear Stream
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4 flex-1 overflow-y-auto max-h-[500px] space-y-2">
                  {channelMessages.length === 0 ? (
                    <div className="p-12 text-center text-xs text-muted-foreground">
                      <Radio className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40 animate-pulse" />
                      Waiting for broadcast messages on channel <code className="text-foreground">{channelActive || "..."}</code>...
                    </div>
                  ) : (
                    channelMessages.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-secondary/30 border border-border/40 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[10px] font-mono bg-purple-500/10 text-purple-600 border-purple-500/30">
                            {m.event}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {m.at.split("T")[1]?.split(".")[0]}
                          </span>
                        </div>
                        <pre className="p-2 bg-background/50 rounded-lg text-[10px] font-mono text-foreground/90 overflow-x-auto">
                          {JSON.stringify(m.payload, null, 2)}
                        </pre>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
