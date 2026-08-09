import type { StickerConfig } from "@/components/admin/products/Sticker";
import { STICKER_DEFAULTS } from "@/components/admin/products/Sticker";

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

  if (c.border_width_pt > 3) w.push({ level: "warning", message: "Border wider than 3pt eats into the printable area." });

  const bg = (c.background_color || "").toLowerCase();
  const fg = (c.text_color || "").toLowerCase();
  if (bg === fg) w.push({ level: "error", message: "Text color matches background — nothing will be visible." });

  return w;
}

/**
 * html2canvas captures based on the element's full scroll size, but when
 * that element — or an ancestor, such as the surrounding Dialog, which
 * itself has max-height + overflow-y-auto for its own on-screen scrolling —
 * is visually scroll-clipped, capture can mis-measure and produce garbled,
 * overlapping output where later content bleeds back over earlier content.
 * Temporarily lifting the clip on the element AND its scrollable ancestors
 * (then restoring everything) is what actually fixes this, rather than
 * anything about the PDF slicing math itself.
 */
async function withUnclippedElement<T>(el: HTMLElement, fn: (el: HTMLElement) => Promise<T>): Promise<T> {
  const touched: { node: HTMLElement; prev: { maxHeight: string; height: string; overflow: string; overflowY: string } }[] = [];

  let node: HTMLElement | null = el;
  let hops = 0;
  while (node && node !== document.body && hops < 8) {
    touched.push({
      node,
      prev: {
        maxHeight: node.style.maxHeight,
        height: node.style.height,
        overflow: node.style.overflow,
        overflowY: node.style.overflowY,
      },
    });
    node.style.maxHeight = "none";
    node.style.height = "auto";
    node.style.overflow = "visible";
    node.style.overflowY = "visible";
    node = node.parentElement;
    hops++;
  }

  try {
    return await fn(el);
  } finally {
    for (const { node, prev } of touched) {
      node.style.maxHeight = prev.maxHeight;
      node.style.height = prev.height;
      node.style.overflow = prev.overflow;
      node.style.overflowY = prev.overflowY;
    }
  }
}

/** Render a DOM element to a PDF sized to fit the element on A4, returning a Blob. */
export async function elementToPdfBlob(el: HTMLElement, options?: { orientation?: "p" | "l" }): Promise<Blob> {
  const [{ jsPDF }, html2canvasMod] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);
  const html2canvas = (html2canvasMod as any).default ?? html2canvasMod;

  const canvas = await withUnclippedElement(el, (target) =>
    html2canvas(target, { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false })
  );
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: options?.orientation ?? "p" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const contentW = pageW - margin * 2;
  const contentH = pageH - margin * 2;
  const imgData = canvas.toDataURL("image/png");
  const ratio = canvas.width / canvas.height;
  const imgW = contentW;
  const imgH = imgW / ratio;

  if (imgH <= contentH) {
    pdf.addImage(imgData, "PNG", margin, margin, imgW, imgH);
  } else {
    // Multi-page: slice by shifting the (now correctly measured) image up
    // one page's worth at a time — jsPDF clips each addImage to the page
    // bounds, so only the current "slice" of the full image is visible on
    // each page.
    const pageImgH = contentH;
    const totalPages = Math.ceil(imgH / pageImgH);
    for (let i = 0; i < totalPages; i++) {
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, margin - i * pageImgH, imgW, imgH);
    }
  }
  return pdf.output("blob");
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

/** Render a DOM element to a single JPEG image, returning a Blob. */
export async function elementToJpegBlob(el: HTMLElement, quality = 0.92): Promise<Blob> {
  const html2canvasMod = await import("html2canvas");
  const html2canvas = (html2canvasMod as any).default ?? html2canvasMod;
  const canvas = await withUnclippedElement(el, (target) =>
    html2canvas(target, { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false })
  );
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob: Blob | null) => (blob ? resolve(blob) : reject(new Error("Could not render image"))), "image/jpeg", quality);
  });
}
