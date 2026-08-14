"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUniversalSave } from "@/contexts/UniversalSaveContext";
import { Check, Loader2, Save } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export const UniversalFloatingSaveButton: React.FC = () => {
  const { activeAction, triggerSave } = useUniversalSave();
  const isMobile = useIsMobile();
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent));
    }
  }, []);

  // Global Ctrl+S / Cmd+S shortcut interceptor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        if (activeAction?.onSave && !activeAction.isSaving) {
          e.preventDefault();
          e.stopPropagation();
          activeAction.onSave();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [activeAction]);

  if (!activeAction || !activeAction.onSave) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 35, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 35, scale: 0.92 }}
        transition={{ type: "spring", stiffness: 420, damping: 30 }}
        className={`fixed z-50 left-1/2 -translate-x-1/2 ${
          isMobile ? "bottom-20" : "bottom-6 md:bottom-8"
        }`}
      >
        <button
          type="button"
          onClick={triggerSave}
          disabled={activeAction.isSaving}
          className="group relative flex items-center gap-2.5 px-4 py-2 rounded-full border border-border/80 dark:border-white/15 bg-background/90 dark:bg-card/90 backdrop-blur-2xl shadow-[0_14px_45px_rgba(0,0,0,0.32)] ring-1 ring-primary/25 text-foreground transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] hover:border-primary/60 hover:shadow-[0_18px_55px_rgba(var(--primary-rgb),0.2)] cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          aria-label={activeAction.label || "Save Changes"}
        >
          {/* Status Icon */}
          <div className="w-5 h-5 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
            {activeAction.isSaving ? (
              <Loader2 className="w-3 h-3 animate-spin text-primary group-hover:text-primary-foreground" />
            ) : (
              <Check className="w-3 h-3" />
            )}
          </div>

          {/* Label */}
          <span className="text-xs font-bold tracking-tight text-foreground whitespace-nowrap">
            {activeAction.isSaving ? "Saving changes…" : activeAction.label || "Save Changes"}
          </span>

          {/* Keyboard shortcut pill */}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-secondary/80 border border-border/60 text-[9px] font-mono text-muted-foreground font-semibold shadow-xs">
            <span>{isMac ? "⌘" : "Ctrl"}</span>
            <span>S</span>
          </kbd>
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default UniversalFloatingSaveButton;
