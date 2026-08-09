"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PresenceUser {
  id: string;
  name: string;
  avatarUrl?: string;
  online_at: string;
}

/**
 * Tracks other admins currently viewing the control center via Supabase Realtime presence.
 */
export function useAdminPresence(name?: string, avatarUrl?: string) {
  const { user } = useAuth();
  const [users, setUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel("admin-presence", {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser>();
        const list = Object.values(state).flat() as PresenceUser[];
        setUsers(list);
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        await channel.track({
          id: user.id,
          name: name || user.email || "Admin",
          avatarUrl,
          online_at: new Date().toISOString(),
        });
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, name, avatarUrl]);

  return users;
}
// code:4ce0
