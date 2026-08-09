import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Order Ops is a plain client-only SPA — deliberately NOT TanStack Start/SSR.
// It talks to Supabase directly (RLS-scoped) and to Supabase Edge Functions
// for anything that needs a secret (invoices/email). That means the built
// `dist/` folder is fully static and self-contained, which is exactly what
// Capacitor needs to wrap into an Android/iOS app later — see README.md.
export default defineConfig({
  // Relative asset paths. Capacitor serves the app from a local scheme
  // (capacitor://localhost or file-based WebView roots depending on
  // platform), not from "/" — absolute asset paths silently 404 there.
  base: "./",
  server: {
    port: 3003,
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 1600,
  },
  plugins: [tsConfigPaths(), tailwindcss(), viteReact()],
});
