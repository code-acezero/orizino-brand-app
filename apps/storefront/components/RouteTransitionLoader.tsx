"use client";
import * as React from "react";
import { useRouterState } from "@orizino/shared/lib/router-compat";
import SectionLoader from "@/components/loaders/SectionLoader";

/**
 * Route transition overlay.
 *
 * Uses the platinum ring loader for ALL navigation — both full-page and
 * within-section switches. It appears at 50 ms (instant on real network
 * latency, invisible on fast cached routes) and dismisses in 80 ms so
 * there is no lingering flash.
 *
 * The semi-transparent backdrop keeps the current page visible while
 * loading, which eliminates the "frozen blank screen" feeling.
 */
const RouteTransitionLoader: React.FC = () => {
  const { isLoading, pathname } = useRouterState({
    select: (s) => ({
      isLoading: s.status === "pending" || s.isLoading || s.isTransitioning,
      pathname: s.location.pathname,
    }),
  });

  const [visible, setVisible] = React.useState(false);

  const hasSettledRef      = React.useRef(false);
  const lastSettledPathRef = React.useRef<string>(pathname);

  React.useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    if (!isLoading) {
      hasSettledRef.current      = true;
      lastSettledPathRef.current = pathname;
    }

    if (isLoading && hasSettledRef.current) {
      showTimer = setTimeout(() => setVisible(true), 50);
    } else {
      hideTimer = setTimeout(() => setVisible(false), 80);
    }

    return () => {
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [isLoading, pathname]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes rtl-in { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "grid",
          placeItems: "center",
          background: "rgba(6,4,6,0.52)",
          backdropFilter: "blur(5px)",
          WebkitBackdropFilter: "blur(5px)",
          animation: "rtl-in 160ms ease-out both",
          pointerEvents: "auto",
        }}
        role="status"
        aria-live="polite"
        aria-label="Loading"
      >
        <SectionLoader tone="platinum" size={80} />
      </div>
    </>
  );
};

export default RouteTransitionLoader;
// code:4ce0
