"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@/lib/server-fn-compat";
import {
  getInvoiceSettings,
  saveInvoiceSettings,
} from "@/lib/invoice-settings.functions";
import {
  type InvoiceSettings,
  InvoiceSettingsSchema,
} from "@/lib/invoice-settings.schema";
import {
  renderInvoiceHtml,
  sampleInvoicePayload,
  type InvoiceOrderPayload,
} from "@/lib/invoice-render";
import {
  renderPosSlipHtml,
  POS_ROLL_SIZES,
  type PosRollSize,
} from "@/lib/pos-slip-render";
import {
  renderOrderStickerHtml,
  ORDER_STICKER_SIZES,
  type OrderStickerSize,
} from "@/lib/order-sticker-render";
import { StickerSetupTab } from "./ProductManagerPage";
import { useTabParam } from "@/hooks/use-tab-param";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "@/lib/app-toast";
import { toJpeg } from "html-to-image";
import {
  Receipt,
  Printer,
  FileText,
  Tag,
  Eye,
  ZoomIn,
  ZoomOut,
  Palette,
  Type,
  LayoutTemplate,
  Sliders,
  CheckCircle2,
  Crown,
  Gem,
  Flame,
  Zap,
  Stamp,
  Layers,
  Download,
  Maximize2,
  QrCode,
  User,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Truck,
  MapPin,
  Phone,
  Globe,
  Package,
} from "lucide-react";

type ModeTab = "invoice" | "pos-slip" | "order-sticker";

const LUXURY_PRESETS: Array<{
  id: InvoiceSettings["preset"];
  label: string;
  accent: string;
  bg: string;
  text: string;
  heading: string;
  font: string;
  icon: any;
  description: string;
}> = [
  {
    id: "cherry_vanilla",
    label: "Imperial Cherry",
    accent: "#6B0F1A",
    bg: "#FDFBF7",
    text: "#1D070B",
    heading: "Cinzel",
    font: "Plus Jakarta Sans",
    icon: Crown,
    description: "Royal Imperial: Velvet cherry, antique ivory sheet, and fine gold filigree.",
  },
  {
    id: "classic",
    label: "Obsidian & Gold",
    accent: "#B45309",
    bg: "#FFFFFF",
    text: "#0F172A",
    heading: "Playfair Display",
    font: "Plus Jakarta Sans",
    icon: Stamp,
    description: "Warm champagne gold & deep onyx luxury style.",
  },
  {
    id: "modern",
    label: "Royal Sapphire",
    accent: "#1E40AF",
    bg: "#FFFFFF",
    text: "#0F172A",
    heading: "Plus Jakarta Sans",
    font: "Plus Jakarta Sans",
    icon: Gem,
    description: "Imperial deep sapphire with crisp high-fashion lines.",
  },
  {
    id: "minimal",
    label: "Emerald Minimal",
    accent: "#065F46",
    bg: "#FFFFFF",
    text: "#0F172A",
    heading: "Cormorant Garamond",
    font: "Plus Jakarta Sans",
    icon: Layers,
    description: "Haute horlogerie emerald with pristine clean borders.",
  },
  {
    id: "bold",
    label: "Velvet Crimson",
    accent: "#9F1239",
    bg: "#FFFFFF",
    text: "#0F172A",
    heading: "Playfair Display",
    font: "Plus Jakarta Sans",
    icon: Flame,
    description: "Luxury couture burgundy with editorial typography.",
  },
  {
    id: "custom",
    label: "Cyber Luxe",
    accent: "#6D28D9",
    bg: "#FFFFFF",
    text: "#0F172A",
    heading: "Space Grotesk",
    font: "Space Grotesk",
    icon: Zap,
    description: "Futuristic violet glow with monospace precision.",
  },
];

const CURATED_BODY_FONTS = [
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans (Modern Clean)" },
  { value: "Inter", label: "Inter (Neutral Standard)" },
  { value: "Outfit", label: "Outfit (Geometric Contemporary)" },
  { value: "Space Grotesk", label: "Space Grotesk (Tech Monospace)" },
  { value: "Playfair Display", label: "Playfair Display (Editorial Serif)" },
  { value: "Cinzel", label: "Cinzel (Royal Roman)" },
  { value: "Cormorant Garamond", label: "Cormorant Garamond (Haute Couture)" },
  { value: "Lora", label: "Lora (Book Serif)" },
];

const CURATED_HEADING_FONTS = [
  { value: "Cinzel", label: "Cinzel (Royal Imperial Roman)" },
  { value: "Playfair Display", label: "Playfair Display (Luxury Editorial)" },
  { value: "Cormorant Garamond", label: "Cormorant Garamond (Haute Couture)" },
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans (Bold Geometric)" },
  { value: "Space Grotesk", label: "Space Grotesk (Monospace)" },
  { value: "Outfit", label: "Outfit (Clean Sans)" },
  { value: "Lora", label: "Lora (Refined Serif)" },
];

const FIELD_GROUPS = [
  {
    title: "Header & Document Meta",
    fields: [
      { key: "show_logo" as const, label: "Brand Crest" },
      { key: "show_invoice_number" as const, label: "Invoice Number" },
      { key: "show_order_number" as const, label: "Order Reference" },
      { key: "show_issue_date" as const, label: "Issue Date" },
      { key: "show_due_date" as const, label: "Due Date" },
      { key: "show_payment_method" as const, label: "Payment Method" },
      { key: "show_tracking_number" as const, label: "Waybill Tracking" },
    ],
  },
  {
    title: "Client Information (Addresses)",
    fields: [
      { key: "show_billing_address" as const, label: "Billing Address" },
      { key: "show_shipping_address" as const, label: "Shipping Address" },
      { key: "show_customer_email" as const, label: "Client Email" },
      { key: "show_customer_phone" as const, label: "Client Phone" },
    ],
  },
  {
    title: "Summary & Totals",
    fields: [
      { key: "show_subtotal" as const, label: "Subtotal" },
      { key: "show_shipping_fee" as const, label: "Shipping Fee" },
      { key: "show_tax" as const, label: "Estimated Tax" },
      { key: "show_discount" as const, label: "Discount" },
      { key: "show_total" as const, label: "Grand Total" },
    ],
  },
  {
    title: "Watermark & Footer",
    fields: [
      { key: "show_watermark" as const, label: "Logo Watermark" },
      { key: "show_notes" as const, label: "Order Memo" },
      { key: "show_footer" as const, label: "Footer Message" },
      { key: "show_brand_mark" as const, label: "Postal Stamp" },
    ],
  },
];

const GeometryAndSizingPanel: React.FC<{
  settings: InvoiceSettings;
  patch: <K extends keyof InvoiceSettings>(key: K, value: InvoiceSettings[K]) => void;
}> = ({ settings, patch }) => {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-3.5 sm:p-4 space-y-3.5">
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center gap-2">
          <Maximize2 className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Geometry &amp; Sizing Configs
          </h3>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">QR · Logo · Customer</span>
      </div>

      {/* 1. Verification QR Code Sizing */}
      <div className="space-y-2 p-2.5 rounded-xl border border-border/40 bg-secondary/15">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-foreground">Authentication QR Code</span>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono capitalize border-primary/30 text-primary">
            {(settings.qr_size || "full_width").replace("_", " ")} ({settings.qr_scale ?? 100}%)
          </Badge>
        </div>

        {/* QR Size Toggle */}
        <div className="grid grid-cols-4 gap-1">
          {(
            [
              { id: "compact", label: "Compact" },
              { id: "medium", label: "Medium" },
              { id: "large", label: "Large" },
              { id: "full_width", label: "Full Width" },
            ] as const
          ).map((sz) => (
            <button
              key={sz.id}
              type="button"
              onClick={() => patch("qr_size", sz.id)}
              className={`py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                (settings.qr_size || "full_width") === sz.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/30 border-border/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {sz.label}
            </button>
          ))}
        </div>

        {/* QR Scale Slider */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Fine-tune QR Scale:</span>
            <span className="font-mono font-bold text-primary">{settings.qr_scale ?? 100}%</span>
          </div>
          <Slider
            min={60}
            max={150}
            step={5}
            value={[settings.qr_scale ?? 100]}
            onValueChange={([val]) => patch("qr_scale", val)}
          />
        </div>
      </div>

      {/* 2. Logo & Brand Title Sizing */}
      <div className="space-y-2 p-2.5 rounded-xl border border-border/40 bg-secondary/15">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-foreground">Brand Logo Crest</span>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono capitalize border-primary/30 text-primary">
            {settings.logo_size || "medium"} ({settings.logo_scale ?? 100}%)
          </Badge>
        </div>

        {/* Logo Size Toggle */}
        <div className="grid grid-cols-4 gap-1">
          {(["small", "medium", "large", "extra_large"] as const).map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => patch("logo_size", sz)}
              className={`py-1 text-[10px] font-bold rounded-lg border capitalize transition-all cursor-pointer ${
                (settings.logo_size || "medium") === sz
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/30 border-border/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {sz.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Logo Scale Slider */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Fine-tune Logo Scale:</span>
            <span className="font-mono font-bold text-primary">{settings.logo_scale ?? 100}%</span>
          </div>
          <Slider
            min={60}
            max={160}
            step={5}
            value={[settings.logo_scale ?? 100]}
            onValueChange={([val]) => patch("logo_scale", val)}
          />
        </div>
      </div>

      {/* 3. Customer Info Sizing & Alignment */}
      <div className="space-y-2 p-2.5 rounded-xl border border-border/40 bg-secondary/15">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-foreground">Customer Info Box</span>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono capitalize border-primary/30 text-primary">
            {settings.customer_info_size || "normal"} · {settings.customer_info_align || "left"} ({settings.customer_info_scale ?? 100}%)
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Customer Info Size Toggle */}
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground">Text Size:</span>
            <div className="grid grid-cols-4 gap-1">
              {(["compact", "normal", "large", "extra_large"] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => patch("customer_info_size", sz)}
                  className={`py-1 text-[9.5px] font-bold rounded-lg border capitalize transition-all cursor-pointer ${
                    (settings.customer_info_size || "normal") === sz
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/30 border-border/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {sz === "extra_large" ? "XL" : sz}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Info Alignment Toggle */}
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground">Alignment:</span>
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  { id: "left", label: "Left", icon: AlignLeft },
                  { id: "center", label: "Center", icon: AlignCenter },
                  { id: "right", label: "Right", icon: AlignRight },
                ] as const
              ).map((al) => {
                const IconC = al.icon;
                return (
                  <button
                    key={al.id}
                    type="button"
                    onClick={() => patch("customer_info_align", al.id)}
                    className={`py-1 px-1.5 flex items-center justify-center gap-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                      (settings.customer_info_align || "left") === al.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary/30 border-border/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <IconC className="w-3 h-3" />
                    {al.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Customer Scale Slider */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Fine-tune Customer Box Scale:</span>
            <span className="font-mono font-bold text-primary">{settings.customer_info_scale ?? 100}%</span>
          </div>
          <Slider
            min={60}
            max={160}
            step={5}
            value={[settings.customer_info_scale ?? 100]}
            onValueChange={([val]) => patch("customer_info_scale", val)}
          />
        </div>
      </div>
    </div>
  );
};

export default function AdminInvoiceStickers() {
  const [tab, setTab] = useTabParam("invoice", "/sales/invoice-stickers");
  const [activeTab, setActiveTab] = useState<ModeTab>(() => {
    if (tab === "order-sticker") return "order-sticker";
    if (tab === "pos-slip") return "pos-slip";
    return "invoice";
  });
  const persist = useServerFn(saveInvoiceSettings);

  const [settings, setSettings] = useState<InvoiceSettings>(() => InvoiceSettingsSchema.parse({}));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewZoom, setPreviewZoom] = useState<number>(75);
  const [posPreviewZoom, setPosPreviewZoom] = useState<number>(100);
  const [orderStickerZoom, setOrderStickerZoom] = useState<number>(100);
  const [posRollSize, setPosRollSize] = useState<PosRollSize>("58mm");
  const [orderStickerSize, setOrderStickerSize] = useState<OrderStickerSize>("4x2");
  const [posAutoHeight, setPosAutoHeight] = useState<number>(380);
  const [previewDataSource, setPreviewDataSource] = useState<"sample" | "real">("sample");
  const [selectedRealOrderId, setSelectedRealOrderId] = useState<string>("");

  const previewRef = useRef<HTMLIFrameElement>(null);
  const posPreviewRef = useRef<HTMLIFrameElement>(null);
  const orderStickerPreviewRef = useRef<HTMLIFrameElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync tab param changes
  useEffect(() => {
    if (tab === "order-sticker") setActiveTab("order-sticker");
    else if (tab === "pos-slip") setActiveTab("pos-slip");
    else if (tab === "invoice") setActiveTab("invoice");
  }, [tab]);

  // Auto-resize POS slip paper container based on message from iframe
  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      if (e.data?.type === "pos-resize" && typeof e.data?.height === "number") {
        setPosAutoHeight(Math.max(120, e.data.height));
      }
    };
    window.addEventListener("message", handleMsg);
    return () => window.removeEventListener("message", handleMsg);
  }, []);

  // Fetch site brand assets & live contact settings from database
  const { data: dbBrandSettings } = useQuery({
    queryKey: ["site-brand-settings-full"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["site_name", "logo_url", "contact_email", "contact_phone", "address", "website", "brand_settings"]);
      const map: Record<string, string> = {};
      data?.forEach((row: any) => {
        const val = typeof row.value === "object" && row.value !== null ? (row.value.value ?? row.value) : row.value;
        if (typeof val === "string") {
          map[row.key] = val;
        } else if (typeof val === "object" && val !== null) {
          Object.assign(map, val);
        }
      });
      return map;
    },
    staleTime: 60000,
  });

  const brandName = dbBrandSettings?.site_name || "ORIZINO";
  const brandLogoUrl = dbBrandSettings?.logo_url || "/orizino-logo.svg";

  // Fetch recent real orders for live realistic test previews
  const { data: recentOrders = [] } = useQuery({
    queryKey: ["invoice-recent-orders-preview"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, total, subtotal, shipping_fee, coupon_discount, customer_name, customer_email, customer_phone, shipping_address, payment_method, payment_status, created_at, order_items(id, name, sku, quantity, unit_price, total_price, image_url)")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    staleTime: 30000,
  });

  // Build active payload for live preview
  const activePayload = useMemo((): InvoiceOrderPayload => {
    const resolvedLogo = brandLogoUrl || "/orizino-logo.svg";
    const brandData = {
      name: brandName || "ORIZINO",
      logo_url: resolvedLogo,
      brand_mark_url: resolvedLogo,
      address: dbBrandSettings?.address || "Flagship Atelier & Head Office, Dhaka",
      email: dbBrandSettings?.contact_email || "concierge@orizino.com",
      phone: dbBrandSettings?.contact_phone || "+880 1800-000000",
      website: dbBrandSettings?.website || "www.orizino.com",
    };

    if (previewDataSource === "real" && selectedRealOrderId) {
      const ord: any = recentOrders.find((o: any) => o.id === selectedRealOrderId);
      if (ord) {
        return {
          order_number: ord.order_number || "ORZ-884910",
          invoice_number: `INV-${ord.order_number?.replace(/\D/g, "") || "884910"}`,
          issue_date: new Date(ord.created_at || Date.now()).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
          status: "confirmed",
          payment_method: ord.payment_method || "Cash on Delivery",
          payment_status: ord.payment_status || "Pending",
          subtotal: Number(ord.subtotal || ord.total || 0),
          shipping_fee: Number(ord.shipping_fee || 0),
          tax: 0,
          discount: Number(ord.coupon_discount || 0),
          total: Number(ord.total || 0),
          currency: "৳",
          brand: brandData,
          customer: {
            full_name: ord.customer_name || "Valued Patron",
            email: ord.customer_email || "patron@domain.com",
            phone: ord.customer_phone || "+880 1700-000000",
            billing_address: ord.shipping_address || "Dhaka, Bangladesh",
            shipping_address: ord.shipping_address || "Dhaka, Bangladesh",
          },
          items: (ord.order_items || []).map((it: any) => ({
            name: it.name || "Imperial Garment",
            sku: it.sku || "ORZ-SKU",
            quantity: Number(it.quantity || 1),
            unit_price: Number(it.unit_price || 0),
            line_total: Number(it.total_price || 0),
          })),
          notes: "Courier Dispatch. Verified and packaged with care.",
        };
      }
    }

    return sampleInvoicePayload(brandData);
  }, [previewDataSource, selectedRealOrderId, recentOrders, brandLogoUrl, brandName, dbBrandSettings]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const { data } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "invoice_settings")
          .maybeSingle();

        if (alive && data?.value) {
          const parsed = InvoiceSettingsSchema.safeParse(data.value);
          if (parsed.success) {
            setSettings(parsed.data);
            return;
          }
        }

        const s = await getInvoiceSettings();
        if (alive && s) {
          setSettings(s);
        }
      } catch (e) {
        console.warn("Could not load invoice settings:", e);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

  // STABLE, NON-FLASHING PREVIEW UPDATE:
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (activeTab === "invoice") {
        const html = renderInvoiceHtml(settings, activePayload);
        if (previewRef.current && previewRef.current.srcdoc !== html) {
          previewRef.current.srcdoc = html;
        }
      } else if (activeTab === "pos-slip") {
        const html = renderPosSlipHtml(settings, activePayload, posRollSize);
        if (posPreviewRef.current && posPreviewRef.current.srcdoc !== html) {
          posPreviewRef.current.srcdoc = html;
        }
      } else if (activeTab === "order-sticker") {
        const html = renderOrderStickerHtml(settings, activePayload, orderStickerSize);
        if (orderStickerPreviewRef.current && orderStickerPreviewRef.current.srcdoc !== html) {
          orderStickerPreviewRef.current.srcdoc = html;
        }
      }
    }, 10);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [settings, activePayload, activeTab, posRollSize, orderStickerSize]);

  const patch = useCallback(<K extends keyof InvoiceSettings>(key: K, value: InvoiceSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyPreset = useCallback((presetId: InvoiceSettings["preset"]) => {
    const p = LUXURY_PRESETS.find((x) => x.id === presetId) ?? LUXURY_PRESETS[0];
    setSettings((prev) => ({
      ...prev,
      preset: p.id,
      accent_color: p.accent,
      bg_color: p.bg,
      text_color: p.text,
      font_family: p.font,
      heading_font_family: p.heading,
    }));
  }, []);

  async function onSave() {
    setSaving(true);
    try {
      const parsed = InvoiceSettingsSchema.parse(settings);
      const { error: clientErr } = await supabase
        .from("site_settings")
        .upsert({ key: "invoice_settings", value: parsed }, { onConflict: "key" });

      if (clientErr) {
        await saveInvoiceSettings({ data: parsed });
      }

      // Sync Order Sticker settings to sticker_settings table
      const orderStickerDims = ORDER_STICKER_SIZES[orderStickerSize];
      await (supabase as any).from("sticker_settings").upsert({
        sticker_kind: "order",
        name: "Order Shipping Label Preset",
        width_in: orderStickerDims.widthIn,
        height_in: orderStickerDims.heightIn,
        border_color: parsed.accent_color || "#6B0F1A",
        background_color: parsed.bg_color || "#FDFBF7",
        text_color: parsed.text_color || "#1D070B",
        font_family: parsed.font_family || "Plus Jakarta Sans",
        is_active: true,
      }, { onConflict: "sticker_kind" });

      toast.success("Settings saved and synchronized successfully");
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const triggerDirectPrint = () => {
    if (previewRef.current?.contentWindow) {
      previewRef.current.contentWindow.focus();
      previewRef.current.contentWindow.print();
    } else {
      window.print();
    }
  };

  const triggerPosPrint = () => {
    if (posPreviewRef.current?.contentWindow) {
      posPreviewRef.current.contentWindow.focus();
      posPreviewRef.current.contentWindow.print();
    } else {
      window.print();
    }
  };

  const triggerOrderStickerPrint = () => {
    if (orderStickerPreviewRef.current?.contentWindow) {
      orderStickerPreviewRef.current.contentWindow.focus();
      orderStickerPreviewRef.current.contentWindow.print();
    } else {
      window.print();
    }
  };

  const GOOGLE_FONTS_EMBED = `@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Cormorant+Garamond:ital,wght@0,600;0,700;1,700&family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,500;0,600;0,700;1,600&family=Outfit:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;0,800;0,900;1,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700&display=block');`;

  const exportInvoiceJpg = async () => {
    const iframeDoc = previewRef.current?.contentDocument;
    if (!iframeDoc?.body) {
      toast.error("Invoice preview not ready");
      return;
    }
    try {
      toast.info("Exporting Invoice as JPG...");
      await iframeDoc.fonts.ready;

      const target =
        (iframeDoc.querySelector(".imp-sheet") as HTMLElement) ??
        (iframeDoc.querySelector(".invoice-sheet") as HTMLElement) ??
        iframeDoc.body;

      const dataUrl = await toJpeg(target, {
        quality: 0.98,
        pixelRatio: 3,
        backgroundColor: "#FDFBF7",
        fontEmbedCSS: GOOGLE_FONTS_EMBED,
      });

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `Invoice-${activePayload.order_number || "ORZ"}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Invoice exported as JPG");
    } catch (err: any) {
      console.error("JPG export error:", err);
      toast.error("Failed to export JPG: " + (err?.message || "Error"));
    }
  };

  const exportPosSlipJpg = async () => {
    const iframeDoc = posPreviewRef.current?.contentDocument;
    if (!iframeDoc?.body) {
      toast.error("POS Slip preview not ready");
      return;
    }
    try {
      toast.info("Exporting POS Slip as JPG...");
      await iframeDoc.fonts.ready;

      const target =
        (iframeDoc.querySelector(".pos-slip-card") as HTMLElement) ??
        iframeDoc.body;

      const dataUrl = await toJpeg(target, {
        quality: 0.98,
        pixelRatio: 3,
        backgroundColor: "#FDFBF7",
        fontEmbedCSS: GOOGLE_FONTS_EMBED,
      });

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `POS-Slip-${activePayload.order_number || "ORZ"}-${posRollSize}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("POS Slip exported as JPG");
    } catch (err: any) {
      console.error("JPG export error:", err);
      toast.error("Failed to export JPG: " + (err?.message || "Error"));
    }
  };

  const exportOrderStickerJpg = async () => {
    const iframeDoc = orderStickerPreviewRef.current?.contentDocument;
    if (!iframeDoc?.body) {
      toast.error("Order Sticker preview not ready");
      return;
    }
    try {
      toast.info("Exporting Order Sticker as JPG...");
      await iframeDoc.fonts.ready;

      const target =
        (iframeDoc.querySelector(".sticker-card") as HTMLElement) ??
        iframeDoc.body;

      const dataUrl = await toJpeg(target, {
        quality: 0.98,
        pixelRatio: 3,
        backgroundColor: "#FDFBF7",
        fontEmbedCSS: GOOGLE_FONTS_EMBED,
      });

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `OrderSticker-${activePayload.order_number || "ORZ"}-${orderStickerSize}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Order Sticker exported as JPG");
    } catch (err: any) {
      console.error("JPG export error:", err);
      toast.error("Failed to export JPG: " + (err?.message || "Error"));
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground font-mono">
        Loading studio…
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 pb-8 min-w-0">
      {/* ── Studio Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-0.5">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Invoice &amp; Sticker Design Studio
          </h1>
          <p className="text-xs text-muted-foreground">
            Official A4 luxury invoice, POS receipt slip, and high-visibility shipping sticker formatting.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap sm:flex-nowrap">
          {activeTab === "invoice" ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={triggerDirectPrint}
                className="rounded-xl h-8 text-xs font-semibold cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5 text-primary" /> Test Print
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={exportInvoiceJpg}
                className="rounded-xl h-8 text-xs font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 mr-1.5 text-primary" /> Export JPG
              </Button>
              <Button
                size="sm"
                onClick={onSave}
                disabled={saving}
                className="rounded-xl h-8 text-xs font-semibold bg-primary text-primary-foreground cursor-pointer px-4"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </>
          ) : activeTab === "pos-slip" ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={triggerPosPrint}
                className="rounded-xl h-8 text-xs font-semibold cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5 text-primary" /> Test Print ({POS_ROLL_SIZES[posRollSize].widthMm}mm)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={exportPosSlipJpg}
                className="rounded-xl h-8 text-xs font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 mr-1.5 text-primary" /> Export JPG
              </Button>
              <Button
                size="sm"
                onClick={onSave}
                disabled={saving}
                className="rounded-xl h-8 text-xs font-semibold bg-primary text-primary-foreground cursor-pointer px-4"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={triggerOrderStickerPrint}
                className="rounded-xl h-8 text-xs font-semibold cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5 text-primary" /> Test Print ({ORDER_STICKER_SIZES[orderStickerSize].label})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={exportOrderStickerJpg}
                className="rounded-xl h-8 text-xs font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 mr-1.5 text-primary" /> Export JPG
              </Button>
              <Button
                size="sm"
                onClick={onSave}
                disabled={saving}
                className="rounded-xl h-8 text-xs font-semibold bg-primary text-primary-foreground cursor-pointer px-4"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Direct Product Serial Sticker View (if opened via query) ── */}
      {tab === "product-sticker" ? (
        <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-4 sm:p-5 min-w-0">
          <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                Product Serial Sticker Designer
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Design physical unit verification tags, barcode labels, and security serial stickers.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTab("invoice")}
              className="rounded-xl text-xs cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" /> Back to Invoice
            </Button>
          </div>
          <StickerSetupTab kind="product_serial" />
        </div>
      ) : (
        <div className="space-y-3 min-w-0">
          {/* ── Symmetrical 3-Way Mode Switcher ── */}
          <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
              {/* Tab 1: Official A4 Invoice */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab("invoice");
                  setTab("invoice");
                }}
                className={`flex items-center justify-center gap-2.5 p-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === "invoice"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <div className="text-left min-w-0">
                  <p className="text-xs font-bold leading-tight truncate">Official A4 Invoice</p>
                  <p className="text-[10px] opacity-80 leading-tight truncate">Imperial Heritage Tax Invoice (A4)</p>
                </div>
              </button>

              {/* Tab 2: POS Receipt Slip */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab("pos-slip");
                  setTab("pos-slip");
                }}
                className={`flex items-center justify-center gap-2.5 p-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === "pos-slip"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                }`}
              >
                <Receipt className="w-4 h-4 shrink-0" />
                <div className="text-left min-w-0">
                  <p className="text-xs font-bold leading-tight truncate">POS Receipt Slip</p>
                  <p className="text-[10px] opacity-80 leading-tight truncate">Thermal POS Roll Format (Auto Length)</p>
                </div>
              </button>

              {/* Tab 3: Order Shipping Sticker */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab("order-sticker");
                  setTab("order-sticker");
                }}
                className={`flex items-center justify-center gap-2.5 p-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === "order-sticker"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                }`}
              >
                <Tag className="w-4 h-4 shrink-0" />
                <div className="text-left min-w-0">
                  <p className="text-xs font-bold leading-tight truncate">Order Shipping Sticker</p>
                  <p className="text-[10px] opacity-80 leading-tight truncate">Large Delivery Address &amp; Order QR</p>
                </div>
              </button>
            </div>
          </div>

          {/* ── TAB 1: LUXURY A4 INVOICE DESIGNER ── */}
          {activeTab === "invoice" && (
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-3.5 items-start min-w-0">
              {/* Left Column: Symmetrical Clean Config Engine */}
              <div className="space-y-3 min-w-0">
                {/* Luxury Color & Theme Presets */}
                <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-3.5 sm:p-4 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <div className="flex items-center gap-2">
                      <LayoutTemplate className="w-4 h-4 text-primary" />
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Design Theme
                      </h3>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono capitalize">
                      {settings.preset}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {LUXURY_PRESETS.map((p) => {
                      const IconComp = p.icon;
                      const active = settings.preset === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => applyPreset(p.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            active
                              ? "border-primary bg-primary/10 ring-1 ring-primary"
                              : "border-border/60 hover:border-primary/40 bg-secondary/15"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <IconComp className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-bold text-foreground">{p.label}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {p.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Typography Engine */}
                <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-3.5 sm:p-4 space-y-2.5">
                  <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                    <Type className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Typography Engine
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-xs">Heading Font Family</Label>
                      <Select
                        value={settings.heading_font_family || "Cinzel"}
                        onValueChange={(v) => patch("heading_font_family", v)}
                      >
                        <SelectTrigger className="h-8 text-xs rounded-xl bg-background border-border/60">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURATED_HEADING_FONTS.map((f) => (
                            <SelectItem key={f.value} value={f.value} className="text-xs">
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Body Font Family</Label>
                      <Select
                        value={settings.font_family || "Plus Jakarta Sans"}
                        onValueChange={(v) => patch("font_family", v)}
                      >
                        <SelectTrigger className="h-8 text-xs rounded-xl bg-background border-border/60">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURATED_BODY_FONTS.map((f) => (
                            <SelectItem key={f.value} value={f.value} className="text-xs">
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/40">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-foreground">Base Font Scale</span>
                      <span className="font-mono text-primary font-bold">{settings.font_size ?? 15}px</span>
                    </div>
                    <Slider
                      value={[settings.font_size ?? 15]}
                      min={12}
                      max={18}
                      step={1}
                      onValueChange={([v]) => patch("font_size", v)}
                    />
                  </div>
                </div>

                {/* Geometry & Element Resizing Controls */}
                <GeometryAndSizingPanel settings={settings} patch={patch} />

                {/* Field Visibility Checklist */}
                <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-3.5 sm:p-4 space-y-3">
                  <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                    <Sliders className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Visible Invoice Modules
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {FIELD_GROUPS.map((grp) => (
                      <div key={grp.title} className="space-y-1.5 p-2 rounded-xl bg-secondary/15 border border-border/30">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-1">
                          {grp.title}
                        </p>
                        {grp.fields.map((f) => (
                          <label
                            key={f.key}
                            className="flex items-center justify-between p-1 px-1.5 rounded-lg hover:bg-background/40 cursor-pointer text-xs"
                          >
                            <span className="text-foreground text-[11px]">{f.label}</span>
                            <Switch
                              checked={settings[f.key] !== false}
                              onCheckedChange={(val) => patch(f.key, val)}
                              className="scale-75 origin-right"
                            />
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Live Strict A4 Sheet Preview */}
              <div className="xl:sticky xl:top-20 xl:self-start space-y-2 min-w-0">
                <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md overflow-hidden flex flex-col shadow-xs">
                  {/* Preview Top Bar */}
                  <div className="p-2.5 border-b border-border/50 bg-secondary/20 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-bold text-foreground">
                        A4 Live Viewport (210×297mm)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Select
                        value={previewDataSource === "real" && selectedRealOrderId ? selectedRealOrderId : "sample"}
                        onValueChange={(val) => {
                          if (val === "sample") {
                            setPreviewDataSource("sample");
                            setSelectedRealOrderId("");
                          } else {
                            setPreviewDataSource("real");
                            setSelectedRealOrderId(val);
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs rounded-xl bg-background border-border/60 w-32">
                          <SelectValue placeholder="Data Source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sample" className="text-xs font-medium">
                            Sample Preview
                          </SelectItem>
                          {recentOrders.map((o: any) => (
                            <SelectItem key={o.id} value={o.id} className="text-xs font-mono">
                              {o.order_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex items-center gap-0.5 bg-background border border-border/60 rounded-xl p-0.5">
                        <button
                          type="button"
                          onClick={() => setPreviewZoom((z) => Math.max(45, z - 10))}
                          title="Zoom Out"
                          className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <ZoomOut className="w-3 h-3" />
                        </button>
                        <span className="text-[10px] font-mono font-bold px-1">{previewZoom}%</span>
                        <button
                          type="button"
                          onClick={() => setPreviewZoom((z) => Math.min(115, z + 10))}
                          title="Zoom In"
                          className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <ZoomIn className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Scaled A4 Viewport Container */}
                  <div className="p-4 sm:p-6 bg-[#E8E4DB] dark:bg-[#1A1513] overflow-x-auto min-h-[580px] flex items-center justify-center">
                    <div
                      style={{
                        width: `${(210 * 3.7795 * previewZoom) / 100}px`,
                        height: `${(297 * 3.7795 * previewZoom) / 100}px`,
                        position: "relative",
                        boxShadow: "0 12px 36px rgba(0,0,0,0.22)",
                        borderRadius: "4px",
                        flexShrink: 0,
                        overflow: "hidden",
                        background: "#FDFBF7",
                        transition: "width 0.15s ease, height 0.15s ease",
                      }}
                      className="border border-[#C5A059]/40"
                    >
                      <div
                        style={{
                          width: "210mm",
                          height: "297mm",
                          transform: `scale(${previewZoom / 100})`,
                          transformOrigin: "top left",
                          position: "absolute",
                          top: 0,
                          left: 0,
                        }}
                      >
                        <iframe
                          ref={previewRef}
                          title="Invoice Live Preview"
                          className="w-full h-full border-0 block"
                          style={{ width: "210mm", height: "297mm", overflow: "hidden" }}
                          scrolling="no"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: POS RECEIPT SLIP ── */}
          {activeTab === "pos-slip" && (
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(320px,460px)_1fr] gap-4 items-start min-w-0">
              {/* Left Column: POS Thermal Roll Live Preview */}
              <div className="xl:sticky xl:top-20 xl:self-start space-y-2 min-w-0">
                <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md overflow-hidden flex flex-col shadow-xs">
                  {/* Preview Top Bar */}
                  <div className="p-2.5 border-b border-border/50 bg-secondary/20 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-bold text-foreground">
                        POS Slip · {POS_ROLL_SIZES[posRollSize].widthMm}mm ({POS_ROLL_SIZES[posRollSize].widthIn}")
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Select
                        value={previewDataSource === "real" && selectedRealOrderId ? selectedRealOrderId : "sample"}
                        onValueChange={(val) => {
                          if (val === "sample") {
                            setPreviewDataSource("sample");
                            setSelectedRealOrderId("");
                          } else {
                            setPreviewDataSource("real");
                            setSelectedRealOrderId(val);
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs rounded-xl bg-background border-border/60 w-32">
                          <SelectValue placeholder="Data Source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sample" className="text-xs font-medium">
                            Sample Preview
                          </SelectItem>
                          {recentOrders.map((o: any) => (
                            <SelectItem key={o.id} value={o.id} className="text-xs font-mono">
                              {o.order_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex items-center gap-0.5 bg-background border border-border/60 rounded-xl p-0.5">
                        <button
                          type="button"
                          onClick={() => setPosPreviewZoom((z) => Math.max(70, z - 15))}
                          title="Zoom Out"
                          className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <ZoomOut className="w-3 h-3" />
                        </button>
                        <span className="text-[10px] font-mono font-bold px-1">{posPreviewZoom}%</span>
                        <button
                          type="button"
                          onClick={() => setPosPreviewZoom((z) => Math.min(160, z + 15))}
                          title="Zoom In"
                          className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <ZoomIn className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Left-Side Paper Roll Viewport Container */}
                  <div className="p-4 sm:p-5 bg-[#E8E4DB] dark:bg-[#1A1513] overflow-x-auto min-h-[460px] flex items-start justify-center">
                    <div
                      style={{
                        width: `${(POS_ROLL_SIZES[posRollSize].widthIn * 96 * posPreviewZoom) / 100}px`,
                        height: `${(posAutoHeight * posPreviewZoom) / 100}px`,
                        position: "relative",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                        borderRadius: "3px",
                        flexShrink: 0,
                        overflow: "hidden",
                        transition: "width 0.15s ease, height 0.15s ease",
                      }}
                      className="border border-[#C5A059]/40 bg-[#FDFBF7]"
                    >
                      <div
                        style={{
                          width: `${POS_ROLL_SIZES[posRollSize].widthIn}in`,
                          height: `${posAutoHeight}px`,
                          transform: `scale(${posPreviewZoom / 100})`,
                          transformOrigin: "top left",
                          position: "absolute",
                          top: 0,
                          left: 0,
                        }}
                      >
                        <iframe
                          ref={posPreviewRef}
                          title="POS Slip Live Preview"
                          className="border-0 block"
                          style={{
                            width: `${POS_ROLL_SIZES[posRollSize].widthIn}in`,
                            height: `${posAutoHeight}px`,
                            overflow: "hidden",
                          }}
                          scrolling="no"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Customizer & Roll Size Selector */}
              <div className="space-y-3 min-w-0">
                {/* Roll Size Selector Card */}
                <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-primary" />
                      <h4 className="text-xs font-bold text-foreground">POS Thermal Roll Width</h4>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                      {POS_ROLL_SIZES[posRollSize].widthMm}mm / {POS_ROLL_SIZES[posRollSize].widthIn}"
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {(Object.keys(POS_ROLL_SIZES) as PosRollSize[]).map((key) => {
                      const cfg = POS_ROLL_SIZES[key];
                      const isSel = posRollSize === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setPosRollSize(key)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isSel
                              ? "border-primary bg-primary/10 ring-1 ring-primary"
                              : "border-border/60 hover:border-primary/40 bg-secondary/15"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-bold text-foreground">{cfg.label}</span>
                            {isSel && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{cfg.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Aesthetic Presets */}
                <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-3.5 space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-primary" />
                    <h4 className="text-xs font-bold text-foreground">Aesthetic Style Presets</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {LUXURY_PRESETS.map((p) => {
                      const IconComp = p.icon;
                      const active = settings.preset === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => applyPreset(p.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            active
                              ? "border-primary bg-primary/10 ring-1 ring-primary"
                              : "border-border/60 hover:border-primary/40 bg-secondary/15"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <IconComp className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-bold text-foreground">{p.label}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{p.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Geometry & Element Resizing Controls */}
                <GeometryAndSizingPanel settings={settings} patch={patch} />
              </div>
            </div>
          )}

          {/* ── TAB 3: ORDER SHIPPING STICKER (NEW DEDICATED TAB) ── */}
          {activeTab === "order-sticker" && (
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(320px,500px)_1fr] gap-4 items-start min-w-0">
              {/* Left Column: Order Shipping Sticker Live Preview */}
              <div className="xl:sticky xl:top-20 xl:self-start space-y-2 min-w-0">
                <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md overflow-hidden flex flex-col shadow-xs">
                  {/* Preview Top Bar */}
                  <div className="p-2.5 border-b border-border/50 bg-secondary/20 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-bold text-foreground">
                        Order Shipping Sticker · {ORDER_STICKER_SIZES[orderStickerSize].label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Select
                        value={previewDataSource === "real" && selectedRealOrderId ? selectedRealOrderId : "sample"}
                        onValueChange={(val) => {
                          if (val === "sample") {
                            setPreviewDataSource("sample");
                            setSelectedRealOrderId("");
                          } else {
                            setPreviewDataSource("real");
                            setSelectedRealOrderId(val);
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs rounded-xl bg-background border-border/60 w-32">
                          <SelectValue placeholder="Data Source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sample" className="text-xs font-medium">
                            Sample Preview
                          </SelectItem>
                          {recentOrders.map((o: any) => (
                            <SelectItem key={o.id} value={o.id} className="text-xs font-mono">
                              {o.order_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex items-center gap-0.5 bg-background border border-border/60 rounded-xl p-0.5">
                        <button
                          type="button"
                          onClick={() => setOrderStickerZoom((z) => Math.max(70, z - 15))}
                          title="Zoom Out"
                          className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <ZoomOut className="w-3 h-3" />
                        </button>
                        <span className="text-[10px] font-mono font-bold px-1">{orderStickerZoom}%</span>
                        <button
                          type="button"
                          onClick={() => setOrderStickerZoom((z) => Math.min(160, z + 15))}
                          title="Zoom In"
                          className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <ZoomIn className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Left-Side Sticker Viewport Container */}
                  <div className="p-4 sm:p-6 bg-[#E8E4DB] dark:bg-[#1A1513] overflow-x-auto min-h-[380px] flex items-center justify-center">
                    <div
                      style={{
                        width: `${(ORDER_STICKER_SIZES[orderStickerSize].widthIn * 96 * orderStickerZoom) / 100}px`,
                        height: `${(ORDER_STICKER_SIZES[orderStickerSize].heightIn * 96 * orderStickerZoom) / 100}px`,
                        position: "relative",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                        borderRadius: "2px",
                        flexShrink: 0,
                        overflow: "hidden",
                        transition: "width 0.15s ease, height 0.15s ease",
                      }}
                      className="border border-[#C5A059]/40 bg-[#FDFBF7]"
                    >
                      <div
                        style={{
                          width: `${ORDER_STICKER_SIZES[orderStickerSize].widthIn}in`,
                          height: `${ORDER_STICKER_SIZES[orderStickerSize].heightIn}in`,
                          transform: `scale(${orderStickerZoom / 100})`,
                          transformOrigin: "top left",
                          position: "absolute",
                          top: 0,
                          left: 0,
                        }}
                      >
                        <iframe
                          ref={orderStickerPreviewRef}
                          title="Order Shipping Sticker Live Preview"
                          className="border-0 block"
                          style={{
                            width: `${ORDER_STICKER_SIZES[orderStickerSize].widthIn}in`,
                            height: `${ORDER_STICKER_SIZES[orderStickerSize].heightIn}in`,
                            overflow: "hidden",
                          }}
                          scrolling="no"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Customizer & Order Sticker Controls */}
              <div className="space-y-3 min-w-0">
                {/* 1. Label Dimensions Selector */}
                <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-primary" />
                      <h4 className="text-xs font-bold text-foreground">Shipping Sticker Dimensions</h4>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                      {ORDER_STICKER_SIZES[orderStickerSize].label}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {(Object.keys(ORDER_STICKER_SIZES) as OrderStickerSize[]).map((key) => {
                      const cfg = ORDER_STICKER_SIZES[key];
                      const isSel = orderStickerSize === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setOrderStickerSize(key)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isSel
                              ? "border-primary bg-primary/10 ring-1 ring-primary"
                              : "border-border/60 hover:border-primary/40 bg-secondary/15"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-bold text-foreground">{cfg.label}</span>
                            {isSel && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{cfg.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Aesthetic Style Presets */}
                <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-3.5 space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-primary" />
                    <h4 className="text-xs font-bold text-foreground">Aesthetic Style Presets</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {LUXURY_PRESETS.map((p) => {
                      const IconComp = p.icon;
                      const active = settings.preset === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => applyPreset(p.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            active
                              ? "border-primary bg-primary/10 ring-1 ring-primary"
                              : "border-border/60 hover:border-primary/40 bg-secondary/15"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <IconComp className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-bold text-foreground">{p.label}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{p.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Customer Info & Branding Highlights Card */}
                <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-3.5 space-y-3">
                  <div className="flex items-center gap-1.5 border-b border-border/50 pb-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Sticker Content &amp; Branding Features
                    </h4>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-secondary/20 border border-border/40 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-foreground">
                        <Crown className="w-3.5 h-3.5 text-primary" />
                        <span>ORIZINO Branding (Large Logo Left)</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Displays the prominent brand crest on the left, brand name in imperial typography, official phone number, and verified URL <strong className="text-primary">www.orizino.com</strong>.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-secondary/20 border border-border/40 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-foreground">
                        <User className="w-3.5 h-3.5 text-primary" />
                        <span>High-Visibility Large Recipient Box</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Recipient name, phone number, and full shipping delivery address are rendered in high-contrast bold fonts for instant clarity by courier dispatch and riders.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-secondary/20 border border-border/40 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-foreground">
                        <QrCode className="w-3.5 h-3.5 text-primary" />
                        <span>Order Verification &amp; Tracking QR Code</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Crisp vector QR code linking to the live online order tracking and authenticity verification portal.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. Sizing Controls */}
                <GeometryAndSizingPanel settings={settings} patch={patch} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
