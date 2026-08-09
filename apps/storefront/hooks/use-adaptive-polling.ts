"use client";
import { useEffect, useState } from "react";

/**
 * Adaptive polling interval for use with react-query's `refetchInterval`.
 *
 * - When the tab is hidden: returns `false` so the query pauses entirely
 *   (realtime subscriptions still keep data fresh).
 * - When the user is idle (no input/scroll for `idleAfterMs`): polls at
 *   `baseMs * idleMultiplier`.
 * - When active: polls at `baseMs`.
 *
 * Pair this with realtime subscriptions for instant updates on new rows.
 */
export function useAdaptivePolling(
  baseMs: number,
  opts: { idleAfterMs?: number; idleMultiplier?: number } = {}
): number | false {
  const idleAfterMs = opts.idleAfterMs ?? 60_000;
  const idleMultiplier = opts.idleMultiplier ?? 4;

  const [hidden, setHidden] = useState(
    typeof document !== "undefined" ? document.hidden : false
  );
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      if (idle) setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), idleAfterMs);
    };
    const events = ["mousemove", "keydown", "touchstart", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [idleAfterMs, idle]);

  if (hidden) return false;
  if (idle) return baseMs * idleMultiplier;
  return baseMs;
}
