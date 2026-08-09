/**
 * Per-edge-function probe definitions used by the Admin Debug "Ping" tool.
 *
 * Each probe describes the minimal HTTP call that should yield a 2xx from a
 * healthy deployment. When a function would have unwanted side-effects from a
 * real call (sending push, creating orders, charging AI credits), we use
 * "reachability" mode: any HTTP response — including 4xx validation errors —
 * counts as healthy because it proves the function booted, parsed the
 * request and rejected our intentionally-empty payload.
 */
export type ProbeMode = "ok-only" | "reachability";

export interface EdgeFunctionProbe {
  name: string;
  method?: "GET" | "POST";
  body?: unknown;
  /** When "reachability", any non-network response is treated as healthy. */
  mode?: ProbeMode;
  /** Optional human label shown next to the function name. */
  label?: string;
}

export const EDGE_FUNCTION_PROBES: EdgeFunctionProbe[] = [
  // No-arg, returns 200 with VAPID public key.
  { name: "get-vapid-key", method: "POST", body: {}, mode: "ok-only" },

  // No-arg, returns 200 with ICE server list.
  { name: "get-ice-servers", method: "POST", body: {}, mode: "ok-only" },

  // No-arg, returns 200 with rates.
  { name: "fetch-exchange-rates", method: "POST", body: {}, mode: "ok-only" },

  // Action-based, "status" is the call site used in AdminCouriers.
  { name: "courier-secrets", method: "POST", body: { action: "status" }, mode: "ok-only" },
  // pathao / send-push intentionally omitted: they don't expose a no-op
  // action, so a probe call returns 400 which surfaces as a noisy runtime
  // error in the preview. Test them from their dedicated admin tools instead.
  { name: "steadfast", method: "POST", body: { action: "balance" }, mode: "reachability" },

  // Side-effect heavy → reachability only (don't fire real pushes / orders).
  { name: "ai-chat", method: "POST", body: {}, mode: "reachability" },
  { name: "notify-live-support", method: "POST", body: {}, mode: "reachability" },
  { name: "notify-restock", method: "POST", body: {}, mode: "reachability" },
  // create-order omitted: empty body triggers a "Missing required shipping
  // fields" 400 which surfaces as a noisy runtime error in the preview.
  { name: "sync-payment-proof", method: "POST", body: {}, mode: "reachability" },
  { name: "sync-shipments", method: "POST", body: {}, mode: "reachability" },
  { name: "sync-recording-to-drive", method: "POST", body: {}, mode: "reachability" },
  { name: "generate-invoice", method: "POST", body: {}, mode: "reachability" },

  // Analytics — accepts almost anything.
  { name: "track-visit", method: "POST", body: { event_type: "page_view", page: "/__probe", referrer: "" }, mode: "ok-only" },

  // GET endpoints.
  { name: "generate-sitemap", method: "GET", mode: "ok-only" },
  // og-image requires a ?slug=… query param; reachability via OPTIONS preflight
  // avoids the noisy "Missing slug parameter" 400 in the debug panel.
  { name: "og-image", method: "POST", body: {}, mode: "reachability" },
];

export type PingResult =
  | { state: "ok"; code: number }
  | { state: "warn"; code: number }
  | { state: "fail"; code?: number; error?: string }
  | { state: "pending" }
  | { state: "idle" };

export async function runProbe(
  probe: EdgeFunctionProbe,
  opts: { supabaseUrl: string; anonKey: string; accessToken?: string },
): Promise<PingResult> {
  const { supabaseUrl, anonKey, accessToken } = opts;
  const url = `${supabaseUrl}/functions/v1/${probe.name}`;
  // For reachability probes, use OPTIONS (CORS preflight). It proves the
  // function booted without triggering its validation logic — which would
  // otherwise return a 400 and surface as a noisy runtime error.
  const isReachability = probe.mode === "reachability";
  const method = isReachability ? "OPTIONS" : (probe.method ?? "POST");

  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
        ...(method === "OPTIONS"
          ? {
              "Access-Control-Request-Method": "POST",
              "Access-Control-Request-Headers": "authorization,content-type",
              Origin: typeof window !== "undefined" ? window.location.origin : "",
            }
          : {}),
        apikey: anonKey,
        Authorization: `Bearer ${accessToken ?? anonKey}`,
      },
      ...(method === "POST" ? { body: JSON.stringify(probe.body ?? {}) } : {}),
    });

    if (res.status >= 200 && res.status < 300) return { state: "ok", code: res.status };
    if (probe.mode === "reachability" && res.status >= 400 && res.status < 500) {
      // Function booted and rejected our probe → counts as healthy.
      return { state: "ok", code: res.status };
    }
    if (res.status >= 400 && res.status < 500) return { state: "warn", code: res.status };
    return { state: "fail", code: res.status };
  } catch (e: any) {
    return { state: "fail", error: e?.message ?? "network" };
  }
}
