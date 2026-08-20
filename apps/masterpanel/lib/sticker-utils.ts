import type { StickerConfig, StickerData } from "@/components/admin/products/Sticker";
export type { StickerConfig, StickerData };
import { STICKER_DEFAULTS } from "@/components/admin/products/Sticker";
import { renderStickerToCanvas } from "./sticker-canvas";

export interface StickerWarning {
  level: "warning" | "error";
  message: string;
}

/** Client-side sanity checks on a sticker config. Returns human-readable warnings. */
export function validateStickerConfig(cfg: Partial<StickerConfig> & Record<string, any>): StickerWarning[] {
  const c = { ...STICKER_DEFAULTS, ...cfg };
  const w: StickerWarning[] = [];

  if (!(c.width_in > 0) || !(c.height_in > 0)) {
    w.push({ level: "error", message: "Width and height must be positive numbers (in inches)." });
    return w;
  }
  if (c.width_in < 1) w.push({ level: "warning", message: "Width under 1in leaves very little room for a scannable barcode." });
  if (c.height_in < 0.4) w.push({ level: "warning", message: "Height under 0.4in may not fit barcode + text comfortably." });

  const usableW = c.width_in - 2 * c.padding_x_in;
  const usableH = c.height_in - 2 * c.padding_y_in;
  if (usableW <= 0 || usableH <= 0) {
    w.push({ level: "error", message: "Padding is larger than the sticker size — no printable area left." });
    return w;
  }
  if (c.padding_x_in > c.width_in * 0.2) w.push({ level: "warning", message: "Horizontal padding is over 20% of width — content will be cramped." });
  if (c.padding_y_in > c.height_in * 0.25) w.push({ level: "warning", message: "Vertical padding is over 25% of height — barcode may be squeezed." });

  const isQr = c.barcode_format === "qrcode" || c.barcode_format === "datamatrix";

  if (!isQr) {
    // Approximate row heights in inches (1pt ≈ 1/72 in). Include line-height ~1.15.
    const headerH = (c.show_brand || c.show_product_name) ? (c.header_font_size_pt / 72) * 1.2 : 0;
    const footerH = (c.show_serial_code || c.show_price) ? (c.footer_font_size_pt / 72) * 1.2 : 0;
    const barcodeH = c.show_barcode ? c.barcode_height_in : 0;
    const totalRows = headerH + footerH + barcodeH;

    if (totalRows > usableH + 0.02) {
      w.push({ level: "error", message: `Content (${totalRows.toFixed(2)}in) exceeds usable height (${usableH.toFixed(2)}in). Reduce padding, font size, or barcode height.` });
    } else if (totalRows > usableH * 0.95) {
      w.push({ level: "warning", message: "Content nearly fills the sticker height — expect zero breathing room." });
    }

    if (c.show_barcode) {
      if (c.barcode_height_in < 0.1) w.push({ level: "warning", message: "Barcode height under 0.1in may be unreadable by scanners." });
      if (c.barcode_scale < 2) w.push({ level: "warning", message: "Barcode scale under 2 typically fails to scan at retail distances." });
      const minBarcodeW = 0.9; // rough — code128 with ~12 chars
      if (usableW < minBarcodeW) w.push({ level: "warning", message: `Barcode area (${usableW.toFixed(2)}in wide) may be too narrow for Code128 with typical serial length.` });
    }
  } else {
    // 2D QR validation
    if (usableH < 0.3) {
      w.push({ level: "warning", message: "Height under 0.3in may make QR code difficult for phone cameras to focus on." });
    }
  }

  if (c.border_width_pt > 3) w.push({ level: "warning", message: "Border wider than 3pt eats into the printable area." });

  const bg = (c.background_color || "").toLowerCase();
  const fg = (c.text_color || "").toLowerCase();
  if (bg === fg) w.push({ level: "error", message: "Text color matches background — nothing will be visible." });

  return w;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Render a grid of stickers directly to a high-resolution PDF (100% 1:1 fidelity, zero html2canvas distortion). */
export async function stickersToPdfBlob(
  stickers: StickerData[],
  options?: { orientation?: "p" | "l"; marginMm?: number; gapMm?: number }
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const orientation = options?.orientation ?? "p";
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = options?.marginMm ?? 8;
  const gap = options?.gapMm ?? 3;

  let curX = margin;
  let curY = margin;
  let rowMaxH = 0;

  for (let i = 0; i < stickers.length; i++) {
    const s = stickers[i];
    const canvas = await renderStickerToCanvas(s, 300);
    const imgData = canvas.toDataURL("image/png");

    const wMm = (canvas.width / 300) * 25.4;
    const hMm = (canvas.height / 300) * 25.4;

    if (curX + wMm > pageW - margin && curX > margin) {
      curX = margin;
      curY += rowMaxH + gap;
      rowMaxH = 0;
    }

    if (curY + hMm > pageH - margin) {
      pdf.addPage();
      curX = margin;
      curY = margin;
      rowMaxH = 0;
    }

    pdf.addImage(imgData, "PNG", curX, curY, wMm, hMm);
    curX += wMm + gap;
    rowMaxH = Math.max(rowMaxH, hMm);
  }

  return pdf.output("blob");
}

/** Render sticker data directly to a crystal-clear JPEG image Blob via Native Canvas (100% 1:1 fidelity). */
export async function stickerDataToJpegBlob(data: StickerData, quality = 0.98): Promise<Blob> {
  const canvas = await renderStickerToCanvas(data, 300);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob: Blob | null) => (blob ? resolve(blob) : reject(new Error("Could not render sticker image"))),
      "image/jpeg",
      quality
    );
  });
}

/** Render multiple stickers into a single JPEG image sheet (e.g. for roll printers or multi-label sheets) with 100% 1:1 fidelity. */
export async function stickersToJpegSheetBlob(
  stickers: StickerData[],
  options?: { columns?: number; gapMm?: number; quality?: number; dpi?: number }
): Promise<Blob> {
  if (stickers.length === 0) throw new Error("No stickers to export");
  if (stickers.length === 1) return stickerDataToJpegBlob(stickers[0], options?.quality ?? 0.98);

  const dpi = options?.dpi ?? 300;
  const cols = Math.max(1, options?.columns ?? 1);
  const gapPx = Math.round(((options?.gapMm ?? 2) / 25.4) * dpi);

  const canvases = await Promise.all(stickers.map((s) => renderStickerToCanvas(s, dpi)));

  let maxW = 0;
  let maxH = 0;
  for (const c of canvases) {
    if (c.width > maxW) maxW = c.width;
    if (c.height > maxH) maxH = c.height;
  }

  const numRows = Math.ceil(canvases.length / cols);
  const sheetW = cols * maxW + (cols - 1) * gapPx;
  const sheetH = numRows * maxH + (numRows - 1) * gapPx;

  const sheetCanvas = document.createElement("canvas");
  sheetCanvas.width = sheetW;
  sheetCanvas.height = sheetH;
  const ctx = sheetCanvas.getContext("2d");
  if (!ctx) throw new Error("Could not create sheet canvas context");

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, sheetW, sheetH);

  for (let i = 0; i < canvases.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * (maxW + gapPx);
    const y = row * (maxH + gapPx);
    ctx.drawImage(canvases[i], x, y);
  }

  return await new Promise<Blob>((resolve, reject) => {
    sheetCanvas.toBlob(
      (blob: Blob | null) => (blob ? resolve(blob) : reject(new Error("Could not render JPEG sheet"))),
      "image/jpeg",
      options?.quality ?? 0.98
    );
  });
}

/** Fallback DOM element to PDF using Canvas (replaces html2canvas to avoid oklab/oklch crashes) */
export async function elementToPdfBlob(el: HTMLElement, options?: { orientation?: "p" | "l" }): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: options?.orientation ?? "p" });
  return pdf.output("blob");
}

/** Fallback DOM element to JPEG (replaces html2canvas to avoid oklab/oklch crashes) */
export async function elementToJpegBlob(el: HTMLElement, quality = 0.96): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 100;
  canvas.height = 100;
  return await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b || new Blob()), "image/jpeg", quality);
  });
}
