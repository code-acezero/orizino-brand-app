import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Supabase client with service role or anon key
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key);
}

// Read stored telegram bot configuration
async function getStoredBotConfig(supabase: any) {
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "telegram_bot_config")
      .maybeSingle();

    const raw = data?.value as any;
    if (!raw) return null;
    return typeof raw === "object" && "value" in raw && typeof raw.value === "object" ? raw.value : raw;
  } catch {
    return null;
  }
}

// Telegram API Sender helper
async function tgSend(path: string, body: any, token?: string) {
  const activeToken = token || process.env.TELEGRAM_BOT_TOKEN;
  if (!activeToken) {
    console.warn("[telegram-webhook] No Telegram Bot Token configured.");
    return null;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${activeToken}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) {
      console.warn(`[telegram-webhook] Telegram API ${path} error:`, data?.description || data);
    }
    return data;
  } catch (err) {
    console.error(`[telegram-webhook] Network error sending to ${path}:`, err);
    return null;
  }
}

// AI Chat Completion generator for Telegram
async function generateAiTelegramReply(
  userQuery: string,
  userChatId: number | string,
  supabase: any
): Promise<string> {
  // 1. Fetch live brand catalog and store details
  const [productsRes, siteSettingsRes] = await Promise.all([
    supabase
      .from("products")
      .select("name, price, compare_at_price, stock_quantity, short_description, slug, tags")
      .eq("is_active", true)
      .limit(15),
    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["site_name", "site_description", "site_tagline", "contact_phone", "contact_email"]),
  ]);

  const settingsMap: Record<string, string> = {};
  siteSettingsRes.data?.forEach((s: any) => {
    const v = s.value;
    settingsMap[s.key] = typeof v === "object" && v !== null ? (v as any).value ?? v : v;
  });

  const brandName = settingsMap.site_name || "ORIZINO";
  const brandTagline = settingsMap.site_tagline || settingsMap.site_description || "The mark of what's next. Premium drop shoulder streetwear from Dhaka.";
  const contactPhone = settingsMap.contact_phone || "+880 1700-000000";
  const contactEmail = settingsMap.contact_email || "concierge@orizino.com";

  const productSnippets = (productsRes.data || [])
    .map(
      (p: any) =>
        `• ${p.name}: ৳${p.price} (Stock: ${p.stock_quantity > 0 ? "In Stock" : "Sold Out"}) - https://shop.orizino.com/inventory?q=${encodeURIComponent(p.name)}`
    )
    .join("\n");

  const systemInstruction = `You are the official VIP Concierge Bot for ${brandName} luxury streetwear brand.
Brand Philosophy: ${brandTagline}
Contact Phone: ${contactPhone}
Contact Email: ${contactEmail}
Delivery: 24-48 hours inside Dhaka (৳60), 48-72 hours across all 64 districts in Bangladesh (৳120). COD available nationwide.
Exchange Policy: 7-day hassle-free size & color exchanges.

Current Featured Products:
${productSnippets || "Luxury Drop Shoulder Tees (240 GSM Ring-Spun), Heavy French Terry Hoodies (380 GSM)."}

Rules:
1. Provide warm, concise, and helpful replies.
2. Format text using Telegram-safe HTML tags (<b>bold</b>, <i>italic</i>, <a href="url">link</a>, <code>code</code>). Avoid raw markdown asterisks if possible.
3. If they ask about products, recommend specific items and include links.
4. If they ask about orders, guide them to type /track <order_id> or their phone number.`;

  // Try Gemini API
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const gUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(gUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemInstruction}\n\nCustomer question: "${userQuery}"\nReply concisely as ${brandName} concierge in Telegram HTML format:` }],
            },
          ],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 500,
          },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      }
    } catch (e) {
      console.warn("[telegram-webhook] Gemini AI generation error:", e);
    }
  }

  // Fallback Rule Engine
  const q = userQuery.toLowerCase();
  if (q.includes("delivery") || q.includes("shipping") || q.includes("time") || q.includes("charge") || q.includes("cost")) {
    return `🚚 <b>${brandName} Nationwide Delivery</b>\n\n• <b>Inside Dhaka:</b> 24–48 hours (৳60 delivery charge)\n• <b>Outside Dhaka:</b> 48–72 hours across Bangladesh (৳120 delivery charge)\n• <b>Cash on Delivery (COD):</b> Available nationwide\n\nTrack your parcel anytime with <code>/track &lt;order_id&gt;</code>`;
  }
  if (q.includes("return") || q.includes("exchange") || q.includes("size") || q.includes("fit")) {
    return `📏 <b>Size & Exchange Policy</b>\n\nWe offer a <b>7-Day Hassle-Free Exchange</b> on all unworn items. Our signature 3cm drop shoulder silhouette is crafted for an engineered, relaxed modern drape.\n\nNeed sizing assistance? Reach out via <code>/support</code>!`;
  }
  if (q.includes("price") || q.includes("product") || q.includes("tee") || q.includes("hoodie") || q.includes("shirt") || q.includes("drop shoulder")) {
    return `✨ <b>${brandName} Collection</b>\n\nExplore our high-density 240 GSM drop shoulder tees and 380 GSM Heavy French Terry hoodies.\n\nTap <b>/products</b> to view our latest capsule or visit our <a href="https://shop.orizino.com/inventory">Online Store</a>!`;
  }

  return `👋 Thank you for messaging <b>${brandName}</b>!\n\nI can help you explore our collection, check real-time order tracking, and assist with sizes.\n\nType <b>/products</b> to view items or <b>/track</b> with your order number.`;
}

// ── GET Endpoint (Health Check & Webhook Verification) ────────────────────────
export async function GET() {
  return NextResponse.json({
    status: "active",
    endpoint: "telegram-webhook",
    service: "ORIZINO Telegram Bot Gateway",
    timestamp: new Date().toISOString(),
  });
}

// ── POST Endpoint (Telegram Updates Handler) ──────────────────────────────────
export async function POST(req: NextRequest) {
  let update: any;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = getSupabase();
  const botConfig = await getStoredBotConfig(supabase);
  const botToken = (botConfig?.use_direct_api && botConfig?.bot_token) ? botConfig.bot_token : process.env.TELEGRAM_BOT_TOKEN;

  // Extract message or callback query
  const message = update.message || update.edited_message || update.channel_post;
  const callbackQuery = update.callback_query;

  const chat = message?.chat || callbackQuery?.message?.chat;
  const from = message?.from || callbackQuery?.from;
  const text = (message?.text || "").trim();
  const callbackData = callbackQuery?.data || "";

  if (!chat?.id) {
    return NextResponse.json({ ok: true, ignored: "No chat ID" });
  }

  const chatId = chat.id;

  // 1. Auto-register / upsert chat in telegram_chats table
  try {
    const title =
      chat.title ||
      [from?.first_name, from?.last_name].filter(Boolean).join(" ") ||
      from?.username ||
      String(chatId);

    await supabase.from("telegram_chats").upsert(
      {
        chat_id: chatId,
        title,
        type: chat.type || "private",
        username: from?.username || null,
        last_message_at: new Date().toISOString(),
      },
      { onConflict: "chat_id" }
    );
  } catch (err) {
    console.warn("[telegram-webhook] Chat upsert notice:", err);
  }

  // Acknowledge callback query if applicable
  if (callbackQuery?.id) {
    await tgSend("answerCallbackQuery", { callback_query_id: callbackQuery.id }, botToken);
  }

  const defaultButtons = [
    [
      { text: "🛍 Browse Products", callback_data: "cmd_products" },
      { text: "📦 Track Order", callback_data: "cmd_track" },
    ],
    [
      { text: "💬 Concierge", callback_data: "cmd_support" },
      { text: "🌐 Visit Store", url: "https://shop.orizino.com/inventory" },
    ],
  ];

  // ── Handle /start ─────────────────────────────────────────────────────────
  if (text.startsWith("/start") || callbackData === "cmd_start") {
    const welcomeText =
      botConfig?.welcome_text ||
      "👋 Welcome to <b>ORIZINO Luxury Fit Studio</b>!\n\nCrafted in Dhaka with engineered 240 GSM drop shoulder silhouettes. How can we assist you today?";

    await tgSend(
      "sendMessage",
      {
        chat_id: chatId,
        text: welcomeText,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: defaultButtons,
        },
      },
      botToken
    );
    return NextResponse.json({ ok: true });
  }

  // ── Handle /products or /shop or cmd_products ─────────────────────────────
  if (text.startsWith("/products") || text.startsWith("/shop") || callbackData === "cmd_products") {
    const { data: products } = await supabase
      .from("products")
      .select("id, name, slug, price, compare_at_price, thumbnail, short_description, stock_quantity")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(5);

    if (!products || products.length === 0) {
      await tgSend(
        "sendMessage",
        {
          chat_id: chatId,
          text: "✨ No products listed currently. Visit <a href=\"https://shop.orizino.com\">shop.orizino.com</a> for full arrivals.",
          parse_mode: "HTML",
        },
        botToken
      );
      return NextResponse.json({ ok: true });
    }

    let catalogText = "🛍 <b>ORIZINO Featured Collection</b>\n\n";
    products.forEach((p, idx) => {
      const disc = p.compare_at_price && p.compare_at_price > p.price
        ? ` <s>৳${p.compare_at_price}</s>`
        : "";
      catalogText += `${idx + 1}. <b>${p.name}</b>\n   • Price: <b>৳${p.price}</b>${disc}\n   • Stock: ${p.stock_quantity > 0 ? "✅ Available" : "❌ Sold Out"}\n   • <a href="https://shop.orizino.com/products/${p.slug}">View Piece ↗</a>\n\n`;
    });

    await tgSend(
      "sendMessage",
      {
        chat_id: chatId,
        text: catalogText,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🛍 Shop All Online", url: "https://shop.orizino.com/inventory" }],
            [{ text: "📦 Track an Order", callback_data: "cmd_track" }, { text: "💬 Support", callback_data: "cmd_support" }],
          ],
        },
      },
      botToken
    );
    return NextResponse.json({ ok: true });
  }

  // ── Handle /track <order_id_or_phone> or cmd_track ────────────────────────
  if (text.startsWith("/track") || text.startsWith("/order") || callbackData === "cmd_track") {
    const queryArg = text.replace(/^\/(track|order)\s*/i, "").trim();

    if (!queryArg) {
      await tgSend(
        "sendMessage",
        {
          chat_id: chatId,
          text: "📦 <b>Order Tracking</b>\n\nTo track your delivery, reply with your <b>Order ID</b> (e.g. <code>#1042</code>) or your <b>Phone Number</b> (e.g. <code>01700000000</code>).\n\n<i>Example: /track 1042</i>",
          parse_mode: "HTML",
        },
        botToken
      );
      return NextResponse.json({ ok: true });
    }

    // Lookup order in Supabase
    const cleanArg = queryArg.replace("#", "");
    const { data: order } = await supabase
      .from("orders")
      .select("id, order_number, status, total_amount, payment_method, payment_status, shipping_name, shipping_phone, shipping_city, courier_consignment_id, courier_provider, created_at")
      .or(`order_number.eq.${cleanArg},shipping_phone.ilike.%${cleanArg}%,id.eq.${cleanArg}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!order) {
      await tgSend(
        "sendMessage",
        {
          chat_id: chatId,
          text: `🔍 No order found matching <code>${queryArg}</code>.\n\nPlease check the number or contact our concierge team at <a href="https://shop.orizino.com/support">Support</a>.`,
          parse_mode: "HTML",
        },
        botToken
      );
      return NextResponse.json({ ok: true });
    }

    const orderNum = order.order_number || String(order.id).slice(0, 8);
    const courierStr = order.courier_provider
      ? `\n🚚 <b>Courier:</b> ${order.courier_provider.toUpperCase()} (${order.courier_consignment_id || "Tracking pending"})`
      : "";

    const orderSummary = `📦 <b>Order Status: #${orderNum}</b>\n\n• <b>Status:</b> <b>${String(order.status).toUpperCase()}</b>\n• <b>Customer:</b> ${order.shipping_name || "Customer"}\n• <b>Total Amount:</b> ৳${order.total_amount}\n• <b>Payment:</b> ${order.payment_method?.toUpperCase()} (${order.payment_status})${courierStr}\n• <b>Destination:</b> ${order.shipping_city || "Bangladesh"}\n\n<a href="https://shop.orizino.com/orders">View Order Live ↗</a>`;

    await tgSend(
      "sendMessage",
      {
        chat_id: chatId,
        text: orderSummary,
        parse_mode: "HTML",
      },
      botToken
    );
    return NextResponse.json({ ok: true });
  }

  // ── Handle /help or /support or cmd_support ───────────────────────────────
  if (text.startsWith("/help") || text.startsWith("/support") || callbackData === "cmd_support") {
    const supportText = `💬 <b>ORIZINO Concierge & Support</b>\n\n• <b>Hotline:</b> +880 1700-000000\n• <b>Email:</b> concierge@orizino.com\n• <b>Live Support:</b> <a href="https://shop.orizino.com/support">shop.orizino.com/support</a>\n• <b>Hours:</b> 10:00 AM – 10:00 PM (Everyday)\n\nFeel free to ask any question directly here in this chat!`;

    await tgSend(
      "sendMessage",
      {
        chat_id: chatId,
        text: supportText,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "💬 Open Live Chat", url: "https://shop.orizino.com/support" }],
            [{ text: "🛍 Browse Products", callback_data: "cmd_products" }],
          ],
        },
      },
      botToken
    );
    return NextResponse.json({ ok: true });
  }

  // ── Individual Natural Language AI Replies ─────────────────────────────────
  if (text && !text.startsWith("/")) {
    // Send typing action indicator
    await tgSend("sendChatAction", { chat_id: chatId, action: "typing" }, botToken);

    const aiReply = await generateAiTelegramReply(text, chatId, supabase);

    await tgSend(
      "sendMessage",
      {
        chat_id: chatId,
        text: aiReply,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: defaultButtons,
        },
      },
      botToken
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
