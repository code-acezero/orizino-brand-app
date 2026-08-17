"use client";
/**
 * InstallAppPrompt — Master Panel (Headless Native Trigger)
 * ─────────────────────────────────────────────────────────────────────────
 * Automatically triggers browser native functions without rendering website UI panels:
 *   1. Auto-triggers browser native Push Notification permission prompt first.
 *   2. Auto-triggers browser native PWA install prompt next (via beforeinstallprompt).
 */

import React, { useEffect, useRef } from "react";
import { useAuth } from "@orizino/shared";
import { subscribeToPush, pushSupported } from "@/lib/push";

const InstallAppPrompt: React.FC = () => {
  const { user } = useAuth();
  const deferredPromptRef = useRef<any>(null);
  const hasTriggeredPushRef = useRef(false);
  const hasTriggeredInstallRef = useRef(false);

  // 1. Capture beforeinstallprompt
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent default mini-infobar so we control native prompt timing
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

    // Check if already in standalone PWA mode
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (window.navigator as any)?.standalone === true;

    // Step 1: Trigger Native Push Notification Permission after 2.5s
    const pushTimer = setTimeout(async () => {
      if (hasTriggeredPushRef.current) return;
      hasTriggeredPushRef.current = true;

      try {
        if (pushSupported() && typeof Notification !== "undefined" && Notification.permission === "default") {
          const perm = await Notification.requestPermission();
          if (perm === "granted" && user?.id) {
            await subscribeToPush(user.id);
          }
        }
      } catch (err) {
        console.warn("[PWA] Push permission error:", err);
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
  }, [user?.id]);

  // Headless: No custom website UI card/modal is rendered
  return null;
};

export default InstallAppPrompt;
