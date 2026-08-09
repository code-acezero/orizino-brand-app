/**
 * server-fn-compat.server.ts
 *
 * Server-only companion to `server-fn-compat.ts`. `getRequest` (and any
 * other @tanstack/react-start/server primitives) must live here, NOT in
 * the client-safe barrel, so that client components which only need
 * `useServerFn` never transitively pull the SSR/server chain into the
 * browser bundle. Only import this file from code that is itself
 * server-only — e.g. inside a `createServerFn(...).handler(...)` body in
 * a `.functions.ts` file.
 */

export { getRequest } from "@tanstack/react-start/server";
// code:4ce0
