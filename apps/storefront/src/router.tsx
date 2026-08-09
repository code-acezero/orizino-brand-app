import { createRouter as createTanStackRouter } from "@orizino/shared/lib/router-compat";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    // Aggressive preloading: prefetch route code + data on hover/focus so
    // navigation feels instant even when the target route has a loader.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
    defaultPreloadDelay: 30,
    // Smooth cross-fade between routes when the browser supports it.
    defaultViewTransition: true,
    // Show pending UI almost immediately for slow loaders so nothing feels
    // frozen, but keep a short minimum to avoid flashing skeletons.
    defaultPendingMs: 150,
    defaultPendingMinMs: 200,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
// code:4ce0
