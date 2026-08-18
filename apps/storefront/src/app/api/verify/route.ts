import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { extractSerialCode } from "@orizino/shared";

function getSupabaseClient() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/[\r\n"'\s]/g, "");
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  ).replace(/[\r\n"'\s]/g, "");

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawCode =
      searchParams.get("code") ||
      searchParams.get("sn") ||
      searchParams.get("serial") ||
      searchParams.get("c") ||
      searchParams.get("order") ||
      "";

    if (!rawCode.trim()) {
      return NextResponse.json({ found: false, genuine: false, serial_code: "" }, { status: 400 });
    }

    const cleanCode = extractSerialCode(rawCode);
    const sb = getSupabaseClient();

    // 1. Execute SQL RPC function first (handles RLS bypass safely via SECURITY DEFINER)
    const { data: rpcData, error: rpcError } = await sb.rpc("verify_public_serial", {
      lookup_code: cleanCode || rawCode.trim(),
    });

    if (!rpcError && rpcData && rpcData.found) {
      return NextResponse.json(rpcData, {
        status: 200,
        headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
      });
    }

    // 2. Direct fallback query with joins
    const selectFields = "serial_code, status, sold_at, sold_order_id, products(name, slug, thumbnail, images, categories(name))";
    const { data: directData } = await sb
      .from("product_serials")
      .select(selectFields)
      .eq("serial_code", cleanCode)
      .maybeSingle();

    if (directData) {
      const row: any = directData;
      const res = {
        found: true,
        genuine: true,
        is_sample: false,
        serial_code: row.serial_code,
        status: row.status,
        product: row.products
          ? {
              name: row.products.name,
              slug: row.products.slug,
              thumbnail: row.products.thumbnail,
              images: row.products.images,
              category: row.products?.categories?.name || null,
            }
          : undefined,
        sold: row.status === "sold"
          ? {
              sold_at_masked: row.sold_at
                ? new Date(row.sold_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })
                : "Recorded at Store",
              buyer_masked: "Valued Client",
              is_owner: false,
            }
          : undefined,
      };

      return NextResponse.json(res, { status: 200 });
    }

    return NextResponse.json(
      rpcData || { found: false, genuine: false, serial_code: cleanCode },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[/api/verify] Error:", err);
    return NextResponse.json({ found: false, genuine: false, error: err?.message || "Verification failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawCode = body?.code || body?.serial || body?.data?.code || "";

    if (!rawCode.trim()) {
      return NextResponse.json({ found: false, genuine: false, serial_code: "" }, { status: 400 });
    }

    const cleanCode = extractSerialCode(rawCode);
    const sb = getSupabaseClient();

    const { data: rpcData, error: rpcError } = await sb.rpc("verify_public_serial", {
      lookup_code: cleanCode || rawCode.trim(),
    });

    if (!rpcError && rpcData && rpcData.found) {
      return NextResponse.json(rpcData, { status: 200 });
    }

    return NextResponse.json(
      rpcData || { found: false, genuine: false, serial_code: cleanCode },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[/api/verify POST] Error:", err);
    return NextResponse.json({ found: false, genuine: false, error: err?.message || "Verification failed" }, { status: 500 });
  }
}
