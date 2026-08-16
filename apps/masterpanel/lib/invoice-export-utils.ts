"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { renderInvoiceHtml, type InvoiceOrderPayload } from "./invoice-render";
import { renderPosSlipHtml, type PosRollSize } from "./pos-slip-render";
import { InvoiceSettingsSchema, type InvoiceSettings } from "./invoice-settings.schema";
import { toast } from "@/lib/app-toast";

export interface ExportOrderContext {
  order: any;
  items: any[];
  settings?: InvoiceSettings;
  brand?: {
    name: string;
    addr?: string;
    email?: string;
    phone?: string;
    website?: string;
    currency?: string;
  };
  rollSize?: PosRollSize;
}

const DEFAULT_SETTINGS = InvoiceSettingsSchema.parse({});

function formatOrderPayload(order: any, items: any[], brand?: any): InvoiceOrderPayload {
  const addr = order.shipping_address || {};
  const customerName = addr.full_name || addr.name || order.customer_name || "Valued Customer";

  return {
    order_number: order.order_number || String(order.id).slice(0, 8),
    invoice_number: `INV-${order.order_number || String(order.id).slice(0, 8)}`,
    issue_date: order.created_at ? new Date(order.created_at).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    due_date: order.due_date || "",
    status: order.status || "pending",
    subtotal: Number(order.subtotal || order.total || 0),
    shipping_fee: Number(order.shipping_fee || 0),
    tax: Number(order.tax || 0),
    discount: Number(order.coupon_discount || order.discount || 0),
    total: Number(order.total || 0),
    currency: "BDT",
    payment_method: order.payment_method || "Cash on Delivery",
    tracking_number: order.tracking_number || "",
    notes: order.notes || "",
    customer: {
      full_name: customerName,
      email: addr.email || order.customer_email || "",
      phone: addr.phone || order.customer_phone || "",
      billing_address: addr.street || addr.address || [addr.city, addr.state, addr.zip].filter(Boolean).join(", "),
      shipping_address: [addr.street || addr.address, addr.city, addr.state, addr.zip, addr.country].filter(Boolean).join(", "),
    },
    items: items.map((i: any) => ({
      name: i.product_name || i.name || "Item",
      sku: i.sku || "",
      quantity: Number(i.quantity || 1),
      unit_price: Number(i.unit_price || i.price || (i.total_price ? i.total_price / (i.quantity || 1) : 0)),
      line_total: Number(i.total_price || (i.price || 0) * (i.quantity || 1)),
      image_url: i.product_image || i.image || "",
    })),
    brand: {
      name: brand?.name || "ORIZINO",
      address: brand?.addr || "House 42, Road 11, Banani, Dhaka, Bangladesh",
      email: brand?.email || "concierge@orizino.com",
      phone: brand?.phone || "+880 1700-000000",
      website: brand?.website || "https://orizino.com",
    },
  };
}

/**
 * 1. PRINT: Opens a print preview window for Invoice, POS Slip, or Both together.
 */
export function printOrderDocuments(ctx: ExportOrderContext, mode: "both" | "invoice" | "slip" = "both") {
  try {
    const s = ctx.settings || DEFAULT_SETTINGS;
    const payload = formatOrderPayload(ctx.order, ctx.items, ctx.brand);
    const rollSize = ctx.rollSize || "58mm";

    let contentHtml = "";

    if (mode === "invoice") {
      contentHtml = renderInvoiceHtml(s, payload);
    } else if (mode === "slip") {
      contentHtml = renderPosSlipHtml(s, payload, rollSize);
    } else {
      // Both: Render Invoice followed by a clean page-break and POS Slip
      const invDoc = renderInvoiceHtml(s, payload);
      const slipDoc = renderPosSlipHtml(s, payload, rollSize);

      contentHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Order #${payload.order_number} - Invoice &amp; Slip</title>
  <style>
    @media print {
      @page { margin: 8mm; }
      .page-break { page-break-after: always; break-after: page; height: 0; }
    }
    body { margin: 0; padding: 0; background: #fff; font-family: sans-serif; }
    .doc-section { display: block; width: 100%; margin-bottom: 24px; }
    .slip-wrapper { display: flex; justify-content: center; width: 100%; }
  </style>
</head>
<body>
  <div class="doc-section">
    ${invDoc.replace(/^<!DOCTYPE[\s\S]*?<body[^>]*>/i, "").replace(/<\/body>[\s\S]*$/i, "")}
  </div>
  <div class="page-break"></div>
  <div class="doc-section slip-wrapper">
    ${slipDoc.replace(/^<!DOCTYPE[\s\S]*?<body[^>]*>/i, "").replace(/<\/body>[\s\S]*$/i, "")}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`;
    }

    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Please allow popups to open the print dialog.");
      return;
    }
    win.document.open();
    win.document.write(contentHtml);
    win.document.close();
    if (mode !== "both") {
      setTimeout(() => win.print(), 500);
    }
  } catch (err: any) {
    console.error("[printOrderDocuments] Error:", err);
    toast.error(err?.message || "Failed to trigger print.");
  }
}

/**
 * 2. EXPORT PDF: Downloads clean client-side PDF for Invoice, POS Slip, or Both.
 */
export function exportOrderPdf(ctx: ExportOrderContext, mode: "both" | "invoice" | "slip" = "both") {
  try {
    const { order, items, brand } = ctx;
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const payload = formatOrderPayload(order, items, brand);

    const INK: [number, number, number] = [20, 17, 15];
    const GOLD: [number, number, number] = [184, 144, 47];
    const MUTED: [number, number, number] = [107, 107, 107];
    const LINE: [number, number, number] = [228, 223, 211];
    const CREAM: [number, number, number] = [251, 248, 241];

    const W = 210;
    const M = 15;

    // Helper to draw standard Invoice page
    const drawInvoicePage = () => {
      // Background Accent
      doc.setFillColor(...CREAM);
      doc.rect(0, 0, W, 42, "F");

      // Brand Title
      doc.setFont("times", "bold");
      doc.setFontSize(22);
      doc.setTextColor(...INK);
      doc.text(payload.brand.name, M, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      doc.text(payload.brand.address || "", M, 26);
      doc.text(`${payload.brand.email || ""} · ${payload.brand.phone || ""}`, M, 31);

      // Invoice Details (Right Aligned)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(...GOLD);
      doc.text("OFFICIAL INVOICE", W - M, 18, { align: "right" });

      doc.setFontSize(9);
      doc.setTextColor(...INK);
      doc.text(`Order #: ${payload.order_number}`, W - M, 25, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.text(`Date: ${new Date(payload.issue_date).toLocaleDateString()}`, W - M, 30, { align: "right" });
      doc.text(`Payment: ${payload.payment_method.toUpperCase()}`, W - M, 35, { align: "right" });

      // Customer Info Box
      const boxY = 50;
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.3);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(M, boxY, W - M * 2, 26, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...GOLD);
      doc.text("BILLED & SHIPPED TO", M + 6, boxY + 7);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...INK);
      doc.text(payload.customer.full_name, M + 6, boxY + 14);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      doc.text(`${payload.customer.phone || ""} · ${payload.customer.shipping_address || "Standard Delivery"}`, M + 6, boxY + 20);

      // Items Table
      autoTable(doc, {
        startY: 84,
        margin: { left: M, right: M },
        head: [["Item Description", "Qty", "Unit Price", "Total Price"]],
        body: payload.items.map((i) => [
          i.name,
          String(i.quantity),
          `Tk ${i.unit_price.toLocaleString()}`,
          `Tk ${i.line_total.toLocaleString()}`,
        ]),
        theme: "plain",
        headStyles: {
          fillColor: [243, 239, 230],
          textColor: [20, 17, 15],
          font: "helvetica",
          fontStyle: "bold",
          fontSize: 8.5,
        },
        bodyStyles: {
          textColor: [20, 17, 15],
          font: "helvetica",
          fontSize: 8.5,
        },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;

      // Summary Table (Right Aligned)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      doc.text("Subtotal:", W - M - 40, finalY);
      doc.text(`Tk ${payload.subtotal.toLocaleString()}`, W - M, finalY, { align: "right" });

      doc.text("Shipping Fee:", W - M - 40, finalY + 6);
      doc.text(`Tk ${payload.shipping_fee.toLocaleString()}`, W - M, finalY + 6, { align: "right" });

      if (payload.discount > 0) {
        doc.text("Discount:", W - M - 40, finalY + 12);
        doc.text(`- Tk ${payload.discount.toLocaleString()}`, W - M, finalY + 12, { align: "right" });
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...INK);
      doc.text("Total Amount:", W - M - 40, finalY + 20);
      doc.text(`Tk ${payload.total.toLocaleString()}`, W - M, finalY + 20, { align: "right" });
    };

    // Helper to draw Thermal Slip Page
    const drawSlipPage = () => {
      doc.setFillColor(...CREAM);
      doc.rect(M, 20, W - M * 2, 160, "F");
      doc.setDrawColor(...LINE);
      doc.rect(M, 20, W - M * 2, 160, "D");

      doc.setFont("times", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...INK);
      doc.text(payload.brand.name, W / 2, 35, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...GOLD);
      doc.text("AUTHENTIC THERMAL RECEIPT SLIP", W / 2, 42, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...INK);
      doc.text(`Order #: ${payload.order_number}`, W / 2, 52, { align: "center" });
      doc.text(`Customer: ${payload.customer.full_name}`, W / 2, 58, { align: "center" });
      doc.text(`Phone: ${payload.customer.phone || ""}`, W / 2, 64, { align: "center" });
      doc.text(`Total: Tk ${payload.total.toLocaleString()} (${payload.payment_method.toUpperCase()})`, W / 2, 70, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...GOLD);
      doc.text("GENUINE ORIZINO PRODUCT", W / 2, 150, { align: "center" });
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text("Scan barcode/QR on invoice for digital warranty", W / 2, 156, { align: "center" });
    };

    if (mode === "invoice") {
      drawInvoicePage();
      doc.save(`Invoice-${payload.order_number}.pdf`);
    } else if (mode === "slip") {
      drawSlipPage();
      doc.save(`POS-Slip-${payload.order_number}.pdf`);
    } else {
      // Both: Page 1 Invoice, Page 2 POS Slip
      drawInvoicePage();
      doc.addPage();
      drawSlipPage();
      doc.save(`Order-${payload.order_number}-Combined.pdf`);
    }

    toast.success(`PDF exported successfully!`);
  } catch (err: any) {
    console.error("[exportOrderPdf] Error:", err);
    toast.error(err?.message || "Failed to export PDF.");
  }
}

/**
 * 3. EXPORT JPG: High-Resolution JPG Render of Invoice, POS Slip, or Both.
 */
export async function exportOrderJpg(ctx: ExportOrderContext, mode: "both" | "invoice" | "slip" = "both") {
  toast.info("Generating high-resolution JPG image(s)...");

  try {
    const s = ctx.settings || DEFAULT_SETTINGS;
    const payload = formatOrderPayload(ctx.order, ctx.items, ctx.brand);
    const rollSize = ctx.rollSize || "58mm";

    // Create offscreen container
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.width = mode === "slip" ? "380px" : "800px";
    container.style.backgroundColor = "#ffffff";
    container.style.zIndex = "-100";
    document.body.appendChild(container);

    const downloadBlob = (canvas: HTMLCanvasElement, filename: string) => {
      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();
    };

    if (mode === "invoice" || mode === "both") {
      container.style.width = "800px";
      container.innerHTML = renderInvoiceHtml(s, payload);
      await new Promise((r) => setTimeout(r, 300));
      const invCanvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      downloadBlob(invCanvas, `Invoice-${payload.order_number}.jpg`);
    }

    if (mode === "slip" || mode === "both") {
      container.style.width = "400px";
      container.innerHTML = renderPosSlipHtml(s, payload, rollSize);
      await new Promise((r) => setTimeout(r, 300));
      const slipCanvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      downloadBlob(slipCanvas, `POS-Slip-${payload.order_number}.jpg`);
    }

    document.body.removeChild(container);
    toast.success("JPG export complete!");
  } catch (err: any) {
    console.error("[exportOrderJpg] Error:", err);
    toast.error(err?.message || "Failed to export JPG.");
  }
}
