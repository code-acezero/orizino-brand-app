"use client";
/**
 * use-pwa.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Shared PWA utility hook.  Handles:
 *   • Service-worker registration (sw path configurable per-app)
 *   • beforeinstallprompt capture across all Chromium-family browsers
 *   • Platform / OS detection (iOS Safari, Chrome Android, Edge, Samsung, Firefox)
 *   • appinstalled event
 *   • PUSH_SUBSCRIPTION_CHANGED forwarding from SW → push.ts renew callback
 *
 * Returns a stable { deferred, platform, isStandalone } state and install()
 * / dismiss() helpers so each app can render its own branded prompt.
 */

import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────

export type PWAPlatform =
  | "chrome-android"
  | "chrome-desktop"
  | "edge"
  | "samsung"
  | "firefox-android"
  | "ios-safari"
  | "ios-other"
  | "other";

export type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export interface UsePWAOptions {
  /** Path to the service-worker file, e.g. "/sw.js" or "./sw.js" */
  swPath?: string;
  /** LocalStorage key to track when user last dismissed the prompt */
  dismissKey?: string;
  /** How many days to suppress the prompt after dismissal (default 7) */
  dismissDays?: number;
  /**
   * Delay (ms) before showing the BIP banner after the event fires.
   * Default 1 200 ms so the page has settled visually.
   */
  bipDelay?: number;
  /**
   * Delay (ms) before showing the iOS/Samsung manual-instructions banner.
   * Default 4 000 ms (slightly later than BIP because we also show it
   * unconditionally on those platforms).
   */
  fallbackDelay?: number;
  /**
   * Called when pushsubscriptionchange is received from the SW.
   * Use this to trigger re-subscription in push.ts.
   */
  onPushSubscriptionChanged?: () => void;
}

export interface UsePWAReturn {
  /** The captured beforeinstallprompt event; null if not yet received */
  deferred: BIPEvent | null;
  /** Whether the banner should be visible */
  visible: boolean;
  /** Detected browser/platform */
  platform: PWAPlatform;
  /** True if the app is already installed (standalone display mode) */
  isStandalone: boolean;
  /** Whether we're in manual-instructions mode (iOS / Samsung / Firefox) */
  isManualMode: boolean;
  /** Call to trigger the native install dialog (if deferred is set) */
  install: () => Promise<void>;
  /** Dismiss the banner and record the timestamp to suppress re-showing */
  dismiss: () => void;
  /** Programmatically show the banner (useful for a manual "Install App" button) */
  show: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────

export function detectPWAPlatform(): PWAPlatform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  const isIOS =
    /iphone|ipad|ipod/i.test(ua) ||
    (/Mac/.test(ua) && typeof (document as any).ontouchend !== "undefined");
  if (isIOS)
    return /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua)
      ? "ios-safari"
      : "ios-other";
  if (/SamsungBrowser/i.test(ua)) return "samsung";
  if (/Edg\//i.test(ua)) return "edge";
  if (/Firefox/i.test(ua) && /Android/i.test(ua)) return "firefox-android";
  if (/Chrome/i.test(ua))
    return /Android/i.test(ua) ? "chrome-android" : "chrome-desktop";
  return "other";
}

export function isPWAStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

/** Platforms that support beforeinstallprompt (auto install dialog) */
const BIP_PLATFORMS: PWAPlatform[] = [
  "chrome-android",
  "chrome-desktop",
  "edge",
  "samsung",
];

/** Platforms that need manual instructions instead */
const MANUAL_PLATFORMS: PWAPlatform[] = ["ios-safari", "ios-other", "firefox-android"];

async function manifestLooksInstallable(): Promise<boolean> {
  try {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link?.href) return false;
    const res = await fetch(link.href, { credentials: "same-origin" });
    if (!res.ok) return false;
    const m = await res.json();
    const hasIcons =
      Array.isArray(m.icons) &&
      m.icons.some((i: any) => {
        const s = String(i.sizes || "");
        return s.includes("192x192") || s.includes("512x512");
      });
    return Boolean(
      m.start_url && m.name && hasIcons &&
      ["standalone", "fullscreen", "minimal-ui"].includes(m.display)
    );
  } catch {
    return false;
  }
}

function recentlyDismissed(key: string, days: number): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const ts = Number(raw);
    return Number.isFinite(ts) && Date.now() - ts < days * 86_400_000;
  } catch {
    return false;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function usePWA(opts: UsePWAOptions = {}): UsePWAReturn {
  const {
    swPath             = "/sw.js",
    dismissKey         = "orizino-install-dismissed-v2",
    dismissDays        = 7,
    bipDelay           = 1200,
    fallbackDelay      = 4000,
    onPushSubscriptionChanged,
  } = opts;

  const [deferred,     setDeferred]     = useState<BIPEvent | null>(null);
  const [visible,      setVisible]      = useState(false);
  const [platform,     setPlatform]     = useState<PWAPlatform>("other");
  const [isStandalone, setIsStandalone] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);

  const cancelledRef = useRef(false);

  // ── Dismiss ──────────────────────────────────────────────────────────────
  const dismiss = useCallback(() => {
    setVisible(false);
    try { localStorage.setItem(dismissKey, String(Date.now())); } catch {}
  }, [dismissKey]);

  // ── Show (manual trigger) ─────────────────────────────────────────────
  const show = useCallback(() => {
    if (!cancelledRef.current) setVisible(true);
  }, []);

  // ── Install ───────────────────────────────────────────────────────────
  const install = useCallback(async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setVisible(false);
      } else {
        dismiss();
      }
      setDeferred(null);
    } catch {
      dismiss();
    }
  }, [deferred, dismiss]);

  // ── Core effect ──────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    cancelledRef.current = false;
    const standalone = isPWAStandalone();
    setIsStandalone(standalone);

    // Already installed — no prompt needed
    if (standalone) return;
    if (recentlyDismissed(dismissKey, dismissDays)) return;

    const p = detectPWAPlatform();
    setPlatform(p);

    // ── Register service worker ──────────────────────────────────────
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register(swPath, { updateViaCache: "none" })
        .then((reg) => {
          // Check for waiting SW and send SKIP_WAITING
          if (reg.waiting) {
            reg.waiting.postMessage({ type: "SKIP_WAITING" });
          }
          reg.addEventListener("updatefound", () => {
            const newSW = reg.installing;
            newSW?.addEventListener("statechange", () => {
              if (newSW.state === "installed" && reg.waiting) {
                // New content available — optionally notify UI
              }
            });
          });
        })
        .catch((err) => console.warn("[pwa] SW registration failed", err));

      // Listen for messages FROM the service worker
      const onSWMessage = (e: MessageEvent) => {
        if (e.data?.type === "PUSH_SUBSCRIPTION_CHANGED") {
          onPushSubscriptionChanged?.();
        }
      };
      navigator.serviceWorker.addEventListener("message", onSWMessage);

      return () => {
        cancelledRef.current = true;
        navigator.serviceWorker.removeEventListener("message", onSWMessage);
      };
    }

    return () => { cancelledRef.current = true; };
  }, [swPath, dismissKey, dismissDays, onPushSubscriptionChanged]);

  // ── BIP and install-prompt effect (separate from SW reg) ────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isPWAStandalone()) return;
    if (recentlyDismissed(dismissKey, dismissDays)) return;

    const p = detectPWAPlatform();
    let cancelled = false;

    // ── beforeinstallprompt (Chromium / Edge / Samsung) ──────────────
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setIsManualMode(false);
      const t = setTimeout(() => !cancelled && setVisible(true), bipDelay);
      return () => clearTimeout(t);
    };

    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
      try { localStorage.setItem(dismissKey, String(Date.now())); } catch {}
    };

    window.addEventListener("beforeinstallprompt", onBIP as any);
    window.addEventListener("appinstalled", onInstalled);

    // ── Manual fallback for iOS / Firefox Android ──────────────────
    if (MANUAL_PLATFORMS.includes(p)) {
      let t: ReturnType<typeof setTimeout>;
      (async () => {
        const installable = await manifestLooksInstallable();
        if (cancelled || !installable) return;
        setIsManualMode(true);
        t = setTimeout(() => !cancelled && setVisible(true), fallbackDelay);
      })();
      return () => {
        cancelled = true;
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBIP as any);
        window.removeEventListener("appinstalled", onInstalled);
      };
    }

    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onBIP as any);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [dismissKey, dismissDays, bipDelay, fallbackDelay]);

  return { deferred, visible, platform, isStandalone, isManualMode, install, dismiss, show };
}
