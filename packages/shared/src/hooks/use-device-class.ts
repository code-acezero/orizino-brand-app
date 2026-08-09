"use client";
import { useEffect, useState } from "react";

export type DeviceClass = "mobile" | "tablet" | "desktop";

/** Returns 'mobile' (<768), 'tablet' (768-1023), or 'desktop' (>=1024). */
export function useDeviceClass(): DeviceClass {
  const [d, setD] = useState<DeviceClass>(() => {
    if (typeof window === "undefined") return "desktop";
    const w = window.innerWidth;
    return w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop";
  });

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setD(w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop");
    };
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return d;
}
// code:4ce0
