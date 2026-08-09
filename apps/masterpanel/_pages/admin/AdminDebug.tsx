"use client";
import React, { useState, useEffect } from "react";
import { Bell, Phone, Radio, Server, Check, X, Loader2, Send, Search, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTabParam } from "@/hooks/use-tab-param";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";
import { useQuery } from "@tanstack/react-query";

import { EDGE_FUNCTION_PROBES, runProbe, type PingResult } from "@/lib/edge-function-probes";

const EDGE_FUNCTIONS = EDGE_FUNCTION_PROBES.map((p) => p.name);

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; desc?: string }> = ({ title, icon, children, desc }) => (
  <div className="glass-strong rounded-3xl p-5 md:p-6 space-y-4">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">{icon}</div>
      <div className="flex-1">
        <h3 className="text-base font-semibold font-display text-foreground">{title}</h3>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
    </div>
    {children}
  </div>
);

const AdminDebug: React.FC = () => {
  /* ── Push tools ─────────────────────────────────────────────── */
  const [targetUserId, setTargetUserId] = useState("");
  const [pushTitle, setPushTitle] = useState("🔔 Test push");
  const [pushBody, setPushBody] = useState("This is a test notification from the debug console.");
  const [pushType, setPushType] = useState<"general" | "call">("general");
  const [pushBusy, setPushBusy] = useState(false);

  const { data: pushSubs = [], refetch: refetchSubs } = useQuery({
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
    if (!targetUserId) return toast({ title: "Enter a user_id", variant: "destructive" });
    setPushBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-push", {
        body: {
          user_id: targetUserId,
          payload: { type: pushType, title: pushTitle, body: pushBody, url: "/support", tag: "debug-push" },
        },
      });
      if (error) throw error;
      const sent = (data as any)?.sent ?? 0;
      toast({ title: sent > 0 ? `Sent to ${sent} device(s)` : "No subscriptions", description: sent === 0 ? "User hasn't enabled push." : undefined, variant: sent > 0 ? "default" : "destructive" });
    } catch (e: any) {
      toast({ title: "Push failed", description: e?.message || "Try again", variant: "destructive" });
    } finally {
      setPushBusy(false);
    }
  };

  /* ── Edge function pings ────────────────────────────────────── */
  const [pingStatus, setPingStatus] = useState<Record<string, PingResult>>({});
  const [pingSearch, setPingSearch] = useState("");

  const ping = async (name: string) => {
    const probe = EDGE_FUNCTION_PROBES.find((p) => p.name === name);
    if (!probe) return;
    setPingStatus((s) => ({ ...s, [name]: { state: "pending" } }));
    const { data: { session } } = await supabase.auth.getSession();
    const result = await runProbe(probe, {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
      accessToken: session?.access_token,
    });
    setPingStatus((s) => ({ ...s, [name]: result }));
  };



  /* ── Realtime channel inspector ─────────────────────────────── */
  const [channelName, setChannelName] = useState("");
  const [channelMessages, setChannelMessages] = useState<Array<{ at: string; event: string; payload: any }>>([]);
  const [channelActive, setChannelActive] = useState<string | null>(null);

  useEffect(() => () => { if (channelActive) supabase.getChannels().forEach((c) => c.topic.includes(channelActive) && supabase.removeChannel(c)); }, [channelActive]);

  const subscribeChannel = () => {
    if (!channelName) return;
    if (channelActive) supabase.getChannels().forEach((c) => c.topic.includes(channelActive) && supabase.removeChannel(c));
    setChannelMessages([]);
    const ch = supabase.channel(channelName);
    ch.on("broadcast", { event: "*" }, ({ event, payload }) => {
      setChannelMessages((m) => [{ at: new Date().toISOString(), event, payload }, ...m].slice(0, 30));
    });
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") setChannelActive(channelName);
    });
  };

  /* ── Service worker status ──────────────────────────────────── */
  const [swState, setSwState] = useState<{ scope?: string; active?: boolean; perm?: NotificationPermission | "unsupported" }>({});
  useEffect(() => {
    (async () => {
      const perm = typeof Notification === "undefined" ? "unsupported" : Notification.permission;
      if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
        return setSwState({ perm });
      }
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      setSwState({ scope: reg?.scope, active: !!reg?.active, perm });
    })();
  }, []);

  const [tab] = useTabParam("push", "/system/debug");

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Developer Debug</h1>
        <p className="text-sm text-muted-foreground mt-1">Test pushes, edge functions, realtime channels and service-worker state.</p>
      </header>

      {tab === "push" && (
        <div className="space-y-5">
          <Section title="Send test push" desc="Manually push to any user_id. Useful to verify Web Push end-to-end." icon={<Send className="w-5 h-5 text-primary" />}>
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="user_id (uuid)" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} />
              <select value={pushType} onChange={(e) => setPushType(e.target.value as any)} className="h-10 px-3 rounded-md border bg-background text-sm">
                <option value="general">general</option>
                <option value="call">call (high urgency)</option>
              </select>
              <Input placeholder="Title" value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} />
              <Input placeholder="Body" value={pushBody} onChange={(e) => setPushBody(e.target.value)} />
            </div>
            <Button onClick={sendTestPush} disabled={pushBusy} className="rounded-xl">
              {pushBusy ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-4 h-4 mr-1.5" />}
              Send push
            </Button>
          </Section>

          <Section title={`Recent subscriptions (${pushSubs.length})`} desc="Newest devices that registered for Web Push." icon={<Bell className="w-5 h-5 text-primary" />}>
            <Button size="sm" variant="outline" onClick={() => refetchSubs()} className="rounded-xl">Refresh</Button>
            <div className="mt-3 max-h-72 overflow-auto divide-y divide-border/40 rounded-xl border border-border/40">
              {pushSubs.map((s: any) => (
                <button key={s.id} onClick={() => setTargetUserId(s.user_id)} className="w-full text-left p-2.5 text-xs hover:bg-secondary/30 transition-colors">
                  <div className="font-mono truncate">{s.user_id}</div>
                  <div className="text-muted-foreground truncate">{s.user_agent || "—"}</div>
                  <div className="text-muted-foreground">last used {new Date(s.last_used_at || s.created_at).toLocaleString()}</div>
                </button>
              ))}
              {pushSubs.length === 0 && <div className="p-3 text-xs text-muted-foreground">No subscriptions yet.</div>}
            </div>
          </Section>

          <Section title="Service worker" desc="State of the /sw.js registration in this browser." icon={<Wifi className="w-5 h-5 text-primary" />}>
            <div className="space-y-1 text-sm">
              <div>Permission: <Badge variant="outline">{swState.perm || "—"}</Badge></div>
              <div>Active: <Badge variant="outline">{swState.active ? "yes" : "no"}</Badge></div>
              <div className="text-xs text-muted-foreground break-all">Scope: {swState.scope || "—"}</div>
            </div>
          </Section>
        </div>
      )}

      {tab === "calls" && (
        <Section title="Simulate incoming call" desc="Sends a high-urgency push so the target user's device rings." icon={<Phone className="w-5 h-5 text-primary" />}>
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="user_id (uuid)" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} />
            <Button
              disabled={!targetUserId || pushBusy}
              onClick={async () => {
                setPushBusy(true);
                try {
                  const { data, error } = await supabase.functions.invoke("send-push", {
                    body: { user_id: targetUserId, payload: { type: "call", title: "Incoming support call", body: "Tap to answer", url: "/support", tag: "incoming-call" } },
                  });
                  if (error) throw error;
                  const sent = (data as any)?.sent ?? 0;
                  toast({ title: sent > 0 ? `Ringing ${sent} device(s)` : "No subscriptions" });
                } catch (e: any) {
                  toast({ title: "Failed", description: e?.message, variant: "destructive" });
                } finally { setPushBusy(false); }
              }}
              className="rounded-xl"
            >
              <Phone className="w-4 h-4 mr-1.5" />Ring user
            </Button>
          </div>
        </Section>
      )}

      {tab === "edge" && (
        <Section title="Edge function pings" desc="Sends {__ping:true} to each function. ok = 2xx, warn = 4xx (reachable but rejected input), fail = network or 5xx." icon={<Server className="w-5 h-5 text-primary" />}>
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input placeholder="Filter…" value={pingSearch} onChange={(e) => setPingSearch(e.target.value)} className="h-9" />
            <Button size="sm" variant="outline" className="rounded-xl" onClick={async () => {
              for (const n of EDGE_FUNCTIONS) await ping(n);
            }}>Ping all</Button>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {EDGE_FUNCTIONS.filter((n) => n.toLowerCase().includes(pingSearch.toLowerCase())).map((name) => {
              const st = pingStatus[name] || { state: "idle" as const };
              return (
                <div key={name} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-secondary/30 border border-border/40">
                  <span className="font-mono text-xs truncate">{name}</span>
                  <div className="flex items-center gap-2">
                    {st.state === "ok" && <Badge variant="outline" className="text-green-500 border-green-500/30"><Check className="w-3 h-3 mr-1" />{st.code}</Badge>}
                    {st.state === "warn" && <Badge variant="outline" className="text-amber-500 border-amber-500/30">{st.code}</Badge>}
                    {st.state === "fail" && <Badge variant="outline" className="text-destructive border-destructive/30"><X className="w-3 h-3 mr-1" />{st.code ?? "net"}</Badge>}
                    {st.state === "pending" && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                    <Button size="sm" variant="ghost" className="h-7 px-2 rounded-lg" onClick={() => ping(name)}>Ping</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {tab === "realtime" && (
        <Section title="Channel inspector" desc="Subscribe to a Supabase Realtime broadcast channel and watch incoming events." icon={<Radio className="w-5 h-5 text-primary" />}>
          <div className="flex gap-2">
            <Input placeholder="channel name (e.g. call-<uuid>)" value={channelName} onChange={(e) => setChannelName(e.target.value)} />
            <Button onClick={subscribeChannel} className="rounded-xl">Subscribe</Button>
          </div>
          {channelActive && (
            <div className="text-xs text-muted-foreground">Listening on <span className="font-mono text-foreground">{channelActive}</span></div>
          )}
          <div className="max-h-80 overflow-auto space-y-1.5">
            {channelMessages.map((m, i) => (
              <div key={i} className="p-2 rounded-lg bg-secondary/30 border border-border/40 text-xs">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px]">{m.event}</Badge>
                  <span className="text-[10px] text-muted-foreground font-mono">{m.at.split("T")[1]?.split(".")[0]}</span>
                </div>
                <pre className="mt-1 text-[10px] whitespace-pre-wrap break-all text-foreground/80">{JSON.stringify(m.payload, null, 2)}</pre>
              </div>
            ))}
            {channelMessages.length === 0 && <div className="text-xs text-muted-foreground p-2">No messages yet.</div>}
          </div>
        </Section>
      )}
    </div>
  );
};


export default AdminDebug;
// code:4ce0
