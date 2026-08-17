import { getStorefrontUrl } from "./cross-app-urls";

/**
 * Universally extract a product serial code from any scanned payload.
 * Handles:
 *  - Full verification URLs: "https://orizino.com/verify?code=SN-2026-X89"
 *  - URL parameters: "https://orizino.com/verify?sn=SN-2026-X89", "?serial=...", "?c=..."
 *  - Direct short links: "https://orizino.com/v/SN-2026-X89", "/v/SN-2026-X89"
 *  - Raw serial strings: "SN-2026-X89", "ORZ-PRD-000123"
 */
export function extractSerialCode(raw: string | undefined | null): string {
  if (!raw) return "";
  let trimmed = String(raw).trim();
  if (!trimmed) return "";

  try {
    // 1. Check for query parameters: ?code=, ?sn=, ?serial=, ?c=, ?order=
    const queryMatch = trimmed.match(/[?&](?:code|sn|serial|c|order)=([^&#]+)/i);
    if (queryMatch && queryMatch[1]) {
      trimmed = decodeURIComponent(queryMatch[1].replace(/\+/g, " ")).trim();
    } else {
      // 2. Check for path patterns: /v/CODE, /verify/CODE
      const pathMatch = trimmed.match(/(?:\/v\/|\/verify\/)([^/?&#]+)/i);
      if (pathMatch && pathMatch[1]) {
        trimmed = decodeURIComponent(pathMatch[1].replace(/\+/g, " ")).trim();
      }
    }
  } catch {
    // Fall back to trimmed string on URL decode error
  }

  // 3. Strip common prefixes like "SN:", "S/N:", "Serial:", "#"
  trimmed = trimmed
    .replace(/^SN:?\s*/i, "")
    .replace(/^S\/N:?\s*/i, "")
    .replace(/^SERIAL:?\s*/i, "")
    .replace(/^CODE:?\s*/i, "")
    .replace(/^#/, "")
    .trim();

  // 4. If formatted with spaces like "ORZ ORZGAC 000005" or "ORZ_ORZGAC_000005", normalize to standard dash format
  if (/^[A-Za-z0-9]+[\s_]+[A-Za-z0-9]+[\s_]+[A-Za-z0-9]+$/i.test(trimmed)) {
    trimmed = trimmed.replace(/[\s_]+/g, "-");
  }

  return trimmed;
}

/**
 * Build the canonical, smart verification URL for a product serial code.
 * Pointing a native phone camera at a QR code containing this URL
 * immediately prompts the user to open the Storefront Authenticity page.
 */
export function buildVerificationUrl(serialCode: string, baseUrl?: string): string {
  const code = (serialCode || "").trim();
  const base = baseUrl ? baseUrl.replace(/\/$/, "") : getStorefrontUrl();
  return `${base}/verify?code=${encodeURIComponent(code)}`;
}
