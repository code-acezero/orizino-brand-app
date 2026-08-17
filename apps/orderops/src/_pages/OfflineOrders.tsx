import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
} from "lucide-react";

import { extractSerialCode } from "@orizino/shared";

const SOURCE_OPTIONS: { value: OfflineSource; label: string; short: string; icon: any }[] = [
  { value: "offline", label: "Offline (walk-in / counter)", short: "Offline", icon: Store },
  { value: "page", label: "Facebook Page", short: "Page", icon: Share2 },
  { value: "whatsapp", label: "WhatsApp", short: "WhatsApp", icon: MessageCircle },
  { value: "tiktok", label: "TikTok", short: "TikTok", icon: Music2 },
  { value: "instagram", label: "Instagram", short: "Instagram", icon: Camera },
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
const STEP_LABEL: Record<Step, string> = { form: "Customer", scan: "Scan", review: "Review", done: "Invoice" };
const STEPS: Step[] = ["form", "scan", "review", "done"];

function StepPills({ step }: { step: Step }) {
  const idx = STEPS.indexOf(step);
  return (
    <div className="flex items-center gap-1.5 rounded-2xl bg-muted/60 p-1 overflow-x-auto no-scrollbar">
      {STEPS.map((s, i) => (
        <div
          key={s}
          className={`flex-1 min-w-[76px] text-center text-[11px] font-medium py-2 rounded-xl transition-all duration-200 ${
            i === idx ? "bg-background shadow-sm text-foreground" : i < idx ? "text-primary/80" : "text-muted-foreground"
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
      className="sticky bottom-16 md:bottom-0 -mx-4 sm:mx-0 mt-4 flex items-center gap-2 border-t border-border/60 bg-background/85 backdrop-blur-xl px-4 py-3 md:static md:border-0 md:bg-transparent md:backdrop-blur-none md:p-0"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
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
  const [source, setSource] = useState<OfflineSource>("offline");
  const [notes, setNotes] = useState("");

  const [scannerActive, setScannerActive] = useState(false);
  const [units, setUnits] = useState<ScannedUnit[]>([]);

  const [result, setResult] = useState<{ order: any; items: any[] } | null>(null);
  const [emailOverride, setEmailOverride] = useState("");

  const canStartOrder = customerName.trim().length > 0 && (phone.trim() || email.trim());
  const selectedSource = SOURCE_OPTIONS.find((s) => s.value === source)!;

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

  const grouped = useMemo(() => {
    const map = new Map<string, { productName: string; unitPrice: number; serialIds: string[] }>();
    for (const u of units) {
      const key = `${u.productId}::${u.variantId ?? ""}`;
      if (!map.has(key)) map.set(key, { productName: u.productName, unitPrice: u.unitPrice, serialIds: [] });
      map.get(key)!.serialIds.push(u.serialId);
    }
    return [...map.values()];
  }, [units]);

  const total = grouped.reduce((sum, g) => sum + g.unitPrice * g.serialIds.length, 0);
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
    setSource("offline");
    setNotes("");
    setUnits([]);
    setResult(null);
    setEmailOverride("");
    setScannerActive(false);
  };

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
      <div>
        <h1 className="text-[22px] sm:text-2xl font-semibold tracking-tight">Offline Orders</h1>
        <p className="text-sm text-muted-foreground">Counter, Facebook, WhatsApp, TikTok or Instagram sales</p>
      </div>

      <StepPills step={step} />

      {step === "form" && (
        <div className="space-y-4">
          <section className="rounded-3xl border border-border/60 bg-card p-4 sm:p-5 space-y-4 shadow-sm">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Customer name</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Rahim Uddin" className="h-11 rounded-xl text-[15px]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Mobile number</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" className="h-11 rounded-xl text-[15px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@email.com" inputMode="email" className="h-11 rounded-xl text-[15px]" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Address (optional)</Label>
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Delivery / billing address" rows={2} className="rounded-xl text-[15px] resize-none" />
            </div>
            <p className="text-[11px] text-muted-foreground">A mobile number or an email — at least one.</p>
          </section>

          <section className="rounded-3xl border border-border/60 bg-card p-4 sm:p-5 space-y-3 shadow-sm">
            <Label className="text-xs text-muted-foreground">Source</Label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {SOURCE_OPTIONS.map((o) => {
                const Icon = o.icon;
                const active = source === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setSource(o.value)}
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

          <section className="rounded-3xl border border-border/60 bg-card p-4 sm:p-5 space-y-2 shadow-sm">
            <Label className="text-xs text-muted-foreground">Notes (optional, internal)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal note" rows={2} className="rounded-xl text-[15px] resize-none" />
          </section>

          <BottomBar>
            <Button disabled={!canStartOrder} onClick={() => setStep("scan")} className="w-full h-12 rounded-2xl text-[15px] font-medium">
              Continue <ChevronRight className="w-4 h-4 ml-1.5" />
            </Button>
          </BottomBar>
        </div>
      )}

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
            <span className="text-sm font-medium">{units.length} scanned · ৳{total.toLocaleString()}</span>
          </div>

          <BottomBar>
            <div className="flex w-full items-center gap-2">
              <Button variant="outline" onClick={() => setStep("form")} className="h-12 rounded-2xl px-4 shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" onClick={() => confirm.mutate()} disabled={confirm.isPending} className="h-12 rounded-2xl flex-1 text-muted-foreground">
                <SkipForward className="w-4 h-4 mr-1.5" />
                Skip {units.length > 0 ? `(save ${units.length})` : ""}
              </Button>
              <Button disabled={units.length === 0} onClick={() => setStep("review")} className="h-12 rounded-2xl flex-1">
                Review ({units.length}) <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </BottomBar>
          <p className="text-center text-[11px] text-muted-foreground px-4">
            "Skip" saves the order now — even with nothing scanned — as a pending order you can attach serials to later.
          </p>
        </div>
      )}

      {step === "review" && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-border/60 bg-card overflow-hidden shadow-sm">
            {units.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-muted-foreground">
                <PackageX className="w-8 h-8 opacity-50" />
                <p className="text-sm">Nothing scanned yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {units.map((u) => (
                  <div key={u.serialId} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-medium truncate">{u.productName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{u.serialCode}</p>
                    </div>
                    <p className="text-sm font-medium shrink-0">৳{u.unitPrice.toLocaleString()}</p>
                    <button type="button" onClick={() => removeUnit(u.serialId)} aria-label="Remove" className="w-9 h-9 rounded-full flex items-center justify-center text-destructive active:bg-destructive/10 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {grouped.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-0.5">
              {grouped.map((g) => (
                <Badge key={g.productName} variant="outline" className="rounded-full font-normal">
                  {g.productName} × {g.serialIds.length}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
            <span className="text-sm text-muted-foreground">Total ({units.length} unit{units.length === 1 ? "" : "s"})</span>
            <span className="text-lg font-semibold">৳{total.toLocaleString()}</span>
          </div>

          <BottomBar>
            <div className="flex w-full items-center gap-2">
              <Button variant="outline" onClick={() => setStep("scan")} className="h-12 rounded-2xl flex-1">
                <ScanLine className="w-4 h-4 mr-1.5" />Scan more
              </Button>
              <Button onClick={() => confirm.mutate()} disabled={confirm.isPending} className="h-12 rounded-2xl flex-1">
                {confirm.isPending ? "Confirming…" : (<><Check className="w-4 h-4 mr-1.5" />Confirm</>)}
              </Button>
            </div>
          </BottomBar>
        </div>
      )}

      {step === "done" && result && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-emerald-500/25 bg-emerald-500/[0.06] p-5 space-y-1">
            <p className="text-sm text-muted-foreground">{units.length === 0 ? "Order saved as pending" : "Order confirmed"}</p>
            <p className="text-xl font-semibold">{result.order.order_number}</p>
            <p className="text-sm text-muted-foreground">{customerName} · ৳{Number(result.order.total).toLocaleString()} · {selectedSource.label}</p>
          </div>

          <div className="rounded-3xl border border-border/60 bg-card p-4 sm:p-5 space-y-3 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button onClick={() => void printInvoice()} className="w-full h-11 rounded-2xl justify-center font-bold">
                <Printer className="w-4 h-4 mr-1.5" />Print / Download Invoice
              </Button>
              <Button variant="outline" onClick={printPosSlip} className="w-full h-11 rounded-2xl justify-center font-semibold">
                <Receipt className="w-4 h-4 mr-1.5" />POS Receipt Slip (80mm)
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end gap-2 pt-2 border-t border-border/50">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Send invoice by email</Label>
                <Input value={emailOverride} onChange={(e) => setEmailOverride(e.target.value)} placeholder={email || "customer@email.com"} className="h-11 rounded-xl" />
              </div>
              <Button onClick={() => emailInvoice.mutate()} disabled={emailInvoice.isPending} className="h-11 rounded-2xl">
                <Mail className="w-4 h-4 mr-1.5" />{emailInvoice.isPending ? "Sending…" : "Send"}
              </Button>
            </div>
          </div>

          <BottomBar>
            <Button variant="outline" onClick={resetAll} className="w-full h-12 rounded-2xl">
              <Plus className="w-4 h-4 mr-1.5" />Create another offline order
            </Button>
          </BottomBar>
        </div>
      )}
    </div>
  );
}
