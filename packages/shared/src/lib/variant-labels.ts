// Smart variant label resolution based on product category / tags.
// Pure function — easy to unit-test.

export interface VariantLabels {
  sizeLabel: string;
  colorLabel: string;
  missingSizeMessage: string;
  missingColorMessage: string;
}

interface LabelRule {
  match: RegExp;
  size: string;
  color: string;
}

const RULES: LabelRule[] = [
  { match: /tech|electronic|phone|laptop|tablet|computer|gadget|device/i, size: "Storage", color: "Finish" },
  { match: /liquid|perfume|fragrance|cologne|oil|essential/i, size: "Volume", color: "Scent" },
  { match: /food|snack|beverage|drink|coffee|tea|juice/i, size: "Pack Size", color: "Flavor" },
  { match: /jewel|watch|ring|necklace|bracelet/i, size: "Length", color: "Material" },
  { match: /furniture|home|decor|sofa|chair|table/i, size: "Dimensions", color: "Finish" },
  { match: /beauty|cosmetic|makeup|lipstick|foundation/i, size: "Shade Size", color: "Shade" },
  { match: /shoe|footwear|sneaker|boot|sandal/i, size: "Size", color: "Color" },
  { match: /apparel|cloth|shirt|pant|dress|jacket|hoodie/i, size: "Size", color: "Color" },
];

function articleFor(label: string): string {
  return /^[aeiou]/i.test(label) ? "an" : "a";
}

interface ProductLike {
  name?: string | null;
  category?: { name?: string | null; slug?: string | null } | null;
  categories?: { name?: string | null; slug?: string | null } | null;
  tags?: string[] | null;
}

export function getVariantLabels(product: ProductLike | null | undefined): VariantLabels {
  const haystack = [
    product?.name,
    product?.category?.name,
    product?.category?.slug,
    product?.categories?.name,
    product?.categories?.slug,
    ...(product?.tags || []),
  ]
    .filter(Boolean)
    .join(" ");

  const rule = RULES.find((r) => r.match.test(haystack));
  const sizeLabel = rule?.size || "Size";
  const colorLabel = rule?.color || "Color";

  return {
    sizeLabel,
    colorLabel,
    missingSizeMessage: `Select ${articleFor(sizeLabel)} ${sizeLabel.toLowerCase()} to continue`,
    missingColorMessage: `Select ${articleFor(colorLabel)} ${colorLabel.toLowerCase()} to continue`,
  };
}
// code:4ce0
