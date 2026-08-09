import fs from "fs";
import path from "path";

const root = "d:/ACE ZERO/My web Project Data/Ace Web Project/orizino-brand";

// 1. Company App Router
const companyApp = path.join(root, "apps/company/src/app");
fs.mkdirSync(companyApp, { recursive: true });

const companyLayout = `import type { Metadata } from "next";
import "@/src/styles/app.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Orizino — Premium Brand",
  description: "Official Orizino luxury fashion brand site",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ backgroundColor: "#0a0a0a", colorScheme: "dark" }}>
      <body className="bg-background text-foreground antialiased selection:bg-primary/20">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
`;
fs.writeFileSync(path.join(companyApp, "layout.tsx"), companyLayout);

const companyPages = {
  "page.tsx": `import { Suspense } from "react";
import LandingPage from "@/_pages/LandingPage";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <LandingPage />
    </Suspense>
  );
}
`,
  "docs/page.tsx": `import { Suspense } from "react";
import DocsPage from "@/_pages/DocsPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DocsPage />
    </Suspense>
  );
}
`,
  "news/page.tsx": `import { Suspense } from "react";
import NewsPage from "@/_pages/NewsPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <NewsPage />
    </Suspense>
  );
}
`,
  "products/page.tsx": `import { Suspense } from "react";
import ProductHighlightsPage from "@/_pages/ProductHighlightsPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ProductHighlightsPage />
    </Suspense>
  );
}
`,
  "scanner-info/page.tsx": `import { Suspense } from "react";
import ScannerInfoPage from "@/_pages/ScannerInfoPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ScannerInfoPage />
    </Suspense>
  );
}
`,
  "id/[slug]/page.tsx": `import { Suspense } from "react";
import EmployeeIdentityPage from "@/_pages/EmployeeIdentityPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <EmployeeIdentityPage />
    </Suspense>
  );
}
`,
  "track/page.tsx": `import { Suspense } from "react";
import TrackPage from "@/_pages/TrackPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <TrackPage />
    </Suspense>
  );
}
`,
  "not-found.tsx": `import { Suspense } from "react";
import NotFound from "@/_pages/NotFound";

export default function NotFoundPage() {
  return (
    <Suspense fallback={null}>
      <NotFound />
    </Suspense>
  );
}
`
};

for (const [rel, code] of Object.entries(companyPages)) {
  const file = path.join(companyApp, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, code);
}

// 2. Storefront App Router
const storefrontApp = path.join(root, "apps/storefront/src/app");
fs.mkdirSync(storefrontApp, { recursive: true });

const storefrontLayout = `import type { Metadata } from "next";
import "@/src/styles/app.css";
import Providers from "@/src/app/providers";

export const metadata: Metadata = {
  title: "orizino — shop luxury fashion",
  description: "orizino — shop luxury streetwear & couture apparel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ backgroundColor: "#0a0a0a", colorScheme: "dark" }}>
      <body className="bg-background text-foreground antialiased selection:bg-primary/20">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
`;
fs.writeFileSync(path.join(storefrontApp, "layout.tsx"), storefrontLayout);

const storefrontPage = `import { Suspense } from "react";
import HomePage from "@/_pages/HomePage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <HomePage />
    </Suspense>
  );
}
`;
fs.writeFileSync(path.join(storefrontApp, "page.tsx"), storefrontPage);

// 3. Masterpanel App Router
const masterpanelApp = path.join(root, "apps/masterpanel/src/app");
fs.mkdirSync(masterpanelApp, { recursive: true });

const masterpanelLayout = `import type { Metadata } from "next";
import "@/src/styles/app.css";

export const metadata: Metadata = {
  title: "Orizino Admin Panel",
  description: "Orizino enterprise management & control panel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ backgroundColor: "#0a0a0a", colorScheme: "dark" }}>
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
`;
fs.writeFileSync(path.join(masterpanelApp, "layout.tsx"), masterpanelLayout);

const masterpanelPage = `import { Suspense } from "react";

export default function Page() {
  return (
    <main className="p-8 text-center">
      <h1 className="text-2xl font-bold">Orizino Masterpanel</h1>
      <p className="text-muted-foreground mt-2">Enterprise Admin Control Panel</p>
    </main>
  );
}
`;
fs.writeFileSync(path.join(masterpanelApp, "page.tsx"), masterpanelPage);

// 4. Orderops App Router
const orderopsApp = path.join(root, "apps/orderops/src/app");
fs.mkdirSync(orderopsApp, { recursive: true });

const orderopsLayout = `import type { Metadata } from "next";
import "@/src/index.css";

export const metadata: Metadata = {
  title: "Orizino OrderOps",
  description: "Fulfillment & scanner operations",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ backgroundColor: "#0a0a0a", colorScheme: "dark" }}>
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
`;
fs.writeFileSync(path.join(orderopsApp, "layout.tsx"), orderopsLayout);

const orderopsPage = `import { Suspense } from "react";

export default function Page() {
  return (
    <main className="p-8 text-center">
      <h1 className="text-2xl font-bold">Orizino OrderOps</h1>
      <p className="text-muted-foreground mt-2">Order Fulfillment & Verification Operations</p>
    </main>
  );
}
`;
fs.writeFileSync(path.join(orderopsApp, "page.tsx"), orderopsPage);

console.log("App Router setup completed for all 4 apps!");
