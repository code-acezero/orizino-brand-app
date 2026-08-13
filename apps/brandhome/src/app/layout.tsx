import type { Metadata } from "next";
import "@/src/styles/app.css";
import Providers from "@/src/app/providers";

export const metadata: Metadata = {
  title: "Orizino — Official Brand Website",
  description: "Official Orizino luxury streetwear brand site. Premium drop shoulder t-shirts crafted in Dhaka.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning lang="en" className="dark" style={{ backgroundColor: "#1c1c1a", colorScheme: "dark" }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap"
          rel="stylesheet"
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
