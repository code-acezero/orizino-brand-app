"use client";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/app-toast";
import { supabase } from "@/integrations/supabase/client";
import { BarcodeScanner } from "@/components/admin/products/BarcodeScanner";
import { lookupSerial } from "@/lib/serials.functions";
import { createOfflineOrder } from "@/lib/offline-orders.functions";
import { extractSerialCode } from "@orizino/shared";
import { emailOrderInvoice } from "@/lib/order-invoice-email.functions";
import { downloadInvoicePdf, type PdfBrand } from "@/lib/invoice-pdf";
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
  unitPrice: number;
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
  const [source, setSource] = useState<Source>("offline");
  const [notes, setNotes] = useState("");

  // Step 2: Scanning & Cart State
  const [scannerActive, setScannerActive] = useState(true);
  const [units, setUnits] = useState<ScannedUnit[]>([]);
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
      const newUnit: ScannedUnit = {
        serialId: row.id,
        serialCode: row.serial_code,
        productId: row.product_id,
        variantId: row.variant_id ?? null,
        productName: variantLabel
          ? `${row.products?.name ?? "Product"} (${variantLabel})`
          : row.products?.name ?? "Product",
        unitPrice: Number(row.products?.price ?? 0),
        thumbnail: row.products?.thumbnail ?? null,
        sku: row.products?.sku ?? null,
      };

      setUnits((prev) => [newUnit, ...prev]);
      toast({ title: "Item Added", description: `${newUnit.productName} (#${newUnit.serialCode})`, type: "success" });
    } catch (e: any) {
      toast({ title: "Lookup Failed", description: e.message, type: "error" });
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { productName: string; unitPrice: number; sku?: string | null; serialIds: string[]; serialCodes: string[] }
    >();
    for (const u of units) {
      const key = `${u.productId}::${u.variantId ?? ""}`;
      if (!map.has(key)) {
        map.set(key, {
          productName: u.productName,
          unitPrice: u.unitPrice,
          sku: u.sku,
          serialIds: [],
          serialCodes: [],
        });
      }
      const g = map.get(key)!;
      g.serialIds.push(u.serialId);
      g.serialCodes.push(u.serialCode);
    }
    return [...map.values()];
  }, [units]);

  const subtotal = useMemo(() => {
    return units.reduce((sum, u) => sum + (u.unitPrice || 0), 0);
  }, [units]);

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
        },
      }),
    onSuccess: (r: any) => {
      setResult(r);
      goToStep("done");
      toast({
        title: units.length === 0 ? "Empty Order Created" : "Order Confirmed & Serials Assigned",
        description: `Order ${r.order.order_number}`,
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
    downloadInvoicePdf(result.order, result.items, brand);
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
    setUnits([]);
    setResult(null);
    setEmailOverride("");
    setScannerActive(true);
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
                  <Label className="text-xs font-medium text-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-muted-foreground" /> Delivery / Billing Address
                  </Label>
                  <Textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House, Road, Area, City"
                    rows={2}
                    className="rounded-xl text-xs sm:text-sm resize-none bg-secondary/30 border-border/60"
                  />
                </div>
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
                        onClick={() => setSource(o.value)}
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
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                                {u.serialCode}
                              </span>
                              {u.sku && (
                                <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">
                                  SKU: {u.sku}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold text-foreground text-xs">
                            ৳{u.unitPrice.toLocaleString()}
                          </span>
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
                <div className="p-3 rounded-xl bg-secondary/50 border border-border/60 flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Subtotal ({units.length} items):</span>
                  <span className="font-mono font-bold text-sm text-foreground">
                    ৳{subtotal.toLocaleString()}
                  </span>
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
                          {g.sku && <p className="text-[11px] font-mono text-muted-foreground">SKU: {g.sku}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-mono font-bold text-foreground">
                            ৳{(g.unitPrice * g.serialIds.length).toLocaleString()}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {g.serialIds.length} × ৳{g.unitPrice.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/40 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider mr-1">
                          Serials:
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
                  <span>Total Units:</span>
                  <span className="font-mono font-semibold text-foreground">{units.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-bold pt-1 border-t border-border/30">
                  <span className="text-foreground">Total Amount:</span>
                  <span className="text-emerald-500 font-mono text-base">৳{subtotal.toLocaleString()}</span>
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
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm &amp; Finalize Order (৳{subtotal.toLocaleString()})
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
            <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-4 sm:p-5 space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Document &amp; Receipt
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Generate branded PDF tax invoice with serial barcodes for warranty and customer receipts.
                </p>
              </div>

              <Button
                variant="outline"
                onClick={printInvoice}
                className="w-full h-10 rounded-xl text-xs font-semibold cursor-pointer"
              >
                <Printer className="w-4 h-4 mr-2" /> Download / Print Invoice PDF
              </Button>
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
