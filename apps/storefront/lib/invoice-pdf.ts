// Premium, luxurious invoice & shipping-sticker PDF generator.
// Runs fully client-side (no edge function / connector needed) and triggers a download.
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ── Luxury palette (RGB) ──
const INK: [number, number, number] = [20, 17, 15];
const GOLD: [number, number, number] = [184, 144, 47];
const GOLD_SOFT: [number, number, number] = [201, 168, 76];
const MUTED: [number, number, number] = [107, 107, 107];
const LINE: [number, number, number] = [228, 223, 211];
const CREAM: [number, number, number] = [251, 248, 241];
const GREEN: [number, number, number] = [47, 125, 79];

const SERIF = "times"; // built-in elegant serif
const SANS = "helvetica";

export interface PdfBrand {
  name: string;
  addr?: string;
  email?: string;
  phone?: string;
  currency?: string; // symbol, e.g. "BDT " (jsPDF core fonts can't render ৳)
  prefix?: string;
  footer?: string;
}

function money(n: any, symbol: string): string {
  const v = Number(n || 0);
  return `${symbol}${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getAddr(order: any) {
  return order.shipping_address || {};
}

function fullAddress(addr: any): string {
  return [addr.address_line1, addr.address_line2, addr.address, addr.city, addr.state, addr.postal_code, addr.country]
    .filter(Boolean)
    .join(", ");
}

// jsPDF core fonts are Latin-1 only; the ৳ glyph renders as garbage. Use a safe label.
function safeCurrency(symbol?: string): string {
  if (!symbol) return "Tk ";
  if (symbol === "৳") return "Tk ";
  // keep $, €, £, etc. but ensure a trailing space for readability
  return /\s$/.test(symbol) ? symbol : `${symbol}`;
}

function header(doc: jsPDF, brand: PdfBrand, M: number, W: number, headline: string, subline: string, idLine: string, dateLine: string, statusText: string) {
  // Top gold band
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, W, 6, "F");

  // Brand name
  doc.setFont(SERIF, "bold");
  doc.setFontSize(24);
  doc.setTextColor(...INK);
  doc.text(brand.name.toUpperCase(), M, 28);

  doc.setFont(SANS, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  let by = 35;
  if (brand.addr) { doc.text(brand.addr, M, by); by += 5; }
  const contact = [brand.email, brand.phone].filter(Boolean).join("   •   ");
  if (contact) { doc.text(contact, M, by); }

  // Right column
  doc.setFont(SERIF, "bold");
  doc.setFontSize(30);
  doc.setTextColor(...GOLD);
  doc.text(headline, W - M, 26, { align: "right" });

  doc.setFont(SANS, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(subline.toUpperCase(), W - M, 32, { align: "right" });

  doc.setFont(SANS, "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(idLine, W - M, 39, { align: "right" });

  doc.setFont(SANS, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(dateLine, W - M, 45, { align: "right" });

  doc.setFont(SANS, "bold");
  doc.setFontSize(8);
  doc.setTextColor(...GOLD);
  doc.text(`* ${statusText.toUpperCase()}`, W - M, 51, { align: "right" });

  // Gold divider
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.line(M, 58, W - M, 58);
}

export function buildInvoicePdf(order: any, items: any[], brand: PdfBrand): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 18;
  const symbol = safeCurrency(brand.currency);
  const addr = getAddr(order);
  const prefix = brand.prefix || "INV";
  const invoiceNumber = `${prefix}-${order.order_number}`;
  const isPaid = String(order.payment_status || "").toLowerCase() === "paid" || ["paid", "delivered"].includes(String(order.status || "").toLowerCase());

  header(
    doc, brand, M, W,
    "INVOICE", "Tax Invoice",
    `No. ${invoiceNumber}`,
    new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    order.status || "pending",
  );

  // Info cards: Billed To / Payment
  const cardY = 66;
  const cardH = 38;
  const gap = 6;
  const cardW = (W - M * 2 - gap) / 2;

  const drawCard = (x: number, labelText: string, lines: { t: string; bold?: boolean; color?: [number, number, number]; size?: number; italic?: boolean }[]) => {
    doc.setFillColor(...CREAM);
    doc.rect(x, cardY, cardW, cardH, "F");
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.rect(x, cardY, cardW, cardH, "S");
    doc.setFont(SANS, "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...GOLD);
    doc.text(labelText.toUpperCase(), x + 5, cardY + 7);
    let ty = cardY + 14;
    for (const ln of lines) {
      doc.setFont(SANS, ln.bold ? "bold" : ln.italic ? "italic" : "normal");
      doc.setFontSize(ln.size ?? 9);
      doc.setTextColor(...(ln.color ?? INK));
      const wrapped = doc.splitTextToSize(ln.t, cardW - 10);
      doc.text(wrapped, x + 5, ty);
      ty += wrapped.length * (ln.size ? ln.size * 0.45 : 4.4) + 1.5;
    }
  };

  drawCard(M, "Billed To", [
    { t: addr.full_name || addr.name || "Customer", bold: true, size: 11 },
    { t: fullAddress(addr) || "—", color: MUTED, size: 8.5 },
    ...(addr.phone ? [{ t: `Phone: ${addr.phone}`, color: MUTED as [number, number, number], size: 8.5 }] : []),
    ...(addr.email ? [{ t: addr.email, color: MUTED as [number, number, number], size: 8.5 }] : []),
  ]);

  drawCard(M + cardW + gap, "Payment", [
    { t: String(order.payment_method || "—").toUpperCase(), bold: true, size: 11 },
    ...(order.transaction_id ? [{ t: `Txn: ${order.transaction_id}`, color: MUTED as [number, number, number], size: 8.5 }] : []),
    { t: isPaid ? "Settled in full" : "Payment outstanding", color: (isPaid ? GREEN : MUTED) as [number, number, number], size: 9, italic: true },
  ]);

  // Items table
  const body = (items || []).map((it) => [
    String(it.product_name || "Item"),
    String(it.quantity ?? 1),
    money(it.unit_price, symbol),
    money(it.total_price, symbol),
  ]);

  autoTable(doc, {
    startY: cardY + cardH + 10,
    head: [["DESCRIPTION", "QTY", "UNIT", "AMOUNT"]],
    body,
    theme: "plain",
    margin: { left: M, right: M },
    styles: { font: SANS, fontSize: 9.5, textColor: INK as any, cellPadding: 3 },
    headStyles: { fillColor: INK as any, textColor: [255, 255, 255] as any, fontStyle: "bold", fontSize: 8, halign: "left" },
    alternateRowStyles: { fillColor: CREAM as any },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "center", cellWidth: 18 },
      2: { halign: "right", cellWidth: 30 },
      3: { halign: "right", cellWidth: 32, fontStyle: "bold" },
    },
  });

  // Totals
  let y = (doc as any).lastAutoTable.finalY + 6;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.line(M, y - 2, W - M, y - 2);

  const totalsX = W - M - 70;
  const valX = W - M;
  const totalRow = (l: string, v: string, opts: { color?: [number, number, number] } = {}) => {
    doc.setFont(SANS, "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    doc.text(l, totalsX, y);
    doc.setTextColor(...(opts.color ?? INK));
    doc.text(v, valX, y, { align: "right" });
    y += 6;
  };

  totalRow("Subtotal", money(order.subtotal, symbol));
  if (order.shipping_fee) totalRow("Shipping", money(order.shipping_fee, symbol));
  if (order.coupon_discount) totalRow(`Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}`, `- ${money(order.coupon_discount, symbol)}`, { color: GREEN });
  if (order.loyalty_discount) totalRow("Loyalty Reward", `- ${money(order.loyalty_discount, symbol)}`, { color: GREEN });

  // Grand total band
  y += 1;
  doc.setFillColor(...INK);
  doc.rect(totalsX - 5, y - 5, valX - totalsX + 5, 11, "F");
  doc.setFont(SANS, "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL DUE", totalsX, y + 1.5);
  doc.setTextColor(...GOLD_SOFT);
  doc.setFontSize(12);
  doc.text(money(order.total, symbol), valX, y + 1.5, { align: "right" });

  // Footer
  const H = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(M, H - 30, W - M, H - 30);
  doc.setFont(SERIF, "italic");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(brand.footer || `Thank you for choosing ${brand.name}.`, W / 2, H - 22, { align: "center" });
  doc.setFont(SANS, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("This is a computer-generated invoice and does not require a signature.", W / 2, H - 16, { align: "center" });

  return doc;
}

export function buildStickerPdf(order: any, brand: PdfBrand): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 18;
  const symbol = safeCurrency(brand.currency);
  const addr = getAddr(order);
  const codAmount = ["paid", "delivered"].includes(String(order.status || "").toLowerCase())
    ? `${symbol}0.00 — PREPAID`
    : money(order.total, symbol);

  // Top gold band
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, W, 6, "F");

  doc.setFont(SERIF, "bold");
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text(brand.name.toUpperCase(), M, 26);

  doc.setFont(SERIF, "bold");
  doc.setFontSize(18);
  doc.setTextColor(...GOLD);
  doc.text("SHIPPING LABEL", W - M, 24, { align: "right" });
  doc.setFont(SANS, "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(`Order #${order.order_number}`, W - M, 31, { align: "right" });

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.line(M, 38, W - M, 38);

  // From
  doc.setFont(SANS, "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...GOLD);
  doc.text("FROM", M, 50);
  doc.setFont(SANS, "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(brand.name, M, 57);
  doc.setFont(SANS, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  let fy = 63;
  if (brand.addr) { doc.text(brand.addr, M, fy); fy += 5; }
  if (brand.phone) { doc.text(`Phone: ${brand.phone}`, M, fy); }

  // Deliver To box
  const boxY = 80;
  const boxH = 52;
  doc.setFillColor(...CREAM);
  doc.rect(M, boxY, W - M * 2, boxH, "F");
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.rect(M, boxY, W - M * 2, boxH, "S");

  doc.setFont(SANS, "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...GOLD);
  doc.text("DELIVER TO", M + 7, boxY + 9);

  doc.setFont(SERIF, "bold");
  doc.setFontSize(18);
  doc.setTextColor(...INK);
  doc.text(addr.full_name || addr.name || "Customer", M + 7, boxY + 20);

  doc.setFont(SANS, "normal");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  const wrapped = doc.splitTextToSize(fullAddress(addr) || "—", W - M * 2 - 14);
  doc.text(wrapped, M + 7, boxY + 30);

  if (addr.phone) {
    doc.setFont(SANS, "bold");
    doc.setFontSize(12);
    doc.text(`Phone: ${addr.phone}`, M + 7, boxY + 30 + wrapped.length * 5 + 4);
  }

  // Payment / COD row
  const pY = boxY + boxH + 14;
  doc.setFont(SANS, "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...GOLD);
  doc.text("PAYMENT METHOD", M, pY);
  doc.text("COD AMOUNT", W / 2 + 5, pY);
  doc.setFont(SANS, "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(String(order.payment_method || "—").toUpperCase(), M, pY + 8);
  doc.setFontSize(15);
  doc.text(codAmount, W / 2 + 5, pY + 8);

  // Tracking
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.line(M, pY + 16, W - M, pY + 16);
  doc.setFont(SANS, "italic");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Tracking: ${order.tracking_number || "—"}`, M, pY + 23);

  return doc;
}

export function downloadInvoicePdf(order: any, items: any[], brand: PdfBrand) {
  const doc = buildInvoicePdf(order, items, brand);
  doc.save(`Invoice-${order.order_number}.pdf`);
}

export function downloadStickerPdf(order: any, brand: PdfBrand) {
  const doc = buildStickerPdf(order, brand);
  doc.save(`Shipping-Label-${order.order_number}.pdf`);
}
