import { supabase } from "@/integrations/supabase/client";

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

const FALLBACK_STUN: IceServerConfig[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

let cached: { servers: IceServerConfig[]; ts: number } | null = null;
const CACHE_MS = 5 * 60 * 1000;

/**
 * Returns ICE servers including TURN relays for WebRTC.
 *
 * Strategy:
 *  1. Call the `get-ice-servers` edge function (uses server-side METERED_API_KEY).
 *  2. Fall back to optional self-hosted Coturn from `voice_call_config` site setting.
 *  3. Last resort: public STUN only (works on same network only).
 */
export async function getIceServers(): Promise<IceServerConfig[]> {
  if (cached && Date.now() - cached.ts < CACHE_MS) {
    return cached.servers;
  }

  const servers: IceServerConfig[] = [];

  // 1. Edge function (Metered TURN, server-side credentials)
  try {
    const { data, error } = await supabase.functions.invoke("get-ice-servers");
    if (!error && data?.iceServers && Array.isArray(data.iceServers)) {
      servers.push(...data.iceServers);
    }
  } catch (e) {
    console.warn("get-ice-servers edge function failed:", e);
  }

  // 2. Self-hosted Coturn (optional, configured via admin)
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "voice_call_config")
      .maybeSingle();
    const config = (data?.value as any) || {};
    if (config.coturn_enabled && config.coturn_url) {
      const raw = config.coturn_url as string;
      const coturnUrl = /^(turn|turns|stun):/.test(raw) ? raw : `turn:${raw}`;
      servers.push({
        urls: coturnUrl,
        username: config.coturn_username || undefined,
        credential: config.coturn_credential || undefined,
      });
    }
  } catch {
    /* ignore */
  }

  if (servers.length === 0) {
    servers.push(...FALLBACK_STUN);
  }

  cached = { servers, ts: Date.now() };
  return servers;
}

/**
 * Returns a recommended RTCConfiguration with TURN relay enabled.
 * Set `forceRelay` to true to test cross-network calls (forces TURN).
 */
export async function getRTCConfiguration(
  forceRelay = false,
): Promise<RTCConfiguration> {
  const iceServers = await getIceServers();
  const hasTurn = iceServers.some((s) => {
    const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
    return urls.some((u) => u.startsWith("turn:") || u.startsWith("turns:"));
  });

  if (!hasTurn) {
    console.warn(
      "[WebRTC] No TURN servers available — calls across networks will likely fail.",
    );
  }

  return {
    iceServers: iceServers as RTCIceServer[],
    iceTransportPolicy: forceRelay ? "relay" : "all",
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
    iceCandidatePoolSize: 4,
  };
}
