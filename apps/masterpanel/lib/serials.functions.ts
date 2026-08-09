import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SerialStatus = z.enum(["available", "sold", "cancelled", "returned", "defective"]);

async function assertStaff(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_section_access", { _user_id: userId, _section: "sales" });
  if (!data) throw new Error("Forbidden");
}

async function assertAdminOrMod(supabase: any, userId: string) {
  const { data: a } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" as any });
  if (a) return;
  const { data: m } = await supabase.rpc("has_role", { _user_id: userId, _role: "moderator" as any });
  if (!m) throw new Error("Forbidden: admin/moderator only");
}

export const syncStockFromSerials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    const { data, error } = await context.supabase.rpc("sync_stock_from_serials");
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    return { variantsUpdated: row?.variants_updated ?? 0, productsUpdated: row?.products_updated ?? 0 };
  });

export const listSerials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productId?: string; productIds?: string[]; status?: string; search?: string; limit?: number } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    let q = (context.supabase as any)
      .from("product_serials")
      .select("id, serial_code, status, product_id, variant_id, sold_order_id, sold_at, created_at, updated_at, print_count, last_printed_at, products(name, sku, price, compare_at_price, sticker_preset_id), product_variants(size, color, sku)")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 500);
    if (data.productId) q = q.eq("product_id", data.productId);
    if (data.productIds?.length) q = q.in("product_id", data.productIds);
    if (data.status) q = q.eq("status", data.status);
    if (data.search) q = q.ilike("serial_code", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const lookupSerial = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string }) => z.object({ code: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { data: row, error } = await (context.supabase as any)
      .from("product_serials")
      .select("id, serial_code, status, product_id, variant_id, sold_order_id, sold_at, products(name, sku, price, compare_at_price, thumbnail), product_variants(size, color, sku)")
      .eq("serial_code", data.code)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
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
    if (data.variantId) {
      const { data: variant } = await sb.from("product_variants").select("id, product_id").eq("id", data.variantId).maybeSingle();
      if (!variant || variant.product_id !== data.productId) throw new Error("That variant doesn't belong to this product");
    }

    const { data: settings } = await sb.from("sticker_settings").select("serial_prefix").limit(1).maybeSingle();
    const brandPrefix = (settings?.serial_prefix ?? "ORZ").toUpperCase();
    const codePart = (product.sku || product.name || "PRD").toString().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "PRD";
    const prefix = `${brandPrefix}-${codePart}`;

    const { data: existing } = await sb.from("product_serials").select("serial_code").ilike("serial_code", `${prefix}-%`);
    let seq = nextSeq((existing ?? []).map((r: any) => r.serial_code), prefix);

    const toInsert = Array.from({ length: data.quantity }, () => ({
      product_id: data.productId,
      variant_id: data.variantId ?? null,
      serial_code: `${prefix}-${String(seq++).padStart(6, "0")}`,
      status: "available" as const,
      created_by: context.userId,
    }));
    const { data: inserted, error } = await sb.from("product_serials").insert(toInsert).select("serial_code");
    if (error) throw new Error(error.message);
    await sb.rpc("sync_stock_from_serials");
    return { created: inserted?.length ?? 0, codes: (inserted ?? []).map((r: any) => r.serial_code) };
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
    await sb.rpc("sync_stock_from_serials");
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
    await sb.rpc("sync_stock_from_serials");
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
    const { data: row, error } = await sb.from("product_serials").select("id, status").eq("serial_code", data.code).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Serial not found");

    const update: Record<string, any> = { updated_at: new Date().toISOString() };
    if (data.action === "sell") {
      if (row.status !== "available") throw new Error(`Cannot sell: current status is ${row.status}`);
      update.status = "sold";
      update.sold_order_id = data.orderId ?? null;
      update.sold_at = new Date().toISOString();
    } else if (data.action === "cancel") {
      if (row.status !== "sold") throw new Error("Only sold units can be cancelled");
      update.status = "cancelled";
    } else if (data.action === "return") {
      if (row.status !== "sold") throw new Error("Only sold units can be returned");
      update.status = "returned";
    } else if (data.action === "defective") {
      update.status = "defective";
    }

    const { data: updated, error: ue } = await sb.from("product_serials").update(update).eq("id", row.id).select("id, status, serial_code").maybeSingle();
    if (ue) throw new Error(ue.message);
    return updated;
  });

export const deleteSerial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId);
    const { error } = await (context.supabase as any).from("product_serials").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
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


