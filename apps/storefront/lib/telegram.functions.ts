import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/telegram";

export interface TelegramBotConfig {
  bot_token?: string;
  use_direct_api: boolean;
  webhook_url?: string;
  welcome_text: string;
  order_template: string;
  support_template: string;
  call_template: string;
  daily_digest_template: string;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  commands_enabled: boolean;
  interactive_buttons: Array<{ label: string; url?: string; callback_data?: string }>;
}

export const defaultTelegramBotConfig: TelegramBotConfig = {
  bot_token: "",
  use_direct_api: false,
  webhook_url: "",
  welcome_text: "👋 Welcome to <b>ORIZINO Luxury Fit Studio Bot</b>!\n\nUse the buttons below to browse our collection, track your order, or reach our concierge team.",
  order_template: "🛍 <b>New Order Received!</b>\n\n<b>Order ID:</b> #{{order_id}}\n<b>Customer:</b> {{customer_name}}\n<b>Phone:</b> {{customer_phone}}\n<b>Total:</b> ৳{{total_amount}}\n<b>Payment:</b> {{payment_method}}\n<b>Items:</b>\n{{items_list}}\n\n📍 <i>{{shipping_address}}</i>",
  support_template: "💬 <b>Support Request Escalated</b>\n\n<b>Customer:</b> {{customer_name}}\n<b>Email / Phone:</b> {{customer_contact}}\n<b>Ticket:</b> #{{ticket_id}}\n<b>Message:</b>\n<i>\"{{message_snippet}}\"</i>",
  call_template: "📞 <b>Voice Call Alert</b>\n\n<b>Customer:</b> {{customer_name}}\n<b>Status:</b> {{call_status}}\n<b>Duration:</b> {{duration}}\n<b>Time:</b> {{call_time}}",
  daily_digest_template: "📊 <b>Daily Store Digest</b>\n\n<b>Total Orders:</b> {{total_orders}}\n<b>Gross Revenue:</b> ৳{{gross_revenue}}\n<b>Top Item:</b> {{top_product}}\n<b>Pending Dispatch:</b> {{pending_dispatch}}",
  quiet_hours_enabled: false,
  quiet_hours_start: "23:00",
  quiet_hours_end: "08:00",
  commands_enabled: true,
  interactive_buttons: [
    { label: "🛍 Shop Online", url: "https://orizino.com/shop" },
    { label: "📦 Track Order", url: "https://orizino.com/orders" },
    { label: "💬 Contact Concierge", url: "https://orizino.com/support" },
  ],
};

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

  const lovableKey = process.env.LOVABLE_API_KEY;
  const tgKey = process.env.TELEGRAM_API_KEY;
  if (!lovableKey || !tgKey) {
    throw new Error("Telegram credentials not configured.");
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

export const sendTelegramTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ chat_id: z.number(), text: z.string().min(1).max(2000).optional() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const config = await getStoredBotConfig(context.supabase);
    const token = config.use_direct_api ? config.bot_token : undefined;

    await tg("sendMessage", {
      chat_id: data.chat_id,
      text: data.text || "✅ <b>ORIZINO Telegram Bot Test</b>\n\nNotification gateway is fully operational and authenticated.",
      parse_mode: "HTML",
    }, token);
    return { ok: true };
  });

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
