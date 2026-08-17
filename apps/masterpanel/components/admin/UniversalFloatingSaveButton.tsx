"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useUniversalSave } from "@/contexts/UniversalSaveContext";
import { Check, Loader2, Undo2, Redo2, RotateCcw } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const INACTIVITY_TIMEOUT_MS = 15000; // 15 seconds

export const UniversalFloatingSaveButton: React.FC = () => {
  const { activeAction, triggerSave, triggerUndo, triggerRedo, triggerReject } = useUniversalSave();
  const isMobile = useIsMobile();
  const [isMac, setIsMac] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveredRef = useRef(false);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent));
    }
  }, []);

  // Activity timer: Show button on activity, hide after 15s of no click/touch/interaction
  const resetActivity = useCallback(() => {
    setIsVisible(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Do not auto-hide while hovering over the button or while an active save operation is in flight
    if (!isHoveredRef.current && !activeAction?.isSaving) {
      timerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, INACTIVITY_TIMEOUT_MS);
    }
  }, [activeAction?.isSaving]);

  // Restart/refresh inactivity timer whenever activeAction changes
  useEffect(() => {
    resetActivity();
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [activeAction, resetActivity]);

  // Listen to user interactions (clicks, touches, keystrokes, pointer actions) across the document
  useEffect(() => {
    const handleUserActivity = () => {
      resetActivity();
    };

    const events: (keyof WindowEventMap)[] = [
      "click",
      "touchstart",
      "pointerdown",
      "keydown",
      "input",
      "change",
    ];

    events.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { capture: true, passive: true });
    });

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity, { capture: true } as any);
      });
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [resetActivity]);

  // Global Keyboard shortcuts: Ctrl+S (Save), Ctrl+Z (Undo), Ctrl+Y / Ctrl+Shift+Z (Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement;

      // Ctrl+S / Cmd+S: Save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        if (activeAction?.onSave && !activeAction.isSaving) {
          e.preventDefault();
          e.stopPropagation();
          resetActivity();
          activeAction.onSave();
        }
      }

      // If not currently editing a native input/textarea, handle Undo / Redo
      if (!isInput) {
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
          if (activeAction?.onUndo && activeAction.canUndo !== false) {
            e.preventDefault();
            resetActivity();
            activeAction.onUndo();
          }
        }
        if (
          ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") ||
          ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z")
        ) {
          if (activeAction?.onRedo && activeAction.canRedo !== false) {
            e.preventDefault();
            resetActivity();
            activeAction.onRedo();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [activeAction, resetActivity]);

  if (!mounted) return null;
  if (!activeAction || !activeAction.onSave) return null;

  const hasUndo = Boolean(activeAction.onUndo);
  const hasRedo = Boolean(activeAction.onRedo);
  const hasReject = Boolean(activeAction.onReject);
  const canUndo = activeAction.canUndo !== false && hasUndo;
  const canRedo = activeAction.canRedo !== false && hasRedo;
  const canReject = activeAction.canReject !== false && hasReject;

  const handleMouseEnter = () => {
    isHoveredRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
    resetActivity();
  };

  return createPortal(
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="universal-floating-save-bar"
          initial={{ opacity: 0, y: 45, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 45, scale: 0.94 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          className={`fixed z-[9999] left-1/2 -translate-x-1/2 ${
            isMobile ? "bottom-20" : "bottom-6 md:bottom-8"
          }`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex items-center gap-1.5 p-1.5 rounded-full border border-border/80 dark:border-white/15 bg-background/90 dark:bg-card/90 backdrop-blur-2xl shadow-[0_16px_50px_rgba(0,0,0,0.35)] ring-1 ring-primary/20 select-none transition-all">
            
            {/* ── 1. SMALL BUTTON NAMED AS SAVE ON THE LEFT SIDE ── */}
            <button
              type="button"
              onClick={() => {
                resetActivity();
                triggerSave();
              }}
              disabled={activeAction.isSaving}
              className="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:opacity-95 active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              title={`Save (${isMac ? "⌘S" : "Ctrl+S"})`}
              aria-label="Save changes"
            >
              {activeAction.isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <Check className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="tracking-tight">{activeAction.isSaving ? "Saving…" : "Save"}</span>
              <kbd className="hidden sm:inline-block text-[9px] font-mono opacity-70 ml-0.5 font-semibold">
                {isMac ? "⌘" : "^"}S
              </kbd>
            </button>

            {/* ── 2. UNDO BUTTON ── */}
            <button
              type="button"
              onClick={() => {
                resetActivity();
                triggerUndo();
              }}
              disabled={!canUndo}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                canUndo
                  ? "text-foreground hover:bg-secondary/80 active:scale-90 cursor-pointer"
                  : "text-muted-foreground/40 cursor-not-allowed"
              }`}
              title={canUndo ? `Undo (${isMac ? "⌘Z" : "Ctrl+Z"})` : "Nothing to undo"}
              aria-label="Undo"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>

            {/* ── 3. REDO BUTTON ── */}
            <button
              type="button"
              onClick={() => {
                resetActivity();
                triggerRedo();
              }}
              disabled={!canRedo}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                canRedo
                  ? "text-foreground hover:bg-secondary/80 active:scale-90 cursor-pointer"
                  : "text-muted-foreground/40 cursor-not-allowed"
              }`}
              title={canRedo ? `Redo (${isMac ? "⌘⇧Z" : "Ctrl+Y"})` : "Nothing to redo"}
              aria-label="Redo"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>

            {/* ── 4. DIVIDER ── */}
            <div className="h-4 w-px bg-border/60 mx-0.5" />

            {/* ── 5. REJECT OPTION ── */}
            <button
              type="button"
              onClick={() => {
                resetActivity();
                triggerReject();
              }}
              disabled={!canReject}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                canReject
                  ? "text-destructive hover:text-destructive hover:bg-destructive/10 active:scale-95 cursor-pointer"
                  : "text-muted-foreground/40 cursor-not-allowed"
              }`}
              title={canReject ? "Discard unsaved changes and revert to last saved state" : "No changes to reject"}
              aria-label="Reject changes"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reject</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default UniversalFloatingSaveButton;
