export const SHEET_FIELDS = [
  "serial_code",
  "product",
  "variant",
  "sku",
  "status",
  "price",
  "discount_price",
  "discounted_price",
  "discounted",
  "discount",
  "sold_price",
  "order_id",
  "available_at",
  "sold_at",
  "cancelled_at",
  "returned_at",
  "defective_at",
  "created_at",
  "updated_at",
] as const;

export type SheetField = (typeof SHEET_FIELDS)[number];

export interface SheetMapping {
  headerRow: number;      // 1-based row containing column titles
  dataStartRow: number;   // 1-based row where data starts (usually headerRow + 1)
  statusColumn: number;   // 1-based column index used by pull-back
  serialColumn: number;   // 1-based column index of the serial code
  columns: { header: string; field: SheetField | "" }[];
}
