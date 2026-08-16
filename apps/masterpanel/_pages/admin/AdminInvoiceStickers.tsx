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
import { StickerSetupTab } from "./AdminProductsManagement";
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
} from "lucide-react";

type ModeTab = "invoice" | "order-sticker";

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
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => patch("qr_size", opt.id)}
              className={`py-1.5 px-1.5 rounded-lg border text-center text-[10px] font-bold transition-all cursor-pointer ${
                (settings.qr_size || "full_width") === opt.id
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-secondary/30 border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* QR Scale Slider */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Fine-tune QR Width / Scale:</span>
            <span className="font-mono font-bold text-primary">{settings.qr_scale ?? 100}%</span>
          </div>
          <Slider
            min={50}
            max={180}
            step={5}
            value={[settings.qr_scale ?? 100]}
            onValueChange={([val]) => patch("qr_scale", val)}
          />
        </div>
      </div>

      {/* 2. Brand Logo & Brand Name Sizing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Logo Sizing */}
        <div className="space-y-1.5 p-2.5 rounded-xl border border-border/40 bg-secondary/15">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-foreground">Brand Logo Size</span>
            <span className="text-[10px] font-mono text-primary font-bold">{settings.logo_size || "large"} ({settings.logo_scale ?? 100}%)</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {(["small", "medium", "large", "extra_large"] as const).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => patch("logo_size", sz)}
                className={`py-1 text-[9.5px] font-bold rounded-lg border capitalize transition-all cursor-pointer ${
                  (settings.logo_size || "large") === sz
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/30 border-border/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {sz === "extra_large" ? "XL" : sz}
              </button>
            ))}
          </div>
          <Slider
            min={50}
            max={180}
            step={5}
            value={[settings.logo_scale ?? 100]}
            onValueChange={([v]) => patch("logo_scale", v)}
            className="pt-1"
          />
        </div>

        {/* Brand Name Sizing */}
        <div className="space-y-1.5 p-2.5 rounded-xl border border-border/40 bg-secondary/15">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-foreground">Brand Name Size</span>
            <span className="text-[10px] font-mono text-primary font-bold">{settings.brand_name_size || "large"} ({settings.brand_name_scale ?? 100}%)</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {(["small", "medium", "large", "extra_large"] as const).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => patch("brand_name_size", sz)}
                className={`py-1 text-[9.5px] font-bold rounded-lg border capitalize transition-all cursor-pointer ${
                  (settings.brand_name_size || "large") === sz
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/30 border-border/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {sz === "extra_large" ? "XL" : sz}
              </button>
            ))}
          </div>
          <Slider
            min={50}
            max={180}
            step={5}
            value={[settings.brand_name_scale ?? 100]}
            onValueChange={([v]) => patch("brand_name_scale", v)}
            className="pt-1"
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
  const [activeTab, setActiveTab] = useState<ModeTab>(() => (tab === "order-sticker" ? "order-sticker" : "invoice"));
  const persist = useServerFn(saveInvoiceSettings);

  const [settings, setSettings] = useState<InvoiceSettings>(() => InvoiceSettingsSchema.parse({}));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewZoom, setPreviewZoom] = useState<number>(75);
  const [stickerPreviewZoom, setStickerPreviewZoom] = useState<number>(100);
  const [posRollSize, setPosRollSize] = useState<PosRollSize>("58mm");
  const [posAutoHeight, setPosAutoHeight] = useState<number>(380);
  const [previewDataSource, setPreviewDataSource] = useState<"sample" | "real">("sample");
  const [selectedRealOrderId, setSelectedRealOrderId] = useState<string>("");

  const previewRef = useRef<HTMLIFrameElement>(null);
  const stickerPreviewRef = useRef<HTMLIFrameElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync tab param changes
  useEffect(() => {
    if (tab === "order-sticker") setActiveTab("order-sticker");
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

  // Fetch site brand assets
  const { data: brandLogoUrl } = useQuery({
    queryKey: ["site-logo-url"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "logo_url").maybeSingle();
      if (!data) return "/orizino-logo.svg";
      const val = typeof data.value === "object" && data.value !== null ? (data.value as any).value ?? "/orizino-logo.svg" : data.value;
      return val || "/orizino-logo.svg";
    },
    staleTime: 60000,
  });

  const { data: brandName } = useQuery({
    queryKey: ["site-name"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "site_name").maybeSingle();
      if (!data) return "ORIZINO IMPERIAL GOODS CO.";
      const val = typeof data.value === "object" && data.value !== null ? (data.value as any).value ?? "ORIZINO" : String(data.value);
      return val || "ORIZINO IMPERIAL GOODS CO.";
    },
    staleTime: 60000,
  });

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

    if (previewDataSource === "real" && selectedRealOrderId) {
      const ord: any = recentOrders.find((o: any) => o.id === selectedRealOrderId);
      if (ord) {
        return {
          order_number: ord.order_number || "Imperial-00123",
          invoice_number: `INV-${ord.order_number?.replace(/\D/g, "") || "00123"}`,
          issue_date: new Date(ord.created_at || Date.now()).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
          status: "confirmed",
          payment_method: ord.payment_method || "Cash on Delivery",
          payment_status: "Verified Order Dispatch",
          tracking_number: "ORZ-EXP-884910-BD",
          subtotal: Number(ord.subtotal || ord.total || 0),
          shipping_fee: Number(ord.shipping_fee || 0),
          tax: 0,
          discount: Number(ord.coupon_discount || 0),
          total: Number(ord.total || 0),
          currency: "৳",
          brand: {
            name: brandName || "ORIZINO IMPERIAL GOODS CO.",
            logo_url: resolvedLogo,
            brand_mark_url: resolvedLogo,
            address: "N°1 Palace Road, Capital City, Dhaka",
            email: "info@orizino.com",
            phone: "003 255 7899",
            website: "orizino.com",
          },
          customer: {
            full_name: ord.customer_name || "Customer Name",
            email: ord.customer_email || "client@orizino.com",
            phone: ord.customer_phone || "(40) 253-6726",
            shipping_address: ord.shipping_address || "Address Road, Capital City",
            billing_address: ord.shipping_address || "Address Road, Capital City",
          },
          items: (ord.order_items || []).map((it: any) => ({
            name: it.name || "Silk Item",
            sku: it.sku || "ORZ-SL-CHR-01",
            quantity: Number(it.quantity || 1),
            unit_price: Number(it.unit_price || 0),
            line_total: Number(it.total_price || 0),
          })),
          notes: "Courier Dispatch. Verified and packaged with care.",
        };
      }
    }

    return sampleInvoicePayload({
      logo_url: resolvedLogo,
      brand_mark_url: resolvedLogo,
      name: brandName || "ORIZINO IMPERIAL GOODS CO.",
    });
  }, [previewDataSource, selectedRealOrderId, recentOrders, brandLogoUrl, brandName]);

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
      } else if (activeTab === "order-sticker") {
        const html = renderPosSlipHtml(settings, activePayload, posRollSize);
        if (stickerPreviewRef.current && stickerPreviewRef.current.srcdoc !== html) {
          stickerPreviewRef.current.srcdoc = html;
        }
      }
    }, 10);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [settings, activePayload, activeTab, posRollSize]);

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
      toast.success("Settings saved successfully");
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

  const triggerStickerPrint = () => {
    if (stickerPreviewRef.current?.contentWindow) {
      stickerPreviewRef.current.contentWindow.focus();
      stickerPreviewRef.current.contentWindow.print();
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
    const iframeDoc = stickerPreviewRef.current?.contentDocument;
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
            Invoice &amp; Order Sticker Studio
          </h1>
          <p className="text-xs text-muted-foreground">
            A4 single-page luxury document formatting with royal Oriental filigree, logo watermark, and instant QR validation.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
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
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={triggerStickerPrint}
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
          {/* ── Symmetrical 2-Way Switcher: [ Invoice ] | [ Order Sticker ] ── */}
          <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-1">
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("invoice");
                  setTab("invoice");
                }}
                className={`flex items-center justify-center gap-2 p-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === "invoice"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                }`}
              >
                <FileText className="w-4 h-4" />
                <div className="text-left">
                  <p className="text-xs font-semibold leading-tight">Official A4 Invoice</p>
                  <p className="text-[10px] opacity-75 leading-tight">Imperial Heritage Single-Page Document (210×297mm)</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("order-sticker");
                  setTab("order-sticker");
                }}
                className={`flex items-center justify-center gap-2 p-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === "order-sticker"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                }`}
              >
                <Receipt className="w-4 h-4" />
                <div className="text-left">
                  <p className="text-xs font-semibold leading-tight">POS Invoice Slip / Sticker</p>
                  <p className="text-[10px] opacity-75 leading-tight">2.2" POS Machine Format (Auto Length)</p>
                </div>
              </button>
            </div>
          </div>

          {/* ── TAB 1: LUXURY INVOICE DESIGNER ── */}
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
                      const isSelected = settings.preset === p.id;
                      const IconComponent = p.icon;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => applyPreset(p.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[75px] ${
                            isSelected
                              ? "bg-primary/10 border-primary text-foreground font-semibold ring-1 ring-primary/30"
                              : "bg-secondary/30 border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 w-full">
                            <div className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ background: p.accent }} />
                            <IconComponent className="w-3.5 h-3.5 opacity-60" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">{p.label}</p>
                            <p className="text-[9px] text-muted-foreground leading-tight mt-0.5 line-clamp-1">
                              {p.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── FONT CONFIGURATION PANEL ── */}
                <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-3.5 sm:p-4 space-y-3">
                  <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                    <Type className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Typography &amp; Font Configs
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Body Font Family */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-medium text-foreground">Body Font Family</Label>
                      <Select
                        value={CURATED_BODY_FONTS.some((f) => f.value === settings.font_family) ? settings.font_family : "custom"}
                        onValueChange={(val) => {
                          if (val !== "custom") patch("font_family", val);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs rounded-xl bg-secondary/30 border-border/60">
                          <SelectValue placeholder="Select Body Font" />
                        </SelectTrigger>
                        <SelectContent>
                          {CURATED_BODY_FONTS.map((f) => (
                            <SelectItem key={f.value} value={f.value} className="text-xs">
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={settings.font_family}
                        onChange={(e) => patch("font_family", e.target.value)}
                        placeholder="Custom Google font name"
                        className="h-7 text-[11px] bg-secondary/20 border-border/50 rounded-lg"
                      />
                    </div>

                    {/* Heading Font Family */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-medium text-foreground">Heading Font Family</Label>
                      <Select
                        value={CURATED_HEADING_FONTS.some((f) => f.value === settings.heading_font_family) ? settings.heading_font_family : "custom"}
                        onValueChange={(val) => {
                          if (val !== "custom") patch("heading_font_family", val);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs rounded-xl bg-secondary/30 border-border/60">
                          <SelectValue placeholder="Select Heading Font" />
                        </SelectTrigger>
                        <SelectContent>
                          {CURATED_HEADING_FONTS.map((f) => (
                            <SelectItem key={f.value} value={f.value} className="text-xs">
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={settings.heading_font_family}
                        onChange={(e) => patch("heading_font_family", e.target.value)}
                        placeholder="Custom heading font name"
                        className="h-7 text-[11px] bg-secondary/20 border-border/50 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Base Font Size Slider */}
                  <div className="pt-2 border-t border-border/40 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] text-muted-foreground">Base Document Font Size:</span>
                      <span className="font-mono font-bold text-primary">
                        {settings.font_size ?? 15}px
                      </span>
                    </div>
                    <Slider
                      min={10}
                      max={24}
                      step={1}
                      value={[settings.font_size ?? 15]}
                      onValueChange={([val]) => patch("font_size", val)}
                      className="py-1"
                    />
                  </div>
                </div>

                {/* Colors, Palette & Watermark */}
                <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-3.5 sm:p-4 space-y-3">
                  <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                    <Palette className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Palette &amp; Watermark
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(
                      [
                        { key: "accent_color", label: "Accent Ink" },
                        { key: "text_color", label: "Main Ink" },
                        { key: "muted_color", label: "Subtle Ink" },
                        { key: "bg_color", label: "Parchment" },
                      ] as const
                    ).map(({ key, label }) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground block truncate">
                          {label}
                        </Label>
                        <div className="flex items-center gap-1 bg-secondary/30 border border-border/50 rounded-xl p-1">
                          <input
                            type="color"
                            value={settings[key]}
                            onChange={(e) => patch(key, e.target.value)}
                            className="h-6 w-6 rounded-lg border-0 bg-transparent cursor-pointer shrink-0"
                          />
                          <input
                            type="text"
                            value={settings[key]}
                            onChange={(e) => patch(key, e.target.value)}
                            className="w-full bg-transparent font-mono text-[10px] text-foreground outline-none uppercase"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Watermark Opacity Slider */}
                  <div className="pt-2 border-t border-border/40 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] text-muted-foreground">Logo Watermark Opacity:</span>
                      <span className="font-mono font-bold text-primary">
                        {Math.round((settings.watermark_opacity ?? 0.08) * 100)}%
                      </span>
                    </div>
                    <Slider
                      min={0.02}
                      max={0.25}
                      step={0.01}
                      value={[settings.watermark_opacity ?? 0.08]}
                      onValueChange={([val]) => patch("watermark_opacity", val)}
                      className="py-1"
                    />
                  </div>
                </div>

                {/* Geometry & Element Resizing Controls */}
                <GeometryAndSizingPanel settings={settings} patch={patch} />

                {/* Document Field Toggles */}
                <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-3 space-y-2">
                  <div className="flex items-center gap-2 border-b border-border/50 pb-1.5">
                    <Sliders className="w-3.5 h-3.5 text-primary" />
                    <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                      Visible Elements &amp; Information
                    </h3>
                  </div>

                  <div className="space-y-1.5">
                    {FIELD_GROUPS.map((group) => (
                      <div key={group.title} className="space-y-0.5">
                        <span className="text-[8.5px] font-mono uppercase tracking-wider text-muted-foreground block">
                          {group.title}
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                          {group.fields.map((f) => (
                            <label
                              key={f.key}
                              className="flex items-center justify-between py-1 px-1.5 rounded-lg border border-border/40 bg-secondary/15 hover:bg-secondary/35 cursor-pointer transition-colors"
                            >
                              <span className="text-[10px] font-medium text-foreground truncate pr-1">{f.label}</span>
                              <Switch
                                checked={settings[f.key] as boolean}
                                onCheckedChange={(v) => patch(f.key, v as any)}
                                className="scale-[0.65] shrink-0 origin-right"
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Exact A4 Page Fit & Zero-Scroll Preview */}
              <div className="xl:sticky xl:top-20 xl:self-start space-y-2 min-w-0">
                <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md overflow-hidden flex flex-col shadow-xs">
                  {/* Top Preview Bar */}
                  <div className="p-2.5 border-b border-border/50 bg-secondary/20 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-bold text-foreground">A4 Master View</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Data Source Selector */}
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

                      {/* Zoom Controls */}
                      <div className="flex items-center gap-0.5 bg-background border border-border/60 rounded-xl p-0.5">
                        <button
                          type="button"
                          onClick={() => setPreviewZoom(75)}
                          title="Fit Full Page"
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded-lg cursor-pointer ${
                            previewZoom === 75 ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Fit
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewZoom((z) => Math.max(50, z - 10))}
                          title="Zoom Out"
                          className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <ZoomOut className="w-3 h-3" />
                        </button>
                        <span className="text-[10px] font-mono font-bold px-1">{previewZoom}%</span>
                        <button
                          type="button"
                          onClick={() => setPreviewZoom((z) => Math.min(130, z + 10))}
                          title="Zoom In"
                          className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <ZoomIn className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Clean A4 Viewport Aligned at Top */}
                  <div className="p-3 bg-[#E8E4DB] dark:bg-[#1A1513] overflow-hidden flex items-center justify-center min-h-[500px]">
                    <div
                      style={{
                        width: `${(210 * previewZoom) / 100}mm`,
                        height: `${(297 * previewZoom) / 100}mm`,
                        position: "relative",
                        overflow: "hidden",
                        boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
                        borderRadius: "4px",
                        flexShrink: 0,
                        transition: "width 0.15s ease, height 0.15s ease",
                      }}
                      className="border border-[#C5A059]/40 bg-[#FDFBF7]"
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

          {/* ── TAB 2: POS INVOICE SLIP / STICKER ── */}
          {activeTab === "order-sticker" && (
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(320px,460px)_1fr] gap-4 items-start min-w-0">
              {/* Left Column: POS Thermal Roll Live Preview (Fitted tightly to receipt) */}
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
                      {/* Data Source Selector */}
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

                      {/* Zoom Controls */}
                      <div className="flex items-center gap-0.5 bg-background border border-border/60 rounded-xl p-0.5">
                        <button
                          type="button"
                          onClick={() => setStickerPreviewZoom(100)}
                          title="100% Scale"
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded-lg cursor-pointer ${
                            stickerPreviewZoom === 100 ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          100%
                        </button>
                        <button
                          type="button"
                          onClick={() => setStickerPreviewZoom((z) => Math.max(70, z - 15))}
                          title="Zoom Out"
                          className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <ZoomOut className="w-3 h-3" />
                        </button>
                        <span className="text-[10px] font-mono font-bold px-1">{stickerPreviewZoom}%</span>
                        <button
                          type="button"
                          onClick={() => setStickerPreviewZoom((z) => Math.min(160, z + 15))}
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
                        width: `${(POS_ROLL_SIZES[posRollSize].widthIn * 96 * stickerPreviewZoom) / 100}px`,
                        height: `${(posAutoHeight * stickerPreviewZoom) / 100}px`,
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
                          transform: `scale(${stickerPreviewZoom / 100})`,
                          transformOrigin: "top left",
                          position: "absolute",
                          top: 0,
                          left: 0,
                        }}
                      >
                        <iframe
                          ref={stickerPreviewRef}
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
                {/* Roll Size & Standard Selector Card */}
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

                  {/* Font Size Scaling */}
                  <div className="pt-2 border-t border-border/40">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-foreground">Typography Base Scale</span>
                      <span className="font-mono text-primary font-bold">
                        {settings.font_size ?? 13}px (Slip: {Math.max(8.5, Math.min(16, POS_ROLL_SIZES[posRollSize].defaultFontSize + ((settings.font_size ?? 13) - 13)))}px)
                      </span>
                    </div>
                    <Slider
                      value={[settings.font_size ?? 13]}
                      min={10}
                      max={18}
                      step={1}
                      onValueChange={([v]) => patch("font_size", v)}
                    />
                  </div>

                  {/* Watermark Opacity */}
                  <div className="pt-2 border-t border-border/40">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-foreground">Watermark Opacity</span>
                      <span className="font-mono text-primary font-bold">{Math.round((settings.watermark_opacity ?? 0.06) * 100)}%</span>
                    </div>
                    <Slider
                      value={[Math.round((settings.watermark_opacity ?? 0.06) * 100)]}
                      min={0}
                      max={20}
                      step={1}
                      onValueChange={([v]) => patch("watermark_opacity", v / 100)}
                    />
                  </div>
                </div>

                {/* Geometry & Element Resizing Controls */}
                <GeometryAndSizingPanel settings={settings} patch={patch} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
