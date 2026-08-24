"use client";

/**
 * Compact Serial Generator & Parser (Option 1: Segmented Compact Code)
 * Combines Product SKU + Variant Token + Compact Sequence (e.g. TS01BL-001)
 */

export interface SerialComponents {
  productSku: string;
  variantToken?: string | null;
  sequenceNumber: number;
}

/**
 * Builds a clean, compact prefix for a product + variant.
 * Examples:
 * - Product SKU "TSH01", Variant "BLK-L" -> "TSH01BL"
 * - Product SKU "TS01", Variant "XL" -> "TS01XL"
 * - Product SKU "CAP01", No variant -> "CAP01"
 */
export function buildCompactSerialPrefix(
  productSkuOrName: string,
  variantSkuOrLabels?: string | { size?: string | null; color?: string | null; sku?: string | null } | null
): string {
  // 1. Clean product token (max 5 alphanumeric characters)
  const rawProduct = (productSkuOrName || "PRD").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const productToken = rawProduct.slice(0, 5) || "PRD";

  // 2. Clean variant token
  let variantToken = "";
  if (typeof variantSkuOrLabels === "string") {
    const rawVariant = variantSkuOrLabels.toUpperCase().replace(/[^A-Z0-9]/g, "");
    variantToken = rawVariant.slice(0, 3);
  } else if (variantSkuOrLabels && typeof variantSkuOrLabels === "object") {
    if (variantSkuOrLabels.sku) {
      const rawSku = variantSkuOrLabels.sku.toUpperCase().replace(/[^A-Z0-9]/g, "");
      variantToken = rawSku.slice(0, 3);
    } else {
      const colorPart = (variantSkuOrLabels.color || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 1);
      const sizePart = (variantSkuOrLabels.size || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 2);
      variantToken = `${colorPart}${sizePart}`.slice(0, 3);
    }
  }

  return variantToken ? `${productToken}${variantToken}` : productToken;
}

/**
 * Formats a compact serial code given prefix and sequence index.
 * Example: TS01BL + 1 -> "TS01BL-001"
 */
export function formatCompactSerialCode(prefix: string, sequenceNumber: number): string {
  const seqStr = sequenceNumber < 1000 ? String(sequenceNumber).padStart(3, "0") : String(sequenceNumber);
  return `${prefix}-${seqStr}`;
}

/**
 * Calculates the next sequence number from existing codes matching a prefix.
 */
export function getNextCompactSequence(existingCodes: string[], prefix: string): number {
  let max = 0;
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\]/g, "\$&");
  const re = new RegExp("^" + escapedPrefix + "-(\\d+)$", "i");
  for (const c of existingCodes) {
    const m = (c || "").trim().match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n)) max = Math.max(max, n);
    }
  }
  return max + 1;
}
