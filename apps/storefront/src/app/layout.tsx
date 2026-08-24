import type { Metadata } from "next";
import "@/src/styles/app.css";
import Providers from "@/src/app/providers";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: {
    template: "%s — ORIZINO",
    default: "ORIZINO — Beyond Simplicity | Luxury Fashion & Premium Streetwear",
  },
  description:
    "Shop ORIZINO luxury fashion — premium oversized streetwear, heavyweight tees & designer hoodies crafted in Dhaka. Beyond Simplicity.",
  keywords: [
    "ORIZINO",
    "luxury fashion",
    "premium streetwear",
    "oversized tee",
    "heavyweight cotton",
    "designer hoodie",
    "drop shoulder",
    "luxury clothing Bangladesh",
    "Dhaka fashion brand",
    "beyond simplicity",
    "luxury streetwear brand",
    "premium oversized clothing",
    "designer streetwear",
    "elegant fashion",
    "modern luxury apparel",
  ],
  authors: [{ name: "ORIZINO", url: "https://orizino.com" }],
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
    title: "ORIZINO — Beyond Simplicity | Luxury Fashion",
    description:
      "Shop ORIZINO luxury fashion — premium oversized streetwear, heavyweight tees & designer hoodies crafted in Dhaka.",
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
      "Shop ORIZINO luxury fashion — premium oversized streetwear & designer hoodies.",
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
    <html
      suppressHydrationWarning
      lang="en"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&family=Anek+Bangla:wght@300;400;500;600;700;800&family=Hind+Siliguri:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){if(typeof Node!=='undefined'&&Node.prototype){var origRemoveChild=Node.prototype.removeChild;Node.prototype.removeChild=function(child){if(child.parentNode!==this){if(child.parentNode){return child.parentNode.removeChild(child);}return child;}return origRemoveChild.call(this,child);};var origInsertBefore=Node.prototype.insertBefore;Node.prototype.insertBefore=function(newNode,refNode){if(refNode&&refNode.parentNode!==this){if(refNode.parentNode){return refNode.parentNode.insertBefore(newNode,refNode);}return this.appendChild(newNode);}return origInsertBefore.call(this,newNode,refNode);};}})();(function(){try{var t=localStorage.getItem('theme');var d=document.documentElement;var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var r=(!t||t==='system')?(m?'dark':'light'):t;d.classList.remove('light','dark');d.classList.add(r);}catch(e){}})();`,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="bg-background text-foreground antialiased selection:bg-primary/20"
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
