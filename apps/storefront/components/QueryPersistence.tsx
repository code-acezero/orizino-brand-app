"use client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

/**
 * Persists the React Query cache to localStorage so cold reloads and
 * cross-tab navigations restore data instantly instead of re-hitting
 * Supabase. Only runs in the browser.
 *
 * Excluded from persistence: realtime / user-scoped data that must
 * always be fresh (cart, auth, notifications).
 */
const VOLATILE_PREFIXES = new Set([
  "cart",
  "wishlist",
  "notifications",
  "live-visitors",
  "auth",
  "session",
  "ai-memory",
  "support",
  "call-logs",
]);

export default function QueryPersistence() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;
    let storage: Storage;
    try {
      storage = window.localStorage;
      // Probe — Safari private mode can throw.
      storage.setItem("__qp", "1");
      storage.removeItem("__qp");
    } catch {
      return;
    }

    const persister = createSyncStoragePersister({
      storage,
      key: "orizino-rq-cache",
      throttleTime: 1000,
    });

    const [unsubscribe] = persistQueryClient({
      // Cast: duplicate @tanstack/query-core copies in node_modules cause a
      // nominal type mismatch even though both are 5.100.1 at runtime.
      queryClient: queryClient as unknown as Parameters<typeof persistQueryClient>[0]["queryClient"],
      persister,
      maxAge: 1000 * 60 * 60 * 24, // 24h
      buster: "v1",
      dehydrateOptions: {
        shouldDehydrateQuery: (q) => {
          if (q.state.status !== "success") return false;
          const first = Array.isArray(q.queryKey) ? String(q.queryKey[0] ?? "") : String(q.queryKey);
          return !VOLATILE_PREFIXES.has(first);
        },
      },
    });

    return () => unsubscribe?.();
  }, [queryClient]);

  return null;
}
// code:4ce0
