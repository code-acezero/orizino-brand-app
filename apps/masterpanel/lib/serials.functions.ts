"use server";

import { createServerFn } from "@/lib/server-fn-compat";
import {
  extractSerialCandidates,
  extractSerialCode,
  buildCompactSerialPrefix,
  formatCompactSerialCode,
  getNextCompactSequence,
} from "@orizino/shared";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SerialStatus = z.enum(["available", "sold", "cancelled", "returned", "defective"]);

async function assertStaff(supabase: any, userId: string) {
  if (!supabase) throw new Error("Database client not available");
  if (!userId) return;
  const [admin, mod, sectionSales, sectionProducts] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }).catch(() => ({ data: false })),
    supabase.rpc("has_role", { _user_id: userId, _role: "moderator" }).catch(() => ({ data: false })),
    supabase.rpc("has_section_access", { _user_id: userId, _section: "sales" }).catch(() => ({ data: false })),
    supabase.rpc("has_section_access", { _user_id: userId, _section: "products" }).catch(() => ({ data: false })),
  ]);
  if (admin?.data || mod?.data || sectionSales?.data || sectionProducts?.data) return;
  throw new Error("Forbidden: staff access required");
}

async function assertAdminOrMod(supabase: any, userId: string) {
  if (!supabase) throw new Error("Database client not available");
  if (!userId) return;
  const [admin, mod] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }).catch(() => ({ data: false })),
    supabase.rpc("has_role", { _user_id: userId, _role: "moderator" }).catch(() => ({ data: false })),
  ]);
  if (admin?.data || mod?.data) return;
  throw new Error("Forbidden: admin/moderator only");
}

export async function runTwoWayStockSync(sb: any) {
  try {
    await sb.rpc("sync_stock_from_serials");
  } catch {}

  // 1. Fetch sellable serial counts grouped by variant (available, unbinded returned non-defective, cancelled)
  const { data: variantCounts } = await sb
    .from("product_serials")
    .select("variant_id")
    .not("variant_id", "is", null)
    .in("status", ["available", "returned", "cancelled"]);

  const vMap: Record<string, number> = {};
  for (const row of variantCounts ?? []) {
    if (row.variant_id) {
      vMap[row.variant_id] = (vMap[row.variant_id] || 0) + 1;
    }
  }

  // 2. Fetch sellable serial counts grouped by product
  const { data: prodCounts } = await sb
    .from("product_serials")
    .select("product_id")
    .not("product_id", "is", null)
    .in("status", ["available", "returned", "cancelled"]);

  const pMap: Record<string, number> = {};
  for (const row of prodCounts ?? []) {
    if (row.product_id) {
      pMap[row.product_id] = (pMap[row.product_id] || 0) + 1;
    }
  }

  // 3. Update variant stock counts
  const { data: allVariants } = await sb.from("product_variants").select("id, stock_quantity");
  for (const v of allVariants ?? []) {
    const target = vMap[v.id] ?? 0;
    if (v.stock_quantity !== target) {
      await sb.from("product_variants").update({ stock_quantity: target }).eq("id", v.id);
    }
  }

  // 4. Update product stock counts
  const { data: allProducts } = await sb.from("products").select("id, stock_quantity");
  for (const p of allProducts ?? []) {
    const target = pMap[p.id] ?? 0;
    if (p.stock_quantity !== target) {
      await sb.from("products").update({ stock_quantity: target }).eq("id", p.id);
    }
  }
}

export const syncStockFromSerials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    await runTwoWayStockSync(context.supabase);
    return { ok: true };
  });

export const listSerials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      productId?: string;
      variantId?: string;
      status?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }) =>
      z
        .object({
          productId: z.string().uuid().optional(),
          variantId: z.string().uuid().optional(),
          status: z.string().optional(),
          search: z.string().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const sb = context.supabase as any;
    let query = sb
      .from("product_serials")
      .select(
        "id, serial_code, status, product_id, variant_id, sold_order_id, sold_at, print_count, last_printed_at, created_at, products(id, name, sku), product_variants(id, size, color, sku), orders:sold_order_id(id, order_number, customer_name, guest_name, total, status)",
      )
      .order("created_at", { ascending: false });

    if (data.productId) query = query.eq("product_id", data.productId);
    if (data.variantId) query = query.eq("variant_id", data.variantId);
    if (data.status && data.status !== "all") query = query.eq("status", data.status);
    if (data.search?.trim()) {
      query = query.ilike("serial_code", `%${data.search.trim()}%`);
    }
    const limit = data.limit ?? 100;
    const offset = data.offset ?? 0;
    query = query.range(offset, offset + limit - 1);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const lookupSerial = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string }) => z.object({ code: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const sb = context.supabase as any;
    const candidates = extractSerialCandidates(data.code);
    if (candidates.length === 0) return null;

    // Strategy 1: Direct case-insensitive match on product_serials
    for (const cand of candidates) {
      const { data: serialRow } = await sb
        .from("product_serials")
        .select(
          "id, serial_code, status, product_id, variant_id, sold_order_id, sold_at, products(name, sku, price, compare_at_price, thumbnail), product_variants(size, color, sku)",
        )
        .ilike("serial_code", cand)
        .limit(1)
        .maybeSingle();

      if (serialRow) {
        return serialRow;
      }
    }

    // Strategy 2: Fuzzy / substring match for serial numbers
    for (const cand of candidates) {
      if (cand.length >= 4 && /\d{2,}/.test(cand)) {
        const { data: fuzzySerial } = await sb
          .from("product_serials")
          .select(
            "id, serial_code, status, product_id, variant_id, sold_order_id, sold_at, products(name, sku, price, compare_at_price, thumbnail), product_variants(size, color, sku)",
          )
          .ilike("serial_code", `%${cand}%`)
          .limit(1)
          .maybeSingle();

        if (fuzzySerial) {
          return fuzzySerial;
        }
      }
    }

    // Strategy 3: Try variant SKU or ID (safe query without non-existent barcode column)
    for (const cand of candidates) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cand);
      let variantQuery = sb
        .from("product_variants")
        .select(
          "id, product_id, size, color, sku, products(name, sku, price, compare_at_price, thumbnail)",
        );

      if (isUuid) {
        variantQuery = variantQuery.or(`id.eq.${cand},sku.ilike.${cand}`);
      } else {
        variantQuery = variantQuery.ilike("sku", cand);
      }

      const { data: variantRow } = await variantQuery.limit(1).maybeSingle();

      if (variantRow) {
        const { data: availableSerial } = await sb
          .from("product_serials")
          .select(
            "id, serial_code, status, product_id, variant_id, sold_order_id, sold_at, products(name, sku, price, compare_at_price, thumbnail), product_variants(size, color, sku)",
          )
          .eq("variant_id", variantRow.id)
          .eq("status", "available")
          .limit(1)
          .maybeSingle();

        if (availableSerial) {
          return availableSerial;
        }

        return {
          id: variantRow.id,
          serial_code: variantRow.sku || cand,
          status: "available",
          product_id: variantRow.product_id,
          variant_id: variantRow.id,
          sold_order_id: null,
          sold_at: null,
          products: variantRow.products,
          product_variants: {
            size: variantRow.size,
            color: variantRow.color,
            sku: variantRow.sku,
          },
        };
      }
    }

    // Strategy 4: Try product SKU, slug, or ID
    for (const cand of candidates) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cand);
      let prodQuery = sb
        .from("products")
        .select("id, name, sku, slug, price, compare_at_price, thumbnail");

      if (isUuid) {
        prodQuery = prodQuery.or(`id.eq.${cand},sku.ilike.${cand}`);
      } else {
        prodQuery = prodQuery.or(`sku.ilike.${cand},slug.ilike.${cand},name.ilike.%${cand}%`);
      }

      const { data: productRow } = await prodQuery.limit(1).maybeSingle();

      if (productRow) {
        const { data: availableSerial } = await sb
          .from("product_serials")
          .select(
            "id, serial_code, status, product_id, variant_id, sold_order_id, sold_at, products(name, sku, price, compare_at_price, thumbnail), product_variants(size, color, sku)",
          )
          .eq("product_id", productRow.id)
          .eq("status", "available")
          .limit(1)
          .maybeSingle();

        if (availableSerial) {
          return availableSerial;
        }

        return {
          id: productRow.id,
          serial_code: productRow.sku || cand,
          status: "available",
          product_id: productRow.id,
          variant_id: null,
          sold_order_id: null,
          sold_at: null,
          products: {
            name: productRow.name,
            sku: productRow.sku,
            price: Number(productRow.price || 0),
            compare_at_price: productRow.compare_at_price ? Number(productRow.compare_at_price) : null,
            thumbnail: productRow.thumbnail,
          },
          product_variants: null,
        };
      }
    }

    return null;
  });

function nextSeq(existing: string[], prefix: string): number {
  let max = 0;
  const re = new RegExp("^" + prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "-(\\d+)$");
  for (const c of existing) {
    const m = c.match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

export const generateSerials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productId: string; variantId?: string | null; quantity: number }) =>
    z.object({ productId: z.string().uuid(), variantId: z.string().uuid().nullable().optional(), quantity: z.number().int().min(1).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    const sb: any = context.supabase;
    const { data: product, error: pe } = await sb.from("products").select("id, sku, name").eq("id", data.productId).maybeSingle();
    if (pe || !product) throw new Error("Product not found");

    let variantInfo: any = null;
    if (data.variantId) {
      const { data: variant } = await sb.from("product_variants").select("id, product_id, sku, size, color").eq("id", data.variantId).maybeSingle();
      if (!variant || variant.product_id !== data.productId) throw new Error("That variant doesn't belong to this product");
      variantInfo = variant;
    }

    // Option 1: Segmented Compact Code (e.g. TS01BL-001)
    const prefix = buildCompactSerialPrefix(product.sku || product.name || "PRD", variantInfo);

    const { data: existing } = await sb.from("product_serials").select("serial_code").ilike("serial_code", `${prefix}-%`);
    let seq = getNextCompactSequence((existing ?? []).map((r: any) => r.serial_code), prefix);

    const toInsert = Array.from({ length: data.quantity }, () => ({
      product_id: data.productId,
      variant_id: data.variantId ?? null,
      serial_code: formatCompactSerialCode(prefix, seq++),
      status: "available" as const,
      created_by: context.userId,
    }));
    const { data: inserted, error } = await sb.from("product_serials").insert(toInsert).select("serial_code");
    if (error) throw new Error(error.message);
    await runTwoWayStockSync(sb);
    return { created: inserted?.length ?? 0, codes: (inserted ?? []).map((r: any) => r.serial_code) };
  });

export const reconcileProductSerialsFromStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    productId: string;
    stockItems: Array<{ variantId?: string | null; stock: number; sku?: string | null }>;
  }) =>
    z.object({
      productId: z.string(),
      stockItems: z.array(
        z.object({
          variantId: z.any().optional().transform((v) => (v && typeof v === "string" && v.trim() ? v.trim() : null)),
          stock: z.coerce.number().int().min(0).max(50000),
          sku: z.any().optional().transform((s) => (s && typeof s === "string" && s.trim() ? s.trim() : null)),
        })
      ),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    const sb: any = context.supabase;
    const { productId, stockItems } = data;

    const { data: product } = await sb.from("products").select("id, sku, name").eq("id", productId).maybeSingle();
    if (!product) throw new Error("Product not found");

    const { data: settings } = await sb.from("sticker_settings").select("serial_prefix").limit(1).maybeSingle();
    const brandPrefix = (settings?.serial_prefix ?? "ORZ").toUpperCase();

    let totalGenerated = 0;
    let totalRemoved = 0;

    for (const item of stockItems) {
      const variantId = item.variantId || null;
      const targetStock = item.stock;

      let q = sb
        .from("product_serials")
        .select("id, serial_code, print_count")
        .eq("product_id", productId)
        .eq("status", "available");

      if (variantId) {
        q = q.eq("variant_id", variantId);
      } else {
        q = q.is("variant_id", null);
      }

      const { data: availableSerials = [] } = await q;
      const currentCount = availableSerials.length;

      if (targetStock > currentCount) {
        const missing = targetStock - currentCount;
        let variantInfo: any = null;
        if (variantId) {
          const { data: vRow } = await sb.from("product_variants").select("id, sku, size, color").eq("id", variantId).maybeSingle();
          variantInfo = vRow;
        }

        // Option 1: Segmented Compact Code (e.g. TS01BL-001)
        const prefix = buildCompactSerialPrefix(product.sku || product.name || "PRD", item.sku || variantInfo);

        const { data: existing } = await sb
          .from("product_serials")
          .select("serial_code")
          .ilike("serial_code", `${prefix}-%`);
        let seq = getNextCompactSequence((existing ?? []).map((r: any) => r.serial_code), prefix);

        const toInsert = Array.from({ length: missing }, () => ({
          product_id: productId,
          variant_id: variantId,
          serial_code: formatCompactSerialCode(prefix, seq++),
          status: "available" as const,
          created_by: context.userId,
        }));

        if (toInsert.length > 0) {
          const { error: insErr } = await sb.from("product_serials").insert(toInsert);
          if (!insErr) totalGenerated += toInsert.length;
        }
      } else if (targetStock < currentCount) {
        const excess = currentCount - targetStock;
        const sorted = [...availableSerials].sort((a, b) => (a.print_count || 0) - (b.print_count || 0));
        const toDeleteIds = sorted.slice(0, excess).map((s: any) => s.id);
        if (toDeleteIds.length > 0) {
          const { error: delErr } = await sb.from("product_serials").delete().in("id", toDeleteIds);
          if (!delErr) totalRemoved += toDeleteIds.length;
        }
      }
    }

    await runTwoWayStockSync(sb);
    return { generated: totalGenerated, removed: totalRemoved };
  });

export const importSerials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productId: string; variantId?: string | null; codes: string[] }) =>
    z.object({ productId: z.string().uuid(), variantId: z.string().uuid().nullable().optional(), codes: z.array(z.string().min(3).max(64)).min(1).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    const sb: any = context.supabase;
    if (data.variantId) {
      const { data: variant } = await sb.from("product_variants").select("id, product_id").eq("id", data.variantId).maybeSingle();
      if (!variant || variant.product_id !== data.productId) throw new Error("That variant doesn't belong to this product");
    }
    const codes = [...new Set(data.codes.map((c) => c.trim()).filter(Boolean))];
    const rows = codes.map((c) => ({
      product_id: data.productId,
      variant_id: data.variantId ?? null,
      serial_code: c,
      status: "available" as const,
      created_by: context.userId,
    }));
    const { data: inserted, error } = await (context.supabase as any)
      .from("product_serials")
      .insert(rows)
      .select("serial_code");
    if (error) throw new Error(error.message);
    await runTwoWayStockSync(sb);
    return { created: inserted?.length ?? 0 };
  });

export const manualAddSerial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productId: string; variantId?: string | null; serialCode: string; status?: string }) =>
    z.object({
      productId: z.string().uuid(),
      variantId: z.string().uuid().nullable().optional(),
      serialCode: z.string().trim().min(2).max(64),
      status: SerialStatus.default("available"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    const sb: any = context.supabase;
    if (data.variantId) {
      const { data: variant } = await sb.from("product_variants").select("id, product_id").eq("id", data.variantId).maybeSingle();
      if (!variant || variant.product_id !== data.productId) throw new Error("That variant doesn't belong to this product");
    }
    const { data: row, error } = await sb
      .from("product_serials")
      .insert({
        product_id: data.productId,
        variant_id: data.variantId ?? null,
        serial_code: data.serialCode,
        status: data.status,
        created_by: context.userId,
      })
      .select("id, serial_code")
      .maybeSingle();
    if (error) throw new Error(error.message.includes("duplicate") ? `Serial "${data.serialCode}" already exists.` : error.message);
    await runTwoWayStockSync(sb);
    return row;
  });

export const markSerialsPrinted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { codes: string[] }) => z.object({ codes: z.array(z.string()).min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const sb: any = context.supabase;
    const { data: rows } = await sb.from("product_serials").select("id, serial_code, print_count").in("serial_code", data.codes);
    for (const r of rows ?? []) {
      await sb.from("product_serials").update({ print_count: (r.print_count ?? 0) + 1, last_printed_at: new Date().toISOString() }).eq("id", r.id);
    }
    return { updated: rows?.length ?? 0 };
  });

export const scanSerial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string; action: "sell" | "cancel" | "return" | "defective"; orderId?: string | null }) =>
    z.object({
      code: z.string().min(1),
      action: z.enum(["sell", "cancel", "return", "defective"]),
      orderId: z.string().uuid().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    const sb: any = context.supabase;
    const candidates = extractSerialCandidates(data.code);

    let row: any = null;
    for (const cand of candidates) {
      const { data: found } = await sb
        .from("product_serials")
        .select("id, status, serial_code")
        .ilike("serial_code", cand)
        .limit(1)
        .maybeSingle();

      if (found) {
        row = found;
        break;
      }
    }

    // Fuzzy serial fallback if not found directly
    if (!row) {
      for (const cand of candidates) {
        if (cand.length >= 4 && /\d{2,}/.test(cand)) {
          const { data: found } = await sb
            .from("product_serials")
            .select("id, status, serial_code")
            .ilike("serial_code", `%${cand}%`)
            .limit(1)
            .maybeSingle();

          if (found) {
            row = found;
            break;
          }
        }
      }
    }

    if (!row) throw new Error(`Serial not found for code "${data.code}"`);

    const update: Record<string, any> = { updated_at: new Date().toISOString() };
    if (data.action === "sell") {
      const isAvailableForSale = row.status === "available" || row.status === "cancelled" || (row.status === "returned" && !(row as any).is_defective);
      if (!isAvailableForSale) throw new Error(`Cannot sell: current status is ${row.status}`);
      update.status = "sold";
      update.sold_order_id = data.orderId ?? null;
      update.sold_at = new Date().toISOString();
    } else if (data.action === "cancel") {
      update.status = "cancelled";
      update.sold_order_id = null;
    } else if (data.action === "return") {
      update.status = "returned";
      update.sold_order_id = null;
    } else if (data.action === "defective") {
      update.status = "returned";
      (update as any).is_defective = true;
      update.sold_order_id = null;
    }

    const { data: updated, error: ue } = await sb.from("product_serials").update(update).eq("id", row.id).select("id, status, serial_code").maybeSingle();
    if (ue) throw new Error(ue.message);
    await runTwoWayStockSync(sb);
    return updated;
  });

export const deleteSerial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    const { error } = await (context.supabase as any).from("product_serials").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await runTwoWayStockSync(context.supabase);
    return { ok: true };
  });

export const getStickerSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind?: string } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const sb: any = context.supabase;
    const kind = data.kind ?? "product_serial";
    const { data: active } = await sb.from("sticker_settings").select("*").eq("is_active", true).eq("sticker_kind", kind).limit(1).maybeSingle();
    if (active) return active;
    const { data: fallback } = await sb.from("sticker_settings").select("*").eq("sticker_kind", kind).order("created_at", { ascending: true }).limit(1).maybeSingle();
    return fallback;
  });

export const listStickerPresets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind?: string } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const kind = data.kind ?? "product_serial";
    const { data: rows, error } = await (context.supabase as any)
      .from("sticker_settings")
      .select("*")
      .eq("sticker_kind", kind)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const updateStickerSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, any>) => d)
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    const sb: any = context.supabase;
    const patch = { ...data };
    const id = patch.id;
    delete patch.id;
    delete patch.created_at;
    delete patch.updated_at;
    if (id) {
      const { data: row, error } = await sb.from("sticker_settings").update(patch).eq("id", id).select().maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await sb.from("sticker_settings").insert(patch).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const createStickerPreset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; copy_from_id?: string | null; kind?: string }) =>
    z.object({ name: z.string().min(1).max(80), copy_from_id: z.string().uuid().nullable().optional(), kind: z.string().default("product_serial") }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    const sb: any = context.supabase;
    let base: any = {};
    const sourceId = data.copy_from_id
      ?? (await sb.from("sticker_settings").select("id").eq("is_active", true).eq("sticker_kind", data.kind).limit(1).maybeSingle()).data?.id;
    if (sourceId) {
      const { data: src } = await sb.from("sticker_settings").select("*").eq("id", sourceId).maybeSingle();
      if (src) {
        base = { ...src };
        delete base.id; delete base.created_at; delete base.updated_at;
      }
    }
    base.name = data.name;
    base.sticker_kind = data.kind;
    base.is_active = false;
    const { data: row, error } = await sb.from("sticker_settings").insert(base).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const activateStickerPreset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    const sb: any = context.supabase;
    const { data: target } = await sb.from("sticker_settings").select("sticker_kind").eq("id", data.id).maybeSingle();
    // Only presets of the SAME kind share an "active" slot — activating an
    // order sticker must not silently deactivate the active product-serial
    // sticker (and vice versa); they're printed by entirely different flows.
    await sb.from("sticker_settings").update({ is_active: false }).eq("is_active", true).eq("sticker_kind", target?.sticker_kind ?? "product_serial");
    const { data: row, error } = await sb.from("sticker_settings").update({ is_active: true }).eq("id", data.id).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteStickerPreset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    const sb: any = context.supabase;
    const { data: row } = await sb.from("sticker_settings").select("is_active").eq("id", data.id).maybeSingle();
    if (row?.is_active) throw new Error("Cannot delete the active preset. Activate another preset first.");
    const { error } = await sb.from("sticker_settings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const duplicateStickerPreset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; name?: string }) =>
    z.object({ id: z.string().uuid(), name: z.string().min(1).max(80).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    const sb: any = context.supabase;
    const { data: src, error } = await sb.from("sticker_settings").select("*").eq("id", data.id).maybeSingle();
    if (error || !src) throw new Error(error?.message ?? "Preset not found");
    const base: any = { ...src };
    delete base.id; delete base.created_at; delete base.updated_at;
    base.name = data.name ?? `${src.name ?? "Preset"} (copy)`;
    base.is_active = false;
    const { data: row, error: ie } = await sb.from("sticker_settings").insert(base).select().maybeSingle();
    if (ie) throw new Error(ie.message);
    return row;
  });

export const importStickerPresets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { presets: any[] }) =>
    z.object({ presets: z.array(z.record(z.string(), z.any())).min(1).max(50) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    const sb: any = context.supabase;
    const rows = data.presets.map((p) => {
      const clean: any = { ...p };
      delete clean.id; delete clean.created_at; delete clean.updated_at;
      clean.is_active = false;
      clean.name = clean.name ?? "Imported preset";
      return clean;
    });
    const { data: inserted, error } = await sb.from("sticker_settings").insert(rows).select();
    if (error) throw new Error(error.message);
    return { created: inserted?.length ?? 0 };
  });

export const migrateAllExistingSerialsToCompact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    const sb: any = context.supabase;

    // 1. Fetch all product serials joined with product and variant details
    const { data: allSerials, error } = await sb
      .from("product_serials")
      .select(`
        id, serial_code, product_id, variant_id, created_at,
        products ( id, sku, name ),
        product_variants ( id, sku, size, color )
      `)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    if (!allSerials || allSerials.length === 0) {
      return { total: 0, updated: 0, message: "No serials found to migrate" };
    }

    // 2. Group serials by (product_id, variant_id) to assign clean sequence numbers starting from 1
    const groups = new Map<string, any[]>();
    for (const s of allSerials) {
      const key = `${s.product_id}::${s.variant_id ?? "simple"}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }

    let updatedCount = 0;
    const updates: { id: string; serial_code: string }[] = [];

    for (const [_, serialList] of groups) {
      if (serialList.length === 0) continue;
      const first = serialList[0];
      const productSkuOrName = first.products?.sku || first.products?.name || "PRD";
      const variantInfo = first.product_variants || null;

      const prefix = buildCompactSerialPrefix(productSkuOrName, variantInfo);
      let seq = 1;

      for (const item of serialList) {
        const compactCode = formatCompactSerialCode(prefix, seq++);
        if (item.serial_code !== compactCode) {
          updates.push({ id: item.id, serial_code: compactCode });
        }
      }
    }

    // 3. Batch update the serials
    for (const u of updates) {
      const { error: updErr } = await sb
        .from("product_serials")
        .update({ serial_code: u.serial_code, updated_at: new Date().toISOString() })
        .eq("id", u.id);
      if (!updErr) updatedCount++;
    }

    // 4. Run two-way stock synchronization to ensure quantities match
    await runTwoWayStockSync(sb);

    return {
      total: allSerials.length,
      updated: updatedCount,
      message: `Successfully migrated ${updatedCount} serials to the compact format!`,
    };
  });
