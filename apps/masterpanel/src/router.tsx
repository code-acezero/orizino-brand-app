import { createRouter as createTanStackRouter } from "@orizino/shared/lib/router-compat";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    // Aggressive preload: fetch the route chunk + loader as soon as a link is
    // hovered/focused, with zero delay. Cached results stay warm long enough
    // that back/forward navigation is instant.
    defaultPreload: "intent",
    defaultPreloadDelay: 0,
    defaultPreloadStaleTime: 30_000,
    defaultStaleTime: 30_000,
    defaultGcTime: 5 * 60_000,
    // Don't flash a pending UI for navigations that resolve quickly.
    defaultPendingMs: 150,
    defaultPendingMinMs: 0,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
// code:4ce0
