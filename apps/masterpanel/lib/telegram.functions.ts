import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/telegram";

function envOrThrow(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

async function tg(path: string, body?: unknown): Promise<any> {
  const lovableKey = envOrThrow("LOVABLE_API_KEY");
  const tgKey = envOrThrow("TELEGRAM_API_KEY");
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

/** Poll Telegram getUpdates and upsert any chat the bot has seen. */
export const syncTelegramChats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb: any = context.supabase;

    const { data: state } = await sb.from("telegram_state").select("last_update_id").eq("id", 1).maybeSingle();
    const offset = (state?.last_update_id ?? 0) + 1;

    const updates: any[] = await tg("getUpdates", { offset, timeout: 0, allowed_updates: ["message", "channel_post", "my_chat_member"] });

    let maxId = state?.last_update_id ?? 0;
    const chats = new Map<number, any>();
    for (const u of updates) {
      if (typeof u.update_id === "number" && u.update_id > maxId) maxId = u.update_id;
      const msg = u.message || u.channel_post || u.edited_message || u.my_chat_member;
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
    await tg("sendMessage", {
      chat_id: data.chat_id,
      text: data.text || "✅ Orizino bot test — notifications are working.",
      parse_mode: "HTML",
    });
    return { ok: true };
  });

/** Internal helper used by other server functions to broadcast. */
export async function broadcastToTelegram(
  supabaseAdmin: any,
  flag: "notify_orders" | "notify_support" | "notify_calls",
  text: string,
): Promise<{ sent: number; failed: number }> {
  const { data: chats } = await supabaseAdmin
    .from("telegram_chats")
    .select("chat_id")
    .eq(flag, true);
  let sent = 0;
  let failed = 0;
  for (const c of chats ?? []) {
    try {
      await tg("sendMessage", { chat_id: c.chat_id, text, parse_mode: "HTML", disable_web_page_preview: true });
      sent++;
    } catch (e) {
      console.warn("[telegram broadcast] failed", c.chat_id, e);
      failed++;
    }
  }
  return { sent, failed };
}
// code:4ce0
