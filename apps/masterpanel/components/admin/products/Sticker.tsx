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
  font_family: "'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif",
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
  watermark_opacity: 0.06,
  watermark_url: "",
  brand_bold: true,
  price_bold: true,
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
    watermark_opacity: typeof rawConfig.watermark_opacity === "number" ? rawConfig.watermark_opacity : 0.06,
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

  const maxRadiusIn = Math.min(c.width_in, c.height_in) / 2;
  const radiusIn = Math.min(c.border_radius_pt * PT_TO_IN, maxRadiusIn);

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
          backgroundcolor: (c.background_color || "#FFFFFF").replace("#", ""),
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
          backgroundcolor: (c.background_color || "#FFFFFF").replace("#", ""),
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
    c.background_color,
    c.show_barcode,
  ]);

  const hasDiscount =
    data.showOriginalPrice &&
    typeof data.compareAtPrice === "number" &&
    data.compareAtPrice > data.price;

  return (
    <div
      className="sticker-card"
      style={{
        position: "relative",
        width: `${c.width_in}in`,
        height: `${c.height_in}in`,
        padding: `${c.padding_y_in}in ${c.padding_x_in}in`,
        fontFamily: c.font_family,
        color: c.text_color,
        background: c.background_color,
        boxSizing: "border-box",
        border: borderStr,
        borderRadius: radiusIn > 0 ? `${radiusIn}in` : 0,
        overflow: "hidden",
      }}
    >
      {/* Centred Brand Watermark (z-0, purely decorative) */}
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
                maxWidth: "75%",
                maxHeight: "75%",
                objectFit: "contain",
                filter: isDark ? "brightness(0) invert(1)" : "brightness(0)",
              }}
            />
          ) : (
            <span
              style={{
                fontFamily: c.font_family,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                fontSize: `${Math.min(c.height_in * 36, 28)}pt`,
                lineHeight: 1,
                color: c.text_color || "#000000",
                opacity: 0.7,
                textAlign: "center",
                userSelect: "none",
              }}
            >
              {data.brand || "ORIZINO"}
            </span>
          )}
        </div>
      )}

      {isQr ? (
        /* ── Luxury QR side-by-side layout ─────────────────────────── */
        <div className="relative z-10 flex items-center gap-1.5 h-full w-full">
          {c.show_barcode && (
            <div
              className="shrink-0 flex items-center justify-center"
              style={{
                width: `${qrSizeIn}in`,
                height: `${qrSizeIn}in`,
                border: "0.5pt solid rgba(15, 23, 42, 0.15)",
                padding: "0.015in",
                background: "#FFFFFF",
                borderRadius: 0,
              }}
            >
              <canvas
                ref={canvasRef}
                style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
              />
            </div>
          )}

          <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
            {/* Header row: Brand + Authenticity badge */}
            <div
              className="flex items-center justify-between gap-1 leading-tight"
              style={{
                fontSize: `${c.header_font_size_pt}pt`,
                lineHeight: 1.15,
                fontWeight: c.brand_bold ? 800 : 500,
                letterSpacing: "0.02em",
              }}
            >
              {c.show_brand ? <span className="truncate">{data.brand}</span> : <span />}
              {data.showSize && data.size ? (
                <span
                  style={{
                    fontSize: `${Math.max(4.5, c.header_font_size_pt - 1)}pt`,
                    padding: "0.5pt 3pt",
                    background: "rgba(15, 23, 42, 0.08)",
                    borderRadius: "2pt",
                    fontWeight: 700,
                  }}
                >
                  {data.size}
                </span>
              ) : null}
            </div>

            {/* Optional product name */}
            {c.show_product_name && data.productName && (
              <div
                className="truncate leading-tight font-medium"
                style={{
                  fontSize: `${c.product_name_font_size_pt}pt`,
                  lineHeight: 1.15,
                  opacity: 0.85,
                }}
              >
                {data.productName}
              </div>
            )}

            {/* Monospace Serial with Shield Mark */}
            {c.show_serial_code && (
              <div
                className="font-mono truncate leading-tight font-bold"
                style={{
                  fontSize: `${c.footer_font_size_pt}pt`,
                  lineHeight: 1.15,
                  letterSpacing: "-0.01em",
                  color: isDark ? "#A7F3D0" : "#047857",
                }}
              >
                SN:&nbsp;{data.serialCode}
              </div>
            )}

            {/* Price & Authenticity Footer */}
            {c.show_price && (
              <div
                className="flex items-center justify-between leading-tight"
                style={{
                  fontSize: `${c.header_font_size_pt}pt`,
                  lineHeight: 1.15,
                  fontWeight: c.price_bold ? 800 : 500,
                }}
              >
                <span className="inline-flex items-center gap-1 font-mono">
                  {hasDiscount ? (
                    <>
                      <span
                        className="relative inline-flex items-center"
                        style={{
                          opacity: 0.55,
                          marginRight: 3,
                          fontWeight: 400,
                          fontSize: `${c.footer_font_size_pt}pt`,
                          lineHeight: 1,
                        }}
                      >
                        <span>
                          {data.currency}
                          {data.compareAtPrice}
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
                        {data.currency}
                        {data.price}
                      </span>
                    </>
                  ) : (
                    <span>
                      {data.currency}
                      {data.price}
                    </span>
                  )}
                </span>
                <span
                  style={{
                    fontSize: "4.5pt",
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    fontWeight: 800,
                    opacity: 0.75,
                    fontFamily: "monospace",
                    padding: "0.5pt 2.5pt",
                    background: "rgba(15, 23, 42, 0.06)",
                    borderRadius: "1.5pt",
                  }}
                >
                  AUTHENTIC
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── 1-D Barcode stacked layout ─────────────────────────────────── */
        <div className="relative z-10 flex flex-col justify-between h-full w-full">
          {(c.show_brand || (c.show_product_name && data.productName) || (data.showSize && data.size)) && (
            <div
              className="flex items-center justify-between gap-1 leading-tight"
              style={{
                fontSize: `${c.header_font_size_pt}pt`,
                lineHeight: 1.15,
                fontWeight: c.brand_bold ? 800 : 500,
              }}
            >
              {c.show_brand ? <span>{data.brand}</span> : <span />}
              {c.show_product_name && data.productName ? (
                <span
                  style={{
                    fontSize: `${c.product_name_font_size_pt}pt`,
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "55%",
                  }}
                >
                  {data.productName}
                </span>
              ) : null}
              {data.showSize && data.size ? <span>{data.size}</span> : null}
            </div>
          )}

          {c.show_barcode && (
            <div style={{ background: "#FFFFFF", padding: "0.01in", borderRadius: "1pt" }}>
              <canvas
                ref={canvasRef}
                style={{
                  width: "100%",
                  height: `${barcodeHeightIn}in`,
                  display: "block",
                }}
              />
            </div>
          )}

          {(c.show_serial_code || c.show_price) && (
            <div
              className="flex items-center justify-between leading-tight font-mono"
              style={{ fontSize: `${c.footer_font_size_pt}pt`, lineHeight: 1.15 }}
            >
              {c.show_serial_code ? (
                <span style={{ fontWeight: 700 }}>{data.serialCode}</span>
              ) : (
                <span />
              )}
              {c.show_price ? (
                <span className="inline-flex items-center gap-1 font-mono" style={{ fontWeight: c.price_bold ? 800 : 500 }}>
                  {hasDiscount ? (
                    <>
                      <span
                        className="relative inline-flex items-center"
                        style={{
                          opacity: 0.55,
                          marginRight: 3,
                          fontWeight: 400,
                          fontSize: `${c.footer_font_size_pt}pt`,
                          lineHeight: 1,
                        }}
                      >
                        <span>
                          {data.currency}
                          {data.compareAtPrice}
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
                        {data.currency}
                        {data.price}
                      </span>
                    </>
                  ) : (
                    <span>
                      {data.currency}
                      {data.price}
                    </span>
                  )}
                </span>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
