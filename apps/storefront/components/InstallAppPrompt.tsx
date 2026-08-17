"use client";
/**
 * InstallAppPrompt — Storefront (Headless)
 * ─────────────────────────────────────────────────────────────────────────
 * Captures beforeinstallprompt event and registers service worker headlessly.
 * PWA install & push triggers are shown within the Notification Island in the top nav.
 */

import React, { useEffect } from "react";
import { ensureServiceWorker } from "@/lib/push";

export const InstallAppPrompt: React.FC = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Register service worker
    ensureServiceWorker().catch(() => {});

    // Listen for beforeinstallprompt and dispatch a custom event for Notification Island
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__deferredPWAInstallPrompt = e;
      window.dispatchEvent(new CustomEvent("pwa:install-ready", { detail: { event: e } }));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  // Headless: Never renders standalone floating bottom cards
  return null;
};

export default InstallAppPrompt;
