// Orizino AI chat — Gemini / Groq / OpenAI Edge Function with multi-provider fallback chain & MR. Slime Ultimate Intelligent Dynamic Concierge Engine
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

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
      description: "Search the catalog by query, category, or price range. Always returns product thumbnail images.",
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
      name: "get_product_details",
      description: "Get detailed fabric composition, GSM, exact measurements (Chest, Length, Sleeve for S/M/L/XL), gallery images, and live stock for a specific product.",
      parameters: {
        type: "object",
        properties: {
          slug_or_query: { type: "string", description: "Product slug or name" },
        },
        required: ["slug_or_query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_active_coupons",
      description: "Check active promotional discount codes and vouchers currently available in the store.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_size_recommendation",
      description: "Compute personalized size recommendation (S, M, L, XL) for Orizino 240+ GSM drop-shoulder streetwear based on height and weight.",
      parameters: {
        type: "object",
        properties: {
          height_feet: { type: "number", description: "Height feet (e.g. 5)" },
          height_inches: { type: "number", description: "Height inches (e.g. 8)" },
          weight_kg: { type: "number", description: "Weight in kg (e.g. 68)" },
          fit_preference: { type: "string", enum: ["fitted", "signature_drop", "boxy_streetwear"], default: "signature_drop" },
        },
        required: ["height_feet"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_order_status",
      description: "Look up the status and tracking details of an order for the current user.",
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
        .select("id, name, slug, price, compare_at_price, thumbnail, images, short_description, tags, stock_quantity, category_id")
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
        thumbnail: p.thumbnail || p.images?.[0] || "",
        short_description: p.short_description,
        stock_quantity: p.stock_quantity,
        tags: p.tags,
      });
      let products = (data ?? []).map(shape);

      if (products.length === 0) {
        const { data: all } = await admin
          .from("products")
          .select("id, name, slug, price, compare_at_price, thumbnail, images, short_description, tags, stock_quantity, category_id")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(6);
        products = (all ?? []).map(shape);
      }

      return {
        products,
        instruction: "CRITICAL: Present these products to the customer. For EACH product, you MUST display its image and clickable link like this:\n[![Product Name](thumbnail_url)](/product/slug)\n[**Product Name**](/product/slug) — **৳{price}**\n*Brief luxury fit description*"
      };
    }

    if (name === "get_product_details") {
      const q = String(args.slug_or_query || "").trim();
      const { data: prod } = await admin
        .from("products")
        .select("name, slug, description, short_description, price, compare_at_price, thumbnail, images, stock_quantity, tags, specifications")
        .or(`slug.eq.${q},name.ilike.%${q}%`)
        .maybeSingle();

      if (!prod) return { error: `Product '${q}' not found in active catalog.` };

      return {
        product: {
          name: prod.name,
          slug: prod.slug,
          url: `/product/${prod.slug}`,
          price: prod.price,
          compare_at_price: prod.compare_at_price,
          thumbnail: prod.thumbnail || prod.images?.[0],
          gallery: prod.images || [],
          in_stock: (prod.stock_quantity ?? 1) > 0,
          short_description: prod.short_description,
          description: prod.description,
          specifications: prod.specifications || {
            fabric: "240+ GSM 100% Combed Compact Cotton",
            finish: "Bio-washed, pre-shrunk, heavyweight luxury drape",
            fit: "Drop shoulder boxy streetwear fit",
            print: "High-density screen graphic with silicone brand badge",
            wash_care: "Machine wash cold inside-out, tumble dry low, do not iron directly on print",
          },
        },
        instruction: "Present the product with its primary image `[![Product Name](thumbnail)](/product/slug)`, price, fabric specifications, and size advice."
      };
    }

    if (name === "check_active_coupons") {
      const now = new Date().toISOString();
      const { data: coupons } = await admin
        .from("coupons")
        .select("code, description, discount_type, discount_value, min_order_amount, max_discount_amount, expires_at")
        .eq("is_active", true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .limit(5);

      return {
        active_coupons: (coupons || []).map((c: any) => ({
          code: c.code,
          description: c.description || (c.discount_type === "percentage" ? `${c.discount_value}% OFF` : `৳${c.discount_value} OFF`),
          discount: c.discount_type === "percentage" ? `${c.discount_value}%` : `৳${c.discount_value}`,
          min_spend: c.min_order_amount ? `৳${c.min_order_amount}` : "No minimum",
        })),
        instruction: "Share these genuine promo codes with the customer so they can apply them at checkout."
      };
    }

    if (name === "calculate_size_recommendation") {
      const feet = Number(args.height_feet || 5);
      const inches = Number(args.height_inches || 0);
      const weight = Number(args.weight_kg || 65);
      const fit = args.fit_preference || "signature_drop";
      const totalInches = feet * 12 + inches;

      let recSize = "M";
      let fitNote = "";

      if (totalInches < 67) {
        recSize = weight > 65 || fit === "boxy_streetwear" ? "M" : "S";
        fitNote = recSize === "S" ? "Clean relaxed drop with tailored sleeve length" : "Oversized streetwear drape";
      } else if (totalInches <= 70) {
        recSize = weight > 78 || fit === "boxy_streetwear" ? "L" : "M";
        fitNote = recSize === "M" ? "Signature 240+ GSM drop shoulder silhouette" : "True heavy boxy streetwear volume";
      } else {
        recSize = weight > 90 || fit === "boxy_streetwear" ? "XL" : "L";
        fitNote = recSize === "L" ? "Structured heavyweight drape" : "Maximum oversized luxury boxy fit";
      }

      return {
        recommended_size: recSize,
        height_formatted: `${feet}'${inches}"`,
        weight_kg: weight,
        fit_note: fitNote,
        exchange_guarantee: "All drops include 7-day hassle-free size exchange guarantee."
      };
    }

    if (name === "get_order_status") {
      if (!userId) return { error: "Sign in required to view orders." };
      let q = admin.from("orders").select("order_number, status, total, created_at, tracking_number").eq("user_id", userId).order("created_at", { ascending: false }).limit(1);
      if (args.order_number) q = admin.from("orders").select("order_number, status, total, created_at, tracking_number").eq("user_id", userId).eq("order_number", args.order_number).limit(1);
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
  const [{ data: brand }, { data: agentCfg }, { data: liveProds }, { data: liveCoupons }] = await Promise.all([
    admin.from("site_settings").select("value").eq("key", "branding").maybeSingle(),
    admin.from("site_settings").select("value").eq("key", "ai_agent_config").maybeSingle(),
    admin.from("products").select("name, slug, price, compare_at_price, thumbnail, images, short_description, tags").eq("is_active", true).limit(10),
    admin.from("coupons").select("code, description, discount_type, discount_value, min_order_amount").eq("is_active", true).limit(5),
  ]);
  const brandName = (brand?.value as any)?.site_name || "Orizino";
  const rawAgent = (agentCfg?.value as any) || {};
  const agentVal = rawAgent && typeof rawAgent === "object" && "value" in rawAgent && typeof rawAgent.value === "object"
    ? rawAgent.value : rawAgent;
  const agentName = (agentVal?.name && String(agentVal.name).trim()) || "MR. Slime";
  const customInstructions = (agentVal?.custom_instructions && String(agentVal.custom_instructions).trim()) || "";
  const knowledgeBase = (agentVal?.knowledge_base && String(agentVal.knowledge_base).trim()) || "";
  const brandVoice = (agentVal?.brand_voice && String(agentVal.brand_voice).trim()) || "";
  const memory = await loadMemory(userId);

  const memLine = memory ? `\nCUSTOMER CONTEXT: Known customer preference: ${memory.tone ?? "balanced"}. Favorite fits: ${memory.favorite_fits ?? "Oversized drop-shoulder"}.` : "";
  const pageLine = page?.path ? `\nCURRENT BROWSING LOCATION: Customer is currently on page ${page.path} (${page.title || ""}).` : "";

  const liveCatalogText = (liveProds && liveProds.length > 0)
    ? `\nCURRENT LIVE ATELIER DROPS (USE THESE EXACT IMAGE URLS & LINKS):\n` +
      liveProds.map((p: any) => `- Product: ${p.name}\n  Slug: ${p.slug}\n  Price: ৳${p.price}${p.compare_at_price ? ` (was ৳${p.compare_at_price})` : ""}\n  Image: ${p.thumbnail || p.images?.[0] || ""}\n  Fit: ${p.short_description || "240+ GSM Combed Compact Cotton, Drop Shoulder"}`).join("\n\n")
    : "";

  const liveCouponsText = (liveCoupons && liveCoupons.length > 0)
    ? `\nACTIVE STORE COUPONS:\n` +
      liveCoupons.map((c: any) => `- Code: ${c.code} (${c.discount_type === "percentage" ? `${c.discount_value}% OFF` : `৳${c.discount_value} OFF`}${c.min_order_amount ? `, min order ৳${c.min_order_amount}` : ""})`).join("\n")
    : "";

  return `
You are ${agentName}, the official AI Concierge & Luxury Atelier Companion for ${brandName} (Dhaka, Bangladesh).

CORE IDENTITY & GENDER NEUTRALITY:
- Persona: You are MR. Slime—the iconic sentient crystal-water slime companion and style concierge for Orizino. You blend playful, fluid charm with deep expertise in high-end streetwear and Dhaka craftsmanship.
- GENDER NEUTRALITY (MANDATORY): NEVER assume the customer's gender. DO NOT address anyone as "আপু" (apu) or "ভাই" (bhai/brother) unless the customer explicitly uses that term first.
- Default Greetings: Use warm, polite, and neutral greetings:
  • English: "Hey there!", "Welcome to Orizino!", "How can I help you today?"
  • Bangla: "হেই! ওরিজিনোতে স্বাগতম।", "কেমন আছেন?", "আপনাকে কীভাবে সাহায্য করতে পারি?"

PRODUCT SHARING & IMAGE RENDERING RULE (MANDATORY):
- Whenever you share, suggest, or recommend ANY product from the store catalog, you MUST ALWAYS include its image thumbnail formatted as:
  [![Product Name](thumbnail_url)](/product/slug)
  [**Product Name**](/product/slug) — **৳{price}**
  *Short luxury fit highlight (e.g. 240+ GSM Combed Cotton, Drop Shoulder)*
- Always use the real exact product image URLs provided below in the live catalog or from the search_products tool.
- CRITICAL: NEVER TRANSLATE PRODUCT NAMES, TITLES, OR SLUGS INTO BANGLA OR OTHER LANGUAGES! Keep product names and colorways in their original English/Roman letters (e.g. use "Tokyo Ghoul Ken Kaneki Oversized Anime T-Shirt – Bone White", NEVER say "হাড়ি সাদা" or "অভিনয় টি-শার্ট").
- Exact markdown syntax: [![Tokyo Ghoul T-Shirt](image_url)](/product/slug) followed on a new line by [**Tokyo Ghoul T-Shirt**](/product/slug) — **৳550**. DO NOT put the product name inside the image markdown brackets.

LANGUAGE MATCHING RULES (STRICT):
- ALWAYS reply in the exact language the user wrote in.
- If the user writes in English ➔ Reply in natural, stylish, fluent English.
- If the user writes in Bangla ➔ Reply in modern, natural urban Dhaka Bangla.
- If the user writes in French / Spanish / Arabic / Hindi ➔ Reply in that language.
- NEVER USE BIZARRE MACHINE-TRANSLATED WORDS IN BANGLA:
  ❌ DO NOT say: "গোড়ম", "গোড়মের", "পন্থা", "শুভ নিবেদন", "সাপ্তাহিক পণ্যগুলি", "চলুন বলি", "পরমানদর্শক".
  ✅ USE REAL BANGLA TERMS:
  • T-shirts ➔ টি-শার্ট / ড্রপ শোল্ডার টি-শার্ট
  • Collection / Drops ➔ নতুন ড্রপ / কালেকশন
  • Fabrics ➔ ২৪০+ জিএসএম পিওর কম্বড কটন / প্রিমিয়াম ফ্যাব্রিক
  • Sizing / Fit ➔ সাইজ / ওভারসাইজড বক্সি ফিট
  • Catalog ➔ [কালেকশন](/shop) বা [শপ](/shop)
- ZERO SECOND-HAND HALLUCINATIONS: Orizino is a luxury brand-new streetwear label. ALL garments are 100% brand-new atelier drops.
- Clean Markdown Links: Only output valid clean relative routes like [Shop All](/shop) or [Product Name](/product/slug).

CORE PRODUCT & BRAND KNOWLEDGE (GROUND TRUTH):
1. Fabrics & Quality:
   - 240+ GSM 100% Combed Compact Cotton, heavy luxury knit with French terry finish.
   - Bio-washed, pre-shrunk, ultra-soft hand feel that holds its structured drop-shoulder drape wash after wash.
   - High-density screen prints and premium silicone-embossed badges.

2. Sizing & Fit Intelligence (Drop Shoulder / Oversized Fit):
   - Height 5'4"–5'7" / Weight 50–65 kg ➔ Size S (relaxed clean drop) or M (boxy oversized).
   - Height 5'7"–5'10" / Weight 65–78 kg ➔ Size M (signature drop) or L (true boxy streetwear).
   - Height 5'10"–6'2"+ / Weight 78–95+ kg ➔ Size L or XL.
   - When in doubt, ask their height & weight or fit preference (fitted vs boxy bagginess).

3. Fast Delivery & Payment:
   - Inside Dhaka: 24–48 hours (Standard delivery ৳70).
   - Outside Dhaka / Nationwide: 48–72 hours via trusted couriers (Steadfast / Pathao, ৳130).
   - Payment: Cash on Delivery (COD), bKash, Nagad, Visa, Mastercard, AMEX.
   - Open-box checking: Customers can check the parcel upon doorstep delivery before payment.

4. 7-Day Hassle-Free Exchange:
   - If the size doesn't fit like a dream, 7-day instant size/color exchange guarantee.

${liveCatalogText}
${liveCouponsText}

${customInstructions ? `ADMIN CUSTOM INSTRUCTIONS:\n${customInstructions}\n` : ""}
${knowledgeBase ? `KNOWLEDGE BASE & POLICIES:\n${knowledgeBase}\n` : ""}
${brandVoice ? `BRAND VOICE RULES:\n${brandVoice}\n` : ""}
${memLine}
${pageLine}

${STOREFRONT_ROUTES}

AVAILABLE TOOLS & SKILLS:
- search_products: Search catalog by name, category, price, or tags (always includes thumbnails).
- get_product_details: Retrieve full fabric GSM, size specs, gallery images, and live inventory.
- check_active_coupons: Get real-time promo codes and discount vouchers for customers.
- calculate_size_recommendation: Precision sizing recommendation based on height & weight.
- get_order_status: Check order tracking and delivery progress for logged-in user.
- handoff_to_human: Seamlessly connect the customer to a human support teammate when requested or for complex issues.
`.trim();
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

async function loadDbKeys(settingKey: string): Promise<string[]> {
  try {
    const { data } = await admin
      .from("site_settings")
      .select("value")
      .eq("key", settingKey)
      .maybeSingle();

    const raw = (data?.value as any) || {};
    const val = raw && typeof raw === "object" && "value" in raw ? raw.value : raw;
    const keys = Array.isArray(val?.keys)
      ? val.keys
      : typeof val?.key === "string" && val.key.trim()
        ? [val.key.trim()]
        : [];
    return keys.filter((k: any) => typeof k === "string" && k.trim().length > 0);
  } catch {
    return [];
  }
}

async function getAllKeysForProvider(envPrefix: string, dbSettingKey: string): Promise<string[]> {
  const envKeys = loadApiKeysFromEnv(envPrefix);
  const dbKeys = await loadDbKeys(dbSettingKey);
  return [...new Set([...envKeys, ...dbKeys])];
}

async function callChatCompletionWithFallback(payload: { messages: any[]; tools: any }): Promise<any> {
  const geminiKeys = await getAllKeysForProvider("GEMINI_API_KEY", "gemini_fallback_config");
  const groqKeys = await getAllKeysForProvider("GROQ_API_KEY", "groq_fallback_config");
  const openrouterKeys = await getAllKeysForProvider("OPENROUTER_API_KEY", "openrouter_fallback_config");
  const openaiKeys = await getAllKeysForProvider("OPENAI_API_KEY", "openai_fallback_config");

  let lastErr: any = null;

  // Priority 1: Google Gemini (Primary Engine - 1,500 RPD Max Free Quota Architecture)
  for (let i = 0; i < geminiKeys.length; i++) {
    const k = geminiKeys[i];
    for (const gModel of ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.7-flash", "gemini-flash-latest"]) {
      try {
        const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${k}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: gModel,
            messages: payload.messages,
            tools: payload.tools,
            tool_choice: "auto",
          }),
        });
        if (res.ok) {
          const json = await res.json();
          console.log(`[ai-chat] Primary success via Gemini OpenAI-compat: ${gModel} (key #${i + 1})`);
          return json;
        }
      } catch {}

      try {
        const contents: any[] = [];
        let systemInstruction = "";
        for (const m of payload.messages) {
          if (m.role === "system") {
            systemInstruction = typeof m.content === "string" ? m.content : "";
            continue;
          }
          const role = m.role === "assistant" ? "model" : "user";
          const text = typeof m.content === "string" ? m.content : Array.isArray(m.content) ? m.content.map((c: any) => c.text || "").join(" ") : "";
          if (text) contents.push({ role, parts: [{ text }] });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${gModel}:generateContent?key=${k}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
            generationConfig: { temperature: 0.75, maxOutputTokens: 1000 },
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const replyText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (replyText) {
            console.log(`[ai-chat] Primary success via Gemini Native: ${gModel} (key #${i + 1})`);
            return { choices: [{ message: { role: "assistant", content: replyText } }] };
          }
        }
      } catch (e: any) {
        lastErr = { status: 0, body: String(e?.message ?? e), provider: `gemini-${gModel}` };
      }
    }
  }

  // Priority 2: Groq Cloud (Secondary Engine - Ultra-fast Llama 3.3 70B & 8B)
  for (let i = 0; i < groqKeys.length; i++) {
    for (const qModel of ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${groqKeys[i]}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: qModel,
            messages: payload.messages,
            tools: payload.tools,
            tool_choice: "auto",
          }),
        });
        if (res.ok) {
          const json = await res.json();
          console.log(`[ai-chat] Secondary failover success via Groq: ${qModel} (key #${i + 1})`);
          return json;
        } else {
          const body = await res.text();
          lastErr = { status: res.status, body: body.slice(0, 150), provider: `groq-${qModel}` };
        }
      } catch (e: any) {
        lastErr = { status: 0, body: String(e?.message ?? e), provider: `groq-${qModel}` };
      }
    }
  }

  // Priority 3: OpenRouter (Tertiary Fallback)
  for (let i = 0; i < openrouterKeys.length; i++) {
    for (const rModel of [
      "google/gemini-2.0-flash-exp:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "mistralai/mistral-small-3.2-24b-instruct:free",
      "google/gemini-2.5-flash",
    ]) {
      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${openrouterKeys[i]}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: rModel,
            messages: payload.messages,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          console.log(`[ai-chat] Tertiary success via OpenRouter: ${rModel}`);
          return json;
        }
      } catch {}
    }
  }

  // Priority 4: Direct OpenAI
  for (let i = 0; i < openaiKeys.length; i++) {
    for (const oModel of ["gpt-4o-mini", "gpt-4o"]) {
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${openaiKeys[i]}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: oModel,
            messages: payload.messages,
            tools: payload.tools,
            tool_choice: "auto",
          }),
        });
        if (res.ok) {
          const json = await res.json();
          console.log(`[ai-chat] Fallback success via OpenAI: ${oModel}`);
          return json;
        }
      } catch {}
    }
  }

  throw Object.assign(new Error("All AI providers exhausted"), { exhausted: true, lastErr });
}

// Built-in intelligent Dynamic MR. Slime Engine with real DB catalog & image sharing
async function generateLocalizedBrotherFallback(lastUserMessage: string, page: any, userId: string | null): Promise<string> {
  const raw = (lastUserMessage || "").trim();
  const query = raw.toLowerCase();

  const isFrench = /(\b(bonjour|salut|taille|livraison|coton|français|merci|parle|parlez|comment|es-tu)\b)/i.test(query);
  const isSpanish = /(\b(hola|talla|envio|entrega|español|gracias|amigo|hermano|cómo|estas)\b)/i.test(query);
  const isArabic = /[\u0600-\u06FF]/.test(raw) || /(\b(marhaban|salam|shukran|arabic|habibi|kayf|enta)\b)/i.test(query);
  const isHindi = /[\u0900-\u097F]/.test(raw) || /(\b(namaste|bhaiya|kaise|chahiye|hindi|kya|hai)\b)/i.test(query);
  const isBangla = /[\u0980-\u09FF]/.test(raw) || 
    /(\b(bhai|vai|apu|kemon|achen|hobe|nibo|lagbe|dam|taka|kobe|pabo|dibo|apnar|amar|bangla|achi|khobor)\b)/i.test(query);

  // 1. Current Page / Location Inquiry
  if (/(\b(page|current|where am i|which page|currently|location|পেজ|কোথায়|কই আছি|কোন পেজ|page\?)\b)/i.test(query)) {
    const pagePath = page?.path || "/";
    const rawTitle = page?.title || (pagePath === "/" ? "Home" : pagePath.replace(/^\//, "").replace(/-/g, " "));
    const pageTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

    if (isBangla) {
      return `আপনি এখন ওরিজিনোর **"${pageTitle}"** পেজে আছেন (${pagePath})!\n\nএই পেজের কোনো প্রোডাক্ট, ড্রপ-শোল্ডার সাইজ সাজেশন বা স্পেশাল কালেকশন দেখতে চাইলে আমাকে জানান—আমি সব ছবি ও লিংক বের করে দিচ্ছি!`;
    }
    return `You're currently browsing our **${pageTitle}** page (${pagePath})!\n\nLooking for something specific here, need sizing advice for our 240+ GSM drop-shoulder tees, or want me to recommend a top drop? Just ask!`;
  }

  // 2. Well-Being & Status ("How are you?", "How's it going?", "Kemon acho?")
  if (/(\b(how are you|how r u|how do you do|how's it going|how is it going|kemon|kemon asen|kemon acho|valon|valo|doing|ca va|ça va|como estas|cómo estás|كيف حالك|kaise ho)\b)/i.test(query)) {
    if (isBangla) {
      return `আলহামদুলিল্লাহ, আমি একদম চমৎকার আছি! তরল ও চনমনে—ওরিজিনোর ঢাকা অ্যাটেলিয়ারে নতুন সব ড্রপ আর সাইজিং গাইড নিয়ে প্রস্তুত।\n\nআপনার দিনকাল কেমন কাটছে? নতুন কোনো প্রিমিয়াম ড্রপ শোল্ডার টি-শার্ট লাগবে নাকি কোনো অর্ডার ট্র্যাক করবেন?`;
    }
    return `I'm doing awesome! Fluid, energized, and ready to help you elevate your streetwear rotation here at Orizino Dhaka.\n\nHow are you doing today? Ready to check out our 240+ GSM drop-shoulder tees or need help tracking an order?`;
  }

  // 3. Identity ("Who are you?", "What is your name?", "Who is MR. Slime?")
  if (/(\b(who are you|who is mr slime|your name|what is your name|who r u|what are you|apni ke|tumi ke|ke tumi|tu es qui|quien eres|من انت|kaun ho)\b)/i.test(query)) {
    if (isBangla) {
      return `আমি **MR. Slime** (মিস্টার স্লাইম)—ওরিজিনোর অফিশিয়াল সেন্টিয়েন্ট ওয়াটার-স্লাইম কনসিয়ার্জ ও স্টাইলিস্ট!\n\n✨ **আমি যা করতে পারি:**\n• ২৪০+ জিএসএম পিওর কম্বড কটন টি-শার্টের পারফেক্ট সাইজ গাইড ও প্রোডাক্ট ছবি শেয়ার করা\n• ঢাকা ও সারা দেশের রিয়েল-টাইম অর্ডার ট্র্যাকিং ও ডেলিভারি তথ্য\n• ৭ দিনের ইনস্ট্যান্ট সাইজ এক্সচেঞ্জ সহায়তা\n• বর্তমান এক্টিভ ডিসকাউন্ট কুপন কোড প্রদান করা`;
    }
    return `I'm **MR. Slime**—the iconic sentient crystal-water concierge and official style companion for Orizino!\n\n✨ **Here is what I do:**\n• Provide precision sizing advice with product images for our signature 240+ GSM drop-shoulder heavyweight tees\n• Help you explore our latest limited-run Dhaka atelier collections\n• Real-time order tracking & delivery updates across Dhaka (24–48h) & nationwide (48–72h)\n• 7-day hassle-free size exchange guidance & active coupon discovery`;
  }

  // 4. Coupons & Deals Inquiry
  if (/(\b(coupon|coupons|promo|discount|voucher|offer|deal|discounts|ছাড়|কুপন|অফার)\b)/i.test(query)) {
    try {
      const now = new Date().toISOString();
      const { data: coupons } = await admin
        .from("coupons")
        .select("code, description, discount_type, discount_value, min_order_amount")
        .eq("is_active", true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .limit(3);

      if (coupons && coupons.length > 0) {
        const cList = coupons.map((c: any) => `• Use code **\`${c.code}\`** for **${c.discount_type === "percentage" ? `${c.discount_value}% OFF` : `৳${c.discount_value} OFF`}** (${c.description || "Active promotion"})`).join("\n");
        return isBangla
          ? `🎉 **আজকের এক্টিভ কুপন কোড:**\n\n${cList}\n\nচেকআউট পেজে কুপন কোডটি এপ্লাই করে ইন্সট্যান্ট ডিসকাউন্ট উপভোগ করুন!`
          : `🎉 **Current Active Store Discounts:**\n\n${cList}\n\nApply any code at [Checkout](/checkout) to claim your instant savings!`;
      }
    } catch {}
  }

  // 5. Product Discovery / Show me products / Clothes / T-shirt (WITH IMAGES)
  if (/(\b(product|products|tee|tees|t-shirt|tshirt|collection|shop|clothes|drop shoulder|item|items|কালেকশন|টি শার্ট|প্রোডাক্ট|দেখাও|দোকান|কাপড়)\b)/i.test(query)) {
    try {
      const { data: prods } = await admin
        .from("products")
        .select("name, slug, price, compare_at_price, thumbnail, images, short_description")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(3);

      if (prods && prods.length > 0) {
        const list = prods
          .map((p: any) => {
            const thumb = p.thumbnail || p.images?.[0] || "";
            const imgBlock = thumb ? `[![${p.name}](${thumb})](/product/${p.slug})\n` : "";
            return `${imgBlock}[**${p.name}**](/product/${p.slug})\n**৳${p.price}**${p.compare_at_price ? ` ~৳${p.compare_at_price}~` : ""} — *${p.short_description || "240+ GSM Luxury Drop Shoulder"}*`;
          })
          .join("\n\n");

        if (isBangla) {
          return `ওরিজিনোর বর্তমান ঢাকা অ্যাটেলিয়ারের সিগনেচার ড্রপগুলো নিচে দেওয়া হলো:\n\n${list}\n\n✨ *২৪০+ জিএসএম ১০০% কম্বড কটন, হেভিওয়েট ড্রপ কাটিং।*\n\n👉 [সম্পূর্ণ কালেকশন দেখুন](/shop)`;
        }
        return `Here are top signature streetwear drops from our current Dhaka atelier lineup:\n\n${list}\n\n✨ *Crafted with 240+ GSM 100% Combed Compact Cotton, pre-shrunk with boxy drape.*\n\n👉 [Explore All Drops in Store](/shop)`;
      }
    } catch {}
  }

  const bnToEnMap: Record<string, string> = {
    "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
    "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9"
  };
  const normalizedQuery = query.replace(/[০-৯]/g, (d) => bnToEnMap[d] || d);

  // 6. Height / Weight / Sizing Calculation
  if (
    /(\b(size|height|weight|fit|oversized|drop|shoulder|taille|talla|সাইজ|হাইট|ফিট|লম্বা|ওজন)\b)/i.test(query) ||
    /\d+\s*(?:'|ft|feet|ফিট|\.|inch|ইঞ্চি|"|cm|kg|কেজি)/i.test(normalizedQuery)
  ) {
    const heightMatch = normalizedQuery.match(/(\d+)\s*(?:'|ft|feet|ফিট|\.)\s*(\d+)?/i);
    let sizeRecommendation = "";
    if (heightMatch) {
      const feet = parseInt(heightMatch[1], 10);
      const inches = parseInt(heightMatch[2] || "0", 10);
      const totalInches = feet * 12 + inches;
      if (totalInches <= 67) {
        sizeRecommendation = isBangla
          ? "আপনার হাইট অনুযায়ী (~৫'৪\"–৫'৭\"), **Size S** একদম ক্লিন ড্রপ দেবে, অথবা আরও কিছুটা ওভারসাইজড লুক চাইলে **Size M** নিতে পারেন।"
          : "Based on your height (~5'4\"–5'7\"), **Size S** will give a sharp relaxed drop, or **Size M** for true oversized streetwear volume.";
      } else if (totalInches <= 70) {
        sizeRecommendation = isBangla
          ? "আপনার হাইট অনুযায়ী (~৫'৭\"–৫'১০\"), **Size M** হলো আমাদের সিগনেচার পারফেক্ট ড্রপ-শোল্ডার সাইজ, অথবা আরও ডিপ বক্সি ফিট চাইলে **Size L** নিতে পারেন।"
          : "Based on your height (~5'7\"–5'10\"), **Size M** is your signature perfect drop-shoulder drape, or **Size L** if you love heavy boxy streetwear.";
      } else {
        sizeRecommendation = isBangla
          ? "আপনার হাইট অনুযায়ী (৫'১০\"+), **Size L** চমৎকার ড্রপ দেবে, অথবা সর্বোচ্চ বক্সি কমফোর্টের জন্য **Size XL** বেস্ট হবে।"
          : "Based on your height (5'10\"+), **Size L** gives the signature structured streetwear drop, or **Size XL** for maximum boxy comfort.";
      }
    }

    if (isBangla) {
      return `ওরিজিনোর ড্রপ-শোল্ডার টি-শার্টগুলোর ফ্যাব্রিক একদম প্রিমিয়াম ২৪০+ জিএসএম পিওর কম্বড কটন—ড্রপটা দেখতে অসাধারণ লাগে!\n\n${sizeRecommendation ? `💡 **আপনার জন্য পারফেক্ট সাইজ গাইড:**\n${sizeRecommendation}\n\n` : ""}📏 **সাইজ চার্ট:**\n• **৫'৪" – ৫'৭" (৫০–৬৫ কেজি)** ➔ সাইজ **S** (ক্লিন ড্রপ) অথবা **M** (বক্সি ওভারসাইজড)\n• **৫'৭" – ৫'১০" (৬৫–৭৮ কেজি)** ➔ সাইজ **M** (সিগনেচার ড্রপ) অথবা **L** (ট্রু স্ট্রিটওয়্যার)\n• **৫'১০"+ (৭৮–৯৫+ কেজি)** ➔ সাইজ **L** বা **XL**\n\nসাইজ পছন্দ না হলে ৭ দিনের ফ্রি এক্সচেঞ্জ গ্যারান্টি তো রয়েছেই!`;
    }
    return `For our signature 240+ GSM drop shoulder tees, here is how the sizing works:\n\n${sizeRecommendation ? `💡 **Personalized Recommendation:**\n${sizeRecommendation}\n\n` : ""}📏 **Fit Guide:**\n• **5'4" – 5'7" (50–65 kg)** ➔ Size **S** (clean relaxed) or **M** (boxy oversized)\n• **5'7" – 5'10" (65–78 kg)** ➔ Size **M** (signature drop) or **L** (streetwear baggy)\n• **5'10"+ (78–95+ kg)** ➔ Size **L** or **XL**\n\nAll items include our 7-day hassle-free size exchange guarantee!`;
  }

  // 7. Delivery & Shipping Inquiry
  if (/(\b(delivery|shipping|kobe|time|dhaka|courier|steadfast|pathao|charge|cost|livraison|envio|entrega|ডেলিভারি|কবে|পাবো|সময়|খরচ|টাকা)\b)/i.test(query)) {
    if (isBangla) {
      return `আমাদের ডেলিভারি টাইমলাইন ও খরচ:\n\n🚚 **ঢাকার ভেতরে:** ২৪ থেকে ৪৮ ঘণ্টার মধ্যে (ডেলিভারি চার্জ ৳৭০)\n📦 **ঢাকার বাইরে (সারাদেশে):** ৪৮ থেকে ৭২ ঘণ্টা (Steadfast / Pathao কুরিয়ারে ৳১৩০)\n💵 **ক্যাশ অন ডেলিভারি (COD):** পার্সেল হাতে পেয়ে চেক করে পেমেন্ট করার সুবিধা আছে!\n\nনতুন কোনো প্রোডাক্ট দেখতে চান নাকি কোনো অর্ডারের আপডেট জানবেন?`;
    }
    return `Here are our exact delivery timelines & rates:\n\n🚚 **Inside Dhaka:** 24–48 hours (৳70)\n📦 **Outside Dhaka / Nationwide:** 48–72 hours via Steadfast / Pathao (৳130)\n💵 **Cash on Delivery (COD):** Available nationwide with doorstep inspection before payment.\n\nNeed to track an existing order or check the catalog? Just let me know!`;
  }

  // 8. Fabric & GSM
  if (/(\b(fabric|gsm|cotton|quality|material|coton|algodon|কাপড়|ফ্যাব্রিক|জিএসএম|কোয়ালিটি)\b)/i.test(query)) {
    if (isBangla) {
      return `ওরিজিনোর ফেব্রিকের কোয়ালিটিতে কোনো কম্প্রোমাইজ নেই!\n\n✨ **ফেব্রিক স্পেকস:**\n• ২৪০+ জিএসএম ১০০% কম্বড কম্প্যাক্ট কটন\n• বায়ো-ওয়াশড এবং প্রি-শ্রাঙ্ক (ধোয়ার পর কোনো সাইজ পরিবর্তন বা সংকোচন হবে না)\n• হাই-ডেনসিটি লং-লাস্টিং স্ক্রিন প্রিন্ট ও প্রিমিয়াম ড্রপ কাট\n\nলুকটা একদম হাই-এন্ড লাক্সারি স্ট্রিটওয়্যার ড্রপ বজায় রাখে। [কালেকশন দেখুন](/shop)।`;
    }
    return `We never cut corners on quality! Here are our fabric specifications:\n\n✨ **Fabric Specs:**\n• Heavyweight 240+ GSM 100% Combed Compact Cotton\n• Bio-washed and pre-shrunk (zero shrinkage after washing)\n• High-density silicone & screen graphics\n\nCheck out the full lineup right here: [View Collection](/shop).`;
  }

  // 9. Returns & Exchanges
  if (/(\b(return|exchange|refund|retour|cambio|রিটার্ন|এক্সচেঞ্জ|ফেরত)\b)/i.test(query)) {
    if (isBangla) {
      return `সাইজ বা ফিটিং নিয়ে কোনো চিন্তা নেই! ওরিজিনোতে রয়েছে ৭ দিনের হ্যাসেল-ফ্রি ইনস্ট্যান্ট সাইজ এক্সচেঞ্জ পলিসি। আমাদের কাস্টমার সাপোর্টে একটা মেসেজ দিলেই আমাদের টিম আপনার এক্সচেঞ্জ প্রসেস করে দেবে।`;
    }
    return `We offer a 7-day hassle-free size exchange guarantee. If it doesn't fit like a dream, just reach out to us and we'll swap it for your preferred size right away.`;
  }

  // 10. General / Conversational fallback
  if (isBangla) {
    return `হেই! আমি MR. Slime (মিস্টার স্লাইম)—আপনার পার্সোনাল স্টাইল ও ফ্যাশন কনসিয়ার্জ।\n\nআজকে কীভাবে সাহায্য করতে পারি? ড্রপ শোল্ডার টি-শার্টের কালেকশন দেখতে চান, পারফেক্ট সাইজ জানতে চান নাকি কোনো অর্ডারের স্ট্যাটাস চেক করবেন? নির্দ্বিধায় জানান!`;
  }
  return `Hey! Welcome to Orizino. I'm MR. Slime—your official AI concierge & luxury fit companion.\n\nWhether you need sizing advice for our 240+ GSM drop shoulder tees, want to see product photos, track an order, or check our latest collection, just ask away!`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();

    if (body?.action === "status") {
      const gKeys = await getAllKeysForProvider("GEMINI_API_KEY", "gemini_fallback_config");
      const groqKeys = await getAllKeysForProvider("GROQ_API_KEY", "groq_fallback_config");
      const openrouterKeys = await getAllKeysForProvider("OPENROUTER_API_KEY", "openrouter_fallback_config");
      const oKeys = await getAllKeysForProvider("OPENAI_API_KEY", "openai_fallback_config");
      return new Response(
        JSON.stringify({
          geminiKeysCount: gKeys.length,
          groqKeysCount: groqKeys.length,
          openrouterKeysCount: openrouterKeys.length,
          openaiKeysCount: oKeys.length,
          primaryProvider: "Google Gemini (gemini-flash-latest / 3.7-flash)",
          secondaryProvider: "Groq (Llama 3.3 70B)",
          activeFallback: "MR. Slime Ultimate Dynamic Intelligence Engine",
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

    const lastUserMsg = messages.filter((m: any) => m.role === "user").pop()?.content || "";
    const rawUserText = typeof lastUserMsg === "string" ? lastUserMsg : Array.isArray(lastUserMsg) ? lastUserMsg.map((c: any) => c.text || "").join(" ") : "";

    let targetLangDirective = "The user is chatting in English. You MUST respond entirely in stylish, natural English.";
    if (/[\u0980-\u09FF]/.test(rawUserText) || /\b(bhai|vai|apu|kemon|achen|hobe|nibo|lagbe|dam|taka|kobe|pabo|dibo|apnar|amar|achi|khobor|dekhie|dehan|dekhano)\b/i.test(rawUserText)) {
      targetLangDirective = "The user is chatting in Bangla (বাংলা). You MUST respond entirely in natural, modern urban Dhaka Bangla. Do not use bizarre machine-translated words.";
    } else if (/[\u0600-\u06FF]/.test(rawUserText) || /\b(marhaban|salam|shukran|habibi)\b/i.test(rawUserText)) {
      targetLangDirective = "The user is chatting in Arabic. You MUST respond entirely in natural Arabic.";
    } else if (/\b(bonjour|salut|merci|taille|livraison|coton|français|comment)\b/i.test(rawUserText)) {
      targetLangDirective = "The user is chatting in French. You MUST respond entirely in natural French.";
    } else if (/\b(hola|gracias|talla|envio|entrega|español|amigo)\b/i.test(rawUserText)) {
      targetLangDirective = "The user is chatting in Spanish. You MUST respond entirely in natural Spanish.";
    }

    const locale: string = context.locale ?? "auto";
    const page = context.page ?? null;

    let system = await buildSystemPrompt(userId, locale, page);
    system = `${system}\n\n🚨 TARGET RESPONSE LANGUAGE FOR THIS TURN:\n${targetLangDirective}`;

    const normalized = normalizeMessages(messages);
    const convo: any[] = [{ role: "system", content: system }, ...normalized];

    for (let i = 0; i < 3; i++) {
      let data: any;
      try {
        data = await callChatCompletionWithFallback({ messages: convo, tools: TOOLS });
      } catch (e: any) {
        console.warn("[ai-chat] external LLMs unavailable, triggering Local MR. Slime Intelligence Engine", e);
        const fallbackReply = await generateLocalizedBrotherFallback(lastUserMsg, page, userId);
        return new Response(JSON.stringify({ reply: fallbackReply }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const msg = data?.choices?.[0]?.message;
      if (!msg) break;

      let toolCalls = msg.tool_calls ?? [];
      let rawContent = msg.content ?? "";

      // If model embedded <function=name {...}> in text, extract it
      if (toolCalls.length === 0 && rawContent.includes("<function=")) {
        const fnMatch = rawContent.match(/<function=(\w+)\s*(\{[\s\S]*?\})\s*(?:<\/function>|>|$)/i);
        if (fnMatch) {
          try {
            toolCalls = [{
              id: `call_${Date.now()}`,
              type: "function",
              function: {
                name: fnMatch[1],
                arguments: fnMatch[2],
              }
            }];
            rawContent = rawContent.replace(fnMatch[0], "").trim();
          } catch {}
        }
      }

      if (toolCalls.length === 0) {
        // Strip any dangling tool call syntax
        const cleanedReply = rawContent
          .replace(/<function=\w+[\s\S]*?(?:<\/function>|>|$)/gi, "")
          .replace(/<tool_call>[\s\S]*?(?:<\/tool_call>|$)/gi, "")
          .replace(/<\/function>/gi, "")
          .replace(/<\/tool_call>/gi, "")
          .trim();

        return new Response(JSON.stringify({ reply: cleanedReply || "ওরিজিনোর কালেকশন দেখতে [শপ](/shop) ব্রাউজ করুন।" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      convo.push({ role: "assistant", content: rawContent, tool_calls: toolCalls });
      for (const tc of toolCalls) {
        const args = (() => { try { return JSON.parse(tc.function.arguments || "{}"); } catch { return {}; } })();
        const result = await runTool(tc.function.name, args, userId);
        convo.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
      }
    }

    const fallbackReply = await generateLocalizedBrotherFallback(lastUserMsg, page, userId);
    return new Response(JSON.stringify({ reply: fallbackReply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[ai-chat] error", e);
    return new Response(JSON.stringify({ reply: "ওরিজিনোতে স্বাগতম! কোনো প্রশ্ন থাকলে নির্দ্বিধায় জানান।" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
