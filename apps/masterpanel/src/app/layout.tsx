import type { Metadata } from "next";
import "@/src/styles/app.css";

export const metadata: Metadata = {
  title: "Orizino Admin Panel",
  description: "Orizino enterprise management & control panel",
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
