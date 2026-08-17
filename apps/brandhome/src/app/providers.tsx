"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import SiteThemeProvider from "@/components/SiteThemeProvider";
import TrackingPixels from "@/components/TrackingPixels";
import { Toaster } from "@/components/ui/toaster";
import FaviconSync from "@/components/FaviconSync";
import { ThemeProvider } from "@orizino/ui";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
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

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <LanguageProvider>
            <CurrencyProvider>
              <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <SiteThemeProvider />
                <TrackingPixels />
                <FaviconSync />
                {children}
                <Toaster />
              </ThemeProvider>
            </CurrencyProvider>
          </LanguageProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
// code:4ce0
