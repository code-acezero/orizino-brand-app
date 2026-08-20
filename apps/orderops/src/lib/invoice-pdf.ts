// Unified luxury invoice, POS receipt slip, and shipping sticker generator for OrderOps
// Powered by jsPDF, jspdf-autotable and native thermal HTML for 100% fidelity with MasterPanel
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { MasterPanelBrandSettings, MasterPanelInvoiceSettings, MasterPanelPosSettings, MasterPanelStickerPreset } from "./design-presets";

// ── Luxury palette (RGB) matching MasterPanel ──
const INK: [number, number, number] = [20, 17, 15];
const GOLD: [number, number, number] = [184, 144, 47];
const GOLD_SOFT: [number, number, number] = [201, 168, 76];
const MUTED: [number, number, number] = [107, 107, 107];
const LINE: [number, number, number] = [228, 223, 211];
const CREAM: [number, number, number] = [251, 248, 241];
const GREEN: [number, number, number] = [47, 125, 79];

const SERIF = "times";
const SANS = "helvetica";

function safeCurrency(symbol?: string): string {
  if (!symbol || symbol === "৳") return "Tk ";
  return /\s$/.test(symbol) ? symbol : `${symbol} `;
}

function money(n: any, symbol: string): string {
  const v = Number(n || 0);
  return `${symbol}${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getAddr(order: any) {
  return order.shipping_address || {};
}

function fullAddress(addr: any): string {
  return [addr.address_line1, addr.address_line2, addr.address, addr.city, addr.state, addr.district, addr.thana, addr.postal_code, addr.country]
    .filter(Boolean)
    .join(", ");
}

/**
 * Build MasterPanel Luxury A4 Invoice PDF
 */
export function buildInvoicePdf(
  order: any,
  items: any[],
  brand: MasterPanelBrandSettings,
  invoiceSettings?: MasterPanelInvoiceSettings
): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 18;
  const symbol = safeCurrency(brand.currency);
  const addr = getAddr(order);
  const prefix = invoiceSettings?.invoice_prefix || brand.prefix || "INV";
  const invoiceNumber = `${prefix}-${order.order_number}`;
  const isPaid = String(order.payment_status || "").toLowerCase() === "paid" || ["paid", "delivered"].includes(String(order.status || "").toLowerCase());

  // Background watermark
  doc.setFont(SERIF, "bold");
  doc.setFontSize(56);
  doc.setTextColor(243, 240, 234);
  doc.text((brand.name || "ORIZINO").toUpperCase(), W / 2, H / 2 + 10, { align: "center", angle: 30 });

  // Top gold bar
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, W, 6, "F");

  // Brand Name
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

  // Right Header Info
  doc.setFont(SERIF, "bold");
  doc.setFontSize(30);
  doc.setTextColor(...GOLD);
  doc.text("INVOICE", W - M, 26, { align: "right" });

  doc.setFont(SANS, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("OFFICIAL TAX INVOICE", W - M, 32, { align: "right" });

  doc.setFont(SANS, "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(`No. ${invoiceNumber}`, W - M, 39, { align: "right" });

  doc.setFont(SANS, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const dateStr = new Date(order.created_at || Date.now()).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  doc.text(dateStr, W - M, 45, { align: "right" });

  doc.setFont(SANS, "bold");
  doc.setFontSize(8);
  doc.setTextColor(...GOLD);
  doc.text(`* ${String(order.status || "pending").toUpperCase()}`, W - M, 51, { align: "right" });

  // Gold divider
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.line(M, 58, W - M, 58);

  // Billed To & Payment Cards
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
    { t: addr.full_name || addr.name || order.customer_name || "Customer", bold: true, size: 11 },
    { t: fullAddress(addr) || "—", color: MUTED, size: 8.5 },
    ...(addr.phone || order.guest_phone ? [{ t: `Phone: ${addr.phone || order.guest_phone}`, color: MUTED as [number, number, number], size: 8.5 }] : []),
    ...(addr.email ? [{ t: addr.email, color: MUTED as [number, number, number], size: 8.5 }] : []),
  ]);

  drawCard(M + cardW + gap, "Payment", [
    { t: String(order.payment_method || "—").toUpperCase(), bold: true, size: 11 },
    ...(order.transaction_id ? [{ t: `Txn: ${order.transaction_id}`, color: MUTED as [number, number, number], size: 8.5 }] : []),
    { t: isPaid ? "Settled in full" : "Payment outstanding", color: (isPaid ? GREEN : MUTED) as [number, number, number], size: 9, italic: true },
  ]);

  // Items table
  const body = (items || []).map((it) => [
    String(it.product_name || it.name || "Product Item"),
    String(it.quantity ?? 1),
    money(it.unit_price, symbol),
    money(it.total_price || (it.quantity * it.unit_price), symbol),
  ]);

  autoTable(doc, {
    startY: cardY + cardH + 10,
    head: [["DESCRIPTION", "QTY", "UNIT PRICE", "AMOUNT"]],
    body,
    theme: "plain",
    margin: { left: M, right: M },
    styles: { font: SANS, fontSize: 9.5, textColor: INK as any, cellPadding: 3 },
    headStyles: { fillColor: INK as any, textColor: [255, 255, 255] as any, fontStyle: "bold", fontSize: 8, halign: "left" },
    alternateRowStyles: { fillColor: CREAM as any },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "center", cellWidth: 18 },
      2: { halign: "right", cellWidth: 32 },
      3: { halign: "right", cellWidth: 34, fontStyle: "bold" },
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

  totalRow("Subtotal", money(order.subtotal || order.total, symbol));
  const isPrepaidDelivery = !!order.is_delivery_prepaid || (order.delivery_prepaid_amount != null && Number(order.delivery_prepaid_amount) > 0);
  const prepaidDeliveryFee = isPrepaidDelivery ? Number(order.delivery_prepaid_amount || order.shipping_fee || 0) : 0;

  if (order.shipping_fee) {
    if (isPrepaidDelivery) {
      totalRow("Delivery Fee (Pre-paid)", money(order.shipping_fee, symbol), { color: GREEN });
    } else {
      totalRow("Delivery Fee", money(order.shipping_fee, symbol));
    }
  }
  if (order.coupon_discount) totalRow(`Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}`, `- ${money(order.coupon_discount, symbol)}`, { color: GREEN });
  if (order.loyalty_discount) totalRow("Loyalty Reward", `- ${money(order.loyalty_discount, symbol)}`, { color: GREEN });

  if (isPrepaidDelivery && !isPaid) {
    totalRow("Advance Paid (Delivery)", `- ${money(prepaidDeliveryFee, symbol)}`, { color: GREEN });
  }

  // Grand total band
  y += 1;
  doc.setFillColor(...INK);
  doc.rect(totalsX - 5, y - 5, valX - totalsX + 5, 11, "F");
  doc.setFont(SANS, "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  const labelDue = isPaid ? "PAID IN FULL" : isPrepaidDelivery ? "DUE ON DELIVERY" : "TOTAL DUE";
  const dueAmount = isPaid ? 0 : isPrepaidDelivery ? Math.max(0, Number(order.total || 0) - prepaidDeliveryFee) : Number(order.total || 0);
  doc.text(labelDue, totalsX, y + 1.5);
  doc.setTextColor(...GOLD_SOFT);
  doc.setFontSize(12);
  doc.text(money(dueAmount, symbol), valX, y + 1.5, { align: "right" });

  // Footer
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(M, H - 30, W - M, H - 30);
  doc.setFont(SERIF, "italic");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(invoiceSettings?.invoice_footer || brand.footer || `Thank you for choosing ${brand.name}.`, W / 2, H - 22, { align: "center" });
  doc.setFont(SANS, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(invoiceSettings?.terms_text || "This is a computer-generated invoice and does not require a signature.", W / 2, H - 16, { align: "center" });

  return doc;
}

export function printInvoicePdf(order: any, items: any[], brand: MasterPanelBrandSettings, invoiceSettings?: MasterPanelInvoiceSettings) {
  const doc = buildInvoicePdf(order, items, brand, invoiceSettings);
  doc.autoPrint();
  const blobUrl = doc.output("bloburl");
  const win = window.open(blobUrl as any, "_blank");
  if (win) win.focus();
}

export function downloadInvoicePdf(order: any, items: any[], brand: MasterPanelBrandSettings, invoiceSettings?: MasterPanelInvoiceSettings) {
  const doc = buildInvoicePdf(order, items, brand, invoiceSettings);
  doc.save(`Invoice-${order.order_number}.pdf`);
}

/**
 * Print MasterPanel 80mm/58mm POS Receipt Slip
 */
export function printThermalSlip(
  order: any,
  items: any[],
  brand: MasterPanelBrandSettings,
  posSettings?: MasterPanelPosSettings
) {
  const symbol = brand.currency || "৳";
  const dateStr = new Date(order.created_at || Date.now()).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  });
  const width = posSettings?.printer_width === "58mm" ? "52mm" : "72mm";
  const pageSize = posSettings?.printer_width === "58mm" ? "58mm auto" : "80mm auto";

  const itemsHtml = (items || []).map((it: any) => `
    <tr>
      <td style="padding: 4px 0; font-weight: 600;">
        ${it.product_name || it.name || "Item"}
        ${it.sku ? `<br/><span style="font-size: 10px; color: #666;">SKU: ${it.sku}</span>` : ""}
      </td>
      <td style="padding: 4px 0; text-align: center;">${it.quantity ?? 1}</td>
      <td style="padding: 4px 0; text-align: right; font-family: monospace;">${symbol}${Number(it.total_price || (it.quantity * it.unit_price) || 0).toLocaleString()}</td>
    </tr>
  `).join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>POS Receipt - ${order.order_number}</title>
      <style>
        @page { size: ${pageSize}; margin: 3mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          width: ${width};
          margin: 0 auto;
          padding: 4px 0;
          color: #000;
          font-size: 12px;
          line-height: 1.4;
        }
        .header { text-align: center; margin-bottom: 10px; }
        .header h1 { font-size: 17px; font-weight: 900; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px; }
        .header p { margin: 2px 0; font-size: 11px; color: #444; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .info-row { display: flex; justify-content: space-between; font-size: 11px; margin: 2px 0; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 11px; }
        th { border-bottom: 1px solid #000; padding: 4px 0; text-align: left; font-size: 10px; text-transform: uppercase; }
        .total-row { display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; margin: 4px 0; }
        .grand-total { font-size: 14px; font-weight: 900; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 6px 0; margin-top: 6px; }
        .badge { text-align: center; font-weight: bold; font-size: 11px; padding: 5px; border: 1px solid #000; margin: 10px 0 6px; text-transform: uppercase; letter-spacing: 0.5px; }
        .footer { text-align: center; font-size: 10px; color: #555; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${posSettings?.receipt_header || brand.name || "ORIZINO"}</h1>
        ${brand.addr ? `<p>${brand.addr}</p>` : ""}
        ${brand.phone ? `<p>Phone: ${brand.phone}</p>` : ""}
        ${brand.email ? `<p>${brand.email}</p>` : ""}
      </div>
      <div class="divider"></div>
      <div class="info-row"><span>Receipt #:</span><strong>${order.order_number}</strong></div>
      <div class="info-row"><span>Date:</span><span>${dateStr}</span></div>
      <div class="info-row"><span>Customer:</span><strong>${order.customer_name || order.shipping_address?.full_name || "Walk-in Customer"}</strong></div>
      ${order.guest_phone || order.shipping_address?.phone ? `<div class="info-row"><span>Phone:</span><span>${order.guest_phone || order.shipping_address?.phone}</span></div>` : ""}
      <div class="info-row"><span>Channel:</span><span>${String(order.order_source || "Store Counter").toUpperCase()}</span></div>
      <div class="divider"></div>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <div class="divider"></div>
      <div class="info-row"><span>Subtotal:</span><span>${symbol}${Number(order.subtotal || order.total || 0).toLocaleString()}</span></div>
      ${order.shipping_fee ? `<div class="info-row"><span>Shipping:</span><span>${symbol}${Number(order.shipping_fee).toLocaleString()}</span></div>` : ""}
      ${order.coupon_discount ? `<div class="info-row"><span>Discount:</span><span>-${symbol}${Number(order.coupon_discount).toLocaleString()}</span></div>` : ""}
      <div class="total-row grand-total">
        <span>TOTAL PAID:</span>
        <span>${symbol}${Number(order.total || 0).toLocaleString()}</span>
      </div>
      <div class="badge">
        ${order.status === "delivered" ? "PAID IN FULL · DELIVERED" : "PAID IN FULL"}
      </div>
      <div class="footer">
        <p>${posSettings?.receipt_footer || brand.footer || `Thank you for shopping with ${brand.name || "ORIZINO"}!`}</p>
        <p>Keep this receipt slip for warranty & authentication.</p>
      </div>
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  const printWin = window.open("", "_blank", "width=420,height=650");
  if (printWin) {
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
  }
}

/**
 * Build MasterPanel 4x6 / Thermal Shipping Label Sticker PDF
 */
export function buildShippingStickerPdf(order: any, brand: MasterPanelBrandSettings, preset?: MasterPanelStickerPreset): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: [101.6, 152.4] }); // 4in x 6in thermal
  const W = 101.6;
  const H = 152.4;
  const M = 6;
  const symbol = brand.currency || "Tk ";
  const addr = getAddr(order);
  const codAmount = ["paid", "delivered"].includes(String(order.status || "").toLowerCase())
    ? "0.00 (PREPAID)"
    : `${symbol}${Number(order.total || 0).toLocaleString()}`;

  // Outer border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.rect(M, M, W - M * 2, H - M * 2);

  // Top header band
  doc.setFillColor(20, 20, 20);
  doc.rect(M, M, W - M * 2, 14, "F");
  doc.setFont(SANS, "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text((brand.name || "ORIZINO").toUpperCase(), M + 4, M + 9.5);
  doc.setFontSize(9);
  doc.text("SHIPPING LABEL", W - M - 4, M + 9.5, { align: "right" });

  // Order & Date Bar
  doc.setFont(SANS, "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(`ORDER #${order.order_number}`, M + 4, M + 22);

  doc.setFont(SANS, "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(new Date(order.created_at || Date.now()).toLocaleDateString(), W - M - 4, M + 22, { align: "right" });

  // Divider
  doc.line(M, M + 26, W - M, M + 26);

  // Deliver To Box
  doc.setFont(SANS, "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("DELIVER TO:", M + 4, M + 32);

  doc.setFont(SANS, "bold");
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text(addr.full_name || addr.name || order.customer_name || "Customer", M + 4, M + 39);

  doc.setFont(SANS, "normal");
  doc.setFontSize(9.5);
  const addressLines = doc.splitTextToSize(fullAddress(addr) || "Address not specified", W - M * 2 - 8);
  doc.text(addressLines, M + 4, M + 45);

  let curY = M + 45 + addressLines.length * 4.5 + 2;
  if (addr.phone || order.guest_phone) {
    doc.setFont(SANS, "bold");
    doc.setFontSize(11);
    doc.text(`PHONE: ${addr.phone || order.guest_phone}`, M + 4, curY);
    curY += 6;
  }

  // Divider
  doc.line(M, curY + 2, W - M, curY + 2);
  curY += 7;

  // Courier & Tracking Row
  doc.setFont(SANS, "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("COURIER SERVICE", M + 4, curY);
  doc.text("TRACKING / CONSIGNMENT", W - M - 4, curY, { align: "right" });
  curY += 5;

  doc.setFont(SANS, "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(String(order.courier_name || "Standard Courier").toUpperCase(), M + 4, curY);
  doc.text(String(order.tracking_code || order.consignment_id || order.order_number), W - M - 4, curY, { align: "right" });
  curY += 8;

  // COD & Payment Box
  doc.setFillColor(245, 245, 245);
  doc.rect(M + 3, curY, W - M * 2 - 6, 18, "F");
  doc.rect(M + 3, curY, W - M * 2 - 6, 18, "S");

  doc.setFont(SANS, "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("CASH ON DELIVERY (COD) DUE", M + 7, curY + 6);
  doc.text("PAYMENT", W - M - 7, curY + 6, { align: "right" });

  doc.setFont(SANS, "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(codAmount, M + 7, curY + 14);
  doc.setFontSize(10);
  doc.text(String(order.payment_method || "COD").toUpperCase(), W - M - 7, curY + 14, { align: "right" });
  curY += 24;

  // Sender From Box
  doc.setFont(SANS, "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text("IF UNDELIVERED, RETURN TO:", M + 4, curY);
  curY += 4.5;
  doc.setFont(SANS, "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text(brand.name, M + 4, curY);
  curY += 4;
  doc.setFont(SANS, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);
  if (brand.addr) { doc.text(brand.addr, M + 4, curY); curY += 3.5; }
  if (brand.phone) { doc.text(`Helpline: ${brand.phone}`, M + 4, curY); }

  return doc;
}

export function printShippingSticker(order: any, brand: MasterPanelBrandSettings, preset?: MasterPanelStickerPreset) {
  const doc = buildShippingStickerPdf(order, brand, preset);
  doc.autoPrint();
  const blobUrl = doc.output("bloburl");
  const win = window.open(blobUrl as any, "_blank");
  if (win) win.focus();
}

export function downloadShippingStickerPdf(order: any, brand: MasterPanelBrandSettings, preset?: MasterPanelStickerPreset) {
  const doc = buildShippingStickerPdf(order, brand, preset);
  doc.save(`ShippingLabel-${order.order_number}.pdf`);
}
