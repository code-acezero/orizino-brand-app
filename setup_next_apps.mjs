import fs from "fs";
import path from "path";

const root = "d:/ACE ZERO/My web Project Data/Ace Web Project/orizino-brand";

const apps = [
  { name: "company", port: 3000 },
  { name: "storefront", port: 3001 },
  { name: "masterpanel", port: 3002 },
  { name: "orderops", port: 3003 }
];

for (const app of apps) {
  const appDir = path.join(root, "apps", app.name);
  const pkgPath = path.join(appDir, "package.json");
  
  let existingPkg = {};
  if (fs.existsSync(pkgPath)) {
    try { existingPkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")); } catch {}
  }

  const nextPkg = {
    name: `@orizino/${app.name}`,
    version: "0.1.0",
    private: true,
    scripts: {
      dev: `next dev -p ${app.port}`,
      build: "next build",
      start: `next start -p ${app.port}`,
      lint: "next lint"
    },
    dependencies: {
      ...(existingPkg.dependencies || {}),
      next: "^16.0.0",
      react: "^19.0.0",
      "react-dom": "^19.0.0"
    },
    devDependencies: {
      ...(existingPkg.devDependencies || {}),
      "@types/node": "^20",
      "@types/react": "^19",
      "@types/react-dom": "^19",
      typescript: "^5"
    }
  };

  // Remove TanStack Start / Vite plugins that conflict with Next.js
  delete nextPkg.devDependencies["@netlify/vite-plugin-tanstack-start"];
  delete nextPkg.devDependencies["@tailwindcss/vite"];
  delete nextPkg.devDependencies["vite"];
  delete nextPkg.devDependencies["vite-tsconfig-paths"];
  delete nextPkg.dependencies["@tanstack/react-start"];
  delete nextPkg.dependencies["@tanstack/react-router"];

  fs.writeFileSync(pkgPath, JSON.stringify(nextPkg, null, 2));

  // Next.js tsconfig.json
  const tsConfig = {
    compilerOptions: {
      target: "ES2022",
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      strict: false,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "preserve",
      incremental: true,
      plugins: [{ name: "next" }],
      paths: {
        "@/*": ["./*"],
        "@ui/*": ["../../packages/ui/src/*"],
        "@shared/*": ["../../packages/shared/src/*"],
        "@supabase/*": ["../../packages/supabase/src/*"],
        "@orizino/ui": ["../../packages/ui/src"],
        "@orizino/ui/*": ["../../packages/ui/src/*"],
        "@orizino/shared": ["../../packages/shared/src"],
        "@orizino/shared/*": ["../../packages/shared/src/*"],
        "@orizino/supabase": ["../../packages/supabase/src"],
        "@orizino/supabase/*": ["../../packages/supabase/src/*"]
      }
    },
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    exclude: ["node_modules"]
  };

  fs.writeFileSync(path.join(appDir, "tsconfig.json"), JSON.stringify(tsConfig, null, 2));

  // next.config.ts
  const nextConfig = `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: ["@orizino/ui", "@orizino/shared", "@orizino/supabase"],
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
  },
};

export default nextConfig;
`;

  fs.writeFileSync(path.join(appDir, "next.config.ts"), nextConfig);
}

console.log("Configured all 4 Next.js apps successfully!");
