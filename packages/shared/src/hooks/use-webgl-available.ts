"use client";
import { useEffect, useState } from "react";

let cached: boolean | null = null;

/** Detects WebGL availability once per session. Returns `null` during SSR/initial check. */
export function useWebGLAvailable(): boolean | null {
  const [ok, setOk] = useState<boolean | null>(cached);
  useEffect(() => {
    if (cached !== null) {
      setOk(cached);
      return;
    }
    try {
      const c = document.createElement("canvas");
      const gl =
        c.getContext("webgl2") ||
        c.getContext("webgl") ||
        c.getContext("experimental-webgl");
      cached = !!gl;
    } catch {
      cached = false;
    }
    setOk(cached);
  }, []);
  return ok;
}
// code:4ce0
