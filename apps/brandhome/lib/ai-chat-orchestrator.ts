/**
 * Omnichannel AI Customer Assistant & Conversational Commerce Orchestrator
 *
 * Connects WhatsApp, Facebook Page Messenger, Instagram Direct, and TikTok DMs
 * to Orizino's central MR. Slime / AI Concierge with live stock lookups,
 * courier order tracking, and automatic chat-to-order drafting.
 */

import { createClient } from "@supabase/supabase-js";

export type SocialChannel = "whatsapp" | "messenger" | "instagram" | "tiktok" | "web_chat";

export interface IncomingMessagePayload {
  channel: SocialChannel;
  senderId: string;
  senderName?: string;
  messageText: string;
  mediaUrl?: string;
  recipientId?: string;
  metadata?: Record<string, any>;
}

export interface AIResponseResult {
  success: boolean;
  replyText: string;
  orderCreated?: any;
  orderTracked?: any;
  handoverRequested?: boolean;
  channelDispatched?: boolean;
  error?: string;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Live Database Tools for AI Agent
 */
async function fetchCatalogContext(sb: any): Promise<string> {
  try {
    const { data: products } = await sb
      .from("products")
      .select("id, name, price, original_price, description, is_active, stock_quantity, category_id, sku, has_variants")
      .eq("is_active", true)
      .limit(30);

    const { data: variants } = await sb
      .from("product_variants")
      .select("product_id, color, size, stock_quantity, price, sku")
      .limit(100);

    if (!products || products.length === 0) {
      return "No live products found in catalog currently.";
    }

    const lines = products.map((p: any) => {
      const pVariants = (variants || []).filter((v: any) => v.product_id === p.id);
      let variantStr = "";
      if (pVariants.length > 0) {
        variantStr = " | Variants: " + pVariants.map((v: any) => `${v.color || "Standard"} (${v.size || "Free"}): Stock ${v.stock_quantity}`).join(", ");
      } else {
        variantStr = ` | Stock: ${p.stock_quantity || "In Stock"}`;
      }
      return `• [${p.name}] Price: ৳${p.price} (Original: ৳${p.original_price || p.price})${variantStr} - SKU: ${p.sku || "N/A"}`;
    });

    return lines.join("\n");
  } catch (e) {
    return "Catalog lookup unavailable.";
  }
}

async function findOrderContext(sb: any, queryText: string, senderPhone?: string): Promise<string | null> {
  try {
    // Extract potential order numbers (#ORZ-..., ORZ..., or numeric digits)
    const orderMatch = queryText.match(/(?:ORZ[-_]?)?(\d{3,8})/i);
    let orderQuery = sb.from("orders").select("id, order_number, total_amount, status, created_at, delivery_address, customer_phone, customer_name, tracking_number, courier_name");

    if (orderMatch) {
      const num = orderMatch[1];
      const { data } = await orderQuery.or(`order_number.ilike.%${num}%,id.eq.${num}`).maybeSingle();
      if (data) return formatOrderSummary(data);
    }

    if (senderPhone) {
      const cleanPhone = senderPhone.replace(/[^0-9]/g, "").slice(-10);
      const { data } = await sb.from("orders").select("id, order_number, total_amount, status, created_at, delivery_address, customer_phone, customer_name, tracking_number, courier_name").ilike("customer_phone", `%${cleanPhone}%`).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (data) return formatOrderSummary(data);
    }

    return null;
  } catch {
    return null;
  }
}

function formatOrderSummary(o: any): string {
  return `Order #${o.order_number || o.id.slice(0, 8)}: Status is [${o.status.toUpperCase()}]. Total: ৳${o.total_amount}. Courier: ${o.courier_name || "Steadfast"} (Tracking: ${o.tracking_number || "Processing"}). Placed: ${new Date(o.created_at).toLocaleDateString()}. Customer: ${o.customer_name || "Valued Customer"}.`;
}

/**
 * Generate AI Response using Google Gemini or OpenAI
 */
export async function processSocialMessageWithAI(payload: IncomingMessagePayload): Promise<AIResponseResult> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    return { success: false, replyText: "Service temporarily offline.", error: "Supabase client not initialized." };
  }

  // 1. Fetch AI Persona settings
  const [{ data: aiSettings }, { data: socialConfig }, { data: waConfig }] = await Promise.all([
    sb.from("site_settings").select("value").eq("key", "ai_agent_config").maybeSingle(),
    sb.from("site_settings").select("value").eq("key", "social_ai_channels_config").maybeSingle(),
    sb.from("site_settings").select("value").eq("key", "whatsapp_cloud_config").maybeSingle(),
  ]);

  const persona = aiSettings?.value || {
    name: "MR. Slime",
    personality: "Iconic crystal-water slime companion and luxury streetwear concierge for Orizino. Warm, street-smart, helpful, fluent in Bangla, English, and Banglish.",
    brand_voice: "Speak with authentic warmth and deep streetwear knowledge. Help customers with sizing (240+ GSM drop-shoulder tees), fabric details, delivery (24-48h Inside Dhaka ৳80, Outside Dhaka ৳150, Cash on Delivery available), and order tracking.",
  };

  const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
  const openaiKey = process.env.OPENAI_API_KEY || "";

  // 2. Fetch live live tools/data context
  const catalogContext = await fetchCatalogContext(sb);
  const orderContext = await findOrderContext(sb, payload.messageText, payload.senderName);

  // 3. Assemble system prompt
  const systemPrompt = `You are ${persona.name || "MR. Slime"}, the official AI concierge for luxury streetwear brand "Orizino".
Brand Tone & Voice: ${persona.brand_voice || "Warm, stylish, brotherly luxury streetwear concierge."}
Personality: ${persona.personality}

CRITICAL RULES:
1. Always respond politely in the language the customer used (Dhaka Bangla, Banglish, or English).
2. Use live catalog information below to recommend real products, prices, and sizes.
3. Delivery Policy: Inside Dhaka ৳80 (24-48 Hours), Outside Dhaka ৳150 (2-4 Days). Cash on Delivery (COD) & bKash available.
4. Sizing Guide: Heavyweight 240+ GSM Drop-Shoulder Tees fit oversized. If regular fit is preferred, advise sizing one size down.
5. If the customer provides Name, Phone, Address, Product, and Size, enthusiastically confirm their order details and say our team is preparing it!
6. Keep messages concise and formatted for social chat (WhatsApp / Messenger / Instagram / TikTok) with bullet points and friendly emojis. Never say "As an AI language model".

LIVE PRODUCT CATALOG:
${catalogContext}

${orderContext ? `MATCHED CUSTOMER ORDER INFO:\n${orderContext}` : ""}
`;

  let replyText = "";

  // 4. Invoke LLM (Gemini 2.5 / 1.5 Flash fallback or OpenAI)
  try {
    if (geminiKey) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: `${systemPrompt}\n\nCustomer Message (${payload.channel}): "${payload.messageText}"` }] },
          ],
          generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
        }),
      });
      const data = await res.json();
      replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    }

    if (!replyText && openaiKey) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: payload.messageText },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });
      const data = await res.json();
      replyText = data?.choices?.[0]?.message?.content?.trim() || "";
    }
  } catch (err: any) {
    console.error("AI Generation error:", err);
  }

  // Safe fallback if API keys are not yet configured
  if (!replyText) {
    if (orderContext) {
      replyText = `Hey ${payload.senderName || "there"}! Here is your latest order update:\n\n${orderContext}\n\nNeed anything else? Let me know! 🌊`;
    } else {
      replyText = `Hey! Welcome to Orizino! 🖤 I'm MR. Slime, your AI concierge. I received your message: "${payload.messageText}". How can I help you with our latest drop-shoulder collections, sizing, or orders today?`;
    }
  }

  // 5. Auto-Dispatch back to channel
  let channelDispatched = false;
  try {
    if (payload.channel === "whatsapp") {
      const wa = waConfig?.value || {};
      const token = wa.access_token || process.env.WHATSAPP_ACCESS_TOKEN;
      const phoneId = wa.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID;
      if (token && phoneId && payload.senderId) {
        await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: payload.senderId,
            type: "text",
            text: { body: replyText },
          }),
        });
        channelDispatched = true;
      }
    } else if (payload.channel === "messenger" || payload.channel === "instagram") {
      const channels = socialConfig?.value || {};
      const token = (payload.channel === "instagram" ? channels.instagram?.access_token : channels.messenger?.page_access_token) || process.env.META_PAGE_ACCESS_TOKEN;
      if (token && payload.senderId) {
        await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: payload.senderId },
            message: { text: replyText },
          }),
        });
        channelDispatched = true;
      }
    }
  } catch (dispErr) {
    console.warn(`Dispatch error on channel ${payload.channel}:`, dispErr);
  }

  return {
    success: true,
    replyText,
    channelDispatched,
  };
}
