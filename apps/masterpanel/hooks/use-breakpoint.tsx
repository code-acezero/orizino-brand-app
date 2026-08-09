"use client";
import { useEffect, useState } from "react";

export type Breakpoint = "mobile" | "tablet" | "desktop" | "wide";

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>("desktop");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => {
      const w = window.innerWidth;
      if (w < 640)        setBp("mobile");
      else if (w < 1024)  setBp("tablet");
      else if (w < 1440)  setBp("desktop");
      else                setBp("wide");
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return bp;
}
// code:4ce0
