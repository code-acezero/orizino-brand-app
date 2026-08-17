/**
 * InstallAppPrompt — Order Ops (Headless Native Trigger)
 * ─────────────────────────────────────────────────────────────────────────
 * Automatically triggers browser native functions without rendering website UI panels:
 *   1. Auto-triggers browser native Push Notification permission prompt first.
 *   2. Auto-triggers browser native PWA install prompt next (via beforeinstallprompt).
 */

import React, { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function subscribeOrderOpsPush(userId: string): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return false;

  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    const { data: keyData } = await supabase.functions.invoke("get-vapid-key");
    if (!keyData?.publicKey) return false;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });
    }

    const subJson = sub.toJSON();
    const p256dh = subJson.keys?.p256dh || "";
    const auth = subJson.keys?.auth || "";

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh,
        auth,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      },
      { onConflict: "endpoint" }
    );

    return !error;
  } catch (err) {
    console.error("[OrderOps PWA] Failed to subscribe to push:", err);
    return false;
  }
}

export function InstallAppPrompt() {
  const { session } = useAuth();
  const deferredPromptRef = useRef<any>(null);
  const hasTriggeredPushRef = useRef(false);
  const hasTriggeredInstallRef = useRef(false);

  // 1. Capture beforeinstallprompt
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  // 2. Sequential auto-trigger: Push Notification first, then Native Install
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (window.navigator as any)?.standalone === true;

    // Step 1: Trigger Native Push Notification Permission after 2.5s
    const pushTimer = setTimeout(async () => {
      if (hasTriggeredPushRef.current) return;
      hasTriggeredPushRef.current = true;

      try {
        if ("Notification" in window && Notification.permission === "default") {
          const perm = await Notification.requestPermission();
          if (perm === "granted" && session?.user?.id) {
            await subscribeOrderOpsPush(session.user.id);
          }
        }
      } catch (err) {
        console.warn("[OrderOps PWA] Push permission error:", err);
      }
    }, 2500);

    // Step 2: Trigger Native Install Prompt after 6s (if available & not standalone)
    const installTimer = setTimeout(async () => {
      if (hasTriggeredInstallRef.current || isStandalone) return;
      hasTriggeredInstallRef.current = true;

      try {
        if (deferredPromptRef.current && typeof deferredPromptRef.current.prompt === "function") {
          const p = deferredPromptRef.current.prompt();
          if (p && typeof p.then === "function") {
            await p.catch(() => {});
          }
          if (deferredPromptRef.current.userChoice) {
            const choice = await deferredPromptRef.current.userChoice.catch(() => null);
            if (choice?.outcome === "accepted") {
              deferredPromptRef.current = null;
            }
          }
        }
      } catch (err) {
        // Chromium enforces user gesture for prompt() on some platforms
      }
    }, 6000);

    return () => {
      clearTimeout(pushTimer);
      clearTimeout(installTimer);
    };
  }, [session?.user?.id]);

  // Headless: No custom website UI card/modal is rendered
  return null;
}

export default InstallAppPrompt;
