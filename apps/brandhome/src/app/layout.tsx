import type { Metadata } from "next";
import "@/src/styles/app.css";
import Providers from "@/src/app/providers";

export const metadata: Metadata = {
  title: {
    template: "%s — ORIZINO",
    default: "ORIZINO — Beyond Simplicity | Official Brand Website",
  },
  description:
    "ORIZINO — Beyond Simplicity. The official home of luxury fashion & premium streetwear. Discover collections, brand story & the art of modern elegance crafted in Dhaka.",
  keywords: [
    "ORIZINO",
    "luxury fashion brand",
    "premium streetwear",
    "beyond simplicity",
    "designer clothing",
    "Dhaka fashion brand",
    "official brand website",
    "luxury apparel",
    "modern elegance",
    "oversized clothing",
    "heavyweight tee",
    "drop shoulder",
  ],
  authors: [{ name: "ORIZINO" }],
  creator: "ORIZINO",
  publisher: "ORIZINO",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "ORIZINO",
    title: "ORIZINO — Beyond Simplicity | Official Brand",
    description:
      "The official home of ORIZINO luxury fashion. Discover premium streetwear collections & the art of modern elegance.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "ORIZINO — Beyond Simplicity",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ORIZINO — Beyond Simplicity",
    description:
      "The official home of ORIZINO luxury fashion & premium streetwear.",
    images: ["/og-image.jpg"],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ORIZINO",
  },
  other: {
    "theme-color": "#0a0a0a",
    "msapplication-TileColor": "#0a0a0a",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=document.documentElement;var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var r=(!t||t==='system')?(m?'dark':'light'):t;d.classList.remove('light','dark');d.classList.add(r);}catch(e){}})();`,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="bg-background text-foreground antialiased"
        style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
