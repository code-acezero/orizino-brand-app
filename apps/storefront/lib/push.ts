import { supabase } from "@/integrations/supabase/client";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration("/sw.js");
    if (existing) return existing;
    return await navigator.serviceWorker.register("/sw.js");
  } catch (e) {
    console.warn("[push] SW register failed", e);
    return null;
  }
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!pushSupported()) return false;

  const reg = await ensureServiceWorker();
  if (!reg) return false;

  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const { data: keyData, error: keyErr } = await supabase.functions.invoke("get-vapid-key");
  if (keyErr || !keyData?.publicKey) {
    console.warn("[push] failed to get VAPID key", keyErr);
    return false;
  }

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });
    } catch (e) {
      console.warn("[push] subscribe failed", e);
      return false;
    }
  }

  const json = sub.toJSON() as any;
  const endpoint = json.endpoint as string;
  const p256dh = json.keys?.p256dh as string;
  const auth = json.keys?.auth as string;
  if (!endpoint || !p256dh || !auth) return false;

  await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );

  // Auto re-subscribe if the browser invalidates the push subscription
  try {
    navigator.serviceWorker.addEventListener?.("pushsubscriptionchange" as any, () => {
      subscribeToPush(userId).catch(() => {});
    });
  } catch { /* noop */ }

  return true;
}

export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      try { await sub.unsubscribe(); } catch { /* noop */ }
      await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", endpoint);
    }
    return true;
  } catch (e) {
    console.warn("[push] unsubscribe failed", e);
    return false;
  }
}

export async function getPushStatus(userId: string): Promise<{
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
  lastUsedAt: string | null;
  deviceCount: number;
}> {
  if (!pushSupported()) {
    return { permission: "unsupported", subscribed: false, lastUsedAt: null, deviceCount: 0 };
  }
  const permission = Notification.permission;
  const { data } = await supabase
    .from("push_subscriptions")
    .select("last_used_at, created_at")
    .eq("user_id", userId)
    .order("last_used_at", { ascending: false, nullsFirst: false });
  const rows = data || [];
  return {
    permission,
    subscribed: rows.length > 0 && permission === "granted",
    lastUsedAt: (rows[0]?.last_used_at as string) || (rows[0]?.created_at as string) || null,
    deviceCount: rows.length,
  };
}

export async function sendPush(
  userId: string,
  payload: { title: string; body?: string; type?: "call" | "general"; url?: string; tag?: string; data?: any }
) {
  return supabase.functions.invoke("send-push", { body: { user_id: userId, payload } });
}
