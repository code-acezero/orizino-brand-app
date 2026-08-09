"use client";
import { useEffect, useState } from "react";
import { useEffectivePerf } from "@/hooks/use-perf-settings";

/**
 * Client-only: toggles `perf-reduce-motion`, `perf-no-3d`, `perf-lite`
 * classes on <html> based on resolved device + admin settings. Lets global
 * CSS disable heavy animations on mobile/tablet without per-component edits.
 */
function PerfClassControllerInner() {
  const { reduceMotion, disable3D, lightweightMode, device } = useEffectivePerf();
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("perf-reduce-motion", !!reduceMotion);
    root.classList.toggle("perf-no-3d", !!disable3D);
    root.classList.toggle("perf-lite", !!lightweightMode);
    root.dataset.deviceClass = device;
  }, [reduceMotion, disable3D, lightweightMode, device]);
  return null;
}

export function PerfClassController() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <PerfClassControllerInner />;
}
// code:4ce0
