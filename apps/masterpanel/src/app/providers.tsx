"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import SiteThemeProvider from "@/components/SiteThemeProvider";
import TrackingPixels from "@/components/TrackingPixels";
import { useDynamicFavicon } from "@/hooks/use-dynamic-favicon";
import { Toaster } from "@/components/ui/toaster";

// ─── matchMedia polyfill ────────────────────────────────────────────────────
// Some @orizino/shared hooks call window.matchMedia(...).addListener(fn) during
// module initialisation or at the top of a render, before useEffect guards run.
// This polyfill ensures window.matchMedia always returns an object with both
// the modern addEventListener API AND the deprecated addListener shim, so the
// call never throws regardless of environment.
if (typeof window !== "undefined") {
  const _nativeMatchMedia = window.matchMedia.bind(window);
  window.matchMedia = (query: string): MediaQueryList => {
    const mql = _nativeMatchMedia(query);
    if (!mql) {
      // Return a safe no-op object if the browser returns null/undefined
      const safe: MediaQueryList = {
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},       // deprecated shim
        removeListener: () => {},    // deprecated shim
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
      return safe;
    }
    // Patch the deprecated addListener/removeListener if missing
    if (typeof mql.addListener !== "function") {
      (mql as any).addListener = (fn: (e: MediaQueryListEvent) => void) =>
        mql.addEventListener("change", fn);
      (mql as any).removeListener = (fn: (e: MediaQueryListEvent) => void) =>
        mql.removeEventListener("change", fn);
    }
    return mql;
  };
}
// ────────────────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

function AppContent() {
  useDynamicFavicon("masterpanel");
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <LanguageProvider>
            <CurrencyProvider>
              <SiteThemeProvider />
              <TrackingPixels />
              <AppContent />
              {children}
              <Toaster />
            </CurrencyProvider>
          </LanguageProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
// code:4ce0
