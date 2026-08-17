import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/lib/app-toast";
import { supabase } from "@/integrations/supabase/client";
import { BarcodeScanner } from "@/components/admin/products/BarcodeScanner";
import { lookupSerial } from "@/lib/serials.functions";
import { createOfflineOrder } from "@/lib/offline-orders.functions";
import {
  extractSerialCode,
  parseChatForCustomerInfo,
  detectLocationFromAddress,
  calculateCourierRate,
  BD_COURIER_LOCATIONS,
  BD_ALL_DISTRICTS,
  getThanasForDistrict,
  type ParsedCustomerInfo,
} from "@orizino/shared";
import { emailOrderInvoice } from "@/lib/order-invoice-email.functions";
import { downloadInvoicePdf, printInvoicePdf, printThermalSlip, downloadStickerPdf, type PdfBrand } from "@/lib/invoice-pdf";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Store,
  Share2,
  MessageCircle,
  Music2,
  Camera,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Check,
  Printer,
  Download,
  Receipt,
  Tag,
  CheckCircle2,
  ChevronRight,
  Package,
  PackageCheck,
  Copy,
  ShoppingBag,
  FileText,
  SkipForward,
  RotateCcw,
  Barcode,
  QrCode,
  Pencil,
  Percent,
  DollarSign,
  Truck,
  SlidersHorizontal,
  X,
  Sparkles,
  ClipboardPaste,
  Compass,
} from "lucide-react";

type Source = "offline" | "page" | "whatsapp" | "tiktok" | "instagram";

const SOURCE_OPTIONS: { value: Source; label: string; short: string; icon: any }[] = [
  { value: "offline", label: "Store Counter / Walk-in", short: "Counter", icon: Store },
  { value: "page", label: "Facebook Page Order", short: "Facebook", icon: Share2 },
  { value: "whatsapp", label: "WhatsApp Direct", short: "WhatsApp", icon: MessageCircle },
  { value: "tiktok", label: "TikTok Shop / Live", short: "TikTok", icon: Music2 },
  { value: "instagram", label: "Instagram Direct", short: "Instagram", icon: Camera },
];

interface ScannedUnit {
  serialId: string;
  serialCode: string;
  productId: string;
  variantId: string | null;
  productName: string;
  mainPrice: number;
  unitPrice: number;
  discount: number;
  thumbnail?: string | null;
  sku?: string | null;
}

type Step = "form" | "scan" | "review" | "done";

const STEPS: { id: Step; label: string; stepNumber: string }[] = [
  { id: "form", label: "Customer & Source", stepNumber: "01" },
  { id: "scan", label: "Scan & Inventory", stepNumber: "02" },
  { id: "review", label: "Review Order", stepNumber: "03" },
  { id: "done", label: "Invoice & Receipt", stepNumber: "04" },
];

async function loadBrand(): Promise<PdfBrand> {
  const fallback: PdfBrand = { name: "Orizino", currency: "৳", prefix: "INV" };
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["brand_settings", "invoice_settings"]);
    const map: Record<string, any> = {};
    for (const r of data || []) map[(r as any).key] = (r as any).value || {};
    const b = map.brand_settings || {};
    const inv = map.invoice_settings || {};
    return {
      name: b.brand_name || b.site_name || "Orizino",
      addr: b.address || "",
      email: b.support_email || "",
      phone: b.phone || b.support_phone || "",
      currency: b.currency_symbol || "৳",
      prefix: inv.invoice_prefix || "INV",
      footer: inv.footer_note || "",
    };
  } catch {
    return fallback;
  }
}

/** Symmetrical Step Navigator without shadows */
function StepNavigator({ currentStep, onSelectStep, maxReachedIndex }: {
  currentStep: Step;
  onSelectStep: (s: Step) => void;
  maxReachedIndex: number;
}) {
  const currentIdx = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-1.5 sm:p-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
        {STEPS.map((s, idx) => {
          const isActive = s.id === currentStep;
          const isDone = idx < currentIdx;
          const isClickable = idx <= maxReachedIndex;

          return (
            <button
              key={s.id}
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onSelectStep(s.id)}
              className={`flex items-center gap-2 p-2 sm:p-2.5 rounded-xl transition-all text-left ${
                isActive
                  ? "bg-primary text-primary-foreground font-semibold"
                  : isDone
                  ? "bg-secondary/70 text-foreground hover:bg-secondary cursor-pointer"
                  : "bg-secondary/30 text-muted-foreground/70 opacity-60 cursor-not-allowed"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-mono shrink-0 ${
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground font-bold"
                    : isDone
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : s.stepNumber}
              </div>
              <div className="min-w-0 truncate">
                <p className="text-[11px] sm:text-xs leading-tight truncate">{s.label}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Sticky Mobile-Friendly Bottom Command Bar without shadows */
function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="sticky bottom-0 -mx-4 sm:mx-0 mt-4 border-t border-border/70 bg-background/90 backdrop-blur-xl px-4 py-3 sm:static sm:border-0 sm:bg-transparent sm:backdrop-blur-none sm:p-0 z-30"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
    >
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 max-w-full">
        {children}
      </div>
    </div>
  );
}

export default function AdminOfflineOrders() {
  const [step, setStep] = useState<Step>("form");
  const [maxReachedStepIndex, setMaxReachedStepIndex] = useState(0);

  // Step 1: Customer & Source State
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("Dhaka");
  const [thana, setThana] = useState("Dhanmondi");
  const [postalCode, setPostalCode] = useState("");
  const [source, setSource] = useState<Source>("offline");
  const [notes, setNotes] = useState("");
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [isPrepaidDelivery, setIsPrepaidDelivery] = useState<boolean>(false);
  const [isDeliveryFeeManual, setIsDeliveryFeeManual] = useState<boolean>(false);

  // Chat / Message Quick-Paste Parser State
  const [chatPasteText, setChatPasteText] = useState("");
  const [isChatBoxOpen, setIsChatBoxOpen] = useState(true);
  const [parsedChatInfo, setParsedChatInfo] = useState<ParsedCustomerInfo | null>(null);

  // Dynamic Logistics & Tariff Configuration Query
  const { data: shippingSettings } = useQuery({
    queryKey: ["site-shipping-settings"],
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
          "cod_fee",
          "cod_enabled",
          "delivery_partners_config",
        ]);
      const map: Record<string, any> = {};
      data?.forEach((s) => {
        const val = s.value;
        map[s.key] = typeof val === "object" && val !== null ? (val as any).value ?? val : val;
      });
      return map;
    },
    staleTime: 60 * 1000,
  });

  // Step 2: Scanning & Cart State
  const [scannerActive, setScannerActive] = useState(true);
  const [priceOverride, setPriceOverride] = useState<string>("");
  const [units, setUnits] = useState<ScannedUnit[]>([]);
  const [editingSerialId, setEditingSerialId] = useState<string | null>(null);
  const [editPriceInput, setEditPriceInput] = useState<string>("");
  const [editingGroupName, setEditingGroupName] = useState<string | null>(null);
  const [editGroupPriceInput, setEditGroupPriceInput] = useState<string>("");

  const originalSubtotal = useMemo(() => {
    return units.reduce((sum, u) => sum + (u.mainPrice || 0), 0);
  }, [units]);

  const totalSoldAmount = useMemo(() => {
    return units.reduce((sum, u) => sum + (u.unitPrice || 0), 0);
  }, [units]);

  const totalDiscount = useMemo(() => {
    return Math.max(0, originalSubtotal - totalSoldAmount);
  }, [originalSubtotal, totalSoldAmount]);

  const subtotal = totalSoldAmount;

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      {
        productName: string;
        mainPrice: number;
        unitPrice: number;
        discount: number;
        sku?: string | null;
        serialIds: string[];
        serialCodes: string[];
        hasVaryingPrices: boolean;
      }
    >();
    for (const u of units) {
      const key = `${u.productId}::${u.variantId ?? ""}`;
      if (!map.has(key)) {
        map.set(key, {
          productName: u.productName,
          mainPrice: u.mainPrice,
          unitPrice: u.unitPrice,
          discount: u.discount,
          sku: u.sku,
          serialIds: [u.serialId],
          serialCodes: [u.serialCode],
          hasVaryingPrices: false,
        });
      } else {
        const item = map.get(key)!;
        item.serialIds.push(u.serialId);
        item.serialCodes.push(u.serialCode);
        if (item.unitPrice !== u.unitPrice) {
          item.hasVaryingPrices = true;
        }
      }
    }
    return Array.from(map.values());
  }, [units]);

  // Real-time location auto-detection from address string
  const detectedLocation = useMemo(() => {
    return detectLocationFromAddress(address);
  }, [address]);

  // Synchronized active district & thana
  const effectiveDistrict = district || detectedLocation.district || "Dhaka";
  const effectiveThana = thana || detectedLocation.thana || "Dhanmondi";

  // Official Steadfast / Pathao dynamic courier rate calculation
  const courierRateResult = useMemo(() => {
    const defaultPartner = shippingSettings?.delivery_partners_config?.default_partner || "steadfast";
    return calculateCourierRate({
      originDistrict: "Dhaka",
      district: effectiveDistrict,
      thana: effectiveThana,
      defaultPartner,
      itemSubtotal: totalSoldAmount,
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
  }, [effectiveDistrict, effectiveThana, totalSoldAmount, shippingSettings]);

  // Auto-update shipping fee when address or source changes
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
        itemSubtotal: totalSoldAmount,
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

  const handleSourceChange = (newSource: Source) => {
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

  const applyParsedChatInfo = (parsedToApply?: ParsedCustomerInfo | null) => {
    const info = parsedToApply || parsedChatInfo || parseChatForCustomerInfo(chatPasteText);
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
          itemSubtotal: totalSoldAmount,
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
    if (info.detectedSource) setSource(info.detectedSource as Source);

    toast({
      title: "Customer Info Extracted",
      description: `Filled: ${info.matchedFields.join(", ")} (${info.confidenceScore}% confidence)`,
      type: "success",
    });
  };

  const lookupFn = useServerFn(lookupSerial);
  const createFn = useServerFn(createOfflineOrder);
  const emailFn = useServerFn(emailOrderInvoice);

  // Step 4: Output / Invoice State
  const [result, setResult] = useState<{ order: any; items: any[] } | null>(null);
  const [emailOverride, setEmailOverride] = useState("");
  const [copiedOrder, setCopiedOrder] = useState(false);

  const canStartOrder = customerName.trim().length > 0 && (phone.trim() || email.trim());

  const goToStep = (next: Step) => {
    const nextIdx = STEPS.findIndex((s) => s.id === next);
    setMaxReachedStepIndex((prev) => Math.max(prev, nextIdx));
    setStep(next);
  };

  const handleScan = async (rawCode: string) => {
    const code = extractSerialCode(rawCode);
    if (!code) return;
    if (units.some((u) => u.serialCode === code)) {
      toast({ title: "Already scanned", description: `Serial ${code} is already in the list.`, type: "info" });
      return;
    }

    try {
      const row: any = await lookupFn({ data: { code } });
      if (!row) {
        toast({ title: "Serial Not Found", description: `Code: ${code}`, type: "error" });
        return;
      }
      if (row.status !== "available") {
        toast({ title: `Item unavailable (${row.status})`, description: `Serial: ${code}`, type: "error" });
        return;
      }

      const variantLabel = [row.product_variants?.size, row.product_variants?.color].filter(Boolean).join(" / ");
      const basePrice = Number(row.product_variants?.price || row.products?.price || 0);

      const parsedOverride = priceOverride.trim() !== "" ? parseFloat(priceOverride) : NaN;
      const isOverrideActive = !isNaN(parsedOverride) && parsedOverride >= 0;
      const finalSoldPrice = isOverrideActive ? parsedOverride : basePrice;
      const discountAmount = Math.max(0, basePrice - finalSoldPrice);

      const newUnit: ScannedUnit = {
        serialId: row.id,
        serialCode: row.serial_code,
        productId: row.product_id,
        variantId: row.variant_id ?? null,
        productName: variantLabel
          ? `${row.products?.name ?? "Product"} (${variantLabel})`
          : row.products?.name ?? "Product",
        mainPrice: basePrice,
        unitPrice: finalSoldPrice,
        discount: discountAmount,
        thumbnail: row.products?.thumbnail ?? null,
        sku: row.products?.sku ?? null,
      };

      setUnits((prev) => [newUnit, ...prev]);
      toast({
        title: "Item Added",
        description: isOverrideActive
          ? `${newUnit.productName} (#${newUnit.serialCode}) • ৳${finalSoldPrice.toLocaleString()} (Saved: ৳${discountAmount.toLocaleString()})`
          : `${newUnit.productName} (#${newUnit.serialCode}) • ৳${finalSoldPrice.toLocaleString()}`,
        type: "success",
      });
    } catch (e: any) {
      toast({ title: "Lookup Failed", description: e.message, type: "error" });
    }
  };

  const updateUnitPrice = (serialId: string, newSoldPrice: number) => {
    setUnits((prev) =>
      prev.map((u) => {
        if (u.serialId !== serialId) return u;
        const validPrice = Math.max(0, isNaN(newSoldPrice) ? 0 : newSoldPrice);
        return {
          ...u,
          unitPrice: validPrice,
          discount: Math.max(0, u.mainPrice - validPrice),
        };
      })
    );
    setEditingSerialId(null);
    setEditPriceInput("");
  };

  const updateGroupPrice = (productName: string, newSoldPrice: number) => {
    setUnits((prev) =>
      prev.map((u) => {
        if (u.productName !== productName) return u;
        const validPrice = Math.max(0, isNaN(newSoldPrice) ? 0 : newSoldPrice);
        return {
          ...u,
          unitPrice: validPrice,
          discount: Math.max(0, u.mainPrice - validPrice),
        };
      })
    );
    setEditingGroupName(null);
    setEditGroupPriceInput("");
  };

  const removeUnit = (serialId: string) => {
    setUnits((prev) => prev.filter((u) => u.serialId !== serialId));
  };

  const clearAllUnits = () => {
    setUnits([]);
  };

  const confirmMutation = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          customerName: customerName.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          source,
          notes: notes.trim() || undefined,
          serialIds: units.map((u) => u.serialId),
          shippingFee: source === "offline" ? 0 : shippingFee,
          isDeliveryPrepaid: source === "offline" ? false : isPrepaidDelivery,
          deliveryPrepaidAmount: source !== "offline" && isPrepaidDelivery ? shippingFee : 0,
          items: units.map((u) => ({
            serialId: u.serialId,
            soldPrice: u.unitPrice,
            mainPrice: u.mainPrice,
            discount: u.discount,
          })),
        },
      }),
    onSuccess: (r: any) => {
      setResult(r);
      goToStep("done");
      toast({
        title: units.length === 0 ? "Empty Order Created" : "Order Confirmed & Serials Assigned",
        description: `Order ${r.order.order_number} • Total: ৳${Number(r.order.total || 0).toLocaleString()}`,
        type: "success",
      });
    },
    onError: (e: any) => {
      toast({ title: "Order Creation Failed", description: e.message, type: "error" });
    },
  });

  const printInvoice = async () => {
    if (!result) return;
    const brand = await loadBrand();
    printInvoicePdf(result.order, result.items, brand);
  };

  const exportPdf = async () => {
    if (!result) return;
    const brand = await loadBrand();
    downloadInvoicePdf(result.order, result.items, brand);
    toast({ title: "Invoice Exported", description: `Saved Invoice-${result.order.order_number}.pdf`, type: "success" });
  };

  const printPosSlip = async () => {
    if (!result) return;
    const brand = await loadBrand();
    printThermalSlip(result.order, result.items, brand);
  };

  const exportSticker = async () => {
    if (!result) return;
    const brand = await loadBrand();
    downloadStickerPdf(result.order, brand);
    toast({ title: "Shipping Label Exported", description: `Saved Shipping-Label-${result.order.order_number}.pdf`, type: "success" });
  };

  const emailInvoice = useMutation({
    mutationFn: () => emailFn({ data: { order_id: result!.order.id, to: emailOverride.trim() || undefined } }),
    onSuccess: (r: any) => {
      if (r.ok) toast.success("Invoice emailed successfully");
      else toast({ title: "Email dispatch failed", description: r.error, type: "error" });
    },
    onError: (e: any) => toast({ title: "Could not send email", description: e.message, type: "error" }),
  });

  const copyOrderNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedOrder(true);
    setTimeout(() => setCopiedOrder(false), 1500);
    toast({ title: "Copied", description: num, type: "success" });
  };

  const resetAll = () => {
    setStep("form");
    setMaxReachedStepIndex(0);
    setCustomerName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setSource("offline");
    setNotes("");
    setPriceOverride("");
    setUnits([]);
    setEditingSerialId(null);
    setEditPriceInput("");
    setEditingGroupName(null);
    setEditGroupPriceInput("");
    setResult(null);
    setEmailOverride("");
    setScannerActive(true);
    setShippingFee(0);
    setIsPrepaidDelivery(false);
    setIsDeliveryFeeManual(false);
  };

  const selectedSource = SOURCE_OPTIONS.find((s) => s.value === source)!;

  return (
    <div className="w-full space-y-4 pb-8 min-w-0">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" />
            Offline &amp; Direct Sales
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Process in-store counter checkouts, social media direct orders, and manual serial assignments.
          </p>
        </div>

        {step !== "form" && (
          <Button
            size="sm"
            variant="outline"
            onClick={resetAll}
            className="rounded-xl h-8 text-xs font-semibold cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Start New Order
          </Button>
        )}
      </div>

      {/* ── Step Navigator ── */}
      <StepNavigator
        currentStep={step}
        onSelectStep={(s) => setStep(s)}
        maxReachedIndex={maxReachedStepIndex}
      />

      {/* ─────────────────────────────────────────────────────────────
          STEP 1: CUSTOMER DETAILS & SALES CHANNEL
      ───────────────────────────────────────────────────────────── */}
      {step === "form" && (
        <div className="space-y-4 min-w-0">
          {/* Smart Chat / WhatsApp / Social Auto-Extractor Card */}
          <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card/70 to-secondary/30 backdrop-blur-md p-4 sm:p-5 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                    Quick Chat / Message Auto-Extractor
                    <Badge variant="outline" className="text-[10px] bg-primary/15 text-primary border-primary/30 font-mono">
                      SMART PARSER
                    </Badge>
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Paste any raw conversation from WhatsApp, Facebook Page, TikTok, Instagram or SMS.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsChatBoxOpen((o) => !o)}
                className="text-xs h-8 text-primary hover:bg-primary/10 rounded-xl"
              >
                {isChatBoxOpen ? "Collapse" : "Open Chat Box"}
              </Button>
            </div>

            {isChatBoxOpen && (
              <div className="space-y-3 pt-1">
                <Textarea
                  value={chatPasteText}
                  onChange={(e) => handleChatTextChange(e.target.value)}
                  placeholder="Paste WhatsApp, Messenger, TikTok, or Instagram chat here...&#10;e.g. 'নাম: মো: রহিম, মোবাইল: 01712345678, ঠিকানা: বাসা ১২, রোড ৫, সেক্টর ৩, উত্তরা, ঢাকা ১২৩০, নোট: বিকেলে ডেলিভারি করবেন'"
                  rows={3}
                  className="rounded-xl text-xs sm:text-sm bg-background/90 border-primary/30 focus:border-primary resize-none font-mono"
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {parsedChatInfo?.name && (
                      <Badge variant="secondary" className="text-[10px] gap-1 bg-secondary/80">
                        👤 {parsedChatInfo.name}
                      </Badge>
                    )}
                    {parsedChatInfo?.phone && (
                      <Badge variant="secondary" className="text-[10px] gap-1 bg-secondary/80 font-mono">
                        📱 {parsedChatInfo.phone}
                      </Badge>
                    )}
                    {parsedChatInfo?.email && (
                      <Badge variant="secondary" className="text-[10px] gap-1 bg-secondary/80">
                        📧 {parsedChatInfo.email}
                      </Badge>
                    )}
                    {parsedChatInfo?.district && (
                      <Badge variant="secondary" className="text-[10px] gap-1 bg-primary/15 text-primary border-primary/20">
                        📍 {parsedChatInfo.district} → {parsedChatInfo.thana}
                      </Badge>
                    )}
                    {parsedChatInfo && (
                      <span className="text-[10px] text-muted-foreground ml-1">
                        ({parsedChatInfo.confidenceScore}% confidence)
                      </span>
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
                      className="text-xs h-8 gap-1.5 rounded-xl bg-primary text-primary-foreground font-semibold cursor-pointer shadow-xs"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" /> Auto-Fill Customer Form
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            {/* Customer Information Card */}
            <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-4 sm:p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 border-b border-border/50 pb-2.5">
                  <User className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Customer Information
                  </h3>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">
                    Customer Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Rahim Uddin"
                    className="h-10 rounded-xl text-xs sm:text-sm bg-secondary/30 border-border/60"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3 text-muted-foreground" /> Mobile Number
                    </Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      inputMode="tel"
                      className="h-10 rounded-xl text-xs sm:text-sm bg-secondary/30 border-border/60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3 text-muted-foreground" /> Email Address
                    </Label>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="customer@email.com"
                      inputMode="email"
                      className="h-10 rounded-xl text-xs sm:text-sm bg-secondary/30 border-border/60"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-muted-foreground" /> Delivery / Billing Address
                    </Label>
                    {address.trim() && (
                      <Badge variant="outline" className="text-[10px] font-medium border-primary/30 text-primary bg-primary/5">
                        📍 {detectedLocation.formattedLocation}
                      </Badge>
                    )}
                  </div>
                  <Textarea
                    value={address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    placeholder="House, Road, Area, Thana/Police Station, District, Zip Code"
                    rows={2}
                    className="rounded-xl text-xs sm:text-sm resize-none bg-secondary/30 border-border/60"
                  />
                  {address.trim() && source !== "offline" && (
                    <div className="p-2.5 rounded-xl bg-secondary/30 border border-border/50 text-xs flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Compass className="w-3.5 h-3.5 text-primary" />
                        <span className="text-muted-foreground">
                          Detected: <strong className="text-foreground">{effectiveDistrict}</strong> → <strong className="text-foreground">{effectiveThana}</strong>
                        </span>
                      </div>
                      <div className="text-right font-medium text-foreground">
                        Official Tariff: <strong className="text-primary font-bold">৳{courierRateResult.effectiveDeliveryFee}</strong>
                        <span className="text-[10px] text-muted-foreground ml-1">({courierRateResult.deliveryDays})</span>
                      </div>
                    </div>
                  )}
                </div>

                {source !== "offline" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-foreground flex items-center gap-1">
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
                        className="h-10 rounded-xl text-xs sm:text-sm font-mono bg-secondary/30 border-border/60"
                      />
                    </div>

                    <div className="space-y-1.5 flex flex-col justify-end">
                      <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/60 bg-secondary/20 h-10 cursor-pointer">
                        <Checkbox
                          id="prepaid-delivery"
                          checked={isPrepaidDelivery}
                          onCheckedChange={(v) => setIsPrepaidDelivery(!!v)}
                        />
                        <Label htmlFor="prepaid-delivery" className="text-xs font-medium text-foreground cursor-pointer select-none">
                          Pre-paid Delivery Charge
                        </Label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground pt-2">
                * Note: Provide customer name and either a mobile number or email for invoice tracking.
              </p>
            </div>

            {/* Sales Channel & Notes Card */}
            <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-4 sm:p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 border-b border-border/50 pb-2.5">
                  <Store className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Sales Channel &amp; Origin
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SOURCE_OPTIONS.map((o) => {
                    const Icon = o.icon;
                    const isSelected = source === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => handleSourceChange(o.value)}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-primary/10 border-primary text-foreground font-semibold"
                            : "bg-secondary/30 border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs leading-tight truncate">{o.label}</p>
                          <span className="text-[10px] text-muted-foreground block mt-0.5">Channel: {o.short}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-medium text-foreground flex items-center gap-1">
                    <FileText className="w-3 h-3 text-muted-foreground" /> Internal Staff Notes (Optional)
                  </Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Staff notes, special delivery instructions, payment method info…"
                    rows={2}
                    className="rounded-xl text-xs sm:text-sm resize-none bg-secondary/30 border-border/60"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Badge variant="outline" className="text-[11px] font-mono">
                  Channel Selected: {selectedSource.label}
                </Badge>
              </div>
            </div>
          </div>

          <BottomBar>
            <div className="text-xs text-muted-foreground">
              {canStartOrder ? "Ready to begin barcode/QR scanning." : "Fill customer name and contact to continue."}
            </div>

            <Button
              disabled={!canStartOrder}
              onClick={() => goToStep("scan")}
              className="w-full sm:w-auto h-11 px-6 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Proceed to Scan Items <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </BottomBar>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 2: DUAL-PANE SYMMETRICAL WORKSTATION (SCANNING)
      ───────────────────────────────────────────────────────────── */}
      {step === "scan" && (
        <div className="space-y-4 min-w-0">
          {/* Price Override Console */}
          <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  priceOverride.trim() && !isNaN(Number(priceOverride))
                    ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    : "bg-secondary text-muted-foreground border border-border/50"
                }`}
              >
                <Tag className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-foreground">Scan Price Override (৳)</span>
                  {priceOverride.trim() && !isNaN(Number(priceOverride)) ? (
                    <Badge className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-mono font-bold">
                      Override Active: ৳{Number(priceOverride).toLocaleString()}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                      Catalog Price
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {priceOverride.trim() && !isNaN(Number(priceOverride))
                    ? "Any serial scanned now will register with this override price (discount calculated from main price)."
                    : "Enter an override price to sell subsequent scanned items at a custom price, or clear it to use default."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <div className="relative flex-1 sm:w-44">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground font-semibold">
                  ৳
                </span>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={priceOverride}
                  onChange={(e) => setPriceOverride(e.target.value)}
                  placeholder="e.g. 400"
                  className="h-9 pl-6 pr-7 text-xs font-mono bg-secondary/30 border-border/70 rounded-xl"
                />
                {priceOverride && (
                  <button
                    type="button"
                    onClick={() => setPriceOverride("")}
                    title="Clear override"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {priceOverride && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPriceOverride("")}
                  className="h-9 px-2.5 text-xs rounded-xl text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch min-w-0">
            {/* Left Pane: Terminal Viewfinder (QR Mode default) */}
            <div className="flex flex-col h-full rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md overflow-hidden p-4 sm:p-5 space-y-4 min-w-0">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Scanner Console
                  </h3>
                  <Badge variant="outline" className="text-[9px] font-mono">
                    {scannerActive ? "Camera Active" : "Standby"}
                  </Badge>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <BarcodeScanner
                  active={scannerActive}
                  onToggle={() => setScannerActive((a) => !a)}
                  onScan={(code) => void handleScan(code)}
                />
              </div>
            </div>

            {/* Right Pane: Live Scanned Cart & Inspection Hub */}
            <div className="flex flex-col h-full rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md overflow-hidden p-4 sm:p-5 space-y-4 min-w-0">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Scanned Items
                  </h3>
                  <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/40 text-emerald-500 bg-emerald-500/10">
                    {units.length} Unit{units.length === 1 ? "" : "s"}
                  </Badge>
                </div>

                {units.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearAllUnits}
                    className="h-7 text-[11px] text-muted-foreground hover:text-destructive cursor-pointer px-2"
                  >
                    Clear All
                  </Button>
                )}
              </div>

              <div className="flex-1 flex flex-col justify-between min-w-0 space-y-3">
                {units.length === 0 ? (
                  <div className="py-12 text-center space-y-3 min-w-0 flex-1 flex flex-col justify-center items-center">
                    <div className="w-14 h-14 rounded-2xl bg-secondary/50 border border-border/50 flex items-center justify-center text-muted-foreground">
                      <QrCode className="w-7 h-7" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-foreground">Waiting for Scanned Items</p>
                      <p className="text-[11px] text-muted-foreground max-w-xs mx-auto mt-1 leading-relaxed">
                        Scan QR codes or linear barcodes to add verified inventory units to this customer's order.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 min-w-0">
                    {units.map((u, i) => (
                      <div
                        key={u.serialId}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/40 border border-border/50 text-xs min-w-0 gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-7 h-7 rounded-lg bg-background border border-border/60 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 text-muted-foreground">
                            {units.length - i}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground truncate">{u.productName}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="font-mono text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                                {u.serialCode}
                              </span>
                              {u.sku && (
                                <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">
                                  SKU: {u.sku}
                                </span>
                              )}
                              {u.discount > 0 && (
                                <span className="font-mono text-[9px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-semibold">
                                  -৳{u.discount.toLocaleString()} off
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Price & Edit Controls */}
                        <div className="flex items-center gap-2 shrink-0">
                          {editingSerialId === u.serialId ? (
                            <div className="flex items-center gap-1">
                              <div className="relative w-20">
                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground">৳</span>
                                <Input
                                  type="number"
                                  min="0"
                                  value={editPriceInput}
                                  onChange={(e) => setEditPriceInput(e.target.value)}
                                  className="h-7 pl-4 pr-1 text-xs font-mono bg-background"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") updateUnitPrice(u.serialId, parseFloat(editPriceInput));
                                    if (e.key === "Escape") setEditingSerialId(null);
                                  }}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => updateUnitPrice(u.serialId, parseFloat(editPriceInput))}
                                className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center cursor-pointer"
                                title="Save price"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSerialId(null)}
                                className="w-6 h-6 rounded bg-secondary text-muted-foreground flex items-center justify-center cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <div className="text-right">
                                {u.discount > 0 ? (
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-[10px] line-through text-muted-foreground/70 font-mono">
                                      ৳{u.mainPrice.toLocaleString()}
                                    </span>
                                    <span className="font-mono font-bold text-foreground text-xs">
                                      ৳{u.unitPrice.toLocaleString()}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="font-mono font-bold text-foreground text-xs">
                                    ৳{u.unitPrice.toLocaleString()}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSerialId(u.serialId);
                                  setEditPriceInput(String(u.unitPrice));
                                }}
                                title="Edit unit sold price"
                                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => removeUnit(u.serialId)}
                            title="Remove this serial"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Subtotal Ribbon */}
                <div className="p-3 rounded-xl bg-secondary/50 border border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{units.length} item{units.length === 1 ? "" : "s"}</span>
                    {totalDiscount > 0 && (
                      <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-mono">
                        Saved ৳{totalDiscount.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {totalDiscount > 0 && (
                      <span className="text-xs text-muted-foreground line-through font-mono">
                        ৳{originalSubtotal.toLocaleString()}
                      </span>
                    )}
                    <span className="font-mono font-bold text-sm text-foreground">
                      ৳{totalSoldAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <BottomBar>
            <Button
              variant="outline"
              onClick={() => goToStep("form")}
              className="h-11 rounded-xl px-4 text-xs font-semibold cursor-pointer w-full sm:w-auto"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Customer Info
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="ghost"
                onClick={() => {
                  setScannerActive(false);
                  confirmMutation.mutate();
                }}
                disabled={confirmMutation.isPending}
                className="h-11 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer flex-1 sm:flex-none"
              >
                <SkipForward className="w-4 h-4 mr-1.5" />
                {units.length === 0 ? "Skip (Empty Order)" : `Skip (${units.length} Scanned)`}
              </Button>

              <Button
                disabled={units.length === 0}
                onClick={() => {
                  setScannerActive(false);
                  goToStep("review");
                }}
                className="h-11 rounded-xl px-5 text-xs font-semibold cursor-pointer flex-1 sm:flex-none"
              >
                Review Order ({units.length}) <ChevronRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </BottomBar>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 3: REVIEW & CONFIRMATION
      ───────────────────────────────────────────────────────────── */}
      {step === "review" && (
        <div className="space-y-4 min-w-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start min-w-0">
            {/* Scanned Units & Line Items (2 Cols) */}
            <div className="lg:col-span-2 rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Order Items Breakdown
                  </h3>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {units.length} Unit{units.length === 1 ? "" : "s"}
                </Badge>
              </div>

              {grouped.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-xs">
                  No items attached. You can confirm an empty order shell and attach serials later.
                </div>
              ) : (
                <div className="space-y-3">
                  {grouped.map((g) => (
                    <div
                      key={g.productName}
                      className="p-3.5 rounded-xl bg-secondary/40 border border-border/50 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-foreground leading-snug">{g.productName}</h4>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {g.sku && <p className="text-[11px] font-mono text-muted-foreground">SKU: {g.sku}</p>}
                            {g.discount > 0 && (
                              <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-mono">
                                ৳{g.discount.toLocaleString()} Discount / Unit
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Price & Edit Group Price */}
                        <div className="text-right shrink-0">
                          {editingGroupName === g.productName ? (
                            <div className="flex items-center gap-1 justify-end">
                              <div className="relative w-24">
                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground">৳</span>
                                <Input
                                  type="number"
                                  min="0"
                                  value={editGroupPriceInput}
                                  onChange={(e) => setEditGroupPriceInput(e.target.value)}
                                  className="h-7 pl-4 pr-1 text-xs font-mono bg-background"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") updateGroupPrice(g.productName, parseFloat(editGroupPriceInput));
                                    if (e.key === "Escape") setEditingGroupName(null);
                                  }}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => updateGroupPrice(g.productName, parseFloat(editGroupPriceInput))}
                                className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center cursor-pointer"
                                title="Save price"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingGroupName(null)}
                                className="w-6 h-6 rounded bg-secondary text-muted-foreground flex items-center justify-center cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 justify-end">
                              <div>
                                <p className="text-sm font-mono font-bold text-foreground">
                                  ৳{(g.unitPrice * g.serialIds.length).toLocaleString()}
                                </p>
                                <p className="text-[11px] text-muted-foreground font-mono">
                                  {g.serialIds.length} × ৳{g.unitPrice.toLocaleString()}
                                  {g.discount > 0 && ` (Base: ৳${g.mainPrice.toLocaleString()})`}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingGroupName(g.productName);
                                  setEditGroupPriceInput(String(g.unitPrice));
                                }}
                                title="Edit sold price for all units in this product"
                                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/40 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider mr-1">
                          Serials ({g.serialCodes.length}):
                        </span>
                        {g.serialCodes.map((c) => (
                          <span
                            key={c}
                            className="font-mono text-[10px] font-semibold bg-background px-2 py-0.5 rounded border border-border/60 text-foreground"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer & Order Summary (1 Col) */}
            <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-4 sm:p-5 space-y-4">
              <div className="border-b border-border/50 pb-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Order Summary
                </h3>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">Customer</span>
                  <p className="font-semibold text-foreground text-sm">{customerName}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {phone && (
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">Phone</span>
                      <p className="font-mono text-foreground">{phone}</p>
                    </div>
                  )}
                  {email && (
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">Email</span>
                      <p className="text-foreground truncate">{email}</p>
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">Channel</span>
                  <Badge variant="outline" className="mt-1 text-[11px]">
                    {selectedSource.label}
                  </Badge>
                </div>

                {address && (
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">Address</span>
                    <p className="text-muted-foreground mt-0.5">{address}</p>
                  </div>
                )}

                {notes && (
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">Notes</span>
                    <p className="text-muted-foreground mt-0.5 italic">{notes}</p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border/50 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Merchandise Subtotal:</span>
                  <span className="font-mono font-semibold text-foreground">৳{totalSoldAmount.toLocaleString()}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Discounts Given:</span>
                    <span className="font-mono">-৳{totalDiscount.toLocaleString()}</span>
                  </div>
                )}
                {source !== "offline" && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      Delivery Charge:
                      {isPrepaidDelivery && (
                        <Badge className="text-[9px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 py-0 px-1 font-mono">
                          Pre-paid
                        </Badge>
                      )}
                    </span>
                    <span className="font-mono font-semibold text-foreground">৳{shippingFee.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Total Units:</span>
                  <span className="font-mono font-semibold text-foreground">{units.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold pt-1 border-t border-border/20 text-muted-foreground">
                  <span>Total Order Value:</span>
                  <span className="font-mono text-foreground">৳{(totalSoldAmount + (source === "offline" ? 0 : shippingFee)).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-bold pt-1 border-t border-border/30">
                  <span className="text-foreground">
                    {source === "offline"
                      ? "Payable at Counter:"
                      : isPrepaidDelivery
                      ? "COD Due on Delivery:"
                      : "Payable on Delivery (COD):"}
                  </span>
                  <span className="text-emerald-500 font-mono text-base">
                    ৳{((source === "offline" || isPrepaidDelivery)
                      ? totalSoldAmount
                      : totalSoldAmount + shippingFee
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <BottomBar>
            <Button
              variant="outline"
              onClick={() => {
                setScannerActive(true);
                goToStep("scan");
              }}
              className="h-11 rounded-xl px-4 text-xs font-semibold cursor-pointer w-full sm:w-auto"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Scanning
            </Button>

            <Button
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending}
              className="w-full sm:w-auto h-11 px-6 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              {confirmMutation.isPending ? (
                "Processing Order…"
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm &amp; Finalize Order (৳{totalSoldAmount.toLocaleString()})
                </>
              )}
            </Button>
          </BottomBar>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 4: DONE / INVOICE & DISPATCH
      ───────────────────────────────────────────────────────────── */}
      {step === "done" && result && (
        <div className="space-y-4 min-w-0">
          {/* Success Banner */}
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 sm:p-6 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto mb-1">
              <Check className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">
              {units.length === 0 ? "Pending Order Created" : "Order Confirmed & Serials Assigned!"}
            </h2>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-background/80 px-3 py-1 rounded-xl border border-emerald-500/30">
                {result.order.order_number}
              </span>
              <button
                type="button"
                onClick={() => copyOrderNumber(result.order.order_number)}
                title="Copy order number"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 cursor-pointer transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Customer: <strong className="text-foreground">{customerName}</strong> · Total:{" "}
              <strong className="text-emerald-500 font-mono">৳{Number(result.order.total).toLocaleString()}</strong> · Channel: {selectedSource.label}
            </p>
          </div>

          {/* Action Dispatch Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Invoice Print & PDF Card */}
            <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-4 sm:p-5 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Printer className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Invoice Slip &amp; Receipts
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Print instant tax invoice slips, thermal POS customer receipts, or export PDF files for warranty and accounting.
                </p>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    onClick={printInvoice}
                    className="h-10 rounded-xl text-xs font-bold gap-2 cursor-pointer bg-primary text-primary-foreground shadow-sm hover:brightness-110"
                  >
                    <Printer className="w-4 h-4" /> Print Invoice Slip
                  </Button>
                  <Button
                    variant="outline"
                    onClick={exportPdf}
                    className="h-10 rounded-xl text-xs font-semibold gap-2 border-border/70 hover:bg-secondary/60 cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> Export Invoice PDF
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={printPosSlip}
                    className="h-10 rounded-xl text-xs font-semibold gap-2 border-border/70 hover:bg-secondary/60 cursor-pointer"
                  >
                    <Receipt className="w-4 h-4" /> POS Receipt (80mm)
                  </Button>
                  {result.order.order_source !== "offline" && (
                    <Button
                      variant="outline"
                      onClick={exportSticker}
                      className="h-10 rounded-xl text-xs font-semibold gap-2 border-border/70 hover:bg-secondary/60 cursor-pointer"
                    >
                      <Tag className="w-4 h-4" /> Shipping Sticker
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Email Dispatch Card */}
            <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-4 sm:p-5 space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Email Customer Receipt
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Send digital invoice and warranty authenticity verification direct to customer's inbox.
                </p>
              </div>

              <div className="flex gap-2">
                <Input
                  value={emailOverride}
                  onChange={(e) => setEmailOverride(e.target.value)}
                  placeholder={email || "customer@email.com"}
                  className="h-10 rounded-xl text-xs bg-secondary/30 border-border/60"
                />
                <Button
                  onClick={() => emailInvoice.mutate()}
                  disabled={emailInvoice.isPending}
                  className="h-10 px-4 rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 mr-1.5" />
                  {emailInvoice.isPending ? "Sending…" : "Send"}
                </Button>
              </div>
            </div>
          </div>

          {/* New Order CTA */}
          <BottomBar>
            <div className="text-xs text-muted-foreground">
              Order logged to global sales register and revenue reports.
            </div>

            <Button
              onClick={resetAll}
              className="w-full sm:w-auto h-11 px-6 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-2" /> Create Another Offline Order
            </Button>
          </BottomBar>
        </div>
      )}
    </div>
  );
}
