"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@orizino/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Hook that uses Supabase Realtime Presence to track and return
 * the number of users currently viewing a given page.
 */
export const useRealtimeVisitors = (page: string | null = "/home") => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!page || typeof window === "undefined") return;

    let isMounted = true;
    const channelName = `presence:${page.replace(/\//g, "_")}_${Math.random().toString(36).slice(2, 8)}`;
    
    let sessionId: string;
    try {
      sessionId = sessionStorage.getItem("analytics_session_id") || crypto.randomUUID();
      sessionStorage.setItem("analytics_session_id", sessionId);
    } catch {
      sessionId = Math.random().toString(36).slice(2);
    }

    const channel = supabase.channel(channelName, {
      config: { presence: { key: sessionId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        if (!isMounted) return;
        try {
          const state = channel.presenceState();
          setCount(Object.keys(state).length);
        } catch {}
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && isMounted) {
          try {
            await channel.track({ page, joined_at: new Date().toISOString() });
          } catch {}
        }
      });

    return () => {
      isMounted = false;
      try {
        channel.untrack();
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [page]);

  return count;
};
// code:4ce0
