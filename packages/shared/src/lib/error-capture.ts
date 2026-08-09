// Minimal error capture for SSR catastrophic path. Keeps last thrown error so
// the server entry can include it in the 500 response.
let lastCapturedError: unknown;

export function consumeLastCapturedError(): unknown {
  const err = lastCapturedError;
  lastCapturedError = undefined;
  return err;
}

function record(err: unknown) {
  lastCapturedError = err;
}

if (typeof globalThis !== "undefined") {
  try {
    const g = globalThis as any;
    g.addEventListener?.("error", (e: any) => record(e?.error ?? e));
    g.addEventListener?.("unhandledrejection", (e: any) => record(e?.reason ?? e));
  } catch {}
}
// code:4ce0
