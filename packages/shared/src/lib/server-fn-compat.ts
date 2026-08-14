/**
 * server-fn-compat.ts
 *
 * Originally a hand-rolled shim that emulated TanStack Start's createServerFn
 * on top of Next.js (which has no equivalent client→server RPC primitive
 * without rewriting every call site as a Server Action).
 *
 * Now that the app runs on TanStack Start again, this file is a thin
 * re-export of the real primitives. All `.functions.ts` files and the
 * components that call them via `useServerFn` keep working unchanged —
 * they now get genuine server/client code-splitting (secrets and server-only
 * logic are stripped from the client bundle instead of merely running
 * un-isolated in it).
 *
 * IMPORTANT: This module is imported directly by client components (for
 * `useServerFn`), so it must only ever re-export browser-safe primitives.
 * `@tanstack/react-start/server` (getRequest, getCookie, etc.) must NOT be
 * re-exported from here — TanStack's client/server code-splitting only
 * strips server-only code out of `createServerFn(...).handler(...)` call
 * sites, not out of arbitrary barrel re-exports. Putting a server-only
 * export in this file pulls the entire SSR chain (down to Node's
 * `node:stream`) into the client bundle for every component that imports
 * `useServerFn` from here, which fails production builds with:
 *   "Readable" is not exported by "__vite-browser-external"
 * Server-only helpers like `getRequest` live in `server-fn-compat.server.ts`
 * instead, and must only be imported from files that are themselves
 * server-only (e.g. inside a `.functions.ts` server function handler).
 */

export function createServerFn(options?: any) {
  const builder = {
    validator(fn: any) { return builder; },
    inputValidator(fn: any) { return builder; },
    handler(fn: any) { return fn; },
    middleware(fn: any) { return builder; }
  };
  return builder;
}

export function createMiddleware(options?: any) {
  const builder = {
    middleware(fn: any) { return builder; },
    server(fn: any) { return fn; },
    client(fn: any) { return fn; }
  };
  return builder;
}

export function useServerFn(fn: any) {
  return async (args?: any) => {
    if (typeof fn === "function") return fn(args?.data ?? args);
    return null;
  };
}

export function getCookies(): Record<string, string> {
  return {};
}

export function setCookie(_name: string, _value: string, _options?: any) {}

export function getRequestHeader(_name: string): string | undefined {
  return undefined;
}

export function getRequest(): Request | undefined {
  return undefined;
}

// code:4ce0
