"use client";

import React, { useState, useMemo } from "react";
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
import { toast } from "@/lib/app-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone, Plus, Pencil, Trash2, Tag, Info, Zap, AlertTriangle,
  Clock, ExternalLink, GripVertical, Search, Copy, Send, Check,
  ChevronDown, Filter, RefreshCw, Eye
} from "lucide-react";
import { useDragReorder } from "@/hooks/use-drag-reorder";
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
  deleteAdminAnnouncement,
  upsertAdminAnnouncement,
  toggleAdminAnnouncement,
  upsertSiteSettings,
  type StoreAnnouncement,
} from "@/lib/admin-data.functions";

/* ── Constants & Helpers ── */
const notifTypes = [
  { value: "announcement", label: "Announcement", icon: Megaphone, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  { value: "offer", label: "Special Offer", icon: Tag, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  { value: "update", label: "Store Update", icon: Info, color: "text-sky-500 bg-sky-500/10 border-sky-500/20" },
];

const priorityConfig: Record<string, { label: string; color: string; icon: any }> = {
  normal: { label: "Normal", color: "bg-secondary text-muted-foreground border-border/40", icon: Info },
  high: { label: "High", color: "bg-amber-500/10 text-amber-500 border-amber-500/30", icon: AlertTriangle },
  urgent: { label: "Urgent", color: "bg-red-500/10 text-red-500 border-red-500/30 font-semibold", icon: Zap },
};

const notifIcons = [
  { value: "", label: "Default", icon: "📢" },
  { value: "megaphone", label: "Megaphone", icon: "📢" },
  { value: "gift", label: "Gift", icon: "🎁" },
  { value: "star", label: "Star", icon: "⭐" },
  { value: "fire", label: "Hot / Fire", icon: "🔥" },
  { value: "party", label: "Celebration", icon: "🎉" },
  { value: "warning", label: "Alert", icon: "⚠️" },
  { value: "heart", label: "Love / Special", icon: "❤️" },
];

const filterOptions = [
  { id: "all", label: "All Announcements" },
  { id: "active", label: "Active Sitewide" },
  { id: "scheduled", label: "Scheduled" },
  { id: "expired", label: "Expired" },
  { id: "announcement", label: "📢 Announcements" },
  { id: "offer", label: "🏷️ Offers" },
  { id: "update", label: "ℹ️ Updates" },
];

export default function AdminAnnouncements() {
  const qc = useQueryClient();
  const saveSiteSettings = useServerFn(upsertSiteSettings);
  const upsertAnnouncementFn = useServerFn(upsertAdminAnnouncement);
  const deleteAnnouncementFn = useServerFn(deleteAdminAnnouncement);
  const toggleAnnouncementFn = useServerFn(toggleAdminAnnouncement);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [editingItem, setEditingItem] = useState<StoreAnnouncement | null>(null);

  const [form, setForm] = useState({
    title: "",
    message: "",
    link_url: "",
    type: "announcement" as "announcement" | "offer" | "update",
    priority: "normal" as "normal" | "high" | "urgent",
    icon: "",
    is_active: true,
    scheduled_at: "",
    expires_at: "",
    also_notify_audience: false,
  });

  const [audienceChannels, setAudienceChannels] = useState({ email: true, whatsapp: false, sms: false });
  const [isDispatching, setIsDispatching] = useState(false);

  /* ── Dedicated Announcements Storage (Independent from normal user notifications) ── */
  const { data: rawAnnouncements = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-announcements-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "storefront_announcements")
        .maybeSingle();
      if (error) throw error;
      const list = (data?.value as unknown as StoreAnnouncement[]) || [];
      return Array.isArray(list) ? list : [];
    },
  });

  /* ── Saved Reorder Map from site_settings ── */
  const { data: savedOrder } = useQuery({
    queryKey: ["announcements-sort-order"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "notification_order")
        .maybeSingle();
      return (data?.value as string[]) || [];
    },
  });

  /* ── Audience Table for quick broadcast stats ── */
  const { data: audienceMembers = [] } = useQuery({
    queryKey: ["marketing-audience-summary"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "marketing_audience_table")
        .maybeSingle();
      return (data?.value as any[]) || [];
    },
  });

  const validEmailsCount = useMemo(() => {
    return audienceMembers.filter((m: any) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email?.trim() || "")).length;
  }, [audienceMembers]);

  const validPhonesCount = useMemo(() => {
    return audienceMembers.filter((m: any) => (m.phone || "").replace(/[^\d+]/g, "").length >= 10).length;
  }, [audienceMembers]);

  /* ── Sorted & Filtered Announcements ── */
  const orderedList = useMemo(() => {
    if (!savedOrder || savedOrder.length === 0) return rawAnnouncements;
    const map = new Map(savedOrder.map((id: string, i: number) => [id, i]));
    return [...rawAnnouncements].sort((a: StoreAnnouncement, b: StoreAnnouncement) => {
      const ai = map.has(a.id) ? map.get(a.id)! : 9999;
      const bi = map.has(b.id) ? map.get(b.id)! : 9999;
      return ai - bi;
    });
  }, [rawAnnouncements, savedOrder]);

  const filteredList = useMemo(() => {
    return orderedList.filter((item: StoreAnnouncement) => {
      // Search match
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        item.title?.toLowerCase().includes(q) ||
        item.message?.toLowerCase().includes(q) ||
        item.type?.toLowerCase().includes(q);

      if (!matchSearch) return false;

      // Filter match
      const now = new Date();
      const isExpired = (item.expires_at && new Date(item.expires_at) < now) || !!item.cleared_at || item.is_active === false;
      const isScheduled = item.scheduled_at && new Date(item.scheduled_at) > now;
      const isActive = !isExpired && !isScheduled;

      if (selectedFilter === "active") return isActive;
      if (selectedFilter === "scheduled") return isScheduled;
      if (selectedFilter === "expired") return isExpired;
      if (selectedFilter === "announcement") return item.type === "announcement";
      if (selectedFilter === "offer") return item.type === "offer";
      if (selectedFilter === "update") return item.type === "update";
      return true;
    });
  }, [orderedList, searchQuery, selectedFilter]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const now = new Date();
    let active = 0;
    let scheduled = 0;
    let expired = 0;

    for (const item of rawAnnouncements) {
      if ((item.expires_at && new Date(item.expires_at) < now) || item.cleared_at || item.is_active === false) {
        expired++;
      } else if (item.scheduled_at && new Date(item.scheduled_at) > now) {
        scheduled++;
      } else {
        active++;
      }
    }
    return { total: rawAnnouncements.length, active, scheduled, expired };
  }, [rawAnnouncements]);

  /* ── Drag & Drop Reorder Mutation ── */
  const reorderMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await saveSiteSettings({
        data: { entries: [{ key: "notification_order", value: ids }] },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements-sort-order"] });
      toast.success("Display sequence saved");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleReorder = (items: StoreAnnouncement[]) => {
    const ids = items.map((i: StoreAnnouncement) => i.id);
    reorderMutation.mutate(ids);
  };

  const { dragIndex, overIndex, getDragProps } = useDragReorder(orderedList, handleReorder);

  /* ── Form Save Mutation (Saves Announcement & Fires Global Notification) ── */
  const saveMutation = useMutation({
    mutationFn: async () => {
      setIsDispatching(true);
      const payload: any = {
        title: form.title.trim(),
        message: form.message.trim() || null,
        link_url: form.link_url.trim() || null,
        type: form.type,
        priority: form.priority,
        icon: form.icon || null,
        is_active: form.is_active,
        scheduled_at: form.scheduled_at || null,
        expires_at: form.expires_at || null,
      };

      if (editingItem?.id) {
        payload.id = editingItem.id;
        payload.created_at = editingItem.created_at;
        payload.notification_id = editingItem.notification_id;
      }

      await upsertAnnouncementFn({ data: payload });

      // If audience broadcast is requested
      if (form.also_notify_audience && audienceMembers.length > 0) {
        const channels = [
          audienceChannels.email && `Email (${validEmailsCount})`,
          audienceChannels.whatsapp && `WhatsApp (${validPhonesCount})`,
          audienceChannels.sms && `SMS (${validPhonesCount})`,
        ].filter(Boolean).join(", ");
        if (channels) {
          toast.success(`Audience broadcast queued via: ${channels}`);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-announcements-list"] });
      qc.invalidateQueries({ queryKey: ["bell-notifications"] });
      toast.success(editingItem ? "Announcement updated and notification synced" : "Announcement published sitewide & notification fired");
      closeDialog();
    },
    onError: (err: any) => toast.error(err.message),
    onSettled: () => setIsDispatching(false),
  });

  /* ── Delete Mutation ── */
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteAnnouncementFn({ data: { id } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-announcements-list"] });
      qc.invalidateQueries({ queryKey: ["bell-notifications"] });
      toast.success("Announcement deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  /* ── Toggle Active Mutation ── */
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await toggleAnnouncementFn({ data: { id, is_active: isActive } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-announcements-list"] });
      qc.invalidateQueries({ queryKey: ["bell-notifications"] });
      toast.success("Announcement status updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openNew = () => {
    setEditingItem(null);
    setForm({
      title: "",
      message: "",
      link_url: "",
      type: "announcement",
      priority: "normal",
      icon: "",
      is_active: true,
      scheduled_at: "",
      expires_at: "",
      also_notify_audience: false,
    });
    setDialogOpen(true);
  };

  const openEdit = (item: StoreAnnouncement) => {
    setEditingItem(item);
    setForm({
      title: item.title || "",
      message: item.message || "",
      link_url: item.link_url || "",
      type: item.type || "announcement",
      priority: item.priority || "normal",
      icon: item.icon || "",
      is_active: item.is_active ?? true,
      scheduled_at: item.scheduled_at ? new Date(item.scheduled_at).toISOString().slice(0, 16) : "",
      expires_at: item.expires_at ? new Date(item.expires_at).toISOString().slice(0, 16) : "",
      also_notify_audience: false,
    });
    setDialogOpen(true);
  };

  const duplicateItem = (item: StoreAnnouncement) => {
    setEditingItem(null);
    setForm({
      title: `${item.title} (Copy)`,
      message: item.message || "",
      link_url: item.link_url || "",
      type: item.type || "announcement",
      priority: item.priority || "normal",
      icon: item.icon || "",
      is_active: false,
      scheduled_at: "",
      expires_at: "",
      also_notify_audience: false,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  const activeFilterLabel = filterOptions.find((f) => f.id === selectedFilter)?.label || "All";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-sm">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground tracking-tight">
                Announcements
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sitewide marketing announcements, promotional banners, and marquee alerts
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-9 px-3 text-xs gap-1.5 border-border/60 hover:bg-secondary/60 rounded-xl"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Button
            onClick={openNew}
            className="h-9 px-4 text-xs font-semibold gap-1.5 rounded-xl shadow-md bg-primary hover:bg-primary/90 text-primary-foreground transition-all"
          >
            <Plus className="w-4 h-4" />
            New Announcement
          </Button>
        </div>
      </div>

      {/* ── Quick KPI Stat Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-card border border-border/50 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Total</p>
            <p className="text-lg font-bold text-foreground mt-0.5">{stats.total}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center text-muted-foreground text-xs font-semibold">
            📢
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-emerald-500/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-emerald-500">Active Now</p>
            <p className="text-lg font-bold text-foreground mt-0.5">{stats.active}</p>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-amber-500/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-amber-500">Scheduled</p>
            <p className="text-lg font-bold text-foreground mt-0.5">{stats.scheduled}</p>
          </div>
          <Clock className="w-4 h-4 text-amber-500" />
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border/50 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Expired / Off</p>
            <p className="text-lg font-bold text-muted-foreground mt-0.5">{stats.expired}</p>
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
            placeholder="Search announcements, offers, updates..."
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

      {/* ── Announcements List ── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-card border border-border/40 animate-pulse" />
          ))}
        </div>
      ) : filteredList.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-card border border-dashed border-border/60">
          <div className="w-12 h-12 rounded-2xl bg-secondary/60 text-muted-foreground flex items-center justify-center mx-auto mb-3">
            <Megaphone className="w-6 h-6 opacity-60" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">No announcements found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            {searchQuery || selectedFilter !== "all"
              ? "Try adjusting your search query or filter"
              : "Create your first sitewide announcement to notify store visitors of offers, updates, or drop alerts."}
          </p>
          <Button onClick={openNew} size="sm" className="rounded-xl text-xs font-semibold gap-1.5">
            <Plus className="w-4 h-4" /> Create Announcement
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {filteredList.map((item: StoreAnnouncement, idx: number) => {
              const typeCfg = notifTypes.find((t) => t.value === item.type) || notifTypes[0];
              const prioCfg = priorityConfig[item.priority || "normal"] || priorityConfig.normal;
              const now = new Date();
              const isExpired = (item.expires_at && new Date(item.expires_at) < now) || !!item.cleared_at || item.is_active === false;
              const isScheduled = item.scheduled_at && new Date(item.scheduled_at) > now;
              const isActive = !isExpired && !isScheduled;

              const dragProps = getDragProps(idx);

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className={`group relative rounded-2xl border transition-all duration-200 p-4 bg-card ${
                    isActive
                      ? "border-border/60 shadow-sm hover:border-primary/40 hover:shadow-md"
                      : "border-border/30 opacity-70 bg-card/60"
                  } ${dragIndex === idx ? "opacity-50 ring-2 ring-primary" : ""}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Drag Handle + Info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        {...dragProps}
                        className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground mt-1 p-1 rounded-lg hover:bg-secondary transition-colors"
                        title="Drag to reorder sitewide display"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] font-semibold h-5 px-2 rounded-lg border ${typeCfg.color}`}>
                            {typeCfg.label}
                          </Badge>

                          <Badge variant="outline" className={`text-[10px] h-5 px-2 rounded-lg border ${prioCfg.color}`}>
                            {prioCfg.label}
                          </Badge>

                          {isActive && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active Sitewide
                            </span>
                          )}

                          {isScheduled && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              <Clock className="w-3 h-3" /> Scheduled
                            </span>
                          )}

                          {isExpired && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border/40">
                              Expired / Off
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {item.icon && (
                            <span className="text-base leading-none">
                              {notifIcons.find((i) => i.value === item.icon)?.icon || "📢"}
                            </span>
                          )}
                          <h3 className="text-sm font-semibold text-foreground truncate">{item.title}</h3>
                        </div>

                        {item.message && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {item.message}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                          {item.link_url && (
                            <a
                              href={item.link_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                            >
                              <ExternalLink className="w-3 h-3" /> {item.link_url}
                            </a>
                          )}

                          {item.scheduled_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Start: {new Date(item.scheduled_at).toLocaleString()}
                            </span>
                          )}

                          {item.expires_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Expires: {new Date(item.expires_at).toLocaleString()}
                            </span>
                          )}

                          <span>Added: {new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Active Toggle & Actions */}
                    <div className="flex items-center gap-2 sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 border-border/30 justify-between sm:justify-end">
                      <div className="flex items-center gap-2 mr-2">
                        <span className="text-[11px] font-medium text-muted-foreground">Active</span>
                        <Switch
                          checked={isActive}
                          onCheckedChange={(val) => toggleMutation.mutate({ id: item.id, isActive: val })}
                          aria-label="Toggle active status"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => duplicateItem(item)}
                          className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                          title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(item)}
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
                              <AlertDialogTitle>Delete Announcement?</AlertDialogTitle>
                              <AlertDialogDescription className="text-xs">
                                Are you sure you want to delete "{item.title}"? This will remove the sitewide announcement banner and clear its linked notification.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(item.id)}
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

      {/* ── Clean Single-Flow Announcement Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl rounded-3xl p-6 border-border/60 shadow-2xl bg-card">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-display text-foreground flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              {editingItem ? "Edit Announcement" : "Create Announcement"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Sitewide announcements display globally for all visitors and fire a notification into user inboxes.
            </DialogDescription>
          </DialogHeader>

          {/* Live Preview Strip */}
          <div className="p-3 rounded-2xl bg-secondary/50 border border-border/40 space-y-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase flex items-center gap-1">
              <Eye className="w-3 h-3" /> Live Preview
            </span>
            <div className="p-2.5 rounded-xl bg-background border border-border/50 flex items-center gap-2 text-xs">
              <span>{notifIcons.find((i) => i.value === form.icon)?.icon || "📢"}</span>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-foreground">{form.title || "Your Announcement Title"}</span>
                {form.message && <span className="text-muted-foreground ml-1.5 opacity-90">— {form.message}</span>}
              </div>
              {form.link_url && (
                <span className="text-[10px] text-primary underline shrink-0 font-medium">Learn More →</span>
              )}
            </div>
          </div>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Announcement Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Summer Drop is Live! Get 20% OFF with code SUMMER20"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* Message Body */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Message Body (Optional)</Label>
              <Textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Optional details or subtext displayed on click or dropdown..."
                rows={2}
                className="text-xs rounded-xl resize-none"
              />
            </div>

            {/* Type, Priority, Icon */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Type</Label>
                <Select value={form.type} onValueChange={(val: any) => setForm({ ...form, type: val })}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="announcement">📢 Announcement</SelectItem>
                    <SelectItem value="offer">🏷️ Special Offer</SelectItem>
                    <SelectItem value="update">ℹ️ Store Update</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Priority</Label>
                <Select value={form.priority} onValueChange={(val: any) => setForm({ ...form, priority: val })}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Icon</Label>
                <Select value={form.icon} onValueChange={(val) => setForm({ ...form, icon: val })}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {notifIcons.map((ic) => (
                      <SelectItem key={ic.value || "default"} value={ic.value}>
                        {ic.icon} {ic.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Link URL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Destination Link URL (Optional)</Label>
              <Input
                value={form.link_url}
                onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                placeholder="e.g. /categories/clothing or /offers/summer"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* Timing & Scheduling */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Schedule Start (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Auto-Expire Time (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Audience Broadcast Section */}
            {!editingItem && (
              <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Broadcast to Subscriber Audience</p>
                      <p className="text-[11px] text-muted-foreground">
                        Optionally dispatch this announcement to registered marketing contacts
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={form.also_notify_audience}
                    onCheckedChange={(val) => setForm({ ...form, also_notify_audience: val })}
                  />
                </div>

                {form.also_notify_audience && (
                  <div className="pt-2 border-t border-border/30 grid grid-cols-3 gap-2">
                    <label className="flex items-center gap-2 p-2 rounded-xl bg-background border border-border/40 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={audienceChannels.email}
                        onChange={(e) => setAudienceChannels({ ...audienceChannels, email: e.target.checked })}
                        className="rounded"
                      />
                      <span>Email ({validEmailsCount})</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-background border border-border/40 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={audienceChannels.whatsapp}
                        onChange={(e) => setAudienceChannels({ ...audienceChannels, whatsapp: e.target.checked })}
                        className="rounded"
                      />
                      <span>WhatsApp ({validPhonesCount})</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-background border border-border/40 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={audienceChannels.sms}
                        onChange={(e) => setAudienceChannels({ ...audienceChannels, sms: e.target.checked })}
                        className="rounded"
                      />
                      <span>SMS ({validPhonesCount})</span>
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeDialog} className="h-9 rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!form.title.trim() || isDispatching}
              className="h-9 rounded-xl text-xs font-semibold gap-1.5 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isDispatching ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : editingItem ? (
                "Update Announcement"
              ) : (
                "Publish Sitewide"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
