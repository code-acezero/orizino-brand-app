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
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!page) return;
    const channelName = `presence:${page.replace(/\//g, "_")}`;
    const sessionId =
      sessionStorage.getItem("analytics_session_id") || crypto.randomUUID();

    const channel = supabase.channel(channelName, {
      config: { presence: { key: sessionId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ page, joined_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [page]);

  return count;
};
// code:4ce0
