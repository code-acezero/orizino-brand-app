/**
 * Telegram Bot Webhook Receiver
 * POST /api/public/hooks/telegram
 *
 * Registered via setWebhook from AdminTelegram.
 * Handles all inbound Telegram updates and replies to user commands individually.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { TelegramBotConfig } from "@/lib/telegram.types";
import { defaultTelegramBotConfig } from "@/lib/telegram.types";

function makeAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Supabase env vars not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function tgReply(token: string, method: string, body: object) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data as any)?.ok === false) {
    console.warn(`[telegram-webhook] ${method} error:`, (data as any)?.description ?? data);
  }
  return data;
}

async function loadConfig(sb: ReturnType<typeof makeAdmin>): Promise<TelegramBotConfig> {
  try {
    const { data } = await sb.from("site_settings").select("value").eq("key", "telegram_bot_config").maybeSingle();
    const raw = (data as any)?.value as any;
    if (!raw) return defaultTelegramBotConfig;
    const unwrapped = typeof raw === "object" && "value" in raw && typeof raw.value === "object" ? raw.value : raw;
    return { ...defaultTelegramBotConfig, ...unwrapped };
  } catch {
    return defaultTelegramBotConfig;
  }
}

async function loadSiteName(sb: ReturnType<typeof makeAdmin>): Promise<string> {
  try {
    const { data } = await sb.from("site_settings").select("value").eq("key", "site_name").maybeSingle();
    const v = (data as any)?.value as any;
    return (typeof v === "object" && v?.value ? v.value : v) || "ORIZINO";
  } catch {
    return "ORIZINO";
  }
}

async function upsertChat(sb: ReturnType<typeof makeAdmin>, chat: any) {
  if (!chat?.id) return;
  await sb.from("telegram_chats").upsert({
    chat_id: chat.id,
    title: chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(" ") || chat.username || String(chat.id),
    type: chat.type,
    username: chat.username ?? null,
    last_message_at: new Date().toISOString(),
  }, { onConflict: "chat_id" });
}

function buildKeyboard(config: TelegramBotConfig) {
  const buttons = (config.interactive_buttons || []).filter((b) => b.label && b.url);
  if (!buttons.length) return undefined;
  return { inline_keyboard: buttons.map((b) => [{ text: b.label, url: b.url }]) };
}

async function handleCommand(sb: ReturnType<typeof makeAdmin>, config: TelegramBotConfig, siteName: string, chatId: number, text: string, token: string) {
  const cmd = text.trim().toLowerCase();

  if (cmd.startsWith("/start") || cmd.startsWith("/help")) {
    await tgReply(token, "sendMessage", { chat_id: chatId, text: config.welcome_text, parse_mode: "HTML", reply_markup: buildKeyboard(config) });
    return;
  }

  if (cmd.startsWith("/order") || cmd.startsWith("/track")) {
    const parts = cmd.split(/\s+/);
    const orderQuery = parts[1]?.replace("#", "") || "";
    if (!orderQuery) {
      await tgReply(token, "sendMessage", { chat_id: chatId, text: `📦 <b>Order Lookup</b>\n\nProvide your Order ID:\n<code>/order ORZ-8821</code>`, parse_mode: "HTML" });
      return;
    }
    const { data: order } = await sb.from("orders").select("id, status, total_amount, payment_method, shipping_address, tracking_number").ilike("id", `%${orderQuery}%`).limit(1).maybeSingle();
    if (!order) {
      await tgReply(token, "sendMessage", { chat_id: chatId, text: `⚠️ <b>Order Not Found:</b> <code>#${orderQuery}</code>\n\nContact support if needed.`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "💬 Support", url: "https://orizino.com/support" }]] } });
      return;
    }
    const statusEmoji: Record<string, string> = { pending: "🕐", processing: "⚙️", shipped: "🚚", delivered: "✅", cancelled: "❌" };
    const emoji = statusEmoji[(order as any).status] || "📦";
    await tgReply(token, "sendMessage", { chat_id: chatId, text: `${emoji} <b>Order #${String((order as any).id).slice(0,8).toUpperCase()}</b>\n\n<b>Status:</b> ${(order as any).status.toUpperCase()}\n<b>Total:</b> ৳${(order as any).total_amount}\n<b>Payment:</b> ${(order as any).payment_method || "COD"}${(order as any).tracking_number ? `\n<b>Tracking:</b> <code>${(order as any).tracking_number}</code>` : ""}\n📍 <i>${(order as any).shipping_address || "Dhaka, Bangladesh"}</i>`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔍 View Details", url: `https://orizino.com/orders/${(order as any).id}` }], [{ text: "💬 Support", url: "https://orizino.com/support" }]] } });
    return;
  }

  if (cmd.startsWith("/product") || cmd.startsWith("/find")) {
    const query = cmd.split(/\s+/).slice(1).join(" ");
    if (!query) { await tgReply(token, "sendMessage", { chat_id: chatId, text: `🔍 <b>Product Search</b>\n\nExample: <code>/product jersey</code>`, parse_mode: "HTML" }); return; }
    const { data: products } = await sb.from("products").select("name, price, category").ilike("name", `%${query}%`).eq("status", "active").limit(5);
    if (!products?.length) { await tgReply(token, "sendMessage", { chat_id: chatId, text: `⚠️ No products found for "<i>${query}</i>"`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🛍 Browse Shop", url: "https://orizino.com/shop" }]] } }); return; }
    const list = (products as any[]).map((p: any) => `• <b>${p.name}</b>${p.price ? ` — ৳${p.price}` : ""}${p.category ? ` <i>(${p.category})</i>` : ""}`).join("\n");
    await tgReply(token, "sendMessage", { chat_id: chatId, text: `🛍 <b>Results for "${query}"</b>\n\n${list}`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "See All", url: `https://orizino.com/shop?q=${encodeURIComponent(query)}` }]] } });
    return;
  }

  if (cmd.startsWith("/brand") || cmd.startsWith("/about")) {
    const { data: rows } = await sb.from("site_settings").select("key, value").in("key", ["site_tagline", "site_description", "social_instagram"]);
    const setting = (key: string) => { const row = (rows as any[])?.find((r: any) => r.key === key); const v = row?.value as any; return (typeof v === "object" && v?.value ? v.value : v) || ""; };
    const tagline = setting("site_tagline") || "Luxury Fashion for the Bold";
    const desc = setting("site_description") || "";
    const ig = setting("social_instagram") || "";
    await tgReply(token, "sendMessage", { chat_id: chatId, text: `✨ <b>${siteName}</b>\n\n<i>${tagline}</i>${desc ? `\n\n${desc}` : ""}${ig ? `\n\n📸 <a href="${ig}">Follow on Instagram</a>` : ""}`, parse_mode: "HTML", disable_web_page_preview: true, reply_markup: buildKeyboard(config) });
    return;
  }

  if (cmd.startsWith("/status")) {
    const [{ count: pending }, { count: tickets }] = await Promise.all([
      sb.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
      sb.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
    ]);
    await tgReply(token, "sendMessage", { chat_id: chatId, text: `🟢 <b>${siteName} Status</b>\n\n<b>Server:</b> Operational ✅\n<b>Pending Orders:</b> ${pending ?? 0}\n<b>Open Tickets:</b> ${tickets ?? 0}`, parse_mode: "HTML" });
    return;
  }

  await tgReply(token, "sendMessage", { chat_id: chatId, text: `ℹ️ <b>Commands:</b>\n\n/start — Welcome\n/order &lt;ID&gt; — Track order\n/product &lt;name&gt; — Search products\n/brand — About ${siteName}\n/status — Store health\n/help — This guide`, parse_mode: "HTML", reply_markup: buildKeyboard(config) });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "telegram-webhook", status: "listening" });
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    const sb = makeAdmin();
    const [config, siteName] = await Promise.all([loadConfig(sb), loadSiteName(sb)]);

    const token = (config.use_direct_api && config.bot_token) ? config.bot_token : (process.env.TELEGRAM_BOT_TOKEN || "");
    if (!token) { console.error("[telegram-webhook] No bot token configured"); return NextResponse.json({ ok: true }); }

    const message = update.message || update.edited_message || update.channel_post || update.callback_query?.message;
    const chat = message?.chat || update.my_chat_member?.chat;

    if (chat) await upsertChat(sb, chat);

    if (update.callback_query) {
      await tgReply(token, "answerCallbackQuery", { callback_query_id: update.callback_query.id });
    }

    if (message?.text && chat?.id) {
      const text: string = message.text;
      if (text.startsWith("/") && config.commands_enabled !== false) {
        if (config.quiet_hours_enabled) {
          const now = new Date();
          const hhmm = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
          const start = config.quiet_hours_start || "23:00";
          const end = config.quiet_hours_end || "08:00";
          const inQuiet = start > end ? hhmm >= start || hhmm < end : hhmm >= start && hhmm < end;
          if (inQuiet) {
            await tgReply(token, "sendMessage", { chat_id: chat.id, text: `🌙 <b>Quiet hours active</b> (${start}–${end})\n\nWe will get back to you shortly!`, parse_mode: "HTML" });
            return NextResponse.json({ ok: true });
          }
        }
        await handleCommand(sb, config, siteName, chat.id, text, token);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[telegram-webhook] Error:", err?.message ?? err);
    return NextResponse.json({ ok: true });
  }
}
