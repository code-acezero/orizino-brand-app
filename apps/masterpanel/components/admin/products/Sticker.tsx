import { useEffect, useRef } from "react";
// bwip-js exposes different builds; the browser build is at /browser
import bwipjs from "bwip-js/browser";
import { buildVerificationUrl } from "@orizino/shared";

export interface StickerConfig {
  width_in?: number;
  height_in?: number;
  padding_x_in?: number;
  padding_y_in?: number;
  border_width_pt?: number;
  border_color?: string;
  /** Corner radius in points. 0 = sharp rectangle. */
  border_radius_pt?: number;
  /** CSS border-style for the outer frame: solid | dashed | dotted | double | none */
  border_style?: "solid" | "dashed" | "dotted" | "double" | "none";
  background_color?: string;
  text_color?: string;
  font_family?: string;
  header_font_size_pt?: number;
  footer_font_size_pt?: number;
  product_name_font_size_pt?: number;
  barcode_format?: string;
  barcode_height_in?: number;
  barcode_scale?: number;
  barcode_show_text?: boolean;
  qr_data_mode?: "url" | "raw";
  qr_ecl?: "L" | "M" | "Q" | "H";
  show_brand?: boolean;
  show_serial_code?: boolean;
  show_price?: boolean;
  show_barcode?: boolean;
  show_product_name?: boolean;
  show_watermark?: boolean;
  watermark_opacity?: number;
  watermark_url?: string;
  brand_bold?: boolean;
  price_bold?: boolean;
  brand_name?: string;
  currency_symbol?: string;
  show_size?: boolean;
  show_original_price?: boolean;
  /** Alignment mode: "horizontal" (default) or "vertical" (rotated 90deg for POS roll printing) */
  orientation?: "horizontal" | "vertical";
}

export interface StickerData {
  serialCode: string;
  productName: string;
  size?: string | null;
  price: number;
  compareAtPrice?: number | null;
  brand: string;
  brandLogoUrl?: string | null;
  currency: string;
  showSize: boolean;
  showOriginalPrice: boolean;
  orientation?: "horizontal" | "vertical";
  config?: StickerConfig;
}

export const STICKER_DEFAULTS: Required<StickerConfig> = {
  width_in: 2,
  height_in: 0.6,
  padding_x_in: 0.05,
  padding_y_in: 0.04,
  border_width_pt: 1,
  border_color: "#0F172A",
  border_radius_pt: 3,
  border_style: "solid",
  background_color: "#FFFFFF",
  text_color: "#0F172A",
  font_family: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  header_font_size_pt: 6.5,
  footer_font_size_pt: 5.5,
  product_name_font_size_pt: 5.5,
  barcode_format: "qrcode",
  barcode_height_in: 0.45,
  barcode_scale: 3,
  barcode_show_text: false,
  qr_data_mode: "url",
  qr_ecl: "M",
  show_brand: true,
  show_serial_code: true,
  show_price: true,
  show_barcode: true,
  show_product_name: false,
  show_watermark: true,
  watermark_opacity: 0.08,
  watermark_url: "",
  brand_bold: true,
  price_bold: true,
  brand_name: "ORIZINO",
  currency_symbol: "৳",
  show_size: true,
  show_original_price: true,
  orientation: "horizontal",
};

// ─── Unit helpers ──────────────────────────────────────────────────────────────
const PT_TO_IN = 1 / 72;

function isColorDark(hex: string = "#FFFFFF"): boolean {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2) || "ff", 16);
  const g = parseInt(clean.substring(2, 4) || "ff", 16);
  const b = parseInt(clean.substring(4, 6) || "ff", 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 128;
}

const BRAND_CREST_SVG = (
  <svg
    viewBox="0 0 540 566"
    xmlns="http://www.w3.org/2000/svg"
    className="shrink-0"
    style={{
      height: "0.95em",
      width: "0.95em",
      fill: "currentColor",
      display: "inline-block",
      verticalAlign: "middle",
      marginLeft: "0.15em",
    }}
  >
    <path d="M11.31,303.01l10.42,10.61,102.73,114.11c-16.27-34.27-34.28-66.2-53.79-98.11L0,219.52l41.25-42.82,104.13-107.09C169.3,45.99,192.23,22.22,218.19,0l-71.11,101.28L55.74,232.06c26,65.57,52.95,130.16,81.76,194.32l12.16,25.25,71.16,112.86L52.01,416.82l-40.7-113.8Z"/>
    <path d="M510.24,351.74l-23.18,64.87-169.05,148.54,27.52-44.45,45.28-70.91,30.12-65.82,16.7-38.98,46-113.02-81.21-116.77-25.93-36.85L321.38.16c14.41,11.93,26.61,24.47,40.1,37.05l86.76,87.48,77.26,80.22,13.77,14.47-52.64,81.42c-26.66,41.23-50.32,83.4-72.56,127.58l33.83-36.98,79.5-88.8-17.16,49.14Z"/>
    <path d="M356.28,185.04l26.95,46.73-36.12,40.33-32.01,35.6-5.9,33.94-22.1,115.86-19.75,106.98-25.06-136.06-23.26-120.77-10.57-11.82-57.13-64.08,17.38-30.41,40.24-67.6c-.28,10.99,4.75,22.09,2.63,32.95l-18.99,63.2,44.02,68.95,9.75,55.81,20.97,113.31,20.22-107.91,10.47-61.52,44.22-68.68-19.37-63.68,2.55-32.17,30.86,51.02Z"/>
  </svg>
);

export function Sticker({ data }: { data: StickerData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rawConfig = data.config ?? {};
  const c: Required<StickerConfig> = {
    ...STICKER_DEFAULTS,
    ...rawConfig,
    barcode_format: rawConfig.barcode_format || "qrcode",
    border_style: rawConfig.border_style || "solid",
    qr_data_mode: rawConfig.qr_data_mode || "url",
    show_watermark: rawConfig.show_watermark ?? true,
    watermark_opacity: typeof rawConfig.watermark_opacity === "number" ? Math.min(0.20, Math.max(0.04, rawConfig.watermark_opacity)) : 0.08,
    border_radius_pt: typeof rawConfig.border_radius_pt === "number" ? rawConfig.border_radius_pt : 3,
  };
  const isQr = c.barcode_format === "qrcode" || c.barcode_format === "datamatrix";
  const isDark = isColorDark(c.background_color);

  // ─── Layout budget ────────────────────────────────────────────────────────
  const borderWidthIn = c.border_width_pt * PT_TO_IN;
  const totalPadXIn = c.padding_x_in + borderWidthIn;
  const totalPadYIn = c.padding_y_in + borderWidthIn;

  const innerWIn = Math.max(0.1, c.width_in - totalPadXIn * 2);
  const innerHIn = Math.max(0.1, c.height_in - totalPadYIn * 2);

  // QR: fill as much of the inner height as possible
  const qrSizeIn = Math.min(innerHIn, innerWIn * 0.45, 0.85);

  const rowHeightIn = c.header_font_size_pt * PT_TO_IN * 1.35;
  const footerHeightIn = c.footer_font_size_pt * PT_TO_IN * 1.35;
  const maxBarcodeIn = Math.max(0.05, innerHIn - rowHeightIn - footerHeightIn - 0.02);
  const barcodeHeightIn = Math.min(c.barcode_height_in, maxBarcodeIn);

  const safeCornerRadiusPt = Math.min(Math.max(0, c.border_radius_pt ?? 0), 1.5);
  const radiusIn = safeCornerRadiusPt * PT_TO_IN;

  const hasBorder = c.border_style !== "none" && c.border_width_pt > 0;
  const borderStr = hasBorder
    ? `${c.border_width_pt}pt ${c.border_style} ${c.border_color}`
    : "none";

  const logoSrc = data.brandLogoUrl || c.watermark_url;

  useEffect(() => {
    if (!canvasRef.current || !c.show_barcode) return;
    try {
      const isQrFormat = c.barcode_format === "qrcode" || c.barcode_format === "datamatrix";
      const payload = isQrFormat
        ? (c.qr_data_mode === "raw" ? data.serialCode : buildVerificationUrl(data.serialCode))
        : data.serialCode;

      if (isQrFormat) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        bwipjs.toCanvas(canvasRef.current, {
          bcid: c.barcode_format || "qrcode",
          text: payload,
          scale: Math.max(2, c.barcode_scale || 3),
          eclevel: c.qr_ecl || "M",
          includetext: !!c.barcode_show_text,
          paddingwidth: 0,
          paddingheight: 0,
        } as any);
      } else {
        bwipjs.toCanvas(canvasRef.current, {
          bcid: c.barcode_format || "code128",
          text: payload,
          scale: c.barcode_scale,
          height: Math.max(4, barcodeHeightIn * 25.4),
          includetext: !!c.barcode_show_text,
          paddingwidth: 0,
          paddingheight: 0,
        });
      }
    } catch (e) {
      console.error("Sticker barcode/QR error", e);
    }
  }, [
    data.serialCode,
    c.barcode_format,
    c.barcode_scale,
    barcodeHeightIn,
    c.barcode_show_text,
    c.qr_data_mode,
    c.qr_ecl,
    c.show_barcode,
  ]);

  const brand = data.brand || (data as any).brandName || c.brand_name || "ORIZINO";
  const currency = data.currency || c.currency_symbol || "৳";
  const price = typeof data.price === "number" ? data.price : (Number(String(data.price || "").replace(/[^0-9.]/g, "")) || 0);
  const compareAtPrice = typeof data.compareAtPrice === "number" ? data.compareAtPrice : (data.compareAtPrice ? Number(String(data.compareAtPrice).replace(/[^0-9.]/g, "")) : undefined);
  const showSize = data.showSize ?? c.show_size ?? true;
  const showOriginalPrice = data.showOriginalPrice ?? c.show_original_price ?? true;

  const hasDiscount =
    showOriginalPrice &&
    typeof compareAtPrice === "number" &&
    compareAtPrice > price;

  const isVertical = data.orientation === "vertical" || c.orientation === "vertical";

  return (
    <div
      className="sticker-wrapper shrink-0"
      style={{
        width: isVertical ? `${c.height_in}in` : `${c.width_in}in`,
        height: isVertical ? `${c.width_in}in` : `${c.height_in}in`,
        minWidth: isVertical ? `${c.height_in}in` : `${c.width_in}in`,
        minHeight: isVertical ? `${c.width_in}in` : `${c.height_in}in`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxSizing: "border-box",
      }}
    >
      <div
        className="sticker-card shrink-0"
        style={{
          position: "relative",
          width: `${c.width_in}in`,
          height: `${c.height_in}in`,
          minWidth: `${c.width_in}in`,
          minHeight: `${c.height_in}in`,
          transform: isVertical ? "rotate(90deg)" : undefined,
          transformOrigin: "center center",
          flexShrink: 0,
          padding: `${c.padding_y_in}in ${c.padding_x_in}in`,
          fontFamily: c.font_family || "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          fontSynthesis: "none",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          WebkitTextSizeAdjust: "100%",
          textSizeAdjust: "100%",
          letterSpacing: "normal",
          fontVariantNumeric: "tabular-nums",
          color: c.text_color,
          background: c.background_color,
          boxSizing: "border-box",
          border: borderStr,
          borderRadius: radiusIn > 0 ? `${radiusIn}in` : 0,
          overflow: "hidden",
        }}
      >
        {/* Centred Brand Watermark (z-0, decorative, spans across entire card including QR without blocking scan) */}
        {c.show_watermark && (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center select-none z-0"
            style={{ opacity: c.watermark_opacity }}
            aria-hidden="true"
          >
            {logoSrc ? (
              <img
                src={logoSrc}
                alt=""
                crossOrigin="anonymous"
                style={{
                  maxWidth: "88%",
                  maxHeight: "88%",
                  objectFit: "contain",
                  filter: isDark ? "brightness(0) invert(1)" : "brightness(0)",
                }}
              />
            ) : (
              <span
                style={{
                  fontFamily: c.font_family,
                  fontSize: `${Math.min(c.height_in * 38, 30)}pt`,
                  fontWeight: 900,
                  color: c.text_color,
                  lineHeight: 1,
                  letterSpacing: "0.08em",
                  userSelect: "none",
                }}
              >
                {brand}
              </span>
            )}
          </div>
        )}

        {/* ─── Barcode & Typography Layout ────────────────────────────────────────── */}
        {isQr ? (
          /* ── 2D QR Code: Side-by-Side Horizontal Layout ── */
          <div className="relative z-10 w-full h-full flex items-center justify-between gap-1.5">
            {/* Left Column: QR Code */}
            {c.show_barcode ? (
              <div
                className="shrink-0 flex items-center justify-center"
                style={{
                  width: `${qrSizeIn}in`,
                  height: `${qrSizeIn}in`,
                }}
              >
                <canvas
                  ref={canvasRef}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : null}

            {/* Right Column: Typography & Metadata */}
            <div className="flex-1 min-w-0 h-full flex flex-col justify-between py-0.5 select-none leading-none">
              {/* Row 1: Brand (left) with tiny logo on right & Size (right) */}
              <div className="flex items-center justify-between gap-1">
                {c.show_brand ? (
                  <div
                    className="flex items-center min-w-0"
                    style={{
                      fontSize: `${c.header_font_size_pt}pt`,
                      lineHeight: 1.15,
                    }}
                  >
                    <span
                      className="truncate uppercase tracking-tight font-bold"
                      style={{
                        fontWeight: c.brand_bold ? 700 : 400,
                      }}
                    >
                      {brand}
                    </span>
                  </div>
                ) : <span />}

                {showSize && data.size ? (
                  <span
                    className="shrink-0 font-bold"
                    style={{
                      fontSize: `${c.header_font_size_pt}pt`,
                      lineHeight: 1.15,
                    }}
                  >
                    Size: {data.size}
                  </span>
                ) : null}
              </div>

              {/* Row 2: Product Name (optional) */}
              {c.show_product_name && data.productName ? (
                <div
                  className="truncate opacity-75 font-normal"
                  style={{
                    fontSize: `${c.product_name_font_size_pt}pt`,
                    lineHeight: 1.15,
                  }}
                >
                  {data.productName}
                </div>
              ) : null}

              {/* Row 3: Serial Code */}
              {c.show_serial_code ? (
                <div
                  className="font-mono font-medium tracking-tight truncate"
                  style={{
                    fontSize: `${c.footer_font_size_pt}pt`,
                    lineHeight: 1.15,
                  }}
                >
                  SN: {data.serialCode}
                </div>
              ) : null}

              {/* Row 4: Prices & AUTHENTIC Tag */}
              {c.show_price ? (
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1 min-w-0">
                    {hasDiscount ? (
                      <>
                        <span
                          className="font-normal opacity-60 line-through shrink-0"
                          style={{
                            fontSize: `${c.footer_font_size_pt}pt`,
                            lineHeight: 1,
                          }}
                        >
                          {currency}
                          {compareAtPrice}
                        </span>
                        <span
                          className="tracking-tight"
                          style={{
                            fontSize: `${c.header_font_size_pt}pt`,
                            fontWeight: c.price_bold ? 700 : 400,
                            lineHeight: 1,
                          }}
                        >
                          {currency}
                          {price}
                        </span>
                      </>
                    ) : (
                      <span
                        className="tracking-tight"
                        style={{
                          fontSize: `${c.header_font_size_pt}pt`,
                          fontWeight: c.price_bold ? 700 : 400,
                          lineHeight: 1,
                        }}
                      >
                        {currency}
                        {price}
                      </span>
                    )}
                  </div>
                  <span
                    className="shrink-0 font-mono font-semibold tracking-wider opacity-60 uppercase"
                    style={{ fontSize: "5pt", lineHeight: 1 }}
                  >
                    AUTHENTIC
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          /* ── 1D Barcode: Stacked Layout ── */
          <div className="relative z-10 w-full h-full flex flex-col justify-between py-0.5 select-none leading-none">
            {/* Header: Brand (left) with tiny logo on right & Size (right) */}
            <div className="flex items-center justify-between gap-1">
              {c.show_brand ? (
                <div
                  className="flex items-center min-w-0"
                  style={{
                    fontSize: `${c.header_font_size_pt}pt`,
                    lineHeight: 1.15,
                  }}
                >
                  <span
                    className="truncate uppercase tracking-tight font-bold"
                    style={{
                      fontWeight: c.brand_bold ? 700 : 400,
                    }}
                  >
                    {brand}
                  </span>
                </div>
              ) : <span />}

              {showSize && data.size ? (
                <span
                  className="shrink-0 font-bold"
                  style={{
                    fontSize: `${c.header_font_size_pt}pt`,
                    lineHeight: 1.15,
                  }}
                >
                  Size: {data.size}
                </span>
              ) : null}
            </div>

            {/* 1D Barcode Graphic (centered in available height) */}
            {c.show_barcode ? (
              <div
                className="w-full flex-1 min-h-0 flex items-center justify-center my-0.5"
                style={{
                  maxHeight: `${maxBarcodeIn}in`,
                }}
              >
                <canvas
                  ref={canvasRef}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : null}

            {/* Footer: Serial & Price */}
            {(c.show_serial_code || c.show_price) && (
              <div className="flex items-center justify-between gap-1">
                {c.show_serial_code ? (
                  <span
                    className="font-mono font-medium tracking-tight truncate"
                    style={{
                      fontSize: `${c.footer_font_size_pt}pt`,
                      lineHeight: 1.15,
                    }}
                  >
                    {data.serialCode}
                  </span>
                ) : <span />}

                {c.show_price ? (
                  <span
                    className="shrink-0 flex items-center gap-1"
                    style={{
                      fontSize: `${c.footer_font_size_pt}pt`,
                      fontWeight: c.price_bold ? 700 : 400,
                      lineHeight: 1.15,
                    }}
                  >
                    {hasDiscount ? (
                      <>
                        <span
                          className="font-normal opacity-60 relative inline-block"
                          style={{
                            fontSize: `${Math.max(5, c.footer_font_size_pt * 0.85)}pt`,
                            lineHeight: 1,
                          }}
                        >
                          <span>
                            {currency}
                            {compareAtPrice}
                          </span>
                          <span
                            aria-hidden="true"
                            className="absolute left-0 right-0 pointer-events-none"
                            style={{
                              top: "46%",
                              height: "0.85pt",
                              backgroundColor: "currentColor",
                            }}
                          />
                        </span>
                        <span>
                          {currency}
                          {price}
                        </span>
                      </>
                    ) : (
                      <span>
                        {currency}
                        {price}
                      </span>
                    )}
                  </span>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
