import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { broadcastToTelegram } from "./telegram.functions";

/**
 * Flag a support conversation as needing human handoff and broadcast a ping
 * to any Telegram chat subscribed to `notify_support`.
 */
export const flagHandoffToHuman = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        conversation_id: z.string().uuid(),
        summary: z.string().min(1).max(800).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const sb: any = context.supabase;

    // Must own the conversation (RLS will also enforce)
    const { data: conv, error: cErr } = await sb
      .from("support_conversations")
      .select("id, user_id, subject")
      .eq("id", data.conversation_id)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!conv) throw new Error("Conversation not found");
    if (conv.user_id !== context.userId) throw new Error("Forbidden");

    await sb
      .from("support_conversations")
      .update({
        needs_human: true,
        is_ai: false,
        status: "open",
        updated_at: new Date().toISOString(),
      })
      .eq("id", conv.id);

    // Fetch a profile snippet for the telegram message
    const { data: profile } = await sb
      .from("profiles")
      .select("full_name, phone")
      .eq("id", conv.user_id)
      .maybeSingle();

    const who = profile?.full_name || profile?.phone || "Customer";
    const summary = data.summary?.slice(0, 600) || "Customer requested live support.";
    const text =
      `<b>🆘 Handoff to human</b>\n` +
      `<b>From:</b> ${who}\n` +
      `<b>Subject:</b> ${conv.subject || "Support"}\n\n` +
      summary;

    let broadcast = { sent: 0, failed: 0 };
    try {
      broadcast = await broadcastToTelegram(sb, "notify_support", text);
    } catch (e) {
      console.warn("[handoff] telegram broadcast failed", e);
    }

    return { ok: true, conversation_id: conv.id, broadcast };
  });

/** Read or upsert the caller's AI memory. */
export const getAiMemory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as any)
      .from("ai_user_memory")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { memory: data ?? null };
  });

export const updateAiMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        tone: z.string().max(120).optional(),
        interests: z.array(z.string().max(80)).max(40).optional(),
        recent_intents: z.array(z.string().max(120)).max(20).optional(),
        last_viewed_products: z.array(z.string().uuid()).max(20).optional(),
        preferred_categories: z.array(z.string().uuid()).max(20).optional(),
        notes: z.record(z.string(), z.any()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const row = { user_id: context.userId, ...data };
    const { error } = await (context.supabase as any)
      .from("ai_user_memory")
      .upsert(row, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
