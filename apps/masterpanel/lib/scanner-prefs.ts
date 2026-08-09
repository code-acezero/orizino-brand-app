"use client";
import { useCallback, useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/* Scanner preferences — client-side, persisted in localStorage.       */
/* ------------------------------------------------------------------ */

export type ScannerAction = "lookup" | "add_to_order" | "focus_input";
export type EnterBehavior = "commit" | "tab" | "none";

export interface ScannerPrefs {
  action: ScannerAction;
  focusSelector: string;      // CSS selector when action = focus_input
  debounceMs: number;         // dedupe window
  enterBehavior: EnterBehavior;
  minLength: number;
  fastMs: number;             // max ms between HID keystrokes
}

const PREFS_KEY = "scanner.prefs.v1";

export const DEFAULT_PREFS: ScannerPrefs = {
  action: "lookup",
  focusSelector: "",
  debounceMs: 1200,
  enterBehavior: "commit",
  minLength: 4,
  fastMs: 50,
};

export function loadPrefs(): ScannerPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<ScannerPrefs>) };
  } catch { return DEFAULT_PREFS; }
}

export function savePrefs(p: ScannerPrefs) {
  try { window.localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch {}
  try { window.dispatchEvent(new CustomEvent("scanner:prefs")); } catch {}
}

export function useScannerPrefs(): [ScannerPrefs, (p: ScannerPrefs) => void] {
  const [p, setP] = useState<ScannerPrefs>(() => loadPrefs());
  useEffect(() => {
    const on = () => setP(loadPrefs());
    window.addEventListener("scanner:prefs", on);
    return () => window.removeEventListener("scanner:prefs", on);
  }, []);
  const set = useCallback((next: ScannerPrefs) => { savePrefs(next); setP(next); }, []);
  return [p, set];
}

/* ------------------------------------------------------------------ */
/* Scan history — last 100 events, kept in localStorage.               */
/* ------------------------------------------------------------------ */

export type ScanMode = "camera" | "hid" | "manual";
export type ScanStatus = "success" | "rejected";

export interface ScanEntry {
  id: string;
  ts: number;            // ms epoch
  code: string;
  mode: ScanMode;
  status: ScanStatus;
  reason?: string;       // when rejected
  raw?: string;          // raw input as received
}

const HISTORY_KEY = "scanner.history.v1";
const MAX_HISTORY = 100;

function readHistory(): ScanEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as ScanEntry[]) : [];
  } catch { return []; }
}

function writeHistory(entries: ScanEntry[]) {
  try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY))); } catch {}
  try { window.dispatchEvent(new CustomEvent("scanner:history")); } catch {}
}

export function pushScan(entry: Omit<ScanEntry, "id" | "ts"> & { ts?: number }) {
  const next: ScanEntry = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    ts: entry.ts ?? Date.now(),
    ...entry,
  };
  const list = [next, ...readHistory()].slice(0, MAX_HISTORY);
  writeHistory(list);
  return next;
}

export function clearHistory() { writeHistory([]); }

export function useScanHistory() {
  const [items, setItems] = useState<ScanEntry[]>(() => readHistory());
  useEffect(() => {
    const on = () => setItems(readHistory());
    window.addEventListener("scanner:history", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("scanner:history", on);
      window.removeEventListener("storage", on);
    };
  }, []);
  return { items, clear: clearHistory, push: pushScan };
}

/* ------------------------------------------------------------------ */
/* CSV export utility.                                                 */
/* ------------------------------------------------------------------ */

export function scansToCsv(rows: ScanEntry[]): string {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ["timestamp", "code", "mode", "status", "reason"];
  const lines = rows.map((r) =>
    [new Date(r.ts).toISOString(), r.code, r.mode, r.status, r.reason ?? ""].map(esc).join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export function downloadFile(name: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
