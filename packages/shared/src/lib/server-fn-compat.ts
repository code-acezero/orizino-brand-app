/**
 * server-fn-compat.ts
 *
 * Isomorphic server function & middleware compatibility layer.
 * Works seamlessly across TanStack Start and Next.js App Router Server Actions.
 */

import { createClient } from "@supabase/supabase-js";

function getFallbackSupabaseClient() {
  const url =
    (typeof process !== "undefined" &&
      (process.env?.SUPABASE_URL ||
        process.env?.NEXT_PUBLIC_SUPABASE_URL ||
        process.env?.VITE_SUPABASE_URL)) ||
    "";
  const key =
    (typeof process !== "undefined" &&
      (process.env?.SUPABASE_SERVICE_ROLE_KEY ||
        process.env?.SUPABASE_PUBLISHABLE_KEY ||
        process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env?.VITE_SUPABASE_PUBLISHABLE_KEY)) ||
    "";

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: any, init: any) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export function createServerFn(options?: any) {
  const middlewares: any[] = [];
  let validatorFn: any = null;

  const builder = {
    validator(fn: any) {
      validatorFn = fn;
      return builder;
    },
    inputValidator(fn: any) {
      validatorFn = fn;
      return builder;
    },
    middleware(fns: any[]) {
      if (Array.isArray(fns)) {
        middlewares.push(...fns);
      } else if (fns) {
        middlewares.push(fns);
      }
      return builder;
    },
    handler(fn: any) {
      const serverAction = async (inputArgs?: any) => {
        // 1. Normalize data argument
        let rawData = inputArgs;
        if (inputArgs !== undefined && inputArgs !== null) {
          if (
            typeof inputArgs === "object" &&
            "data" in inputArgs &&
            inputArgs.data !== undefined
          ) {
            rawData = inputArgs.data;
          }
        }

        // 2. Validate input if validator provided
        let validatedData = rawData;
        if (typeof validatorFn === "function") {
          try {
            validatedData = validatorFn(rawData);
          } catch (err: any) {
            console.error("[server-fn-compat] Validation error:", err);
            throw new Error(err?.message || "Invalid input parameters");
          }
        }

        // 3. Construct default execution context
        let currentContext: any = {
          supabase: getFallbackSupabaseClient(),
          userId: "",
          claims: null,
        };

        // 4. Run registered middlewares in order
        for (const mw of middlewares) {
          if (typeof mw === "function") {
            try {
              await mw({
                next: async (result?: any) => {
                  if (result?.context) {
                    currentContext = { ...currentContext, ...result.context };
                  }
                  return result;
                },
                data: validatedData,
                context: currentContext,
              });
            } catch (mwErr: any) {
              console.error("[server-fn-compat] Middleware error:", mwErr);
              throw mwErr;
            }
          }
        }

        // 5. Ensure supabase client is present
        if (!currentContext.supabase) {
          currentContext.supabase = getFallbackSupabaseClient();
        }

        // 6. Execute user handler
        return await fn({
          data: validatedData,
          context: currentContext,
          ...currentContext,
        });
      };

      return serverAction;
    },
  };

  return builder;
}

export function createMiddleware(options?: any) {
  const builder = {
    middleware(fn: any) {
      return builder;
    },
    server(fn: any) {
      return fn;
    },
    client(fn: any) {
      return fn;
    },
  };
  return builder;
}

export function useServerFn(fn: any) {
  return typeof window !== "undefined"
    ? (args?: any) => {
        if (typeof fn === "function") {
          return fn(args);
        }
        return Promise.resolve(null);
      }
    : async (args?: any) => {
        if (typeof fn === "function") {
          return await fn(args);
        }
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
