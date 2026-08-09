/// <reference types="vite/client" />
import * as React from "react";
import {
  HeadContent,
  Scripts,
  createRootRoute,
  Outlet,
} from "@orizino/shared/lib/router-compat";
import Providers from "@/src/app/providers";
import NotFound from "@/_pages/NotFound";
import { setExternalRedirects } from "@/lib/cross-app-urls";
import { getExternalRedirects } from "@/lib/external-redirects.functions";
import appCss from "@/src/styles/app.css?url";
import loadersCss from "@/src/styles/loaders.css?url";
import perfCss from "@/src/styles/perf.css?url";

const MATCH_MEDIA_POLYFILL = `
(function() {
  if (typeof window === 'undefined') return;
  var _mm = window.matchMedia;
  if (!_mm) return;
  window.matchMedia = function(q) {
    var r = _mm.call(window, q);
    if (!r) { return { matches: false, media: q, onchange: null, addListener: function(){}, removeListener: function(){}, addEventListener: function(){}, removeEventListener: function(){}, dispatchEvent: function(){ return false; } }; }
    if (typeof r.addListener !== 'function') { r.addListener = function(fn){ r.addEventListener('change', fn); }; r.removeListener = function(fn){ r.removeEventListener('change', fn); }; }
    return r;
  };
})();
`;

export const Route = createRootRoute({
  loader: async () => {
    // Runs before the route tree renders — both on the initial SSR request
    // and on client-side navigation — so cross-app-urls.ts's cache is
    // already populated by the time any component (e.g. the sidebar's
    // "Open Order Ops" / "Back to Shop" links) calls the href helpers
    // during render.
    try {
      const redirects = await getExternalRedirects();
      setExternalRedirects(redirects as any);
    } catch {
      // Fine to no-op — helpers fall back to env vars / localhost.
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "orizino" },
      { name: "description", content: "orizino — premium & luxurious fashion brand" },
      { property: "og:site_name", content: "orizino" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "orizino" },
      { property: "og:description", content: "orizino — premium & luxurious fashion brand" },
      { name: "theme-color", content: "#0a0a0a" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://oectjdngvrqnxwhnwfrt.supabase.co" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&family=Inter:wght@100..900&family=Cinzel:wght@400;500;600&family=JetBrains+Mono:wght@300;400;500&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: loadersCss },
      { rel: "stylesheet", href: perfCss },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icons/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icons/icon-512.png" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/icons/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
    scripts: [{ children: MATCH_MEDIA_POLYFILL }],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: ErrorBoundary,
});

function RootComponent() {
  return <Outlet />;
}

function RootDocument({ children }: { children: React.ReactNode }) {
  // Force dark background before hydration so the first paint isn't white
  // while site_settings loads from the database.
  const themeScript = `try{var e=document.documentElement;e.classList.remove('light');e.style.colorScheme='dark';e.style.backgroundColor='#0a0a0a';}catch(e){}`;
  return (
    <html lang="en" suppressHydrationWarning style={{ backgroundColor: "#0a0a0a", colorScheme: "dark" }}>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body style={{ backgroundColor: "#0a0a0a" }}>
        <Providers>{children}</Providers>
        <Scripts />
      </body>
    </html>
  );
}

function ErrorBoundary({ error }: { error: Error }) {
  console.error(error);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <a href="/" className="mt-4 inline-block text-primary underline">
          Go home
        </a>
      </div>
    </div>
  );
}
// code:4ce0
