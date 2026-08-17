import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarcodeScanner, ScannerLaunchCard } from "@/components/BarcodeScanner";
import { lookupSerial, type SerialLookupRow } from "@/lib/serials";
import { supabase } from "@/lib/supabase";
import { Button } from "@ui/components/ui/button";
import { Input } from "@ui/components/ui/input";
import { Badge } from "@ui/components/ui/badge";
import { toast } from "sonner";
import {
  PackageCheck,
  PackageX,
  ScanLine,
  Search,
  ShoppingCart,
  CheckCircle2,
  Truck,
  ArrowRight,
  Sparkles,
  Phone,
  MapPin,
  Barcode,
  Layers,
  RotateCcw,
  Check,
  ExternalLink,
} from "lucide-react";
import { extractSerialCode } from "@orizino/shared";

type ScanMode = "orders" | "products";

export function Scanner() {
  const qc = useQueryClient();
  const [mode, setMode] = useState<ScanMode>("orders");
  const [cameraActive, setCameraActive] = useState(false);
  const [manualInput, setManualInput] = useState("");

  // Product / Serial Scan state
  const [productHistory, setProductHistory] = useState<
    { code: string; row: SerialLookupRow | null; timestamp: Date }[]
  >([]);

  // Order Scan state
  const [scannedOrderNumber, setScannedOrderNumber] = useState<string | null>(null);
  const [orderUpdating, setOrderUpdating] = useState(false);

  // Fetch scanned order details
  const { data: orderDetails, isLoading: loadingOrder } = useQuery({
    queryKey: ["orderops-scanned-order", scannedOrderNumber],
    queryFn: async () => {
      if (!scannedOrderNumber) return null;
      const cleanNum = scannedOrderNumber.replace("#", "").trim();
      const { data, error } = (await (supabase.from as any)("orders")
        .select(`
          id, order_number, status, total, order_source, created_at,
          guest_name, guest_phone, guest_email, shipping_address,
          order_items (
            id, product_id, variant_id, quantity, unit_price,
            products ( name, sku )
          )
        `)
        .or(`order_number.ilike.%${cleanNum}%,id.eq.${cleanNum.length === 36 ? cleanNum : "00000000-0000-0000-0000-000000000000"}`)
        .maybeSingle()) as { data: any; error: any };

      if (error || !data) {
        toast.error(`Order "${scannedOrderNumber}" not found`);
        return null;
      }
      return data;
    },
    enabled: !!scannedOrderNumber,
  });

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
    if (navigator.vibrate) navigator.vibrate(80);
  };

  const handleScan = async (rawCode: string) => {
    playBeep();
    if (mode === "orders") {
      setScannedOrderNumber(rawCode.trim());
      setCameraActive(false);
      toast.success(`Scanned order: ${rawCode.trim()}`);
    } else {
      const code = extractSerialCode(rawCode);
      if (!code) return;
      try {
        const row = await lookupSerial(code);
        setProductHistory((prev) =>
          [{ code, row, timestamp: new Date() }, ...prev].slice(0, 30)
        );
        if (row) {
          toast.success(`Found serial: ${code}`);
        } else {
          toast.warning(`Serial ${code} is unassigned or invalid`);
        }
      } catch {
        setProductHistory((prev) =>
          [{ code, row: null, timestamp: new Date() }, ...prev].slice(0, 30)
        );
      }
    }
  };

  const handleUpdateOrderStatus = async (newStatus: string) => {
    if (!orderDetails) return;
    setOrderUpdating(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderDetails.id);
      if (error) throw error;
      toast.success(`Order ${orderDetails.order_number} marked as ${newStatus}!`);
      qc.invalidateQueries({ queryKey: ["orderops-scanned-order", scannedOrderNumber] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update order status");
    } finally {
      setOrderUpdating(false);
    }
  };

  if (cameraActive) {
    return (
      <BarcodeScanner
        active
        onToggle={() => setCameraActive(false)}
        onScan={(code) => void handleScan(code)}
      />
    );
  }

  return (
    <div className="space-y-4 pt-1 pb-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-primary" />
          <span>Scanner Terminal</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          High-speed camera & barcode scanning for normal orders & stock serials
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex items-center gap-2 p-1 bg-secondary/40 border border-border/70 rounded-2xl w-full">
        <button
          type="button"
          onClick={() => setMode("orders")}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            mode === "orders"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Normal Order Fulfillment</span>
        </button>
        <button
          type="button"
          onClick={() => setMode("products")}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            mode === "products"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Barcode className="w-4 h-4" />
          <span>Product / Serial Lookup</span>
        </button>
      </div>

      {/* Camera Scanner Card */}
      <ScannerLaunchCard onOpen={() => setCameraActive(true)} />

      {/* Manual Input Fallback */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (manualInput.trim()) {
            handleScan(manualInput.trim());
            setManualInput("");
          }
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder={
              mode === "orders"
                ? "Enter order number (e.g. ORZ-8492 or scan invoice barcode)…"
                : "Enter serial number or scan barcode…"
            }
            className="h-11 rounded-2xl pl-10 text-xs sm:text-sm bg-card/70 border-border/70"
          />
        </div>
        <Button
          type="submit"
          className="h-11 px-5 rounded-2xl text-xs sm:text-sm font-semibold cursor-pointer"
        >
          Verify
        </Button>
      </form>

      {/* MODE 1: Normal Order Fulfillment Scanner Card */}
      {mode === "orders" && (
        <div className="space-y-3">
          {loadingOrder && (
            <div className="p-8 text-center rounded-3xl border border-border/60 bg-card/60">
              <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Loading order details…</p>
            </div>
          )}

          {orderDetails && (
            <div className="rounded-3xl border border-border/80 bg-card/80 backdrop-blur-md p-4 sm:p-6 shadow-xl space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Scanned Order
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold font-mono text-foreground flex items-center gap-2">
                    <span>{orderDetails.order_number}</span>
                    <Badge className="capitalize text-[10px] px-2 py-0.5 font-bold">
                      {orderDetails.status}
                    </Badge>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Source: <span className="capitalize font-semibold">{orderDetails.order_source}</span> · Total: <span className="font-bold text-foreground">৳{Number(orderDetails.total).toLocaleString()}</span>
                  </p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-secondary/30 p-3 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-semibold text-foreground truncate">
                    {orderDetails.guest_name || "Guest"} ({orderDetails.guest_phone || "No phone"})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-muted-foreground">Delivery:</span>
                  <span className="font-medium text-foreground truncate">
                    {orderDetails.shipping_address || "Standard Delivery"}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Items to Pack ({orderDetails.order_items?.length || 0})
                </p>
                <div className="space-y-1.5">
                  {orderDetails.order_items?.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/40 border border-border/40 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate">
                            {item.products?.name || "Product Item"}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            SKU: {item.products?.sku || "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span className="font-bold text-foreground">Qty: {item.quantity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instant 1-Tap Status Advance Workflow for Mobile */}
              <div className="pt-3 border-t border-border/60 space-y-2">
                <p className="text-xs font-bold text-muted-foreground">
                  Quick Advance Status:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { status: "confirmed", label: "Confirmed" },
                    { status: "processing", label: "Packed & Ready" },
                    { status: "shipped", label: "Handed to Courier" },
                    { status: "delivered", label: "Delivered" },
                  ].map((s) => (
                    <Button
                      key={s.status}
                      type="button"
                      disabled={orderUpdating || orderDetails.status === s.status}
                      onClick={() => handleUpdateOrderStatus(s.status)}
                      className={`h-11 rounded-2xl text-xs font-bold gap-1 cursor-pointer ${
                        orderDetails.status === s.status
                          ? "bg-emerald-500 text-white"
                          : "bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{s.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!orderDetails && !loadingOrder && (
            <div className="flex flex-col items-center gap-2 rounded-3xl border border-border/60 bg-card/40 py-12 text-center text-muted-foreground">
              <ShoppingCart className="w-10 h-10 opacity-30" />
              <p className="text-sm font-semibold">Ready to scan order barcodes</p>
              <p className="text-xs opacity-70">
                Point camera at order slip QR code or enter order number to verify
              </p>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: Product / Serial Lookup Scanner */}
      {mode === "products" && (
        <div className="space-y-2.5">
          {productHistory.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-3xl border border-border/60 bg-card/40 py-12 text-center text-muted-foreground">
              <Barcode className="w-10 h-10 opacity-30" />
              <p className="text-sm font-semibold">Scan product barcodes or serial numbers</p>
              <p className="text-xs opacity-70">
                Scanned inventory units will verify in real time
              </p>
            </div>
          )}
          {productHistory.map((h, i) => (
            <div
              key={`${h.code}-${i}`}
              className="rounded-2xl border border-border/70 bg-card/80 p-3.5 flex items-center justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                {h.row ? (
                  <PackageCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <PackageX className="w-5 h-5 text-destructive shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-mono font-bold text-foreground truncate">
                    {h.code}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {h.row?.products?.name ?? "Unknown or unassigned serial code"}
                  </p>
                </div>
              </div>
              {h.row && (
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold capitalize ${
                      h.row.status === "available"
                        ? "bg-emerald-500/15 text-emerald-500"
                        : h.row.status === "sold"
                        ? "bg-blue-500/15 text-blue-500"
                        : h.row.status === "returned"
                        ? "bg-amber-500/15 text-amber-500"
                        : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {h.row.status}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
