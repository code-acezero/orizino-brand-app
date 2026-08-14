"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { LayoutProvider } from "@/contexts/LayoutContext";
import SiteThemeProvider from "@/components/SiteThemeProvider";
import TrackingPixels from "@/components/TrackingPixels";
import { useDynamicFavicon } from "@/hooks/use-dynamic-favicon";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import MainShell from "./main-shell";

const SplashScreen = React.lazy(() => import("@/components/SplashScreen"));
const AIChatWidget = React.lazy(() => import("@/components/AIChatWidget"));
const PromoPopup = React.lazy(() => import("@/components/PromoPopup"));
const InstallAppPrompt = React.lazy(() => import("@/components/InstallAppPrompt"));

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
  useDynamicFavicon("storefront");
  return null;
}

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

function useSplash() {
  const [show, setShow] = React.useState(true);

  useIsomorphicLayoutEffect(() => {
    try {
      if (sessionStorage.getItem("splash:seen")) {
        setShow(false);
        return;
      }
    } catch {}

    const t = setTimeout(() => {
      setShow(false);
      try { sessionStorage.setItem("splash:seen", "1"); } catch { /* noop */ }
    }, 800);
    return () => clearTimeout(t);
  }, []);

  return show;
}

function DeferredWidgets() {
  // Chat launcher + promo popup are non-critical: keep them out of the
  // initial render path so LCP + TTI stay tight, especially on mobile.
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    // @ts-ignore
    const ric: any = window.requestIdleCallback;
    let id: any;
    let t: any;
    if (typeof ric === "function") {
      id = ric(() => setReady(true), { timeout: 2500 });
    } else {
      t = setTimeout(() => setReady(true), 1500);
    }
    return () => {
      // @ts-ignore
      if (id && window.cancelIdleCallback) window.cancelIdleCallback(id);
      if (t) clearTimeout(t);
    };
  }, []);
  if (!ready) return null;
  return (
    <React.Suspense fallback={null}>
      <AIChatWidget />
      <PromoPopup />
      <InstallAppPrompt />
    </React.Suspense>
  );
}

function ClientShell({ children }: { children: React.ReactNode }) {
  const splash = useSplash();
  return (
    <MainShell>
      <React.Suspense fallback={null}>
        <SplashScreen visible={splash} />
      </React.Suspense>
      <SiteThemeProvider />
      <TrackingPixels />
      <AppContent />
      <DeferredWidgets />
      {children}
      <Toaster />
    </MainShell>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <LanguageProvider>
            <CurrencyProvider>
              <LayoutProvider>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                  <ClientShell>{children}</ClientShell>
                </ThemeProvider>
              </LayoutProvider>
            </CurrencyProvider>
          </LanguageProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
// code:4ce0
