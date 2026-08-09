"use client";
import { useState, useEffect } from "react";

export function useWebGLAvailable(): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      setAvailable(!!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
    } catch {
      setAvailable(false);
    }
  }, []);
  return available;
}
// code:4ce0
