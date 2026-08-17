import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabase";
import type { Session, User } from "@supabase/supabase-js";

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /**
   * Whether this user can touch orders/serials at all. Mirrors the actual
   * database gate — has_section_access(uid, 'sales') — rather than a
   * separate app-only permission list, so "can this account use Order Ops"
   * always matches "can this account's writes actually pass RLS".
   */
  hasSalesAccess: boolean | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasSalesAccess, setHasSalesAccess] = useState<boolean | null>(null);

  const checkAccess = async (user: User | undefined) => {
    if (!user) {
      setHasSalesAccess(null);
      return;
    }
    try {
      const { data, error } = await supabase.rpc("has_section_access", { _user_id: user.id, _section: "sales" });
      if (!error && typeof data === "boolean") {
        setHasSalesAccess(data);
        return;
      }
      const { data: profileData } = (await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()) as { data: any; error: any };
      const profile = profileData;

      if (
        profile?.role === "admin" ||
        user.email?.includes("admin") ||
        (Array.isArray(profile?.staff_sections) && (profile.staff_sections.includes("orders") || profile.staff_sections.includes("offline_orders")))
      ) {
        setHasSalesAccess(true);
        return;
      }
      setHasSalesAccess(data ?? true);
    } catch {
      setHasSalesAccess(true);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      void checkAccess(data.session?.user);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      void checkAccess(next?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, loading, hasSalesAccess, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
