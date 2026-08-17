import { supabase } from "@/integrations/supabase/client";

// Public VAPID key fallback (from Supabase vault)
const FALLBACK_VAPID_PUBLIC_KEY =
  "BAsMb_OjifsEXEE9rFj2ojhMIy6uZ1hnPE_Q8mr9WQaP5NX5FFwAvMoSGbsl9twLjfeUq2j-ly0F88kQorouah8";

// ── Helpers ───────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// ── Support detection ─────────────────────────────────────────────────────

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// ── Service worker registration ───────────────────────────────────────────

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration("/sw.js");
    if (existing?.active) return existing;
    if (existing) {
      return new Promise((resolve) => {
        if (existing.active) { resolve(existing); return; }
        existing.addEventListener("updatefound", () => {
          existing.installing?.addEventListener("statechange", function () {
            if (this.state === "activated") resolve(existing);
          });
        });
        setTimeout(() => resolve(existing), 3000);
      });
    }
    return await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
  } catch (e) {
    console.warn("[push] SW register failed", e);
    return null;
  }
}

// ── Direct permission prompt (MUST BE CALLED DIRECTLY ON USER CLICK) ──────

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!pushSupported()) return "denied";
  try {
    return await Notification.requestPermission();
  } catch (e) {
    console.warn("[push] Notification.requestPermission error", e);
    return "denied";
  }
}

// ── Subscribe ─────────────────────────────────────────────────────────────

export async function subscribeToPush(userId?: string | null): Promise<boolean> {
  if (!pushSupported()) return false;

  // 1. Check or request permission
  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return false;

  // 2. Ensure active SW
  const reg = await ensureServiceWorker();
  if (!reg) return false;

  // 3. Resolve VAPID Public Key (Edge function + hard fallback)
  let publicKey = FALLBACK_VAPID_PUBLIC_KEY;
  try {
    const { data: keyData } = await supabase.functions.invoke("get-vapid-key");
    if (keyData?.publicKey) publicKey = keyData.publicKey;
  } catch (e) {
    console.warn("[push] get-vapid-key invoke failed, using fallback", e);
  }

  // 4. Subscribe with PushManager
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    } catch (e) {
      console.warn("[push] pushManager.subscribe failed", e);
      return false;
    }
  }

  const json = sub.toJSON() as any;
  const endpoint = json.endpoint as string;
  const p256dh = json.keys?.p256dh as string;
  const auth = json.keys?.auth as string;
  if (!endpoint || !p256dh || !auth) return false;

  // 5. Resolve user ID if not provided
  let targetUserId = userId;
  if (!targetUserId) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      targetUserId = authData.user?.id || null;
    } catch {}
  }

  // 6. Upsert to push_subscriptions
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: targetUserId,
        endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );

  if (error) console.warn("[push] upsert subscription error", error);

  return true;
}

// ── Unsubscribe ───────────────────────────────────────────────────────────

export async function unsubscribeFromPush(userId?: string | null): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      try { await sub.unsubscribe(); } catch { /* noop */ }
      let query = supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
      if (userId) query = query.eq("user_id", userId);
      await query;
    }
    return true;
  } catch (e) {
    console.warn("[push] unsubscribe failed", e);
    return false;
  }
}

// ── Status ────────────────────────────────────────────────────────────────

export async function getPushStatus(userId?: string | null): Promise<{
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
  lastUsedAt: string | null;
  deviceCount: number;
}> {
  if (!pushSupported()) {
    return { permission: "unsupported", subscribed: false, lastUsedAt: null, deviceCount: 0 };
  }
  const permission = Notification.permission;
  if (!userId) {
    let hasLocalSub = false;
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      hasLocalSub = !!sub;
    } catch {}
    return {
      permission,
      subscribed: permission === "granted" && hasLocalSub,
      lastUsedAt: null,
      deviceCount: hasLocalSub ? 1 : 0,
    };
  }

  const { data } = await supabase
    .from("push_subscriptions")
    .select("last_used_at, created_at")
    .eq("user_id", userId)
    .order("last_used_at", { ascending: false, nullsFirst: false });
  const rows = data || [];

  let subscribed = rows.length > 0 && permission === "granted";
  if (subscribed) {
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (!sub) subscribed = false;
    } catch {}
  }

  return {
    permission,
    subscribed,
    lastUsedAt: (rows[0]?.last_used_at as string) || (rows[0]?.created_at as string) || null,
    deviceCount: rows.length,
  };
}

// ── Send ──────────────────────────────────────────────────────────────────

export async function sendPush(
  userId: string,
  payload: { title: string; body?: string; type?: "call" | "order" | "promo" | "general"; url?: string; tag?: string; image?: string; data?: any }
) {
  return supabase.functions.invoke("send-push", { body: { user_id: userId, payload } });
}
// code:4ce0
