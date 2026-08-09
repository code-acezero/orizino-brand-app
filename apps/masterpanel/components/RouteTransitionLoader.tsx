"use client";
import * as React from "react";
import { useRouterState } from "@orizino/shared/lib/router-compat";
import FullScreenLoader from "@/components/loaders/FullScreenLoader";
import SectionLoader from "@/components/loaders/SectionLoader";

/**
 * Route transition overlay.
 * - Section switches within the admin panel (/, /admin/*, /seo/*, etc.) → platinum loader.
 * - Page switches across the storefront → stroke-fill logo loader.
 */
const RouteTransitionLoader: React.FC = () => {
  const { isLoading, pathname } = useRouterState({
    select: (s) => ({
      isLoading: s.status === "pending" || s.isLoading || s.isTransitioning,
      pathname: s.location.pathname,
    }),
  });
  const [visible, setVisible] = React.useState(false);
  const [mode, setMode] = React.useState<"section" | "page">("page");
  // Suppress overlay until we've reached a stable state at least once,
  // so it doesn't appear on top of the initial splash screen.
  const hasSettledRef = React.useRef(false);
  const lastSettledPathRef = React.useRef<string>(pathname);

  React.useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    if (!isLoading) {
      hasSettledRef.current = true;
      lastSettledPathRef.current = pathname;
    }
    if (isLoading && hasSettledRef.current) {
      const from = lastSettledPathRef.current;
      const to = pathname;
      // Section switch = navigating within the same top-level path segment
      // (e.g. /admin/* ↔ /admin/*, /seo/* ↔ /seo/*, /profile/* ↔ /profile/*).
      // Page switch = crossing into a different root (e.g. /home → /shop).
      const rootOf = (p: string) => {
        const seg = p.split("/").filter(Boolean)[0];
        return seg ?? "";
      };
      const isSectionSwitch = from !== to && rootOf(from) === rootOf(to);
      setMode(isSectionSwitch ? "section" : "page");
      // Only show the overlay if the transition is actually slow. Cached/preloaded
      // routes resolve in < 150ms and should feel instant with no overlay flash.
      showTimer = setTimeout(() => setVisible(true), 180);
    } else {
      hideTimer = setTimeout(() => setVisible(false), 80);
    }
    return () => {
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [isLoading, pathname]);

  if (!visible) return null;

  if (mode === "section") {
    return (
      <div
        className="ldr-fullscreen ldr-backdrop"
        role="status"
        aria-live="polite"
        aria-label="Loading"
      >
        <SectionLoader tone="platinum" size={96} />
      </div>
    );
  }

  return <FullScreenLoader variant="stroke" size={220} withBackdrop />;
};

export default RouteTransitionLoader;
// code:4ce0
