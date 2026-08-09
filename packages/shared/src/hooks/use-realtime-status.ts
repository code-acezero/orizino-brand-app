"use client";
import { useEffect, useState } from "react";
import { supabase } from "@orizino/supabase/client";

export type RealtimeStatus = "live" | "connecting" | "offline";

/**
 * Tracks real connectivity:
 * - navigator.onLine for network status
 * - Supabase realtime channel subscription state for backend connection
 */
export function useRealtimeStatus(): RealtimeStatus {
  const [online, setOnline] = useState<boolean>(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [channelState, setChannelState] = useState<
    "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED" | "JOINING"
  >("JOINING");

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("admin-presence-status")
      .subscribe((status) => {
        setChannelState(status as typeof channelState);
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!online) return "offline";
  if (channelState === "SUBSCRIBED") return "live";
  if (channelState === "CHANNEL_ERROR" || channelState === "CLOSED" || channelState === "TIMED_OUT")
    return "offline";
  return "connecting";
}
// code:4ce0
