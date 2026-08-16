"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getRTCConfiguration } from "@/lib/ice-servers";
import { CallRecorder, uploadCallRecording } from "@/lib/call-recorder";
import { playRingtone, stopRingtone, playOutgoingDialTone, stopOutgoingDialTone, playCallConnectedSound, playCallEndedSound } from "@/lib/sounds";
import { AudioWaveVisualizer } from "@/components/admin/AudioWaveVisualizer";

// drive-backup is server-only; loaded dynamically to avoid SSR evaluation
const syncRecordingToDrive = async (...args: Parameters<typeof import("@/lib/drive-backup.functions")["syncRecordingToDrive"]>) => {
  const mod = await import("@/lib/drive-backup.functions");
  return mod.syncRecordingToDrive(...args);
};

interface VoiceCallButtonProps {
  conversationId: string;
  userId: string;
  adminId: string;
  disabled?: boolean;
}

/**
 * WebRTC voice call button & live calling hub for admin support.
 * Uses Supabase Realtime broadcast for two-way signaling.
 */
const VoiceCallButton: React.FC<VoiceCallButtonProps> = ({
  conversationId,
  userId,
  adminId,
  disabled = false,
}) => {
  const [callState, setCallState] = useState<"idle" | "incoming" | "requesting" | "calling" | "connected" | "rejected">("idle");
  const callStateRef = useRef(callState);
  callStateRef.current = callState;
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const callLogIdRef = useRef<string | null>(null);
  const recorderRef = useRef<CallRecorder | null>(null);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Setup signaling channel
  useEffect(() => {
    const channel = supabase.channel(`call-${conversationId}`, {
      config: { broadcast: { self: false } },
    });

    channel.on("broadcast", { event: "call-request" }, ({ payload }) => {
      if (payload.action === "incoming" && payload.from === userId) {
        setCallState("incoming");
        playRingtone();
        setTimeout(() => {
          if (callStateRef.current === "incoming") {
            stopRingtone();
            setCallState("idle");
          }
        }, 30000);
      }
    });

    channel.on("broadcast", { event: "call-response" }, async ({ payload }) => {
      if (payload.action === "accepted") {
        stopOutgoingDialTone();
        stopRingtone();
        await initiateWebRTC();
      } else if (payload.action === "rejected") {
        stopOutgoingDialTone();
        stopRingtone();
        playCallEndedSound();
        setCallState("rejected");
        if (callLogIdRef.current) {
          supabase.from("call_logs").update({ status: "rejected", ended_at: new Date().toISOString() }).eq("id", callLogIdRef.current).then(() => {});
          callLogIdRef.current = null;
        }
        setTimeout(() => setCallState("idle"), 2000);
      }
    });

    channel.on("broadcast", { event: "call-signal" }, async ({ payload }) => {
      const pc = peerRef.current;
      if (!pc) return;

      if (payload.type === "answer" && payload.sdp) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: payload.sdp }));
          for (const c of pendingCandidatesRef.current) {
            try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) { console.warn("ICE add failed", e); }
          }
          pendingCandidatesRef.current = [];
        } catch (e) {
          console.error("setRemoteDescription(answer) failed", e);
        }
      } else if (payload.type === "ice-candidate" && payload.candidate) {
        if (pc.remoteDescription) {
          try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch (e) { console.warn("ICE add failed", e); }
        } else {
          pendingCandidatesRef.current.push(payload.candidate);
        }
      } else if (payload.type === "hangup") {
        endCall();
      }
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      stopRingtone();
      stopOutgoingDialTone();
      supabase.removeChannel(channel);
      endCall();
    };
  }, [conversationId, userId]);

  const initiateWebRTC = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      // Start local recording (admin side)
      try {
        const rec = new CallRecorder();
        if (rec.start(stream)) recorderRef.current = rec;
      } catch (e) { console.warn("[admin call] recorder start failed", e); }

      const rtcConfig = await getRTCConfiguration();
      const pc = new RTCPeerConnection(rtcConfig);
      peerRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(() => {});
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          channelRef.current?.send({
            type: "broadcast",
            event: "call-signal",
            payload: { type: "ice-candidate", candidate: event.candidate, from: "admin" },
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "connected") {
          stopOutgoingDialTone();
          stopRingtone();
          playCallConnectedSound();
          setCallState("connected");
          if (!timerRef.current) {
            timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
          }
          if (callLogIdRef.current) {
            supabase.from("call_logs").update({ status: "connected" }).eq("id", callLogIdRef.current).then(() => {});
          }
        }
        if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
          endCall();
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      channelRef.current?.send({
        type: "broadcast",
        event: "call-signal",
        payload: { type: "offer", sdp: offer.sdp, from: "admin" },
      });

      setCallState("calling");
    } catch (err) {
      console.error("Failed to start WebRTC:", err);
      stopOutgoingDialTone();
      setCallState("idle");
    }
  };

  const startCall = useCallback(async () => {
    setCallState("requesting");
    playOutgoingDialTone();

    // Create call log entry
    const { data: logData } = await supabase.from("call_logs").insert({
      conversation_id: conversationId,
      caller_id: adminId,
      receiver_id: userId,
      status: "initiated",
    }).select("id").single();
    if (logData) callLogIdRef.current = logData.id;

    // Send call request to customer via broadcast
    channelRef.current?.send({
      type: "broadcast",
      event: "call-request",
      payload: {
        from: adminId,
        conversationId,
        action: "incoming",
        callLogId: callLogIdRef.current,
      },
    });

    // Also insert a notification for the user
    await supabase.from("notifications").insert({
      user_id: userId,
      title: "Incoming Voice Call",
      message: "A support agent is trying to call you. Open the support page to answer.",
      type: "call",
      priority: "high",
      link_url: "/support",
    });

    // Fire web push so the user's device rings even if the tab is closed
    supabase.functions.invoke("send-push", {
      body: {
        user_id: userId,
        payload: {
          type: "call",
          title: "Incoming support call",
          body: "Tap to answer",
          url: "/support",
          tag: "incoming-call",
        },
      },
    }).catch((e) => console.warn("send-push failed", e));

    // Timeout after 30s
    setTimeout(() => {
      if (callStateRef.current === "requesting") {
        stopOutgoingDialTone();
        setCallState("idle");
        if (callLogIdRef.current) {
          supabase.from("call_logs").update({ status: "missed", ended_at: new Date().toISOString() }).eq("id", callLogIdRef.current).then(() => {});
          callLogIdRef.current = null;
        }
      }
    }, 30000);
  }, [conversationId, adminId, userId]);

  const acceptIncomingCall = async () => {
    stopRingtone();
    channelRef.current?.send({
      type: "broadcast",
      event: "call-response",
      payload: { action: "accepted", from: adminId },
    });
    await initiateWebRTC();
  };

  const declineIncomingCall = () => {
    stopRingtone();
    channelRef.current?.send({
      type: "broadcast",
      event: "call-response",
      payload: { action: "rejected", from: adminId },
    });
    setCallState("idle");
  };

  const endCall = useCallback(() => {
    stopOutgoingDialTone();
    stopRingtone();
    playCallEndedSound();

    const logId = callLogIdRef.current;
    const finalStatus = callState === "connected" ? "completed" : callState === "rejected" ? "rejected" : "missed";

    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && logId) {
      recorder.stop().then(async (blob) => {
        if (!blob) return;
        const path = await uploadCallRecording({
          blob, userId: adminId, callLogId: logId, role: "admin", ext: recorder.extension,
        });
        if (path) {
          syncRecordingToDrive({ data: { call_log_id: logId } }).catch((e) =>
            console.warn("[drive-sync] failed", e),
          );
        }
      });
    }

    if (logId) {
      supabase.from("call_logs").update({
        status: finalStatus,
        duration_seconds: duration,
        ended_at: new Date().toISOString(),
      }).eq("id", logId).then(() => {});
      callLogIdRef.current = null;
    }

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach((t) => t.stop()); localStreamRef.current = null; }
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }

    channelRef.current?.send({
      type: "broadcast",
      event: "call-signal",
      payload: { type: "hangup", from: "admin" },
    });

    setCallState("idle");
    setDuration(0);
    setMuted(false);
  }, [callState, duration, adminId]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setMuted(!muted);
    }
  }, [muted]);

  if (callState === "idle") {
    return (
      <Button
        size="sm"
        variant="outline"
        className="rounded-xl gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-semibold"
        onClick={startCall}
        disabled={disabled}
      >
        <Phone className="w-4 h-4" /> Call Customer
      </Button>
    );
  }

  if (callState === "incoming") {
    return (
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
        <Badge variant="outline" className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 animate-pulse font-bold">
          Customer Calling...
        </Badge>
        <AudioWaveVisualizer active color="bg-emerald-500" height={16} barCount={4} />
        <Button size="sm" className="h-7 px-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs" onClick={acceptIncomingCall}>
          <Phone className="w-3.5 h-3.5 mr-1" /> Answer
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={declineIncomingCall}>
          <PhoneOff className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <audio ref={remoteAudioRef} autoPlay playsInline />
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25"
        >
          {callState === "requesting" && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30 animate-pulse font-bold">
                Dialing...
              </Badge>
              <AudioWaveVisualizer active color="bg-amber-500" height={14} barCount={4} />
            </div>
          )}
          {callState === "calling" && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30 animate-pulse font-bold">
                Ringing...
              </Badge>
              <AudioWaveVisualizer active color="bg-amber-500" height={14} barCount={4} />
            </div>
          )}
          {callState === "rejected" && (
            <Badge variant="outline" className="text-xs text-destructive border-destructive/30 font-bold">
              Declined
            </Badge>
          )}
          {callState === "connected" && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-mono font-bold">
                {formatDuration(duration)}
              </Badge>
              <AudioWaveVisualizer stream={localStreamRef.current} active={!muted} color="bg-emerald-500" height={16} barCount={5} />
            </div>
          )}
          {(callState === "calling" || callState === "connected") && (
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={toggleMute} title={muted ? "Unmute" : "Mute"}>
              {muted ? <MicOff className="w-3.5 h-3.5 text-destructive" /> : <Mic className="w-3.5 h-3.5 text-emerald-600" />}
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={endCall} title="End Call">
            <PhoneOff className="w-3.5 h-3.5" />
          </Button>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default VoiceCallButton;
// code:4ce0
