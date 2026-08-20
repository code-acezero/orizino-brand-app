import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listOrders, updateOrderStatus, type OrderRow } from "@/lib/orders";
import { generateInvoice, printInvoiceHtml, printThermalSlipHtml } from "@/lib/invoice";
import { lookupSerial } from "@/lib/serials";
import { supabase } from "@/lib/supabase";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { Input } from "@ui/components/ui/input";
import { Button } from "@ui/components/ui/button";
import { Badge } from "@ui/components/ui/badge";
import { toast } from "sonner";
import {
  Search,
  Printer,
  Mail,
  ChevronDown,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  PackageSearch,
  Check,
  RotateCcw,
  MessageCircle,
  ExternalLink,
  Truck,
  Box,
  User,
  Clock,
  Sparkles,
  FileText,
  ScanLine,
  CheckCircle2,
  Barcode,
  Trash2,
  X,
  PackageCheck
} from "lucide-react";
import { format } from "date-fns";
import { extractSerialCode } from "@orizino/shared";

const sb = supabase as any;

const STATUS_OPTIONS = [
  "all",
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const SOURCE_OPTIONS = ["all", "online", "offline", "page", "whatsapp", "tiktok", "instagram"];

const SOURCE_LABEL: Record<string, string> = {
  online: "Online Store",
  offline: "Offline Orders",
  page: "Facebook Page",
  whatsapp: "WhatsApp",
  tiktok: "TikTok Store",
  instagram: "Instagram DM",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  confirmed: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  processing: "bg-indigo-500/15 text-indigo-500 border-indigo-500/30",
  shipped: "bg-cyan-500/15 text-cyan-500 border-cyan-500/30",
  delivered: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

function OrderScannerModal({
  order,
  onClose,
}: {
  order: OrderRow;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [cameraActive, setCameraActive] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scannedSerials, setScannedSerials] = useState<
    { id?: string; serial_code: string; product_id: string; product_name: string }[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch full line items for this specific order
  const { data: orderDetails, isLoading } = useQuery({
    queryKey: ["orderops-order-details", order.id],
    queryFn: async () => {
      const { data, error } = await sb
        .from("orders")
        .select(`
          id, order_number, status, total,
          order_items (
            id, product_id, variant_id, product_name, quantity, unit_price,
            products ( name, sku, price )
          ),
          product_serials (
            id, serial_code, product_id
          )
        `)
        .eq("id", order.id)
        .maybeSingle();

      if (error || !data) return null;
      return data;
    },
  });

  const handleScan = async (rawInput: string) => {
    const code = extractSerialCode(rawInput) || rawInput.trim();
    if (!code) return;

    if (scannedSerials.some((s) => s.serial_code.toLowerCase() === code.toLowerCase())) {
      toast.warning(`Serial ${code} is already attached to this order.`);
      return;
    }

    try {
      const row = await lookupSerial(code);
      if (!row) {
        toast.error(`Serial "${code}" not found in inventory.`);
        return;
      }

      const matchingItem = (orderDetails?.order_items || []).find(
        (it: any) => it.product_id === row.product_id
      );

      if (!matchingItem) {
        toast.error(`Product "${row.products?.name || code}" is not part of this order.`);
        return;
      }

      setScannedSerials((prev) => [
        ...prev,
        {
          id: row.id,
          serial_code: row.serial_code,
          product_id: row.product_id,
          product_name: matchingItem.product_name || row.products?.name || "Product",
        },
      ]);
      toast.success(`✓ Scanned item: ${row.products?.name || code}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to lookup serial");
    }
  };

  const handleSaveAndConfirm = async (targetStatus = "confirmed") => {
    setIsSubmitting(true);
    try {
      for (const s of scannedSerials) {
        if (s.id) {
          await sb
            .from("product_serials")
            .update({
              sold_order_id: order.id,
              status: "sold",
              sold_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", s.id);
        }
      }

      await sb
        .from("orders")
        .update({
          status: targetStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      await sb.rpc("sync_stock_from_serials");
      await qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success(`Order #${order.order_number} verified and marked as ${targetStatus}!`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update order");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cameraActive) {
    return (
      <BarcodeScanner
        active
        defaultMode="qr"
        onToggle={() => setCameraActive(false)}
        onScan={(code) => handleScan(code)}
        overlayContent={
          <div className="text-white space-y-1">
            <p className="text-xs font-bold">Scanning for Order #{order.order_number}</p>
            <p className="text-[11px] text-white/70">
              {scannedSerials.length} item(s) scanned.
            </p>
          </div>
        }
      />
    );
  }

  const items = orderDetails?.order_items || [];
  const totalRequired = items.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 1), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-card w-full max-w-lg rounded-3xl border border-border/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-base font-bold text-foreground">
                Fulfill Order #{order.order_number}
              </h2>
              <p className="text-xs text-muted-foreground">
                Scan required product barcodes & QR codes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Launch Camera & Manual Input */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Button
              onClick={() => setCameraActive(true)}
              className="h-11 rounded-2xl text-xs font-bold gap-2 bg-primary text-primary-foreground shadow-xs cursor-pointer"
            >
              <ScanLine className="w-4 h-4" />
              <span>Open Camera Scanner</span>
            </Button>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualCode.trim()) {
                  handleScan(manualCode.trim());
                  setManualCode("");
                }
              }}
              className="flex items-center gap-1.5"
            >
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Type serial/barcode…"
                className="h-11 rounded-2xl text-xs font-mono uppercase bg-background"
              />
              <Button type="submit" size="sm" className="h-11 px-3 rounded-2xl font-bold cursor-pointer">
                Add
              </Button>
            </form>
          </div>

          {/* Required Items List */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Required Items ({scannedSerials.length} / {totalRequired} Scanned)
            </p>

            {isLoading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Loading items…</div>
            ) : (
              items.map((it: any) => {
                const assigned = scannedSerials.filter((s) => s.product_id === it.product_id);
                const isComplete = assigned.length >= it.quantity;

                return (
                  <div
                    key={it.id}
                    className={`p-3 rounded-2xl border ${
                      isComplete ? "border-emerald-500/40 bg-emerald-500/5" : "border-border/60 bg-secondary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground truncate max-w-[240px]">
                        {it.product_name || it.products?.name || "Product"}
                      </span>
                      <span className="font-mono font-semibold">
                        {assigned.length} / {it.quantity}
                      </span>
                    </div>

                    {assigned.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {assigned.map((s) => (
                          <span
                            key={s.serial_code}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-background border border-border/70 text-[11px] font-mono"
                          >
                            <span>{s.serial_code}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setScannedSerials((prev) => prev.filter((x) => x.serial_code !== s.serial_code))
                              }
                              className="text-muted-foreground hover:text-destructive cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border/60 flex items-center justify-between gap-2 bg-card">
          <Button variant="outline" onClick={onClose} className="rounded-xl h-10 text-xs font-bold">
            Cancel
          </Button>

          <Button
            onClick={() => handleSaveAndConfirm("confirmed")}
            disabled={isSubmitting}
            className="flex-1 rounded-xl h-10 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-md"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm Order &amp; Save</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: OrderRow }) {
  const [open, setOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const qc = useQueryClient();
  const [updating, setUpdating] = useState(false);

  const setStatus = async (status: string) => {
    setUpdating(true);
    try {
      await updateOrderStatus(order.id, status);
      toast.success(`Order ${order.order_number} marked as ${status}`);
      qc.invalidateQueries({ queryKey: ["orders"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const invoice = async (sendEmail: boolean) => {
    try {
      const r = await generateInvoice(order.id, sendEmail);
      if (!sendEmail) {
        printInvoiceHtml(r.invoice_html);
      } else {
        toast.success("Invoice sent via email");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to generate invoice");
    }
  };

  const phoneClean = order.guest_phone ? order.guest_phone.replace(/[^\d+]/g, "") : "";
  const whatsappUrl = phoneClean ? `https://wa.me/${phoneClean.replace(/^0/, "880").replace("+", "")}` : "";

  return (
    <>
      {scannerOpen && (
        <OrderScannerModal order={order} onClose={() => setScannerOpen(false)} />
      )}

      <div className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden transition-all hover:border-primary/40">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-3 p-4 text-left cursor-pointer active:bg-muted/30"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm sm:text-base font-bold font-mono text-foreground truncate">
                {order.order_number}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] px-2 py-0.5 capitalize font-bold ${
                  STATUS_COLOR[order.status] ?? "bg-muted text-muted-foreground"
                }`}
              >
                {order.status}
              </Badge>
              <span className="text-[11px] font-medium text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/40">
                {SOURCE_LABEL[order.order_source] ?? order.order_source}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-1 flex items-center gap-2">
              <span className="font-semibold text-foreground">{order.customer_name || "Guest Customer"}</span>
              {order.guest_phone && (
                <>
                  <span className="text-border">•</span>
                  <span className="font-mono">{order.guest_phone}</span>
                </>
              )}
            </p>
          </div>

          <div className="text-right shrink-0 flex items-center gap-3">
            <div>
              <p className="text-sm sm:text-base font-bold font-display text-foreground tabular-nums">
                ৳{Number(order.total).toLocaleString()}
              </p>
              <span className="text-[10px] text-muted-foreground block">
                {format(new Date(order.created_at), "MMM d, h:mm a")}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {open && (
          <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-3.5 bg-muted/10 animate-in fade-in">
            {/* Customer info & Quick Contacts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs bg-card p-3.5 rounded-xl border border-border/70">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-medium text-foreground truncate">{order.guest_phone || "N/A"}</span>
                </div>
                {order.guest_phone && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={`tel:${phoneClean}`}
                      className="p-1 rounded-md bg-secondary text-foreground hover:text-primary transition-colors text-[10px] flex items-center gap-1"
                      title="Call customer"
                    >
                      <Phone className="w-3 h-3" />
                    </a>
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors text-[10px] flex items-center gap-1"
                        title="WhatsApp customer"
                      >
                        <MessageCircle className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium text-foreground truncate">{order.guest_email || "N/A"}</span>
              </div>

              {order.shipping_address && (
                <div className="sm:col-span-2 flex items-start gap-2 pt-1 border-t border-border/40">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-muted-foreground">Delivery Address: </span>
                    <span className="font-medium text-foreground">
                      {typeof order.shipping_address === "string"
                        ? order.shipping_address
                        : [
                            order.shipping_address.address_line,
                            order.shipping_address.thana,
                            order.shipping_address.city,
                            order.shipping_address.postal_code,
                          ].filter(Boolean).join(", ") || "Address on file"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick status stepper switcher */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Advance Status:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.filter((s) => s !== "all").map((s) => (
                  <button
                    key={s}
                    disabled={updating || order.status === s}
                    onClick={() => void setStatus(s)}
                    className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      order.status === s
                        ? "bg-primary text-primary-foreground shadow-xs scale-105 font-bold"
                        : "bg-card border border-border/70 text-foreground hover:bg-muted active:scale-95"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons (Print, Email, Courier, and Product Scanner) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScannerOpen(true)}
                className="h-9 rounded-xl text-xs font-bold gap-1.5 bg-primary/10 text-primary border-primary/40 hover:bg-primary/20 cursor-pointer"
              >
                <ScanLine className="w-3.5 h-3.5" /> Scan Products
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void invoice(false)}
                className="h-9 rounded-xl text-xs font-semibold gap-1.5 bg-card hover:border-primary/40 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-primary" /> Print Invoice
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void invoice(true)}
                className="h-9 rounded-xl text-xs font-semibold gap-1.5 bg-card hover:border-primary/40 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-primary" /> Email Invoice
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  printThermalSlipHtml(order, []);
                }}
                className="h-9 rounded-xl text-xs font-semibold gap-1.5 bg-card hover:border-primary/40 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-primary" /> Thermal Slip
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export function Orders() {
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["orders", status, source, search],
    queryFn: () => listOrders({ status, source, search: search || undefined }),
  });

  const ordersList = data ?? [];
  const totalAmount = ordersList.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  return (
    <div className="space-y-4 pt-1 pb-10">
      {/* Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 font-display">
            <PackageSearch className="w-6 h-6 text-primary" />
            <span>Orders Directory</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cross-channel order queue, packaging states, product serial scanning & customer dispatches
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <div className="text-xs bg-muted/40 px-3 py-1.5 rounded-xl border border-border/70 flex items-center gap-2">
            <span className="text-muted-foreground font-medium">
              Orders: <b className="text-foreground">{ordersList.length}</b>
            </span>
            <span className="text-border">•</span>
            <span className="text-muted-foreground font-medium">
              Sum: <b className="text-foreground tabular-nums">৳{totalAmount.toLocaleString()}</b>
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="rounded-xl h-8.5 px-3 text-xs gap-1.5 bg-card hover:bg-muted cursor-pointer font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Unified Single-Line Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order number (#1001), phone, or customer…"
            className="h-10 rounded-xl pl-10 text-xs sm:text-sm bg-card border-border/70"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 px-3 rounded-xl bg-card border border-border/80 text-xs text-foreground font-semibold cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="h-10 px-3 rounded-xl bg-card border border-border/80 text-xs text-foreground font-semibold cursor-pointer"
          >
            {SOURCE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All Sources" : SOURCE_LABEL[s] ?? s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {isLoading && (
          <div className="py-14 text-center text-xs text-muted-foreground space-y-2">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Loading orders directory…</p>
          </div>
        )}

        {!isLoading && ordersList.length === 0 && (
          <div className="text-center py-16 border border-border/70 rounded-3xl bg-card/40 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-sm text-foreground">No orders found</p>
            <p>Try adjusting your search query or status filter.</p>
          </div>
        )}

        {ordersList.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  );
}
