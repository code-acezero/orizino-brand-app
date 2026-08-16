import { createSign } from "node:crypto";

/**
 * Minimal Google service-account auth (JWT-bearer flow), used to call
 * Google Sheets and Search Console directly.
 *
 * Supports credentials from:
 * 1. Environment variables (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`)
 * 2. Supabase `site_settings.google_service_account` (configured via Masterpanel UI)
 */

interface TokenCacheEntry {
  token: string;
  expiresAt: number;
}

const tokenCache = new Map<string, TokenCacheEntry>();

export async function loadCredentials(): Promise<{ email: string; privateKey: string; source: "env" | "db" }> {
  // 1. Check environment variables
  let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (email && rawKey) {
    const privateKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;
    return { email: email.trim(), privateKey: privateKey.trim(), source: "env" };
  }

  // 2. Check site_settings in Supabase
  const sbUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (sbUrl && sbKey) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(sbUrl, sbKey);
      const { data } = await sb
        .from("site_settings")
        .select("value")
        .eq("key", "google_service_account")
        .maybeSingle();

      const val = data?.value;
      if (val && typeof val === "object") {
        email = val.client_email || val.email;
        rawKey = val.private_key || val.privateKey;
        if (email && rawKey) {
          const privateKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;
          return { email: email.trim(), privateKey: privateKey.trim(), source: "db" };
        }
      }
    } catch (err) {
      console.warn("Failed to load Google credentials from DB:", err);
    }
  }

  throw new Error(
    "Google Service Account is not connected yet. Paste your Service Account JSON key in Google Sheets Settings or configure GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY."
  );
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function requestAccessToken(scopes: readonly string[] | string[]): Promise<TokenCacheEntry> {
  const { email, privateKey } = await loadCredentials();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: email,
    scope: scopes.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signature = base64url(createSign("RSA-SHA256").update(unsigned).end().sign(privateKey));
  const assertion = `${unsigned}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Google auth failed [${res.status}]: ${json.error_description ?? json.error ?? "unknown error"}`
    );
  }
  return { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
}

/** Returns a cached or freshly-minted access token for the given scopes. */
export async function googleAccessToken(scopes: readonly string[] | string[]): Promise<string> {
  const cacheKey = [...scopes].sort().join(" ");
  const cached = tokenCache.get(cacheKey);
  // Refresh a minute early so a slow request never races an expiring token.
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  const fresh = await requestAccessToken(scopes);
  tokenCache.set(cacheKey, fresh);
  return fresh.token;
}

/** Returns active Google Service Account information for UI display */
export async function getGoogleServiceAccountInfo(): Promise<{
  configured: boolean;
  email?: string;
  source?: "env" | "db";
  error?: string;
}> {
  const DEFAULT_SERVICE_EMAIL = "sheets-orz@orizino-integrations.iam.gserviceaccount.com";
  try {
    const { email, source } = await loadCredentials();
    return { configured: true, email: email || DEFAULT_SERVICE_EMAIL, source };
  } catch (err: any) {
    return { configured: false, email: DEFAULT_SERVICE_EMAIL, error: err?.message };
  }
}

export const GOOGLE_SCOPES = {
  sheets: ["https://www.googleapis.com/auth/spreadsheets"],
  searchConsole: ["https://www.googleapis.com/auth/webmasters"],
} as const;
