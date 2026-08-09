"use client";
import { useEffect } from "react";
import { useNavigate } from "@/lib/router-compat";

const GO_MAP: Record<string, string> = {
  o: "/sales/orders",
  p: "/sales/products",
  d: "/",
  s: "/sales/support",
  u: "/sales/customers",
  c: "/sales/categories",
};

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    el.isContentEditable
  );
}

/**
 * Admin keyboard shortcuts:
 *  - `g` then [o|p|d|s|u|c] → navigate
 *  - `/` → focus sidebar search input (#admin-sidebar-search)
 *  - `?` → opens the shortcuts overlay (handled by caller via callback)
 */
export function useAdminHotkeys(onShowHelp?: () => void) {
  const navigate = useNavigate();

  useEffect(() => {
    let goMode = false;
    let goTimer: ReturnType<typeof setTimeout> | null = null;

    const clearGo = () => {
      goMode = false;
      if (goTimer) clearTimeout(goTimer);
    };

    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "/") {
        const search = document.getElementById("admin-sidebar-search") as
          | HTMLInputElement
          | null;
        if (search) {
          e.preventDefault();
          search.focus();
          search.select?.();
        }
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        onShowHelp?.();
        return;
      }

      if (goMode) {
        const dest = GO_MAP[e.key.toLowerCase()];
        if (dest) {
          e.preventDefault();
          navigate(dest);
        }
        clearGo();
        return;
      }

      if (e.key === "g") {
        goMode = true;
        goTimer = setTimeout(clearGo, 900);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearGo();
    };
  }, [navigate, onShowHelp]);
}

export const ADMIN_SHORTCUTS: Array<{ keys: string; description: string }> = [
  { keys: "⌘ K", description: "Command palette" },
  { keys: "/", description: "Focus sidebar search" },
  { keys: "g o", description: "Go to Orders" },
  { keys: "g p", description: "Go to Products" },
  { keys: "g d", description: "Go to Dashboard" },
  { keys: "g s", description: "Go to Support" },
  { keys: "g u", description: "Go to Users" },
  { keys: "g c", description: "Go to Categories" },
  { keys: "?", description: "Show this help" },
];
// code:4ce0
