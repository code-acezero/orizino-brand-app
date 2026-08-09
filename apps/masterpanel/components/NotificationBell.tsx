"use client";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Bell, X, CheckCheck, Info, AlertTriangle, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "@/lib/router-compat";
import { subscribe as subscribeToasts, type AppToast, removeToast as removeAppToast } from "@/lib/app-toast";
import { playNotificationSound } from "@/lib/sounds";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAdaptivePolling } from "@/hooks/use-adaptive-polling";
import { toast } from "@/lib/app-toast";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
  link_url: string | null;
  user_id: string | null;
}

const typeConfig: Record<string, { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; color: string }> = {
  success: { icon: CheckCircle, color: "text-green-400" },
  error: { icon: XCircle, color: "text-destructive" },
  warning: { icon: AlertTriangle, color: "text-yellow-400" },
  general: { icon: Info, color: "text-primary" },
  info: { icon: Info, color: "text-blue-400" },
};

interface IslandItem {
  id: string;
  title: string;
  message?: string;
  type: string;
  source: "notification" | "toast";
}

interface NotificationBellProps {
  adminMode?: boolean;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ adminMode = false }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [islandItem, setIslandItem] = useState<IslandItem | null>(null);
  const [lastSeenId, setLastSeenId] = useState<string | null>(null);
  const [panelPosition, setPanelPosition] = useState({ top: 64, right: 12 });

  useEffect(() => {
    if (open) window.dispatchEvent(new CustomEvent("nav:menu-open", { detail: { from: "bell" } }));
  }, [open]);
  useEffect(() => {
    const h = (e: Event) => { if ((e as CustomEvent).detail?.from !== "bell") setOpen(false); };
    window.addEventListener("nav:menu-open", h);
    return () => window.removeEventListener("nav:menu-open", h);
  }, []);
  const [bellRing, setBellRing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const islandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track if island is actively dismissing to prevent flicker
  const [islandDismissing, setIslandDismissing] = useState(false);

  // Locally-dismissed notification IDs (for broadcasts the user can't delete from DB)
  const dismissedKey = user ? `notif-dismissed:${user.id}` : "";
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined" || !user) return new Set();
    try {
      const raw = window.localStorage.getItem(`notif-dismissed:${user.id}`);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });

  const persistDismissed = (next: Set<string>) => {
    setDismissedIds(next);
    if (typeof window !== "undefined" && dismissedKey) {
      try {
        window.localStorage.setItem(dismissedKey, JSON.stringify(Array.from(next)));
      } catch {
        /* ignore quota */
      }
    }
  };

  const pollInterval = useAdaptivePolling(60000);
  const { data: rawNotifications = [] } = useQuery({
    queryKey: ["bell-notifications", user?.id, adminMode ? "admin" : "user"],
    queryFn: async () => {
      let query = (supabase.from("notifications") as any).select("*").is("cleared_at", null);
      if (adminMode) {
        query = query.or(`user_id.is.null,user_id.eq.${user!.id}`);
      } else {
        query = query
          .or(`user_id.eq.${user!.id},user_id.is.null`)
          .not("type", "in", '("support","call","admin","order_status","low_stock")');
      }
      const { data, error } = await query.order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
    refetchInterval: pollInterval,
    refetchIntervalInBackground: false,
    staleTime: 30000,
  });

  const notifications = rawNotifications.filter((n) => !dismissedIds.has(n.id));

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const dismissIsland = () => {
    if (islandTimerRef.current) clearTimeout(islandTimerRef.current);
    setIslandDismissing(true);
    // Let exit animation play before clearing item
    setTimeout(() => {
      setIslandItem(null);
      setIslandDismissing(false);
    }, 300);
  };

  const showIsland = (item: IslandItem) => {
    if (islandTimerRef.current) clearTimeout(islandTimerRef.current);
    setIslandDismissing(false);
    setIslandItem(item);
    setBellRing(true);
    setTimeout(() => setBellRing(false), 600);
    islandTimerRef.current = setTimeout(() => dismissIsland(), 4000);
  };

  useEffect(() => {
    if (notifications.length > 0 && !open) {
      const latest = notifications[0];
      if (!latest || latest.is_read || latest.id === lastSeenId) return;
      // Session-scoped dedupe: alert once per notification id per session per user
      const sessionKey = `notif-alerted:${user?.id ?? "anon"}`;
      let alerted: Set<string>;
      try {
        const raw = typeof window !== "undefined" ? window.sessionStorage.getItem(sessionKey) : null;
        alerted = new Set(raw ? (JSON.parse(raw) as string[]) : []);
      } catch { alerted = new Set(); }
      if (alerted.has(latest.id)) { setLastSeenId(latest.id); return; }
      alerted.add(latest.id);
      try { window.sessionStorage.setItem(sessionKey, JSON.stringify(Array.from(alerted))); } catch { /* ignore */ }
      setLastSeenId(latest.id);
      playNotificationSound();
      showIsland({
        id: latest.id,
        title: latest.title,
        message: latest.message || undefined,
        type: latest.type,
        source: "notification",
      });
    }
  }, [notifications, open, lastSeenId, user?.id]);

  useEffect(() => {
    const unsub = subscribeToasts((toasts: AppToast[]) => {
      if (toasts.length > 0) {
        const t = toasts[0];
        showIsland({
          id: `toast-${t.id}`,
          title: t.title,
          message: t.description,
          type: t.type,
          source: "toast",
        });
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open || isMobile) return;
    const updatePosition = () => {
      const rect = panelRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPanelPosition({
        top: Math.round(rect.bottom + 8),
        right: Math.max(8, Math.round(window.innerWidth - rect.right)),
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, isMobile]);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bell-notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-notifications"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter((n) => !n.is_read);
      for (const n of unread) {
        await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bell-notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-notifications"] });
    },
  });


  const clearAll = useMutation({
    mutationFn: async () => {
      const visible = notifications;
      if (visible.length === 0) return { cleared: 0 };
      const ownIds = visible.filter((n) => n.user_id === user!.id).map((n) => n.id);
      const broadcastIds = visible.filter((n) => n.user_id !== user!.id).map((n) => n.id);

      // Soft-clear own rows so they can still be viewed under profile → notifications
      if (ownIds.length > 0) {
        const { error } = await (supabase.from("notifications") as any)
          .update({ cleared_at: new Date().toISOString() })
          .in("id", ownIds);
        if (error) throw error;
      }

      // Locally dismiss broadcasts (can't mutate global rows for other users)
      if (broadcastIds.length > 0) {
        const next = new Set(dismissedIds);
        broadcastIds.forEach((id) => next.add(id));
        persistDismissed(next);
      }

      return { cleared: ownIds.length + broadcastIds.length };
    },
    onSuccess: (res) => {
      toast({ title: res?.cleared ? "Notifications cleared" : "Nothing to clear" });
      qc.invalidateQueries({ queryKey: ["bell-notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-notifications"] });
      qc.invalidateQueries({ queryKey: ["profile-notifications"] });
    },
    onError: (e: any) => {
      toast({ title: "Couldn't clear notifications", description: e?.message, variant: "destructive" });
    },
  });

  const getConfig = (type: string) => typeConfig[type] || typeConfig.general;
  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (!user) return null;

  const isExpanded = !!islandItem && !islandDismissing && !open;
  const desktopIsland = !isMobile && isExpanded && islandItem;
  const mobileIsland = isMobile && isExpanded && islandItem;

  // Responsive expanded width — never exceed viewport
  const expandedWidth = typeof window !== "undefined"
    ? Math.min(window.innerWidth - 32, 280)
    : 280;

  return (
    <div className="relative w-10 h-10 shrink-0" ref={panelRef}>
      {/* Bell + Desktop inline expanding island — absolutely positioned so it doesn't push layout */}
      <div className="absolute top-0 right-0 h-10 flex items-center justify-end z-[60]">
        <motion.div
          role="button"
          tabIndex={0}
          aria-label="Open notifications"
          className="flex items-center rounded-full bg-secondary/40 backdrop-blur-md overflow-hidden cursor-pointer relative border border-border/30 shadow-sm"
          onClick={() => {
            if (desktopIsland) {
              dismissIsland();
              setOpen(true);
            } else {
              setOpen(!open);
            }
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            if (desktopIsland) {
              dismissIsland();
              setOpen(true);
            } else {
              setOpen((value) => !value);
            }
          }}
          animate={{
            width: desktopIsland ? expandedWidth : 40,
            height: 40,
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 35,
            mass: 0.8,
          }}
          style={{ transformOrigin: "right center" }}
        >
          {/* Inline island content (desktop only) — sits left of bell */}
          <AnimatePresence mode="wait">
            {desktopIsland && (
              <motion.div
                key={islandItem!.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2 pl-3 pr-1 min-w-0 flex-1"
              >
                {React.createElement(getConfig(islandItem!.type).icon, {
                  className: `w-3.5 h-3.5 shrink-0 ${getConfig(islandItem!.type).color}`,
                })}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate leading-tight">
                    {islandItem!.title}
                  </p>
                  {islandItem!.message && (
                    <p className="text-[10px] text-muted-foreground truncate leading-tight">
                      {islandItem!.message}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissIsland();
                  }}
                  className="shrink-0 p-1 rounded-full hover:bg-secondary/50"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bell icon – always visible, pinned right */}
          <motion.div
            className="flex items-center justify-center shrink-0"
            style={{ width: 40, height: 40 }}
            animate={{
              rotate: bellRing ? [0, 15, -15, 10, -10, 5, 0] : 0,
            }}
            transition={bellRing ? { duration: 0.6 } : { duration: 0.2 }}
          >
            <Bell className="w-[18px] h-[18px] text-muted-foreground" />
          </motion.div>
        </motion.div>

        {/* Unread badge */}
        {unreadCount > 0 && !desktopIsland && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center font-bold pointer-events-none ring-2 ring-background"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </div>



      {/* Mobile dropdown island */}
      <AnimatePresence>
        {mobileIsland && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="fixed top-[4.25rem] z-[100]"
            style={{
              transformOrigin: "top center",
              left: "max(0.75rem, calc((100vw - 20rem) / 2))",
              right: "max(0.75rem, calc((100vw - 20rem) / 2))",
            }}

            onClick={() => {
              dismissIsland();
              setOpen(true);
            }}
          >
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-secondary/90 backdrop-blur-xl border border-border/50 shadow-lg cursor-pointer">
              {React.createElement(getConfig(islandItem!.type).icon, {
                className: `w-4 h-4 shrink-0 ${getConfig(islandItem!.type).color}`,
              })}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate leading-tight">
                  {islandItem!.title}
                </p>
                {islandItem!.message && (
                  <p className="text-[10px] text-muted-foreground truncate leading-tight">
                    {islandItem!.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissIsland();
                }}
                className="shrink-0 p-0.5 rounded-full hover:bg-secondary/50"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification panel */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {open && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`${isMobile ? "fixed top-[3.75rem] right-2 left-2 w-auto" : "fixed w-80"} max-h-[420px] z-[1000]`}
            style={isMobile ? undefined : { top: panelPosition.top, right: panelPosition.right }}
          >
            <div className="rounded-2xl border border-border/60 shadow-2xl overflow-hidden bg-popover backdrop-blur-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-popover">
                <h3 className="text-sm font-semibold text-popover-foreground">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => markAllRead.mutate()}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <CheckCheck className="w-3 h-3" /> Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={() => clearAll.mutate()}
                      className="text-xs text-destructive hover:underline flex items-center gap-1"
                      title="Delete all notifications"
                    >
                      <Trash2 className="w-3 h-3" /> Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-y-auto max-h-[350px] divide-y divide-border/30">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground text-sm">No notifications yet</div>
                ) : (
                  notifications.map((notif) => {
                    const cfg = getConfig(notif.type);
                    const IconComp = cfg.icon;
                    const content = (
                      <div
                        className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-secondary/30 cursor-pointer ${!notif.is_read ? "bg-primary/5" : ""}`}
                        onClick={() => { if (!notif.is_read) markRead.mutate(notif.id); }}
                      >
                        <div className={`mt-0.5 shrink-0 ${cfg.color}`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`text-xs font-medium truncate ${!notif.is_read ? "text-foreground" : "text-muted-foreground"}`}>{notif.title}</p>
                            {!notif.is_read && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                          </div>
                          {notif.message && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{notif.message}</p>}
                          <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(notif.created_at)}</p>
                        </div>
                      </div>
                    );
                    return notif.link_url ? (
                      <Link key={notif.id} to={notif.link_url} onClick={() => setOpen(false)}>{content}</Link>
                    ) : (
                      <div key={notif.id}>{content}</div>
                    );
                  })
                )}
              </div>
              <div className="border-t border-border/50 bg-popover">
                <Link
                  to="/settings-ai/notifications"
                  onClick={() => setOpen(false)}
                  className="block text-center text-xs font-medium text-primary hover:bg-secondary/40 py-2.5 transition-colors"
                >
                  View all notifications
                </Link>
              </div>
            </div>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
};

export default NotificationBell;
// code:4ce0
