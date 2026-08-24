"use client";

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
import { SearchableSelect } from "@/components/SearchableSelect";
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
  Zap,
  Building2,
} from "lucide-react";

type Source = "offline" | "page" | "whatsapp" | "tiktok" | "instagram";

const SOURCE_OPTIONS: { value: Source; label: string; short: string; icon: any }[] = [
  { value: "offline", label: "Store Counter / Walk-in", short: "Counter", icon: Store },
  { value: "page", label: "Facebook Page Order", short: "Facebook", icon: Share2 },
  { value: "whatsapp", label: "WhatsApp Direct", short: "WhatsApp", icon: MessageCircle },
  { value: "tiktok", label: "TikTok Shop / Live", short: "TikTok", icon: Music2 },
  { value: "instagram", label: "Instagram Direct", short: "Instagram", icon: Camera },
];

type CourierProvider = "steadfast" | "pathao" | "redx" | "paperfly" | "inhouse";

const COURIER_OPTIONS: {
  id: CourierProvider;
  name: string;
  shortName: string;
  badge: string;
  icon: any;
  speed: string;
  description: string;
}[] = [
  {
    id: "steadfast",
    name: "Steadfast Courier",
    shortName: "Steadfast",
    badge: "⚡ Fast COD",
    icon: Truck,
    speed: "24-48h",
    description: "Doorstep & hub pickup across 64 districts",
  },
  {
    id: "pathao",
    name: "Pathao Express",
    shortName: "Pathao",
    badge: "🚀 Express",
    icon: Zap,
    speed: "12-36h",
    description: "On-demand city parcel & hub delivery",
  },
  {
    id: "redx",
    name: "RedX Logistics",
    shortName: "RedX",
    badge: "📦 Nationwide",
    icon: Package,
    speed: "24-72h",
    description: "Nationwide doorstep delivery network",
  },
  {
    id: "paperfly",
    name: "Paperfly Courier",
    shortName: "Paperfly",
    badge: "🏢 Rural / Union",
    icon: Building2,
    speed: "48-72h",
    description: "Extended doorstep delivery in rural unions",
  },
  {
    id: "inhouse",
    name: "Store / In-House",
    shortName: "In-House",
    badge: "🛵 Hand to Hand",
    icon: Store,
    speed: "Same Day",
    description: "Direct showroom pickup or own rider delivery",
  },
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
function StepNavigator({
  currentStep,
  onSelectStep,
  maxReachedIndex,
}: {
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
                  ? "bg-secondary/60 text-foreground hover:bg-secondary/80 cursor-pointer"
                  : isClickable
                  ? "bg-secondary/20 text-muted-foreground hover:text-foreground cursor-pointer"
                  : "bg-transparent text-muted-foreground/40 cursor-not-allowed"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono shrink-0 ${
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground font-bold"
                    : isDone
                    ? "bg-primary/20 text-primary font-bold"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.stepNumber}
              </div>
              <div className="min-w-0">
                <p className="text-xs truncate leading-tight">{s.label}</p>
                <span
                  className={`text-[9px] uppercase tracking-wider block ${
                    isActive ? "text-primary-foreground/70" : "text-muted-foreground/60"
                  }`}
                >
                  {isActive ? "Active" : isDone ? "Done" : "Pending"}
                </span>
              </div>
            </button>
          );
        })}
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
  const [courierProvider, setCourierProvider] = useState<CourierProvider>("steadfast");
  const [notes, setNotes] = useState("");
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [isPrepaidDelivery, setIsPrepaidDelivery] = useState<boolean>(false);
  const [isDeliveryFeeManual, setIsDeliveryFeeManual] = useState<boolean>(false);

  // Chat / Message Quick-Paste Parser State
  const [chatPasteText, setChatPasteText] = useState("");
  const [isChatBoxOpen, setIsChatBoxOpen] = useState(true);
  const [parsedChatInfo, setParsedChatInfo] = useState<ParsedCustomerInfo | null>(null);

  // Dynamic thanas list based on selected district
  const availableThanas = useMemo(() => {
    return getThanasForDistrict(district);
  }, [district]);

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

  // Official dynamic courier rate calculation
  const courierRateResult = useMemo(() => {
    return calculateCourierRate({
      originDistrict: "Dhaka",
      district: effectiveDistrict,
      thana: effectiveThana,
      defaultPartner: courierProvider === "pathao" ? "pathao" : "steadfast",
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
  }, [effectiveDistrict, effectiveThana, totalSoldAmount, courierProvider, shippingSettings]);

  // Handle District selection with Than sync
  const handleDistrictSelect = (newDistrict: string) => {
    setDistrict(newDistrict);
    const thanas = getThanasForDistrict(newDistrict);
    const nextThana = thanas.length > 0 ? thanas[0] : "";
    setThana(nextThana);

    if (!isDeliveryFeeManual && source !== "offline") {
      const rate = calculateCourierRate({
        originDistrict: "Dhaka",
        district: newDistrict,
        thana: nextThana,
        itemSubtotal: totalSoldAmount,
        insideDhakaRate: Number(shippingSettings?.shipping_fee ?? 70),
        suburbsRate: Number(shippingSettings?.shipping_fee_suburbs ?? 105),
        outsideDhakaRate: Number(shippingSettings?.shipping_fee_outside ?? 130),
        interDistrictRate: Number(shippingSettings?.shipping_fee_inter_district ?? 135),
      });
      setShippingFee(rate.effectiveDeliveryFee);
    }
  };

  const handleThanaSelect = (newThana: string) => {
    setThana(newThana);
    if (!isDeliveryFeeManual && source !== "offline") {
      const rate = calculateCourierRate({
        originDistrict: "Dhaka",
        district: district,
        thana: newThana,
        itemSubtotal: totalSoldAmount,
        insideDhakaRate: Number(shippingSettings?.shipping_fee ?? 70),
        suburbsRate: Number(shippingSettings?.shipping_fee_suburbs ?? 105),
        outsideDhakaRate: Number(shippingSettings?.shipping_fee_outside ?? 130),
        interDistrictRate: Number(shippingSettings?.shipping_fee_inter_district ?? 135),
      });
      setShippingFee(rate.effectiveDeliveryFee);
    }
  };

  // Auto-update shipping fee when address or source changes
  const handleAddressChange = (newAddr: string) => {
    setAddress(newAddr);
    if (newAddr.length > 5) {
      const loc = detectLocationFromAddress(newAddr);
      if (loc.district && loc.district.toLowerCase() !== district.toLowerCase()) {
        handleDistrictSelect(loc.district);
        if (loc.thana) setThana(loc.thana);
      } else if (loc.thana && loc.thana.toLowerCase() !== thana.toLowerCase()) {
        setThana(loc.thana);
      }
      if (loc.postalCode && !postalCode) setPostalCode(loc.postalCode);
    }

    if (!isDeliveryFeeManual && source !== "offline") {
      const rate = calculateCourierRate({
        originDistrict: "Dhaka",
        district: district,
        thana: thana,
        itemSubtotal: totalSoldAmount,
        insideDhakaRate: Number(shippingSettings?.shipping_fee ?? 70),
        suburbsRate: Number(shippingSettings?.shipping_fee_suburbs ?? 105),
        outsideDhakaRate: Number(shippingSettings?.shipping_fee_outside ?? 130),
        interDistrictRate: Number(shippingSettings?.shipping_fee_inter_district ?? 135),
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
    if (info.address) setAddress(info.address);

    const loc = info.location || detectLocationFromAddress(info.address || "");
    if (loc.district) {
      handleDistrictSelect(loc.district);
      if (loc.thana) setThana(loc.thana);
    }

    if (info.postalCode) setPostalCode(info.postalCode);
    if (info.notes) setNotes(info.notes);
    if (info.detectedSource) setSource(info.detectedSource as Source);

    toast.success("Chat parsed & applied!", {
      description: `${info.name ? info.name + " • " : ""}${info.phone || ""}${loc.district ? " • " + loc.district : ""}`,
    });
  };

  const handleScan = async (rawCode: string) => {
    const code = extractSerialCode(rawCode);
    if (!code) return;

    if (units.some((u) => u.serialCode.toLowerCase() === code.toLowerCase())) {
      toast.info(`Already added: ${code}`);
      return;
    }

    try {
      const row = await useServerFn(lookupSerial)({ code });
      if (!row) {
        toast.error(`Item '${code}' not found`, {
          description: "Check barcode, SKU, or serial number and try again.",
        });
        return;
      }

      if (row.status !== "available" && row.status !== "cancelled" && !(row.status === "returned" && !(row as any).is_defective)) {
        toast.error(`Item is not available for sale (status: ${row.status})`);
        return;
      }

      const variantLabel = [row.product_variants?.size, row.product_variants?.color].filter(Boolean).join(" / ");
      const name = variantLabel
        ? `${row.products?.name ?? "Product"} (${variantLabel})`
        : row.products?.name ?? "Product";

      const mainPrice = Number(row.products?.compare_at_price || row.products?.price || 0);
      const regularPrice = Number(row.products?.price || 0);
      const soldPrice = priceOverride.trim() ? Math.max(0, Number(priceOverride) || 0) : regularPrice;
      const discount = Math.max(0, mainPrice - soldPrice);

      setUnits((prev) => [
        ...prev,
        {
          serialId: row.id,
          serialCode: row.serial_code,
          productId: row.product_id,
          variantId: row.variant_id,
          productName: name,
          mainPrice,
          unitPrice: soldPrice,
          discount,
          thumbnail: row.products?.thumbnail,
          sku: row.product_variants?.sku || row.products?.sku,
        },
      ]);

      toast.success(`Added: ${name}`, {
        description: `Price: ৳${soldPrice.toLocaleString()}${row.serial_code ? ` • ${row.serial_code}` : ""}`,
      });
    } catch (e: any) {
      toast.error("Lookup failed", { description: e.message });
    }
  };

  const removeUnit = (serialId: string) => {
    setUnits((prev) => prev.filter((u) => u.serialId !== serialId));
  };

  const removeGroup = (groupName: string) => {
    setUnits((prev) => prev.filter((u) => u.productName !== groupName));
  };

  const startEditSinglePrice = (u: ScannedUnit) => {
    setEditingSerialId(u.serialId);
    setEditPriceInput(String(u.unitPrice));
    setEditingGroupName(null);
  };

  const applyEditSinglePrice = () => {
    if (!editingSerialId) return;
    const newPrice = Math.max(0, Number(editPriceInput) || 0);
    setUnits((prev) =>
      prev.map((u) => {
        if (u.serialId !== editingSerialId) return u;
        return {
          ...u,
          unitPrice: newPrice,
          discount: Math.max(0, u.mainPrice - newPrice),
        };
      })
    );
    setEditingSerialId(null);
    setEditPriceInput("");
  };

  const startEditGroupPrice = (g: any) => {
    setEditingGroupName(g.productName);
    setEditGroupPriceInput(String(g.unitPrice));
    setEditingSerialId(null);
  };

  const applyEditGroupPrice = () => {
    if (!editingGroupName) return;
    const newPrice = Math.max(0, Number(editGroupPriceInput) || 0);
    setUnits((prev) =>
      prev.map((u) => {
        if (u.productName !== editingGroupName) return u;
        return {
          ...u,
          unitPrice: newPrice,
          discount: Math.max(0, u.mainPrice - newPrice),
        };
      })
    );
    setEditingGroupName(null);
    setEditGroupPriceInput("");
  };

  const [result, setResult] = useState<{ order: any; items: any[] } | null>(null);

  const confirm = useMutation({
    mutationFn: () =>
      useServerFn(createOfflineOrder)({
        customerName: customerName.trim() || (source === "offline" ? "Walk-in Customer" : "Social Customer"),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        district: source !== "offline" ? district : undefined,
        thana: source !== "offline" ? thana : undefined,
        courierProvider: source !== "offline" ? courierProvider : undefined,
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
      }),
    onSuccess: (res) => {
      setResult(res);
      setStep("done");
      setMaxReachedStepIndex(3);
      toast.success(`Order created: ${res.order.order_number}`, {
        description: `Total: ৳${Number(res.order.total).toLocaleString()} • ${res.items.length} item(s)`,
      });
    },
    onError: (e: any) => toast.error("Could not create order", { description: e.message }),
  });

  const resetForm = () => {
    setCustomerName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setDistrict("Dhaka");
    setThana("Dhanmondi");
    setPostalCode("");
    setSource("offline");
    setCourierProvider("steadfast");
    setNotes("");
    setShippingFee(0);
    setIsPrepaidDelivery(false);
    setIsDeliveryFeeManual(false);
    setChatPasteText("");
    setParsedChatInfo(null);
    setUnits([]);
    setPriceOverride("");
    setResult(null);
    setStep("form");
    setMaxReachedStepIndex(0);
    setScannerActive(true);
  };

  const selectedSource = SOURCE_OPTIONS.find((s) => s.value === source)!;
  const selectedCourier = COURIER_OPTIONS.find((c) => c.id === courierProvider)!;

  const handleStepTransition = (nextStep: Step) => {
    const currentIdx = STEPS.findIndex((s) => s.id === step);
    const targetIdx = STEPS.findIndex((s) => s.id === nextStep);

    if (targetIdx > currentIdx) {
      if (step === "form") {
        if (!customerName.trim() && source !== "offline") {
          toast.error("Please provide customer name");
          return;
        }
        if (!phone.trim() && !email.trim() && source !== "offline") {
          toast.error("Please provide at least a phone number or email");
          return;
        }
      }
      if (step === "scan") {
        if (units.length === 0) {
          toast.error("Please scan or add at least 1 product");
          return;
        }
      }
    }

    setMaxReachedStepIndex((prev) => Math.max(prev, targetIdx));
    setStep(nextStep);
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3 sm:pb-4">
        <div className="space-y-0.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Store className="w-6 h-6 text-primary" />
            Direct POS &amp; Social Offline Orders
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Fast entry for Showroom Walk-ins, WhatsApp, Facebook Page, TikTok &amp; Instagram orders.
          </p>
        </div>

        {step !== "form" && step !== "done" && (
          <Button
            variant="outline"
            size="sm"
            onClick={resetForm}
            className="rounded-xl h-9 text-xs gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Start New Order
          </Button>
        )}
      </div>

      {/* Step Navigator */}
      <StepNavigator
        currentStep={step}
        onSelectStep={handleStepTransition}
        maxReachedIndex={maxReachedStepIndex}
      />

      {/* STEP 1: Customer & Source */}
      {step === "form" && (
        <div className="space-y-4">
          {/* Smart Chat / WhatsApp / Social Auto-Extractor Card (Top Positioned) */}
          <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card/80 to-secondary/30 backdrop-blur-md p-4 sm:p-5 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                    Quick Chat &amp; Message Auto-Extractor
                    <Badge variant="outline" className="text-[10px] bg-primary/15 text-primary border-primary/30 font-mono">
                      SMART PARSER
                    </Badge>
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Paste raw customer message from WhatsApp, Facebook Page, TikTok, Instagram or SMS to auto-fill everything.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsChatBoxOpen((o) => !o)}
                className="text-xs h-8 text-primary hover:bg-primary/10 rounded-xl cursor-pointer"
              >
                {isChatBoxOpen ? "Collapse" : "Open Chat Box"}
              </Button>
            </div>

            {isChatBoxOpen && (
              <div className="space-y-3 pt-1">
                <Textarea
                  value={chatPasteText}
                  onChange={(e) => handleChatTextChange(e.target.value)}
                  placeholder="Paste WhatsApp, Messenger, TikTok, or Instagram message here...&#10;e.g. 'Name: Tanvir Ahmed, Phone: 01712345678, Address: House 12, Road 4, Sector 7, Uttara, Dhaka'"
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
                        📞 {parsedChatInfo.phone}
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
                    {parsedChatInfo?.detectedSource && (
                      <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary">
                        Channel: {parsedChatInfo.detectedSource}
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
                        className="h-8 text-xs text-muted-foreground hover:text-foreground rounded-xl"
                      >
                        Clear
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => applyParsedChatInfo()}
                      disabled={!chatPasteText.trim()}
                      className="rounded-xl h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs cursor-pointer"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" /> Auto-Fill Customer &amp; Location
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
            {/* Customer Details & Delivery Destination Card */}
            <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Customer &amp; Delivery Destination
                  </h3>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {source === "offline" ? "Counter / Walk-in" : "Courier Delivery"}
                </Badge>
              </div>

              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground flex items-center gap-1">
                    <User className="w-3 h-3 text-muted-foreground" /> Customer Full Name *
                  </Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={source === "offline" ? "Walk-in Customer (or Customer Name)" : "Full Name"}
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
                      className="h-10 rounded-xl text-xs sm:text-sm font-mono bg-secondary/30 border-border/60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3 text-muted-foreground" /> Email Address (Optional)
                    </Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="customer@domain.com"
                      className="h-10 rounded-xl text-xs sm:text-sm bg-secondary/30 border-border/60"
                    />
                  </div>
                </div>

                {/* District & Thana/Zone Dropdown Selectors for Social Courier Orders */}
                {source !== "offline" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-primary" /> District / City *
                      </Label>
                      <SearchableSelect
                        value={district}
                        onChange={handleDistrictSelect}
                        options={BD_ALL_DISTRICTS}
                        placeholder="Select District"
                        searchPlaceholder="Search 64 districts..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground flex items-center gap-1">
                        <Compass className="w-3 h-3 text-primary" /> Thana / Police Station / Zone *
                      </Label>
                      <SearchableSelect
                        value={thana}
                        onChange={handleThanaSelect}
                        options={availableThanas}
                        placeholder="Select Thana / Zone"
                        searchPlaceholder="Search thana..."
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-muted-foreground" /> Delivery Street Address
                    </span>
                    {source !== "offline" && (
                      <span className="text-[10px] text-muted-foreground">Auto-detects District &amp; Thana</span>
                    )}
                  </Label>
                  <Textarea
                    value={address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    placeholder="House, Road, Area, Thana/Police Station, District, Zip Code"
                    rows={2}
                    className="rounded-xl text-xs sm:text-sm resize-none bg-secondary/30 border-border/60"
                  />

                  {source !== "offline" && (
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] pt-1">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-primary" />
                        Zone: <strong className="text-foreground">{effectiveDistrict}</strong> → <strong className="text-foreground">{effectiveThana}</strong>
                      </span>
                      <span className="text-muted-foreground">
                        Official Tariff: <strong className="text-primary font-bold">৳{courierRateResult.effectiveDeliveryFee}</strong>
                        <span className="text-[10px] text-muted-foreground ml-1">({courierRateResult.deliveryDays})</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Delivery Charge & Prepaid Controls */}
                {source !== "offline" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/40">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-foreground flex items-center gap-1">
                          <Truck className="w-3 h-3 text-primary" /> Delivery Charge (৳)
                        </Label>
                        <span className="text-[10px] text-muted-foreground">
                          {isDeliveryFeeManual ? "Manual Override" : "Auto-Calculated"}
                        </span>
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
            </div>

            {/* Courier Partner, Sales Channel & Notes Card */}
            <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Courier Partner &amp; Origin
                  </h3>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {selectedCourier.shortName}
                </Badge>
              </div>

              <div className="space-y-4">
                {/* Courier Selector Switcher (Hidden for Store Walk-In) */}
                {source !== "offline" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-foreground flex items-center justify-between">
                      <span>Select Courier Partner</span>
                      <span className="text-[10px] text-muted-foreground">Auto-routes to Courier Hub</span>
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {COURIER_OPTIONS.map((c) => {
                        const Icon = c.icon;
                        const isSelected = courierProvider === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setCourierProvider(c.id)}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? "bg-primary/10 border-primary text-foreground font-semibold shadow-2xs"
                                : "bg-secondary/20 border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                            }`}
                          >
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <p className="text-xs leading-tight font-semibold truncate">{c.shortName}</p>
                                <span className="text-[9px] font-mono bg-muted/60 px-1.5 py-0.5 rounded text-muted-foreground">
                                  {c.speed}
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{c.badge}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sales Channel Selector */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-foreground">Sales Origin Channel</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SOURCE_OPTIONS.map((o) => {
                      const Icon = o.icon;
                      const isSelected = source === o.value;
                      return (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => handleSourceChange(o.value)}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? "bg-primary/10 border-primary text-foreground font-semibold shadow-2xs"
                              : "bg-secondary/20 border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs leading-tight truncate">{o.short}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Internal Staff Notes */}
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-medium text-foreground flex items-center gap-1">
                    <FileText className="w-3 h-3 text-muted-foreground" /> Internal Staff Notes (Optional)
                  </Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Staff notes, special delivery instructions, payment method info..."
                    rows={2}
                    className="rounded-xl text-xs sm:text-sm resize-none bg-secondary/30 border-border/60"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <Badge variant="outline" className="text-[11px] font-mono">
                  {selectedSource.label}
                </Badge>
                {source !== "offline" && (
                  <span className="text-[11px] font-medium text-primary">
                    Courier: {selectedCourier.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => handleStepTransition("scan")}
              className="rounded-xl h-11 px-6 font-bold gap-2 text-sm bg-primary text-primary-foreground shadow-sm cursor-pointer"
            >
              Continue to Product Scanning <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: Scan & Inventory */}
      {step === "scan" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
            {/* Left: Barcode / QR Scanner */}
            <div className="lg:col-span-6 space-y-3">
              <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Barcode className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Scanner Console
                    </h3>
                  </div>
                  <Badge variant={scannerActive ? "default" : "secondary"} className="text-[10px] font-mono">
                    {scannerActive ? "Camera Active" : "Standby"}
                  </Badge>
                </div>

                <BarcodeScanner
                  active={scannerActive}
                  onToggle={() => setScannerActive((a) => !a)}
                  onScan={(code) => void handleScan(code)}
                />

                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-medium text-foreground flex items-center justify-between">
                    <span>Default Custom Sold Price Override (Optional)</span>
                    <span className="text-[10px] text-muted-foreground">Applies to next scanned items</span>
                  </Label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="number"
                      min="0"
                      value={priceOverride}
                      onChange={(e) => setPriceOverride(e.target.value)}
                      placeholder="Leave blank for regular catalog price"
                      className="h-10 pl-9 rounded-xl text-xs sm:text-sm font-mono bg-secondary/30 border-border/60"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Scanned Items Cart */}
            <div className="lg:col-span-6 space-y-3">
              <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Scanned Items ({units.length})
                    </h3>
                  </div>
                  <span className="text-xs font-bold font-mono text-primary">
                    ৳{subtotal.toLocaleString()}
                  </span>
                </div>

                {units.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground space-y-2">
                    <Package className="w-10 h-10 mx-auto opacity-30 stroke-[1.5]" />
                    <p className="text-xs font-medium">No items scanned yet.</p>
                    <p className="text-[11px] opacity-70">Scan QR codes, barcodes, or SKUs using camera or handheld scanner.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1 custom-scrollbar">
                    {grouped.map((g) => (
                      <div
                        key={g.productName}
                        className="p-3 rounded-xl border border-border/60 bg-secondary/20 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground truncate">{g.productName}</p>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                              <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-foreground font-semibold">
                                Qty: {g.serialIds.length}
                              </span>
                              <span>@ ৳{g.unitPrice.toLocaleString()}</span>
                              {g.discount > 0 && (
                                <span className="text-emerald-500 font-medium">
                                  (-৳{g.discount.toLocaleString()} disc)
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditGroupPrice(g)}
                              className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Edit price for this group"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeGroup(g.productName)}
                              className="h-7 w-7 p-0 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer"
                              title="Remove all units of this product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Inline price edit for group */}
                        {editingGroupName === g.productName && (
                          <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                            <Input
                              type="number"
                              min="0"
                              value={editGroupPriceInput}
                              onChange={(e) => setEditGroupPriceInput(e.target.value)}
                              className="h-8 text-xs font-mono rounded-lg w-28"
                              placeholder="New price"
                            />
                            <Button
                              size="sm"
                              onClick={applyEditGroupPrice}
                              className="h-8 text-xs font-bold rounded-lg px-2.5"
                            >
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingGroupName(null)}
                              className="h-8 text-xs rounded-lg px-2"
                            >
                              Cancel
                            </Button>
                          </div>
                        )}

                        {/* Serials chips */}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {g.serialCodes.map((code, idx) => (
                            <Badge
                              key={code}
                              variant="outline"
                              className="text-[9px] font-mono py-0.5 gap-1 bg-background/60"
                            >
                              <span>{code}</span>
                              <button
                                type="button"
                                onClick={() => removeUnit(g.serialIds[idx])}
                                className="text-muted-foreground hover:text-destructive cursor-pointer ml-0.5"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Subtotal Footer */}
                {units.length > 0 && (
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Items Total ({units.length} units):</span>
                    <span className="font-mono font-bold text-foreground">৳{subtotal.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setStep("form")}
              className="rounded-xl h-11 px-5 font-semibold text-xs gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Customer
            </Button>
            <Button
              disabled={units.length === 0}
              onClick={() => handleStepTransition("review")}
              className="rounded-xl h-11 px-6 font-bold gap-2 text-sm bg-primary text-primary-foreground shadow-sm cursor-pointer disabled:opacity-50"
            >
              Continue to Review <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Review Order */}
      {step === "review" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-start">
            {/* Left: Customer & Delivery Summary */}
            <div className="md:col-span-6 rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" /> Customer &amp; Routing Summary
                </h3>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {selectedSource.short}
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Customer Name:</span>
                  <span className="font-semibold text-foreground">{customerName || "Walk-in Customer"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Mobile Phone:</span>
                  <span className="font-mono text-foreground">{phone || "None"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="text-foreground">{email || "None"}</span>
                </div>
                {source !== "offline" && (
                  <>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">Courier Partner:</span>
                      <span className="font-semibold text-primary">{selectedCourier.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">District / Thana:</span>
                      <span className="text-foreground font-medium">{district} → {thana}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">Address:</span>
                      <span className="text-foreground text-right max-w-[220px] truncate">{address || "None"}</span>
                    </div>
                  </>
                )}
                {notes && (
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Staff Notes:</span>
                    <span className="text-foreground text-right italic max-w-[220px] truncate">{notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Payment & Calculation Breakdown */}
            <div className="md:col-span-6 rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-primary" /> Invoice &amp; Payment Breakdown
                </h3>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {source === "offline" ? "Cash Settlement" : "COD Order"}
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Items Subtotal ({units.length} pcs):</span>
                  <span className="font-mono text-foreground">৳{originalSubtotal.toLocaleString()}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between py-1 border-b border-border/30 text-emerald-500 font-medium">
                    <span>Discount Applied:</span>
                    <span className="font-mono">-৳{totalDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Net Items Price:</span>
                  <span className="font-mono font-semibold text-foreground">৳{subtotal.toLocaleString()}</span>
                </div>
                {source !== "offline" && (
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground">Delivery Charge ({selectedCourier.shortName}):</span>
                    <span className="font-mono text-foreground">
                      {isPrepaidDelivery ? (
                        <span className="text-emerald-500 font-medium">৳{shippingFee} (Pre-paid)</span>
                      ) : (
                        `৳${shippingFee}`
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-t border-border/60 text-sm font-bold">
                  <span className="text-foreground">Total Invoice Amount:</span>
                  <span className="font-mono text-primary text-base">
                    ৳{(subtotal + (source === "offline" ? 0 : shippingFee)).toLocaleString()}
                  </span>
                </div>
                {source !== "offline" && isPrepaidDelivery && (
                  <div className="flex justify-between py-1 text-xs text-amber-500 font-semibold">
                    <span>Collectable COD Amount:</span>
                    <span className="font-mono">৳{subtotal.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setStep("scan")}
              className="rounded-xl h-11 px-5 font-semibold text-xs gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Scanning
            </Button>
            <Button
              disabled={confirm.isPending}
              onClick={() => confirm.mutate()}
              className="rounded-xl h-11 px-7 font-bold gap-2 text-sm bg-primary text-primary-foreground shadow-sm cursor-pointer"
            >
              {confirm.isPending ? "Creating Order..." : "Confirm & Create Order"} <CheckCircle2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Invoice & Receipt */}
      {step === "done" && result && (
        <div className="space-y-5 text-center max-w-2xl mx-auto py-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Order Successfully Created!</h2>
            <p className="text-xs sm:text-sm font-mono text-muted-foreground">
              Order Number: <strong className="text-foreground">{result.order.order_number}</strong>
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md space-y-2 text-xs text-left">
            <div className="flex justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-semibold text-foreground">{result.order.customer_name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Total Amount:</span>
              <span className="font-mono font-bold text-primary">৳{Number(result.order.total).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Sales Channel:</span>
              <span className="font-medium text-foreground">{selectedSource.label}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const brand = await loadBrand();
                printThermalSlip(result.order, result.items, brand);
              }}
              className="rounded-xl h-10 px-4 text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-primary" /> Print POS Thermal Slip
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const brand = await loadBrand();
                downloadInvoicePdf(result.order, result.items, brand);
              }}
              className="rounded-xl h-10 px-4 text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4 text-primary" /> Download A4 Invoice PDF
            </Button>

            <Button
              size="sm"
              onClick={resetForm}
              className="rounded-xl h-10 px-5 text-xs font-bold gap-1.5 bg-primary text-primary-foreground cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Another Order
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
