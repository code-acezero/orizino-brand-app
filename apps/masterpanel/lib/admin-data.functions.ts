import { supabase } from "@/integrations/supabase/client";

export interface StoreAnnouncement {
  id: string;
  title: string;
  message?: string | null;
  link_url?: string | null;
  type: "announcement" | "offer" | "update";
  priority: "normal" | "high" | "urgent";
  icon?: string | null;
  is_active: boolean;
  scheduled_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
  cleared_at?: string | null;
  notification_id?: string | null;
}

const isUUID = (val?: string | null): boolean => {
  return typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

const generateUUID = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export async function upsertSiteSettings(input: any) {
  const payload = input?.data ?? input;
  const entries: { key: string; value: any }[] = payload?.entries || [];
  if (!entries.length) return { ok: true, saved: 0 };

  const updatedAt = new Date().toISOString();
  for (const entry of entries) {
    const { error } = await (supabase.from("site_settings") as any)
      .upsert(
        { key: entry.key, value: entry.value, updated_at: updatedAt },
        { onConflict: "key" }
      );
    if (error) throw new Error(error.message);
  }
  return { ok: true, saved: entries.length };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Announcements: Global Sitewide Notices & Tickers
 * Rule: All announcements fire notifications, but not all notifications are announcements.
 * ────────────────────────────────────────────────────────────────────────── */

export async function getAdminAnnouncements(): Promise<StoreAnnouncement[]> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "storefront_announcements")
    .maybeSingle();

  if (error) throw error;
  const list = (data?.value as unknown as StoreAnnouncement[]) || [];
  return Array.isArray(list) ? list : [];
}

export async function upsertAdminAnnouncement(input: any) {
  const data = input?.data ?? input;
  const list = await getAdminAnnouncements();

  const now = new Date().toISOString();
  const id = data.id || generateUUID();
  const notifId = isUUID(data.notification_id) ? data.notification_id : generateUUID();

  const item: StoreAnnouncement = {
    id,
    title: data.title?.trim() || "Announcement",
    message: data.message?.trim() || null,
    link_url: data.link_url?.trim() || null,
    type: data.type || "announcement",
    priority: data.priority || "normal",
    icon: data.icon || null,
    is_active: data.is_active ?? true,
    scheduled_at: data.scheduled_at || null,
    expires_at: data.expires_at || null,
    cleared_at: data.is_active === false ? now : null,
    created_at: data.created_at || now,
    updated_at: now,
    notification_id: notifId,
  };

  const existingIdx = list.findIndex((a) => a.id === id);
  let updatedList: StoreAnnouncement[];
  if (existingIdx >= 0) {
    updatedList = [...list];
    updatedList[existingIdx] = { ...list[existingIdx], ...item };
  } else {
    updatedList = [item, ...list];
  }

  // 1. Save to dedicated Announcements storage in site_settings
  await upsertSiteSettings({
    entries: [{ key: "storefront_announcements", value: updatedList }],
  });

  // 2. Fire Global Notification into public.notifications
  // (All announcements fire notifications, global for everyone)
  try {
    await (supabase.from("notifications") as any).upsert(
      {
        id: notifId,
        user_id: null, // Global notification for all visitors / users
        title: item.title,
        message: item.message,
        type: "announcement",
        icon: item.icon,
        link_url: item.link_url,
        priority: item.priority,
        is_read: false,
        created_at: item.created_at,
        cleared_at: item.is_active ? null : now,
      },
      { onConflict: "id" }
    );
  } catch (err) {
    console.warn("Failed to sync linked announcement notification:", err);
  }

  return { ok: true, item };
}

export async function sendAdminAnnouncement(input: any) {
  return upsertAdminAnnouncement(input);
}

export async function toggleAdminAnnouncement(input: any) {
  const data = input?.data ?? input;
  const { id, is_active } = data;
  const list = await getAdminAnnouncements();

  const now = new Date().toISOString();
  const target = list.find((a) => a.id === id);
  if (!target) return { ok: true };

  const updatedList = list.map((a) => {
    if (a.id === id) {
      return {
        ...a,
        is_active,
        cleared_at: is_active ? null : now,
        updated_at: now,
      };
    }
    return a;
  });

  await upsertSiteSettings({
    entries: [{ key: "storefront_announcements", value: updatedList }],
  });

  // Sync linked notification status
  if (target.notification_id && isUUID(target.notification_id)) {
    try {
      await (supabase.from("notifications") as any)
        .update({ cleared_at: is_active ? null : now })
        .eq("id", target.notification_id);
    } catch {}
  }

  return { ok: true };
}

export async function deleteAdminAnnouncement(input: any) {
  const data = input?.data ?? input;
  const { id } = data;
  const list = await getAdminAnnouncements();

  const target = list.find((a) => a.id === id);
  const updatedList = list.filter((a) => a.id !== id);

  await upsertSiteSettings({
    entries: [{ key: "storefront_announcements", value: updatedList }],
  });

  // Delete linked announcement notification
  const notifId = target?.notification_id;
  if (notifId && isUUID(notifId)) {
    try {
      await supabase.from("notifications").delete().eq("id", notifId);
    } catch {}
  }

  return { ok: true };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Promotional Popups & Overlays
 * ────────────────────────────────────────────────────────────────────────── */

export async function upsertAdminPopup(input: any) {
  const data = input?.data ?? input;
  const { id, ...rest } = data;
  const cleaned: Record<string, any> = {};

  for (const [k, v] of Object.entries(rest)) {
    if (v === undefined) continue;
    if (k === "starts_at" || k === "ends_at" || k === "image_url" || k === "video_url" || k === "link_url" || k === "bg_color" || k === "text_color") {
      cleaned[k] = v === "" ? null : v;
    } else if (k === "trigger_value" || k === "max_views" || k === "duration_hours") {
      cleaned[k] = v === "" || v === null ? null : Number(v);
    } else {
      cleaned[k] = v;
    }
  }

  const result = id
    ? await (supabase.from("popups") as any).update(cleaned).eq("id", id)
    : await (supabase.from("popups") as any).insert(cleaned);

  if (result.error) throw new Error(result.error.message);
  return { ok: true };
}

export async function deleteAdminPopup(input: any) {
  const data = input?.data ?? input;
  const { error } = await (supabase.from("popups") as any).delete().eq("id", data.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function toggleAdminPopup(input: any) {
  const data = input?.data ?? input;
  const { id, is_active } = data;
  const { error } = await (supabase.from("popups") as any).update({ is_active }).eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}