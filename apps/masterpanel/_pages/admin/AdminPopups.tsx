"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import ImageUpload from "@/components/ImageUpload";
import VideoUpload from "@/components/VideoUpload";
import { toast } from "@/lib/app-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Pencil, Trash2, X, Eye, Copy, RefreshCw,
  Clock, MousePointerClick, ScrollText, Maximize, PanelBottom,
  ArrowDown, Search, Filter, Layers, Check, ChevronDown,
  Monitor, Tablet, Smartphone, AppWindow, ArrowRight,
  MapPin, Globe, Compass
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  deleteAdminPopup,
  toggleAdminPopup,
  upsertAdminPopup,
} from "@/lib/admin-data.functions";

/* ── Constants & Visual Configs ── */
const routePresets = [
  { label: "🏠 Home Page Only (/)", value: "/" },
  { label: "🛍️ All Products (/products, /product/*)", values: ["/products", "/product/*"] },
  { label: "🏷️ Categories (/categories/*)", value: "/categories/*" },
  { label: "✨ Product Verification (/verify)", value: "/verify" },
  { label: "🚚 Order Track (/track)", value: "/track" },
  { label: "🌐 Sitewide (All Pages /*)", value: "*" },
];
const displayTypes = [
  { value: "popup", label: "Popup Modal", icon: Maximize, desc: "Centered overlay modal" },
  { value: "banner", label: "Banner Bar", icon: PanelBottom, desc: "Top or bottom horizontal strip" },
  { value: "slide-in", label: "Slide-in Card", icon: ArrowDown, desc: "Corner notification card" },
  { value: "fullscreen", label: "Fullscreen", icon: Maximize, desc: "Full takeover overlay" },
];

const popupPositions = [
  { value: "center", label: "Center", desc: "Centered on screen" },
  { value: "top", label: "Top Center", desc: "Top bar" },
  { value: "bottom", label: "Bottom Center", desc: "Bottom bar" },
  { value: "bottom-right", label: "Bottom Right", desc: "Bottom-right corner" },
  { value: "bottom-left", label: "Bottom Left", desc: "Bottom-left corner" },
  { value: "top-right", label: "Top Right", desc: "Top-right corner" },
  { value: "top-left", label: "Top Left", desc: "Top-left corner" },
  { value: "fullscreen", label: "Fullscreen", desc: "Full screen overlay" },
];

const popupTriggers = [
  { value: "timer", label: "Timer Delay", icon: Clock, desc: "Show after X milliseconds (e.g. 2000ms)" },
  { value: "scroll", label: "Scroll Percentage", icon: ScrollText, desc: "Show when user scrolls X% (e.g. 50%)" },
  { value: "exit_intent", label: "Exit Intent", icon: MousePointerClick, desc: "Show when user moves cursor to leave" },
  { value: "immediate", label: "Immediate", icon: AppWindow, desc: "Show as soon as page loads" },
];

const popupAnimations = [
  { value: "scale", label: "Scale (Pop)" },
  { value: "slide-up", label: "Slide Up" },
  { value: "slide-down", label: "Slide Down" },
  { value: "fade", label: "Fade In" },
  { value: "bounce", label: "Bounce (Spring)" },
  { value: "flip", label: "3D Flip" },
  { value: "zoom", label: "Zoom In" },
];

const filterOptions = [
  { id: "all", label: "All Campaigns" },
  { id: "active", label: "Active Popups" },
  { id: "inactive", label: "Paused Popups" },
  { id: "timer", label: "Timer Trigger" },
  { id: "exit_intent", label: "Exit Intent" },
  { id: "scroll", label: "Scroll Trigger" },
];

/* ── Animation Generators ── */
const getAnimationVariants = (style: string): { initial: any; animate: any; exit: any } => {
  switch (style) {
    case "slide-up": return { initial: { opacity: 0, y: 50 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 50 } };
    case "slide-down": return { initial: { opacity: 0, y: -50 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -50 } };
    case "fade": return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
    case "bounce": return { initial: { opacity: 0, scale: 0.3 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.3 } };
    case "flip": return { initial: { opacity: 0, rotateX: 90 }, animate: { opacity: 1, rotateX: 0 }, exit: { opacity: 0, rotateX: 90 } };
    case "zoom": return { initial: { opacity: 0, scale: 1.3 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 1.3 } };
    case "scale": default: return { initial: { opacity: 0, scale: 0.88, y: 15 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.88, y: 15 } };
  }
};

/* ── Live Device Simulator Modal ── */
const PopupSimulator = ({ popup, onClose }: { popup: any; onClose: () => void }) => {
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [animKey, setAnimKey] = useState(0);

  const anim = getAnimationVariants(popup.animation_style || "scale");

  const positionClasses: Record<string, string> = {
    center: "items-center justify-center",
    top: "items-start justify-center pt-4",
    bottom: "items-end justify-center pb-4",
    "bottom-right": "items-end justify-end pb-4 pr-4",
    "bottom-left": "items-end justify-start pb-4 pl-4",
    "top-right": "items-start justify-end pt-4 pr-4",
    "top-left": "items-start justify-start pt-4 pl-4",
    fullscreen: "items-center justify-center",
  };

  const deviceWidth = device === "desktop" ? "100%" : device === "tablet" ? "70%" : "42%";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl h-[85vh] rounded-3xl bg-card border border-border/80 shadow-2xl flex flex-col overflow-hidden">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-secondary/40 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground text-xs px-2.5 py-0.5 rounded-lg">
              <Eye className="w-3 h-3 mr-1" /> Live Simulator
            </Badge>
            <span className="text-xs font-semibold text-foreground truncate max-w-xs">{popup.title}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-background border border-border/50">
              <button
                onClick={() => { setDevice("desktop"); setAnimKey((k) => k + 1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                  device === "desktop" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Monitor className="w-3.5 h-3.5" /> Desktop
              </button>
              <button
                onClick={() => { setDevice("tablet"); setAnimKey((k) => k + 1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                  device === "tablet" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Tablet className="w-3.5 h-3.5" /> Tablet
              </button>
              <button
                onClick={() => { setDevice("mobile"); setAnimKey((k) => k + 1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                  device === "mobile" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> Mobile
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setAnimKey((k) => k + 1)}
              className="h-8 text-xs rounded-xl gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Replay
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Viewport Frame */}
        <div className="flex-1 bg-secondary/20 p-6 flex items-center justify-center overflow-hidden relative">
          <div
            className="h-full rounded-2xl border border-border/60 bg-background shadow-xl overflow-hidden flex flex-col transition-all duration-300 relative"
            style={{ width: deviceWidth }}
          >
            {/* Fake Browser Top */}
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 border-b border-border/40 shrink-0">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
              </div>
              <div className="flex-1 mx-3 h-5 rounded-lg bg-background border border-border/40 flex items-center justify-between px-2">
                <span className="text-[9px] text-muted-foreground font-mono truncate">
                  https://orizino.com{popup.target_routes && Array.isArray(popup.target_routes) && popup.target_routes[0] && popup.target_routes[0] !== "*" ? (popup.target_routes[0].startsWith("/") ? popup.target_routes[0] : `/${popup.target_routes[0]}`) : "/"}
                </span>
                <span className="text-[9px] text-primary/80 font-semibold tracking-wider shrink-0 ml-2">
                  {popup.target_routes?.includes("*") ? "🌐 Sitewide" : (popup.target_routes?.[0] === "/" || !popup.target_routes?.length ? "🏠 Home Only" : "🎯 Targeted")}
                </span>
              </div>
            </div>

            {/* Content canvas with popup preview */}
            <div className={`flex-1 relative p-4 flex ${positionClasses[popup.position || "center"] || positionClasses.center} overflow-y-auto`}>
              {popup.display_type !== "banner" && popup.display_type !== "slide-in" && (
                <motion.div
                  key={`backdrop-${animKey}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-black/75 backdrop-blur-sm pointer-events-none"
                />
              )}

              <motion.div
                key={animKey}
                initial={anim.initial}
                animate={anim.animate}
                exit={anim.exit}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={`relative shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_30px_rgba(255,255,255,0.05)] border border-white/10 overflow-hidden z-10 flex flex-col ${
                  popup.position === "fullscreen" ? "w-full h-full rounded-none" :
                  popup.display_type === "banner" ? "w-full rounded-2xl" :
                  popup.display_type === "slide-in" ? (device === "mobile" ? "w-full rounded-2xl" : "w-80 rounded-2xl") :
                  (device === "mobile" ? "w-full max-w-xs rounded-3xl" : "w-full max-w-sm rounded-3xl")
                } ${popup.bg_color ? "" : "bg-[#0d0e12]/95 backdrop-blur-2xl"}`}
                style={{
                  backgroundColor: popup.bg_color || "#0d0e12",
                  color: popup.text_color || "#ffffff",
                  perspective: popup.animation_style === "flip" ? "1000px" : undefined,
                }}
              >
                <button
                  onClick={onClose}
                  className="absolute top-2.5 right-2.5 z-20 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md flex items-center justify-center transition-colors text-white border border-white/15"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {popup.image_url && (
                  <div className="h-40 bg-black/50 overflow-hidden shrink-0 relative">
                    <img src={popup.image_url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d0e12] via-transparent to-transparent opacity-90" />
                  </div>
                )}

                {popup.video_url && !popup.image_url && (
                  <div className="h-40 bg-black overflow-hidden shrink-0 relative">
                    <video src={popup.video_url} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d0e12] via-transparent to-transparent opacity-90" />
                  </div>
                )}

                <div className="p-5 space-y-2.5">
                  <h3 className="text-base font-bold font-display tracking-tight leading-snug">
                    {popup.title || "Special Offer!"}
                  </h3>
                  {popup.message && (
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      {popup.message}
                    </p>
                  )}
                  {popup.link_url && (
                    <div className="pt-2">
                      <span className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-md cursor-pointer hover:bg-primary/90 transition-colors">
                        {popup.link_text || "Claim Offer"}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AdminPopups() {
  const qc = useQueryClient();
  const savePopupFn = useServerFn(upsertAdminPopup);
  const deletePopupFn = useServerFn(deleteAdminPopup);
  const togglePopupFn = useServerFn(toggleAdminPopup);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [simulatorItem, setSimulatorItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [editingItem, setEditingItem] = useState<any>(null);
  const [customRouteInput, setCustomRouteInput] = useState("");

  const [form, setForm] = useState({
    title: "",
    message: "",
    image_url: "",
    video_url: "",
    link_url: "",
    link_text: "Learn More",
    is_active: true,
    display_type: "popup",
    position: "center",
    animation_style: "scale",
    trigger_type: "timer",
    trigger_value: 2000,
    max_views: 1,
    duration_hours: 24,
    starts_at: "",
    ends_at: "",
    bg_color: "",
    text_color: "",
    target_routes: ["/"] as string[],
  });

  const addTargetRoute = (route: string) => {
    const clean = route.trim();
    if (!clean) return;
    const current = form.target_routes || [];
    if (clean === "*") {
      setForm({ ...form, target_routes: ["*"] });
      return;
    }
    const filtered = current.filter((r) => r !== "*");
    if (!filtered.includes(clean)) {
      setForm({ ...form, target_routes: [...filtered, clean] });
    }
  };

  const removeTargetRoute = (route: string) => {
    const current = form.target_routes || [];
    const next = current.filter((r) => r !== route);
    setForm({ ...form, target_routes: next.length > 0 ? next : ["/"] });
  };

  /* ── Query Popups ── */
  const { data: rawPopups = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-popups-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("popups")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  /* ── Filtered Popups ── */
  const filteredPopups = useMemo(() => {
    return rawPopups.filter((item: any) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        item.title?.toLowerCase().includes(q) ||
        item.message?.toLowerCase().includes(q) ||
        item.display_type?.toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (selectedFilter === "active") return item.is_active;
      if (selectedFilter === "inactive") return !item.is_active;
      if (selectedFilter === "timer") return item.trigger_type === "timer";
      if (selectedFilter === "exit_intent") return item.trigger_type === "exit_intent";
      if (selectedFilter === "scroll") return item.trigger_type === "scroll";
      return true;
    });
  }, [rawPopups, searchQuery, selectedFilter]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const active = rawPopups.filter((p: any) => p.is_active).length;
    const exitIntent = rawPopups.filter((p: any) => p.trigger_type === "exit_intent").length;
    return { total: rawPopups.length, active, inactive: rawPopups.length - active, exitIntent };
  }, [rawPopups]);

  /* ── Mutations ── */
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        ...form,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      };

      if (editingItem?.id) {
        payload.id = editingItem.id;
      }

      await savePopupFn({ data: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-popups-list"] });
      toast.success(editingItem ? "Popup campaign updated" : "New popup campaign created");
      closeDialog();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deletePopupFn({ data: { id } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-popups-list"] });
      toast.success("Popup deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await togglePopupFn({ data: { id, is_active: isActive } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-popups-list"] });
      toast.success("Popup status updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openNew = () => {
    setEditingItem(null);
    setCustomRouteInput("");
    setForm({
      title: "",
      message: "",
      image_url: "",
      video_url: "",
      link_url: "",
      link_text: "Learn More",
      is_active: true,
      display_type: "popup",
      position: "center",
      animation_style: "scale",
      trigger_type: "timer",
      trigger_value: 2000,
      max_views: 1,
      duration_hours: 24,
      starts_at: "",
      ends_at: "",
      bg_color: "",
      text_color: "",
      target_routes: ["/"],
    });
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setCustomRouteInput("");
    setForm({
      title: item.title || "",
      message: item.message || "",
      image_url: item.image_url || "",
      video_url: item.video_url || "",
      link_url: item.link_url || "",
      link_text: item.link_text || "Learn More",
      is_active: item.is_active ?? true,
      display_type: item.display_type || "popup",
      position: item.position || "center",
      animation_style: item.animation_style || "scale",
      trigger_type: item.trigger_type || "timer",
      trigger_value: item.trigger_value ?? 2000,
      max_views: item.max_views ?? 1,
      duration_hours: item.duration_hours ?? 24,
      starts_at: item.starts_at ? new Date(item.starts_at).toISOString().slice(0, 16) : "",
      ends_at: item.ends_at ? new Date(item.ends_at).toISOString().slice(0, 16) : "",
      bg_color: item.bg_color || "",
      text_color: item.text_color || "",
      target_routes: Array.isArray(item.target_routes) && item.target_routes.length > 0 ? item.target_routes : ["/"],
    });
    setDialogOpen(true);
  };

  const duplicateItem = (item: any) => {
    setEditingItem(null);
    setCustomRouteInput("");
    setForm({
      ...item,
      title: `${item.title} (Copy)`,
      is_active: false,
      starts_at: "",
      ends_at: "",
      target_routes: Array.isArray(item.target_routes) && item.target_routes.length > 0 ? item.target_routes : ["/"],
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setCustomRouteInput("");
  };

  const activeFilterLabel = filterOptions.find((f) => f.id === selectedFilter)?.label || "All";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-sm">
            <AppWindow className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground tracking-tight">
              Promotional Modals & Overlays
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              High-converting modal campaigns, exit-intent overlays, slide-in cards, and banner strips
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-9 px-3 text-xs gap-1.5 border-border/60 hover:bg-secondary/60 rounded-xl"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button
            onClick={openNew}
            className="h-9 px-4 text-xs font-semibold gap-1.5 rounded-xl shadow-md bg-primary hover:bg-primary/90 text-primary-foreground transition-all"
          >
            <Plus className="w-4 h-4" /> Create Modal Campaign
          </Button>
        </div>
      </div>

      {/* ── Quick KPI Stat Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-card border border-border/50 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Total Campaigns</p>
            <p className="text-lg font-bold text-foreground mt-0.5">{stats.total}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center text-muted-foreground text-xs font-semibold">
            🎯
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-emerald-500/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-emerald-500">Active Popups</p>
            <p className="text-lg font-bold text-foreground mt-0.5">{stats.active}</p>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-amber-500/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-amber-500">Exit Intent Rules</p>
            <p className="text-lg font-bold text-foreground mt-0.5">{stats.exitIntent}</p>
          </div>
          <MousePointerClick className="w-4 h-4 text-amber-500" />
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border/50 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Paused Campaigns</p>
            <p className="text-lg font-bold text-muted-foreground mt-0.5">{stats.inactive}</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
        </div>
      </div>

      {/* ── Search & Single-Button Filter Bar ── */}
      <div className="flex items-center justify-between gap-3 bg-secondary/30 p-2 rounded-2xl border border-border/40">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search popup title, message, or display type..."
            className="pl-9 h-9 text-xs rounded-xl bg-background border-border/50 focus-visible:ring-1"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>

        {/* Single Button Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs gap-1.5 rounded-xl border-border/60 bg-background hover:bg-secondary/60 font-medium shrink-0"
            >
              <Filter className="w-3.5 h-3.5 text-primary" />
              <span>Filter: <strong className="text-foreground ml-0.5">{activeFilterLabel}</strong></span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5 border-border/60 shadow-xl bg-card">
            {filterOptions.map((opt) => (
              <DropdownMenuItem
                key={opt.id}
                onClick={() => setSelectedFilter(opt.id)}
                className={`rounded-xl text-xs flex items-center justify-between cursor-pointer py-2 px-2.5 ${
                  selectedFilter === opt.id
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{opt.label}</span>
                {selectedFilter === opt.id && <Check className="w-3.5 h-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Popups Card Grid ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-3xl bg-card border border-border/40 animate-pulse" />
          ))}
        </div>
      ) : filteredPopups.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-card border border-dashed border-border/60">
          <div className="w-12 h-12 rounded-2xl bg-secondary/60 text-muted-foreground flex items-center justify-center mx-auto mb-3">
            <AppWindow className="w-6 h-6 opacity-60" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">No popup campaigns found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            {searchQuery || selectedFilter !== "all"
              ? "Try adjusting your search query or filter"
              : "Create interactive modal popups or banner strips to engage store visitors with coupon codes, announcements, and drop alerts."}
          </p>
          <Button onClick={openNew} size="sm" className="rounded-xl text-xs font-semibold gap-1.5">
            <Plus className="w-4 h-4" /> Create Popup
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence initial={false}>
            {filteredPopups.map((popup: any) => {
              const triggerCfg = popupTriggers.find((t) => t.value === popup.trigger_type) || popupTriggers[0];
              const displayCfg = displayTypes.find((d) => d.value === popup.display_type) || displayTypes[0];

              return (
                <motion.div
                  key={popup.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  className={`rounded-3xl border bg-card transition-all duration-200 overflow-hidden flex flex-col ${
                    popup.is_active
                      ? "border-border/60 shadow-sm hover:shadow-md hover:border-primary/40"
                      : "border-border/30 opacity-75 bg-card/60"
                  }`}
                >
                  {/* Thumbnail / Header Area */}
                  <div className="relative h-36 bg-black/40 overflow-hidden flex items-center justify-center">
                    {popup.image_url ? (
                      <img src={popup.image_url} alt="" className="w-full h-full object-cover" />
                    ) : popup.video_url ? (
                      <video src={popup.video_url} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center p-4 text-center"
                        style={{
                          backgroundColor: popup.bg_color || "hsl(var(--secondary))",
                          color: popup.text_color || "hsl(var(--foreground))",
                        }}
                      >
                        <p className="text-xs font-bold font-display line-clamp-2">{popup.title}</p>
                      </div>
                    )}

                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <Badge className="bg-background/80 backdrop-blur-md text-foreground text-[10px] h-5 px-2 rounded-lg border border-border/40 shadow-sm">
                        {displayCfg.label}
                      </Badge>
                      <Badge className="bg-background/80 backdrop-blur-md text-foreground text-[10px] h-5 px-2 rounded-lg border border-border/40 shadow-sm">
                        {popup.position || "center"}
                      </Badge>
                    </div>

                    <div className="absolute top-2.5 right-2.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSimulatorItem(popup)}
                        className="h-7 text-[11px] rounded-lg gap-1 bg-background/90 hover:bg-background shadow-sm border border-border/40 text-foreground"
                      >
                        <Eye className="w-3 h-3 text-primary" /> Test
                      </Button>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold font-display text-foreground truncate">{popup.title}</h3>
                        <Badge
                          variant="outline"
                          className={`text-[9px] h-4 px-1.5 rounded ${
                            popup.is_active ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10" : "text-muted-foreground border-border/40"
                          }`}
                        >
                          {popup.is_active ? "Active" : "Paused"}
                        </Badge>
                      </div>

                      {popup.message && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {popup.message}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-md">
                          <triggerCfg.icon className="w-3 h-3 text-primary" />
                          {popup.trigger_type === "timer"
                            ? `${(popup.trigger_value || 2000) / 1000}s Delay`
                            : popup.trigger_type === "scroll"
                            ? `${popup.trigger_value || 50}% Scroll`
                            : triggerCfg.label}
                        </span>

                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-md">
                          {popup.animation_style || "scale"}
                        </span>

                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                          <MapPin className="w-3 h-3" />
                          {popup.target_routes && Array.isArray(popup.target_routes) && popup.target_routes.length > 0
                            ? popup.target_routes.includes("*")
                              ? "Sitewide (*)"
                              : popup.target_routes.join(", ")
                            : "Home (/) Only"}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action Row */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/30">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-muted-foreground">Active</span>
                        <Switch
                          checked={popup.is_active}
                          onCheckedChange={(val) => toggleMutation.mutate({ id: popup.id, isActive: val })}
                          aria-label="Toggle active status"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => duplicateItem(popup)}
                          className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                          title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(popup)}
                          className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-2xl border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Popup Campaign?</AlertDialogTitle>
                              <AlertDialogDescription className="text-xs">
                                Are you sure you want to delete "{popup.title}"? This campaign will no longer trigger for visitors.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(popup.id)}
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl text-xs font-semibold"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── Single-Flow Clean Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-6 border-border/60 shadow-2xl bg-card max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-display text-foreground flex items-center gap-2">
              <AppWindow className="w-5 h-5 text-primary" />
              {editingItem ? "Edit Modal Campaign" : "Create Modal Campaign"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Design high-converting promotional modals, exit-intent overlays, and announcement cards.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Section 1: Content & Copy */}
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                Content & Copy
              </h4>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Campaign Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Unlock 15% OFF Your First Order"
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Message / Subtitle</Label>
                <Textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="e.g. Join the Orizino VIP club and get instant access to drop alerts and exclusive savings."
                  rows={2}
                  className="text-xs rounded-xl resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Action Button Text</Label>
                  <Input
                    value={form.link_text}
                    onChange={(e) => setForm({ ...form, link_text: e.target.value })}
                    placeholder="e.g. Claim Discount"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Action Button Link URL</Label>
                  <Input
                    value={form.link_url}
                    onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                    placeholder="e.g. /categories/clothing or /promo/summer"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Media & Visuals */}
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                Media & Colors
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Banner Image</Label>
                  <ImageUpload
                    bucket="banners"
                    folder="popups"
                    value={form.image_url}
                    onUploaded={(url) => setForm({ ...form, image_url: url })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Banner Video (Optional)</Label>
                  <VideoUpload
                    bucket="banners"
                    folder="popups-video"
                    value={form.video_url}
                    onUploaded={(url) => setForm({ ...form, video_url: url })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Custom Background Color</Label>
                  <Input
                    value={form.bg_color}
                    onChange={(e) => setForm({ ...form, bg_color: e.target.value })}
                    placeholder="Leave empty for glassmorphism or e.g. #0f172a"
                    className="h-9 text-xs rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Custom Text Color</Label>
                  <Input
                    value={form.text_color}
                    onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                    placeholder="Leave empty for default or e.g. #ffffff"
                    className="h-9 text-xs rounded-xl font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Display Format & Positioning */}
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                Format & Position
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Display Type</Label>
                  <Select value={form.display_type} onValueChange={(val) => setForm({ ...form, display_type: val })}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {displayTypes.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Position</Label>
                  <Select value={form.position} onValueChange={(val) => setForm({ ...form, position: val })}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {popupPositions.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Animation Style</Label>
                  <Select value={form.animation_style} onValueChange={(val) => setForm({ ...form, animation_style: val })}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {popupAnimations.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Section 4: Target Routes & Display Pages */}
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  Target Routes & Display Pages
                </h4>
                <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 rounded-lg border-primary/30 text-primary">
                  {form.target_routes.includes("*") ? "All Routes (*)" : `${form.target_routes.length} Target(s)`}
                </Badge>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Control which pages this popup triggers on. If left at default, it will only appear on the <strong>Home Page (/)</strong>, preventing unwanted popups on direct visits to verification, checkout, or specific routes.
              </p>

              {/* Quick Preset Buttons */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Quick Presets</Label>
                <div className="flex flex-wrap gap-1.5">
                  {routePresets.map((preset) => {
                    const isSelected = preset.value
                      ? form.target_routes.includes(preset.value)
                      : preset.values?.every((v) => form.target_routes.includes(v));

                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          if (preset.value) {
                            if (preset.value === "*") {
                              setForm({ ...form, target_routes: ["*"] });
                            } else if (form.target_routes.includes(preset.value)) {
                              removeTargetRoute(preset.value);
                            } else {
                              addTargetRoute(preset.value);
                            }
                          } else if (preset.values) {
                            const allIn = preset.values.every((v) => form.target_routes.includes(v));
                            if (allIn) {
                              const next = form.target_routes.filter((r) => !preset.values!.includes(r));
                              setForm({ ...form, target_routes: next.length > 0 ? next : ["/"] });
                            } else {
                              const filtered = form.target_routes.filter((r) => r !== "*");
                              const merged = Array.from(new Set([...filtered, ...preset.values]));
                              setForm({ ...form, target_routes: merged });
                            }
                          }
                        }}
                        className={`text-[11px] px-2.5 py-1 rounded-xl font-medium border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-background/80 hover:bg-secondary text-muted-foreground hover:text-foreground border-border/60"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Current Active Route Chips */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-medium text-foreground">Active Target Routes</Label>
                <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-background border border-border/50 min-h-[38px]">
                  {form.target_routes.map((rt) => (
                    <span
                      key={rt}
                      className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20"
                    >
                      {rt === "/" ? "🏠 / (Home)" : rt === "*" ? "🌐 * (All Pages)" : rt}
                      <button
                        type="button"
                        onClick={() => removeTargetRoute(rt)}
                        className="hover:text-destructive hover:scale-110 transition-all p-0.5 rounded"
                        title={`Remove ${rt}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Custom Route Input */}
              <div className="flex items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <Input
                    value={customRouteInput}
                    onChange={(e) => setCustomRouteInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (customRouteInput.trim()) {
                          addTargetRoute(customRouteInput.trim());
                          setCustomRouteInput("");
                        }
                      }
                    }}
                    placeholder="e.g. /custom-drop, /collection/*, /promo"
                    className="h-9 text-xs font-mono rounded-xl pl-3"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (customRouteInput.trim()) {
                      addTargetRoute(customRouteInput.trim());
                      setCustomRouteInput("");
                    }
                  }}
                  disabled={!customRouteInput.trim()}
                  className="h-9 px-3 text-xs rounded-xl font-medium border border-border/60 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Route
                </Button>
              </div>
            </div>

            {/* Section 5: Trigger Behavior & Frequency */}
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                Triggers & Frequency
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Trigger Event</Label>
                  <Select value={form.trigger_type} onValueChange={(val) => setForm({ ...form, trigger_type: val })}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {popupTriggers.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    {form.trigger_type === "timer"
                      ? "Delay in Milliseconds (e.g. 2000 = 2s)"
                      : form.trigger_type === "scroll"
                      ? "Scroll Percentage (e.g. 50 = 50%)"
                      : "Trigger Parameter"}
                  </Label>
                  <Input
                    type="number"
                    value={form.trigger_value}
                    onChange={(e) => setForm({ ...form, trigger_value: Number(e.target.value) })}
                    disabled={form.trigger_type === "exit_intent" || form.trigger_type === "immediate"}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Max Impressions per Visitor</Label>
                  <Input
                    type="number"
                    value={form.max_views}
                    onChange={(e) => setForm({ ...form, max_views: Number(e.target.value) })}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Cooldown Period (Hours)</Label>
                  <Input
                    type="number"
                    value={form.duration_hours}
                    onChange={(e) => setForm({ ...form, duration_hours: Number(e.target.value) })}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Scheduling & Active */}
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  Schedule & Status
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">Campaign Active</span>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(val) => setForm({ ...form, is_active: val })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Start Date (Optional)</Label>
                  <Input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">End Date (Optional)</Label>
                  <Input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeDialog} className="h-9 rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!form.title.trim()}
              className="h-9 rounded-xl text-xs font-semibold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {editingItem ? "Update Campaign" : "Publish Popup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Interactive Live Simulator ── */}
      {simulatorItem && (
        <PopupSimulator popup={simulatorItem} onClose={() => setSimulatorItem(null)} />
      )}
    </div>
  );
}
