import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@ui/components/ui/button";
import { Input } from "@ui/components/ui/input";
import { Label } from "@ui/components/ui/label";
import { Textarea } from "@ui/components/ui/textarea";
import { Badge } from "@ui/components/ui/badge";
import { BarcodeScanner, ScannerLaunchCard } from "@/components/BarcodeScanner";
import { lookupSerial } from "@/lib/serials";
import { createOfflineOrder, type OfflineSource } from "@/lib/offline-orders";
import { generateInvoice, printInvoiceHtml, printThermalSlipHtml } from "@/lib/invoice";
import { supabase } from "@/lib/supabase";
import {
  ScanLine,
  Trash2,
  ArrowLeft,
  ChevronRight,
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
} from "lucide-react";

import {
  extractSerialCode,
  parseChatForCustomerInfo,
  detectLocationFromAddress,
  calculateCourierRate,
  type ParsedCustomerInfo,
} from "@orizino/shared";

const SOURCE_OPTIONS: { value: OfflineSource; label: string; short: string; icon: any }[] = [
  { value: "offline", label: "Offline (walk-in / counter)", short: "Counter", icon: Store },
  { value: "page", label: "Facebook Page", short: "Facebook", icon: Share2 },
  { value: "whatsapp", label: "WhatsApp", short: "WhatsApp", icon: MessageCircle },
  { value: "tiktok", label: "TikTok Shop / Live", short: "TikTok", icon: Music2 },
  { value: "instagram", label: "Instagram Direct", short: "Instagram", icon: Camera },
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
const STEP_LABEL: Record<Step, string> = { form: "Customer", scan: "Scan Items", review: "Review", done: "Invoice" };
const STEPS: Step[] = ["form", "scan", "review", "done"];

function StepPills({ step }: { step: Step }) {
  const idx = STEPS.indexOf(step);
  return (
    <div className="flex items-center gap-1.5 rounded-2xl bg-secondary/60 border border-border/70 p-1 overflow-x-auto no-scrollbar shadow-2xs">
      {STEPS.map((s, i) => (
        <div
          key={s}
          className={`flex-1 min-w-[72px] text-center text-xs font-bold py-2 rounded-xl transition-all duration-200 ${
            i === idx
              ? "bg-primary text-primary-foreground shadow-sm"
              : i < idx
              ? "text-primary bg-primary/10 font-semibold"
              : "text-muted-foreground"
          }`}
        >
          {STEP_LABEL[s]}
        </div>
      ))}
    </div>
  );
}

function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="sticky bottom-0 -mx-3 sm:mx-0 mt-4 flex items-center gap-2 border-t border-border/70 bg-card/90 backdrop-blur-xl px-4 py-3 shadow-xl z-30 rounded-t-3xl sm:rounded-2xl"
    >
      {children}
    </div>
  );
}

export function OfflineOrders() {
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

  // Chat Auto-Extractor State
  const [chatPasteText, setChatPasteText] = useState("");
  const [isChatBoxOpen, setIsChatBoxOpen] = useState(true);
  const [parsedChatInfo, setParsedChatInfo] = useState<ParsedCustomerInfo | null>(null);

  // Scanning & Order Items
  const [scannerActive, setScannerActive] = useState(false);
  const [units, setUnits] = useState<ScannedUnit[]>([]);

  // Result / Invoice State
  const [result, setResult] = useState<{ order: any; items: any[] } | null>(null);
  const [emailOverride, setEmailOverride] = useState("");

  // Query site settings for dynamic courier tariffs
  const { data: shippingSettings } = useQuery({
    queryKey: ["orderops-shipping-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", [
          "shipping_fee",
          "shipping_fee_suburbs",
          "shipping_fee_outside_sadar",
          "shipping_fee_outside",
          "shipping_fee_inter_district",
          "shipping_fee_same_city_osd",
          "shipping_fee_intra_suburbs",
          "shipping_fee_sameday",
          "shipping_extra_kg_fee",
          "free_shipping_threshold",
          "free_shipping_enabled",
          "delivery_partners_config",
        ]);
      const map: Record<string, any> = {};
      data?.forEach((s: any) => {
        const val = s.value;
        map[s.key] = typeof val === "object" && val !== null ? (val as any).value ?? val : val;
      });
      return map;
    },
    staleTime: 60 * 1000,
  });

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

  // Real-time location auto-detection from address string
  const detectedLocation = useMemo(() => {
    return detectLocationFromAddress(address);
  }, [address]);

  const effectiveDistrict = district || detectedLocation.district || "Dhaka";
  const effectiveThana = thana || detectedLocation.thana || "Dhanmondi";

  // Dynamic courier tariff calculation
  const courierRateResult = useMemo(() => {
    const defaultPartner = shippingSettings?.delivery_partners_config?.default_partner || "steadfast";
    return calculateCourierRate({
      originDistrict: "Dhaka",
      district: effectiveDistrict,
      thana: effectiveThana,
      defaultPartner,
      itemSubtotal: itemsSubtotal,
      insideDhakaRate: Number(shippingSettings?.shipping_fee ?? 70),
      sameCityOsdRate: Number(shippingSettings?.shipping_fee_same_city_osd ?? 60),
      intraSuburbsRate: Number(shippingSettings?.shipping_fee_intra_suburbs ?? 60),
      suburbsRate: Number(shippingSettings?.shipping_fee_suburbs ?? 105),
      outsideDhakaSadarRate: Number(shippingSettings?.shipping_fee_outside_sadar ?? 115),
      outsideDhakaRate: Number(shippingSettings?.shipping_fee_outside ?? 130),
      interDistrictRate: Number(shippingSettings?.shipping_fee_inter_district ?? 135),
      sameDayRate: Number(shippingSettings?.shipping_fee_sameday ?? 105),
      extraKgFee: Number(shippingSettings?.shipping_extra_kg_fee ?? 20),
      freeShippingThreshold: Number(shippingSettings?.free_shipping_threshold ?? 2500),
      freeShippingEnabled: shippingSettings?.free_shipping_enabled !== false,
      universalCodEnabled: true,
      codFee: 0,
      codPercentage: 0,
      isCod: false,
    });
  }, [effectiveDistrict, effectiveThana, itemsSubtotal, shippingSettings]);

  const handleAddressChange = (newAddr: string) => {
    setAddress(newAddr);
    const loc = detectLocationFromAddress(newAddr);
    if (loc.district) setDistrict(loc.district);
    if (loc.thana) setThana(loc.thana);
    if (loc.postalCode) setPostalCode(loc.postalCode);

    if (!isDeliveryFeeManual && source !== "offline") {
      const rate = calculateCourierRate({
        originDistrict: "Dhaka",
        district: loc.district,
        thana: loc.thana,
        itemSubtotal: itemsSubtotal,
        insideDhakaRate: Number(shippingSettings?.shipping_fee ?? 70),
        suburbsRate: Number(shippingSettings?.shipping_fee_suburbs ?? 105),
        outsideDhakaSadarRate: Number(shippingSettings?.shipping_fee_outside_sadar ?? 115),
        outsideDhakaRate: Number(shippingSettings?.shipping_fee_outside ?? 130),
        interDistrictRate: Number(shippingSettings?.shipping_fee_inter_district ?? 135),
        freeShippingThreshold: Number(shippingSettings?.free_shipping_threshold ?? 2500),
        freeShippingEnabled: shippingSettings?.free_shipping_enabled !== false,
      });
      setShippingFee(rate.effectiveDeliveryFee);
    }
  };

  const handleSourceChange = (newSource: OfflineSource) => {
    setSource(newSource);
    if (newSource === "offline") {
      setShippingFee(0);
      setIsPrepaidDelivery(false);
    } else {
      if (!isDeliveryFeeManual) {
        setShippingFee(courierRateResult.effectiveDeliveryFee);
      }
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

  const applyParsedChatInfo = () => {
    const info = parsedChatInfo || parseChatForCustomerInfo(chatPasteText);
    if (!info) return;

    if (info.name) setCustomerName(info.name);
    if (info.phone) setPhone(info.phone);
    if (info.email) setEmail(info.email);
    if (info.fullAddress) {
      setAddress(info.fullAddress);
      const loc = detectLocationFromAddress(info.fullAddress);
      if (loc.district) setDistrict(loc.district);
      if (loc.thana) setThana(loc.thana);
      if (loc.postalCode) setPostalCode(loc.postalCode);

      if (!isDeliveryFeeManual && source !== "offline") {
        const rate = calculateCourierRate({
          originDistrict: "Dhaka",
          district: loc.district,
          thana: loc.thana,
          itemSubtotal: itemsSubtotal,
          insideDhakaRate: Number(shippingSettings?.shipping_fee ?? 70),
          suburbsRate: Number(shippingSettings?.shipping_fee_suburbs ?? 105),
          outsideDhakaSadarRate: Number(shippingSettings?.shipping_fee_outside_sadar ?? 115),
          outsideDhakaRate: Number(shippingSettings?.shipping_fee_outside ?? 130),
          interDistrictRate: Number(shippingSettings?.shipping_fee_inter_district ?? 135),
          freeShippingThreshold: Number(shippingSettings?.free_shipping_threshold ?? 2500),
          freeShippingEnabled: shippingSettings?.free_shipping_enabled !== false,
        });
        setShippingFee(rate.effectiveDeliveryFee);
      }
    }
    if (info.notes) setNotes((prev) => (prev ? `${prev} · ${info.notes}` : info.notes));
    if (info.detectedSource) setSource(info.detectedSource as OfflineSource);

    toast.success("Customer info auto-filled", {
      description: `${info.matchedFields.join(", ")} (${info.confidenceScore}% confidence)`,
    });
  };

  const handleScan = async (rawCode: string) => {
    const code = extractSerialCode(rawCode);
    if (!code) return;
    if (units.some((u) => u.serialCode === code)) {
      toast.info(`Already scanned: ${code}`);
      return;
    }
    try {
      const row = await lookupSerial(code);
      if (!row) {
        toast.error("Unknown serial", { description: code });
        return;
      }
      if (row.status !== "available") {
        toast.error(`Not available (${row.status})`, { description: code });
        return;
      }
      const variantLabel = [row.product_variants?.size, row.product_variants?.color].filter(Boolean).join(" / ");
      setUnits((prev) => [
        ...prev,
        {
          serialId: row.id,
          serialCode: row.serial_code,
          productId: row.product_id,
          variantId: row.variant_id ?? null,
          productName: variantLabel ? `${row.products?.name ?? "Product"} (${variantLabel})` : row.products?.name ?? "Product",
          unitPrice: Number(row.products?.price ?? 0),
        },
      ]);
    } catch (e: any) {
      toast.error("Lookup failed", { description: e.message });
    }
  };

  const grandTotal = itemsSubtotal + (source === "offline" ? 0 : shippingFee);
  const removeUnit = (serialId: string) => setUnits((prev) => prev.filter((u) => u.serialId !== serialId));

  const confirm = useMutation({
    mutationFn: () =>
      createOfflineOrder({
        customerName: customerName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        source,
        notes: notes.trim() || undefined,
        serialIds: units.map((u) => u.serialId),
        shippingFee: source === "offline" ? 0 : shippingFee,
        isDeliveryPrepaid: source !== "offline" && isPrepaidDelivery,
        deliveryPrepaidAmount: isPrepaidDelivery ? shippingFee : 0,
      }),
    onSuccess: (r) => {
      setResult(r);
      setStep("done");
      toast.success(units.length === 0 ? "Order created — no items yet" : "Order confirmed", { description: r.order.order_number });
    },
    onError: (e: any) => toast.error("Could not confirm order", { description: e.message }),
  });

  const printInvoice = async () => {
    if (!result) return;
    const r = await generateInvoice(result.order.id, false);
    printInvoiceHtml(r.invoice_html);
  };

  const printPosSlip = () => {
    if (!result) return;
    printThermalSlipHtml(result.order, result.items);
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
    setIsPrepaidDelivery(false);
    setIsDeliveryFeeManual(false);
    setChatPasteText("");
    setParsedChatInfo(null);
    setUnits([]);
    setResult(null);
    setEmailOverride("");
    setScannerActive(false);
  };

  const canStartOrder = customerName.trim().length > 0 && (phone.trim() || email.trim());
  const selectedSource = SOURCE_OPTIONS.find((s) => s.value === source)!;

  if (scannerActive) {
    return (
      <BarcodeScanner
        active
        onToggle={() => setScannerActive(false)}
        onScan={(code) => void handleScan(code)}
        overlayContent={
          <div className="space-y-1">
            <p className="text-white text-xs font-semibold mb-1">
              {units.length} unit{units.length === 1 ? "" : "s"} scanned
            </p>
            {grouped.map((g) => (
              <div key={g.productName} className="flex items-center justify-between text-white/90 text-xs">
                <span className="truncate">{g.productName}</span>
                <span className="font-mono">×{g.serialIds.length}</span>
              </div>
            ))}
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-4 pt-1 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] sm:text-2xl font-semibold tracking-tight">Offline Orders POS</h1>
          <p className="text-sm text-muted-foreground">Counter sales, Facebook, WhatsApp, TikTok or Instagram direct orders</p>
        </div>
        {step !== "form" && (
          <Button variant="outline" size="sm" onClick={resetAll} className="h-8 rounded-xl text-xs">
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> New Order
          </Button>
        )}
      </div>

      <StepPills step={step} />

      {/* Step 1: Customer Info & Smart Chat Parser */}
      {step === "form" && (
        <div className="space-y-4">
          {/* Smart Chat Auto-Extractor Card */}
          <section className="rounded-3xl border border-primary/30 bg-primary/5 p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                    Quick Chat / Message Auto-Extractor
                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 font-mono">
                      SMART NLP
                    </Badge>
                  </h3>
                  <p className="text-[11px] text-muted-foreground">Paste chat copied from WhatsApp, Messenger, or TikTok</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsChatBoxOpen((o) => !o)}
                className="text-xs h-7 text-primary"
              >
                {isChatBoxOpen ? "Collapse" : "Open"}
              </Button>
            </div>

            {isChatBoxOpen && (
              <div className="space-y-2.5 pt-1">
                <Textarea
                  value={chatPasteText}
                  onChange={(e) => handleChatTextChange(e.target.value)}
                  placeholder="Paste chat message here...&#10;e.g. 'নাম: মো: রহিম, ফোন: 01712345678, ঠিকানা: বাড়ি ১২, রোড ৫, উত্তরা, ঢাকা'"
                  rows={2}
                  className="rounded-xl text-xs sm:text-sm bg-background border-primary/30 focus:border-primary resize-none font-mono"
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
                        className="text-xs h-8 text-muted-foreground"
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

          {/* Customer Details */}
          <section className="rounded-3xl border border-border/60 bg-card p-4 sm:p-5 space-y-4 shadow-sm">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Customer full name *</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Rahim Uddin"
                className="h-11 rounded-xl text-[15px]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Mobile number</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  inputMode="tel"
                  className="h-11 rounded-xl text-[15px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Email address</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@email.com"
                  inputMode="email"
                  className="h-11 rounded-xl text-[15px]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Delivery / Billing Address</Label>
                {address.trim() && (
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                    📍 {detectedLocation.formattedLocation}
                  </Badge>
                )}
              </div>
              <Textarea
                value={address}
                onChange={(e) => handleAddressChange(e.target.value)}
                placeholder="House, Road, Area, Thana/PS, District"
                rows={2}
                className="rounded-xl text-[15px] resize-none"
              />
              {address.trim() && source !== "offline" && (
                <div className="p-2 rounded-xl bg-muted/40 border border-border/50 text-xs flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-primary" />
                    Zone: <strong>{effectiveDistrict}</strong> → <strong>{effectiveThana}</strong>
                  </span>
                  <span className="font-semibold text-primary">
                    Tariff: ৳{courierRateResult.effectiveDeliveryFee} ({courierRateResult.deliveryDays})
                  </span>
                </div>
              )}
            </div>

            {source !== "offline" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-primary" /> Delivery Charge (৳)
                    </Label>
                    <span className="text-[10px] text-muted-foreground">Auto-calculated</span>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    value={shippingFee}
                    onChange={(e) => {
                      setIsDeliveryFeeManual(true);
                      setShippingFee(Math.max(0, Number(e.target.value) || 0));
                    }}
                    className="h-11 rounded-xl text-[15px] font-mono"
                  />
                </div>
                <div className="flex items-center gap-2 p-3 rounded-xl border border-border/60 bg-muted/20 self-end h-11 cursor-pointer">
                  <input
                    type="checkbox"
                    id="prepaid-delivery-orderops"
                    checked={isPrepaidDelivery}
                    onChange={(e) => setIsPrepaidDelivery(e.target.checked)}
                    className="rounded border-border"
                  />
                  <Label htmlFor="prepaid-delivery-orderops" className="text-xs font-medium cursor-pointer">
                    Pre-paid Delivery Charge
                  </Label>
                </div>
              </div>
            )}
          </section>

          {/* Sales Channel */}
          <section className="rounded-3xl border border-border/60 bg-card p-4 sm:p-5 space-y-3 shadow-sm">
            <Label className="text-xs text-muted-foreground">Sales Channel / Origin</Label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {SOURCE_OPTIONS.map((o) => {
                const Icon = o.icon;
                const active = source === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => handleSourceChange(o.value)}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 px-1 text-center transition-all ${
                      active ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/60 text-muted-foreground active:scale-95"
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                    <span className="text-[11px] font-medium leading-none">{o.short}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Notes */}
          <section className="rounded-3xl border border-border/60 bg-card p-4 sm:p-5 space-y-2 shadow-sm">
            <Label className="text-xs text-muted-foreground">Internal Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Staff notes, delivery instructions..."
              rows={2}
              className="rounded-xl text-[15px] resize-none"
            />
          </section>

          <BottomBar>
            <Button disabled={!canStartOrder} onClick={() => setStep("scan")} className="w-full h-12 rounded-2xl text-[15px] font-medium">
              Continue to Item Scanning <ChevronRight className="w-4 h-4 ml-1.5" />
            </Button>
          </BottomBar>
        </div>
      )}

      {/* Step 2: Barcode Scanning */}
      {step === "scan" && (
        <div className="space-y-4">
          <ScannerLaunchCard onOpen={() => setScannerActive(true)} />

          {units.length > 0 && (
            <div className="rounded-3xl border border-border/60 bg-card divide-y divide-border/60 overflow-hidden">
              {grouped.map((g) => (
                <div key={g.productName} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm truncate">{g.productName}</span>
                  <span className="text-sm font-mono">×{g.serialIds.length}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between px-0.5">
            <span className="text-sm text-muted-foreground">{selectedSource.label}</span>
            <span className="text-sm font-medium">
              {units.length} scanned · Subtotal: ৳{itemsSubtotal.toLocaleString()}
            </span>
          </div>

          <BottomBar>
            <div className="flex w-full items-center gap-2">
              <Button variant="outline" onClick={() => setStep("form")} className="h-12 rounded-2xl px-4 shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => confirm.mutate()}
                disabled={confirm.isPending}
                className="h-12 rounded-2xl flex-1 text-muted-foreground"
              >
                <SkipForward className="w-4 h-4 mr-1.5" />
                Skip items &amp; create order shell
              </Button>
              <Button
                disabled={units.length === 0}
                onClick={() => setStep("review")}
                className="h-12 rounded-2xl px-6 font-medium"
              >
                Review ({units.length}) <ChevronRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </BottomBar>
        </div>
      )}

      {/* Step 3: Review */}
      {step === "review" && (
        <div className="space-y-4">
          <section className="rounded-3xl border border-border/60 bg-card p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Customer</p>
                <p className="text-base font-semibold">{customerName}</p>
                <p className="text-xs text-muted-foreground">{[phone, email].filter(Boolean).join(" · ")}</p>
              </div>
              <Badge variant="outline">{selectedSource.label}</Badge>
            </div>
            {address && <p className="text-xs text-muted-foreground pt-1 border-t border-border/50">{address}</p>}
          </section>

          <section className="rounded-3xl border border-border/60 bg-card divide-y divide-border/60 overflow-hidden">
            {units.map((u) => (
              <div key={u.serialId} className="flex items-center justify-between p-3.5">
                <div className="min-w-0 pr-2">
                  <p className="text-sm font-medium truncate">{u.productName}</p>
                  <p className="text-xs font-mono text-muted-foreground">#{u.serialCode}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-mono font-medium">৳{u.unitPrice.toLocaleString()}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeUnit(u.serialId)} className="h-8 w-8 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </section>

          <div className="rounded-2xl border border-border/60 bg-card p-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Items Subtotal</span>
              <span>৳{itemsSubtotal.toLocaleString()}</span>
            </div>
            {source !== "offline" && (
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery Charge ({isPrepaidDelivery ? "Prepaid" : "COD"})</span>
                <span>৳{shippingFee.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold pt-1 border-t border-border/50 text-foreground">
              <span>Total Payable</span>
              <span className="text-primary">৳{grandTotal.toLocaleString()}</span>
            </div>
          </div>

          <BottomBar>
            <div className="flex w-full items-center gap-2">
              <Button variant="outline" onClick={() => setStep("scan")} className="h-12 rounded-2xl px-4 shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => confirm.mutate()}
                disabled={confirm.isPending}
                className="flex-1 h-12 rounded-2xl text-[15px] font-medium"
              >
                {confirm.isPending ? "Creating Order..." : `Confirm Order · ৳${grandTotal.toLocaleString()}`}
              </Button>
            </div>
          </BottomBar>
        </div>
      )}

      {/* Step 4: Done / Receipt */}
      {step === "done" && result && (
        <div className="space-y-4">
          <section className="rounded-3xl border border-primary/40 bg-primary/5 p-6 text-center space-y-2 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold">Order Created Successfully</h2>
            <p className="text-xs font-mono text-muted-foreground">{result.order.order_number}</p>
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button onClick={printInvoice} className="h-12 rounded-2xl gap-2 font-medium">
              <Printer className="w-4 h-4" /> Print A4 Invoice
            </Button>
            <Button onClick={printPosSlip} variant="outline" className="h-12 rounded-2xl gap-2 font-medium">
              <Receipt className="w-4 h-4" /> Print 80mm POS Slip
            </Button>
          </div>

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
                className="h-11 rounded-xl shrink-0"
              >
                <Mail className="w-4 h-4 mr-1.5" /> Send
              </Button>
            </div>
          </section>

          <BottomBar>
            <Button onClick={resetAll} className="w-full h-12 rounded-2xl text-[15px] font-medium">
              Create Another Order
            </Button>
          </BottomBar>
        </div>
      )}
    </div>
  );
}
