import { useEffect, useRef } from "react";
// bwip-js exposes different builds; the browser build is at /browser
import bwipjs from "bwip-js/browser";

export interface StickerConfig {
  width_in?: number;
  height_in?: number;
  padding_x_in?: number;
  padding_y_in?: number;
  border_width_pt?: number;
  border_color?: string;
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
  show_brand?: boolean;
  show_serial_code?: boolean;
  show_price?: boolean;
  show_barcode?: boolean;
  show_product_name?: boolean;
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
  currency: string;
  showSize: boolean;
  showOriginalPrice: boolean;
  config?: StickerConfig;
}

export const STICKER_DEFAULTS: Required<StickerConfig> = {
  width_in: 2,
  height_in: 0.5,
  padding_x_in: 0.05,
  padding_y_in: 0.03,
  border_width_pt: 1,
  border_color: "#000000",
  background_color: "#FFFFFF",
  text_color: "#000000",
  font_family: "'Helvetica Neue', Arial, sans-serif",
  header_font_size_pt: 6,
  footer_font_size_pt: 5.5,
  product_name_font_size_pt: 5.5,
  barcode_format: "code128",
  barcode_height_in: 0.2,
  barcode_scale: 2,
  barcode_show_text: false,
  show_brand: true,
  show_serial_code: true,
  show_price: true,
  show_barcode: true,
  show_product_name: false,
  brand_bold: true,
  price_bold: true,
};

export function Sticker({ data }: { data: StickerData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const c: Required<StickerConfig> = { ...STICKER_DEFAULTS, ...(data.config ?? {}) };

  useEffect(() => {
    if (!canvasRef.current || !c.show_barcode) return;
    try {
      bwipjs.toCanvas(canvasRef.current, {
        bcid: c.barcode_format || "code128",
        text: data.serialCode,
        scale: c.barcode_scale,
        height: Math.max(4, c.barcode_height_in * 25.4),
        includetext: !!c.barcode_show_text,
        backgroundcolor: (c.background_color || "#FFFFFF").replace("#", ""),
        paddingwidth: 0,
        paddingheight: 0,
      });
    } catch (e) {
      console.error("barcode error", e);
    }
  }, [data.serialCode, c.barcode_format, c.barcode_scale, c.barcode_height_in, c.barcode_show_text, c.background_color, c.show_barcode]);

  const hasDiscount =
    data.showOriginalPrice &&
    typeof data.compareAtPrice === "number" &&
    data.compareAtPrice > data.price;

  return (
    <div
      className="sticker-card flex flex-col justify-between"
      style={{
        width: `${c.width_in}in`,
        height: `${c.height_in}in`,
        padding: `${c.padding_y_in}in ${c.padding_x_in}in`,
        fontFamily: c.font_family,
        color: c.text_color,
        background: c.background_color,
        boxSizing: "border-box",
        border: c.border_width_pt > 0 ? `${c.border_width_pt}pt solid ${c.border_color}` : "none",
        overflow: "hidden",
      }}
    >
      {(c.show_brand || (c.show_product_name && data.productName) || (data.showSize && data.size)) && (
        <div className="flex items-center justify-between gap-1" style={{ fontSize: `${c.header_font_size_pt}pt`, lineHeight: 1, fontWeight: c.brand_bold ? 700 : 400 }}>
          {c.show_brand ? <span>{data.brand}</span> : <span />}
          {c.show_product_name && data.productName ? (
            <span style={{ fontSize: `${c.product_name_font_size_pt}pt`, fontWeight: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>{data.productName}</span>
          ) : null}
          {data.showSize && data.size ? <span>Size: {data.size}</span> : null}
        </div>
      )}
      {c.show_barcode && (
        <canvas ref={canvasRef} style={{ width: "100%", height: `${c.barcode_height_in}in`, display: "block" }} />
      )}
      {(c.show_serial_code || c.show_price) && (
        <div className="flex items-center justify-between" style={{ fontSize: `${c.footer_font_size_pt}pt`, lineHeight: 1 }}>
          {c.show_serial_code ? <span style={{ fontFamily: "monospace" }}>{data.serialCode}</span> : <span />}
          {c.show_price ? (
            <span style={{ fontWeight: c.price_bold ? 700 : 400 }}>
              {hasDiscount ? (
                <>
                  <span style={{ textDecoration: "line-through", opacity: 0.6, marginRight: 3, fontWeight: 400 }}>
                    {data.currency}
                    {data.compareAtPrice}
                  </span>
                  {data.currency}
                  {data.price}
                </>
              ) : (
                <>
                  {data.currency}
                  {data.price}
                </>
              )}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
