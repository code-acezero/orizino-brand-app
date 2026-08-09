// Lightweight client tracker for product_interactions
import { supabase } from "@/integrations/supabase/client";

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem("pi_session_id");
  if (!id) {
    id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem("pi_session_id", id);
  }
  return id;
}

const recent = new Map<string, number>(); // dedupe key -> ts

export async function trackInteraction(
  productId: string,
  kind: "view" | "click" | "cart" | "wishlist" | "purchase" | "dwell" | "hover",
  opts: { dwell_ms?: number; source?: string } = {},
) {
  if (!productId) return;
  // Dedupe identical view/click events within 30s
  const key = `${productId}:${kind}:${opts.source ?? ""}`;
  const now = Date.now();
  const last = recent.get(key) ?? 0;
  if (kind !== "purchase" && kind !== "dwell" && now - last < 30_000) return;
  recent.set(key, now);

  try {
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("product_interactions").insert({
      user_id: auth?.user?.id ?? null,
      session_id: getSessionId(),
      product_id: productId,
      kind,
      dwell_ms: opts.dwell_ms ?? null,
      source: opts.source ?? null,
    });
  } catch {
    /* best-effort */
  }
}
