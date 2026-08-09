"use client";
import React, { useEffect, useRef, useState } from "react";
import { Check, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotRobotCheckProps {
  verified: boolean;
  onVerifiedChange: (v: boolean) => void;
  resetKey?: string | number; // when changed, resets the check
  className?: string;
}

/**
 * Lightweight client-side bot deterrent. NOT a security control —
 * purely a UX hygiene gate. Plays the role of a Turnstile checkbox while
 * remaining dependency-free. Easy to swap for real Turnstile later.
 *
 * Heuristics:
 *  - Honeypot field must stay empty (hidden from real users).
 *  - User cannot tick the box until ≥1.5s after mount (bots usually slam it).
 *  - Verification spins briefly to feel real, then locks in.
 */
const NotRobotCheck: React.FC<NotRobotCheckProps> = ({
  verified,
  onVerifiedChange,
  resetKey,
  className,
}) => {
  const [state, setState] = useState<"idle" | "verifying" | "done" | "failed">(verified ? "done" : "idle");
  const mountedAt = useRef<number>(Date.now());
  const honeypotRef = useRef<HTMLInputElement>(null);

  // Reset on key change (e.g. switching between sign-in / sign-up)
  useEffect(() => {
    setState("idle");
    onVerifiedChange(false);
    mountedAt.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const handleClick = () => {
    if (state === "verifying" || state === "done") return;
    const elapsed = Date.now() - mountedAt.current;
    if (elapsed < 1500) {
      setState("failed");
      setTimeout(() => setState("idle"), 1200);
      return;
    }
    if (honeypotRef.current?.value) {
      setState("failed");
      return;
    }
    setState("verifying");
    setTimeout(() => {
      setState("done");
      onVerifiedChange(true);
    }, 650);
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border bg-card/40 backdrop-blur-sm transition-colors",
        state === "done" ? "border-emerald-500/40 bg-emerald-500/[0.04]" :
        state === "failed" ? "border-destructive/50" : "border-border/60",
        className
      )}
    >
      {/* Honeypot — invisible to humans, irresistible to naive bots */}
      <input
        ref={honeypotRef}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] w-px h-px opacity-0 pointer-events-none"
      />

      <button
        type="button"
        onClick={handleClick}
        disabled={state === "verifying" || state === "done"}
        aria-label="Verify you are human"
        className={cn(
          "flex items-center justify-center w-6 h-6 rounded-md border-2 transition-all shrink-0",
          state === "done"
            ? "border-emerald-500 bg-emerald-500"
            : state === "failed"
              ? "border-destructive"
              : "border-foreground/30 hover:border-foreground/60 cursor-pointer",
        )}
      >
        {state === "verifying" && <Loader2 className="w-3.5 h-3.5 animate-spin text-foreground/70" />}
        {state === "done" && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
      </button>

      <div className="flex-1 text-xs text-foreground/80">
        {state === "failed"
          ? <span className="text-destructive">Verification failed. Try again.</span>
          : state === "done"
            ? <span className="text-emerald-500/90 font-medium">Verified</span>
            : <span>I'm not a robot</span>}
      </div>

      <ShieldCheck className="w-4 h-4 text-muted-foreground/60 shrink-0" strokeWidth={1.5} />
    </div>
  );
};

export default NotRobotCheck;
// code:4ce0
