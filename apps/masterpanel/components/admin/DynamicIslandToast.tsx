"use client";
import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";
import { subscribe as subscribeToasts, removeToast, type AppToast } from "@/lib/app-toast";

const typeStyles: Record<string, { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; tint: string; dot: string }> = {
  success: { icon: CheckCircle2, tint: "text-emerald-400", dot: "bg-emerald-400" },
  error: { icon: XCircle, tint: "text-rose-400", dot: "bg-rose-400" },
  warning: { icon: AlertTriangle, tint: "text-amber-400", dot: "bg-amber-400" },
  info: { icon: Info, tint: "text-sky-400", dot: "bg-sky-400" },
};

/**
 * iOS-style "Dynamic Island" toast that lives inside the page top bar.
 * Subscribes to the app-toast store and displays the most recent toast.
 */
const DynamicIslandToast: React.FC = () => {
  const [current, setCurrent] = useState<AppToast | null>(null);

  useEffect(() => {
    const unsub = subscribeToasts((toasts) => {
      setCurrent(toasts[0] ?? null);
    });
    return () => {
      unsub();
    };
  }, []);

  const cfg = typeStyles[current?.type ?? "info"] ?? typeStyles.info;
  const Icon = cfg.icon;

  return (
    <div className="pointer-events-none flex items-center justify-center min-w-0">
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.id}
            initial={{ width: 36, opacity: 0, scale: 0.6, y: -6 }}
            animate={{ width: "auto", opacity: 1, scale: 1, y: 0 }}
            exit={{ width: 36, opacity: 0, scale: 0.6, y: -6 }}
            transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.6 }}
            className="pointer-events-auto relative flex items-center gap-2 max-w-[480px] h-9 pl-3 pr-2 rounded-full bg-foreground text-background shadow-[0_8px_24px_-8px_rgba(0,0,0,0.55)] ring-1 ring-foreground/10 overflow-hidden"
          >
            <span className="relative flex w-2 h-2 shrink-0">
              <span className={`absolute inline-flex w-full h-full rounded-full ${cfg.dot} opacity-70 animate-ping`} />
              <span className={`relative inline-flex w-2 h-2 rounded-full ${cfg.dot}`} />
            </span>
            <Icon className={`w-3.5 h-3.5 shrink-0 ${cfg.tint}`} />
            <div className="min-w-0 flex items-baseline gap-1.5">
              <span className="text-[12px] font-semibold tracking-tight truncate">{current.title}</span>
              {current.description && (
                <span className="text-[11px] text-background/70 truncate hidden md:inline">
                  {current.description}
                </span>
              )}
            </div>
            {current.action && (
              <button
                type="button"
                onClick={() => {
                  current.action?.onClick();
                  removeToast(current.id);
                }}
                className="ml-1 h-6 px-2 rounded-full bg-background/15 hover:bg-background/25 text-[11px] font-medium"
              >
                {current.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => removeToast(current.id)}
              className="ml-0.5 h-6 w-6 rounded-full hover:bg-background/15 flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DynamicIslandToast;
// code:4ce0
