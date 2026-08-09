"use client";
import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  // Read the correct value synchronously on the client's first render so
  // mobile users never briefly get the desktop code path (avoids a costly
  // hydration flicker of framer-motion springs on low-end phones).
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    // @ts-ignore — legacy Safari
    else mql.addListener(onChange);
    onChange();
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      // @ts-ignore
      else mql.removeListener(onChange);
    };
  }, []);

  return isMobile;
}
// code:4ce0
