"use client";
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { useLanguage } from "@/contexts/LanguageContext";
import { playRingtone, stopRingtone, playOutgoingDialTone, stopOutgoingDialTone, playCallConnectedSound, playCallEndedSound } from "@/lib/sounds";
import { getRTCConfiguration } from "@/lib/ice-servers";
import CallHistoryList from "@/components/CallHistoryList";
import { pushSupported, subscribeToPush } from "@/lib/push";
import { CallRecorder, uploadCallRecording } from "@/lib/call-recorder";
import { toast } from "@/lib/app-toast";
import { getTicketStatusInfo } from "@/lib/ticket-status";
import { AudioWaveVisualizer } from "@/components/AudioWaveVisualizer";
import {
  Bot, Send, User, Headphones, ArrowLeft, Phone, PhoneOff, Mic, MicOff,
  MessageSquare, History, BellRing, BellOff, Volume2, Speaker, Search,
  HelpCircle, ShieldCheck, Truck, RefreshCw, FileText, ChevronRight,
  Zap, LifeBuoy, PackageCheck, AlertCircle, Clock, Ticket, Plus, Lock,
  CheckCircle2, Filter, AlertTriangle, ChevronLeft
} from "lucide-react";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const FAQ_CATEGORIES = [
  {
    id: "orders",
    title: "Orders & Delivery",
    icon: Truck,
    description: "Delivery timelines, order tracking & shipping.",
    faqs: [
      {
        q: "How long does shipping take?",
        a: "Standard delivery inside Bangladesh takes 2–4 business days. Express shipping takes 5–8 business days via DHL/FedEx."
      },
      {
        q: "How can I track my order?",
        a: "You can track your order live under [Orders](/orders) or by sending your Order ID to our AI concierge here."
      },
      {
        q: "Do you offer Cash on Delivery?",
        a: "Yes, Cash on Delivery is available nationwide across all 64 districts in Bangladesh."
      }
    ]
  },
  {
    id: "returns",
    title: "Returns & Exchanges",
    icon: RefreshCw,
    description: "7-day easy returns & size exchange policy.",
    faqs: [
      {
        q: "What is your return policy?",
        a: "We offer a 7-day hassle-free return and exchange policy on all unworn items with original tags intact."
      },
      {
        q: "How do I request a size replacement?",
        a: "Go to your Account Profile under Order History or request a replacement directly through Mr. Slime in this chat."
      },
      {
        q: "When will my refund be processed?",
        a: "Refunds are issued within 24–48 hours after quality verification."
      }
    ]
  },
  {
    id: "sizing",
    title: "Sizing & Fabric Guide",
    icon: HelpCircle,
    description: "European drop shoulder fit & cotton GSM density.",
    faqs: [
      {
        q: "What is your size fit guide?",
        a: "Our t-shirts feature a relaxed European oversized fit. For a standard fit, order your normal size. For a super oversized look, select one size up."
      },
      {
        q: "What fabric quality do you use?",
        a: "We use 100% combed cotton ranging from 180 GSM to 240 GSM luxury knits."
      }
    ]
  },
  {
    id: "payments",
    title: "Payments & Security",
    icon: ShieldCheck,
    description: "bKash, Nagad, Cards & 256-bit SSL encryption.",
    faqs: [
      {
        q: "Which payment methods are accepted?",
        a: "We accept bKash, Nagad, Rocket, Visa, Mastercard, AMEX, SSLCommerz, and Cash on Delivery."
      },
      {
        q: "Is checkout secure?",
        a: "Yes, all transactions are 256-bit SSL encrypted and PCI-DSS compliant."
      }
    ]
  }
];

/* ── Incoming Call Modal ── */
const IncomingCallOverlay: React.FC<{
  visible: boolean;
  onAccept: () => void;
  onReject: () => void;
}> = ({ visible, onAccept, onReject }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10005] flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 15, opacity: 0 }}
          className="relative overflow-hidden rounded-3xl bg-card border border-border p-6 sm:p-8 max-w-sm w-full text-center space-y-6 shadow-2xl"
        >
          <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500/10 flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
            <Phone className="w-8 h-8 text-emerald-500 relative z-10" />
          </div>
          <div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium tracking-wide uppercase">
              Incoming Support Call
            </span>
            <h3 className="text-lg font-bold font-display text-foreground mt-2">Support Specialist</h3>
            <p className="text-xs text-muted-foreground mt-1">Orizino concierge is calling live</p>
          </div>
          <div className="flex items-center justify-center gap-5 pt-1">
            <button
              onClick={onReject}
              className="w-14 h-14 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-md"
              aria-label="Decline Call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <button
              onClick={onAccept}
              className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-md animate-pulse"
              aria-label="Accept Call"
            >
              <Phone className="w-6 h-6" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

/* ── Active Call Bar ── */
const ActiveCallBar: React.FC<{
  duration: number;
  muted: boolean;
  speakerOn: boolean;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onHangup: () => void;
}> = ({ duration, muted, speakerOn, onToggleMute, onToggleSpeaker, onHangup }) => {
  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  return (
    <motion.div
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -10, opacity: 0 }}
      className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-foreground"
    >
      <div className="flex items-center gap-2.5">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        <div>
          <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Live Voice Call Active</h4>
          <p className="text-[11px] font-mono text-muted-foreground">{fmt(duration)}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="ghost" onClick={onToggleSpeaker} className="h-8 w-8 p-0 rounded-lg">
          {speakerOn ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <Speaker className="w-4 h-4 text-muted-foreground" />}
        </Button>
        <Button size="sm" variant="ghost" onClick={onToggleMute} className="h-8 w-8 p-0 rounded-lg">
          {muted ? <MicOff className="w-4 h-4 text-destructive" /> : <Mic className="w-4 h-4 text-emerald-500" />}
        </Button>
        <Button size="sm" onClick={onHangup} className="h-8 px-3 rounded-lg bg-destructive text-destructive-foreground text-xs gap-1">
          <PhoneOff className="w-3.5 h-3.5" /> End Call
        </Button>
      </div>
    </motion.div>
  );
};

const SupportPage: React.FC = () => {
  useSeoMeta("support", "Customer Support & Care | Orizino");
  const { user } = useAuth();
  const qc = useQueryClient();
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"chat" | "tickets" | "faq" | "history" | "settings">("chat");
  const [faqQuery, setFaqQuery] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState<string | null>(null);

  /* ── Support Tickets State ── */
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketFilter, setTicketFilter] = useState<"all" | "open" | "closed">("all");
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [newCategory, setNewCategory] = useState("Order Issue");
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [submittingNewTicket, setSubmittingNewTicket] = useState(false);
  const [replyInput, setReplyInput] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const ticketScrollContainerRef = useRef<HTMLDivElement>(null);

  /* ── User Tickets Query ── */
  const { data: userTickets = [], refetch: refetchTickets } = useQuery({
    queryKey: ["support-user-tickets", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("support_conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) {
        console.error("Failed to fetch tickets:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!user,
    staleTime: 10000,
  });

  const activeTicketsCount = useMemo(() => {
    return userTickets.filter((t: any) => t.status !== "closed").length;
  }, [userTickets]);

  const filteredTickets = useMemo(() => {
    return userTickets.filter((t: any) => {
      if (ticketFilter === "open" && t.status === "closed") return false;
      if (ticketFilter === "closed" && t.status !== "closed") return false;
      if (ticketSearch.trim()) {
        const query = ticketSearch.toLowerCase();
        const subject = (t.subject || "").toLowerCase();
        const id = (t.id || "").toLowerCase();
        if (!subject.includes(query) && !id.includes(query)) return false;
      }
      return true;
    });
  }, [userTickets, ticketFilter, ticketSearch]);

  const selectedTicket = useMemo(() => {
    if (!selectedTicketId) return userTickets[0] || null;
    return userTickets.find((t: any) => t.id === selectedTicketId) || userTickets[0] || null;
  }, [userTickets, selectedTicketId]);

  useEffect(() => {
    if (!selectedTicketId && userTickets.length > 0) {
      setSelectedTicketId(userTickets[0].id);
    }
  }, [userTickets, selectedTicketId]);

  const { data: ticketMessages = [], refetch: refetchTicketMessages } = useQuery({
    queryKey: ["support-ticket-messages", selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket?.id) return [];
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("conversation_id", selectedTicket.id)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("Failed to fetch messages for ticket:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!selectedTicket?.id,
    staleTime: 5000,
  });

  useEffect(() => {
    if (!user) return;
    const channels: any[] = [];

    const convChannel = supabase
      .channel(`support-page-convs-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_conversations", filter: `user_id=eq.${user.id}` }, () => {
        refetchTickets();
        qc.invalidateQueries({ queryKey: ["support-user-tickets", user.id] });
      })
      .subscribe();
    channels.push(convChannel);

    if (selectedTicket?.id) {
      const msgChannel = supabase
        .channel(`support-page-msgs-${selectedTicket.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${selectedTicket.id}` }, () => {
          refetchTicketMessages();
          qc.invalidateQueries({ queryKey: ["support-ticket-messages", selectedTicket.id] });
        })
        .subscribe();
      channels.push(msgChannel);
    }

    return () => {
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [user, selectedTicket?.id, refetchTickets, refetchTicketMessages, qc]);

  useEffect(() => {
    if (ticketScrollContainerRef.current) {
      ticketScrollContainerRef.current.scrollTop = ticketScrollContainerRef.current.scrollHeight;
    }
  }, [ticketMessages]);

  const formatTicketTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const handleCreateNewTicket = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to submit a support ticket.", variant: "destructive" });
      return;
    }
    if (!newSubject.trim() || !newMessage.trim()) {
      toast({ title: "Missing fields", description: "Please enter both a subject and issue details.", variant: "destructive" });
      return;
    }
    setSubmittingNewTicket(true);
    try {
      const fullSubject = `[${newCategory}] ${newSubject.trim()}`;
      const { data: conv, error: convErr } = await supabase
        .from("support_conversations")
        .insert({
          user_id: user.id,
          subject: fullSubject,
          status: "open",
          is_ai: false,
          type: "ticket",
          needs_human: true,
        })
        .select()
        .single();

      if (convErr || !conv) throw convErr || new Error("Failed to create ticket");

      const { error: msgErr } = await supabase.from("support_messages").insert({
        conversation_id: conv.id,
        sender_id: user.id,
        sender_type: "user",
        content: `**Category:** ${newCategory}\n\n${newMessage.trim()}`,
      });
      if (msgErr) throw msgErr;

      supabase.functions.invoke("notify-live-support", { body: { conversation_id: conv.id } }).catch(() => {});

      toast({ title: "Ticket Submitted", description: `Support Ticket #${conv.id.slice(0, 8).toUpperCase()} submitted successfully.` });
      setNewSubject("");
      setNewMessage("");
      setNewCategory("Order Issue");
      setIsCreatingTicket(false);
      setSelectedTicketId(conv.id);
      refetchTickets();
    } catch (err: any) {
      toast({ title: "Submission Failed", description: err.message || "Failed to create support ticket", variant: "destructive" });
    } finally {
      setSubmittingNewTicket(false);
    }
  };

  const handleSendTicketReply = async () => {
    if (!replyInput.trim() || !selectedTicket?.id || !user) return;
    if (selectedTicket.status === "closed") {
      toast({ title: "Ticket Closed", description: "This ticket has been closed by admin. Please create a new ticket if needed.", variant: "destructive" });
      return;
    }
    setSendingReply(true);
    try {
      const text = replyInput.trim();
      const { error: msgErr } = await supabase.from("support_messages").insert({
        conversation_id: selectedTicket.id,
        sender_id: user.id,
        sender_type: "user",
        content: text,
      });
      if (msgErr) throw msgErr;

      await supabase.from("support_conversations").update({
        updated_at: new Date().toISOString(),
        needs_human: true,
      }).eq("id", selectedTicket.id);

      setReplyInput("");
      refetchTicketMessages();
      refetchTickets();
    } catch (err: any) {
      toast({ title: "Failed to send", description: err.message || "Failed to send message", variant: "destructive" });
    } finally {
      setSendingReply(false);
    }
  };

  const [pushEnabled, setPushEnabled] = useState<boolean>(
    typeof Notification !== "undefined" && Notification.permission === "granted"
  );
  const [pushBusy, setPushBusy] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );
  const [lastPushUpdate, setLastPushUpdate] = useState<string | null>(null);

  const refreshPushStatus = useCallback(async () => {
    if (!user) return;
    if (typeof Notification !== "undefined") setPushPermission(Notification.permission);
    const { data } = await supabase
      .from("push_subscriptions")
      .select("last_used_at, created_at")
      .eq("user_id", user.id)
      .order("last_used_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    setLastPushUpdate((data?.last_used_at as string) || (data?.created_at as string) || null);
  }, [user]);

  useEffect(() => { refreshPushStatus(); }, [refreshPushStatus, pushEnabled]);

  useEffect(() => {
    if (!user || !pushSupported() || Notification.permission !== "granted") return;
    subscribeToPush(user.id).catch(() => {});
  }, [user]);

  const handleEnablePush = async () => {
    if (!user) return;
    if (!pushSupported()) {
      toast({ title: "Not supported", description: "Push notifications are not supported in this browser.", variant: "destructive" });
      return;
    }
    setPushBusy(true);
    const ok = await subscribeToPush(user.id);
    setPushBusy(false);
    if (ok) {
      setPushEnabled(true);
      setPushPermission(Notification.permission);
      await refreshPushStatus();
      toast({ title: "Alerts Enabled", description: "You will receive live call notifications." });
    } else {
      toast({ title: "Permission Denied", description: "Please allow notifications in browser settings.", variant: "destructive" });
    }
  };

  /* ── WebRTC Voice Call Logic ── */
  const [incomingCall, setIncomingCall] = useState(false);

  useEffect(() => {
    if (incomingCall) { playRingtone(); } else { stopRingtone(); }
    return () => stopRingtone();
  }, [incomingCall]);

  const [callActive, setCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callMuted, setCallMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callChannelRef = useRef<any>(null);
  const pendingOfferRef = useRef<string | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const callLogIdRef = useRef<string | null>(null);
  const recorderRef = useRef<CallRecorder | null>(null);

  const applyAudioOutput = useCallback(async (useSpeaker: boolean) => {
    const el = remoteAudioRef.current as any;
    if (!el) return;
    el.volume = 1;
    if (typeof el.setSinkId === "function") {
      try { await el.setSinkId(useSpeaker ? "default" : "communications"); } catch {}
    }
  }, []);

  useEffect(() => { if (callActive) applyAudioOutput(speakerOn); }, [speakerOn, callActive, applyAudioOutput]);

  const toggleSpeaker = () => setSpeakerOn((v) => !v);

  const processPendingOffer = async () => {
    const pc = peerRef.current;
    const sdp = pendingOfferRef.current;
    if (!pc || !sdp) return;
    if (pc.signalingState !== "stable") return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp }));
      pendingOfferRef.current = null;
      for (const c of pendingCandidatesRef.current) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) { console.warn("ICE add failed", e); }
      }
      pendingCandidatesRef.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      callChannelRef.current?.send({
        type: "broadcast",
        event: "call-signal",
        payload: { type: "answer", sdp: answer.sdp, from: "user" },
      });
    } catch (e) {
      console.error("processPendingOffer failed", e);
    }
  };

  const { data: aiConfig } = useQuery({
    queryKey: ["ai-agent-config"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "ai_agent_config").maybeSingle();
      const raw = (data?.value as any) || {};
      return raw && typeof raw === "object" && "value" in raw && typeof raw.value === "object" ? raw.value : raw;
    },
    staleTime: 60_000,
  });

  const { data: activeConv } = useQuery({
    queryKey: ["user-active-conv", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("support_conversations")
        .select("id")
        .eq("user_id", user!.id)
        .in("status", ["open", "assigned"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!activeConv?.id) return;
    const channel = supabase.channel(`call-${activeConv.id}`, { config: { broadcast: { self: false } } });

    channel.on("broadcast", { event: "call-request" }, ({ payload }) => {
      if (payload.action === "incoming") {
        if (payload.callLogId) callLogIdRef.current = payload.callLogId;
        setIncomingCall(true);
        setTimeout(() => setIncomingCall(false), 30000);
      }
    });

    channel.on("broadcast", { event: "call-signal" }, async ({ payload }) => {
      if (payload.type === "offer" && payload.from === "admin") {
        pendingOfferRef.current = payload.sdp;
        if (peerRef.current) await processPendingOffer();
      }
      if (payload.type === "ice-candidate" && payload.from === "admin") {
        const pc = peerRef.current;
        if (pc && pc.remoteDescription) {
          try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch (e) { console.warn("ICE add failed", e); }
        } else {
          pendingCandidatesRef.current.push(payload.candidate);
        }
      }
      if (payload.type === "hangup") { hangupCall(); }
    });

    channel.subscribe();
    callChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [activeConv?.id]);

  const acceptCall = async () => {
    setIncomingCall(false);
    callChannelRef.current?.send({
      type: "broadcast",
      event: "call-response",
      payload: { action: "accepted" },
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      try {
        const rec = new CallRecorder();
        if (rec.start(stream)) recorderRef.current = rec;
      } catch (e) { console.warn("[user call] recorder start failed", e); }

      const rtcConfig = await getRTCConfiguration();
      const pc = new RTCPeerConnection(rtcConfig);
      peerRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(() => {});
          applyAudioOutput(speakerOn);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          callChannelRef.current?.send({
            type: "broadcast",
            event: "call-signal",
            payload: { type: "ice-candidate", candidate: event.candidate, from: "user" },
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "connected") {
          setCallActive(true);
          playCallConnectedSound();
          if (!timerRef.current) {
            timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
          }
        }
        if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
          hangupCall();
        }
      };

      if (pendingOfferRef.current) await processPendingOffer();
      setCallActive(true);
    } catch (err) {
      console.error("Failed to accept call:", err);
    }
  };

  const rejectCall = () => {
    setIncomingCall(false);
    stopRingtone();
    callChannelRef.current?.send({
      type: "broadcast",
      event: "call-response",
      payload: { action: "rejected" },
    });
  };

  const hangupCall = () => {
    stopRingtone();
    stopOutgoingDialTone();
    playCallEndedSound();

    const recorder = recorderRef.current;
    const logId = callLogIdRef.current;
    recorderRef.current = null;
    callLogIdRef.current = null;
    if (recorder && logId && user) {
      recorder.stop().then((blob) => {
        if (!blob) return;
        uploadCallRecording({ blob, userId: user.id, callLogId: logId, role: "user", ext: recorder.extension })
          .catch((e) => console.warn("[user call] upload failed", e));
      });
    }

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach((t) => t.stop()); localStreamRef.current = null; }
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    pendingOfferRef.current = null;
    setCallActive(false);
    setCallDuration(0);
    setCallMuted(false);
  };

  const closeSelectedTicket = async () => {
    if (!selectedTicket?.id || !user) return;
    try {
      await supabase.from("support_conversations").update({
        status: "closed",
        updated_at: new Date().toISOString(),
      }).eq("id", selectedTicket.id);

      await supabase.from("support_messages").insert({
        conversation_id: selectedTicket.id,
        sender_id: user.id,
        sender_type: "user",
        content: "🔒 *Support ticket was closed by customer.*",
      });

      toast.success("Support ticket closed successfully.");
      qc.invalidateQueries({ queryKey: ["user-support-tickets"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to close ticket");
    }
  };

  const toggleCallMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
      setCallMuted(!callMuted);
    }
  };

  const agentName = aiConfig?.name || "Mr. Slime";
  const welcomeMessage = aiConfig?.welcome_message || "Hi! I'm Mr. Slime, your Orizino Concierge. How can I assist you today?";

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ role: "assistant", content: welcomeMessage }]);
    }
  }, [welcomeMessage]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const { language } = useLanguage();

  const sendMessage = useCallback(async (customText?: string) => {
    const textToSend = (customText ?? input).trim();
    if (!textToSend || loading) return;
    const userMsg: Msg = { role: "user", content: textToSend };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!customText) setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { messages: newMessages, context: { userId: user?.id, locale: language || "auto" } },
      });
      if (error) throw error;
      setMessages((prev) => [...prev, { role: "assistant", content: data?.reply || "I'm having trouble reaching the AI right now." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong on my end. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading, user, language]);

  const filteredFaqs = useMemo(() => {
    if (!faqQuery.trim()) return FAQ_CATEGORIES;
    const q = faqQuery.toLowerCase();
    return FAQ_CATEGORIES.map(cat => ({
      ...cat,
      faqs: cat.faqs.filter(f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
    })).filter(cat => cat.faqs.length > 0);
  }, [faqQuery]);

  const handleRequestHandoff = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to request human support.", variant: "destructive" });
      return;
    }
    toast({ title: "Connecting Live Agent", description: "Escalating your session to a support specialist." });
    await sendMessage("I would like to speak with a human support specialist.");
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      <IncomingCallOverlay visible={incomingCall} onAccept={acceptCall} onReject={rejectCall} />

      {/* Main Full-Width Wrapper — Matches 100% Inline with Footer (w-full px-4 sm:px-6 lg:px-8 xl:px-10) */}
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-5 sm:py-8 space-y-5 sm:space-y-6">

        {/* ── UNIFIED RESPONSIVE HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Store
              </Link>
              <span className="text-muted-foreground/40">•</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Support Online
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display tracking-tight text-foreground">
              Customer Support
            </h1>
            <p className="text-xs text-muted-foreground">
              Instant AI concierge assistance, WebRTC voice support, and fast 7-day resolutions.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant={pushEnabled ? "secondary" : "outline"}
              onClick={handleEnablePush}
              disabled={pushBusy || pushEnabled}
              className="rounded-xl text-xs gap-1.5 h-9 px-3.5 border-border/60"
            >
              {pushEnabled ? <BellRing className="w-3.5 h-3.5 text-emerald-500" /> : <BellOff className="w-3.5 h-3.5" />}
              <span>{pushEnabled ? "Alerts Active" : "Enable Push"}</span>
            </Button>
          </div>
        </div>

        {/* Active Voice Call Overlay Bar */}
        <AnimatePresence>
          {callActive && (
            <ActiveCallBar
              duration={callDuration}
              muted={callMuted}
              speakerOn={speakerOn}
              onToggleMute={toggleCallMute}
              onToggleSpeaker={toggleSpeaker}
              onHangup={hangupCall}
            />
          )}
        </AnimatePresence>

        {/* Executive Segmented Pill Menu */}
        <div className="p-1.5 bg-secondary/40 backdrop-blur-md rounded-2xl border border-border/40 shadow-xs grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
          <button
            onClick={() => setTab("chat")}
            className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              tab === "chat"
                ? "bg-card text-foreground shadow-sm ring-1 ring-border/50 font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            }`}
          >
            <MessageSquare className={`w-3.5 h-3.5 ${tab === "chat" ? "text-primary" : ""}`} />
            <span>AI Concierge</span>
            <span className="hidden md:inline-block ml-auto text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              24/7
            </span>
          </button>

          <button
            onClick={() => setTab("tickets")}
            className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              tab === "tickets"
                ? "bg-card text-foreground shadow-sm ring-1 ring-border/50 font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            }`}
          >
            <LifeBuoy className={`w-3.5 h-3.5 ${tab === "tickets" ? "text-primary" : ""}`} />
            <span>Support Tickets</span>
            {user && (
              <span className={`hidden md:inline-block ml-auto text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                activeTicketsCount > 0 ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
              }`}>
                {activeTicketsCount > 0 ? `${activeTicketsCount} Active` : `${userTickets.length}`}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab("faq")}
            className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              tab === "faq"
                ? "bg-card text-foreground shadow-sm ring-1 ring-border/50 font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            }`}
          >
            <FileText className={`w-3.5 h-3.5 ${tab === "faq" ? "text-primary" : ""}`} />
            <span>Knowledge Base</span>
            <span className="hidden md:inline-block ml-auto text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
              FAQs
            </span>
          </button>

          <button
            onClick={() => setTab("history")}
            className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              tab === "history"
                ? "bg-card text-foreground shadow-sm ring-1 ring-border/50 font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            }`}
          >
            <History className={`w-3.5 h-3.5 ${tab === "history" ? "text-primary" : ""}`} />
            <span>Call History</span>
            <span className="hidden md:inline-block ml-auto text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
              Logs
            </span>
          </button>

          <button
            onClick={() => setTab("settings")}
            className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              tab === "settings"
                ? "bg-card text-foreground shadow-sm ring-1 ring-border/50 font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            }`}
          >
            <BellRing className={`w-3.5 h-3.5 ${tab === "settings" ? "text-emerald-500" : ""}`} />
            <span>Call Alerts</span>
            <span className={`hidden md:inline-block ml-auto text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded ${pushEnabled ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-secondary text-muted-foreground"}`}>
              {pushEnabled ? "ON" : "OFF"}
            </span>
          </button>
        </div>

        {/* Tab 1: 2-Block Layout for Chat Interface */}
        {tab === "chat" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
            
            {/* Block 1 (Left 8 Cols): AI Concierge Chat Container */}
            <div className="lg:col-span-8 rounded-2xl bg-card border border-border/40 shadow-xs overflow-hidden flex flex-col h-[520px] sm:h-[580px] lg:h-[620px]">
              
              {/* Chat Header Stripe */}
              <div className="px-4 sm:px-5 py-3 border-b border-border/40 bg-secondary/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {aiConfig?.avatar_type === "image" && aiConfig?.avatar_url ? (
                      <img src={aiConfig.avatar_url} alt={agentName} className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover" />
                    ) : (
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                        {aiConfig?.avatar_emoji ? <span className="text-sm sm:text-base">{aiConfig.avatar_emoji}</span> : <Bot className="w-4 h-4" />}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                      {agentName} <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-mono uppercase">AI Assistant</span>
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground">Product & Order Specialist</p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMessages([{ role: "assistant", content: welcomeMessage }])}
                  className="rounded-lg text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="w-3 h-3 mr-1" /> Clear
                </Button>
              </div>

              {/* Chat Messages Window */}
              <div ref={scrollRef} translate="no" className="notranslate skiptranslate flex-1 overflow-y-auto min-w-0 max-w-full overflow-x-hidden p-3.5 sm:p-5 space-y-3.5">
                {messages.map((msg, i) => {
                  const isUser = msg.role === "user";
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-2.5 sm:gap-3 min-w-0 max-w-full ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      {!isUser && (
                        aiConfig?.avatar_type === "image" && aiConfig?.avatar_url ? (
                          <img src={aiConfig.avatar_url} alt={agentName} className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-bold">
                            {aiConfig?.avatar_emoji ? <span className="text-xs">{aiConfig.avatar_emoji}</span> : <Bot className="w-3.5 h-3.5" />}
                          </div>
                        )
                      )}

                      <div
                        className={`max-w-[88%] sm:max-w-[80%] min-w-0 px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm rounded-2xl break-words [overflow-wrap:anywhere] ${
                          isUser
                            ? "bg-primary text-primary-foreground rounded-br-xs font-medium"
                            : "bg-secondary/60 border border-border/40 text-foreground rounded-bl-xs [&_p]:leading-relaxed"
                        }`}
                      >
                        {!isUser ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none break-words min-w-0 [overflow-wrap:anywhere] [&_p]:mb-1 [&_p]:mt-0 text-xs sm:text-sm">
                            <ReactMarkdown
                              components={{
                                img: ({ node, ...props }) => (
                                  <div className="my-2 block max-w-[240px] overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 shadow-md bg-secondary/30">
                                    <img
                                      {...props}
                                      className="w-full aspect-square object-cover transition-transform duration-300 hover:scale-105 block"
                                      loading="lazy"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = "none";
                                      }}
                                    />
                                  </div>
                                ),
                                a: ({ node, children, href, ...props }) => {
                                  return (
                                    <a
                                      href={href}
                                      {...props}
                                      className="text-primary hover:underline font-semibold inline-flex items-center gap-1"
                                    >
                                      {children}
                                    </a>
                                  );
                                },
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p>{msg.content}</p>
                        )}
                      </div>

                      {isUser && (
                        <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}

                {loading && (
                  <div className="flex gap-2.5 items-end">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="bg-secondary/60 border border-border/40 rounded-2xl rounded-bl-xs px-3.5 py-2 flex gap-1.5">
                      <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Composer */}
              <div className="p-3 border-t border-border/40 bg-card space-y-2">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                  {[
                    "Track my order",
                    "Exchange sizes",
                    "Best oversized tees",
                    "Talk to agent"
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      disabled={loading}
                      className="px-2.5 py-1 rounded-full bg-secondary/70 hover:bg-secondary border border-border/40 text-[10.5px] font-medium text-foreground whitespace-nowrap transition-colors disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 bg-secondary/40 rounded-xl p-1.5 border border-border/40 focus-within:border-primary/50 transition-all">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    placeholder="Ask Mr. Slime anything..."
                    className="flex-1 bg-transparent px-3 py-1.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  <Button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || loading}
                    className="rounded-lg px-3.5 h-8 text-xs font-semibold"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Block 2 (Right 4 Cols): Desktop & Mobile Support Information Cards */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* Card 1: Request Human Support Agent */}
              <div className="rounded-2xl bg-card border border-border/40 p-4 sm:p-5 space-y-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <LifeBuoy className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-foreground">Human Support Agent</h3>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground">Response within 15 mins</p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Need custom assistance with an order, payment, or fitting? Connect with a support representative directly.
                </p>

                <Button
                  onClick={handleRequestHandoff}
                  variant="outline"
                  className="w-full rounded-xl border-border/60 text-foreground font-semibold text-xs py-4 gap-2 transition-all hover:bg-primary hover:text-primary-foreground"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  Request Support Specialist
                </Button>
              </div>

              {/* Card 2: Direct Order Tracking Link */}
              <Link
                to="/orders"
                className="group p-4 rounded-2xl bg-card border border-border/40 hover:border-primary/40 hover:shadow-xs transition-all flex items-center gap-3.5"
              >
                <div className="w-9 h-9 rounded-xl bg-secondary text-foreground flex items-center justify-center font-bold shrink-0 group-hover:text-primary group-hover:scale-105 transition-all">
                  <PackageCheck className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors">Track Live Orders</h3>
                  <p className="text-[11px] text-muted-foreground truncate">Real-time courier updates & status</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </Link>

              {/* Card 2: Operating Service Hours */}
              <div className="rounded-2xl bg-card border border-border/40 p-4 sm:p-5 space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-xs text-foreground uppercase tracking-wider font-mono">
                  <Clock className="w-3.5 h-3.5 text-primary" /> Service Working Hours
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/20">
                    <span className="text-muted-foreground">Sat – Thu:</span>
                    <span className="font-semibold text-foreground">9:00 AM – 10:00 PM</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/20">
                    <span className="text-muted-foreground">Friday:</span>
                    <span className="font-semibold text-foreground">2:00 PM – 9:00 PM</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">AI Concierge:</span>
                    <span className="font-semibold text-emerald-500">24/7 Active</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Quality Guarantee */}
              <div className="rounded-2xl bg-secondary/30 border border-border/40 p-4 space-y-2">
                <div className="flex items-center gap-2 text-foreground font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Authentic Quality Guaranteed
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Every Orizino product includes open-box inspection upon delivery and 7-day easy exchanges.
                </p>
              </div>

            </div>
          </div>
        )}

        {/* Create Ticket Modal Overlay */}
        <AnimatePresence>
          {isCreatingTicket && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[10006] flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
            >
              <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 10 }}
                className="relative w-full max-w-lg rounded-2xl bg-card border border-border/60 shadow-2xl p-5 sm:p-6 space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-foreground">Open Support Ticket</h3>
                      <p className="text-[11px] text-muted-foreground">Our concierge specialist team will attend to you shortly</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsCreatingTicket(false)}
                    className="w-7 h-7 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateNewTicket} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 block">Ticket Category</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {[
                        "Order Issue",
                        "Product Quality",
                        "Delivery & Courier",
                        "Payment & Refund",
                        "Exchange / Return",
                        "General Inquiry"
                      ].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setNewCategory(cat)}
                          className={`px-2.5 py-2 rounded-xl text-[11px] font-medium border text-left transition-all ${
                            newCategory === cat
                              ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                              : "border-border/50 text-muted-foreground hover:border-border hover:bg-secondary/40"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Subject Title</label>
                    <input
                      type="text"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      placeholder="e.g. Order #ORD-8219 delivery status"
                      className="w-full bg-secondary/40 border border-border/60 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Detailed Description</label>
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Please explain the issue or question in detail..."
                      rows={4}
                      className="w-full bg-secondary/40 border border-border/60 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCreatingTicket(false)}
                      className="rounded-xl text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submittingNewTicket || !newSubject.trim() || !newMessage.trim()}
                      className="rounded-xl text-xs font-semibold gap-1.5"
                    >
                      {submittingNewTicket ? "Submitting..." : "Submit Ticket"}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab 2: Support Tickets (Unauthenticated State) */}
        {tab === "tickets" && !user && (
          <div className="rounded-2xl bg-card border border-border/40 p-8 sm:p-12 text-center max-w-lg mx-auto space-y-4 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
              <LifeBuoy className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold font-display text-foreground">Customer Support Portal</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Sign in to your account to view your support tickets, manage active inquiries, and continue conversations with our dedicated specialists.
              </p>
            </div>
            <div className="pt-2">
              <Link to="/auth?redirect=/support">
                <Button className="rounded-xl px-6 py-2.5 font-semibold text-xs gap-2">
                  <User className="w-3.5 h-3.5" /> Sign In to Access Tickets
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Tab 2: Support Tickets (Authenticated State) */}
        {tab === "tickets" && user && (
          <div className="space-y-4">
            {/* Top Toolbar: Filter, Search, and Create Ticket Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-card border border-border/40 shadow-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                {[
                  { id: "all" as const, label: "All Tickets", count: userTickets.length },
                  { id: "open" as const, label: "Active", count: activeTicketsCount },
                  { id: "closed" as const, label: "Closed", count: userTickets.length - activeTicketsCount },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setTicketFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      ticketFilter === f.id
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <span>{f.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${ticketFilter === f.id ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground"}`}>
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={ticketSearch}
                    onChange={(e) => setTicketSearch(e.target.value)}
                    placeholder="Filter tickets..."
                    className="w-full bg-secondary/40 border border-border/50 rounded-xl pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <Button
                  onClick={() => setIsCreatingTicket(true)}
                  size="sm"
                  className="rounded-xl text-xs font-bold gap-1.5 h-8 px-3 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Open Ticket</span>
                </Button>
              </div>
            </div>

            {/* Main Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-start">
              
              {/* Left Column: Tickets List (4 Cols) */}
              <div className="lg:col-span-4 rounded-2xl bg-card border border-border/40 shadow-xs overflow-hidden flex flex-col h-[520px] sm:h-[580px] lg:h-[620px]">
                <div className="px-4 py-3 border-b border-border/40 bg-secondary/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LifeBuoy className="w-4 h-4 text-primary" />
                    <h3 className="text-xs sm:text-sm font-bold text-foreground">Support Conversations</h3>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {filteredTickets.length} {filteredTickets.length === 1 ? "ticket" : "tickets"}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                  {filteredTickets.length === 0 ? (
                    <div className="p-8 text-center space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary text-muted-foreground flex items-center justify-center mx-auto">
                        <LifeBuoy className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-foreground">No tickets found</p>
                        <p className="text-[11px] text-muted-foreground">
                          {ticketSearch ? "Try adjusting your search keywords." : "You haven't submitted any support tickets yet."}
                        </p>
                      </div>
                      {!ticketSearch && (
                        <Button
                          onClick={() => setIsCreatingTicket(true)}
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-xs h-7 px-3"
                        >
                          <Plus className="w-3 h-3 mr-1" /> Create Ticket
                        </Button>
                      )}
                    </div>
                  ) : (
                    filteredTickets.map((ticket: any) => {
                      const isSelected = selectedTicket?.id === ticket.id;
                      const statusInfo = getTicketStatusInfo(ticket.status, ticket.assigned_to);
                      return (
                        <div
                          key={ticket.id}
                          onClick={() => setSelectedTicketId(ticket.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                            isSelected
                              ? "bg-primary/10 border-primary/50 shadow-xs ring-1 ring-primary/20"
                              : "bg-secondary/20 hover:bg-secondary/50 border-border/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className="text-[10px] font-mono font-bold text-muted-foreground">
                              #TK-{ticket.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span
                              className={`text-[9.5px] font-mono uppercase font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusInfo.badgeClass}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                              {statusInfo.label}
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-foreground line-clamp-1 mb-1">
                            {ticket.subject || "Support Inquiry"}
                          </h4>

                          <div className="flex items-center justify-between text-[10.5px] text-muted-foreground mt-1">
                            <span className="capitalize text-[10px] font-mono px-1.5 py-0.2 rounded bg-secondary/70">{ticket.type || "Ticket"}</span>
                            <span className="flex items-center gap-1">
                              {statusInfo.isLiveChatable ? (
                                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">Live</span>
                              ) : null}
                              <span>{formatTicketTime(ticket.updated_at || ticket.created_at)}</span>
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Active Ticket Conversation Hub (8 Cols) */}
              <div className="lg:col-span-8 rounded-2xl bg-card border border-border/40 shadow-xs overflow-hidden flex flex-col h-[520px] sm:h-[580px] lg:h-[620px]">
                {selectedTicket ? (
                  <>
                    {/* Ticket Header Bar */}
                    {(() => {
                      const statusInfo = getTicketStatusInfo(selectedTicket.status, selectedTicket.assigned_to);
                      return (
                        <div className="px-4 sm:px-5 py-3 border-b border-border/40 bg-secondary/30 flex items-center justify-between gap-3 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-secondary border border-border/40 text-muted-foreground">
                                #TK-{selectedTicket.id.slice(0, 8).toUpperCase()}
                              </span>
                              <span
                                className={`text-[9.5px] font-mono uppercase font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusInfo.badgeClass}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                                {statusInfo.label}
                              </span>
                            </div>
                            <h3 className="text-xs sm:text-sm font-bold text-foreground truncate mt-1">
                              {selectedTicket.subject || "Support Thread"}
                            </h3>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {selectedTicket.status !== "closed" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={closeSelectedTicket}
                                className="h-7 px-2.5 rounded-lg text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10"
                                title="Close this support ticket"
                              >
                                <Lock className="w-3 h-3 mr-1" /> Close Ticket
                              </Button>
                            )}
                            {statusInfo.isLiveChatable && (
                              <Button
                                size="sm"
                                onClick={() => setTab("chat")}
                                className="h-7 px-2.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white"
                              >
                                <MessageSquare className="w-3 h-3 mr-1" /> Live Chat
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Messages Window */}
                    <div
                      ref={ticketScrollContainerRef}
                      className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5 bg-gradient-to-b from-background/30 to-background/70"
                    >
                      {ticketMessages.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-xs">
                          No messages yet in this ticket thread.
                        </div>
                      ) : (
                        ticketMessages.map((msg: any, idx: number) => {
                          const isUser = msg.sender_type === "user";
                          return (
                            <motion.div
                              key={msg.id || idx}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`flex gap-2.5 sm:gap-3 min-w-0 max-w-full ${isUser ? "justify-end" : "justify-start"}`}
                            >
                              {!isUser && (
                                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-bold">
                                  <Headphones className="w-3.5 h-3.5" />
                                </div>
                              )}

                              <div className={`space-y-1 max-w-[88%] sm:max-w-[80%] min-w-0 ${isUser ? "items-end text-right" : "items-start text-left"}`}>
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground px-1">
                                  <span>{isUser ? "You" : "Orizino Support Specialist"}</span>
                                  <span>•</span>
                                  <span>{formatTicketTime(msg.created_at)}</span>
                                </div>

                                <div
                                  className={`px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm rounded-2xl break-words [overflow-wrap:anywhere] text-left ${
                                    isUser
                                      ? "bg-primary text-primary-foreground rounded-br-xs font-medium"
                                      : "bg-secondary/70 border border-border/40 text-foreground rounded-bl-xs [&_p]:leading-relaxed"
                                  }`}
                                >
                                  <div className="prose prose-sm dark:prose-invert max-w-none break-words min-w-0 [overflow-wrap:anywhere] [&_p]:mb-1 [&_p]:mt-0 text-xs sm:text-sm">
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                  </div>
                                </div>
                              </div>

                              {isUser && (
                                <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                                </div>
                              )}
                            </motion.div>
                          );
                        })
                      )}
                    </div>

                    {/* Reply Composer or Closed Notice */}
                    {selectedTicket.status === "closed" ? (
                      <div className="p-4 bg-secondary/40 border-t border-border/40 text-center space-y-1">
                        <p className="text-xs font-bold text-muted-foreground flex items-center justify-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-muted-foreground" /> This support ticket was marked closed by the administration.
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          If you require further assistance or have a new question, please click "Open Ticket" above.
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 border-t border-border/40 bg-card space-y-2">
                        <div className="flex items-center gap-2 bg-secondary/40 rounded-xl p-1.5 border border-border/40 focus-within:border-primary/50 transition-all">
                          <input
                            value={replyInput}
                            onChange={(e) => setReplyInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendTicketReply()}
                            placeholder="Type your reply to the support team..."
                            className="flex-1 bg-transparent px-3 py-1.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                          />
                          <Button
                            onClick={handleSendTicketReply}
                            disabled={!replyInput.trim() || sendingReply}
                            className="rounded-lg px-3.5 h-8 text-xs font-semibold"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center">
                          Replies are delivered live to our support team. The ticket remains active until resolved.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                    <LifeBuoy className="w-10 h-10 text-muted-foreground" />
                    <p className="text-xs font-semibold text-foreground">Select a support ticket to view conversation</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* Tab 3: Knowledge Base & FAQ */}
        {tab === "faq" && (
          <div className="space-y-5">
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={faqQuery}
                onChange={(e) => setFaqQuery(e.target.value)}
                placeholder="Search topics (e.g. shipping, returns, GSM)..."
                className="w-full bg-card border border-border/60 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {filteredFaqs.map((category) => {
                const Icon = category.icon;
                return (
                  <div key={category.id} className="rounded-2xl bg-card border border-border/40 p-4 sm:p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold font-display text-foreground">{category.title}</h3>
                        <p className="text-[11px] text-muted-foreground">{category.description}</p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1">
                      {category.faqs.map((faq, idx) => {
                        const key = `${category.id}-${idx}`;
                        const isOpen = openFaqIndex === key;
                        return (
                          <div key={key} className="rounded-xl bg-secondary/30 border border-border/30 overflow-hidden">
                            <button
                              onClick={() => setOpenFaqIndex(isOpen ? null : key)}
                              className="w-full px-3.5 py-2.5 text-left flex items-center justify-between text-xs font-semibold text-foreground hover:bg-secondary/50 transition-colors"
                            >
                              <span>{faq.q}</span>
                              <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-90 text-primary" : ""}`} />
                            </button>
                            {isOpen && (
                              <div className="px-3.5 pb-3 pt-1 text-xs text-muted-foreground leading-relaxed border-t border-border/20 bg-background/30">
                                <ReactMarkdown>{faq.a}</ReactMarkdown>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Call History */}
        {tab === "history" && (
          <div className="rounded-2xl bg-card border border-border/40 p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold font-display text-foreground">Voice Call History</h2>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">Review past WebRTC voice support calls</p>
                </div>
              </div>

              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
                Encrypted Logs
              </span>
            </div>

            <CallHistoryList limit={50} />
          </div>
        )}

        {/* Tab 4: Notifications Settings */}
        {tab === "settings" && (
          <div className="max-w-2xl mx-auto rounded-2xl bg-card border border-border/40 p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-4 border-b border-border/40 pb-4">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${pushPermission === "granted" ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"}`}>
                {pushPermission === "granted" ? <BellRing className="w-4 h-4 sm:w-5 sm:h-5" /> : <BellOff className="w-4 h-4 sm:w-5 sm:h-5" />}
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold font-display text-foreground">Real-Time Call Alerts</h2>
                <p className="text-[11px] sm:text-xs text-muted-foreground">Receive push notifications when agents call you</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-secondary/30 border border-border/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-foreground">Browser Push Status</h4>
                  <p className="text-[11px] text-muted-foreground">
                    {pushPermission === "granted" ? "Subscribed on this browser" : "Not enabled"}
                  </p>
                </div>
                <Button
                  onClick={handleEnablePush}
                  disabled={pushBusy || pushPermission === "granted" || pushPermission === "unsupported"}
                  className="rounded-lg text-xs h-8 px-3"
                >
                  {pushPermission === "granted" ? "Subscribed" : pushBusy ? "Enabling..." : "Enable Push"}
                </Button>
              </div>

              {lastPushUpdate && (
                <p className="text-[10px] font-mono text-muted-foreground border-t border-border/30 pt-2">
                  Last sync: {new Date(lastPushUpdate).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default SupportPage;
