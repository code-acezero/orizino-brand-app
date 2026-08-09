// Premium, luxurious invoice & shipping-sticker .docx generator.
// Runs fully client-side (no edge function / connector needed) and triggers a download.
import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import { saveAs } from "file-saver";

// ---- Luxury palette (hex without #) ----
const INK = "14110F"; // near-black espresso
const GOLD = "B8902F"; // antique gold
const GOLD_SOFT = "C9A84C"; // lighter gold
const MUTED = "6B6B6B";
const LINE = "E4DFD3"; // warm hairline
const CREAM = "FBF8F1"; // soft paper tint
const WHITE = "FFFFFF";
const GREEN = "2F7D4F";

const FONT_HEAD = "Georgia"; // elegant serif for display
const FONT_BODY = "Calibri"; // refined sans for body

export interface DocxBrand {
  name: string;
  addr?: string;
  email?: string;
  phone?: string;
  currency?: string; // symbol, e.g. "৳"
  prefix?: string; // invoice prefix
  footer?: string;
}

function money(n: any, symbol: string): string {
  const v = Number(n || 0);
  return `${symbol}${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function noBorder() {
  return {
    top: { style: BorderStyle.NONE, size: 0, color: WHITE },
    bottom: { style: BorderStyle.NONE, size: 0, color: WHITE },
    left: { style: BorderStyle.NONE, size: 0, color: WHITE },
    right: { style: BorderStyle.NONE, size: 0, color: WHITE },
  };
}

function run(text: string, opts: Partial<{ bold: boolean; size: number; color: string; font: string; italics: boolean; spacing: number; allCaps: boolean }> = {}) {
  return new TextRun({
    text,
    bold: opts.bold,
    italics: opts.italics,
    size: opts.size ?? 20, // half-points (20 = 10pt)
    color: opts.color ?? INK,
    font: opts.font ?? FONT_BODY,
    characterSpacing: opts.spacing,
    allCaps: opts.allCaps,
  });
}

function label(text: string) {
  return new Paragraph({
    spacing: { after: 40 },
    children: [run(text, { size: 15, color: GOLD, bold: true, allCaps: true, spacing: 30 })],
  });
}

function cell(children: Paragraph[], opts: Partial<{ shade: string; width: number; align: (typeof VerticalAlign)[keyof typeof VerticalAlign] | "top" | "center" | "bottom"; margins: boolean }> = {}) {
  return new TableCell({
    children,
    verticalAlign: (opts.align ?? VerticalAlign.CENTER) as any,
    shading: opts.shade ? { type: ShadingType.CLEAR, color: "auto", fill: opts.shade } : undefined,
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    borders: noBorder(),
    margins: opts.margins === false ? undefined : { top: 90, bottom: 90, left: 140, right: 140 },
  });
}

function getAddr(order: any) {
  return order.shipping_address || {};
}

function fullAddress(addr: any): string {
  return [addr.address_line1, addr.address_line2, addr.address, addr.city, addr.state, addr.postal_code, addr.country]
    .filter(Boolean)
    .join(", ");
}

// Thin gold rule used as a divider
function goldRule() {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD, space: 1 } },
    children: [run("", { size: 2 })],
  });
}

function hairline() {
  return new Paragraph({
    spacing: { before: 30, after: 30 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 1 } },
    children: [run("", { size: 2 })],
  });
}

function buildHeader(brand: DocxBrand, headline: string, subline: string, idLine: string, dateLine: string, statusText: string) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorder(),
    rows: [
      new TableRow({
        children: [
          cell(
            [
              new Paragraph({ children: [run(brand.name.toUpperCase(), { font: FONT_HEAD, bold: true, size: 40, color: INK, spacing: 20 })] }),
              new Paragraph({ spacing: { before: 40 }, children: [run(brand.addr || "", { size: 17, color: MUTED })] }),
              new Paragraph({ children: [run([brand.email, brand.phone].filter(Boolean).join("   •   "), { size: 17, color: MUTED })] }),
            ],
            { width: 58, align: VerticalAlign.TOP },
          ),
          cell(
            [
              new Paragraph({ alignment: AlignmentType.RIGHT, children: [run(headline, { font: FONT_HEAD, bold: true, size: 52, color: GOLD, spacing: 40 })] }),
              new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 30 }, children: [run(subline, { size: 16, color: MUTED, allCaps: true, spacing: 20 })] }),
              new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 30 }, children: [run(idLine, { size: 20, bold: true, color: INK })] }),
              new Paragraph({ alignment: AlignmentType.RIGHT, children: [run(dateLine, { size: 17, color: MUTED })] }),
              new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 36 }, children: [run(`◆ ${statusText.toUpperCase()}`, { size: 16, bold: true, color: GOLD, spacing: 30 })] }),
            ],
            { width: 42, align: VerticalAlign.TOP },
          ),
        ],
      }),
    ],
  });
}

export async function buildInvoiceDoc(order: any, items: any[], brand: DocxBrand): Promise<Blob> {
  const symbol = brand.currency || "৳";
  const addr = getAddr(order);
  const prefix = brand.prefix || "INV";
  const invoiceNumber = `${prefix}-${order.order_number}`;
  const isPaid = String(order.payment_status || "").toLowerCase() === "paid" || ["paid", "delivered"].includes(String(order.status || "").toLowerCase());

  // Items table
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      cell([new Paragraph({ children: [run("Description", { color: WHITE, bold: true, size: 17, allCaps: true, spacing: 20 })] })], { shade: INK, width: 52 }),
      cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [run("Qty", { color: WHITE, bold: true, size: 17, allCaps: true, spacing: 20 })] })], { shade: INK, width: 12 }),
      cell([new Paragraph({ alignment: AlignmentType.RIGHT, children: [run("Unit", { color: WHITE, bold: true, size: 17, allCaps: true, spacing: 20 })] })], { shade: INK, width: 18 }),
      cell([new Paragraph({ alignment: AlignmentType.RIGHT, children: [run("Amount", { color: WHITE, bold: true, size: 17, allCaps: true, spacing: 20 })] })], { shade: INK, width: 18 }),
    ],
  });

  const itemRows = (items || []).map((it, i) =>
    new TableRow({
      children: [
        cell([new Paragraph({ children: [run(String(it.product_name || "Item"), { size: 19, color: INK })] })], { shade: i % 2 ? CREAM : WHITE, width: 52 }),
        cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [run(String(it.quantity ?? 1), { size: 19 })] })], { shade: i % 2 ? CREAM : WHITE, width: 12 }),
        cell([new Paragraph({ alignment: AlignmentType.RIGHT, children: [run(money(it.unit_price, symbol), { size: 19 })] })], { shade: i % 2 ? CREAM : WHITE, width: 18 }),
        cell([new Paragraph({ alignment: AlignmentType.RIGHT, children: [run(money(it.total_price, symbol), { size: 19, bold: true })] })], { shade: i % 2 ? CREAM : WHITE, width: 18 }),
      ],
    }),
  );

  const itemsTable = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: noBorder(), rows: [headerRow, ...itemRows] });

  // Totals
  const totalsRow = (l: string, v: string, opts: Partial<{ bold: boolean; grand: boolean; color: string }> = {}) =>
    new TableRow({
      children: [
        cell([new Paragraph({ alignment: AlignmentType.RIGHT, children: [run(l, { size: opts.grand ? 22 : 19, bold: opts.bold || opts.grand, color: opts.grand ? WHITE : MUTED })] })], { shade: opts.grand ? INK : WHITE, width: 60 }),
        cell([new Paragraph({ alignment: AlignmentType.RIGHT, children: [run(v, { size: opts.grand ? 24 : 19, bold: opts.bold || opts.grand, color: opts.grand ? GOLD_SOFT : (opts.color || INK) })] })], { shade: opts.grand ? INK : WHITE, width: 40 }),
      ],
    });

  const totalsInner: TableRow[] = [totalsRow("Subtotal", money(order.subtotal, symbol))];
  if (order.shipping_fee) totalsInner.push(totalsRow("Shipping", money(order.shipping_fee, symbol)));
  if (order.coupon_discount) totalsInner.push(totalsRow(`Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}`, `− ${money(order.coupon_discount, symbol)}`, { color: GREEN }));
  if (order.loyalty_discount) totalsInner.push(totalsRow("Loyalty Reward", `− ${money(order.loyalty_discount, symbol)}`, { color: GREEN }));
  totalsInner.push(totalsRow("Total Due", money(order.total, symbol), { grand: true }));

  const totalsTable = new Table({ width: { size: 50, type: WidthType.PERCENTAGE }, alignment: AlignmentType.RIGHT, borders: noBorder(), rows: totalsInner });

  // Bill-to / payment two-column
  const infoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorder(),
    rows: [
      new TableRow({
        children: [
          cell(
            [
              label("Billed To"),
              new Paragraph({ children: [run(addr.full_name || addr.name || "Customer", { bold: true, size: 21, color: INK })] }),
              new Paragraph({ spacing: { before: 20 }, children: [run(fullAddress(addr), { size: 18, color: MUTED })] }),
              ...(addr.phone ? [new Paragraph({ children: [run(`Phone: ${addr.phone}`, { size: 18, color: MUTED })] })] : []),
              ...(addr.email ? [new Paragraph({ children: [run(addr.email, { size: 18, color: MUTED })] })] : []),
            ],
            { width: 55, align: VerticalAlign.TOP, shade: CREAM },
          ),
          cell([new Paragraph({ children: [run("", { size: 2 })] })], { width: 4 }),
          cell(
            [
              label("Payment"),
              new Paragraph({ children: [run(String(order.payment_method || "—").toUpperCase(), { bold: true, size: 21, color: INK })] }),
              ...(order.transaction_id ? [new Paragraph({ spacing: { before: 20 }, children: [run(`Txn: ${order.transaction_id}`, { size: 18, color: MUTED })] })] : []),
              new Paragraph({ spacing: { before: 20 }, children: [run(isPaid ? "Settled in full" : "Payment outstanding", { size: 18, color: isPaid ? GREEN : MUTED, italics: true })] }),
            ],
            { width: 41, align: VerticalAlign.TOP, shade: CREAM },
          ),
        ],
      }),
    ],
  });

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT_BODY, size: 20, color: INK } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1000, bottom: 900, left: 1000, right: 1000 } } },
        children: [
          buildHeader(
            brand,
            "INVOICE",
            "Tax Invoice",
            `No. ${invoiceNumber}`,
            new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
            order.status || "pending",
          ),
          goldRule(),
          new Paragraph({ spacing: { before: 80 } }),
          infoTable,
          new Paragraph({ spacing: { before: 200 } }),
          label("Order Summary"),
          new Paragraph({ spacing: { before: 40 } }),
          itemsTable,
          hairline(),
          new Paragraph({ spacing: { before: 80 } }),
          totalsTable,
          new Paragraph({ spacing: { before: 260 } }),
          goldRule(),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120 },
            children: [run(brand.footer || `Thank you for choosing ${brand.name}.`, { italics: true, size: 19, color: INK, font: FONT_HEAD })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 30 },
            children: [run("This is a computer-generated invoice and does not require a signature.", { size: 15, color: MUTED })],
          }),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}

export async function buildStickerDoc(order: any, brand: DocxBrand): Promise<Blob> {
  const symbol = brand.currency || "৳";
  const addr = getAddr(order);
  const codAmount = ["paid", "delivered"].includes(String(order.status || "").toLowerCase()) ? `${symbol}0.00 — PREPAID` : money(order.total, symbol);

  const boxed = (children: Paragraph[], shade: string) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 6, color: GOLD },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD },
        left: { style: BorderStyle.SINGLE, size: 6, color: GOLD },
        right: { style: BorderStyle.SINGLE, size: 6, color: GOLD },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: WHITE },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: WHITE },
      },
      rows: [new TableRow({ children: [cell(children, { shade })] })],
    });

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT_BODY, size: 20, color: INK } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1000, bottom: 900, left: 1000, right: 1000 } } },
        children: [
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorder(),
            rows: [
              new TableRow({
                children: [
                  cell([new Paragraph({ children: [run(brand.name.toUpperCase(), { font: FONT_HEAD, bold: true, size: 34, color: INK, spacing: 20 })] })], { width: 55, align: VerticalAlign.TOP }),
                  cell(
                    [
                      new Paragraph({ alignment: AlignmentType.RIGHT, children: [run("SHIPPING LABEL", { font: FONT_HEAD, bold: true, size: 30, color: GOLD, spacing: 30 })] }),
                      new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 20 }, children: [run(`Order #${order.order_number}`, { size: 19, bold: true })] }),
                    ],
                    { width: 45, align: VerticalAlign.TOP },
                  ),
                ],
              }),
            ],
          }),
          goldRule(),
          new Paragraph({ spacing: { before: 120 } }),
          label("From"),
          new Paragraph({ children: [run(brand.name, { bold: true, size: 21 })] }),
          ...(brand.addr ? [new Paragraph({ children: [run(brand.addr, { size: 18, color: MUTED })] })] : []),
          ...(brand.phone ? [new Paragraph({ children: [run(`Phone: ${brand.phone}`, { size: 18, color: MUTED })] })] : []),
          new Paragraph({ spacing: { before: 200 } }),
          boxed(
            [
              label("Deliver To"),
              new Paragraph({ spacing: { before: 30 }, children: [run(addr.full_name || addr.name || "Customer", { bold: true, size: 30, font: FONT_HEAD, color: INK })] }),
              new Paragraph({ spacing: { before: 40 }, children: [run(fullAddress(addr), { size: 21, color: INK })] }),
              ...(addr.phone ? [new Paragraph({ spacing: { before: 40 }, children: [run(`Phone: ${addr.phone}`, { size: 22, bold: true, color: INK })] })] : []),
            ],
            CREAM,
          ),
          new Paragraph({ spacing: { before: 200 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorder(),
            rows: [
              new TableRow({
                children: [
                  cell(
                    [
                      new Paragraph({ children: [run("PAYMENT METHOD", { size: 15, color: GOLD, bold: true, allCaps: true, spacing: 20 })] }),
                      new Paragraph({ spacing: { before: 20 }, children: [run(String(order.payment_method || "—").toUpperCase(), { bold: true, size: 21 })] }),
                    ],
                    { width: 50, shade: WHITE, align: VerticalAlign.TOP },
                  ),
                  cell(
                    [
                      new Paragraph({ children: [run("COD AMOUNT", { size: 15, color: GOLD, bold: true, allCaps: true, spacing: 20 })] }),
                      new Paragraph({ spacing: { before: 20 }, children: [run(codAmount, { bold: true, size: 26, color: INK })] }),
                    ],
                    { width: 50, shade: WHITE, align: VerticalAlign.TOP },
                  ),
                ],
              }),
            ],
          }),
          hairline(),
          new Paragraph({ spacing: { before: 60 }, children: [run(`Tracking: ${order.tracking_number || "—"}`, { size: 18, color: MUTED, italics: true })] }),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}

export async function downloadInvoiceDocx(order: any, items: any[], brand: DocxBrand) {
  const blob = await buildInvoiceDoc(order, items, brand);
  saveAs(blob, `Invoice-${order.order_number}.docx`);
}

export async function downloadStickerDocx(order: any, brand: DocxBrand) {
  const blob = await buildStickerDoc(order, brand);
  saveAs(blob, `Shipping-Label-${order.order_number}.docx`);
}
