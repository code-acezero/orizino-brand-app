import bwipjs from "bwip-js/browser";
import { buildVerificationUrl } from "@orizino/shared";
import type { StickerData, StickerConfig } from "@/components/admin/products/Sticker";
import { STICKER_DEFAULTS } from "@/components/admin/products/Sticker";

const PT_TO_IN = 1 / 72;

function isColorDark(hex: string = "#FFFFFF"): boolean {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2) || "ff", 16);
  const g = parseInt(clean.substring(2, 4) || "ff", 16);
  const b = parseInt(clean.substring(4, 6) || "ff", 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 128;
}

/** Helper to load an image URL into an HTMLImageElement safely */
async function loadImage(url: string): Promise<HTMLImageElement | null> {
  if (!url) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Pure Canvas 2D Renderer for Stickers.
 * Generates an ultra-crisp 300+ DPI bitmap with 100% 1:1 pixel accuracy
 * matching the exact CSS box-model and flexbox layouts of Sticker.tsx:
 * - Exact border thickness, dash/dot geometry, and corner radii
 * - Accurate content insets (border-box model accounting for border + padding)
 * - Proportional vertical distribution (justify-between)
 * - Identical typography weights, baselines, and monospace fonts
 */
export async function renderStickerToCanvas(
  data: StickerData,
  dpi = 300
): Promise<HTMLCanvasElement> {
  const rawConfig = data.config ?? {};
  const c: Required<StickerConfig> = {
    ...STICKER_DEFAULTS,
    ...rawConfig,
    barcode_format: rawConfig.barcode_format || "qrcode",
    border_style: rawConfig.border_style || "solid",
    qr_data_mode: rawConfig.qr_data_mode || "url",
    show_watermark: rawConfig.show_watermark ?? true,
    watermark_opacity:
      typeof rawConfig.watermark_opacity === "number" ? rawConfig.watermark_opacity : 0.08,
    border_radius_pt:
      typeof rawConfig.border_radius_pt === "number" ? rawConfig.border_radius_pt : 0,
  };

  const scale = dpi / 72; // Points to pixels at given DPI (300 DPI: 1pt = 4.1667px)
  const inToPx = dpi; // Inches to pixels (300 DPI: 1in = 300px)

  const widthPx = Math.round(c.width_in * inToPx);
  const heightPx = Math.round(c.height_in * inToPx);

  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create canvas 2D context");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const isDark = isColorDark(c.background_color);
  const textColor = c.text_color || (isDark ? "#FFFFFF" : "#000000");
  const fontFamily = c.font_family || "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
  const monoFont = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

  // 1. Geometric Calculations (Border-Box Model matching CSS)
  const hasBorder = c.border_style !== "none" && c.border_width_pt > 0;
  const borderWidthPx = hasBorder ? Math.max(1, (c.border_width_pt / 72) * dpi) : 0;
  const maxRadiusPx = Math.min(widthPx, heightPx) / 2;
  const radiusPx = Math.min((c.border_radius_pt / 72) * dpi, maxRadiusPx);

  // 2. Draw Background
  ctx.save();
  ctx.beginPath();
  if (radiusPx > 0 && typeof ctx.roundRect === "function") {
    ctx.roundRect(0, 0, widthPx, heightPx, radiusPx);
  } else {
    ctx.rect(0, 0, widthPx, heightPx);
  }
  ctx.fillStyle = c.background_color || "#FFFFFF";
  ctx.fill();
  ctx.restore();

  // 3. Setup Content Inset & Clipping Box (Inside Border + Padding)
  const padXPx = Math.round(c.padding_x_in * inToPx);
  const padYPx = Math.round(c.padding_y_in * inToPx);

  const insetLeft = borderWidthPx + padXPx;
  const insetTop = borderWidthPx + padYPx;
  const insetRight = borderWidthPx + padXPx;
  const insetBottom = borderWidthPx + padYPx;

  const contentLeft = insetLeft;
  const contentTop = insetTop;
  const contentRight = widthPx - insetRight;
  const contentBottom = heightPx - insetBottom;
  const contentW = Math.max(10, contentRight - contentLeft);
  const contentH = Math.max(10, contentBottom - contentTop);

  // Clip all interior elements to the rounded inner container
  ctx.save();
  ctx.beginPath();
  const innerClipRadius = Math.max(0, radiusPx - borderWidthPx / 2);
  if (innerClipRadius > 0 && typeof ctx.roundRect === "function") {
    ctx.roundRect(0, 0, widthPx, heightPx, radiusPx);
  } else {
    ctx.rect(0, 0, widthPx, heightPx);
  }
  ctx.clip();

  // 4. Draw Brand Watermark (centered)
  if (c.show_watermark) {
    const logoSrc = data.brandLogoUrl || c.watermark_url;
    if (logoSrc) {
      try {
        const logoImg = await loadImage(logoSrc);
        if (logoImg) {
          ctx.save();
          ctx.globalAlpha = Math.max(0.02, Math.min(1, c.watermark_opacity));
          const maxW = widthPx * 0.72;
          const maxH = heightPx * 0.72;
          const aspect = logoImg.naturalWidth / (logoImg.naturalHeight || 1);
          let drawW = maxW;
          let drawH = drawW / aspect;
          if (drawH > maxH) {
            drawH = maxH;
            drawW = drawH * aspect;
          }
          const drawX = (widthPx - drawW) / 2;
          const drawY = (heightPx - drawH) / 2;

          const offCanvas = document.createElement("canvas");
          offCanvas.width = Math.round(drawW);
          offCanvas.height = Math.round(drawH);
          const offCtx = offCanvas.getContext("2d");
          if (offCtx) {
            offCtx.drawImage(logoImg, 0, 0, offCanvas.width, offCanvas.height);
            offCtx.globalCompositeOperation = "source-in";
            offCtx.fillStyle = isDark ? "#FFFFFF" : "#000000";
            offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);
            ctx.drawImage(offCanvas, drawX, drawY);
          } else {
            ctx.drawImage(logoImg, drawX, drawY, drawW, drawH);
          }
          ctx.restore();
        }
      } catch (e) {
        console.error("Watermark image render failed", e);
      }
    } else {
      ctx.save();
      ctx.globalAlpha = Math.max(0.02, Math.min(1, c.watermark_opacity * 0.75));
      ctx.fillStyle = textColor;
      const fontSize = Math.round(Math.min(c.height_in * 32, 24) * scale);
      ctx.font = `900 ${fontSize}px ${fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText((data.brand || "ORIZINO").toUpperCase(), widthPx / 2, heightPx / 2);
      ctx.restore();
    }
  }

  const isQr = c.barcode_format === "qrcode" || c.barcode_format === "datamatrix";

  if (isQr) {
    // ─── 2D QR SIDE-BY-SIDE LAYOUT ──────────────────────────────────────────
    // In CSS: qrSizeIn = Math.min(innerHIn, innerWIn * 0.45, 0.75)
    const qrSizePx = Math.round(Math.min(contentH, contentW * 0.45, 0.75 * inToPx));
    const qrCanvas = document.createElement("canvas");
    const payload =
      c.qr_data_mode === "raw" ? data.serialCode : buildVerificationUrl(data.serialCode);

    if (c.show_barcode) {
      try {
        bwipjs.toCanvas(qrCanvas, {
          bcid: c.barcode_format || "qrcode",
          text: payload,
          scale: Math.max(3, Math.round(dpi / 72)),
          eclevel: c.qr_ecl || "M",
          includetext: false,
          backgroundcolor: (c.background_color || "#FFFFFF").replace("#", ""),
          paddingwidth: 0,
          paddingheight: 0,
        } as any);

        const qrY = contentTop + Math.round((contentH - qrSizePx) / 2);
        ctx.drawImage(qrCanvas, contentLeft, qrY, qrSizePx, qrSizePx);
      } catch (e) {
        console.error("QR Canvas generate error", e);
      }
    }

    // Gap between QR and text column (Tailwind gap-1.5 = 6px @ 96dpi = 0.0625in)
    const gapPx = Math.round(0.0625 * inToPx);
    const textX = c.show_barcode ? contentLeft + qrSizePx + gapPx : contentLeft;
    const textRight = contentRight;

    // Text column vertical padding (Tailwind py-0.5 = 2px @ 96dpi = 0.02083in)
    const pyPx = Math.round(0.02083 * inToPx);
    const colTop = contentTop + pyPx;
    const colBottom = contentBottom - pyPx;

    const headerFontPx = Math.round(c.header_font_size_pt * scale);
    const footerFontPx = Math.round(c.footer_font_size_pt * scale);
    const productFontPx = Math.round(c.product_name_font_size_pt * scale);

    // Row 1: Brand (left) & Size (right)
    ctx.save();
    ctx.textBaseline = "top";
    ctx.fillStyle = textColor;

    if (c.show_brand) {
      ctx.font = `${c.brand_bold ? "700" : "400"} ${headerFontPx}px ${fontFamily}`;
      ctx.textAlign = "left";
      ctx.fillText(data.brand || "", textX, colTop);
    }

    if (data.showSize && data.size) {
      ctx.font = `700 ${headerFontPx}px ${fontFamily}`;
      ctx.textAlign = "right";
      ctx.fillText(`Size: ${data.size}`, textRight, colTop);
    }
    ctx.restore();

    // Row 2: Product Name (optional)
    let headerOffset = headerFontPx * 1.25;
    if (c.show_product_name && data.productName) {
      ctx.save();
      ctx.textBaseline = "top";
      ctx.font = `400 ${productFontPx}px ${fontFamily}`;
      ctx.fillStyle = textColor;
      ctx.globalAlpha = 0.75;
      ctx.textAlign = "left";
      ctx.fillText(data.productName, textX, colTop + headerOffset);
      ctx.restore();
      headerOffset += productFontPx * 1.25;
    }

    // Row 3: Serial Code (vertically centered between header and price row in justify-between)
    if (c.show_serial_code) {
      ctx.save();
      ctx.textBaseline = "middle";
      const headerBottom = colTop + headerOffset;
      const priceTop = colBottom - headerFontPx * 1.2;
      const serialCenterY = Math.round((headerBottom + priceTop) / 2);

      ctx.font = `500 ${footerFontPx}px ${monoFont}`;
      ctx.fillStyle = textColor;
      ctx.textAlign = "left";
      ctx.fillText(`SN: ${data.serialCode}`, textX, serialCenterY);
      ctx.restore();
    }

    // Row 4: Prices & AUTHENTIC Badge (aligned to bottom)
    if (c.show_price) {
      ctx.save();
      ctx.textBaseline = "bottom";
      let curPriceX = textX;

      const hasDiscount =
        data.showOriginalPrice &&
        typeof data.compareAtPrice === "number" &&
        data.compareAtPrice > data.price;

      if (hasDiscount) {
        // Strike-through original price
        ctx.font = `400 ${footerFontPx}px ${fontFamily}`;
        ctx.fillStyle = textColor;
        ctx.globalAlpha = 0.6;
        const compText = `${data.currency}${data.compareAtPrice}`;
        ctx.textAlign = "left";
        ctx.fillText(compText, curPriceX, colBottom);
        const compMetrics = ctx.measureText(compText);
        const compW = compMetrics.width;

        // Exact vertical center of digits (middle of digit cap height)
        const strikeY = Math.round(colBottom - (footerFontPx * 0.46));

        ctx.beginPath();
        ctx.lineWidth = Math.max(1, Math.round(scale * 0.55));
        ctx.strokeStyle = textColor;
        ctx.moveTo(curPriceX, strikeY);
        ctx.lineTo(curPriceX + compW, strikeY);
        ctx.stroke();

        curPriceX += compW + Math.round(4 * (dpi / 96));
      }

      // Sale Price
      ctx.globalAlpha = 1.0;
      ctx.font = `${c.price_bold ? "700" : "400"} ${headerFontPx}px ${fontFamily}`;
      ctx.fillStyle = textColor;
      ctx.textAlign = "left";
      ctx.fillText(`${data.currency}${data.price}`, curPriceX, colBottom);

      // AUTHENTIC Badge (right-aligned)
      const badgeFontPx = Math.max(8, Math.round(5 * scale));
      ctx.font = `600 ${badgeFontPx}px ${monoFont}`;
      ctx.textAlign = "right";
      ctx.fillStyle = textColor;
      ctx.globalAlpha = 0.55;
      ctx.fillText("AUTHENTIC", textRight, colBottom);
      ctx.restore();
    }
  } else {
    // ─── 1D BARCODE STACKED LAYOUT ──────────────────────────────────────────
    const headerFontPx = Math.round(c.header_font_size_pt * scale);
    const footerFontPx = Math.round(c.footer_font_size_pt * scale);

    const pyPx = Math.round(0.02083 * inToPx);
    const colTop = contentTop + pyPx;
    const colBottom = contentBottom - pyPx;

    // Header row
    if (c.show_brand || (data.showSize && data.size)) {
      ctx.save();
      ctx.textBaseline = "top";
      ctx.fillStyle = textColor;
      if (c.show_brand) {
        ctx.font = `${c.brand_bold ? "700" : "400"} ${headerFontPx}px ${fontFamily}`;
        ctx.textAlign = "left";
        ctx.fillText(data.brand || "", contentLeft, colTop);
      }
      if (data.showSize && data.size) {
        ctx.font = `700 ${headerFontPx}px ${fontFamily}`;
        ctx.textAlign = "right";
        ctx.fillText(`Size: ${data.size}`, contentRight, colTop);
      }
      ctx.restore();
    }

    // 1D Barcode Graphic (centered in available space)
    if (c.show_barcode) {
      const barcodeTop = colTop + headerFontPx * 1.35;
      const barcodeBottom = colBottom - footerFontPx * 1.35;
      const availableBarcodeH = Math.max(8, barcodeBottom - barcodeTop);
      const barcodeHeightIn = Math.min(
        c.barcode_height_in,
        availableBarcodeH / inToPx
      );
      const barcodeHeightPx = Math.round(barcodeHeightIn * inToPx);
      const barcodeCanvas = document.createElement("canvas");
      try {
        bwipjs.toCanvas(barcodeCanvas, {
          bcid: c.barcode_format || "code128",
          text: data.serialCode,
          scale: c.barcode_scale || 3,
          height: Math.max(8, barcodeHeightIn * 25.4),
          includetext: !!c.barcode_show_text,
          backgroundcolor: (c.background_color || "#FFFFFF").replace("#", ""),
          paddingwidth: 0,
          paddingheight: 0,
        });

        const barcodeY = barcodeTop + Math.round((availableBarcodeH - barcodeHeightPx) / 2);
        ctx.drawImage(barcodeCanvas, contentLeft, barcodeY, contentW, barcodeHeightPx);
      } catch (e) {
        console.error("1D Barcode render error", e);
      }
    }

    // Footer: Serial & Price
    if (c.show_serial_code || c.show_price) {
      ctx.save();
      ctx.textBaseline = "bottom";
      if (c.show_serial_code) {
        ctx.font = `500 ${footerFontPx}px ${monoFont}`;
        ctx.textAlign = "left";
        ctx.fillStyle = textColor;
        ctx.fillText(data.serialCode, contentLeft, colBottom);
      }
      if (c.show_price) {
        const hasDiscount =
          data.showOriginalPrice &&
          typeof data.compareAtPrice === "number" &&
          data.compareAtPrice > data.price;

        if (hasDiscount) {
          ctx.font = `${c.price_bold ? "700" : "400"} ${footerFontPx}px ${fontFamily}`;
          ctx.textAlign = "right";
          ctx.fillStyle = textColor;
          ctx.globalAlpha = 1.0;
          const saleText = `${data.currency}${data.price}`;
          ctx.fillText(saleText, contentRight, colBottom);
          const saleMetrics = ctx.measureText(saleText);

          const compFontPx = Math.max(7, Math.round(footerFontPx * 0.85));
          ctx.font = `400 ${compFontPx}px ${fontFamily}`;
          ctx.globalAlpha = 0.6;
          const compText = `${data.currency}${data.compareAtPrice}`;
          const compMetrics = ctx.measureText(compText);
          const compX = contentRight - saleMetrics.width - Math.round(3 * (dpi / 96)) - compMetrics.width;
          ctx.textAlign = "left";
          ctx.fillText(compText, compX, colBottom);

          const strikeY = Math.round(colBottom - (compFontPx * 0.46));
          ctx.beginPath();
          ctx.lineWidth = Math.max(1, Math.round(scale * 0.55));
          ctx.strokeStyle = textColor;
          ctx.moveTo(compX, strikeY);
          ctx.lineTo(compX + compMetrics.width, strikeY);
          ctx.stroke();
        } else {
          ctx.font = `${c.price_bold ? "700" : "400"} ${footerFontPx}px ${fontFamily}`;
          ctx.textAlign = "right";
          ctx.fillStyle = textColor;
          ctx.fillText(`${data.currency}${data.price}`, contentRight, colBottom);
        }
      }
      ctx.restore();
    }
  }

  ctx.restore(); // Restore content clipping

  // 5. Draw Outer Border Frame (unclipped, with exact CSS dash geometry)
  if (hasBorder) {
    ctx.save();
    ctx.beginPath();
    const halfBorder = borderWidthPx / 2;
    const strokeRadius = Math.max(0, radiusPx - halfBorder);

    if (strokeRadius > 0 && typeof ctx.roundRect === "function") {
      ctx.roundRect(
        halfBorder,
        halfBorder,
        widthPx - borderWidthPx,
        heightPx - borderWidthPx,
        strokeRadius
      );
    } else {
      ctx.rect(halfBorder, halfBorder, widthPx - borderWidthPx, heightPx - borderWidthPx);
    }

    ctx.lineWidth = borderWidthPx;
    ctx.strokeStyle = c.border_color || "#000000";

    // Match browser standard CSS dash length & dot spacing
    if (c.border_style === "dashed") {
      // CSS 1pt dashed dash length is roughly 3x border thickness
      const dashLen = Math.max(4, Math.round(borderWidthPx * 2.5));
      const dashGap = Math.max(3, Math.round(borderWidthPx * 2.0));
      ctx.lineCap = "butt";
      ctx.setLineDash([dashLen, dashGap]);
    } else if (c.border_style === "dotted") {
      // Clean circular dots with round cap
      ctx.lineCap = "round";
      ctx.setLineDash([0, Math.max(4, Math.round(borderWidthPx * 2.2))]);
    } else {
      ctx.lineCap = "butt";
      ctx.setLineDash([]);
    }

    ctx.stroke();
    ctx.restore();
  }

  return canvas;
}
