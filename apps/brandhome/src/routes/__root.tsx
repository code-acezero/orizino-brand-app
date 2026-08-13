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
import perfCss from "@/src/styles/perf.css?url";

export const Route = createRootRoute({
  loader: async () => {
    // Runs before the route tree renders — both on the initial SSR request
    // and on client-side navigation — so cross-app-urls.ts's cache is
    // already populated by the time any component (e.g. LandingPage's Shop
    // button) calls storefrontHref()/shopHref()/etc. during render.
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
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/707043ee-fc59-409d-b97b-46adf360ec19",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "orizino" },
      { name: "twitter:description", content: "orizino — premium & luxurious fashion brand" },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/707043ee-fc59-409d-b97b-46adf360ec19",
      },
      { name: "theme-color", content: "#0a0a0a" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://oectjdngvrqnxwhnwfrt.supabase.co" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&family=Inter:wght@100..900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Cormorant+Garamond:ital,wght@0,400..700;1,400..700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: perfCss },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icons/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icons/icon-512.png" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/icons/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
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
  if (!online) return <OfflinePage homeTo="/home" appName="Orizino" />;
  return <>{children}</>;
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
