"use server";

import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type TelegramBotConfig, defaultTelegramBotConfig } from "./telegram.types";

const GATEWAY = "https://connector-gateway.lovable.dev/telegram";

async function getStoredBotConfig(supabase: any): Promise<TelegramBotConfig> {
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "telegram_bot_config")
    .maybeSingle();
  const raw = data?.value as any;
  if (!raw) return defaultTelegramBotConfig;
  const unwrapped = typeof raw === "object" && "value" in raw && typeof raw.value === "object" ? raw.value : raw;
  return { ...defaultTelegramBotConfig, ...unwrapped };
}

async function tg(path: string, body?: unknown, customToken?: string): Promise<any> {
  const token = customToken || process.env.TELEGRAM_BOT_TOKEN;
  
  // If direct bot token is provided, talk directly to api.telegram.org
  if (token) {
    const res = await fetch(`https://api.telegram.org/bot${token}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) {
      throw new Error(`Telegram API ${path} error: ${data?.description || JSON.stringify(data)}`);
    }
    return data.result ?? data;
  }

  // Fallback to connector gateway
  const lovableKey = process.env.LOVABLE_API_KEY;
  const tgKey = process.env.TELEGRAM_API_KEY;
  if (!lovableKey || !tgKey) {
    throw new Error("Telegram credentials not configured. Please enter a Bot Token or configure environment keys.");
  }

  const res = await fetch(`${GATEWAY}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": tgKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    throw new Error(`Telegram ${path} failed [${res.status}]: ${JSON.stringify(data)}`);
  }
  return data.result ?? data;
}

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" as any });
  if (!data) throw new Error("Forbidden: admins only");
}

/** Get Bot details from getMe */
export const getTelegramBotInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const config = await getStoredBotConfig(context.supabase);
    try {
      const info = await tg("getMe", {}, config.use_direct_api ? config.bot_token : undefined);
      return { ok: true, bot: info };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

/** Get Webhook info */
export const getTelegramWebhookInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const config = await getStoredBotConfig(context.supabase);
    try {
      const info = await tg("getWebhookInfo", {}, config.use_direct_api ? config.bot_token : undefined);
      return { ok: true, webhook: info };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

/** Set or Delete Webhook */
export const setTelegramWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ url: z.string().url().or(z.literal("")) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const config = await getStoredBotConfig(context.supabase);
    const token = config.use_direct_api ? config.bot_token : undefined;
    if (data.url) {
      await tg("setWebhook", { url: data.url, allowed_updates: ["message", "callback_query", "my_chat_member"] }, token);
    } else {
      await tg("deleteWebhook", { drop_pending_updates: false }, token);
    }
    return { ok: true };
  });

/** Poll Telegram getUpdates and upsert any chat the bot has seen. */
export const syncTelegramChats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb: any = context.supabase;
    const config = await getStoredBotConfig(sb);
    const token = config.use_direct_api ? config.bot_token : undefined;

    const { data: state } = await sb.from("telegram_state").select("last_update_id").eq("id", 1).maybeSingle();
    const offset = (state?.last_update_id ?? 0) + 1;

    const updates: any[] = await tg("getUpdates", { offset, timeout: 0, allowed_updates: ["message", "channel_post", "my_chat_member", "callback_query"] }, token);

    let maxId = state?.last_update_id ?? 0;
    const chats = new Map<number, any>();
    for (const u of updates) {
      if (typeof u.update_id === "number" && u.update_id > maxId) maxId = u.update_id;
      const msg = u.message || u.channel_post || u.edited_message || u.my_chat_member || u.callback_query?.message;
      const chat = msg?.chat;
      if (chat?.id) {
        chats.set(chat.id, {
          chat_id: chat.id,
          title: chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(" ") || chat.username || String(chat.id),
          type: chat.type,
          username: chat.username ?? null,
          last_message_at: new Date().toISOString(),
        });
      }
    }

    let upserted = 0;
    if (chats.size) {
      const rows = Array.from(chats.values());
      const { error } = await sb.from("telegram_chats").upsert(rows, { onConflict: "chat_id" });
      if (error) throw new Error(error.message);
      upserted = rows.length;
    }

    if (maxId !== (state?.last_update_id ?? 0)) {
      await sb.from("telegram_state").upsert({ id: 1, last_update_id: maxId, updated_at: new Date().toISOString() });
    }

    return { fetched: updates.length, upserted, last_update_id: maxId };
  });

export const listTelegramChats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await (context.supabase as any)
      .from("telegram_chats")
      .select("*")
      .order("last_message_at", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);
    return { chats: data ?? [] };
  });

export const updateTelegramChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        chat_id: z.number(),
        notify_orders: z.boolean().optional(),
        notify_support: z.boolean().optional(),
        notify_calls: z.boolean().optional(),
        title: z.string().max(255).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { chat_id, ...patch } = data;
    const { error } = await (context.supabase as any)
      .from("telegram_chats")
      .update(patch)
      .eq("chat_id", chat_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTelegramChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ chat_id: z.number() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await (context.supabase as any)
      .from("telegram_chats")
      .delete()
      .eq("chat_id", data.chat_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendTelegramTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        chat_id: z.number(),
        text: z.string().min(1).max(4000).optional(),
        include_buttons: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const config = await getStoredBotConfig(context.supabase);
    const token = config.use_direct_api ? config.bot_token : undefined;

    const payload: any = {
      chat_id: data.chat_id,
      text: data.text || "✅ <b>ORIZINO Telegram Bot Test</b>\n\nNotification gateway is fully operational and authenticated.",
      parse_mode: "HTML",
    };

    if (data.include_buttons && config.interactive_buttons?.length) {
      payload.reply_markup = {
        inline_keyboard: config.interactive_buttons
          .filter((b) => b.label && b.url)
          .map((b) => [{ text: b.label, url: b.url }]),
      };
    }

    await tg("sendMessage", payload, token);
    return { ok: true };
  });

export const broadcastTelegramMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        text: z.string().min(1).max(4000),
        chat_ids: z.array(z.number()).optional(),
        target_group: z.enum(["all", "orders_team", "support_team", "selected"]).default("all"),
        include_buttons: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb: any = context.supabase;
    const config = await getStoredBotConfig(sb);
    const token = config.use_direct_api ? config.bot_token : undefined;

    let targetChats: any[] = [];
    if (data.target_group === "selected" && data.chat_ids?.length) {
      const { data: c } = await sb.from("telegram_chats").select("chat_id").in("chat_id", data.chat_ids);
      targetChats = c || [];
    } else if (data.target_group === "orders_team") {
      const { data: c } = await sb.from("telegram_chats").select("chat_id").eq("notify_orders", true);
      targetChats = c || [];
    } else if (data.target_group === "support_team") {
      const { data: c } = await sb.from("telegram_chats").select("chat_id").eq("notify_support", true);
      targetChats = c || [];
    } else {
      const { data: c } = await sb.from("telegram_chats").select("chat_id");
      targetChats = c || [];
    }

    let sent = 0;
    let failed = 0;
    const payload: any = {
      text: data.text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };

    if (data.include_buttons && config.interactive_buttons?.length) {
      payload.reply_markup = {
        inline_keyboard: config.interactive_buttons
          .filter((b) => b.label && b.url)
          .map((b) => [{ text: b.label, url: b.url }]),
      };
    }

    for (const c of targetChats) {
      try {
        await tg("sendMessage", { ...payload, chat_id: c.chat_id }, token);
        sent++;
      } catch (err) {
        console.warn("[telegram broadcast error]", c.chat_id, err);
        failed++;
      }
    }

    return { sent, failed, total: targetChats.length };
  });

/** Helper to simulate bot command response in UI */
export const simulateBotCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ command: z.string().min(1) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb: any = context.supabase;
    const config = await getStoredBotConfig(sb);
    const cmd = data.command.trim().toLowerCase();

    if (cmd.startsWith("/start") || cmd === "start") {
      return {
        reply: config.welcome_text,
        buttons: config.interactive_buttons,
      };
    }

    if (cmd.startsWith("/order") || cmd.startsWith("/track")) {
      const parts = cmd.split(" ");
      const orderQuery = parts[1] || "";
      if (!orderQuery) {
        return {
          reply: "📦 <b>Order Lookup</b>\n\nPlease provide an Order ID: e.g. <code>/order ORZ-8821</code>",
          buttons: [{ label: "🛍 View All Orders", url: "https://orizino.com/orders" }],
        };
      }

      const cleanId = orderQuery.replace("#", "");
      const { data: order } = await sb
        .from("orders")
        .select("id, status, total_amount, payment_method, shipping_address, tracking_number, items")
        .ilike("id", `%${cleanId}%`)
        .limit(1)
        .maybeSingle();

      if (!order) {
        return {
          reply: `⚠️ <b>Order Not Found:</b> <code>#${cleanId}</code>\nPlease verify your order reference or contact support.`,
          buttons: [{ label: "💬 Contact Support", url: "https://orizino.com/support" }],
        };
      }

      return {
        reply: `📦 <b>Order #${order.id.slice(0, 8)}</b>\n\n<b>Status:</b> ${order.status.toUpperCase()}\n<b>Total:</b> ৳${order.total_amount}\n<b>Payment:</b> ${order.payment_method || "COD"}\n${order.tracking_number ? `<b>Tracking:</b> <code>${order.tracking_number}</code>\n` : ""}📍 <i>${order.shipping_address || "Dhaka, Bangladesh"}</i>`,
        buttons: [
          { label: "🔍 View Full Details", url: `https://orizino.com/orders/${order.id}` },
          { label: "💬 Live Support", url: "https://orizino.com/support" },
        ],
      };
    }

    if (cmd.startsWith("/status") || cmd === "health") {
      const { count: pendingOrders } = await sb.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending");
      const { count: openTickets } = await sb.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open");
      return {
        reply: `🟢 <b>ORIZINO Store Status</b>\n\n<b>Server:</b> Operational (Healthy)\n<b>Pending Orders:</b> ${pendingOrders || 0}\n<b>Active Support Tickets:</b> ${openTickets || 0}\n<b>Gateway:</b> WebRTC & Telegram Online`,
        buttons: [{ label: "⚙️ MasterPanel", url: "https://orizino.com/admin" }],
      };
    }

    return {
      reply: `ℹ️ <b>Available Commands:</b>\n\n/start - Main menu & store links\n/order &lt;ID&gt; - Live order tracking & invoice status\n/status - Live store & server health status\n/help - Show this guide`,
      buttons: config.interactive_buttons,
    };
  });

/** Internal helper used by other server functions to broadcast. */
export async function broadcastToTelegram(
  supabaseAdmin: any,
  flag: "notify_orders" | "notify_support" | "notify_calls",
  text: string,
  extraButtons?: Array<{ text: string; url: string }>,
): Promise<{ sent: number; failed: number }> {
  const config = await getStoredBotConfig(supabaseAdmin);
  const token = config.use_direct_api ? config.bot_token : undefined;

  const { data: chats } = await supabaseAdmin
    .from("telegram_chats")
    .select("chat_id")
    .eq(flag, true);

  let sent = 0;
  let failed = 0;

  const payload: any = {
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };

  if (extraButtons?.length) {
    payload.reply_markup = {
      inline_keyboard: extraButtons.map((b) => [{ text: b.text, url: b.url }]),
    };
  }

  for (const c of chats ?? []) {
    try {
      await tg("sendMessage", { ...payload, chat_id: c.chat_id }, token);
      sent++;
    } catch (e) {
      console.warn("[telegram broadcast] failed", c.chat_id, e);
      failed++;
    }
  }
  return { sent, failed };
}
