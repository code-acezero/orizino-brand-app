import fs from "fs";
import path from "path";

const root = "d:/ACE ZERO/My web Project Data/Ace Web Project/orizino-brand";

// 1. Create postcss.config.mjs for all apps
const postcssContent = `export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
`;

for (const app of ["brandhome", "storefront", "masterpanel", "orderops"]) {
  fs.writeFileSync(path.join(root, "apps", app, "postcss.config.mjs"), postcssContent);
}

// 2. Add dependencies to packages/shared/package.json and packages/ui/package.json
const sharedPkgPath = path.join(root, "packages/shared/package.json");
if (fs.existsSync(sharedPkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(sharedPkgPath, "utf-8"));
  pkg.dependencies = {
    ...(pkg.dependencies || {}),
    "framer-motion": "^12.40.0",
    "lucide-react": "^1.17.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.6.0"
  };
  fs.writeFileSync(sharedPkgPath, JSON.stringify(pkg, null, 2));
}

const uiPkgPath = path.join(root, "packages/ui/package.json");
if (fs.existsSync(uiPkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(uiPkgPath, "utf-8"));
  pkg.dependencies = {
    ...(pkg.dependencies || {}),
    "framer-motion": "^12.40.0",
    "lucide-react": "^1.17.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.6.0",
    "class-variance-authority": "^0.7.1"
  };
  fs.writeFileSync(uiPkgPath, JSON.stringify(pkg, null, 2));
}

// 3. Fix layout.tsx in brandhome app
const companyLayout = `import type { Metadata } from "next";
import "@/src/styles/app.css";
import Providers from "@/src/app/providers";

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
fs.writeFileSync(path.join(root, "apps/brandhome/src/app/layout.tsx"), companyLayout);

console.log("Applied PostCSS config and package dependencies successfully!");
