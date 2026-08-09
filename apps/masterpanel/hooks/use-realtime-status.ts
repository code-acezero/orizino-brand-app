"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RealtimeStatus = "live" | "connecting" | "offline";

/**
 * Tracks Supabase Realtime connection status.
 * Local implementation to avoid the deprecated MediaQueryList.addListener
 * call in @orizino/shared.
 */
export function useRealtimeStatus(): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>("connecting");

  useEffect(() => {
    // Probe with a dummy channel
    const ch = supabase.channel("realtime-health-probe");

    ch.subscribe((s) => {
      if (s === "SUBSCRIBED") setStatus("live");
      else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") setStatus("offline");
      else setStatus("connecting");
    });

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  return status;
}
// code:4ce0
