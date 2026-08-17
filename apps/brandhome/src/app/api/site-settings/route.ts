import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SENSITIVE_KEYS = new Set([
  "google_service_account",
  "pathao_credentials",
  "pathao_webhook_secret",
  "steadfast_webhook_secret",
  "gemini_fallback_config",
  "groq_fallback_config",
  "api_keys",
]);

function getAdminClient() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://oectjdngvrqnxwhnwfrt.supabase.co").replace(/[\r\n"'\s]/g, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lY3RqZG5ndnJxbnh3aG53ZnJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjg5MTM1NCwiZXhwIjoyMDg4NDY3MzU0fQ.tTGgSv0_6aSRjekzCFB7VlA0jC-vUn8FECt21PiDPwk").replace(/[\r\n"'\s]/g, "");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function unwrapVal(val: any): any {
  if (val === null || val === undefined) return val;
  if (typeof val === "object" && "value" in val && Object.keys(val).length === 1) {
    return unwrapVal(val.value);
  }
  return val;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getAdminClient();
    const url = new URL(req.url);
    const keysParam = url.searchParams.get("keys");
    const requestedKeys = keysParam ? keysParam.split(",").map((k) => k.trim()).filter(Boolean) : null;

    let query = supabase.from("site_settings").select("key, value");
    if (requestedKeys && requestedKeys.length > 0) {
      query = query.in("key", requestedKeys);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result: Record<string, any> = {};
    for (const item of data || []) {
      if (!SENSITIVE_KEYS.has(item.key)) {
        result[item.key] = unwrapVal(item.value);
      }
    }

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch site settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = getAdminClient();
    const itemsToUpsert: { key: string; value: any; updated_at: string }[] = [];

    if (Array.isArray(body.items)) {
      for (const it of body.items) {
        if (it && typeof it.key === "string") {
          itemsToUpsert.push({
            key: it.key,
            value: it.value,
            updated_at: new Date().toISOString(),
          });
        }
      }
    } else if (body && typeof body.key === "string") {
      itemsToUpsert.push({
        key: body.key,
        value: body.value,
        updated_at: new Date().toISOString(),
      });
    } else if (typeof body === "object" && body !== null) {
      for (const [k, v] of Object.entries(body)) {
        itemsToUpsert.push({
          key: k,
          value: v,
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (itemsToUpsert.length === 0) {
      return NextResponse.json({ error: "No settings provided" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("site_settings")
      .upsert(itemsToUpsert, { onConflict: "key" })
      .select("key");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: data?.length ?? itemsToUpsert.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update site settings" }, { status: 500 });
  }
}
