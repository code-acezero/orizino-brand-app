import { getStorefrontUrl } from "./cross-app-urls";

/**
 * Universally extract potential product serial codes & SKU candidates from any scanned payload.
 * Handles:
 *  - Full verification URLs: "https://orizino.com/verify?code=ORZ-ORZKBW-000002"
 *  - Short links & paths: "/v/ORZ-ORZKBW-000002", "/verify/ORZ-ORZKBW-000002"
 *  - URL parameters: ?code=..., ?serial=..., ?s=..., ?sku=..., ?sn=..., ?c=...
 *  - Merged SKU & Serial blocks: "ORZ-KBW0001B · ORZ-ORZKBW-000002", "ORZ-KBW0001B / ORZ-ORZKBW-000002"
 *  - JSON payloads: {"serial_code": "ORZ-ORZKBW-000002", ...}
 *  - Raw serial strings: "ORZ-ORZKBW-000002", "ORZ_ORZKBW_000002", "SN:ORZ-ORZKBW-000002"
 */
export function extractSerialCandidates(raw: string | undefined | null): string[] {
  if (!raw) return [];
  const rawStr = String(raw).trim();
  if (!rawStr) return [];

  const candidates: string[] = [];
  const addCandidate = (str: string | undefined | null) => {
    if (!str) return;
    let s = String(str).trim();
    if (!s) return;

    // Strip common labels
    s = s
      .replace(/^SN:?\s*/i, "")
      .replace(/^S\/N:?\s*/i, "")
      .replace(/^SERIAL:?\s*/i, "")
      .replace(/^CODE:?\s*/i, "")
      .replace(/^SKU:?\s*/i, "")
      .replace(/^#/, "")
      .trim();

    if (!s) return;

    if (!candidates.includes(s)) {
      candidates.push(s);
    }

    // Normalized dashes version
    if (/^[A-Za-z0-9]+[\s_]+[A-Za-z0-9]+[\s_]+[A-Za-z0-9]+$/i.test(s)) {
      const dashed = s.replace(/[\s_]+/g, "-");
      if (!candidates.includes(dashed)) {
        candidates.push(dashed);
      }
    }
  };

  // 1. JSON parsing
  if (rawStr.startsWith("{") && rawStr.endsWith("}")) {
    try {
      const parsed = JSON.parse(rawStr);
      addCandidate(parsed.serial_code);
      addCandidate(parsed.serial);
      addCandidate(parsed.sku);
      addCandidate(parsed.code);
      addCandidate(parsed.id);
      addCandidate(parsed.barcode);
    } catch {}
  }

  // 2. URL parsing (QR codes)
  if (rawStr.includes("http://") || rawStr.includes("https://") || rawStr.includes("?code=") || rawStr.includes("?serial=")) {
    try {
      const urlMatch = rawStr.match(/https?:\/\/[^\s]+/i) || [rawStr];
      const urlObj = new URL(urlMatch[0].startsWith("http") ? urlMatch[0] : `https://shop.orizino.com${urlMatch[0]}`);
      
      const queryParams = ["code", "serial", "s", "sn", "sku", "barcode", "id", "c", "v"];
      for (const q of queryParams) {
        const val = urlObj.searchParams.get(q);
        if (val) addCandidate(val);
      }

      // Check path segments
      const parts = urlObj.pathname.split("/").filter(Boolean);
      if (parts.length > 0) {
        const lastPart = parts[parts.length - 1];
        if (lastPart && !["verify", "v", "p", "product"].includes(lastPart.toLowerCase())) {
          addCandidate(decodeURIComponent(lastPart));
        }
      }
    } catch {
      // Regex fallback for query match
      const qMatch = rawStr.match(/[?&](?:code|sn|serial|s|c|sku)=([^&#\s]+)/i);
      if (qMatch && qMatch[1]) {
        addCandidate(decodeURIComponent(qMatch[1].replace(/\+/g, " ")));
      }
      const pMatch = rawStr.match(/(?:\/v\/|\/verify\/)([^/?&#\s]+)/i);
      if (pMatch && pMatch[1]) {
        addCandidate(decodeURIComponent(pMatch[1].replace(/\+/g, " ")));
      }
    }
  }

  // 3. Multi-token split on common delimiters (middle dot ·, bullet •, pipe |, slash /, commas, tabs, newlines)
  const tokens = rawStr.split(/[\s·•|/\t\r\n,]+/);
  for (const tok of tokens) {
    if (tok) addCandidate(tok);
  }

  // 4. Add the raw stripped string as fallback
  addCandidate(rawStr);

  return candidates;
}

/**
 * Universally extract a single primary product serial code from any scanned payload.
 */
export function extractSerialCode(raw: string | undefined | null): string {
  const list = extractSerialCandidates(raw);
  if (list.length === 0) return "";
  const orzCode = list.find((c) => /^ORZ-/i.test(c));
  if (orzCode) return orzCode;
  return list[0] || "";
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
