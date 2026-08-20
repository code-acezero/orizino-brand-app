import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  Trash2,
  Volume2,
  VolumeX,
  ShoppingBag,
  Store,
  Layers,
  Headphones,
  Truck,
  Sparkles,
  ChevronRight,
  X,
  RefreshCw
} from "lucide-react";
import { useNotifications, OperationalNotification } from "@/lib/notifications";
import { formatDistanceToNow } from "date-fns";

function getNotificationIcon(type: OperationalNotification["type"]) {
  switch (type) {
    case "order":
      return <ShoppingBag className="w-4 h-4 text-emerald-500" />;
    case "pos":
      return <Store className="w-4 h-4 text-indigo-500" />;
    case "stock":
      return <Layers className="w-4 h-4 text-amber-500" />;
    case "support":
      return <Headphones className="w-4 h-4 text-sky-500" />;
    case "dispatch":
      return <Truck className="w-4 h-4 text-blue-500" />;
    default:
      return <Sparkles className="w-4 h-4 text-purple-500" />;
  }
}

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
    soundEnabled,
    setSoundEnabled,
    refreshNotifications,
  } = useNotifications();

  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread" | "orders">("all");
  const [clearing, setClearing] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handlePointerDown);
    }
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "orders") return n.type === "order" || n.type === "pos";
    return true;
  });

  const handleItemClick = (notif: OperationalNotification) => {
    void markAsRead(notif.id);
    if (notif.actionUrl) {
      setIsOpen(false);
      navigate(notif.actionUrl);
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      await clearAll();
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Button with Realtime Live Pulse */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-secondary/70 border border-border/70 text-foreground hover:bg-secondary active:scale-95 transition-all cursor-pointer flex items-center justify-center"
        title="Operations Notifications"
        aria-label="Operations Notifications"
      >
        <Bell className="w-4 h-4 text-foreground/80" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold font-mono shadow-xs animate-in zoom-in-50">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="fixed sm:absolute right-2 sm:right-0 top-14 sm:top-full sm:mt-2 w-[calc(100vw-1rem)] sm:w-96 max-w-sm rounded-3xl bg-card/95 backdrop-blur-2xl border border-border/80 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-4 border-b border-border/60 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground">Operational Hub</h3>
                <p className="text-[10px] text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} unread alerts` : "All caught up"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void refreshNotifications()}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted text-xs transition-colors cursor-pointer"
                title="Refresh notifications from database"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                  soundEnabled
                    ? "bg-secondary text-primary border-border"
                    : "text-muted-foreground border-transparent hover:bg-muted"
                }`}
                title={soundEnabled ? "Sound enabled (click to mute)" : "Sound muted"}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllAsRead()}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted text-xs transition-colors cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}

              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={clearing}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs transition-colors cursor-pointer"
                  title="Clear all permanently from database"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted text-xs transition-colors cursor-pointer sm:hidden"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-4 py-2 border-b border-border/50 bg-card/40 flex items-center gap-1.5 text-xs">
            {(["all", "unread", "orders"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize transition-all cursor-pointer ${
                  filter === f
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-border/40 p-1">
            {loading ? (
              <div className="py-8 text-center px-4">
                <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Syncing notifications…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center px-4">
                <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs font-semibold text-foreground">No notifications</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Connected to Masterpanel. New events will appear here in real-time.
                </p>
              </div>
            ) : (
              filtered.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`group relative p-3 rounded-2xl flex items-start gap-3 transition-colors cursor-pointer ${
                    notif.read ? "hover:bg-muted/40 opacity-80" : "bg-primary/5 hover:bg-primary/10"
                  }`}
                >
                  <div className="p-2 rounded-xl bg-card border border-border/70 shrink-0 mt-0.5">
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-foreground truncate">{notif.title}</p>
                      <span className="text-[9px] text-muted-foreground shrink-0 font-mono">
                        {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    {notif.message && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                    )}
                    {notif.actionLabel && (
                      <div className="flex items-center gap-1 text-[10px] text-primary font-bold mt-1.5">
                        <span>{notif.actionLabel}</span>
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    )}
                  </div>

                  {/* Individual Delete Button (Permanently deletes from Supabase) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void removeNotification(notif.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer shrink-0"
                    title="Delete permanently from database"
                    aria-label="Delete notification"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-border/50 bg-muted/20 flex items-center justify-between text-xs">
            <span className="text-[10px] text-muted-foreground">
              Masterpanel Live Stream
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {notifications.length} {notifications.length === 1 ? "alert" : "alerts"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
