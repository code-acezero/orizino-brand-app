"use client";
import { useEffect, useState } from "react";

/**
 * Delays mounting a component until the browser is idle (or after `timeout`
 * ms as a fallback). Use for non-critical widgets that would otherwise ship
 * in the initial render path — chat launchers, promo popups, offer banners.
 *
 * SSR-safe: returns `false` on the server so nothing pre-renders; on the
 * client, flips to `true` when the main thread is quiet.
 */
export function useIdleMount(timeout = 2000): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const flip = () => { if (!cancelled) setReady(true); };
    // @ts-ignore — requestIdleCallback is not in every browser's lib.dom
    const ric: any = window.requestIdleCallback;
    if (typeof ric === "function") {
      const id = ric(flip, { timeout });
      // @ts-ignore
      const cic: any = window.cancelIdleCallback;
      return () => { cancelled = true; if (cic) cic(id); };
    }
    const t = setTimeout(flip, Math.min(timeout, 1200));
    return () => { cancelled = true; clearTimeout(t); };
  }, [timeout]);
  return ready;
}

/**
 * Returns true only after the component has hydrated on the client. Use to
 * gate any render that must not appear during SSR/first paint (motion
 * springs, viewport-dependent branching that would hydration-mismatch).
 */
export function useIsHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  return hydrated;
}
// code:4ce0
