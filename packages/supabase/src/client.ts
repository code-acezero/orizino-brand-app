"use client";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Supabase Realtime reads navigator.connection and calls .addListener() on it —
// a deprecated Network Information API not available in Firefox or many mobile browsers.
// We patch it here so the crash never reaches user code, regardless of timing.
function patchNavigatorConnection() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return;

  const stub = {
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  };

  try {
    const conn = (navigator as any).connection;
    if (!conn) {
      // Not present at all — define an own property that shadows the missing getter.
      Object.defineProperty(navigator, "connection", {
        value: stub,
        configurable: true,
        writable: true,
      });
    } else if (typeof conn.addListener !== "function") {
      // Present but missing the deprecated addListener (e.g. modern Chrome).
      conn.addListener = () => {};
      conn.removeListener = () => {};
    }
  } catch {
    // Object.defineProperty failed (sealed object in some environments).
    // Patch the Navigator prototype as a fallback so the getter always returns a stub.
    try {
      Object.defineProperty(Navigator.prototype, "connection", {
        get() { return stub; },
        configurable: true,
      });
    } catch { /* give up silently */ }
  }
}

patchNavigatorConnection();

const SUPABASE_URL =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  (typeof process !== "undefined" && process.env?.SUPABASE_URL) ||
  "";

const SUPABASE_KEY =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  (typeof process !== "undefined" && process.env?.SUPABASE_PUBLISHABLE_KEY) ||
  "";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: `sb-${SUPABASE_URL.replace(/^https?:\/\//, "").split(".")[0]}-auth-token`,
  },
});
// code:4ce0
