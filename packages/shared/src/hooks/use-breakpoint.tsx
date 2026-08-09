"use client";
import * as React from "react";

export type Breakpoint = "mobile" | "tablet" | "desktop";

const TABLET_MIN = 768;
const DESKTOP_MIN = 1024;

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = React.useState<Breakpoint>(() => {
    if (typeof window === "undefined") return "desktop";
    const w = window.innerWidth;
    if (w < TABLET_MIN) return "mobile";
    if (w < DESKTOP_MIN) return "tablet";
    return "desktop";
  });

  React.useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      if (w < TABLET_MIN) setBp("mobile");
      else if (w < DESKTOP_MIN) setBp("tablet");
      else setBp("desktop");
    };
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return bp;
}

export function useIsTabletOrBelow() {
  const bp = useBreakpoint();
  return bp !== "desktop";
}
// code:4ce0
