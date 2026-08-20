import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@ui/components/ui/button";
import { Input } from "@ui/components/ui/input";
import { Label } from "@ui/components/ui/label";
import { Textarea } from "@ui/components/ui/textarea";
import { Badge } from "@ui/components/ui/badge";
import { Checkbox } from "@ui/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/components/ui/select";
import { SearchableSelect } from "@/components/SearchableSelect";
import { BarcodeScanner, ScannerLaunchCard } from "@/components/BarcodeScanner";
import { lookupSerial } from "@/lib/serials";
import { useMasterPanelDesigns } from "@/lib/design-presets";
import { printInvoicePdf, printThermalSlip, printShippingSticker } from "@/lib/invoice-pdf";
import { createOfflineOrder, type OfflineSource } from "@/lib/offline-orders";
import { generateInvoice } from "@/lib/invoice";
import { supabase } from "@/lib/supabase";
import {
  ScanLine,
  Trash2,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Printer,
  Receipt,
  Mail,
  Plus,
  Store,
  Share2,
  MessageCircle,
  Music2,
  Camera,
  SkipForward,
  PackageX,
  Sparkles,
  ClipboardPaste,
  Compass,
  Truck,
  RotateCcw,
  ExternalLink,
  Tag,
  Copy
} from "lucide-react";

import {
  extractSerialCode,
  parseChatForCustomerInfo,
  detectLocationFromAddress,
  calculateCourierRate,
  BD_COURIER_LOCATIONS,
  type ParsedCustomerInfo,
} from "@orizino/shared";

// ═════════════════════════════════════════════════════════════════════════
// ACCURATE BRAND & CHANNEL SVG ICONS
// ═════════════════════════════════════════════════════════════════════════
export function FacebookIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.414z" />
    </svg>
  );
}

export function TikTokIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.97-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

export function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

const SOURCE_OPTIONS: { value: OfflineSource; label: string; short: string; icon: any }[] = [
  { value: "offline", label: "Walk-in Store (Counter)", short: "Counter", icon: Store },
  { value: "page", label: "Facebook Page", short: "Facebook", icon: FacebookIcon },
  { value: "whatsapp", label: "WhatsApp", short: "WhatsApp", icon: WhatsAppIcon },
  { value: "tiktok", label: "TikTok Shop / Live", short: "TikTok", icon: TikTokIcon },
  { value: "instagram", label: "Instagram Direct", short: "Instagram", icon: InstagramIcon },
];

interface ScannedUnit {
  serialId: string;
  serialCode: string;
  productId: string;
  variantId: string | null;
  productName: string;
  unitPrice: number;
}

type Step = "form" | "scan" | "review" | "done";
const STEP_LABEL: Record<Step, string> = { form: "Customer", scan: "Scan Items", review: "Review & Pay", done: "Invoice" };
const STEPS: Step[] = ["form", "scan", "review", "done"];

function StepPills({ step }: { step: Step }) {
  const idx = STEPS.indexOf(step);
  return (
    <div className="flex items-center justify-between gap-1 sm:gap-2 px-2 py-1.5 rounded-2xl bg-card border border-border/70 shadow-2xs">
      {STEPS.map((s, i) => {
        const isCurrent = i === idx;
        const isDone = i < idx;
        return (
          <div key={s} className="flex items-center flex-1 min-w-0">
            <div
              className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 w-full justify-center ${
                isCurrent
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : isDone
                  ? "text-primary bg-primary/10 font-bold"
                  : "text-muted-foreground bg-muted/40"
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                  isCurrent
                    ? "bg-white/20 text-white font-bold"
                    : isDone
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? <Check className="w-2.5 h-2.5" /> : i + 1}
              </span>
              <span className="truncate">{STEP_LABEL[s]}</span>
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 mx-0.5 hidden sm:inline" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="sticky bottom-0 -mx-3 sm:mx-0 mt-6 flex items-center gap-2.5 border-t sm:border border-border/80 bg-card/95 backdrop-blur-xl px-4 py-3.5 shadow-lg z-30 rounded-t-3xl sm:rounded-2xl"
    >
      {children}
    </div>
  );
}

export function WalkInOrders() {
  const [step, setStep] = useState<Step>("form");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("Dhaka");
  const [thana, setThana] = useState("Dhanmondi");
  const [postalCode, setPostalCode] = useState("");
  const [source, setSource] = useState<OfflineSource>("offline");
  const [notes, setNotes] = useState("");
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [isPrepaidDelivery, setIsPrepaidDelivery] = useState<boolean>(false);
  const [isDeliveryFeeManual, setIsDeliveryFeeManual] = useState<boolean>(false);
  const [pushToCourier, setPushToCourier] = useState<boolean>(true);
  const [courierProvider, setCourierProvider] = useState<"steadfast" | "pathao">("steadfast");
  const [isCod, setIsCod] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [discount, setDiscount] = useState<number>(0);

  // Chat Auto-Extractor State
  const [chatPasteText, setChatPasteText] = useState("");
  const [isChatBoxOpen, setIsChatBoxOpen] = useState(true);
  const [parsedChatInfo, setParsedChatInfo] = useState<ParsedCustomerInfo | null>(null);

  // Scanning & Order Items
  const [scannerActive, setScannerActive] = useState(false);
  const [units, setUnits] = useState<ScannedUnit[]>([]);

  // Result / Invoice State
  const [result, setResult] = useState<{ order: any; items: any[]; courierResult?: any } | null>(null);
  const [emailOverride, setEmailOverride] = useState("");

  // Query site settings for dynamic courier tariffs
  const { data: shippingSettings } = useQuery({
    queryKey: ["orderops-shipping-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "shipping_rates")
        .maybeSingle();
      return (data?.value as any) || null;
    },
  });

  // Dynamic available thanas based on selected district
  const availableThanas = useMemo(() => {
    const loc = BD_COURIER_LOCATIONS.find(
      (l) => l.district.toLowerCase() === district.toLowerCase()
    );
    return loc?.thanas || ["Sadar", "Mirpur", "Uttara", "Gulshan", "Dhanmondi"];
  }, [district]);

  const unitsSubtotal = useMemo(() => units.reduce((sum, u) => sum + (u.unitPrice || 0), 0), [units]);
  const grouped = useMemo(() => {
    const map = new Map<string, { productName: string; unitPrice: number; serialIds: string[] }>();
    for (const u of units) {
      const key = `${u.productId}::${u.variantId ?? ""}`;
      if (!map.has(key)) map.set(key, { productName: u.productName, unitPrice: u.unitPrice, serialIds: [] });
      map.get(key)!.serialIds.push(u.serialId);
    }
    return [...map.values()];
  }, [units]);

  const itemsSubtotal = useMemo(() => {
    return grouped.reduce((sum, g) => sum + g.unitPrice * g.serialIds.length, 0);
  }, [grouped]);

  // Dynamic courier tariff calculation
  const courierRateResult = useMemo(() => {
    return calculateCourierRate({
      district,
      thana,
      itemSubtotal: itemsSubtotal,
      isCod,
      ...(shippingSettings || {}),
    });
  }, [district, thana, itemsSubtotal, isCod, shippingSettings]);

  const handleDistrictSelect = (newDistrict: string) => {
    setDistrict(newDistrict);
    const loc = BD_COURIER_LOCATIONS.find((l) => l.district.toLowerCase() === newDistrict.toLowerCase());
    if (loc && loc.thanas.length > 0) {
      setThana(loc.thanas[0]);
    }
    if (!isDeliveryFeeManual) {
      const updated = calculateCourierRate({
        district: newDistrict,
        thana: loc?.thanas[0] || thana,
        itemSubtotal: itemsSubtotal,
        isCod,
        ...(shippingSettings || {}),
      });
      setShippingFee(updated.effectiveDeliveryFee);
    }
  };

  const handleSourceChange = (newSource: OfflineSource) => {
    setSource(newSource);
    if (newSource === "offline") {
      setShippingFee(0);
      setIsPrepaidDelivery(false);
      setPaymentMethod("cash");
    } else {
      if (!isDeliveryFeeManual) {
        setShippingFee(courierRateResult.effectiveDeliveryFee);
      }
      setPaymentMethod("cod");
    }
  };

  const handleChatTextChange = (text: string) => {
    setChatPasteText(text);
    if (text.trim().length > 5) {
      const parsed = parseChatForCustomerInfo(text);
      setParsedChatInfo(parsed);
    } else {
      setParsedChatInfo(null);
    }
  };

  const applyParsedChatInfo = (parsed?: ParsedCustomerInfo | null) => {
    const info = parsed || parsedChatInfo || parseChatForCustomerInfo(chatPasteText);
    if (!info) return;

    if (info.name) setCustomerName(info.name);
    if (info.phone) setPhone(info.phone);
    if (info.email) setEmail(info.email);
    if (info.fullAddress) {
      setAddress(info.fullAddress);
      const loc = detectLocationFromAddress(info.fullAddress);
      if (loc.district) {
        setDistrict(loc.district);
        if (loc.thana) setThana(loc.thana);
        if (!isDeliveryFeeManual) {
          const autoRate = calculateCourierRate({
            district: loc.district,
            thana: loc.thana || thana,
            itemSubtotal: itemsSubtotal,
            isCod,
            ...(shippingSettings || {}),
          });
          setShippingFee(autoRate.effectiveDeliveryFee);
        }
      }
      if (loc.postalCode) setPostalCode(loc.postalCode);
    }
    if (info.notes) setNotes((prev) => (prev ? `${prev} · ${info.notes}` : info.notes));
    if (info.detectedSource) setSource(info.detectedSource as OfflineSource);

    toast.success("Customer info auto-filled!", {
      description: `Matched: ${info.matchedFields.join(", ")} (${info.confidenceScore}% confidence)`,
    });
  };

  const handleAddressChange = (addr: string) => {
    setAddress(addr);
    if (addr.length > 5) {
      const loc = detectLocationFromAddress(addr);
      if (loc.district && loc.district.toLowerCase() !== district.toLowerCase()) {
        handleDistrictSelect(loc.district);
        if (loc.thana) setThana(loc.thana);
      }
      if (loc.postalCode && !postalCode) setPostalCode(loc.postalCode);
    }
  };

  const handleScan = async (code: string) => {
    if (!code) return;
    if (units.some((u) => u.serialCode === code)) {
      toast.info(`Already scanned: ${code}`);
      return;
    }
    try {
      const row = await lookupSerial(code);
      if (!row) {
        toast.error(`Serial ${code} not found`);
        return;
      }
      if (row.status !== "available" && row.status !== "cancelled" && !(row.status === "returned" && !(row as any).is_defective)) {
        toast.error(`Serial is not available for sale (status: ${row.status})`);
        return;
      }
      const variantLabel = [row.product_variants?.size, row.product_variants?.color].filter(Boolean).join(" / ");
      const name = variantLabel ? `${row.products?.name ?? "Product"} (${variantLabel})` : row.products?.name ?? "Product";

      setUnits((prev) => [
        ...prev,
        {
          serialId: row.id,
          serialCode: row.serial_code,
          productId: row.product_id,
          variantId: row.variant_id,
          productName: name,
          unitPrice: Number(row.products?.price ?? 0),
        },
      ]);
    } catch (e: any) {
      toast.error("Lookup failed", { description: e.message });
    }
  };

  const grandTotal = Math.max(0, itemsSubtotal + (source === "offline" ? 0 : shippingFee) - discount);
  const removeUnit = (serialId: string) => setUnits((prev) => prev.filter((u) => u.serialId !== serialId));

  const confirm = useMutation({
    mutationFn: () =>
      createOfflineOrder({
        customerName: customerName.trim() || (source === "offline" ? "Walk-in Customer" : "Customer"),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        district: source !== "offline" ? district : undefined,
        thana: source !== "offline" ? thana : undefined,
        postalCode: postalCode.trim() || undefined,
        source,
        notes: notes.trim() || undefined,
        serialIds: units.map((u) => u.serialId),
        shippingFee: source === "offline" ? 0 : shippingFee,
        isDeliveryPrepaid: source !== "offline" && isPrepaidDelivery,
        deliveryPrepaidAmount: isPrepaidDelivery ? shippingFee : 0,
        paymentMethod:
          source === "offline"
            ? paymentMethod
            : isCod
            ? "cod"
            : paymentMethod === "cash" || paymentMethod === "cod"
            ? "mfs"
            : paymentMethod,
        discount,
        pushToCourier: source !== "offline" && pushToCourier,
        courierProvider,
      }),
    onSuccess: (r) => {
      setResult(r);
      setStep("done");
      toast.success(units.length === 0 ? "Order created — no items yet" : "Order confirmed", {
        description: `${r.order.order_number}${r.courierResult?.consignment_id ? ` · Courier ID: ${r.courierResult.consignment_id}` : ""}`,
      });
    },
    onError: (e: any) => toast.error("Could not confirm order", { description: e.message }),
  });

  const { brand, invoiceSettings, posSettings, shippingStickerPreset } = useMasterPanelDesigns();

  const printInvoice = () => {
    if (!result) return;
    printInvoicePdf(result.order, result.items, brand, invoiceSettings);
  };

  const printPosSlip = () => {
    if (!result) return;
    printThermalSlip(result.order, result.items, brand, posSettings);
  };

  const printShippingLabel = () => {
    if (!result) return;
    printShippingSticker(result.order, brand, shippingStickerPreset);
  };

  const emailInvoice = useMutation({
    mutationFn: () => generateInvoice(result!.order.id, true, emailOverride.trim() || undefined),
    onSuccess: (r) => {
      if (r.emailed) toast.success("Invoice emailed");
      else toast.error("Could not send email", { description: r.emailError });
    },
    onError: (e: any) => toast.error("Could not send email", { description: e.message }),
  });

  const resetAll = () => {
    setStep("form");
    setCustomerName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setDistrict("Dhaka");
    setThana("Dhanmondi");
    setPostalCode("");
    setSource("offline");
    setNotes("");
    setShippingFee(0);
    setDiscount(0);
    setIsCod(true);
    setIsPrepaidDelivery(false);
    setIsDeliveryFeeManual(false);
    setChatPasteText("");
    setParsedChatInfo(null);
    setUnits([]);
    setResult(null);
    setEmailOverride("");
    setScannerActive(false);
  };

  const canStartOrder = (customerName.trim().length > 0 || source === "offline") && (phone.trim() || email.trim() || source === "offline");
  const selectedSource = SOURCE_OPTIONS.find((s) => s.value === source)!;

  if (scannerActive) {
    return (
      <BarcodeScanner
        active
        onToggle={() => setScannerActive(false)}
        onScan={handleScan}
        defaultMode="qr"
        overlayContent={
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono">{units.length} item(s) scanned</span>
            <Button size="sm" onClick={() => setScannerActive(false)} className="rounded-xl h-8 text-xs font-bold">
              Done Scanning
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <div className="w-full space-y-4 px-1 sm:px-3 py-2 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" />
            <span>Direct POS &amp; Offline Orders</span>
          </h1>
          <p className="text-xs text-muted-foreground">Counter sales, Facebook, WhatsApp &amp; TikTok order entry</p>
        </div>
        {step !== "done" && (
          <Button variant="outline" size="sm" onClick={resetAll} className="rounded-xl h-8 text-xs gap-1.5 cursor-pointer">
            <RotateCcw className="w-3.5 h-3.5" /> Clear
          </Button>
        )}
      </div>

      <StepPills step={step} />

      {/* Step 1: Customer Info & Order Settings */}
      {step === "form" && (
        <div className="space-y-4">
          {/* Sales Channel Selector */}
          <section className="rounded-3xl border border-border/70 bg-card p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between px-1">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Order Channel Origin</Label>
              <span className="text-xs font-bold text-primary flex items-center gap-1">
                Active: <b className="text-foreground">{selectedSource.short}</b>
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 w-full">
              {SOURCE_OPTIONS.map((o) => {
                const Icon = o.icon;
                const active = source === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => handleSourceChange(o.value)}
                    className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-2xl py-2 px-1 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer truncate ${
                      active
                        ? "bg-primary text-primary-foreground shadow-xs font-bold"
                        : "bg-muted/40 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/70 active:scale-95"
                    }`}
                    title={o.label}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{o.short}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Smart Chat Auto-Extractor (Hidden on Walk-in Store, shown for Facebook/WhatsApp/TikTok/etc.) */}
          {source !== "offline" && (
            <section className="rounded-3xl border border-border/70 bg-card/50 p-4 sm:p-5 space-y-3 shadow-xs animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-muted flex items-center justify-center text-foreground">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                      Customer Chat Auto-Extractor
                      <Badge variant="outline" className="text-[10px] bg-muted/60 text-foreground border-border/70 font-mono">
                        SMART
                      </Badge>
                    </h3>
                    <p className="text-[11px] text-muted-foreground">Paste message from WhatsApp, Messenger, or TikTok to extract details</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsChatBoxOpen((o) => !o)}
                  className="text-xs h-7 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {isChatBoxOpen ? "Collapse" : "Open Box"}
                </Button>
              </div>

              {isChatBoxOpen && (
                <div className="pt-2 space-y-2.5 animate-in fade-in-50 duration-150">
                  <Textarea
                    value={chatPasteText}
                    onChange={(e) => handleChatTextChange(e.target.value)}
                    placeholder="Paste chat message here...&#10;e.g. 'নাম: মো: রহিম, ফোন: 01712345678, ঠিকানা: বাড়ি ১২, রোড ৫, উত্তরা, ঢাকা'"
                    rows={2}
                    className="rounded-xl text-xs sm:text-sm bg-background border-border/70 focus:border-zinc-500 resize-none font-mono"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {parsedChatInfo?.name && <Badge variant="secondary" className="text-[10px]">👤 {parsedChatInfo.name}</Badge>}
                      {parsedChatInfo?.phone && <Badge variant="secondary" className="text-[10px] font-mono">📱 {parsedChatInfo.phone}</Badge>}
                      {parsedChatInfo?.district && (
                        <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary">
                          📍 {parsedChatInfo.district} → {parsedChatInfo.thana}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {chatPasteText.trim() && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setChatPasteText("");
                            setParsedChatInfo(null);
                          }}
                          className="text-xs h-8 text-muted-foreground cursor-pointer"
                        >
                          Clear
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => applyParsedChatInfo()}
                        disabled={!chatPasteText.trim()}
                        className="text-xs h-8 gap-1.5 rounded-xl bg-primary text-primary-foreground font-semibold cursor-pointer"
                      >
                        <ClipboardPaste className="w-3.5 h-3.5" /> Auto-Fill Form
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Customer & Delivery Details */}
          <section className="rounded-3xl border border-border/60 bg-card p-4 sm:p-5 space-y-4 shadow-sm">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">
                Customer Name {source !== "offline" && <span className="text-red-500">*</span>}
              </Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={source === "offline" ? "Walk-in Customer (Optional)" : "e.g. Rahim Uddin"}
                className="h-11 rounded-xl text-[15px]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Mobile Phone Number</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  inputMode="tel"
                  className="h-11 rounded-xl text-[15px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Email Address (Optional)</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@email.com"
                  inputMode="email"
                  className="h-11 rounded-xl text-[15px]"
                />
              </div>
            </div>

            {/* Courier Address Fields (Required for Facebook/WhatsApp/TikTok Delivery) */}
            {source !== "offline" ? (
              <div className="space-y-3 pt-2 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-primary" /> Courier Delivery Location
                  </Label>
                  <span className="text-[10px] text-primary font-semibold">Steadfast &amp; Pathao APIs</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground font-medium">District / City *</Label>
                    <SearchableSelect
                      value={district}
                      onChange={handleDistrictSelect}
                      options={BD_COURIER_LOCATIONS.map((l) => l.district)}
                      placeholder="Select District"
                      searchPlaceholder="Search 64 districts..."
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground font-medium">Thana / Zone / Area *</Label>
                    <SearchableSelect
                      value={thana}
                      onChange={setThana}
                      options={availableThanas}
                      placeholder="Select Thana"
                      searchPlaceholder="Search thana / area..."
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground font-medium">Detailed Street Address / Landmark *</Label>
                  <Textarea
                    value={address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    placeholder="House number, Road, Block, Floor, Flat, Landmark..."
                    rows={2}
                    className="rounded-xl text-[15px] resize-none"
                  />
                </div>

                {/* Courier Provider & Auto-Push Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground font-medium">Delivery Charge (৳)</Label>
                      <span className="text-[10px] text-primary font-semibold">Tariff: ৳{courierRateResult.effectiveDeliveryFee}</span>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      value={shippingFee}
                      onChange={(e) => {
                        setIsDeliveryFeeManual(true);
                        setShippingFee(Math.max(0, Number(e.target.value) || 0));
                      }}
                      className="h-11 rounded-xl text-[15px] font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-medium">Courier Partner</Label>
                    <Select value={courierProvider} onValueChange={(val: any) => setCourierProvider(val)}>
                      <SelectTrigger className="w-full h-11 rounded-2xl border border-border/80 bg-card text-foreground text-sm font-bold shadow-2xs hover:border-zinc-500">
                        <SelectValue placeholder="Select Courier Partner" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border border-border/80 bg-[#18181b] text-foreground p-1.5 shadow-2xl backdrop-blur-xl">
                        <SelectItem value="steadfast" className="rounded-xl py-2.5 px-3 text-xs font-semibold cursor-pointer focus:bg-zinc-800 focus:text-white">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-emerald-400" />
                            <span>Steadfast Courier (Default)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="pathao" className="rounded-xl py-2.5 px-3 text-xs font-semibold cursor-pointer focus:bg-zinc-800 focus:text-white">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-red-400" />
                            <span>Pathao Logistics</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2.5 p-3.5 rounded-2xl border border-border/70 bg-card/60">
                  <div
                    className="flex items-center gap-2.5 cursor-pointer select-none"
                    onClick={() => setPushToCourier(!pushToCourier)}
                  >
                    <Checkbox
                      checked={pushToCourier}
                      onCheckedChange={(val) => setPushToCourier(!!val)}
                    />
                    <span className="text-xs font-semibold text-foreground">
                      Push to {courierProvider === "steadfast" ? "Steadfast" : "Pathao"} Courier automatically
                    </span>
                  </div>

                  <div className="pt-2.5 border-t border-border/40 space-y-2">
                    <div
                      className="flex items-center gap-2.5 cursor-pointer select-none"
                      onClick={() => {
                        const next = !isCod;
                        setIsCod(next);
                        if (!next && (paymentMethod === "cash" || paymentMethod === "cod")) {
                          setPaymentMethod("mfs");
                        }
                      }}
                    >
                      <Checkbox
                        checked={isCod}
                        onCheckedChange={(val) => {
                          const next = !!val;
                          setIsCod(next);
                          if (!next && (paymentMethod === "cash" || paymentMethod === "cod")) {
                            setPaymentMethod("mfs");
                          }
                        }}
                      />
                      <span className="text-xs font-bold text-foreground">Cash on Delivery (COD)</span>
                    </div>

                    {isCod && (
                      <div className="pl-7 pt-0.5 animate-in fade-in duration-150">
                        <div
                          className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-xl bg-card/60 border border-border/60 hover:bg-card transition-colors"
                          onClick={() => setIsPrepaidDelivery(!isPrepaidDelivery)}
                        >
                          <Checkbox
                            checked={isPrepaidDelivery}
                            onCheckedChange={(val) => setIsPrepaidDelivery(!!val)}
                          />
                          <span className="text-xs font-medium text-foreground">
                            Prepaid Delivery Fee (Deduct from COD)
                          </span>
                        </div>
                      </div>
                    )}

                    {!isCod && (
                      <div className="pl-1 pt-1.5 space-y-1.5 animate-in fade-in duration-150">
                        <Label className="text-[11px] text-muted-foreground font-medium">Prepaid Payment Method</Label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { id: "mfs", label: "MFS (bKash/Nagad)" },
                            { id: "card", label: "Card" },
                            { id: "bank", label: "Bank" },
                          ].map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setPaymentMethod(m.id)}
                              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                paymentMethod === m.id
                                  ? "bg-primary text-primary-foreground shadow-xs"
                                  : "bg-card border border-border/70 text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs text-muted-foreground font-medium">Payment Method</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: "cash", label: "Cash" },
                    { id: "mfs", label: "MFS" },
                    { id: "card", label: "Card" },
                    { id: "bank", label: "Bank" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                        paymentMethod === m.id
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Optional Notes */}
          <section className="rounded-3xl border border-border/60 bg-card p-4 sm:p-5 space-y-2 shadow-sm">
            <Label className="text-xs text-muted-foreground">Order Notes / Instructions (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Call before delivery, gift wrap, counter note..."
              rows={2}
              className="rounded-xl text-sm resize-none"
            />
          </section>

          <BottomBar>
            <Button disabled={!canStartOrder} onClick={() => setStep("scan")} className="w-full h-12 rounded-2xl text-[15px] font-bold cursor-pointer">
              Continue to Product Scanning <ChevronRight className="w-4 h-4 ml-1.5" />
            </Button>
          </BottomBar>
        </div>
      )}

      {/* Step 2: Barcode / QR Scanning */}
      {step === "scan" && (
        <div className="space-y-4">
          <ScannerLaunchCard onOpen={() => setScannerActive(true)} />

          {units.length > 0 && (
            <div className="rounded-3xl border border-border/60 bg-card divide-y divide-border/60 overflow-hidden shadow-xs">
              {grouped.map((g) => (
                <div key={g.productName} className="flex items-center justify-between px-4 py-3.5">
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-semibold truncate">{g.productName}</p>
                    <p className="text-xs text-muted-foreground font-mono">৳{g.unitPrice.toLocaleString()} each</p>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs px-2.5 py-1 font-bold">
                    ×{g.serialIds.length}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground font-medium">{selectedSource.label}</span>
            <span className="text-sm font-bold text-primary">
              {units.length} scanned · Subtotal: ৳{itemsSubtotal.toLocaleString()}
            </span>
          </div>

          <BottomBar>
            <div className="flex w-full items-center gap-2">
              <Button variant="outline" onClick={() => setStep("form")} className="h-12 rounded-2xl px-4 shrink-0 cursor-pointer">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => confirm.mutate()}
                disabled={confirm.isPending}
                className="h-12 rounded-2xl text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Skip Items
              </Button>
              <Button
                disabled={units.length === 0}
                onClick={() => setStep("review")}
                className="flex-1 h-12 rounded-2xl text-[15px] font-bold cursor-pointer shadow-md"
              >
                Review Order ({units.length}) <ChevronRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </BottomBar>
        </div>
      )}

      {/* Step 3: Review & Summary */}
      {step === "review" && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-border/60 bg-card p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recipient</span>
              <Badge variant="outline" className="text-xs font-bold text-primary">{selectedSource.short}</Badge>
            </div>
            <div className="text-sm space-y-1">
              <p className="font-bold">{customerName || "Walk-in Customer"}</p>
              {phone && <p className="text-xs font-mono text-muted-foreground">📱 {phone}</p>}
              {source !== "offline" && address && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                  <Compass className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{address}, {thana}, {district}</span>
                </p>
              )}
            </div>
          </div>

          {/* Scanned Items List */}
          <div className="rounded-3xl border border-border/60 bg-card divide-y divide-border/60 overflow-hidden shadow-xs">
            {units.map((u) => (
              <div key={u.serialId} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0 pr-2">
                  <p className="text-sm font-semibold truncate">{u.productName}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{u.serialCode}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-mono font-bold">৳{u.unitPrice.toLocaleString()}</span>
                  <button
                    type="button"
                    onClick={() => removeUnit(u.serialId)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Totals */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2 text-sm shadow-xs">
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>Subtotal ({units.length} items)</span>
              <span className="font-mono">৳{itemsSubtotal.toLocaleString()}</span>
            </div>
            {source !== "offline" && (
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Delivery Charge ({isPrepaidDelivery ? "Prepaid" : "COD"})</span>
                <span className="font-mono">৳{shippingFee.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold pt-2 border-t border-border/50 text-foreground">
              <span>Total Payable</span>
              <span className="text-primary font-mono text-lg">৳{grandTotal.toLocaleString()}</span>
            </div>
          </div>

          <BottomBar>
            <div className="flex w-full items-center gap-2">
              <Button variant="outline" onClick={() => setStep("scan")} className="h-12 rounded-2xl px-4 shrink-0 cursor-pointer">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => confirm.mutate()}
                disabled={confirm.isPending}
                className="flex-1 h-12 rounded-2xl text-[15px] font-bold cursor-pointer shadow-md bg-primary text-primary-foreground"
              >
                {confirm.isPending ? "Creating Order..." : `Confirm Order · ৳${grandTotal.toLocaleString()}`}
              </Button>
            </div>
          </BottomBar>
        </div>
      )}

      {/* Step 4: Done / Receipt Actions */}
      {step === "done" && result && (
        <div className="space-y-4 animate-in zoom-in-95 duration-200">
          <section className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-2 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
              <Check className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold">Order Created & Confirmed</h2>
            <p className="text-xs font-mono text-muted-foreground font-bold tracking-wider">{result.order.order_number}</p>
            {result.order.tracking_number && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold mt-1">
                <Truck className="w-3.5 h-3.5" /> Tracking: {result.order.tracking_number}
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <Button onClick={printInvoice} className="h-11 rounded-2xl gap-1.5 font-bold cursor-pointer">
              <Printer className="w-4 h-4" /> A4 Invoice
            </Button>
            <Button onClick={printPosSlip} variant="outline" className="h-11 rounded-2xl gap-1.5 font-bold cursor-pointer">
              <Receipt className="w-4 h-4" /> 80mm POS Slip
            </Button>
            <Button onClick={printShippingLabel} variant="outline" className="h-11 rounded-2xl gap-1.5 font-bold cursor-pointer">
              <Tag className="w-4 h-4" /> Shipping Sticker
            </Button>
          </div>

          {source !== "offline" && (
            <section className="rounded-3xl border border-border/60 bg-card p-4 space-y-2.5">
              <Label className="text-xs text-muted-foreground">Email invoice to customer</Label>
              <div className="flex gap-2">
                <Input
                  value={emailOverride}
                  onChange={(e) => setEmailOverride(e.target.value)}
                  placeholder={result.order.guest_email || "customer@email.com"}
                  className="h-11 rounded-xl"
                />
                <Button
                  onClick={() => emailInvoice.mutate()}
                  disabled={emailInvoice.isPending}
                  variant="outline"
                  className="h-11 rounded-xl shrink-0 font-bold cursor-pointer"
                >
                  <Mail className="w-4 h-4 mr-1.5" /> Send
                </Button>
              </div>
            </section>
          )}

          <BottomBar>
            <Button onClick={resetAll} className="w-full h-12 rounded-2xl text-[15px] font-bold cursor-pointer bg-primary text-primary-foreground">
              Create Another Order / Scan Next
            </Button>
          </BottomBar>
        </div>
      )}
    </div>
  );
}
