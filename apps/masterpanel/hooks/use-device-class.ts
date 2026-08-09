"use client";
import { useEffect, useState } from "react";

export type DeviceClass = "mobile" | "tablet" | "desktop";

export function useDeviceClass(): DeviceClass {
  const [dc, setDc] = useState<DeviceClass>("desktop");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => {
      const w = window.innerWidth;
      setDc(w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop");
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return dc;
}
// code:4ce0
