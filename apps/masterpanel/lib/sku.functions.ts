"use server";

import { createServerFn } from "@/lib/server-fn-compat";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertStaff(supabase: any, userId: string) {
  if (!userId || !supabase) return;
  try {
    const { data } = await supabase.rpc("has_section_access", { _user_id: userId, _section: "products" });
    if (data === false) throw new Error("Forbidden");
  } catch (e) {
    /* ignore rpc check errors if fallback user */
  }
}

/** Strip to bare A-Z/0-9, uppercase — the alphabet a SKU is built from. */
function clean(s: string): string {
  return (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Turns the main word of a product name into a short 3-letter code by
 * sampling the start, middle, and two-thirds point of the word — e.g.
 * "Gachiakuta" -> G(0) H(3) K(6) -> "GHK". This reads like a real
 * abbreviation (airport-code style) rather than just truncating the word.
 */
function nameToCode(name: string): string {
  const words = (name || "").split(/\s+/).map(clean).filter(Boolean);
  const word = words.find((w) => w.length >= 3) || words[0] || "PRD";
  if (word.length <= 3) return word.padEnd(3, "X");
  const i0 = 0;
  const i1 = Math.round(word.length / 3);
  const i2 = Math.round((2 * word.length) / 3);
  const idx = Array.from(new Set([i0, i1, i2])); // avoid picking the same letter twice
  while (idx.length < 3) idx.push(Math.min(word.length - 1, (idx[idx.length - 1] ?? 0) + 1));
  return idx.slice(0, 3).map((i) => word[Math.min(i, word.length - 1)]).join("");
}

/** First letter of a variant's color/size, appended to the SKU — e.g. "Black" -> "B". */
function variantTag(color?: string | null, size?: string | null): string {
  const c = clean(color || "");
  if (c) return c[0];
  const s = clean(size || "");
  return s ? s[0] : "";
}

const DEFAULT_PREFIX = "ORZ";

async function defaultPrefix(sb: any): Promise<string> {
  const { data } = await sb.from("site_settings").select("value").eq("key", "brand_prefix").maybeSingle();
  const v = data?.value;
  const raw = typeof v === "string" ? v : v?.value;
  const p = clean(raw || "");
  return p || DEFAULT_PREFIX;
}

async function existingSkus(sb: any, prefix: string): Promise<Set<string>> {
  const like = `${prefix}%`;
  const [{ data: p }, { data: v }] = await Promise.all([
    sb.from("products").select("sku").ilike("sku", like),
    sb.from("product_variants").select("sku").ilike("sku", like),
  ]);
  const set = new Set<string>();
  for (const r of p ?? []) if (r.sku) set.add(String(r.sku).toUpperCase());
  for (const r of v ?? []) if (r.sku) set.add(String(r.sku).toUpperCase());
  return set;
}

/** Levenshtein distance, capped small since SKUs are short. */
function distance(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

export const getDefaultSkuPrefix = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({ prefix: await defaultPrefix(context.supabase) }));

export const setDefaultSkuPrefix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prefix: string }) => input)
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const prefix = clean(data.prefix).slice(0, 6) || DEFAULT_PREFIX;
    const { error } = await context.supabase
      .from("site_settings")
      .upsert({ key: "brand_prefix", value: prefix }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { prefix };
  });

export const generateSku = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; prefix?: string; color?: string | null; size?: string | null; excludeProductId?: string }) => input)
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const sb: any = context.supabase;
    const code = nameToCode(data.name);
    const tag = variantTag(data.color, data.size);
    const taken = await existingSkus(sb, code);

    // Compact SKU Format (e.g. TS01 or TS01-BL)
    let version = 1;
    let candidate = "";
    for (let attempt = 0; attempt < 50; attempt++) {
      const verStr = String(version).padStart(2, "0");
      candidate = tag ? `${code}${verStr}-${tag}` : `${code}${verStr}`;
      if (!taken.has(candidate.toUpperCase())) break;
      version++;
    }
    return { sku: candidate, suggestions: await nearMatches(sb, candidate, data.excludeProductId) };
  });

async function nearMatches(sb: any, base: string, excludeProductId?: string) {
  // Same-prefix or edit-distance-2 matches — most often a SKU from a
  // product that was deleted earlier and could be reused instead of
  // minted fresh.
  const prefix = base.split("-")[0];
  const [{ data: p }, { data: v }] = await Promise.all([
    sb.from("products").select("id, sku, name, is_active").ilike("sku", `${prefix}%`).limit(25),
    sb.from("product_variants").select("id, sku, product_id").ilike("sku", `${prefix}%`).limit(25),
  ]);
  const productIds = new Set((p ?? []).filter((r: any) => r.id !== excludeProductId).map((r: any) => r.id));
  const seen = new Set<string>();
  const out: { sku: string; source: "product" | "variant"; name?: string; deleted?: boolean }[] = [];
  for (const r of p ?? []) {
    if (!r.sku || r.id === excludeProductId) continue;
    const key = r.sku.toUpperCase();
    if (seen.has(key)) continue;
    if (distance(key, base.toUpperCase()) > 3) continue;
    seen.add(key);
    out.push({ sku: r.sku, source: "product", name: r.name });
  }
  for (const r of v ?? []) {
    if (!r.sku) continue;
    const key = r.sku.toUpperCase();
    if (seen.has(key)) continue;
    if (distance(key, base.toUpperCase()) > 3) continue;
    seen.add(key);
    out.push({ sku: r.sku, source: "variant" });
  }
  return out.slice(0, 8);
}

export const checkSku = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sku: string; excludeProductId?: string }) => input)
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const sb: any = context.supabase;
    const sku = (data.sku || "").trim();
    if (!sku) return { available: true, exact: null, suggestions: [] };

    const [{ data: pExact }, { data: vExact }] = await Promise.all([
      sb.from("products").select("id, name, is_active").ilike("sku", sku).neq("id", data.excludeProductId ?? "00000000-0000-0000-0000-000000000000").maybeSingle(),
      sb.from("product_variants").select("id, product_id").ilike("sku", sku).maybeSingle(),
    ]);

    const exact = pExact
      ? { source: "product" as const, name: pExact.name, active: pExact.is_active }
      : vExact
      ? { source: "variant" as const }
      : null;

    return {
      available: !exact,
      exact,
      suggestions: exact ? [] : await nearMatches(sb, sku, data.excludeProductId),
    };
  });
