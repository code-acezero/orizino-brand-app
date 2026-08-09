"use client";
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, User, Headphones, Phone, PhoneOff, Mic, MicOff, AlertTriangle, MessageSquare, ChevronDown, Paperclip, Smile, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "@/lib/router-compat";
import { useServerFn } from "@/lib/server-fn-compat";
import { flagHandoffToHuman } from "@/lib/ai-handoff.functions";
import ReactMarkdown from "react-markdown";
import { toast } from "@/lib/app-toast";
import { getIceServers } from "@/lib/ice-servers";
import { playRingtone, stopRingtone } from "@/lib/sounds";
import { useAiWidgetSettings } from "@/hooks/use-ai-widget-settings";
import { useAdaptivePolling } from "@/hooks/use-adaptive-polling";


interface Attachment {
  url: string;
  type: "image" | "file";
  name?: string;
  mime?: string;
}

interface Msg {
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: Attachment[];
}

/* ── Floating bubble particles ── */
const BubbleParticle = ({ delay, size, x, y, duration }: { delay: number; size: number; x: number; y: number; duration: number }) => (
  <motion.div
    className="absolute rounded-full bg-primary/25 pointer-events-none"
    style={{ width: size, height: size, left: x, top: y, willChange: "transform, opacity" }}
    animate={{
      y: [0, -20, -40, -20, 0],
      x: [0, 8, -6, 4, 0],
      opacity: [0, 0.6, 0.8, 0.4, 0],
      scale: [0.6, 1, 1.1, 0.9, 0.6],
    }}
    transition={{ repeat: Infinity, duration, delay, ease: "easeInOut" }}
  />
);

/** Hook: manage FAB visibility based on fast scroll on mobile & nav overlay open */
function useFabVisibility() {
  const [visible, setVisible] = useState(true);
  const fastScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let lastY = window.scrollY;
    let lastTime = performance.now();
    let ticking = false;

    const checkState = () => {
      const isMobile = window.innerWidth < 768;
      const navOverlayOpen = document.body.getAttribute("data-nav-overlay") === "true" || document.body.style.overflow === "hidden";

      // 1. On mobile: hide FAB if search or side menu is open!
      if (isMobile && navOverlayOpen) {
        setVisible(false);
        return;
      }

      const y = window.scrollY;
      const now = performance.now();
      const dt = Math.max(1, now - lastTime);
      const dy = Math.abs(y - lastY);
      const velocity = dy / dt; // px/ms

      lastY = y;
      lastTime = now;

      // 2. On mobile: hide ONLY on FAST scroll
      if (isMobile && (dy > 28 || velocity > 0.75)) {
        setVisible(false);
        if (fastScrollTimer.current) clearTimeout(fastScrollTimer.current);
        fastScrollTimer.current = setTimeout(() => {
          const isNavOpenNow = document.body.getAttribute("data-nav-overlay") === "true" || document.body.style.overflow === "hidden";
          if (!isNavOpenNow) {
            setVisible(true);
          }
        }, 350);
      } else {
        // Normal scroll on desktop & mobile: DO NOT HIDE!
        if (!navOverlayOpen) {
          setVisible(true);
        }
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        checkState();
      });
    };

    // MutationObserver to instantly hide FAB when data-nav-overlay attribute or overflow changes on body
    const observer = new MutationObserver(() => {
      const isMobile = window.innerWidth < 768;
      const navOverlayOpen = document.body.getAttribute("data-nav-overlay") === "true" || document.body.style.overflow === "hidden";
      if (isMobile && navOverlayOpen) {
        setVisible(false);
      } else if (!navOverlayOpen) {
        setVisible(true);
      }
    });

    observer.observe(document.body, { attributes: true, attributeFilter: ["data-nav-overlay", "style", "class"] });

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", checkState, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", checkState);
      observer.disconnect();
      if (fastScrollTimer.current) clearTimeout(fastScrollTimer.current);
    };
  }, []);

  return visible;
}

/** Hook: detect prefers-reduced-motion */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

/** Hook: pause heavy animations when tab is hidden */
function useDocumentVisible() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  return visible;
}

/* ── Inline Incoming Call UI (inside widget) ── */
const IncomingCallWidget: React.FC<{
  visible: boolean;
  onAccept: () => void;
  onReject: () => void;
}> = ({ visible, onAccept, onReject }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="border-b border-border/50 overflow-hidden"
      >
        <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
              <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                <Phone className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Incoming Voice Call</p>
              <p className="text-[11px] text-muted-foreground">Support agent calling...</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={onReject}
              className="w-11 h-11 rounded-full bg-destructive/90 hover:bg-destructive flex items-center justify-center transition-all shadow-lg"
            >
              <PhoneOff className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={onAccept}
              className="w-11 h-11 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-all shadow-lg animate-pulse"
            >
              <Phone className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

const fmtDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

/* ── Active Call Panel — premium, concentric pulse rings ── */
const ActiveCallWidget: React.FC<{
  duration: number;
  muted: boolean;
  onToggleMute: () => void;
  onHangup: () => void;
}> = ({ duration, muted, onToggleMute, onHangup }) => {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden border-b border-emerald-500/20"
    >
      <div className="relative px-4 py-5 bg-gradient-to-br from-emerald-500/12 via-emerald-500/5 to-transparent">
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
        <div className="flex items-center gap-4">
          {/* Concentric pulse rings */}
          <div className="relative w-14 h-14 flex items-center justify-center">
            {[0, 0.4, 0.8].map((d, i) => (
              <motion.span
                key={i}
                className="absolute inset-0 rounded-full border border-emerald-400/40"
                animate={{ scale: [1, 1.6], opacity: [0.7, 0] }}
                transition={{ repeat: Infinity, duration: 1.8, delay: d, ease: "easeOut" }}
              />
            ))}
            <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_8px_24px_-6px_hsl(152_82%_45%/0.6)] flex items-center justify-center">
              <Phone className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-500/90 font-semibold">Voice Call</p>
            <p className="text-sm font-medium text-foreground/90 truncate">Connected with agent</p>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{fmtDuration(duration)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className={`w-10 h-10 rounded-full border transition-all flex items-center justify-center backdrop-blur-sm ${
                muted
                  ? "bg-destructive/15 border-destructive/40 text-destructive hover:bg-destructive/25"
                  : "bg-card/60 border-border/60 text-foreground/80 hover:bg-card"
              }`}
            >
              {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              onClick={onHangup}
              aria-label="End call"
              className="w-10 h-10 rounded-full bg-destructive text-white shadow-[0_6px_18px_-4px_hsl(0_84%_60%/0.55)] hover:bg-destructive/90 transition-all flex items-center justify-center"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ── Dynamic Island-style call pill (when chat is closed) ── */
const CallIslandPill: React.FC<{
  duration: number;
  muted: boolean;
  onExpand: () => void;
  onToggleMute: () => void;
  onHangup: () => void;
}> = ({ duration, muted, onExpand, onToggleMute, onHangup }) => (
  <motion.div
    initial={{ y: -40, opacity: 0, scale: 0.9 }}
    animate={{ y: 0, opacity: 1, scale: 1 }}
    exit={{ y: -40, opacity: 0, scale: 0.9 }}
    transition={{ type: "spring", stiffness: 400, damping: 28 }}
    className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] pointer-events-auto"
  >
    <div className="relative flex items-center gap-2 pl-2 pr-1 py-1.5 rounded-full bg-black/85 backdrop-blur-xl border border-emerald-500/30 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)]">
      <button
        onClick={onExpand}
        className="flex items-center gap-2 pl-1 pr-2 py-0.5 rounded-full hover:bg-white/5 transition-colors"
        aria-label="Expand call"
      >
        <span className="relative flex w-2.5 h-2.5">
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
          <span className="relative w-2.5 h-2.5 rounded-full bg-emerald-400" />
        </span>
        <span className="text-[12px] font-medium text-white/90 font-mono tabular-nums">{fmtDuration(duration)}</span>
      </button>
      <button
        onClick={onToggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
          muted ? "bg-destructive/30 text-destructive" : "bg-white/10 text-white/80 hover:bg-white/20"
        }`}
      >
        {muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
      </button>
      <button
        onClick={onHangup}
        aria-label="End call"
        className="w-7 h-7 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/90 transition-colors"
      >
        <PhoneOff className="w-3.5 h-3.5" />
      </button>
    </div>
  </motion.div>
);

const AIChatWidget: React.FC = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "complaint">("chat");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Complaint state
  const [complaintSubject, setComplaintSubject] = useState("");
  const [complaintCategory, setComplaintCategory] = useState("Order Issue");
  const [complaintDescription, setComplaintDescription] = useState("");
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [liveConvId, setLiveConvId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollVisible = useFabVisibility();
  const handoffFn = useServerFn(flagHandoffToHuman);
  const prefersReducedMotion = usePrefersReducedMotion();
  const docVisible = useDocumentVisible();
  const isSmallScreen = typeof window !== "undefined" ? window.innerWidth < 640 : false;


  // Call state
  const [incomingCall, setIncomingCall] = useState(false);

  // Admin-managed widget config (texts, greetings, premade questions, welcome)
  const { data: widgetSettings } = useAiWidgetSettings();

  // Track whether user has sent a message in this session (controls premade chips)
  const [hasSentMessage, setHasSentMessage] = useState(false);
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [welcomeText, setWelcomeText] = useState("");

  // Play/stop ringtone on incoming call
  useEffect(() => {
    if (incomingCall) { playRingtone(); } else { stopRingtone(); }
    return () => stopRingtone();
  }, [incomingCall]);
  const [callActive, setCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callMuted, setCallMuted] = useState(false);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callChannelRef = useRef<any>(null);
  const pendingOfferRef = useRef<string | null>(null);

  // Smart positioning
  const [mascotBottomPx, setMascotBottomPx] = useState(80);
  useEffect(() => {
    let ticking = false;
    let last = -1;
    const compute = () => {
      ticking = false;
      if (window.innerWidth >= 1024) {
        if (last !== 24) { last = 24; setMascotBottomPx(24); }
        return;
      }
      const bottomNavTray = document.getElementById("mobile-bottom-nav-tray");
      const stickyBar = document.getElementById("sticky-add-to-cart");
      let highestTop = window.innerHeight - 64;
      if (bottomNavTray) highestTop = Math.min(highestTop, bottomNavTray.getBoundingClientRect().top);
      if (stickyBar) highestTop = Math.min(highestTop, stickyBar.getBoundingClientRect().top);
      const offset = Math.max(window.innerHeight - highestTop + 12, 80);
      if (Math.abs(offset - last) > 1) { last = offset; setMascotBottomPx(offset); }
    };
    const schedule = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    // Light fallback poll (2s) for layout shifts that don't trigger scroll/resize
    // — e.g. sticky bars appearing. Much cheaper than 1s.
    const interval = setInterval(schedule, 2000);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      clearInterval(interval);
    };
  }, []);

  // Draggable launcher position (persisted, snaps to nearest horizontal edge)
  const [launcherPos, setLauncherPos] = useState<{ edge: "left" | "right"; yPercent: number | null }>(() => {
    if (typeof window === "undefined") return { edge: "right", yPercent: null };
    try {
      const raw = localStorage.getItem("ai-launcher-pos");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.edge === "left" || parsed.edge === "right")) return parsed;
      }
    } catch {}
    return { edge: "right", yPercent: null };
  });
  const dragRef = useRef<{ active: boolean; moved: boolean; startX: number; startY: number; curX: number; curY: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragXY, setDragXY] = useState<{ x: number; y: number } | null>(null);

  const handleLauncherPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { active: true, moved: false, startX: e.clientX, startY: e.clientY, curX: e.clientX, curY: e.clientY };
  };
  const handleLauncherPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current; if (!d || !d.active) return;
    const dx = e.clientX - d.startX, dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) > 6) { d.moved = true; setDragging(true); }
    if (d.moved) { d.curX = e.clientX; d.curY = e.clientY; setDragXY({ x: e.clientX, y: e.clientY }); }
  };
  const handleLauncherPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current; if (!d) return;
    if (d.moved) {
      const edge: "left" | "right" = d.curX < window.innerWidth / 2 ? "left" : "right";
      const margin = 80;
      const y = Math.max(margin, Math.min(window.innerHeight - margin, d.curY));
      const yPercent = y / window.innerHeight;
      const next = { edge, yPercent };
      setLauncherPos(next);
      try { localStorage.setItem("ai-launcher-pos", JSON.stringify(next)); } catch {}
      // suppress click
      setTimeout(() => { dragRef.current = null; setDragging(false); setDragXY(null); }, 0);
      e.preventDefault();
      return;
    }
    dragRef.current = null; setDragging(false); setDragXY(null);
  };


  const isAdminPage = location.pathname.startsWith("/origin");
  const isLandingPage = false; // "/" is the storefront home, not a company landing page

  const { data: aiConfig } = useQuery({
    queryKey: ["ai-agent-config"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "ai_agent_config").maybeSingle();
      const raw = (data?.value as any) || {};
      // Settings rows may be stored as { value: {...} } via the shared hook,
      // or as the flat object directly. Unwrap defensively.
      return raw && typeof raw === "object" && "value" in raw && typeof raw.value === "object"
        ? raw.value
        : raw;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const isEnabled = aiConfig?.is_enabled !== false;
  const agentName = aiConfig?.name || "";
  const welcomeMessage = aiConfig?.welcome_message || "Hi! How can I help you?";
  const avatarType = aiConfig?.avatar_type || "emoji";
  const avatarUrl = aiConfig?.avatar_url || "";
  const avatarEmoji = aiConfig?.avatar_emoji || "";

  // Floating bubble (FAB) admin-driven look & feel
  const fabBubbleColor: string = aiConfig?.fab_bubble_color || "hsl(var(--primary))";
  const fabBubbleColor2: string = aiConfig?.fab_bubble_color2 || "hsl(var(--accent))";
  const fabBubbleStyle: "solid" | "transparent" | "glass" | "water" =
    (aiConfig?.fab_bubble_style as "solid" | "transparent" | "glass" | "water") || "solid";
  const fabBubbleBackground =
    fabBubbleStyle === "transparent"
      ? `radial-gradient(120% 90% at 30% 22%, ${fabBubbleColor2}33, ${fabBubbleColor}22 65%)`
      : fabBubbleStyle === "glass"
      ? `radial-gradient(120% 90% at 30% 22%, ${fabBubbleColor2}66, ${fabBubbleColor}55 65%)`
      : fabBubbleStyle === "water"
      ? `radial-gradient(60% 45% at 32% 25%, rgba(255,255,255,0.35), rgba(255,255,255,0.02) 60%), radial-gradient(130% 95% at 70% 85%, ${fabBubbleColor}55, ${fabBubbleColor2}33 55%, rgba(8,18,34,0.55) 95%)`
      : `radial-gradient(120% 90% at 30% 22%, ${fabBubbleColor2}dd, ${fabBubbleColor} 65%)`;
  const fabBubbleExtraClass =
    fabBubbleStyle === "glass"
      ? "backdrop-blur-xl"
      : fabBubbleStyle === "water"
      ? "backdrop-blur-md"
      : "";
  const fabEnergyColor: string = aiConfig?.fab_energy_color || "#ef4444";
  const fabEnergyEnabled: boolean = aiConfig?.fab_enable_energy !== false;
  const fabEnergyInterval: number = Math.max(2, Number(aiConfig?.fab_energy_interval ?? 5));
  const fabShowHoverLabel: boolean = aiConfig?.fab_show_hover_label !== false;
  const fabHoverLabel: string = aiConfig?.fab_hover_label_text || "Chat with us";
  const fabSize: number = Math.max(44, Math.min(96, Number(aiConfig?.fab_size ?? 56)));
  // Floating texts now come from the admin-managed widget settings table.
  const fabUnderwaterTexts: string[] = useMemo(() => {
    return widgetSettings?.fab_floating_texts?.length
      ? widgetSettings.fab_floating_texts
      : ["Ask Agent Flow", "Find your style", "Track an order", "Need a recommendation?"];
  }, [widgetSettings?.fab_floating_texts]);
  const fabAnimationIntensity = Math.max(1, Math.min(10, widgetSettings?.fab_animation_intensity ?? 5));
  const fabShowAvatarInline = widgetSettings?.fab_show_avatar_inline ?? true;

  // Rotate underwater label
  const [underwaterIdx, setUnderwaterIdx] = useState(0);
  // Sometimes (every ~3rd cycle) we show the avatar inline instead of a text.
  const showAvatarInlineNow =
    fabShowAvatarInline && underwaterIdx % 3 === 2 && avatarType === "image" && !!avatarUrl;
  useEffect(() => {
    if (!fabUnderwaterTexts.length) return;
    const id = setInterval(() => setUnderwaterIdx((i) => (i + 1) % fabUnderwaterTexts.length), 2600);
    return () => clearInterval(id);
  }, [fabUnderwaterTexts.length]);

  const AgentAvatar = React.memo(({ size = "w-8 h-8", iconSize = "w-4 h-4" }: { size?: string; iconSize?: string }) =>
    avatarType === "image" && avatarUrl ? (
      <img src={avatarUrl} alt={agentName} className={`${size} object-contain`} loading="eager" decoding="async" style={{ background: "transparent" }} />
    ) : (
      <div className={`${size} flex items-center justify-center bg-transparent`}>
        {avatarEmoji ? <span className={iconSize === "w-4 h-4" ? "text-base" : "text-sm"}>{avatarEmoji}</span> : <Bot className={`${iconSize} text-primary`} />}
      </div>
    )
  );

  // Fetch previous conversations (read-only display)
  const { data: pastConversations = [] } = useQuery({
    queryKey: ["user-past-convs", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("support_conversations")
        .select("id, subject, status, created_at")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      return data || [];
    },
    enabled: !!user && open,
    staleTime: 30_000,
  });

  const liveMsgPoll = useAdaptivePolling(15000);
  const { data: liveMessages = [] } = useQuery({
    queryKey: ["live-support-messages", liveConvId],
    queryFn: async () => {
      if (!liveConvId) return [];
      const { data } = await supabase.from("support_messages").select("*").eq("conversation_id", liveConvId).order("created_at");
      return data || [];
    },
    enabled: !!liveConvId && liveMode,
    refetchInterval: liveMsgPoll,
    refetchIntervalInBackground: false,
    staleTime: 5000,
  });

  // Listen for incoming calls on any active conversation
  useEffect(() => {
    if (!user) return;

    // Find active conversation to listen on
    const setupCallChannel = async () => {
      const { data } = await supabase
        .from("support_conversations")
        .select("id")
        .eq("user_id", user.id)
        .in("status", ["open", "assigned"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data?.id) return;

      const channel = supabase.channel(`call-${data.id}`, {
        config: { broadcast: { self: false } },
      });

      channel.on("broadcast", { event: "call-request" }, ({ payload }) => {
        if (payload.action === "incoming") {
          setIncomingCall(true);
          // Do NOT auto-open the chat panel — the bubble itself rings.
          setTimeout(() => setIncomingCall(false), 30000);
        }
      });

      channel.on("broadcast", { event: "call-signal" }, async ({ payload }) => {
        if (payload.type === "offer" && payload.from === "admin") {
          // If peer connection already exists (user accepted), process immediately
          const pc = peerRef.current;
          if (pc && pc.signalingState !== "closed") {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: payload.sdp }));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              callChannelRef.current?.send({
                type: "broadcast",
                event: "call-signal",
                payload: { type: "answer", sdp: answer.sdp, from: "user" },
              });
            } catch (err) {
              console.error("Failed to process offer:", err);
            }
          } else {
            // Store for later processing in acceptCall
            pendingOfferRef.current = payload.sdp;
          }
        }
        if (payload.type === "ice-candidate" && payload.from === "admin" && peerRef.current) {
          try {
            await peerRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (err) {
            console.error("Failed to add ICE candidate:", err);
          }
        }
        if (payload.type === "hangup") {
          hangupCall();
        }
      });

      channel.subscribe();
      callChannelRef.current = channel;
    };

    setupCallChannel();

    return () => {
      if (callChannelRef.current) {
        supabase.removeChannel(callChannelRef.current);
        callChannelRef.current = null;
      }
    };
  }, [user?.id, liveConvId]);

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

      const iceServers = await getIceServers();
      const pc = new RTCPeerConnection({
        iceServers: iceServers as RTCIceServer[],
      });
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
          timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
        }
        if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
          hangupCall();
        }
      };

      if (pendingOfferRef.current) {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: pendingOfferRef.current }));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        callChannelRef.current?.send({
          type: "broadcast",
          event: "call-signal",
          payload: { type: "answer", sdp: answer.sdp, from: "user" },
        });
      }
      // Don't set callActive here — wait for ICE connected state
    } catch (err) {
      console.error("Failed to accept call:", err);
    }
  };

  const rejectCall = () => {
    setIncomingCall(false);
    callChannelRef.current?.send({
      type: "broadcast",
      event: "call-response",
      payload: { action: "rejected" },
    });
  };

  const hangupCall = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    pendingOfferRef.current = null;
    setCallActive(false);
    setCallDuration(0);
    setCallMuted(false);
  }, []);

  const toggleCallMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
      setCallMuted(!callMuted);
    }
  };

  useEffect(() => {
    if (!liveConvId || !liveMode) return;
    const channel = supabase
      .channel(`widget-live-${liveConvId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${liveConvId}` },
        () => qc.invalidateQueries({ queryKey: ["live-support-messages", liveConvId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [liveConvId, liveMode, qc]);

  useEffect(() => {
    if (!liveConvId || !liveMode) return;
    const check = async () => {
      const { data } = await supabase.from("support_conversations").select("status").eq("id", liveConvId).maybeSingle();
      if (data?.status === "closed") {
        setLiveMode(false);
        setMessages(prev => [...prev, { role: "assistant", content: "The live support session has ended. I'm back to assist you! 😊" }]);
      }
    };
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [liveConvId, liveMode]);

  useEffect(() => {
    if (!liveMode || liveMessages.length === 0) return;
    const converted: Msg[] = liveMessages.map((m: any) => ({
      role: m.sender_type === "user" ? "user" as const : "assistant" as const,
      content: m.content,
    }));
    setMessages(converted);
  }, [liveMessages, liveMode]);

  // Resolve a display name for the user (used in greeting templates).
  const userDisplayName = React.useMemo(() => {
    if (!user) return "";
    const meta = (user as any)?.user_metadata || {};
    const full = (meta.full_name || meta.name || "").trim();
    if (full) return full.split(/\s+/)[0];
    const email = user.email || "";
    return email ? email.split("@")[0] : "";
  }, [user]);

  // Seed first chat greeting (admin-managed) when the panel opens.
  useEffect(() => {
    if (open && messages.length === 0 && !liveMode && widgetSettings) {
      const tmpl = user
        ? widgetSettings.chat_greeting_logged_in
        : widgetSettings.chat_greeting_guest;
      const greeting = (tmpl || welcomeMessage)
        .replace(/\{name\}/gi, userDisplayName || "there")
        .replace(/\{brand\}/gi, "Orizino");
      setMessages([{ role: "assistant", content: greeting }]);
    }
  }, [open, welcomeMessage, widgetSettings, user, userDisplayName, liveMode]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Build a compact snapshot of the current page so the AI can give page-aware help.
  const buildPageContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    try {
      const path = location.pathname || window.location.pathname;
      const title = document.title || "";
      // Grab the most informative text on the page (main > h1/h2 + first paragraph fallback).
      const main = document.querySelector("main") || document.body;
      const raw = (main?.innerText || "").replace(/\s+/g, " ").trim();
      return { path, title, excerpt: raw.slice(0, 800) };
    } catch {
      return { path: location.pathname };
    }
  }, [location.pathname]);

  // Create temporary in-memory attachments using blob URLs.
  // These are NOT persisted to storage/database and are cleared when the tab closes.
  const uploadFiles = useCallback(async (files: File[]) => {
    if (!files.length) return [] as Attachment[];
    setUploading(true);
    const out: Attachment[] = [];
    try {
      for (const f of files) {
        if (f.size > 10 * 1024 * 1024) {
          toast.error(`${f.name} is too large (10MB max)`);
          continue;
        }
        const url = URL.createObjectURL(f);
        out.push({
          url,
          type: f.type.startsWith("image/") ? "image" : "file",
          name: f.name,
          mime: f.type,
        });
      }
    } finally {
      setUploading(false);
    }
    return out;
  }, []);


  const handlePickFiles = useCallback(async (fileList: FileList | File[] | null) => {
    if (!fileList) return;
    const files = Array.from(fileList);
    const attachments = await uploadFiles(files);
    if (attachments.length) setPendingAttachments((prev) => [...prev, ...attachments]);
  }, [uploadFiles]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const it of Array.from(items)) {
      if (it.kind === "file") {
        const f = it.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length) {
      e.preventDefault();
      await handlePickFiles(files);
    }
  }, [handlePickFiles]);

  const removePendingAttachment = (url: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.url !== url));
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if ((!text && pendingAttachments.length === 0) || loading) return;
    setHasSentMessage(true);
    // Guests asking for a human agent → prompt login/register instead of calling AI
    if (!user && text) {
      const wantsHuman = /\b(human|live\s*(agent|support|chat)?|real\s*person|talk\s*to\s*(a\s*)?(human|person|agent|someone)|customer\s*(support|service)|connect\s*(me\s*)?(to|with)\s*(a\s*)?(human|agent|person)|speak\s*to\s*(a\s*)?(human|agent|person))\b/i.test(text);
      if (wantsHuman) {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: text },
          {
            role: "assistant",
            content:
              "To connect with a human agent, please sign in or create an account first — this lets our team see your order history and reply to you securely.\n\n👉 [Sign in or register](/auth)",
          },
        ]);
        setInput("");
        setPendingAttachments([]);
        return;
      }
    }

    if (liveMode && liveConvId && user) {
      const content = text || (pendingAttachments[0]?.url ?? "");
      setInput("");
      setPendingAttachments([]);
      await supabase.from("support_messages").insert({ conversation_id: liveConvId, sender_id: user.id, sender_type: "user", content });
      await supabase.from("support_conversations").update({ updated_at: new Date().toISOString() }).eq("id", liveConvId);
      return;
    }
    const userMsg: Msg = {
      role: "user",
      content: text,
      attachments: pendingAttachments.length ? pendingAttachments : undefined,
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setPendingAttachments([]);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: newMessages.filter((m) => m.role !== "system"),
          context: {
            userId: user?.id,
            locale: (typeof navigator !== "undefined" && navigator.language?.startsWith("bn")) ? "bn" : "en",
            page: buildPageContext(),
          },
        },
      });
      if (error) throw error;
      setMessages((prev) => [...prev, { role: "assistant", content: data?.reply || "Sorry, I couldn't process that." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }, [input, pendingAttachments, messages, loading, user, liveMode, liveConvId, buildPageContext]);

  // Send a premade question (used by quick-reply chips).
  const sendPremade = useCallback((q: string) => {
    if (loading) return;
    setHasSentMessage(true);
    setInput("");
    const userMsg: Msg = { role: "user", content: q };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("ai-chat", {
          body: {
            messages: newMessages.filter((m) => m.role !== "system"),
            context: { userId: user?.id, locale: "en", page: buildPageContext() },
          },
        });
        if (error) throw error;
        setMessages((prev) => [...prev, { role: "assistant", content: data?.reply || "Sorry, I couldn't process that." }]);
      } catch {
        setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
      } finally {
        setLoading(false);
      }
    })();
  }, [loading, messages, user, buildPageContext]);

  // Cinematic welcome: shown at most once per day per browser.
  useEffect(() => {
    if (!widgetSettings || !widgetSettings.welcome_enabled) return;
    if (isAdminPage || isLandingPage || !isEnabled) return;
    if (typeof window === "undefined") return;

    const today = new Date().toISOString().slice(0, 10);
    const shownKey = user ? `u:${user.id}` : "guest";
    let shown = "";
    let lastVisit = "";
    try {
      shown = localStorage.getItem("orizino:welcomeShownOn") || "";
      lastVisit = localStorage.getItem("orizino:lastVisit") || "";
    } catch {}
    // Re-greet whenever the auth identity changes (e.g. after login),
    // even if a greeting was already shown earlier today as a guest.
    if (shown === `${today}|${shownKey}`) {
      try { localStorage.setItem("orizino:lastVisit", today); } catch {}
      return;
    }

    const pick = (arr: string[]) => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : "");
    let template = "";
    if (user && widgetSettings.welcome_returning_logged_in.length) {
      template = pick(widgetSettings.welcome_returning_logged_in);
    } else if (!lastVisit) {
      template = widgetSettings.welcome_first_time;
    } else {
      const days = Math.max(0, Math.floor((Date.now() - new Date(lastVisit).getTime()) / 86400000));
      if (days <= 1) template = pick(widgetSettings.welcome_returning_today);
      else if (days <= 7) template = pick(widgetSettings.welcome_returning_week);
      else template = pick(widgetSettings.welcome_returning_long);
    }
    if (!template) template = widgetSettings.welcome_first_time;

    const finalText = template
      .replace(/\{name\}/gi, userDisplayName || "there")
      .replace(/\{brand\}/gi, "Orizino");

    // Delay a moment so the FAB has mounted/positioned first.
    const t = setTimeout(() => {
      setWelcomeText(finalText);
      setWelcomeVisible(true);
      try {
        localStorage.setItem("orizino:welcomeShownOn", `${today}|${shownKey}`);
        localStorage.setItem("orizino:lastVisit", today);
      } catch {}
    }, 900);
    const holdMs = Math.max(1500, widgetSettings.welcome_cinematic_duration_ms ?? 3000);
    const tHide = setTimeout(() => setWelcomeVisible(false), 900 + holdMs);
    return () => { clearTimeout(t); clearTimeout(tHide); };
    // Run once per settings load; gating via localStorage prevents repeats.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetSettings?.id, isAdminPage, isLandingPage, isEnabled, user?.id]);

  const requestLiveSupport = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: conv } = await supabase.from("support_conversations").insert({
        user_id: user.id, subject: "Live Support Request", is_ai: false, status: "open",
      }).select().single();
      if (conv) {
        await supabase.from("support_messages").insert({ conversation_id: conv.id, sender_id: user.id, sender_type: "user", content: "Requested live support from chat widget." });
        // Best-effort: legacy edge notifier + new handoff flag + Telegram broadcast
        supabase.functions.invoke("notify-live-support", { body: { conversation_id: conv.id } }).catch(() => {});
        try {
          // Summarize last few AI turns for the admin handoff context
          const recent = messages.slice(-4).map((m) => `${m.role}: ${m.content}`).join("\n").slice(0, 600);
          await handoffFn({ data: { conversation_id: conv.id, summary: recent || "Requested live support from chat widget." } });
        } catch (e) {
          console.warn("[handoff] failed", e);
        }
        setLiveConvId(conv.id);
        setLiveMode(true);
        setMessages([{ role: "assistant", content: "🎧 Connecting you to live support... An agent will join shortly." }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Couldn't connect to live support right now." }]);
    } finally {
      setLoading(false);
    }
  };


  const requestCall = async () => {
    if (!user || !liveConvId) return;
    // Send a message requesting a call
    await supabase.from("support_messages").insert({
      conversation_id: liveConvId, sender_id: user.id, sender_type: "user",
      content: "📞 I'd like to request a voice call with a support agent.",
    });
    // Also create a notification for admins
    await supabase.from("notifications").insert({
      title: "📞 Call Request",
      message: "A customer is requesting a voice call.",
      type: "support",
      priority: "high",
      link_url: "/origin/support",
    });
    toast.success("Call request sent to support agent");
  };

  const submitComplaint = async () => {
    if (!user) { toast.error("Please sign in to submit a complaint"); return; }
    if (!complaintSubject.trim() || !complaintDescription.trim()) { toast.error("Please fill in all fields"); return; }
    setSubmittingComplaint(true);
    try {
      const { data: conv } = await supabase.from("support_conversations").insert({
        user_id: user.id,
        subject: `[${complaintCategory}] ${complaintSubject}`,
        status: "open",
        is_ai: false,
        type: "complaint",
      } as any).select("id").single();
      if (conv) {
        await supabase.from("support_messages").insert({
          conversation_id: conv.id,
          content: `**Category:** ${complaintCategory}\n\n${complaintDescription}`,
          sender_id: user.id,
          sender_type: "user",
        });
      }
      toast.success("Complaint submitted successfully!");
      setComplaintSubject("");
      setComplaintDescription("");
      setComplaintCategory("Order Issue");
      setActiveTab("chat");
    } catch {
      toast.error("Failed to submit complaint");
    }
    setSubmittingComplaint(false);
  };

  if (isAdminPage || isLandingPage || !isEnabled) return null;

  // Keep the bubble visible during calls so it can morph into the call UI.
  const showMascot = !open && (scrollVisible || welcomeVisible);
  const showCallRing = incomingCall && !open;
  const showCallPill = false; // replaced by in-bubble call UI

  return (
    <>
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* (Cinematic welcome is now rendered as the FAB itself morphing larger — see below.) */}

      {/* Dynamic Island-style call pill (chat closed, call active) */}
      <AnimatePresence>
        {showCallPill && (
          <CallIslandPill
            duration={callDuration}
            muted={callMuted}
            onExpand={() => setOpen(true)}
            onToggleMute={toggleCallMute}
            onHangup={hangupCall}
          />
        )}
      </AnimatePresence>

      {/* Floating water-bubble launcher */}
      <AnimatePresence mode="popLayout">
        {(showMascot || showCallRing) && (
          <motion.button
            key="ai-bubble-launcher"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0, filter: "blur(6px)" }}
            transition={{ type: "spring", stiffness: 320, damping: 22, mass: 0.7 }}
            onClick={(e) => {
              if (dragRef.current?.moved) { e.preventDefault(); e.stopPropagation(); return; }
              if (incomingCall) { acceptCall(); return; }
              setOpen(true);
            }}
            onPointerDown={handleLauncherPointerDown}
            onPointerMove={handleLauncherPointerMove}
            onPointerUp={handleLauncherPointerUp}
            onPointerCancel={handleLauncherPointerUp}
            className={`fixed z-[10001] group ${dragging ? "" : "transition-all duration-300"} touch-none select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
            style={
              dragging && dragXY
                ? { left: dragXY.x - 32, top: dragXY.y - 32 }
                : launcherPos.yPercent != null
                ? {
                    [launcherPos.edge]: "clamp(16px, 2.5vw, 40px)",
                    top: `${Math.max(8, Math.min(92, launcherPos.yPercent * 100))}%`,
                    transform: "translateY(-50%)",
                  } as React.CSSProperties
                : { [launcherPos.edge]: "clamp(16px, 2.5vw, 40px)", bottom: mascotBottomPx }
            }
            aria-label="Open support chat (drag to reposition)"
          >
            {(() => {
              // Greeting mode: the FAB itself grows into a wide rounded-rect bubble.
              const greetingShowing = welcomeVisible && !open;
              // Compute greeting dimensions (responsive, capped to viewport).
              const vw = typeof window !== "undefined" ? window.innerWidth : 420;
              const greetW = Math.min(320, vw - 32);
              const greetH = 96;

              // When incoming, bubble grows big & vibrates. Active call → normal size.
              const renderSize = incomingCall ? Math.round(fabSize * 1.9) : fabSize;
              const boxW = greetingShowing ? greetW : renderSize;
              const boxH = greetingShowing ? greetH : renderSize;
              // Green for active chat/call when minimized, otherwise admin-defined energy color.
              const activeGreen = (callActive || liveMode) && !incomingCall;
              const energyColor = activeGreen ? "#22c55e" : fabEnergyColor;
              const glowColor = incomingCall
                ? "rgba(34,197,94,0.6)"
                : activeGreen
                  ? "rgba(34,197,94,0.45)"
                  : `${fabBubbleColor}66`;

              return (
                <motion.div
                  className="relative"
                  animate={{ width: boxW, height: boxH }}
                  transition={{ type: "spring", stiffness: 260, damping: 28, mass: 0.9 }}
                  style={{ width: boxW, height: boxH }}
                >
                  {/* Incoming call concentric rings */}
                  {incomingCall && (
                    <>
                      <motion.div
                        className="absolute inset-[-18px] rounded-full border-2 border-green-500/60"
                        animate={{ scale: [1, 1.55, 1], opacity: [0.85, 0, 0.85] }}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                      />
                      <motion.div
                        className="absolute inset-[-9px] rounded-full border-2 border-green-400/80"
                        animate={{ scale: [1, 1.3, 1], opacity: [1, 0.25, 1] }}
                        transition={{ repeat: Infinity, duration: 1, delay: 0.3 }}
                      />
                    </>
                  )}

                  {/* Aurora glow — subtle light ambient halo */}
                  <motion.div
                    className="absolute inset-[-10px] rounded-full blur-md pointer-events-none opacity-30"
                    style={{ background: `radial-gradient(circle, ${glowColor}, transparent 70%)`, willChange: "transform, opacity" }}
                    animate={
                      !docVisible || prefersReducedMotion
                        ? { scale: 1, opacity: 0.25 }
                        : { scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }
                    }
                    transition={{ repeat: Infinity, duration: incomingCall ? 0.9 : 3.4, ease: "easeInOut" }}
                  />

                  {/* Water bubble orb — clear transparent pure water glass drop (light & dark mode ready) */}
                  <motion.div
                    className={`relative overflow-hidden border border-white/60 dark:border-white/25 ring-1 ring-black/10 dark:ring-white/20 shadow-[inset_0_2px_8px_rgba(255,255,255,0.95),inset_0_-2px_6px_rgba(0,0,0,0.08),0_10px_28px_-6px_rgba(0,0,0,0.18)] dark:shadow-[inset_0_2px_6px_rgba(255,255,255,0.45),0_8px_24px_-4px_rgba(0,0,0,0.4)] group-hover:scale-[1.04] transition-[width,height] duration-500 bg-white/45 dark:bg-black/30 backdrop-blur-xl ${fabBubbleExtraClass}`}
                    style={{
                      width: boxW,
                      height: boxH,
                      willChange: "transform, border-radius",
                      transform: "translateZ(0)",
                    }}
                    animate={
                      !docVisible || prefersReducedMotion
                        ? { borderRadius: "50%", scale: 1, rotate: 0 }
                        :
                      greetingShowing
                        ? {
                            // Clean, calm rounded rectangle — no wobble, no rotate.
                            borderRadius: "26px",
                            rotate: 0,
                            scale: 1,
                          }
                        : incomingCall
                        ? {
                            borderRadius: [
                              "62% 38% 55% 45% / 50% 60% 40% 50%",
                              "38% 62% 42% 58% / 60% 40% 60% 40%",
                              "55% 45% 60% 40% / 42% 55% 45% 58%",
                              "45% 55% 38% 62% / 58% 42% 60% 40%",
                              "62% 38% 55% 45% / 50% 60% 40% 50%",
                            ],
                            scale: [1, 1.08, 0.94, 1.07, 1],
                            rotate: [0, -4, 4, -3, 0],
                            x: [0, -3, 3, -2, 0],
                          }
                        : {
                            borderRadius: [
                              "58% 42% 52% 48% / 48% 56% 44% 52%",
                              "42% 58% 46% 54% / 60% 42% 58% 40%",
                              "54% 46% 60% 40% / 44% 54% 46% 56%",
                              "48% 52% 42% 58% / 56% 44% 60% 42%",
                              "58% 42% 52% 48% / 48% 56% 44% 52%",
                            ],
                            scale: [1, 1.05, 0.97, 1.04, 1],
                          }
                    }
                    transition={{
                      repeat: Infinity,
                      duration: greetingShowing ? 3.2 : incomingCall ? 0.9 : 5,
                      ease: "easeInOut",
                    }}
                  >
                    {/* Specular water drop highlight */}
                    <div className="absolute inset-0 rounded-full bg-[radial-gradient(65%_45%_at_30%_18%,rgba(255,255,255,0.7),transparent_65%)] pointer-events-none" />
                    {/* Bottom liquid refraction */}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(80%_60%_at_50%_100%,rgba(255,255,255,0.3),transparent_70%)] pointer-events-none" />

                    {/* Slow internal liquid swirl */}
                    {!greetingShowing && !isSmallScreen && !prefersReducedMotion && docVisible && (
                      <motion.div
                        className="absolute inset-2 opacity-40 blur-md pointer-events-none"
                        style={{
                          borderRadius: "50%",
                          background: `radial-gradient(40% 40% at 30% 60%, ${fabBubbleColor2}, transparent 70%), radial-gradient(35% 35% at 70% 35%, ${fabBubbleColor}, transparent 70%)`,
                          willChange: "transform",
                        }}
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 14, ease: "linear" }}
                      />
                    )}

                    {/* Greeting content — clean horizontal layout with avatar + text */}
                    {greetingShowing && (
                      <motion.div
                        className="absolute inset-0 flex items-center gap-3 pl-3 pr-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.15, duration: 0.35 }}
                      >
                        <div className="relative w-[68px] h-[68px] flex-shrink-0 rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/25 flex items-center justify-center overflow-hidden">
                          {avatarType === "image" && avatarUrl ? (
                            <motion.img
                              src={avatarUrl}
                              alt={agentName || "Agent Flow"}
                              className="w-full h-full object-cover"
                              initial={{ scale: 0.7, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1, y: [0, -2, 0] }}
                              transition={{ scale: { delay: 0.2, duration: 0.4 }, opacity: { delay: 0.2, duration: 0.4 }, y: { repeat: Infinity, duration: 3.5, ease: "easeInOut" } }}
                            />
                          ) : (
                            <span className="text-2xl">{avatarEmoji || "🤖"}</span>
                          )}

                        </div>
                        <motion.div
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3, duration: 0.4 }}
                          className="min-w-0 flex-1"
                        >
                          <p className="text-[11px] uppercase tracking-wider text-white/75 font-semibold mb-0.5 truncate">
                            {agentName || "Mr. Slime"}
                          </p>
                          <p className="text-white text-[13.5px] leading-snug font-medium line-clamp-2 [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]">
                            {welcomeText}
                          </p>
                        </motion.div>
                      </motion.div>
                    )}

                    {/* Inner faded shimmer micro-bubbles — count driven by admin intensity, halved on mobile */}
                    {!incomingCall && !callActive && !greetingShowing && docVisible && !prefersReducedMotion && !isSmallScreen && Array.from({ length: Math.max(2, Math.round(fabAnimationIntensity * (isSmallScreen ? 0.6 : 1.2))) }).map((_, i) => {
                      const sz = 3 + (i % 3);
                      const left = 15 + ((i * 17) % 70);
                      return (
                        <motion.span
                          key={i}
                          className="absolute rounded-full bg-white/35 pointer-events-none"
                          style={{ width: sz, height: sz, left: `${left}%`, bottom: -4, filter: "blur(0.3px)", willChange: "transform, opacity" }}
                          animate={{
                            y: [0, -(boxH - 8)],
                            opacity: [0, 0.7, 0.5, 0],
                            x: [0, i % 2 === 0 ? 4 : -4, 0],
                          }}
                          transition={{ repeat: Infinity, duration: Math.max(1.5, 6 - fabAnimationIntensity * 0.3) + (i % 3), delay: i * 0.6, ease: "easeOut" }}
                        />
                      );
                    })}

                    {/* Energy pulse — periodic flow (green when active chat/call, otherwise admin color) */}
                    {fabEnergyEnabled && !incomingCall && !callActive && !greetingShowing && docVisible && !prefersReducedMotion && !isSmallScreen && (
                      <motion.div
                        className="absolute inset-0 rounded-full pointer-events-none mix-blend-screen"
                        style={{ background: `radial-gradient(60% 40% at 50% 50%, ${energyColor}, transparent 65%)`, willChange: "transform, opacity" }}
                        animate={{ opacity: [0, 0, 0.85, 0.4, 0], scale: [0.6, 0.6, 1.15, 0.95, 0.7] }}
                        transition={{ repeat: Infinity, duration: fabEnergyInterval, times: [0, 0.7, 0.82, 0.92, 1], ease: "easeInOut" }}
                      />
                    )}

                    {/* Constant green glow when chat/call is active in background */}
                    {activeGreen && (
                      <motion.div
                        className="absolute inset-0 rounded-full pointer-events-none mix-blend-screen"
                        style={{ background: `radial-gradient(60% 40% at 50% 50%, #22c55e, transparent 65%)` }}
                        animate={{ opacity: [0.25, 0.55, 0.25] }}
                        transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                      />
                    )}

                    {/* Underwater rotating text labels (idle only) */}
                    {!incomingCall && !callActive && !greetingShowing && fabUnderwaterTexts.length > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <AnimatePresence mode="wait">
                          {showAvatarInlineNow ? (
                            <motion.img
                              key={`avatar-${underwaterIdx}`}
                              src={avatarUrl}
                              alt={agentName || "Mr. Slime"}
                              initial={{ opacity: 0, y: 8, scale: 0.7 }}
                              animate={{ opacity: 0.95, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -8, scale: 0.7 }}
                              transition={{ duration: 0.7 }}
                              style={{ width: Math.round(renderSize * 0.6), height: Math.round(renderSize * 0.6) }}
                              className="object-contain drop-shadow"
                            />
                          ) : (
                            <motion.span
                              key={underwaterIdx}
                              initial={{ opacity: 0, y: 8, filter: "blur(3px)" }}
                              animate={{ opacity: 0.9, y: 0, filter: "blur(0.4px)" }}
                              exit={{ opacity: 0, y: -8, filter: "blur(3px)" }}
                              transition={{ duration: 0.7 }}
                              className="text-white drop-shadow font-semibold tracking-wide text-center px-1"
                              style={{ fontSize: Math.max(8, Math.round(renderSize / 8)) }}
                            >
                              {fabUnderwaterTexts[underwaterIdx % fabUnderwaterTexts.length]}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Incoming call: in-bubble UI */}
                    {incomingCall && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-2">
                        <motion.div
                          className="rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-[0_6px_20px_-6px_hsl(152_82%_45%/0.8)]"
                          style={{ width: renderSize * 0.32, height: renderSize * 0.32 }}
                          animate={{ rotate: [0, -12, 12, -10, 0] }}
                          transition={{ repeat: Infinity, duration: 0.5 }}
                        >
                          <Phone className="text-white" style={{ width: renderSize * 0.16, height: renderSize * 0.16 }} />
                        </motion.div>
                        <span className="text-[10px] font-semibold text-white drop-shadow">Incoming call</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); rejectCall(); }}
                            className="rounded-full bg-destructive hover:bg-destructive/90 text-white flex items-center justify-center shadow-lg"
                            style={{ width: renderSize * 0.22, height: renderSize * 0.22 }}
                            aria-label="Decline call"
                          >
                            <PhoneOff style={{ width: renderSize * 0.11, height: renderSize * 0.11 }} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); acceptCall(); }}
                            className="rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-lg animate-pulse"
                            style={{ width: renderSize * 0.22, height: renderSize * 0.22 }}
                            aria-label="Accept call"
                          >
                            <Phone style={{ width: renderSize * 0.11, height: renderSize * 0.11 }} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Active call (minimized): timer + controls */}
                    {callActive && !incomingCall && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-1">
                        <span className="text-[9px] uppercase tracking-wider text-white/85 font-semibold">On call</span>
                        <span className="text-[12px] font-mono tabular-nums text-white drop-shadow font-bold">{fmtDuration(callDuration)}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleCallMute(); }}
                            className={`rounded-full flex items-center justify-center backdrop-blur ${callMuted ? "bg-destructive/70 text-white" : "bg-white/25 text-white hover:bg-white/35"}`}
                            style={{ width: renderSize * 0.26, height: renderSize * 0.26 }}
                            aria-label={callMuted ? "Unmute" : "Mute"}
                          >
                            {callMuted ? <MicOff style={{ width: renderSize * 0.12, height: renderSize * 0.12 }} /> : <Mic style={{ width: renderSize * 0.12, height: renderSize * 0.12 }} />}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); hangupCall(); }}
                            className="rounded-full bg-destructive hover:bg-destructive/90 text-white flex items-center justify-center shadow"
                            style={{ width: renderSize * 0.26, height: renderSize * 0.26 }}
                            aria-label="End call"
                          >
                            <PhoneOff style={{ width: renderSize * 0.12, height: renderSize * 0.12 }} />
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>

                  {/* Hover label capsule */}
                  {!incomingCall && !callActive && !greetingShowing && fabShowHoverLabel && (
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 ${launcherPos.edge === "left" ? "left-[calc(100%+8px)]" : "right-[calc(100%+8px)]"} pointer-events-none opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-300 hidden sm:block`}
                    >
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/95 backdrop-blur-xl border border-white/10 shadow-lg whitespace-nowrap">
                        <Sparkles className="w-3 h-3 text-primary" />
                        <span className="text-[11px] font-medium text-foreground">{fabHoverLabel}</span>
                      </div>
                    </div>
                  )}

                  {/* Floating bubble particles around the orb — fewer on mobile, paused when hidden */}
                  {!incomingCall && !callActive && !greetingShowing && docVisible && !prefersReducedMotion && !isSmallScreen && (
                    <>
                      <BubbleParticle delay={0} size={5} x={-6} y={10} duration={3.5} />
                      <BubbleParticle delay={1.5} size={6} x={renderSize / 3} y={-4} duration={3} />
                      {!isSmallScreen && (
                        <>
                          <BubbleParticle delay={0.8} size={4} x={renderSize - 8} y={5} duration={4} />
                          <BubbleParticle delay={2.2} size={3} x={renderSize - 14} y={renderSize - 12} duration={4.5} />
                          <BubbleParticle delay={0.4} size={4} x={-2} y={renderSize - 6} duration={3.8} />
                        </>
                      )}
                    </>
                  )}
                </motion.div>
              );
            })()}

          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <>
          {/* Click-outside backdrop (transparent, no screen blur or dimming) */}
          <motion.div
            key="ai-chat-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-transparent pointer-events-auto"
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className={`
              fixed z-[10001] flex flex-col overflow-hidden
              bg-card/90 dark:bg-card/95 backdrop-blur-2xl
              border border-white/15 dark:border-white/10 ring-1 ring-black/5
              shadow-xl
              inset-x-2 bottom-[calc(4.5rem+env(safe-area-inset-bottom)+0.5rem)] h-[72vh] max-h-[calc(100dvh-5.5rem-env(safe-area-inset-bottom))] rounded-[24px]
              sm:inset-auto sm:bottom-[5.5rem] lg:bottom-6 ${launcherPos.edge === "left" ? "sm:left-6 lg:left-8 xl:left-10" : "sm:right-6 lg:right-8 xl:right-10"}
              sm:w-[400px] sm:max-w-[calc(100vw-2rem)] sm:h-[600px] sm:max-h-[calc(100vh-8rem)] sm:rounded-[28px]
            `}
          >
            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center pt-1.5 pb-0.5">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header — identity stripe with Cherry Cola gradient */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cherry/20 via-cherry/5 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cherry/40 to-transparent" />
              <div className="relative flex items-center gap-3 px-4 py-3.5">
                {/* Avatar — transparent, no halo */}
                <div className="relative">
                  <AgentAvatar size="w-10 h-10" iconSize="w-5 h-5" />
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${callActive ? "bg-emerald-400" : liveMode ? "bg-emerald-400" : "bg-cherry"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {agentName || "Mr. Slime"}
                  </p>
                  <p className="text-[11px] text-foreground/75 tracking-wide font-medium">
                    {callActive ? "Voice call active" : liveMode ? "Live agent · typically replies in minutes" : "AI assistant · always online"}
                  </p>
                </div>
                {user && !liveMode && (
                  <button onClick={requestLiveSupport} className="p-2 rounded-full hover:bg-secondary/60 transition-colors" title="Request live support">
                    <Headphones className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                  </button>
                )}
                {user && liveMode && !callActive && (
                  <button onClick={requestCall} className="p-2 rounded-full hover:bg-green-500/10 transition-colors" title="Request voice call">
                    <Phone className="w-4 h-4 text-green-500 hover:text-green-600 transition-colors" />
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-secondary/60 transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Tab switcher — pill style with Cherry Cola accent */}
            <div className="flex gap-1 px-3 pt-2.5 pb-2">
              {[
                { id: "chat" as const, label: "Chat", icon: MessageSquare },
                { id: "complaint" as const, label: "Complaint", icon: AlertTriangle },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11.5px] font-medium rounded-full transition-all ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-cherry/20 to-cherry/10 text-cherry ring-1 ring-cherry/40 font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Incoming call UI */}
            <IncomingCallWidget visible={incomingCall} onAccept={acceptCall} onReject={rejectCall} />

            {/* Active call bar */}
            <AnimatePresence>
              {callActive && (
                <ActiveCallWidget
                  duration={callDuration}
                  muted={callMuted}
                  onToggleMute={toggleCallMute}
                  onHangup={hangupCall}
                />
              )}
            </AnimatePresence>

            {activeTab === "chat" ? (
              <>
                {/* Messages */}
                <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-4 py-4 space-y-3">
                  <div className="pointer-events-none sticky top-0 -mt-4 -mx-4 h-4 bg-gradient-to-b from-card/85 to-transparent z-10" />
                  {messages.map((msg, i) => {
                    const isUser = msg.role === "user";
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className={`group/msg flex gap-2 items-end ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        {!isUser && <AgentAvatar size="w-8 h-8" iconSize="w-3.5 h-3.5" />}
                        <div
                          title={new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          className={`relative max-w-[82%] px-4 py-2.5 text-sm transition-all rounded-2xl ${
                            isUser
                              ? "bg-gradient-to-br from-[hsl(var(--cherry))] via-[hsl(345_75%_22%)] to-[hsl(0_70%_12%)] text-white rounded-br-xs border border-white/20 font-medium shadow-sm"
                              : "bg-secondary/80 dark:bg-card/80 border border-border/40 text-foreground rounded-bl-xs [&_p]:leading-relaxed"
                          }`}
                        >
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-1.5">
                              {msg.attachments.map((a) => a.type === "image" ? (
                                <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="block">
                                  <img src={a.url} alt={a.name || "attachment"} className="max-h-40 rounded-md border border-white/20" />
                                </a>
                              ) : (
                                <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="text-xs underline break-all">
                                  {a.name || a.url}
                                </a>
                              ))}
                            </div>
                          )}
                          {!isUser ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-1 [&_p]:mt-0">
                              <ReactMarkdown
                                components={{
                                  img: ({ node, ...props }) => (
                                    <img
                                      {...props}
                                      className="rounded-lg border border-border/50 my-1.5 w-28 h-28 object-cover"
                                      loading="lazy"
                                    />
                                  ),
                                  a: ({ node, ...props }) => (
                                    <a {...props} className="text-cherry font-semibold underline underline-offset-2" />
                                  ),
                                }}
                              >
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          ) : msg.content}
                        </div>
                        {isUser && (
                          <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 ring-1 ring-border/40">
                            <User className="w-3 h-3 text-muted-foreground" />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                  {loading && (
                    <div className="flex gap-2 items-end">
                      <AgentAvatar size="w-6 h-6" iconSize="w-3 h-3" />
                      <div className="bg-secondary/70 border border-border/40 rounded-[18px] rounded-bl-[6px] px-4 py-3 flex gap-1">
                        {[0, 1, 2].map(i => (
                          <motion.span key={i} className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full"
                            animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />
                        ))}
                      </div>
                    </div>
                  )}

                  {!liveMode && !callActive && pastConversations.length > 0 && messages.length <= 1 && (
                    <div className="mt-4 pt-3 border-t border-border/30">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">Previous chats</p>
                      {pastConversations.slice(0, 5).map((conv: any) => (
                        <div key={conv.id} className="py-1.5 px-2 rounded-lg hover:bg-secondary/40 transition-colors cursor-pointer">
                          <p className="text-xs text-foreground truncate">{conv.subject}</p>
                          <p className="text-[10px] text-muted-foreground">{conv.status} · {new Date(conv.created_at).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Composer */}
                <div
                  className={`px-3 pt-2 pb-3 border-t border-border/40 bg-gradient-to-t from-background/40 to-transparent ${dragOver ? "ring-2 ring-primary/60 ring-inset" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    if (e.dataTransfer?.files?.length) handlePickFiles(e.dataTransfer.files);
                  }}
                >
                  {/* Premade quick-reply questions (until user sends their first message) */}
                  {!liveMode && !hasSentMessage && (widgetSettings?.chat_premade_questions?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1.5 pb-2">
                      {widgetSettings!.chat_premade_questions.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => sendPremade(q)}
                          disabled={loading}
                          className="px-3 py-1 rounded-full bg-secondary/60 hover:bg-secondary text-[11.5px] text-foreground border border-border/40 transition-colors disabled:opacity-50"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                  {pendingAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pb-2">
                      {pendingAttachments.map((a) => (
                        <div key={a.url} className="relative group">
                          {a.type === "image" ? (
                            <img src={a.url} alt={a.name || ""} className="h-14 w-14 object-cover rounded-md border border-border/50" />
                          ) : (
                            <div className="h-14 px-2 flex items-center text-[11px] rounded-md border border-border/50 bg-secondary/60 max-w-[140px] truncate">
                              {a.name || "file"}
                            </div>
                          )}
                          <button
                            type="button"
                            aria-label="Remove attachment"
                            onClick={() => removePendingAttachment(a.url)}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-background border border-border text-foreground/80 hover:text-foreground flex items-center justify-center shadow"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 bg-secondary/50 backdrop-blur-sm rounded-2xl pl-2 pr-1.5 py-1.5 ring-1 ring-border/40 focus-within:ring-cherry/50 focus-within:bg-secondary/70 transition-all">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      className="hidden"
                      onChange={(e) => { handlePickFiles(e.target.files); e.target.value = ""; }}
                    />
                    <button
                      type="button"
                      aria-label="Attach"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors disabled:opacity-50"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <button type="button" aria-label="Emoji" className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors">
                      <Smile className="w-4 h-4" />
                    </button>
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                      onPaste={handlePaste}
                      placeholder={liveMode ? "Message agent..." : uploading ? "Uploading…" : "Ask anything, paste or drop an image..."}
                      className="flex-1 bg-transparent px-1 py-1.5 text-sm text-foreground placeholder:text-foreground/55 focus:outline-none"
                    />
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={sendMessage}
                      disabled={(!input.trim() && pendingAttachments.length === 0) || loading || uploading}
                      className="h-9 px-3.5 rounded-full bg-gradient-to-r from-[hsl(var(--cherry))] to-[hsl(345_75%_25%)] hover:brightness-110 text-white flex items-center gap-1.5 text-xs font-bold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Send</span>
                    </motion.button>
                  </div>
                  <p className="text-[10.5px] text-foreground/65 text-center mt-1.5 font-medium">
                    {liveMode ? "Talking to a human agent" : "AI may make mistakes · press Enter to send · paste or drop images"}
                  </p>
                </div>
              </>

            ) : (
              /* Complaint Form */
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">Subject</p>
                  <input
                    value={complaintSubject}
                    onChange={(e) => setComplaintSubject(e.target.value)}
                    placeholder="Brief description of your issue"
                    className="w-full bg-secondary/40 rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">Category</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {["Order Issue", "Product Quality", "Delivery", "Other"].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setComplaintCategory(cat)}
                        className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                          complaintCategory === cat
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/50 text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">Description</p>
                  <textarea
                    value={complaintDescription}
                    onChange={(e) => setComplaintDescription(e.target.value)}
                    placeholder="Please describe your issue in detail..."
                    rows={5}
                    className="w-full bg-secondary/40 rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
                  />
                </div>
                <button
                  onClick={submitComplaint}
                  disabled={submittingComplaint || !complaintSubject.trim() || !complaintDescription.trim()}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  {submittingComplaint ? "Submitting..." : "Submit Complaint"}
                </button>
                {!user && (
                  <p className="text-[11px] text-muted-foreground text-center">Please sign in to submit a complaint</p>
                )}
              </div>
            )}
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatWidget;
// code:4ce0
