/**
 * server-fn-compat.server.ts
 *
 * Next.js / Server-only companion to `server-fn-compat.ts`.
 */

export function getRequest(): any {
  if (typeof window === "undefined") {
    try {
      const { headers } = require("next/headers");
      return { headers: headers() };
    } catch {}
  }
  return {};
}
