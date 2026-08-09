"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share, MoreVertical, Plus, SquarePlus } from "lucide-react";

const DISMISS_KEY = "orizino-install-dismissed-v1";
const DISMISS_DAYS = 7;

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Platform =
  | "chrome-android"
  | "chrome-desktop"
  | "edge"
  | "samsung"
  | "firefox-android"
  | "ios-safari"
  | "ios-other"
  | "other";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (/Mac/.test(ua) && "ontouchend" in document);
  if (isIOS) return /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua) ? "ios-safari" : "ios-other";
  if (/SamsungBrowser/i.test(ua)) return "samsung";
  if (/Edg\//i.test(ua)) return "edge";
  if (/Firefox/i.test(ua) && /Android/i.test(ua)) return "firefox-android";
  if (/Chrome/i.test(ua)) return /Android/i.test(ua) ? "chrome-android" : "chrome-desktop";
  return "other";
}

function recentlyDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    return Number.isFinite(ts) && Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

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
        return /(^|\s)(192|512)x\2/.test(s) || s.includes("192x192") || s.includes("512x512");
      });
    const displayOk = ["standalone", "fullscreen", "minimal-ui"].includes(m.display);
    return Boolean(m.start_url && m.name && hasIcons && displayOk);
  } catch {
    return false;
  }
}

const iosInstructions = (
  <ol className="mt-1 space-y-0.5 text-xs text-muted-foreground list-decimal pl-4">
    <li>Tap the Share icon <Share className="inline h-3 w-3 mx-0.5" aria-hidden="true" /> in the toolbar.</li>
    <li>Scroll and choose "Add to Home Screen" <SquarePlus className="inline h-3 w-3 mx-0.5" aria-hidden="true" />.</li>
    <li>Tap "Add" to confirm.</li>
  </ol>
);

const iosOtherInstructions = (
  <p className="mt-1 text-xs text-muted-foreground">
    On iPhone/iPad, install works only in Safari. Open this page in Safari, then use Share → "Add to Home Screen".
  </p>
);

const samsungInstructions = (
  <ol className="mt-1 space-y-0.5 text-xs text-muted-foreground list-decimal pl-4">
    <li>Tap the menu <MoreVertical className="inline h-3 w-3 mx-0.5" aria-hidden="true" />.</li>
    <li>Choose "Add page to" → "Home screen".</li>
  </ol>
);

const firefoxAndroidInstructions = (
  <ol className="mt-1 space-y-0.5 text-xs text-muted-foreground list-decimal pl-4">
    <li>Tap the menu <MoreVertical className="inline h-3 w-3 mx-0.5" aria-hidden="true" />.</li>
    <li>Choose "Install" or "Add to Home screen" <Plus className="inline h-3 w-3 mx-0.5" aria-hidden="true" />.</li>
  </ol>
);

function fallbackInstructions(p: Platform) {
  switch (p) {
    case "ios-safari":
      return iosInstructions;
    case "ios-other":
      return iosOtherInstructions;
    case "samsung":
      return samsungInstructions;
    case "firefox-android":
      return firefoxAndroidInstructions;
    default:
      return null;
  }
}

const InstallAppPrompt: React.FC = () => {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [manualMode, setManualMode] = useState(false);
  const installBtnRef = useRef<HTMLButtonElement>(null);
  const dismissBtnRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const dismiss = useCallback(() => {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    // Return focus to the element that had it before the banner opened.
    openerRef.current?.focus?.();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone() || recentlyDismissed()) return;

    const p = detectPlatform();
    setPlatform(p);
    let cancelled = false;

    const onBIP = (e: Event) => {
      e.preventDefault();
      openerRef.current = (document.activeElement as HTMLElement) ?? null;
      setDeferred(e as BIPEvent);
      setManualMode(false);
      setTimeout(() => !cancelled && setVisible(true), 1200);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    };

    window.addEventListener("beforeinstallprompt", onBIP as any);
    window.addEventListener("appinstalled", onInstalled);

    // For browsers without beforeinstallprompt (iOS, some Android),
    // only show a manual-instructions banner when the manifest is valid.
    if (p === "ios-safari" || p === "ios-other" || p === "samsung" || p === "firefox-android") {
      (async () => {
        const ok = await manifestLooksInstallable();
        if (cancelled || !ok) return;
        openerRef.current = (document.activeElement as HTMLElement) ?? null;
        setManualMode(true);
        setTimeout(() => !cancelled && setVisible(true), 3000);
      })();
    }

    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onBIP as any);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Focus + Escape when banner opens.
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      (installBtnRef.current ?? dismissBtnRef.current)?.focus();
    }, 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        dismiss();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [visible, dismiss]);

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setVisible(false);
      else dismiss();
      setDeferred(null);
    } catch {
      dismiss();
    }
  };

  const showInstallBtn = !manualMode && !!deferred;
  const instructions = manualMode ? fallbackInstructions(platform) : null;
  const headingId = "install-app-title";
  const descId = "install-app-desc";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="install-prompt"
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="fixed top-3 left-3 right-3 z-[9999] mx-auto max-w-md rounded-2xl border border-border bg-background text-foreground shadow-lg p-3 flex items-start gap-3"
          role="dialog"
          aria-modal="false"
          aria-labelledby={headingId}
          aria-describedby={descId}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
            aria-hidden="true"
          >
            <Download className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div id={headingId} className="text-sm font-semibold leading-tight text-foreground">
              Install Orizino
            </div>
            <div id={descId} className="text-xs text-muted-foreground leading-snug">
              {manualMode ? (
                <>Get the app for a faster, full-screen experience.</>
              ) : (
                <>Install for a faster, full-screen experience.</>
              )}
              {instructions}
            </div>
          </div>
          {showInstallBtn && (
            <button
              ref={installBtnRef}
              type="button"
              onClick={install}
              className="shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background min-h-11"
            >
              Install
            </button>
          )}
          <button
            ref={dismissBtnRef}
            type="button"
            onClick={dismiss}
            aria-label="Dismiss install prompt"
            className="shrink-0 inline-flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background min-h-11 min-w-11"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallAppPrompt;
