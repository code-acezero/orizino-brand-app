import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "OrderOps — Fulfillment & Operations",
  description: "Fulfillment, courier dispatch, barcode scanner & counter operations",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning lang="en" className="dark" style={{ backgroundColor: "#0a0a0a", colorScheme: "dark" }}>
      <body suppressHydrationWarning className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
