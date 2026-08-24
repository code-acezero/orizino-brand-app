import type { Metadata } from "next";
import { Providers } from "./providers";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: {
    template: "%s — ORIZINO Explore",
    default: "ORIZINO Explore — Discover Collections, Universes & Character Wardrobes",
  },
  description:
    "Explore every collection, universe & character wardrobe across the ORIZINO fashion maison. Beyond Simplicity.",
  keywords: [
    "ORIZINO explore",
    "fashion collections",
    "character wardrobe",
    "universe collection",
    "luxury fashion maison",
    "beyond simplicity",
    "ORIZINO channels",
  ],
  authors: [{ name: "ORIZINO" }],
  creator: "ORIZINO",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "ORIZINO Explore",
    title: "ORIZINO Explore — Collections & Universes",
    description:
      "Explore every collection, universe & character wardrobe across the ORIZINO fashion maison.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "ORIZINO Explore" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ORIZINO Explore",
    description:
      "Explore collections, universes & character wardrobes across the ORIZINO fashion maison.",
    images: ["/og-image.jpg"],
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.png?v=4", type: "image/png" },
      { url: "/favicon-32.png?v=4", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png?v=4", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.png?v=4",
    apple: "/apple-touch-icon.png?v=4",
  },
  other: {
    "theme-color": "#080808",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark scroll-smooth" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png?v=3" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png?v=3" />
        <link rel="icon" type="image/png" href="/favicon.png?v=3" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=3" />
        <link rel="shortcut icon" href="/favicon.ico?v=3" />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} bg-background text-foreground antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
