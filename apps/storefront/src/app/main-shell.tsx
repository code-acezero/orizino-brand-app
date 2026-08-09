"use client";
import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLayout } from "@/contexts/LayoutContext";
import { useLocation } from "@/lib/router-compat";

import RouteTransitionLoader from "@/components/RouteTransitionLoader";

export default function MainShell({ children }: { children: React.ReactNode }) {
  const { productTray } = useLayout();
  const location = useLocation();
  // Home page has a full-bleed hero that sits behind the transparent navbar —
  // skip the top padding there. All other pages need it to clear the fixed nav.
  const isHome = location.pathname === "/" || location.pathname === "/home";

  return (
    <div className="min-h-screen flex flex-col">
      <RouteTransitionLoader />
      <React.Suspense fallback={null}>
        <Navbar bottomNavProductTray={productTray as any} />
      </React.Suspense>
      <div className={`flex-grow${isHome ? "" : " pt-12 lg:pt-14"}`}>
        <React.Suspense fallback={null}>
          {children}
        </React.Suspense>
      </div>
      <React.Suspense fallback={null}>
        <Footer />
      </React.Suspense>
    </div>
  );
}
// code:4ce0
