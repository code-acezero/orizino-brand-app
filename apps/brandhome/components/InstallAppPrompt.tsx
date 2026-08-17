"use client";
/**
 * InstallAppPrompt — Brandhome
 * Lightweight install-only prompt for the public brand site.
 * No push subscription (public site has no authenticated user context).
 */

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  Share,
  MoreVertical,
  Plus,
  SquarePlus,
  Smartphone,
  Globe,
} from "lucide-react";
import { usePWA, type PWAPlatform } from "@orizino/shared";

// ── Manual instructions ────────────────────────────────────────────────────

function ManualInstructions({ platform }: { platform: PWAPlatform }) {
  switch (platform) {
    case "ios-safari":
      return (
        <ol className="mt-2 space-y-1 text-xs text-muted-foreground list-decimal pl-4">
          <li>Tap <Share className="inline h-3 w-3 mx-0.5" aria-hidden /> Share in the toolbar.</li>
          <li>Choose <strong>"Add to Home Screen"</strong> <SquarePlus className="inline h-3 w-3 mx-0.5" aria-hidden />.</li>
          <li>Tap <strong>"Add"</strong> to confirm.</li>
        </ol>
      );
    case "ios-other":
      return (
        <p className="mt-2 text-xs text-muted-foreground">
          Open this page in <strong>Safari</strong> to add it to your home screen.
        </p>
      );
    case "samsung":
      return (
        <ol className="mt-2 space-y-1 text-xs text-muted-foreground list-decimal pl-4">
          <li>Tap the menu <MoreVertical className="inline h-3 w-3 mx-0.5" aria-hidden />.</li>
          <li>Choose <strong>"Add page to"</strong> → <strong>"Home screen"</strong>.</li>
        </ol>
      );
    case "firefox-android":
      return (
        <ol className="mt-2 space-y-1 text-xs text-muted-foreground list-decimal pl-4">
          <li>Tap the menu <MoreVertical className="inline h-3 w-3 mx-0.5" aria-hidden />.</li>
          <li>Choose <strong>"Install"</strong> or <strong>"Add to Home screen"</strong> <Plus className="inline h-3 w-3 mx-0.5" aria-hidden />.</li>
        </ol>
      );
    default:
      return null;
  }
}

// ── Component ──────────────────────────────────────────────────────────────

const InstallAppPrompt: React.FC = () => {
  const installBtnRef = useRef<HTMLButtonElement>(null);
  const dismissBtnRef = useRef<HTMLButtonElement>(null);

  const {
    deferred,
    visible,
    platform,
    isStandalone,
    isManualMode,
    install,
    dismiss,
  } = usePWA({
    swPath:        "/sw.js",
    dismissKey:    "orizino-bh-install-v2",
    dismissDays:   14,
    bipDelay:      2000,
    fallbackDelay: 6000,
  });

  // Already installed — nothing to show on brand site
  if (isStandalone) return null;

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      (installBtnRef.current ?? dismissBtnRef.current)?.focus();
    }, 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); dismiss(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [visible, dismiss]);

  const showInstallBtn = !isManualMode && !!deferred;
  const headingId = "bh-install-title";
  const descId   = "bh-install-desc";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="bh-install-prompt"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="fixed bottom-4 left-3 right-3 z-[9999] mx-auto max-w-sm rounded-2xl border border-border bg-background/95 backdrop-blur-md shadow-2xl p-4"
          role="dialog"
          aria-modal="false"
          aria-labelledby={headingId}
          aria-describedby={descId}
        >
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20"
              aria-hidden
            >
              {isManualMode
                ? <Smartphone className="h-5 w-5" />
                : platform === "chrome-desktop" || platform === "edge"
                ? <Globe className="h-5 w-5" />
                : <Download className="h-5 w-5" />}
            </div>

            <div className="min-w-0 flex-1">
              <div id={headingId} className="text-sm font-bold text-foreground leading-tight">
                {isManualMode ? "Add Orizino to your screen" : "Get the Orizino brand experience"}
              </div>
              <div id={descId} className="text-xs text-muted-foreground mt-0.5 leading-snug">
                {isManualMode
                  ? "Add to your home screen for a full-screen app experience."
                  : "Install for instant access, offline browsing, and a seamless app feel."}
              </div>
              {isManualMode && <ManualInstructions platform={platform} />}
            </div>

            <button
              ref={dismissBtnRef}
              type="button"
              onClick={dismiss}
              aria-label="Dismiss install prompt"
              className="shrink-0 inline-flex items-center justify-center rounded-full w-8 h-8 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {showInstallBtn && (
            <button
              ref={installBtnRef}
              type="button"
              onClick={install}
              className="mt-3 w-full rounded-xl bg-primary text-primary-foreground text-sm font-semibold py-2.5 hover:bg-primary/90 transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            >
              Install App
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallAppPrompt;
