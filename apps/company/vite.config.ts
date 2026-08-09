import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import netlify from "@netlify/vite-plugin-tanstack-start";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { inlineNextPublicEnv } from "../../scripts/inline-next-public-env";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command, isSsrBuild }) => ({
  server: {
    port: 3000,
  },
  build: {
    // SSR bundle inlines every server dependency (`noExternal: true` below).
    // Minifying that single huge file is what exhausts the Netlify build's
    // heap; the server bundle doesn't need to be minified.
    minify: isSsrBuild ? false : true,
    chunkSizeWarningLimit: 1600,
  },
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    inlineNextPublicEnv(),
    tanstackStart({
      server: { entry: join(__dirname, "src/server.ts") },
      routesDirectory: join(__dirname, "src/routes"),
      generatedRouteTree: join(__dirname, "src/routeTree.gen.ts"),
    } as any),
    nitro(),
    ...(process.env.NETLIFY ? [netlify()] : []),
    viteReact(),
  ],
  ssr: {
    // Bundle everything in production so the hosted preview worker (which
    // serves only dist/server) has a self-contained bundle. In dev, leave
    // broad CJS deps like React external — bundling them through Vite's ESM
    // module runner breaks dev SSR with "ReferenceError: module is not defined".
    noExternal: command === "build" ? true : [],
  },
}));
