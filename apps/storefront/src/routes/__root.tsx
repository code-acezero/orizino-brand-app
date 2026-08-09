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
import { OfflinePage, useOnlineStatus } from "@orizino/shared";
import { setExternalRedirects } from "@/lib/cross-app-urls";
import { getExternalRedirects } from "@/lib/external-redirects.functions";
import appCss from "@/src/styles/app.css?url";
import loadersCss from "@/src/styles/loaders.css?url";
import perfCss from "@/src/styles/perf.css?url";

export const Route = createRootRoute({
  loader: async () => {
    // Runs before the route tree renders — both on the initial SSR request
    // and on client-side navigation — so cross-app-urls.ts's cache is
    // already populated by the time any component calls
    // storefrontHref()/companyHref()/etc. during render.
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
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { name: "theme-color", content: "#0a0a0a" },
      { name: "color-scheme", content: "light dark" },
      // Sitewide defaults — leaf routes override title, description, og:*.
      { title: "Orizino" },
      {
        name: "description",
        content: "Orizino — premium & luxurious fashion brand.",
      },
      { property: "og:site_name", content: "Orizino" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@orizino" },
    ],
    links: [
      // Fonts — preconnect + non-blocking swap load.
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&family=Inter:wght@100..900&display=swap",
      },
      // Supabase — dns-prefetch cuts ~100ms off the first data request.
      {
        rel: "dns-prefetch",
        href: "https://oectjdngvrqnxwhnwfrt.supabase.co",
      },
      {
        rel: "preconnect",
        href: "https://oectjdngvrqnxwhnwfrt.supabase.co",
        crossOrigin: "anonymous",
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
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Orizino",
          url: "/",
          logo: "/favicon.png",
        }),
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: ErrorBoundary,
});

function RootComponent() {
  return (
    <OfflineGate>
      <Outlet />
    </OfflineGate>
  );
}

function OfflineGate({ children }: { children: React.ReactNode }) {
  const online = useOnlineStatus();
  if (!online) return <OfflinePage homeTo="/" appName="Orizino" />;
  return <>{children}</>;
}


function RootDocument({ children }: { children: React.ReactNode }) {
  // Pre-hydration theme + background so light/dark mode paints before React mounts.
  // Reads localStorage keys used by StorefrontThemeProvider ('storefront-mode' / 'storefront-theme').
  const themeScript = `
try {
  var m = 'dark';
  var el = document.documentElement;
  if (m === 'light') { el.classList.add('light'); el.style.colorScheme = 'light'; el.style.backgroundColor = '#ffffff'; }
  else { el.classList.remove('light'); el.style.colorScheme = 'dark'; el.style.backgroundColor = '#0a0a0a'; }
} catch (e) {}
`;
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
