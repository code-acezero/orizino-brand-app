"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AUTH_RESTORE_TIMEOUT_MS = 8_000;

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
  const initialSessionRestored = useRef(false);

  useEffect(() => {
    let active = true;
    let restoreTimer: ReturnType<typeof window.setTimeout> | undefined;

    const finishInitialRestore = (nextSession: Session | null) => {
      if (!active) return;
      if (restoreTimer) window.clearTimeout(restoreTimer);
      initialSessionRestored.current = true;
      setSession(nextSession);
      setLoading(false);
    };

    restoreTimer = window.setTimeout(() => {
      finishInitialRestore(null);
    }, AUTH_RESTORE_TIMEOUT_MS);

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        finishInitialRestore(session);
      })
      .catch(() => {
        finishInitialRestore(null);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      setSession(nextSession);

      if (
        initialSessionRestored.current ||
        event === "INITIAL_SESSION" ||
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED"
      ) {
        finishInitialRestore(nextSession);
      }
    });

    return () => {
      active = false;
      if (restoreTimer) window.clearTimeout(restoreTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    initialSessionRestored.current = true;
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
// code:4ce0
