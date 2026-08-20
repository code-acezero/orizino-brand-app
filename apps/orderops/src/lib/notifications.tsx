import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";

export type NotificationCategory =
  | "order"
  | "pos"
  | "stock"
  | "support"
  | "dispatch"
  | "system"
  | "success"
  | "warning"
  | "toast"
  | "info";

export interface OperationalNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationCategory;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  orderNumber?: string;
  amount?: number;
  userId?: string | null;
}

export interface DynamicIslandItem {
  id: string;
  title: string;
  subtitle?: string;
  type: NotificationCategory;
  actionUrl?: string;
  actionLabel?: string;
  durationMs?: number;
}

interface NotificationContextType {
  notifications: OperationalNotification[];
  unreadCount: number;
  activeIsland: DynamicIslandItem | null;
  soundEnabled: boolean;
  loading: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  triggerNotification: (notif: Omit<OperationalNotification, "id" | "timestamp" | "read">) => Promise<void>;
  showDynamicIsland: (item: Omit<DynamicIslandItem, "id">) => void;
  dismissIsland: () => void;
  refreshNotifications: () => Promise<void>;
}

const SOUND_KEY = "orderops_sound_enabled";

// Play a pleasant, modern, native-feeling iOS notification chime using Web Audio API
function playChime(type: string = "default") {
  try {
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    if (type === "order" || type === "success") {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(880, now + 0.12);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.28); // D6

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.1);
      osc1.stop(now + 0.45);
      osc2.stop(now + 0.45);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.08); // B5

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch {}
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function mapDbNotification(row: any): OperationalNotification {
  let category: NotificationCategory = "system";
  const type = String(row.type || "").toLowerCase();
  if (type.includes("order")) category = "order";
  else if (type.includes("pos")) category = "pos";
  else if (type.includes("stock")) category = "stock";
  else if (type.includes("support") || type.includes("call")) category = "support";
  else if (type.includes("dispatch")) category = "dispatch";

  return {
    id: row.id,
    title: row.title || "Notification",
    message: row.message || "",
    type: category,
    timestamp: row.created_at || new Date().toISOString(),
    read: !!row.is_read,
    actionUrl: row.link_url || (category === "order" ? "/orders" : undefined),
    actionLabel: category === "order" ? "View Order" : "Open",
    userId: row.user_id,
  };
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<OperationalNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const val = localStorage.getItem(SOUND_KEY);
      return val !== null ? val === "true" : true;
    } catch {
      return true;
    }
  });

  const [activeIsland, setActiveIsland] = useState<DynamicIslandItem | null>(null);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    try {
      localStorage.setItem(SOUND_KEY, String(enabled));
    } catch {}
  }, []);

  const dismissIsland = useCallback(() => {
    setActiveIsland(null);
  }, []);

  const showDynamicIsland = useCallback(
    (item: Omit<DynamicIslandItem, "id">) => {
      const id = `island-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const fullItem: DynamicIslandItem = { ...item, id };
      setActiveIsland(fullItem);

      if (soundEnabled) {
        playChime(item.type);
      }
    },
    [soundEnabled]
  );

  // ── Fetch Real Notifications from Supabase Database ────────────────────
  const refreshNotifications = useCallback(async () => {
    try {
      let query = (supabase.from("notifications") as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(35);

      if (user?.id) {
        query = query.or(`user_id.is.null,user_id.eq.${user.id}`);
      } else {
        query = query.is("user_id", null);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        setNotifications(data.map(mapDbNotification));
      }
    } catch (e) {
      console.warn("Failed to load notifications from Supabase:", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  // ── Trigger a New Notification (Persisted to Database) ──────────────────
  const triggerNotification = useCallback(
    async (notif: Omit<OperationalNotification, "id" | "timestamp" | "read">) => {
      // Show Dynamic Island immediately
      showDynamicIsland({
        title: notif.title,
        subtitle: notif.message,
        type: notif.type,
        actionUrl: notif.actionUrl,
        actionLabel: notif.actionLabel,
        durationMs: 4500,
      });

      try {
        // Insert directly into masterpanel/storefront shared notifications table
        const { data, error } = await (supabase.from("notifications") as any)
          .insert({
            title: notif.title,
            message: notif.message,
            type: notif.type,
            link_url: notif.actionUrl || null,
            is_read: false,
            priority: "normal",
            user_id: notif.userId || (user?.id ?? null),
          })
          .select()
          .single();

        if (!error && data) {
          const item = mapDbNotification(data);
          setNotifications((prev) => [item, ...prev.filter((n) => n.id !== item.id)]);
        }
      } catch (e) {
        console.warn("Could not insert notification into database:", e);
      }
    },
    [showDynamicIsland, user?.id]
  );

  // ── Mark as Read in Database ──────────────────────────────────────────
  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await (supabase.from("notifications") as any).update({ is_read: true }).eq("id", id);
    } catch {}
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      const ids = notifications.filter((n) => !n.read).map((n) => n.id);
      if (ids.length > 0) {
        await (supabase.from("notifications") as any).update({ is_read: true }).in("id", ids);
      }
    } catch {}
  }, [notifications]);

  // ── Clear All Permanently from Database ────────────────────────────────
  const clearAll = useCallback(async () => {
    const ids = notifications.map((n) => n.id);
    setNotifications([]);
    if (ids.length === 0) return;

    try {
      // Permanently delete from Supabase notifications table
      await (supabase.from("notifications") as any).delete().in("id", ids);
    } catch (e) {
      console.warn("Failed to permanently delete notifications:", e);
    }
  }, [notifications]);

  // ── Remove Single Notification Permanently from Database ──────────────
  const removeNotification = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await (supabase.from("notifications") as any).delete().eq("id", id);
    } catch (e) {
      console.warn("Failed to permanently delete notification:", e);
    }
  }, []);

  // ── Supabase Realtime Stream ─────────────────────────────────────────────
  useEffect(() => {
    // 1. Listen for new orders inserted or updated in real-time
    const ordersChannel = supabase
      .channel("orderops-realtime-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const row = payload.new as any;
          const orderNum = row.order_number ? `#${row.order_number}` : "New Order";
          const customer = row.customer_name || row.guest_email || "Guest Customer";
          const totalFormatted = row.total ? `৳${Number(row.total).toLocaleString()}` : "";

          void triggerNotification({
            title: `New Order ${orderNum}`,
            message: `${customer} placed an order ${totalFormatted ? `for ${totalFormatted}` : ""}.`,
            type: "order",
            actionUrl: "/orders",
            actionLabel: "Inspect Order",
            orderNumber: row.order_number,
            amount: row.total,
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const oldRow = payload.old as any;
          const newRow = payload.new as any;
          if (oldRow.status !== newRow.status) {
            const orderNum = newRow.order_number ? `#${newRow.order_number}` : "Order";
            showDynamicIsland({
              title: `Order ${orderNum} Updated`,
              subtitle: `Status changed to ${newRow.status}.`,
              type: "order",
              actionUrl: "/orders",
              actionLabel: "View Order",
            });
          }
        }
      )
      .subscribe();

    // 2. Listen for real-time notifications created across Masterpanel or Edge Functions
    const notifsChannel = supabase
      .channel("orderops-realtime-notifs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const row = payload.new as any;
          const item = mapDbNotification(row);

          setNotifications((prev) => {
            if (prev.some((n) => n.id === item.id)) return prev;
            return [item, ...prev];
          });

          showDynamicIsland({
            title: item.title,
            subtitle: item.message,
            type: item.type,
            actionUrl: item.actionUrl,
            actionLabel: item.actionLabel,
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications" },
        (payload) => {
          const oldId = (payload.old as any)?.id;
          if (oldId) {
            setNotifications((prev) => prev.filter((n) => n.id !== oldId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(notifsChannel);
    };
  }, [triggerNotification, showDynamicIsland]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        activeIsland,
        soundEnabled,
        loading,
        setSoundEnabled,
        markAsRead,
        markAllAsRead,
        clearAll,
        removeNotification,
        triggerNotification,
        showDynamicIsland,
        dismissIsland,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return ctx;
}
