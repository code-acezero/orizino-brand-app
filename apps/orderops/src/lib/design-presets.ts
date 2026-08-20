import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";

export interface MasterPanelBrandSettings {
  name: string;
  addr?: string;
  email?: string;
  phone?: string;
  currency?: string;
  logoUrl?: string;
  siteIconUrl?: string;
  footer?: string;
  prefix?: string;
}

export interface MasterPanelInvoiceSettings {
  preset?: "cherry_vanilla" | "classic" | "modern" | "minimal" | "bold" | "custom";
  invoice_prefix?: string;
  invoice_footer?: string;
  primary_color?: string;
  accent_color?: string;
  text_color?: string;
  muted_color?: string;
  bg_color?: string;
  font_family?: string;
  heading_font_family?: string;
  font_size?: number;
  paper_size?: "a4" | "thermal_80" | "thermal_58";
  show_qr?: boolean;
  show_barcode?: boolean;
  show_logo?: boolean;
  show_brand_mark?: boolean;
  show_watermark?: boolean;
  watermark_opacity?: number;
  watermark_url?: string;
  terms_text?: string;
  footer_text?: string;
  header_text?: string;
  notes_text?: string;
  tax_number?: string;
  company_reg?: string;
  qr_size?: "compact" | "medium" | "large" | "full_width";
  qr_scale?: number;
  logo_size?: "small" | "medium" | "large" | "extra_large";
  logo_scale?: number;
  brand_name_size?: "small" | "medium" | "large" | "extra_large";
  brand_name_scale?: number;
  customer_info_size?: "compact" | "normal" | "large" | "extra_large";
  customer_info_scale?: number;
  customer_info_align?: "left" | "center" | "right";
}

export interface MasterPanelPosSettings {
  receipt_header?: string;
  receipt_footer?: string;
  printer_width?: "80mm" | "58mm";
  show_customer_phone?: boolean;
  show_barcode?: boolean;
  show_qr?: boolean;
  show_logo?: boolean;
}

export interface MasterPanelStickerPreset {
  id?: string;
  name?: string;
  sticker_kind: "product_serial" | "shipping_label";
  width_in?: number;
  height_in?: number;
  padding_x_in?: number;
  padding_y_in?: number;
  border_width_pt?: number;
  border_color?: string;
  border_radius_pt?: number;
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
  orientation?: "horizontal" | "vertical";
  is_active?: boolean;
}

export const DEFAULT_PRODUCT_STICKER_PRESET: MasterPanelStickerPreset = {
  sticker_kind: "product_serial",
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
  brand_bold: true,
  price_bold: true,
  brand_name: "ORIZINO",
  currency_symbol: "৳",
  show_size: true,
  show_original_price: true,
  orientation: "horizontal",
};

export const DEFAULT_SHIPPING_STICKER_PRESET: MasterPanelStickerPreset = {
  sticker_kind: "shipping_label",
  width_in: 4,
  height_in: 6,
  padding_x_in: 0.2,
  padding_y_in: 0.2,
  border_width_pt: 1.5,
  border_color: "#1E293B",
  border_radius_pt: 4,
  border_style: "solid",
  background_color: "#FFFFFF",
  text_color: "#0F172A",
  font_family: "system-ui, -apple-system, sans-serif",
  header_font_size_pt: 12,
  footer_font_size_pt: 8,
  product_name_font_size_pt: 9,
  barcode_format: "code128",
  barcode_height_in: 0.8,
  barcode_scale: 3,
  barcode_show_text: true,
  qr_data_mode: "url",
  qr_ecl: "M",
  show_brand: true,
  show_serial_code: true,
  show_price: true,
  show_barcode: true,
  show_product_name: true,
  show_watermark: true,
  watermark_opacity: 0.04,
  brand_name: "ORIZINO",
  currency_symbol: "৳",
  orientation: "horizontal",
};

/**
 * Unified Hook to fetch all masterpanel design settings & sticker presets in real-time
 * Includes Postgres Realtime sync so any changes in MasterPanel Design Studio apply immediately.
 */
export function useMasterPanelDesigns() {
  const qc = useQueryClient();

  // Real-time Postgres subscriptions for live sync with MasterPanel edits
  useEffect(() => {
    const channel = supabase
      .channel("orderops-realtime-designs-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        () => {
          qc.invalidateQueries({ queryKey: ["orderops-masterpanel-site-settings"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sticker_settings" },
        () => {
          qc.invalidateQueries({ queryKey: ["orderops-masterpanel-product-sticker-preset"] });
          qc.invalidateQueries({ queryKey: ["orderops-masterpanel-shipping-sticker-preset"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const { data: siteSettings, refetch: refetchSiteSettings } = useQuery({
    queryKey: ["orderops-masterpanel-site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", [
          "brand_settings",
          "invoice_settings",
          "pos_settings",
          "site_name",
          "brand_name",
          "site_tagline",
          "logo_url",
          "site_icon_url",
          "contact_phone",
          "contact_email",
          "store_address",
          "support_phone",
          "support_email",
        ]);

      if (error) {
        console.warn("Could not fetch site_settings from masterpanel:", error.message);
        return {};
      }

      const map: Record<string, any> = {};
      data?.forEach((row) => {
        const val = row.value as any;
        map[row.key] = typeof val === "object" && val !== null ? (val.value ?? val) : val;
      });
      return map;
    },
    staleTime: 30_000,
  });

  const { data: productStickerPreset, refetch: refetchProductSticker } = useQuery<MasterPanelStickerPreset>({
    queryKey: ["orderops-masterpanel-product-sticker-preset"],
    queryFn: async () => {
      const sb = supabase as any;
      const { data: active } = await sb
        .from("sticker_settings")
        .select("*")
        .eq("is_active", true)
        .eq("sticker_kind", "product_serial")
        .limit(1)
        .maybeSingle();

      if (active) return { ...DEFAULT_PRODUCT_STICKER_PRESET, ...active };

      const { data: fallback } = await sb
        .from("sticker_settings")
        .select("*")
        .eq("sticker_kind", "product_serial")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      return fallback ? { ...DEFAULT_PRODUCT_STICKER_PRESET, ...fallback } : DEFAULT_PRODUCT_STICKER_PRESET;
    },
    staleTime: 30_000,
  });

  const { data: shippingStickerPreset, refetch: refetchShippingSticker } = useQuery<MasterPanelStickerPreset>({
    queryKey: ["orderops-masterpanel-shipping-sticker-preset"],
    queryFn: async () => {
      const sb = supabase as any;
      const { data: active } = await sb
        .from("sticker_settings")
        .select("*")
        .eq("is_active", true)
        .in("sticker_kind", ["order", "shipping_label"])
        .limit(1)
        .maybeSingle();

      if (active) return { ...DEFAULT_SHIPPING_STICKER_PRESET, ...active };

      const { data: fallback } = await sb
        .from("sticker_settings")
        .select("*")
        .in("sticker_kind", ["order", "shipping_label"])
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      return fallback ? { ...DEFAULT_SHIPPING_STICKER_PRESET, ...fallback } : DEFAULT_SHIPPING_STICKER_PRESET;
    },
    staleTime: 30_000,
  });

  const rawBrand = siteSettings?.brand_settings || {};
  const rawInvoice = siteSettings?.invoice_settings || {};
  const rawPos = siteSettings?.pos_settings || {};

  const brand: MasterPanelBrandSettings = {
    name: (rawBrand.name || rawBrand.brand_name || siteSettings?.brand_name || siteSettings?.site_name || "ORIZINO") as string,
    addr: (rawBrand.addr || rawBrand.address || siteSettings?.store_address || "") as string,
    email: (rawBrand.email || siteSettings?.contact_email || siteSettings?.support_email || "") as string,
    phone: (rawBrand.phone || siteSettings?.contact_phone || siteSettings?.support_phone || "") as string,
    currency: (rawBrand.currency || "৳") as string,
    logoUrl: (rawBrand.logo_url || siteSettings?.logo_url || "/orizino-logo.svg") as string,
    siteIconUrl: (rawBrand.site_icon_url || siteSettings?.site_icon_url || "/orizino-logo.svg") as string,
    footer: (rawBrand.footer || `Thank you for shopping with ${rawBrand.name || "ORIZINO"}.`) as string,
    prefix: (rawInvoice.invoice_prefix || "INV") as string,
  };

  const invoiceSettings: MasterPanelInvoiceSettings = {
    preset: rawInvoice.preset || "cherry_vanilla",
    invoice_prefix: (rawInvoice.invoice_prefix || "INV") as string,
    invoice_footer: (rawInvoice.invoice_footer || rawInvoice.footer_text || brand.footer || `Thank you for choosing ${brand.name}.`) as string,
    primary_color: (rawInvoice.primary_color || rawInvoice.accent_color || "#6B0F1A") as string,
    accent_color: (rawInvoice.accent_color || "#6B0F1A") as string,
    text_color: (rawInvoice.text_color || "#1D070B") as string,
    muted_color: (rawInvoice.muted_color || "#785860") as string,
    bg_color: (rawInvoice.bg_color || "#FDFBF7") as string,
    font_family: (rawInvoice.font_family || "Plus Jakarta Sans") as string,
    heading_font_family: (rawInvoice.heading_font_family || "Playfair Display") as string,
    font_size: rawInvoice.font_size || 15,
    paper_size: (rawInvoice.paper_size || "a4") as any,
    show_qr: rawInvoice.show_qr ?? true,
    show_barcode: rawInvoice.show_barcode ?? true,
    show_logo: rawInvoice.show_logo ?? true,
    show_brand_mark: rawInvoice.show_brand_mark ?? true,
    show_watermark: rawInvoice.show_watermark ?? true,
    watermark_opacity: rawInvoice.watermark_opacity ?? 0.08,
    watermark_url: rawInvoice.watermark_url || "",
    terms_text: (rawInvoice.terms_text || "All Orizino pieces include digital authenticity verification. Please scan the QR code to view your verified order details.") as string,
    footer_text: (rawInvoice.footer_text || rawInvoice.invoice_footer || "Thank you for your order.") as string,
    header_text: rawInvoice.header_text || "",
    notes_text: rawInvoice.notes_text || "",
    tax_number: (rawInvoice.tax_number || "") as string,
    company_reg: (rawInvoice.company_reg || "") as string,
    qr_size: rawInvoice.qr_size || "full_width",
    qr_scale: rawInvoice.qr_scale || 100,
    logo_size: rawInvoice.logo_size || "large",
    logo_scale: rawInvoice.logo_scale || 100,
    brand_name_size: rawInvoice.brand_name_size || "large",
    brand_name_scale: rawInvoice.brand_name_scale || 100,
    customer_info_size: rawInvoice.customer_info_size || "normal",
    customer_info_scale: rawInvoice.customer_info_scale || 100,
    customer_info_align: rawInvoice.customer_info_align || "left",
  };

  const posSettings: MasterPanelPosSettings = {
    receipt_header: (rawPos.receipt_header || brand.name) as string,
    receipt_footer: (rawPos.receipt_footer || brand.footer) as string,
    printer_width: (rawPos.printer_width || "80mm") as any,
    show_customer_phone: rawPos.show_customer_phone ?? true,
    show_barcode: rawPos.show_barcode ?? true,
    show_qr: rawPos.show_qr ?? true,
    show_logo: rawPos.show_logo ?? true,
  };

  const refetchAll = async () => {
    await Promise.all([refetchSiteSettings(), refetchProductSticker(), refetchShippingSticker()]);
  };

  return {
    brand,
    invoiceSettings,
    posSettings,
    productStickerPreset: productStickerPreset || DEFAULT_PRODUCT_STICKER_PRESET,
    shippingStickerPreset: shippingStickerPreset || DEFAULT_SHIPPING_STICKER_PRESET,
    refetchAll,
  };
}
