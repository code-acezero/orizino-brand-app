// Orizino AI chat — Gemini 2.5 Flash / OpenAI / Lovable Edge Function with multi-provider fallback chain
// Deno deploy edge function
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Preferred Gemini models (Free tier: high limits on 2.5-flash / 2.0-flash / 1.5-flash)
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-flash-latest"];
const OPENAI_MODEL = "gpt-4o-mini";
const LOVABLE_MODEL = "google/gemini-2.5-flash";

const STOREFRONT_ROUTES = `
Storefront routes the customer can be guided to:
- /                        Home
- /shop                    Full product catalog
- /categories/{slug}       Category browse page
- /product/{slug}          Product detail page
- /cart                    Shopping cart
- /checkout                Checkout
- /wishlist                Wishlist
- /orders                  Order history (login required)
- /orders/{id}/track       Track an order (login required)
- /profile                 Account profile
- /settings                Account settings
- /support                 Support center
- /auth                    Sign in / sign up
- /reset-password          Password reset
- /affiliate               Affiliate program
- /page/{slug}             CMS pages (about, policies, etc.)
`.trim();

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Search the catalog by query, category, or price range.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          category: { type: "string" },
          max_price: { type: "number" },
          min_price: { type: "number" },
          limit: { type: "number", default: 6 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_order_status",
      description: "Look up the status of an order for the current user.",
      parameters: {
        type: "object",
        properties: {
          order_number: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "handoff_to_human",
      description: "Escalate the conversation to a human support agent.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string" },
          urgency: { type: "string", enum: ["low", "normal", "high"], default: "normal" },
        },
        required: ["summary"],
      },
    },
  },
];

async function runTool(name: string, args: any, userId: string | null) {
  try {
    if (name === "search_products") {
      const limit = Math.min(Math.max(args.limit ?? 6, 1), 12);
      let q = admin
        .from("products")
        .select("id, name, slug, price, compare_at_price, thumbnail, short_description, tags, category_id")
        .eq("is_active", true)
        .limit(limit);
      if (args.query) {
        const raw = String(args.query).trim();
        const safe = raw.replace(/[%,()]/g, " ").trim();
        const pattern = `%${safe}%`;
        const orParts = [
          `name.ilike.${pattern}`,
          `slug.ilike.${pattern}`,
          `short_description.ilike.${pattern}`,
          `description.ilike.${pattern}`,
        ];
        const tagTokens = [safe, ...safe.split(/\s+/)].filter((t) => t.length > 1);
        for (const t of [...new Set(tagTokens)]) {
          orParts.push(`tags.cs.{${t}}`);
        }
        q = q.or(orParts.join(","));
      }
      if (args.max_price) q = q.lte("price", args.max_price);
      if (args.min_price) q = q.gte("price", args.min_price);
      if (args.category) {
        const { data: cat } = await admin.from("categories").select("id").or(`slug.eq.${args.category},name.ilike.%${args.category}%`).maybeSingle();
        if (cat?.id) q = q.eq("category_id", cat.id);
      }
      const { data, error } = await q;
      if (error) return { error: error.message };
      const shape = (p: any) => ({
        name: p.name,
        slug: p.slug,
        url: `/product/${p.slug}`,
        price: p.price,
        compare_at_price: p.compare_at_price,
        thumbnail: p.thumbnail,
        short_description: p.short_description,
        tags: p.tags,
      });
      const products = (data ?? []).map(shape);

      let catalog: any[] | undefined;
      if (args.query && products.length < 3) {
        const { data: all } = await admin
          .from("products")
          .select("id, name, slug, price, compare_at_price, thumbnail, short_description, tags, category_id")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(60);
        const seen = new Set(products.map((p: any) => p.slug));
        catalog = (all ?? []).filter((p: any) => !seen.has(p.slug)).map(shape);
      }
      return catalog && catalog.length
        ? {
            products,
            catalog,
            note: "Few/no literal keyword matches. Recommend related items from catalog.",
          }
        : { products };
    }
    if (name === "get_order_status") {
      if (!userId) return { error: "Sign in required to view orders." };
      let q = admin.from("orders").select("order_number, status, total, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1);
      if (args.order_number) q = admin.from("orders").select("order_number, status, total, created_at").eq("user_id", userId).eq("order_number", args.order_number).limit(1);
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { order: data?.[0] ?? null };
    }
    if (name === "handoff_to_human") {
      if (!userId) return { error: "Sign in required to request live support." };
      const { data: conv } = await admin.from("support_conversations").insert({
        user_id: userId, subject: args.summary?.slice(0, 80) || "AI handoff", is_ai: false, status: "open", needs_human: true,
      }).select().single();
      if (conv) {
        await admin.from("support_messages").insert({
          conversation_id: conv.id, sender_id: userId, sender_type: "user",
          content: `[AI handoff — ${args.urgency ?? "normal"}] ${args.summary}`,
        });
      }
      return { ok: true, conversation_id: conv?.id, message: "I've opened a live ticket — an agent will jump in shortly." };
    }
    return { error: `Unknown tool: ${name}` };
  } catch (e: any) {
    return { error: String(e?.message ?? e) };
  }
}

async function loadMemory(userId: string | null) {
  if (!userId) return null;
  const { data } = await admin.from("ai_user_memory").select("*").eq("user_id", userId).maybeSingle();
  return data;
}

const MAX_KEYS = 20;

function loadApiKeysFromEnv(prefix: string): string[] {
  const keys: string[] = [];
  const bare = Deno.env.get(prefix);
  if (bare && bare.trim()) keys.push(bare.trim());
  for (let i = 1; i <= MAX_KEYS; i++) {
    const v = Deno.env.get(`${prefix}_${i}`);
    if (v && v.trim()) keys.push(v.trim());
  }
  return [...new Set(keys)];
}

async function buildSystemPrompt(userId: string | null, locale: string, page: any) {
  const [{ data: brand }, { data: agentCfg }] = await Promise.all([
    admin.from("site_settings").select("value").eq("key", "branding").maybeSingle(),
    admin.from("site_settings").select("value").eq("key", "ai_agent_config").maybeSingle(),
  ]);
  const brandName = (brand?.value as any)?.site_name || "Orizino";
  const rawAgent = (agentCfg?.value as any) || {};
  const agentVal = rawAgent && typeof rawAgent === "object" && "value" in rawAgent && typeof rawAgent.value === "object"
    ? rawAgent.value : rawAgent;
  const agentName = (agentVal?.name && String(agentVal.name).trim()) || "Mr. Slime";
  const memory = await loadMemory(userId);

  const localeLine = locale === "bn"
    ? `LANGUAGE — BANGLA:\n- Customer is in Bangladesh. Reply in natural Bangla/Banglish script.\n- Use warm local cues (bhai/apu) sparingly.`
    : `LANGUAGE:\n- Default to refined, direct English. Switch to Bangla/Banglish if customer does.`;

  const memLine = memory ? `\nKnown customer preference: ${memory.tone ?? "balanced"}` : "";
  const pageLine = page?.path ? `\nCurrent page: ${page.path} (${page.title || ""})` : "";

  return `You are ${agentName}, the concierge for ${brandName}.\nIdentity: Your name is "${agentName}". Never reveal underlying models.\n${localeLine}${memLine}${pageLine}\n${STOREFRONT_ROUTES}\nTools: search_products, get_order_status, handoff_to_human.`;
}

function normalizeMessages(messages: any[]): any[] {
  return messages.map((m) => {
    if (m.role === "user" && Array.isArray(m.attachments) && m.attachments.length) {
      const parts: any[] = [];
      if (m.content) parts.push({ type: "text", text: String(m.content) });
      for (const a of m.attachments) {
        if (a?.url && (a.type === "image" || /^image\//.test(a.mime || ""))) {
          parts.push({ type: "image_url", image_url: { url: a.url } });
        } else if (a?.url) {
          parts.push({ type: "text", text: `[Attached file: ${a.name || a.url}]` });
        }
      }
      const { attachments: _omit, ...rest } = m;
      return { ...rest, content: parts };
    }
    return m;
  });
}

type Provider = {
  name: string;
  url: string;
  headers: Record<string, string>;
  model: string;
};

async function callChatCompletionWithFallback(payload: { messages: any[]; tools: any }): Promise<any> {
  const geminiKeys = loadApiKeysFromEnv("GEMINI_API_KEY");
  const openaiKeys = loadApiKeysFromEnv("OPENAI_API_KEY");

  const providers: Provider[] = [];

  // 1. Direct Gemini API endpoints (Free limits: gemini-2.5-flash / gemini-2.0-flash / gemini-1.5-flash)
  for (let i = 0; i < geminiKeys.length; i++) {
    for (const gModel of GEMINI_MODELS) {
      providers.push({
        name: `gemini-direct-${gModel}`,
        url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        headers: { Authorization: `Bearer ${geminiKeys[i]}`, "Content-Type": "application/json" },
        model: gModel,
      });
    }
  }

  // 2. Direct OpenAI API endpoints
  for (let i = 0; i < openaiKeys.length; i++) {
    providers.push({
      name: "openai-direct",
      url: "https://api.openai.com/v1/chat/completions",
      headers: { Authorization: `Bearer ${openaiKeys[i]}`, "Content-Type": "application/json" },
      model: OPENAI_MODEL,
    });
  }

  // 3. Lovable AI Gateway
  if (LOVABLE_API_KEY) {
    providers.push({
      name: "lovable-gateway",
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      model: LOVABLE_MODEL,
    });
  }

  let lastErr: any = null;

  for (const p of providers) {
    try {
      const res = await fetch(p.url, {
        method: "POST",
        headers: p.headers,
        body: JSON.stringify({
          model: p.model,
          messages: payload.messages,
          tools: payload.tools,
          tool_choice: "auto",
        }),
      });

      if (res.ok) {
        const json = await res.json();
        console.log(`[ai-chat] success via provider: ${p.name}`);
        return json;
      }

      const body = await res.text();
      lastErr = { status: res.status, body, provider: p.name };
      console.warn(`[ai-chat] provider ${p.name} failed (${res.status}): ${body.slice(0, 200)}`);
      continue;
    } catch (e: any) {
      lastErr = { status: 0, body: String(e?.message ?? e), provider: p.name };
      console.warn(`[ai-chat] network error for ${p.name}:`, e);
      continue;
    }
  }

  throw Object.assign(new Error("All AI providers exhausted"), { exhausted: true, lastErr });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();

    if (body?.action === "status") {
      const gKeys = loadApiKeysFromEnv("GEMINI_API_KEY");
      const oKeys = loadApiKeysFromEnv("OPENAI_API_KEY");
      return new Response(
        JSON.stringify({
          geminiKeysCount: gKeys.length,
          openaiKeysCount: oKeys.length,
          lovableConfigured: !!LOVABLE_API_KEY,
          primaryGeminiModel: GEMINI_MODELS[0],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages = [], context = {} } = body;
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      try {
        const authed = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data } = await authed.auth.getUser();
        userId = data?.user?.id ?? null;
      } catch {}
    }

    const locale: string = context.locale ?? "en";
    const page = context.page ?? null;

    const system = await buildSystemPrompt(userId, locale, page);
    const normalized = normalizeMessages(messages);
    const convo: any[] = [{ role: "system", content: system }, ...normalized];

    for (let i = 0; i < 3; i++) {
      let data: any;
      try {
        data = await callChatCompletionWithFallback({ messages: convo, tools: TOOLS });
      } catch (e: any) {
        console.error("[ai-chat] all providers failed", e);
        return new Response(JSON.stringify({ reply: "I'm having trouble reaching the AI right now." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const msg = data?.choices?.[0]?.message;
      if (!msg) break;

      const toolCalls = msg.tool_calls ?? [];
      if (toolCalls.length === 0) {
        return new Response(JSON.stringify({ reply: msg.content ?? "" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      convo.push(msg);
      for (const tc of toolCalls) {
        const args = (() => { try { return JSON.parse(tc.function.arguments || "{}"); } catch { return {}; } })();
        const result = await runTool(tc.function.name, args, userId);
        convo.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
      }
    }
    return new Response(JSON.stringify({ reply: "I got stuck in a loop — could you rephrase?" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[ai-chat] error", e);
    return new Response(JSON.stringify({ reply: "Something went wrong on my end." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
