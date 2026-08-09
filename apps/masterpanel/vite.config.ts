import { defineConfig, type Plugin } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import netlify from "@netlify/vite-plugin-tanstack-start";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { inlineNextPublicEnv } from "../../scripts/inline-next-public-env";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * TanStack Start's `@tanstack/start-storage-context` package instantiates
 * `new AsyncLocalStorage()` at module init. In the browser bundle, Vite
 * auto-externalizes `node:async_hooks`, so that constructor throws during
 * hydration and blanks the app. Rewrite the import to a no-op shim for the
 * client environment only; SSR keeps Node's real implementation.
 */
function asyncHooksBrowserShim(): Plugin {
  const shimId = join(__dirname, "src/lib/async-hooks-browser.ts");
  return {
    name: "async-hooks-browser-shim",
    enforce: "pre",
    resolveId(source, _importer, opts) {
      if (opts?.ssr) return null;
      if (source === "node:async_hooks" || source === "async_hooks") {
        return shimId;
      }
      return null;
    },
  };
}

export default defineConfig(({ command, isSsrBuild }) => ({
  server: {
    port: 3002,
  },
  build: {
    // The SSR bundle is built with `noExternal: true` below, so it inlines
    // every server dependency into one file. Minifying that (Terser/esbuild
    // on a multi-MB single-file bundle) is what pushed the Netlify build
    // past its heap limit — the server never needs minified code anyway.
    // Skipping it here removed the OOM without touching the client bundle.
    minify: isSsrBuild ? false : true,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: isSsrBuild
          ? undefined
          : {
              vendor_charts: ["recharts"],
              vendor_pdf: ["jspdf", "html2canvas"],
              vendor_xlsx: ["xlsx"],
            },
      },
    },
  },
  plugins: [
    asyncHooksBrowserShim(),
    tsConfigPaths(),
    tailwindcss(),
    inlineNextPublicEnv(),
    tanstackStart({
      server: { entry: join(__dirname, "src/server.ts") },
      router: {
        routesDirectory: join(__dirname, "src/routes"),
        generatedRouteTree: join(__dirname, "src/routeTree.gen.ts"),
      },
    }),
    // The Netlify adapter emits a Netlify-Functions-formatted server bundle
    // whose default export is a Handler (its prototype chain doesn't end in
    // Object), which the Lovable/Cloudflare preview loader rejects with
    // "Exported value's prototype chain does not end in Object." Only enable
    // it during actual Netlify builds (Netlify sets process.env.NETLIFY=true).
    nitro(),
    ...(process.env.NETLIFY ? [netlify()] : []),
    mcpPlugin(),
    viteReact(),
  ],

  optimizeDeps: {
    // The TanStack Start Vite plugin has to rewrite `createIsomorphicFn`
    // chains inside these packages so the wrong-env branch (client on
    // server, server on client) becomes a noop. When esbuild pre-bundles
    // them, the compiler never sees them and every call falls through to
    // the server implementation, throwing
    //   "No Start context found in AsyncLocalStorage"
    // in the browser. Excluding them from the dep-optimizer forces Vite to
    // run each request through the plugin pipeline instead.
    exclude: [
      "@tanstack/start-client-core",
      "@tanstack/react-start",
      "@tanstack/react-start-client",
      "@tanstack/start-storage-context",
      "@tanstack/start-fn-stubs",
    ],
    // Also strip `node:async_hooks` out of Vite's esbuild-based dep
    // pre-bundling. Without this, the shim above never intercepts because
    // esbuild bundles the package before our resolveId runs.
    esbuildOptions: {
      plugins: [
        {
          name: "async-hooks-browser-shim-esbuild",
          setup(build) {
            const shim = join(__dirname, "src/lib/async-hooks-browser.ts");
            build.onResolve({ filter: /^(node:)?async_hooks$/ }, () => ({
              path: shim,
            }));
          },
        },
      ],
    },
  },
  ssr: {
    // Bundle everything in production so the hosted preview worker (which
    // serves only dist/server and cannot resolve bare npm imports at runtime)
    // ships a self-contained server bundle. In dev, only bundle the TanStack/
    // Netlify HTTP helper chain — bundling broad CJS packages like React
    // through Vite's ESM module runner breaks dev SSR with
    // "ReferenceError: module is not defined".
    noExternal: command === "build" ? true : ["@opentelemetry/api", "h3-v2", "rou3", "srvx"],
  },
}));
