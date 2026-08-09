"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@orizino/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync guest cart items to logged in user's DB cart
  const syncGuestCartToUser = async (userId: string) => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("guest_cart");
      if (!raw) return;
      const guestItems = JSON.parse(raw);
      if (!Array.isArray(guestItems) || guestItems.length === 0) return;

      for (const item of guestItems) {
        if (!item.product_id) continue;
        const { data: existing } = await supabase
          .from("cart_items")
          .select("id, quantity")
          .eq("user_id", userId)
          .eq("product_id", item.product_id)
          .eq("variant_id", item.variant_id || null)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("cart_items")
            .update({ quantity: existing.quantity + (item.qty || 1) })
            .eq("id", existing.id);
        } else {
          await supabase.from("cart_items").insert({
            user_id: userId,
            product_id: item.product_id,
            variant_id: item.variant_id || null,
            quantity: item.qty || 1,
          });
        }
      }
      localStorage.removeItem("guest_cart");
      window.dispatchEvent(new CustomEvent("guest-cart-updated"));
    } catch (e) {
      console.warn("[auth-context] Failed to sync guest cart", e);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setLoading(false);
        if (newSession?.user && (event === "SIGNED_IN" || event === "USER_UPDATED")) {
          syncGuestCartToUser(newSession.user.id);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setLoading(false);
      if (initialSession?.user) {
        syncGuestCartToUser(initialSession.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("orizino_checkout_active_session");
      sessionStorage.removeItem("orizino_is_buy_now");
      sessionStorage.removeItem("orizino_buy_now_item");
      localStorage.removeItem("orizino_is_buy_now");
      localStorage.removeItem("orizino_buy_now_item");

      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("orizino_checkout_session_")) {
            localStorage.removeItem(key);
          }
        });
      } catch {}
      window.dispatchEvent(new CustomEvent("guest-cart-updated"));
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
// code:4ce0
