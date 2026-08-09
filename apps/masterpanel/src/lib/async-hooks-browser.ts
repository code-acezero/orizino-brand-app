// Browser-side shim for node:async_hooks. Only used in the client bundle
// via a Vite `resolve.alias`. TanStack Start's start-storage-context
// instantiates `new AsyncLocalStorage()` at module load, which crashes
// hydration when Vite auto-externalizes the real `node:async_hooks`.
// The store is never actually consumed in the browser (all reads happen
// inside server-only code paths), so a no-op class is enough.
/**
 * Browser has no true async-local storage. The browser event loop is
 * effectively single-threaded, and TanStack Start only needs one active
 * Start context at a time on the client. So this shim just holds the last
 * context set via `run` / `enterWith`, and every `getStore()` returns it —
 * async continuations included. We intentionally do NOT restore the previous
 * store when `run(fn)` returns, because `fn` may schedule async work whose
 * continuations need to see the store.
 */
export class AsyncLocalStorage<T = unknown> {
  private store: T | undefined;
  run<R>(store: T, fn: () => R): R {
    this.store = store;
    return fn();
  }
  getStore(): T | undefined {
    return this.store;
  }
  disable() {
    this.store = undefined;
  }
  enterWith(store: T) {
    this.store = store;
  }
  exit<R>(fn: () => R): R {
    const prev = this.store;
    this.store = undefined as unknown as T;
    try {
      return fn();
    } finally {
      this.store = prev;
    }
  }
}
export default { AsyncLocalStorage };
// code:4ce0
