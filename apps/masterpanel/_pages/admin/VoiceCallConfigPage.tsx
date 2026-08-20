"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/lib/app-toast";
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  Server,
  Shield,
  Wifi,
  Clock,
  CheckCircle2,
  Activity,
  CloudUpload,
  ExternalLink,
  Loader2,
  Play,
  Pause,
  Volume2,
  Mic,
  Headphones,
  BarChart3,
  Search,
  Download,
  RefreshCw,
  Zap,
  Radio,
  TrendingUp,
  Sliders,
} from "lucide-react";
import { format } from "date-fns";
import { getIceServers, type IceServerConfig } from "@/lib/ice-servers";
import { useServerFn } from "@/lib/server-fn-compat";
import { syncRecordingToDrive } from "@/lib/drive-backup.functions";
import { useRegisterUniversalSave } from "@/contexts/UniversalSaveContext";

// ── Types ─────────────────────────────────────────────────────────────────────
interface IceConfig {
  enabled: boolean;
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

interface RoutingConfig {
  ring_strategy: "simultaneous" | "round_robin" | "primary_first";
  ring_timeout_seconds: number;
  auto_record: boolean;
  record_mode: "both" | "customer_only" | "agent_only";
  business_hours_enabled: boolean;
  business_hours_start: string;
  business_hours_end: string;
  auto_missed_sms: boolean;
  auto_missed_whatsapp: boolean;
  missed_message_copy: string;
  greeting_text: string;
}

const defaultIceConfig: IceConfig = {
  enabled: true,
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

const defaultRoutingConfig: RoutingConfig = {
  ring_strategy: "simultaneous",
  ring_timeout_seconds: 30,
  auto_record: true,
  record_mode: "both",
  business_hours_enabled: false,
  business_hours_start: "09:00",
  business_hours_end: "22:00",
  auto_missed_sms: true,
  auto_missed_whatsapp: true,
  missed_message_copy: "Hi! We missed your call at ORIZINO. Our team will reach out shortly, or chat with us online: https://orizino.com/support",
  greeting_text: "Thank you for calling ORIZINO Luxury Fit Studio. Connecting you to an advisor.",
};

const statusConfig: Record<string, { icon: any; color: string; label: string; bg: string }> = {
  initiated: { icon: PhoneIncoming, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", label: "Initiated" },
  connected: { icon: PhoneCall, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", label: "Connected" },
  completed: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Completed" },
  missed:    { icon: PhoneMissed, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20", label: "Missed" },
  rejected:  { icon: PhoneOff, color: "text-destructive", bg: "bg-destructive/10 border-destructive/20", label: "Rejected" },
};

export default function AdminCallSettings() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"history" | "routing" | "infrastructure" | "analytics">("history");

  // Configurations
  const [iceConfig, setIceConfig] = useState<IceConfig>(defaultIceConfig);
  const [savedIceConfig, setSavedIceConfig] = useState<IceConfig>(defaultIceConfig);
  const [routingConfig, setRoutingConfig] = useState<RoutingConfig>(defaultRoutingConfig);
  const [savedRoutingConfig, setSavedRoutingConfig] = useState<RoutingConfig>(defaultRoutingConfig);

  // Audio test state
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // ── Load ICE Config ──────────────────────────────────────────────────────────
  const { data: rawVoiceConfig } = useQuery({
    queryKey: ["voice-call-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "voice_call_config")
        .maybeSingle();
      const raw = data?.value as any;
      if (!raw) return null;
      return (typeof raw === "object" && "value" in raw && typeof raw.value === "object" ? raw.value : raw) as IceConfig;
    },
  });

  useEffect(() => {
    if (rawVoiceConfig) {
      const merged = { ...defaultIceConfig, ...rawVoiceConfig };
      setIceConfig(merged);
      setSavedIceConfig(merged);
    }
  }, [rawVoiceConfig]);

  // ── Load Routing Config ──────────────────────────────────────────────────────
  const { data: rawRoutingConfig } = useQuery({
    queryKey: ["voice-call-routing-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "voice_call_routing_config")
        .maybeSingle();
      return (data?.value as unknown as RoutingConfig) || null;
    },
  });

  useEffect(() => {
    if (rawRoutingConfig) {
      const merged = { ...defaultRoutingConfig, ...rawRoutingConfig };
      setRoutingConfig(merged);
      setSavedRoutingConfig(merged);
    }
  }, [rawRoutingConfig]);

  // ── Load Call Logs for Metrics ───────────────────────────────────────────────
  const { data: allLogs = [], isLoading: isLogsLoading } = useQuery({
    queryKey: ["call-logs-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) return [];
      return data || [];
    },
    refetchInterval: 15000,
  });

  // ── Save Mutation ────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries = [
        { key: "voice_call_config", value: iceConfig as any, updated_at: new Date().toISOString() },
        { key: "voice_call_routing_config", value: routingConfig as any, updated_at: new Date().toISOString() },
      ];
      const { error } = await supabase.from("site_settings").upsert(entries, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      setSavedIceConfig({ ...iceConfig });
      setSavedRoutingConfig({ ...routingConfig });
      qc.invalidateQueries({ queryKey: ["voice-call-config"] });
      qc.invalidateQueries({ queryKey: ["voice-call-routing-config"] });
      toast.success("Call Center settings saved");
    },
    onError: (err: any) => toast.error(err.message || "Failed to save call center settings"),
  });

  // ── Universal Save ───────────────────────────────────────────────────────────
  const isDirty = useMemo(() => {
    return (
      JSON.stringify(iceConfig) !== JSON.stringify(savedIceConfig) ||
      JSON.stringify(routingConfig) !== JSON.stringify(savedRoutingConfig)
    );
  }, [iceConfig, savedIceConfig, routingConfig, savedRoutingConfig]);

  useRegisterUniversalSave({
    id: "call-center-settings",
    label: "Save Call Settings",
    isDirty,
    isSaving: saveMutation.isPending,
    onSave: () => saveMutation.mutate(),
  });

  // ── Metrics Calculation ──────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const total = allLogs.length;
    const completed = allLogs.filter((l: any) => l.status === "completed");
    const connected = allLogs.filter((l: any) => l.status === "connected" || l.status === "completed");
    const missed = allLogs.filter((l: any) => l.status === "missed").length;
    const totalDurationSeconds = completed.reduce((acc: number, l: any) => acc + (l.duration_seconds || 0), 0);
    const avgDuration = completed.length > 0 ? Math.round(totalDurationSeconds / completed.length) : 0;
    const connectRate = total > 0 ? Math.round((connected.length / total) * 100) : 100;

    return {
      total,
      connected: connected.length,
      missed,
      totalDurationSeconds,
      avgDuration,
      connectRate,
    };
  }, [allLogs]);

  // ── Mic Testing ──────────────────────────────────────────────────────────────
  const startMicTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      setIsTestingMic(true);

      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const avg = sum / dataArray.length;
        setMicVolume(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (err: any) {
      toast.error("Microphone access denied or unavailable");
    }
  };

  const stopMicTest = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((t) => t.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    setIsTestingMic(false);
    setMicVolume(0);
  };

  const playTestSpeakerSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
      toast.success("Speaker test tone played");
    } catch {
      toast.error("Could not play test tone");
    }
  };

  const formatSeconds = (s: number) => {
    if (s <= 0) return "0:00";
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTotalTime = (s: number) => {
    if (s <= 0) return "0m";
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="space-y-6 w-full pb-16">

      {/* ── HERO BANNER ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-secondary/15 to-background p-6 sm:p-8 shadow-sm">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
                <Radio className="w-3 h-3 text-primary animate-pulse" />
                Telephony &amp; WebRTC
              </span>
              <Badge variant="outline" className="text-[10px] font-mono border-border/60 text-muted-foreground">
                In-Browser Audio Engine
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              Call Center Control Hub
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Real-time browser-to-customer WebRTC calling, intelligent call routing, audio recording backups, and ICE/TURN relay infrastructure.
            </p>
          </div>

          {/* Master Gateway Toggle & Device Quick-Test */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="flex items-center justify-between sm:justify-start gap-3 bg-secondary/35 p-2.5 rounded-2xl border border-border/60">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-foreground block">Voice Gateway</span>
                <span className="text-[10px] text-muted-foreground block">
                  {iceConfig.enabled ? "Accepting calls" : "Telephony offline"}
                </span>
              </div>
              <Switch
                checked={iceConfig.enabled}
                onCheckedChange={(v) => setIceConfig((c) => ({ ...c, enabled: v }))}
              />
            </div>

            <div className="flex items-center gap-1.5 bg-secondary/25 p-1.5 rounded-2xl border border-border/50">
              <Button
                variant={isTestingMic ? "default" : "outline"}
                size="sm"
                onClick={isTestingMic ? stopMicTest : startMicTest}
                className="h-8 rounded-xl text-xs gap-1.5 border-border/60"
              >
                <Mic className={`w-3.5 h-3.5 ${isTestingMic ? "animate-pulse text-primary-foreground" : "text-primary"}`} />
                {isTestingMic ? `Mic: ${micVolume}%` : "Test Mic"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={playTestSpeakerSound}
                className="h-8 rounded-xl text-xs gap-1.5 border-border/60"
              >
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                Speaker
              </Button>
            </div>
          </div>
        </div>

        {/* Live Mic Level Bar when testing */}
        {isTestingMic && (
          <div className="mt-4 pt-3 border-t border-border/40 flex items-center gap-3">
            <span className="text-xs font-medium text-foreground shrink-0">Input Level:</span>
            <div className="flex-1 h-2 rounded-full bg-secondary/60 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 transition-all duration-75"
                style={{ width: `${micVolume}%` }}
              />
            </div>
            <span className="text-xs font-mono text-muted-foreground w-10 text-right">{micVolume}%</span>
          </div>
        )}
      </div>

      {/* ── KPI METRICS RIBBON ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Calls",       value: metrics.total,                         icon: Phone,       color: "text-foreground" },
          { label: "Answered",          value: metrics.connected,                     icon: PhoneCall,   color: "text-emerald-400" },
          { label: "Missed / Rejected", value: metrics.missed,                        icon: PhoneMissed, color: metrics.missed > 0 ? "text-rose-400" : "text-muted-foreground" },
          { label: "Connect Rate",      value: `${metrics.connectRate}%`,             icon: TrendingUp,  color: "text-blue-400" },
          { label: "Total Talk Time",   value: formatTotalTime(metrics.totalDurationSeconds), icon: Headphones,  color: "text-purple-400" },
          { label: "Avg Duration",      value: formatSeconds(metrics.avgDuration),    icon: Clock,       color: "text-amber-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-border/50 bg-card/40 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{label}</span>
              <Icon className={`w-3.5 h-3.5 ${color}`} />
            </div>
            <p className="text-lg font-bold text-foreground tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* ── MAIN TABS ────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full bg-secondary/35 p-1 rounded-2xl h-11 border border-border/40">
          <TabsTrigger value="history" className="w-full text-xs rounded-xl py-2 gap-1.5 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Clock className="w-3.5 h-3.5" /> Call History
          </TabsTrigger>
          <TabsTrigger value="routing" className="w-full text-xs rounded-xl py-2 gap-1.5 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Sliders className="w-3.5 h-3.5" /> Inbound Routing
          </TabsTrigger>
          <TabsTrigger value="infrastructure" className="w-full text-xs rounded-xl py-2 gap-1.5 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Server className="w-3.5 h-3.5" /> ICE &amp; TURN
          </TabsTrigger>
          <TabsTrigger value="analytics" className="w-full text-xs rounded-xl py-2 gap-1.5 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <BarChart3 className="w-3.5 h-3.5" /> Analytics
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: CALL HISTORY & RECORDINGS ───────────────────────────────── */}
        <TabsContent value="history" className="space-y-4">
          <CallHistoryTab allLogs={allLogs} isLogsLoading={isLogsLoading} />
        </TabsContent>

        {/* ── TAB 2: INBOUND ROUTING & RULES ─────────────────────────────────── */}
        <TabsContent value="routing" className="space-y-4">
          <CallRoutingTab
            config={routingConfig}
            onChange={(patch) => setRoutingConfig((c) => ({ ...c, ...patch }))}
          />
        </TabsContent>

        {/* ── TAB 3: ICE / TURN INFRASTRUCTURE ───────────────────────────────── */}
        <TabsContent value="infrastructure" className="space-y-4">
          <IceInfrastructureTab
            config={iceConfig}
            onChange={(patch) => setIceConfig((c) => ({ ...c, ...patch }))}
          />
        </TabsContent>

        {/* ── TAB 4: CALL CENTER ANALYTICS ───────────────────────────────────── */}
        <TabsContent value="analytics" className="space-y-4">
          <CallAnalyticsTab allLogs={allLogs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1: CALL HISTORY & RECORDINGS COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function CallHistoryTab({ allLogs, isLogsLoading }: { allLogs: any[]; isLogsLoading: boolean }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [onlyRecordings, setOnlyRecordings] = useState(false);
  const [playingLogId, setPlayingLogId] = useState<string | null>(null);
  const [audioSpeed, setAudioSpeed] = useState<number>(1);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // Fetch names for all participant IDs
  const participantIds = useMemo(() => {
    const s = new Set<string>();
    allLogs.forEach((l) => {
      if (l.caller_id) s.add(l.caller_id);
      if (l.receiver_id) s.add(l.receiver_id);
    });
    return Array.from(s);
  }, [allLogs]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["call-log-profiles", participantIds],
    queryFn: async () => {
      if (!participantIds.length) return [];
      const { data } = await supabase.from("profiles").select("id, full_name, phone").in("id", participantIds);
      return (data as any[]) || [];
    },
    enabled: participantIds.length > 0,
  });

  const getProfile = (id: string) => profiles.find((p: any) => p.id === id);
  const getName = (id: string) => getProfile(id)?.full_name || id?.slice(0, 8) || "Guest Shopper";

  // Filter logs
  const filteredLogs = useMemo(() => {
    return allLogs.filter((l: any) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (onlyRecordings && !l.recording_admin_url && !l.recording_user_url) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const caller = getName(l.caller_id).toLowerCase();
        const receiver = getName(l.receiver_id).toLowerCase();
        const status = (l.status || "").toLowerCase();
        if (!caller.includes(q) && !receiver.includes(q) && !status.includes(q)) return false;
      }
      return true;
    });
  }, [allLogs, search, statusFilter, onlyRecordings, profiles]);

  const handlePlayAudio = (logId: string, url: string) => {
    if (playingLogId === logId) {
      audioElRef.current?.pause();
      setPlayingLogId(null);
    } else {
      if (audioElRef.current) {
        audioElRef.current.pause();
      }
      const audio = new Audio(url);
      audio.playbackRate = audioSpeed;
      audio.onended = () => setPlayingLogId(null);
      audio.play().catch(() => toast.error("Could not play audio recording"));
      audioElRef.current = audio;
      setPlayingLogId(logId);
    }
  };

  const handleExportCsv = () => {
    if (!filteredLogs.length) {
      toast.error("No logs to export");
      return;
    }
    const headers = "ID,Caller,Receiver,Status,DurationSeconds,Date,RecordingSynced\n";
    const rows = filteredLogs
      .map((l: any) =>
        `"${l.id}","${getName(l.caller_id)}","${getName(l.receiver_id)}","${l.status}",${l.duration_seconds || 0},"${l.created_at}","${!!l.drive_file_id}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `orizino_call_logs_${new Date().toISOString().slice(0, 10)}.csv`,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Call logs exported");
  };

  return (
    <div className="rounded-3xl border border-border/60 bg-card/30 p-5 sm:p-6 space-y-5">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by advisor or customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 rounded-xl pl-9 text-xs bg-background border-border/70"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter pills */}
          <div className="flex items-center gap-1 bg-secondary/30 p-1 rounded-xl border border-border/50">
            {["all", "completed", "missed", "rejected"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all ${
                  statusFilter === st ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <Button
            variant={onlyRecordings ? "default" : "outline"}
            size="sm"
            onClick={() => setOnlyRecordings((v) => !v)}
            className="h-8 rounded-xl text-xs gap-1.5 border-border/60"
          >
            <Volume2 className="w-3 h-3" /> With Audio
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-8 rounded-xl text-xs gap-1.5 border-border/60"
          >
            <Download className="w-3 h-3" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Logs Table / Cards */}
      {isLogsLoading ? (
        <div className="py-12 text-center text-muted-foreground text-xs">Loading call logs…</div>
      ) : filteredLogs.length === 0 ? (
        <div className="py-16 text-center space-y-2 border border-dashed border-border/60 rounded-2xl">
          <Phone className="w-8 h-8 mx-auto text-muted-foreground/30" />
          <p className="text-sm font-semibold text-foreground">No call sessions found</p>
          <p className="text-xs text-muted-foreground">Voice calls initiated between customers and advisors will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredLogs.map((log: any) => {
            const cfg = statusConfig[log.status] || statusConfig.initiated;
            const StatusIcon = cfg.icon;
            const callerName = getName(log.caller_id);
            const receiverName = getName(log.receiver_id);
            const audioUrl = log.recording_admin_url || log.recording_user_url;
            const isPlaying = playingLogId === log.id;

            return (
              <div
                key={log.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-card/50 border border-border/50 hover:border-border/80 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground truncate">{callerName}</span>
                      <span className="text-[10px] text-muted-foreground">→</span>
                      <span className="text-xs font-semibold text-foreground/80 truncate">{receiverName}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(log.created_at), "MMM d, yyyy · hh:mm a")}
                    </p>
                  </div>
                </div>

                {/* Status + Duration + Audio Player */}
                <div className="flex items-center gap-2.5 flex-wrap self-end sm:self-center">
                  <Badge variant="outline" className={`text-[10px] font-semibold ${cfg.color} ${cfg.bg}`}>
                    {cfg.label}
                  </Badge>
                  <span className="text-xs font-mono font-bold text-muted-foreground tabular-nums">
                    {log.duration_seconds > 0 ? `${Math.floor(log.duration_seconds / 60)}:${(log.duration_seconds % 60).toString().padStart(2, "0")}` : "0:00"}
                  </span>

                  {/* Audio Recording Player */}
                  {audioUrl && (
                    <Button
                      variant={isPlaying ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePlayAudio(log.id, audioUrl)}
                      className="h-7.5 rounded-xl text-xs gap-1 px-2.5"
                    >
                      {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 text-primary" />}
                      {isPlaying ? "Pause" : "Listen"}
                    </Button>
                  )}

                  {/* Google Drive Sync */}
                  {audioUrl && (
                    <DriveSyncButton log={log} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Drive Sync Button Component
function DriveSyncButton({ log }: { log: any }) {
  const qc = useQueryClient();
  const syncFn = useServerFn(syncRecordingToDrive);

  const sync = useMutation({
    mutationFn: () => syncFn({ data: { call_log_id: log.id } }),
    onSuccess: (res: any) => {
      if (res?.ok) toast.success(res.already ? "Already backed up" : "Synced recording to Google Drive");
      else toast.error(res?.error || "Drive backup failed");
      qc.invalidateQueries({ queryKey: ["call-logs-all"] });
    },
    onError: (e: any) => toast.error(e.message || "Drive sync failed"),
  });

  if (log.drive_file_id) {
    return (
      <a
        href={`https://drive.google.com/file/d/${log.drive_file_id}/view`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
      >
        <ExternalLink className="w-3 h-3" /> Drive
      </a>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={sync.isPending}
      onClick={() => sync.mutate()}
      className="h-7.5 rounded-xl text-[10px] gap-1 px-2 border-border/60"
      title="Upload audio to Google Drive storage"
    >
      {sync.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CloudUpload className="w-3 h-3 text-primary" />}
      Backup
    </Button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2: CALL ROUTING & INBOUND RULES
// ─────────────────────────────────────────────────────────────────────────────
function CallRoutingTab({
  config,
  onChange,
}: {
  config: RoutingConfig;
  onChange: (patch: Partial<RoutingConfig>) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Ring Strategy & Distribution */}
      <div className="rounded-3xl border border-border/60 bg-card/30 p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" /> Inbound Ring Strategy
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            How incoming customer calls are distributed across online support advisors.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { key: "simultaneous",  title: "Simultaneous Ring", desc: "Ring all available advisors at once; first to answer takes the call." },
            { key: "round_robin",   title: "Round Robin",       desc: "Rotate calls sequentially among advisors with the fewest active sessions." },
            { key: "primary_first", title: "Primary Tier First",desc: "Ring lead advisors first, overflow to general support after 15s." },
          ].map(({ key, title, desc }) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ ring_strategy: key as any })}
              className={`flex flex-col items-start p-4 rounded-2xl border text-left transition-all ${
                config.ring_strategy === key
                  ? "border-primary bg-primary/8 shadow-xs"
                  : "border-border/60 bg-secondary/15 hover:bg-secondary/30"
              }`}
            >
              <span className="text-xs font-bold text-foreground mb-1">{title}</span>
              <span className="text-[11px] text-muted-foreground leading-relaxed">{desc}</span>
            </button>
          ))}
        </div>

        {/* Timeout Slider */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Max Ring Timeout</Label>
            <span className="text-xs font-mono font-bold text-primary">{config.ring_timeout_seconds}s</span>
          </div>
          <Slider
            min={10}
            max={60}
            step={5}
            value={[config.ring_timeout_seconds]}
            onValueChange={([v]) => onChange({ ring_timeout_seconds: v })}
          />
          <p className="text-[11px] text-muted-foreground">
            Call will transition to missed state and trigger auto-responder if no advisor answers within this time.
          </p>
        </div>
      </div>

      {/* Auto Call Recording */}
      <div className="rounded-3xl border border-border/60 bg-card/30 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Headphones className="w-4 h-4 text-purple-400" /> Call Recording &amp; Compliance
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Automatically capture two-way WebRTC audio for quality assurance and training.
            </p>
          </div>
          <Switch
            checked={config.auto_record}
            onCheckedChange={(v) => onChange({ auto_record: v })}
          />
        </div>

        {config.auto_record && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {[
              { key: "both",          label: "Dual Channel (Both Sides)", desc: "Customer + Advisor mixed audio stream." },
              { key: "customer_only", label: "Customer Only",              desc: "Record incoming customer channel only." },
              { key: "agent_only",    label: "Advisor Only",               desc: "Record agent microphone channel only." },
            ].map(({ key, label, desc }) => (
              <button
                key={key}
                type="button"
                onClick={() => onChange({ record_mode: key as any })}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  config.record_mode === key
                    ? "border-primary bg-primary/8 text-foreground"
                    : "border-border/50 bg-secondary/15 text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="text-xs font-bold block mb-0.5">{label}</span>
                <span className="text-[10px] leading-tight block opacity-75">{desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Missed Call Auto-Responders */}
      <div className="rounded-3xl border border-border/60 bg-card/30 p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" /> Missed Call Recovery Auto-Responders
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Instantly dispatch an automated follow-up when a customer's call is missed.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-border/60 bg-secondary/15">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-foreground">SMS Missed Call Alert</span>
              <span className="text-[11px] text-muted-foreground block">Send SMS apology via BulkSMSBD</span>
            </div>
            <Switch
              checked={config.auto_missed_sms}
              onCheckedChange={(v) => onChange({ auto_missed_sms: v })}
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-border/60 bg-secondary/15">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-foreground">WhatsApp Missed Call Alert</span>
              <span className="text-[11px] text-muted-foreground block">Send WhatsApp template via Cloud API</span>
            </div>
            <Switch
              checked={config.auto_missed_whatsapp}
              onCheckedChange={(v) => onChange({ auto_missed_whatsapp: v })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold">Missed Call Message Template</Label>
          <textarea
            rows={2}
            value={config.missed_message_copy}
            onChange={(e) => onChange({ missed_message_copy: e.target.value })}
            className="w-full rounded-xl bg-background border border-border/70 p-3 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 3: ICE / TURN & WEBRTC INFRASTRUCTURE
// ─────────────────────────────────────────────────────────────────────────────
function IceInfrastructureTab({
  config,
  onChange,
}: {
  config: IceConfig;
  onChange: (patch: Partial<IceConfig>) => void;
}) {
  return (
    <div className="space-y-4">
      {/* STUN Servers */}
      <div className="rounded-3xl border border-border/60 bg-card/30 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Public STUN Servers</h3>
              <p className="text-xs text-muted-foreground">Primary NAT discovery — zero cost, resolves public IP addresses.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-500/30">Primary</Badge>
            <Switch
              checked={config.stun_enabled}
              onCheckedChange={(v) => onChange({ stun_enabled: v })}
            />
          </div>
        </div>

        {config.stun_enabled && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold">STUN URLs (one per line)</Label>
            <textarea
              rows={3}
              value={config.stun_urls.join("\n")}
              onChange={(e) => onChange({ stun_urls: e.target.value.split("\n").filter(Boolean) })}
              className="w-full rounded-xl border border-border/70 bg-background p-3 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        )}
      </div>

      {/* Metered.ca TURN */}
      <div className="rounded-3xl border border-border/60 bg-card/30 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Metered.ca TURN Cloud Relay</h3>
              <p className="text-xs text-muted-foreground">Guaranteed fallback relay for strict firewalls &amp; cellular networks (500MB free/month).</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">Recommended</Badge>
            <Switch
              checked={config.metered_enabled}
              onCheckedChange={(v) => onChange({ metered_enabled: v })}
            />
          </div>
        </div>

        {config.metered_enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Metered API Key</Label>
              <Input
                placeholder="your_metered_api_key"
                value={config.metered_api_key}
                onChange={(e) => onChange({ metered_api_key: e.target.value })}
                className="h-10 rounded-xl text-xs font-mono bg-background border-border/70"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Metered Domain</Label>
              <Input
                placeholder="yourapp.metered.live"
                value={config.metered_domain}
                onChange={(e) => onChange({ metered_domain: e.target.value })}
                className="h-10 rounded-xl text-xs font-mono bg-background border-border/70"
              />
            </div>
          </div>
        )}
      </div>

      {/* Self-Hosted Coturn */}
      <div className="rounded-3xl border border-border/60 bg-card/30 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Self-Hosted Coturn Server</h3>
              <p className="text-xs text-muted-foreground">Direct VPS TURN instance with custom credentials.</p>
            </div>
          </div>
          <Switch
            checked={config.coturn_enabled}
            onCheckedChange={(v) => onChange({ coturn_enabled: v })}
          />
        </div>

        {config.coturn_enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">TURN URL</Label>
              <Input
                placeholder="turn:turn.orizino.com:3478"
                value={config.coturn_url}
                onChange={(e) => onChange({ coturn_url: e.target.value })}
                className="h-10 rounded-xl text-xs font-mono bg-background border-border/70"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Username</Label>
              <Input
                placeholder="coturn_user"
                value={config.coturn_username}
                onChange={(e) => onChange({ coturn_username: e.target.value })}
                className="h-10 rounded-xl text-xs bg-background border-border/70"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Password / Credential</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={config.coturn_credential}
                onChange={(e) => onChange({ coturn_credential: e.target.value })}
                className="h-10 rounded-xl text-xs bg-background border-border/70"
              />
            </div>
          </div>
        )}
      </div>

      {/* Live Interactive Diagnostics */}
      <IceDiagnosticsWidget />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ICE / TURN LIVE DIAGNOSTICS PROBE
// ─────────────────────────────────────────────────────────────────────────────
function IceDiagnosticsWidget() {
  const [servers, setServers] = useState<IceServerConfig[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [test, setTest] = useState<{
    state: "idle" | "running" | "done" | "error";
    relay?: boolean;
    srflx?: boolean;
    host?: boolean;
    ms?: number;
    error?: string;
  }>({ state: "idle" });

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await getIceServers();
      setServers(list);
    } catch (e: any) {
      toast.error(e?.message || "Failed to query ICE servers");
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
      let host = false,
        srflx = false,
        relay = false;

      pc.onicecandidate = (e) => {
        if (!e.candidate) return;
        const t = (e.candidate as any).type || e.candidate.candidate.split(" typ ")[1]?.split(" ")[0];
        if (t === "host") host = true;
        if (t === "srflx") srflx = true;
        if (t === "relay") relay = true;
      };

      await pc.setLocalDescription(await pc.createOffer());
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
      setTest({ state: "error", error: e?.message || "WebRTC Probe Failed" });
    }
  };

  return (
    <div className="rounded-3xl border border-border/60 bg-card/30 p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Live WebRTC Relay Diagnostics</h3>
            <p className="text-xs text-muted-foreground">Probe active ICE candidates in real-time to ensure peer connectivity.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={refresh}
            disabled={loading}
            className="h-8 rounded-xl text-xs gap-1.5 border-border/60"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={runTest}
            disabled={test.state === "running"}
            className="h-8 rounded-xl text-xs font-bold gap-1.5"
          >
            {test.state === "running" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            Run WebRTC Probe
          </Button>
        </div>
      </div>

      {/* Active Servers List */}
      <div className="space-y-2">
        {!servers ? (
          <p className="text-xs text-muted-foreground">Inspecting ICE servers…</p>
        ) : servers.length === 0 ? (
          <p className="text-xs text-destructive">No active ICE servers returned.</p>
        ) : (
          servers.map((s, i) => {
            const urls = Array.isArray(s.urls) ? s.urls.join(", ") : s.urls;
            const isTurn = urls.startsWith("turn:") || urls.startsWith("turns:");
            return (
              <div
                key={i}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-secondary/20 border border-border/40 text-xs font-mono"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className={`text-[9px] ${isTurn ? "text-emerald-400 border-emerald-500/30" : "text-blue-400 border-blue-500/30"}`}>
                    {isTurn ? "TURN Relay" : "STUN"}
                  </Badge>
                  <span className="truncate text-foreground">{urls}</span>
                </div>
                {s.credential && (
                  <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-500/30 shrink-0">
                    Auth Token Active
                  </Badge>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Probe Result Card */}
      {test.state === "done" && (
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">WebRTC Probe Completed</span>
            <span className="text-xs font-mono font-bold text-primary">{test.ms}ms</span>
          </div>
          <div className="flex items-center gap-4 flex-wrap text-xs">
            <span className={test.host ? "text-emerald-400 font-semibold" : "text-muted-foreground"}>
              Host (LAN): {test.host ? "✓ OK" : "—"}
            </span>
            <span className={test.srflx ? "text-blue-400 font-semibold" : "text-muted-foreground"}>
              SRFLX (STUN): {test.srflx ? "✓ OK" : "—"}
            </span>
            <span className={test.relay ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
              Relay (TURN): {test.relay ? "✓ ACTIVE (Firewall Bypass Ready)" : "✗ MISSING"}
            </span>
          </div>
        </div>
      )}

      {test.state === "error" && (
        <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
          {test.error}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 4: CALL CENTER ANALYTICS & INSIGHTS
// ─────────────────────────────────────────────────────────────────────────────
function CallAnalyticsTab({ allLogs }: { allLogs: any[] }) {
  const completed = allLogs.filter((l) => l.status === "completed");
  const missed = allLogs.filter((l) => l.status === "missed");
  const rejected = allLogs.filter((l) => l.status === "rejected");

  // Call volume by hour of day (0-23)
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, count: 0 }));
    allLogs.forEach((l) => {
      const h = new Date(l.created_at).getHours();
      if (hours[h]) hours[h].count++;
    });
    return hours;
  }, [allLogs]);

  const maxHourCount = Math.max(...hourlyData.map((h) => h.count), 1);

  return (
    <div className="space-y-4">
      {/* 2-Column Analytics Bento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Outcome Breakdown */}
        <div className="rounded-3xl border border-border/60 bg-card/30 p-5 sm:p-6 space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Call Outcome Breakdown
          </h3>
          <div className="space-y-3">
            {[
              { label: "Completed Calls", count: completed.length, pct: allLogs.length ? Math.round((completed.length / allLogs.length) * 100) : 0, color: "bg-emerald-500", text: "text-emerald-400" },
              { label: "Missed Calls", count: missed.length, pct: allLogs.length ? Math.round((missed.length / allLogs.length) * 100) : 0, color: "bg-rose-500", text: "text-rose-400" },
              { label: "Rejected / Declined", count: rejected.length, pct: allLogs.length ? Math.round((rejected.length / allLogs.length) * 100) : 0, color: "bg-amber-500", text: "text-amber-400" },
            ].map(({ label, count, pct, color, text }) => (
              <div key={label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{label}</span>
                  <span className={`font-mono font-bold ${text}`}>{count} ({pct}%)</span>
                </div>
                <div className="h-2 rounded-full bg-secondary/50 overflow-hidden">
                  <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hourly Distribution Histogram */}
        <div className="rounded-3xl border border-border/60 bg-card/30 p-5 sm:p-6 space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" /> Peak Calling Hours (24h)
          </h3>
          <div className="flex items-end gap-1 h-32 pt-4">
            {hourlyData.map(({ hour, count }) => {
              const heightPct = Math.round((count / maxHourCount) * 100);
              return (
                <div key={hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div
                    className="w-full rounded-t-md bg-primary/60 hover:bg-primary transition-all duration-200 min-h-[4px]"
                    style={{ height: `${Math.max(4, heightPct)}%` }}
                  />
                  {count > 0 && (
                    <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-popover border border-border/70 text-[10px] font-mono px-1.5 py-0.5 rounded shadow-sm pointer-events-none whitespace-nowrap z-20">
                      {hour}: {count} calls
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
            <span>12 AM</span>
            <span>6 AM</span>
            <span>12 PM</span>
            <span>6 PM</span>
            <span>11 PM</span>
          </div>
        </div>
      </div>
    </div>
  );
}
