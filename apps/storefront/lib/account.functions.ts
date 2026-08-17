"use server";

import { createServerFn } from "@/lib/server-fn-compat";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const exportOwnData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [profile, orders, addresses, wishlist, cart, prefs] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("orders").select("*").eq("user_id", userId),
      supabase.from("user_addresses").select("*").eq("user_id", userId),
      supabase.from("wishlist_items").select("*").eq("user_id", userId),
      supabase.from("cart_items").select("*").eq("user_id", userId),
      supabase.from("user_preferences").select("*").eq("user_id", userId),
    ]);
    return {
      exported_at: new Date().toISOString(),
      user_id: userId,
      profile: profile.data ?? null,
      orders: orders.data ?? [],
      addresses: addresses.data ?? [],
      wishlist: wishlist.data ?? [],
      cart: cart.data ?? [],
      preferences: prefs.data ?? [],
    };
  });

export const deleteOwnAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    // Best-effort cleanup; auth user deletion cascades most rows via FK or RLS-allowed self-delete will handle the rest.
    try {
      await Promise.allSettled([
        supabaseAdmin.from("cart_items").delete().eq("user_id", userId),
        supabaseAdmin.from("wishlist_items").delete().eq("user_id", userId),
        supabaseAdmin.from("user_addresses").delete().eq("user_id", userId),
        supabaseAdmin.from("email_subscriptions").update({ is_active: false, unsubscribed_at: new Date().toISOString() }).eq("user_id", userId),
        supabaseAdmin.from("profiles").delete().eq("id", userId),
      ]);
    } catch (e) {
      console.error("[deleteOwnAccount] cleanup error", e);
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
