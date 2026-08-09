"use client";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/app-toast";
import { Phone, Server, Shield, Wifi, Clock, PhoneIncoming, PhoneOff, PhoneMissed, CheckCircle2, Activity, CloudUpload, ExternalLink, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { getIceServers, type IceServerConfig } from "@/lib/ice-servers";
import { useServerFn } from "@/lib/server-fn-compat";
import { syncRecordingToDrive } from "@/lib/drive-backup.functions";

interface IceConfig {
  stun_enabled: boolean;
  stun_urls: string[];
  metered_enabled: boolean;
  metered_api_key: string;
  metered_domain: string;
  coturn_enabled: boolean;
  coturn_url: string;
  coturn_username: string;
  coturn_credential: string;
}

const defaultConfig: IceConfig = {
  stun_enabled: true,
  stun_urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
  metered_enabled: false,
  metered_api_key: "",
  metered_domain: "",
  coturn_enabled: false,
  coturn_url: "",
  coturn_username: "",
  coturn_credential: "",
};

const AdminCallSettings = () => {
  const qc = useQueryClient();
  const [config, setConfig] = useState<IceConfig>(defaultConfig);
  const [saving, setSaving] = useState(false);

  const { data: savedConfig } = useQuery({
    queryKey: ["voice-call-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "voice_call_config")
        .maybeSingle();
      const raw = data?.value as any;
      if (!raw) return null;
      // site_settings rows are stored as { value: <actual> } by the shared
      // useSiteSettings hook. Unwrap one level if present.
      const unwrapped =
        raw && typeof raw === "object" && "value" in raw && typeof raw.value === "object"
          ? raw.value
          : raw;
      return unwrapped as IceConfig;
    },
  });

  useEffect(() => {
    if (savedConfig) setConfig({ ...defaultConfig, ...savedConfig });
  }, [savedConfig]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "voice_call_config", value: config as any, updated_at: new Date().toISOString() }, { onConflict: "key" });
    setSaving(false);
    if (error) {
      toast.error("Failed to save");
    } else {
      toast.success("Voice call settings saved");
      qc.invalidateQueries({ queryKey: ["voice-call-config"] });
    }
  };

  const update = (patch: Partial<IceConfig>) => setConfig((c) => ({ ...c, ...patch }));

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <Phone className="w-7 h-7" /> Voice Call Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure ICE/TURN servers for WebRTC voice calls
          </p>
        </div>
      </div>

      {/* STUN */}
      <div className="border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">STUN Servers</h3>
              <p className="text-xs text-muted-foreground">Primary — free, works for most direct connections</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">Primary</Badge>
            <Switch checked={config.stun_enabled} onCheckedChange={(v) => update({ stun_enabled: v })} />
          </div>
        </div>
        {config.stun_enabled && (
          <div className="space-y-2">
            <Label className="text-xs">STUN URLs (one per line)</Label>
            <textarea
              value={config.stun_urls.join("\n")}
              onChange={(e) => update({ stun_urls: e.target.value.split("\n").filter(Boolean) })}
              className="w-full rounded-xl border border-border bg-secondary/30 p-3 text-sm font-mono min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        )}
      </div>

      {/* Metered.ca TURN */}
      <div className="border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Metered TURN</h3>
              <p className="text-xs text-muted-foreground">Fallback — relay when STUN fails (free 500MB/month)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">Fallback</Badge>
            <Switch checked={config.metered_enabled} onCheckedChange={(v) => update({ metered_enabled: v })} />
          </div>
        </div>
        {config.metered_enabled && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">API Key</Label>
              <Input
                value={config.metered_api_key}
                onChange={(e) => update({ metered_api_key: e.target.value })}
                placeholder="Your Metered.ca API key"
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Domain</Label>
              <Input
                value={config.metered_domain}
                onChange={(e) => update({ metered_domain: e.target.value })}
                placeholder="e.g. yourapp.metered.live"
                className="rounded-xl mt-1"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Get a free API key at{" "}
              <a href="https://www.metered.ca" target="_blank" rel="noopener" className="text-primary underline">
                metered.ca
              </a>
            </p>
          </div>
        )}
      </div>

      {/* Self-hosted Coturn */}
      <div className="border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Server className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Self-Hosted Coturn</h3>
              <p className="text-xs text-muted-foreground">Your own TURN server on a VPS (future option)</p>
            </div>
          </div>
          <Switch checked={config.coturn_enabled} onCheckedChange={(v) => update({ coturn_enabled: v })} />
        </div>
        {config.coturn_enabled && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">TURN URL</Label>
              <Input
                value={config.coturn_url}
                onChange={(e) => update({ coturn_url: e.target.value })}
                placeholder="turn:your-server.com:3478"
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Username</Label>
              <Input
                value={config.coturn_username}
                onChange={(e) => update({ coturn_username: e.target.value })}
                placeholder="TURN username"
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Credential</Label>
              <Input
                type="password"
                value={config.coturn_credential}
                onChange={(e) => update({ coturn_credential: e.target.value })}
                placeholder="TURN password"
                className="rounded-xl mt-1"
              />
            </div>
          </div>
        )}
      </div>

      <Button onClick={save} disabled={saving} className="rounded-xl w-full">
        {saving ? "Saving..." : "Save Voice Call Settings"}
      </Button>

      {/* ICE / TURN diagnostics */}
      <IceDiagnostics />

      {/* Call History */}
      <CallHistory />
    </div>
  );
};

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  initiated: { icon: PhoneIncoming, color: "text-amber-500", label: "Initiated" },
  connected: { icon: Phone, color: "text-blue-500", label: "Connected" },
  completed: { icon: CheckCircle2, color: "text-green-500", label: "Completed" },
  missed: { icon: PhoneMissed, color: "text-muted-foreground", label: "Missed" },
  rejected: { icon: PhoneOff, color: "text-destructive", label: "Rejected" },
};

function CallHistory() {
  const { data: logs = [] } = useQuery({
    queryKey: ["call-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("call_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    refetchInterval: 15000,
  });

  const callerIds = [...new Set(logs.map((l: any) => l.caller_id).concat(logs.map((l: any) => l.receiver_id)))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["call-log-profiles", callerIds],
    queryFn: async () => {
      if (!callerIds.length) return [];
      const { data } = await supabase.from("profiles").select("id, full_name").in("id", callerIds);
      return data || [];
    },
    enabled: callerIds.length > 0,
  });

  const getName = (id: string) => profiles.find((p: any) => p.id === id)?.full_name || "Unknown";
  const fmtDur = (s: number) => s > 0 ? `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}` : "—";

  return (
    <div className="border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Clock className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Call History</h3>
          <p className="text-xs text-muted-foreground">Recent voice calls between agents and customers</p>
        </div>
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No call history yet</p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {logs.map((log: any) => {
            const cfg = statusConfig[log.status] || statusConfig.initiated;
            const Icon = cfg.icon;
            return (
              <CallLogRow
                key={log.id}
                log={log}
                callerName={getName(log.caller_id)}
                receiverName={getName(log.receiver_id)}
                statusIcon={Icon}
                statusColor={cfg.color}
                statusLabel={cfg.label}
                durationText={fmtDur(log.duration_seconds)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function CallLogRow({
  log,
  callerName,
  receiverName,
  statusIcon: Icon,
  statusColor,
  statusLabel,
  durationText,
}: {
  log: any;
  callerName: string;
  receiverName: string;
  statusIcon: any;
  statusColor: string;
  statusLabel: string;
  durationText: string;
}) {
  const qc = useQueryClient();
  const syncFn = useServerFn(syncRecordingToDrive);
  const hasRecording = !!(log.recording_admin_url || log.recording_user_url);
  const sync = useMutation({
    mutationFn: () => syncFn({ data: { call_log_id: log.id } }),
    onSuccess: (res: any) => {
      if (res?.ok) toast.success(res.already ? "Already synced" : "Synced to Drive");
      else toast.error(res?.error || "Sync failed");
      qc.invalidateQueries({ queryKey: ["call-logs"] });
    },
    onError: (e: any) => toast.error(e?.message || "Sync failed"),
  });

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-secondary/30 border border-border/50">
      <div className="flex items-center gap-3 min-w-0">
        <Icon className={`w-4 h-4 shrink-0 ${statusColor}`} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {callerName} → {receiverName}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {format(new Date(log.created_at), "MMM d, yyyy · HH:mm")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="outline" className={`text-[10px] ${statusColor}`}>{statusLabel}</Badge>
        <span className="text-xs font-mono text-muted-foreground">{durationText}</span>
        {hasRecording && (
          log.drive_file_id ? (
            <a
              href={`https://drive.google.com/file/d/${log.drive_file_id}/view`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
              title="Open in Google Drive"
            >
              <ExternalLink className="w-3 h-3" /> Drive
            </a>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 rounded-lg text-[10px]"
              disabled={sync.isPending}
              onClick={() => sync.mutate()}
              title="Sync recording to Google Drive"
            >
              {sync.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CloudUpload className="w-3 h-3" />}
              <span className="ml-1">Sync</span>
            </Button>
          )
        )}
      </div>
    </div>
  );
}

type TestState =
  | { state: "idle" }
  | { state: "running" }
  | { state: "done"; relay: boolean; srflx: boolean; host: boolean; ms: number }
  | { state: "error"; error: string };

function IceDiagnostics() {
  const [servers, setServers] = useState<IceServerConfig[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [test, setTest] = useState<TestState>({ state: "idle" });

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await getIceServers();
      setServers(list);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load ICE servers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const runTest = async () => {
    setTest({ state: "running" });
    const start = Date.now();
    try {
      const list = servers ?? (await getIceServers());
      const pc = new RTCPeerConnection({
        iceServers: list as RTCIceServer[],
        iceTransportPolicy: "all",
      });
      pc.createDataChannel("probe");
      let host = false, srflx = false, relay = false;
      pc.onicecandidate = (e) => {
        if (!e.candidate) return;
        const t = (e.candidate as any).type || e.candidate.candidate.split(" typ ")[1]?.split(" ")[0];
        if (t === "host") host = true;
        if (t === "srflx") srflx = true;
        if (t === "relay") relay = true;
      };
      await pc.setLocalDescription(await pc.createOffer());
      // Wait up to 8s for gathering
      await new Promise<void>((resolve) => {
        const done = () => {
          if (pc.iceGatheringState === "complete") resolve();
        };
        pc.onicegatheringstatechange = done;
        setTimeout(resolve, 8000);
      });
      pc.close();
      setTest({ state: "done", host, srflx, relay, ms: Date.now() - start });
    } catch (e: any) {
      setTest({ state: "error", error: e?.message || "Test failed" });
    }
  };

  const classify = (urls: string | string[]) => {
    const u = Array.isArray(urls) ? urls[0] : urls;
    if (u?.startsWith("turns:")) return { label: "TURNS", color: "text-emerald-500" };
    if (u?.startsWith("turn:")) return { label: "TURN", color: "text-green-500" };
    if (u?.startsWith("stun:")) return { label: "STUN", color: "text-blue-500" };
    return { label: "?", color: "text-muted-foreground" };
  };

  return (
    <div className="border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">ICE / TURN Diagnostics</h3>
            <p className="text-xs text-muted-foreground">Live servers from <code>get-ice-servers</code> + real WebRTC test</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="rounded-lg h-8" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Reload"}
          </Button>
          <Button size="sm" className="rounded-lg h-8" onClick={runTest} disabled={test.state === "running"}>
            {test.state === "running" ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
            Test TURN
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {!servers ? (
          <p className="text-xs text-muted-foreground">Loading servers…</p>
        ) : servers.length === 0 ? (
          <p className="text-xs text-destructive">No ICE servers returned.</p>
        ) : (
          servers.map((s, i) => {
            const c = classify(s.urls);
            const urls = Array.isArray(s.urls) ? s.urls.join(", ") : s.urls;
            return (
              <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-secondary/30 border border-border/40 text-xs font-mono">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className={`text-[10px] ${c.color}`}>{c.label}</Badge>
                  <span className="truncate text-foreground">{urls}</span>
                </div>
                {s.credential ? (
                  <Badge variant="outline" className="text-[10px] text-emerald-500">creds</Badge>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {test.state === "done" && (
        <div className="rounded-xl border border-border/60 p-3 space-y-1 text-xs">
          <div className="flex items-center gap-4">
            <span className={test.host ? "text-emerald-500" : "text-muted-foreground"}>host: {test.host ? "✓" : "—"}</span>
            <span className={test.srflx ? "text-blue-500" : "text-muted-foreground"}>srflx: {test.srflx ? "✓" : "—"}</span>
            <span className={test.relay ? "text-green-500 font-semibold" : "text-destructive"}>relay (TURN): {test.relay ? "✓ working" : "✗ missing"}</span>
            <span className="text-muted-foreground ml-auto">{test.ms}ms</span>
          </div>
          {!test.relay && (
            <p className="text-[11px] text-destructive">
              No relay candidate — TURN is not reachable. Cross-network calls will fail.
            </p>
          )}
        </div>
      )}
      {test.state === "error" && (
        <p className="text-xs text-destructive">Error: {test.error}</p>
      )}
    </div>
  );
}

export default AdminCallSettings;
// code:4ce0
