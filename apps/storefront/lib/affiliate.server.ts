// Server-only helpers for affiliate program. Never import from client code.
import { createHash } from "crypto";

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export function parseUA(ua: string | null | undefined) {
  if (!ua) return { device: "unknown", browser: "unknown", os: "unknown" };
  const lower = ua.toLowerCase();
  const device = /mobile|android|iphone|ipad/.test(lower) ? "mobile" : "desktop";
  const browser = lower.includes("chrome") ? "Chrome"
    : lower.includes("firefox") ? "Firefox"
    : lower.includes("safari") ? "Safari"
    : lower.includes("edg") ? "Edge"
    : "Other";
  const os = lower.includes("windows") ? "Windows"
    : lower.includes("mac os") ? "macOS"
    : lower.includes("android") ? "Android"
    : lower.includes("iphone") || lower.includes("ipad") ? "iOS"
    : lower.includes("linux") ? "Linux"
    : "Other";
  return { device, browser, os };
}
