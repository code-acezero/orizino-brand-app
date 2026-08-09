import { createSign } from "node:crypto";

/**
 * Minimal Google service-account auth (JWT-bearer flow), used to call
 * Google Sheets and Search Console directly instead of going through the
 * Lovable connector gateway. Deliberately dependency-free — it only needs
 * Node's built-in `crypto` to sign the assertion, so we don't have to add
 * `googleapis`/`google-auth-library` just for two REST integrations.
 *
 * Required env vars (set in Netlify → Site settings → Environment variables,
 * NOT in a committed .env file — the private key is a secret):
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL        the service account's client_email
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY  the service account's private_key
 *                                        (paste exactly as it appears in the
 *                                        downloaded JSON key, including the
 *                                        BEGIN/END lines; literal "\n"
 *                                        sequences are unescaped below)
 *
 * Setup, once per API:
 *   Sheets           share the target spreadsheet with the service account's
 *                    email (Editor access), same as sharing with a person.
 *   Search Console   in Search Console → Settings → Users and permissions,
 *                    add the service account's email as a user (Full is
 *                    required to submit sitemaps; Restricted is enough for
 *                    read-only stats).
 */

interface TokenCacheEntry {
  token: string;
  expiresAt: number;
}

const tokenCache = new Map<string, TokenCacheEntry>();

function loadCredentials() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) {
    throw new Error(
      "Google isn't connected yet. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in Netlify's environment variables."
    );
  }
  // Most env-var UIs (including Netlify) store multiline secrets with
  // literal "\n" escapes rather than real newlines.
  const privateKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;
  return { email, privateKey };
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function requestAccessToken(scopes: string[]): Promise<TokenCacheEntry> {
  const { email, privateKey } = loadCredentials();
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
export async function googleAccessToken(scopes: string[]): Promise<string> {
  const cacheKey = [...scopes].sort().join(" ");
  const cached = tokenCache.get(cacheKey);
  // Refresh a minute early so a slow request never races an expiring token.
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  const fresh = await requestAccessToken(scopes);
  tokenCache.set(cacheKey, fresh);
  return fresh.token;
}

export const GOOGLE_SCOPES = {
  sheets: ["https://www.googleapis.com/auth/spreadsheets"],
  searchConsole: ["https://www.googleapis.com/auth/webmasters"],
} as const;
