"use client";
import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Phone, PhoneIncoming, PhoneMissed, PhoneOff, CheckCircle2, Clock, Download, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { toast } from "@/lib/app-toast";

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  initiated: { icon: PhoneIncoming, color: "text-amber-500", bg: "bg-amber-500/10", label: "Initiated" },
  connected: { icon: Phone, color: "text-blue-500", bg: "bg-blue-500/10", label: "Connected" },
  completed: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", label: "Completed" },
  missed: { icon: PhoneMissed, color: "text-destructive", bg: "bg-destructive/10", label: "Missed" },
  rejected: { icon: PhoneOff, color: "text-muted-foreground", bg: "bg-muted/30", label: "Declined" },
};

const fmtDur = (s: number) => (s > 0 ? `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}` : "—");

interface Props {
  limit?: number;
  compact?: boolean;
}

const CallHistoryList: React.FC<Props> = ({ limit = 25, compact = false }) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["user-call-logs", user?.id, limit],
    queryFn: async () => {
      const { data } = await supabase
        .from("call_logs")
        .select("id, status, duration_seconds, created_at, started_at, caller_id, receiver_id, recording_user_url, recording_admin_url")
        .or(`caller_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("created_at", { ascending: false })
        .limit(limit);
      return data || [];
    },
    enabled: !!user,
  });

  const deleteAllLogs = async () => {
    if (!user?.id || !logs.length) return;
    const { error } = await supabase
      .from("call_logs")
      .delete()
      .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`);
    if (error) {
      toast({ title: "Could not clear call history", description: error.message, variant: "destructive" });
    } else {
      qc.invalidateQueries({ queryKey: ["user-call-logs", user.id] });
      toast({ title: "Call history deleted" });
    }
  };

  // Realtime: refresh on any call_logs change involving this user
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`call-logs-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_logs", filter: `caller_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["user-call-logs", user.id] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_logs", filter: `receiver_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["user-call-logs", user.id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-secondary/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!logs.length) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-secondary/40 flex items-center justify-center">
          <Phone className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">No calls yet</p>
        <p className="text-xs text-muted-foreground mt-1">Your support call history will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 pb-1">
        <p className="text-xs text-muted-foreground">{logs.length} call log{logs.length > 1 ? "s" : ""}</p>
        <button
          type="button"
          onClick={deleteAllLogs}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-500/10 text-rose-500 text-xs font-bold hover:bg-rose-500/20 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete All History
        </button>
      </div>
      <div className="space-y-2">
      {logs.map((log: any, i: number) => {
        const incoming = log.receiver_id === user?.id;
        const cfg = statusConfig[log.status] || statusConfig.initiated;
        const Icon = incoming ? PhoneIncoming : Phone;
        return (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-secondary/30 border border-border/40 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${cfg.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {incoming ? "Support agent" : "You called support"}
                </p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {compact
                    ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true })
                    : format(new Date(log.created_at), "MMM d, yyyy · HH:mm")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Recording — prefer the user's own copy, fall back to admin's */}
              {(log.recording_user_url || log.recording_admin_url) && (
                <RecordingButton path={log.recording_user_url || log.recording_admin_url} />
              )}
              <Badge variant="outline" className={`text-[10px] ${cfg.color} border-current/30`}>
                {cfg.label}
              </Badge>
              <span className="text-xs font-mono text-muted-foreground tabular-nums">{fmtDur(log.duration_seconds)}</span>
            </div>
          </motion.div>
        );
      })}
      </div>
    </div>
  );
};

const RecordingButton: React.FC<{ path: string }> = ({ path }) => {
  const [busy, setBusy] = useState(false);
  const open = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.storage.from("call-recordings").createSignedUrl(path, 60 * 60);
      if (error || !data?.signedUrl) throw error || new Error("No URL");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast({ title: "Recording unavailable", description: e?.message || "Try again", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      onClick={open}
      disabled={busy}
      title="Open recording"
      className="h-7 w-7 rounded-lg flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
    </button>
  );
};

export default CallHistoryList;
// code:4ce0
