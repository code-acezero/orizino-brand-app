import { defineConfig, type Plugin } from "vite";
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

/**
 * TanStack Start's `@tanstack/start-storage-context` package instantiates
 * `new AsyncLocalStorage()` at module init. In the browser bundle, Vite
 * auto-externalizes `node:async_hooks`, so that constructor throws during
 * hydration ("AsyncLocalStorage is not a constructor"). Rewrite the import
 * to a no-op shim for the client environment only; SSR keeps Node's real
 * implementation.
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

/**
 * Build-time guard: fail the client build (and dev SSR-to-client transform)
 * the moment a server-only module gets pulled into the browser graph.
 * Catches regressions like the `AsyncLocalStorage is not a constructor`
 * hydration crash BEFORE they ship — the error surfaces at
 * `resolveId`/`load` time with the offending import chain instead of at
 * runtime in the user's browser.
 *
 * Blocks in the client environment only:
 *  - Node core built-ins (`node:*` and bare aliases like `fs`, `child_process`)
 *  - `*.server.{ts,tsx,js,mjs,cjs}` filename convention
 *  - Known server-only Supabase admin client paths
 *
 * The `asyncHooksBrowserShim` plugin above runs `enforce: "pre"` and
 * resolves `node:async_hooks` to a browser shim BEFORE this guard sees it,
 * so the intentional shim is not treated as a violation.
 */
function clientServerImportGuard(): Plugin {
  const NODE_BUILTINS = new Set([
    "fs", "fs/promises", "child_process", "cluster", "dgram", "dns",
    "http", "http2", "https", "net", "os", "path", "perf_hooks",
    "process", "readline", "repl", "stream", "tls", "tty", "v8", "vm",
    "worker_threads", "zlib", "async_hooks", "inspector", "module",
  ]);
  const SERVER_FILE = /\.server\.(ts|tsx|js|mjs|cjs)($|\?)/;
  const SERVER_ONLY_PATHS = [
    "@/integrations/supabase/client.server",
    "@orizino/supabase/client.server",
  ];
  const CODE_IMPORTER = /\.(mjs|cjs|js|jsx|ts|tsx)($|\?)/;

  const fail = (source: string, importer: string | undefined) => {
    const chain = importer ? `\n    imported by: ${importer}` : "";
    throw new Error(
      `[client-server-import-guard] Server-only module "${source}" ` +
        `reached the client bundle.${chain}\n` +
        `    Move the import inside a createServerFn .handler() body ` +
        `(await import(...)) or behind a *.server.ts boundary.`
    );
  };

  return {
    name: "client-server-import-guard",
    enforce: "pre",
    resolveId(source, importer, opts) {
      if (opts?.ssr) return null;
      // Skip during esbuild dep-scan (opts.scan) — it walks server-only
      // chains it will never actually bundle for the client.
      if ((opts as { scan?: boolean } | undefined)?.scan) return null;
      // Vite's CSS analysis resolves Tailwind-scanned file references through
      // index.html, which is not a real JS import chain. Guard only executable
      // module imports so CSS requests do not become false-positive 500s.
      if (importer && !CODE_IMPORTER.test(importer)) return null;
      // A *.server.ts file importing another server-only module is fine;
      // only fail when the importer itself is client-reachable.
      if (importer && SERVER_FILE.test(importer)) return null;
      const bare = source.startsWith("node:") ? source.slice(5) : source;
      if (source.startsWith("node:") || NODE_BUILTINS.has(bare)) {
        fail(source, importer);
      }
      if (SERVER_FILE.test(source) || SERVER_ONLY_PATHS.includes(source)) {
        fail(source, importer);
      }
      return null;
    },
    load(id, opts) {
      if (opts?.ssr) return null;
      // Same reasoning: .server.ts files are only loaded on the server.
      return null;
    },

  };
}

export default defineConfig(({ command, isSsrBuild }) => ({
  server: {
    port: 3001,
  },
  build: {
    // SSR bundle inlines every server dependency (`noExternal: true` below).
    // Minifying that single huge file is what exhausts the Netlify build's
    // heap; the server bundle doesn't need to be minified.
    minify: isSsrBuild ? false : true,
    chunkSizeWarningLimit: 1600,
  },
  plugins: [
    asyncHooksBrowserShim(),
    clientServerImportGuard(),
    tsConfigPaths(),
    tailwindcss(),
    inlineNextPublicEnv(),
    tanstackStart({
      server: { entry: join(__dirname, "src/server.ts") },
      router: {
        routesDirectory: join(__dirname, "src/routes"),
        generatedRouteTree: join(__dirname, "src/routeTree.gen.ts"),
      },
    }) as any,
    nitro(),
    ...(process.env.NETLIFY ? [netlify()] : []),
    viteReact(),
  ],
  optimizeDeps: {
    // See apps/masterpanel/vite.config.ts for the full rationale. The
    // TanStack Start plugin must rewrite createIsomorphicFn chains inside
    // these packages; esbuild pre-bundling skips the plugin and leaves the
    // server branch active on the client, throwing
    //   "No Start context found in AsyncLocalStorage"
    // during hydration.
    exclude: [
      "@tanstack/start-client-core",
      "@tanstack/react-start",
      "@tanstack/react-start-client",
      "@tanstack/start-storage-context",
      "@tanstack/start-fn-stubs",
    ],
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
    // In production, bundle everything into dist/server/server.js so the
    // hosted preview worker (which serves built output only, no npm install)
    // ships a self-contained bundle — including gsap, whose ESM syntax
    // breaks a raw Node require() outside of "type": "module". In dev, keep
    // broad CJS deps like React external — bundling them through Vite's ESM
    // module runner breaks dev SSR with "ReferenceError: module is not defined".
    noExternal: command === "build" ? true : ["@opentelemetry/api", "h3-v2", "rou3", "srvx", "gsap"],
  },
}));
// code:4ce0
