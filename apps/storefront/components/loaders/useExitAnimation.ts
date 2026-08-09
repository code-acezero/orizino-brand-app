"use client";
import { useEffect, useRef, useState } from "react";

export type AnimPhase = "enter" | "idle" | "exit";

/**
 * useExitAnimation — drives mount / unmount with enter + exit phases.
 *
 *   const { render, phase } = useExitAnimation(show, 360);
 *   if (!render) return null;
 *   return <div data-state={phase} className="ldr-anim">…</div>;
 */
export default function useExitAnimation(show: boolean, durationMs = 360) {
  const [render, setRender] = useState<boolean>(!!show);
  const [phase, setPhase] = useState<AnimPhase>(show ? "enter" : "exit");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (show) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setRender(true);
      setPhase("enter");
      const idleTimer = setTimeout(() => setPhase("idle"), durationMs);
      return () => clearTimeout(idleTimer);
    }
    setPhase("exit");
    timerRef.current = setTimeout(() => {
      setRender(false);
      timerRef.current = null;
    }, durationMs);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [show, durationMs]);

  return { render, phase };
}
// code:4ce0
