import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@ui/components/ui/button";
import { Input } from "@ui/components/ui/input";
import { Label } from "@ui/components/ui/label";
import { Badge } from "@ui/components/ui/badge";
import {
  Truck,
  Search,
  PackageCheck,
  Send,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShieldCheck,
  Copy,
  Check,
  Phone,
  MapPin,
  Barcode
} from "lucide-react";
import { format } from "date-fns";

interface DispatchOrder {
  id: string;
  order_number: string;
  customer_name: string | null;
  guest_phone: string | null;
  shipping_address: any;
  total: number;
  shipping_fee?: number;
  status: string;
  payment_status: string;
  payment_method: string;
  order_source: string;
  created_at: string;
  courier_name?: string | null;
  consignment_id?: string | null;
  tracking_code?: string | null;
  is_delivery_prepaid?: boolean;
  delivery_prepaid_amount?: number;
  delivery_prepaid_trx?: string;
  cod_amount?: number;
}

const COURIER_PROVIDERS = [
  { id: "steadfast", name: "Steadfast Courier", defaultZone: "All Bangladesh (Cash on Delivery & Prepaid)" },
  { id: "pathao", name: "Pathao Logistics", defaultZone: "Express / Dhaka & Sadar Areas" },
  { id: "redx", name: "RedX Delivery", defaultZone: "Nationwide Doorstep Hubs" },
  { id: "paperfly", name: "Paperfly", defaultZone: "Union-Level Doorstep Delivery" },
  { id: "in_house", name: "In-House Rider", defaultZone: "Local Instant Express" },
];

export function CourierDispatch() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCourier, setSelectedCourier] = useState("steadfast");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState("");
  const [consignmentInput, setConsignmentInput] = useState("");
  const [customCodAmount, setCustomCodAmount] = useState<number | undefined>(undefined);
  const [isPrepaidChecked, setIsPrepaidChecked] = useState<boolean>(false);
  const [filter, setFilter] = useState<"ready" | "dispatched" | "all">("ready");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: orders = [], isLoading, refetch } = useQuery<DispatchOrder[]>({
    queryKey: ["dispatch-orders", filter, search],
    queryFn: async () => {
      let q = (supabase as any)
        .from("orders")
        .select("id, order_number, customer_name, guest_phone, shipping_address, total, shipping_fee, status, payment_status, payment_method, order_source, created_at, courier_name, consignment_id, tracking_code, is_delivery_prepaid, delivery_prepaid_amount, delivery_prepaid_trx, cod_amount")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filter === "ready") {
        q = q.in("status", ["confirmed", "processing", "pending"]);
      } else if (filter === "dispatched") {
        q = q.in("status", ["shipped", "delivered"]);
      }

      if (search.trim()) {
        q = q.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,guest_phone.ilike.%${search}%`);
      }

      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const dispatchMutation = useMutation({
    mutationFn: async ({
      orderId,
      courierName,
      trackingCode,
      consignmentId,
      codAmount,
    }: {
      orderId: string;
      courierName: string;
      trackingCode: string;
      consignmentId?: string;
      codAmount?: number;
    }) => {
      const { error } = await (supabase as any)
        .from("orders")
        .update({
          status: "shipped",
          courier_name: courierName,
          tracking_code: trackingCode || null,
          consignment_id: consignmentId || null,
          cod_amount: codAmount !== undefined ? codAmount : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Order Dispatched Successfully", {
        description: "Courier tracking information updated.",
      });
      setSelectedOrderId(null);
      setTrackingInput("");
      setConsignmentInput("");
      qc.invalidateQueries({ queryKey: ["dispatch-orders"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err: any) => {
      toast.error("Dispatch Failed", { description: err.message });
    },
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4 pt-1 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 font-display">
            <Truck className="w-6 h-6 text-primary" />
            <span>Courier Dispatch</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Assign Steadfast, Pathao & RedX tracking codes and confirm courier parcel handoff
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="rounded-xl h-8.5 px-3 text-xs gap-1.5 bg-card hover:bg-muted self-start sm:self-center"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Single-Line Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order number (#1001), customer, or phone…"
            className="h-10 rounded-xl pl-10 text-xs sm:text-sm bg-card border-border/70"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="h-10 px-3 rounded-xl bg-card border border-border/80 text-xs text-foreground font-semibold cursor-pointer"
          >
            <option value="ready">Ready to Ship</option>
            <option value="dispatched">Dispatched</option>
            <option value="all">All Orders</option>
          </select>
        </div>
      </div>

      {/* Order Dispatch Queue */}
      <div className="space-y-3 pt-1">
        {isLoading && (
          <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Loading dispatch list…</p>
          </div>
        )}

        {!isLoading && orders.length === 0 && (
          <div className="text-center py-14 border border-border/70 rounded-2xl bg-card/40 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground text-sm">No orders found</p>
            <p>All pending shipments have been handed to couriers.</p>
          </div>
        )}

        {orders.map((order) => {
          const isSelected = selectedOrderId === order.id;
          const isShipped = order.status === "shipped" || order.status === "delivered";

          return (
            <div
              key={order.id}
              className={`rounded-2xl border transition-all bg-card ${
                isSelected ? "border-primary shadow-md ring-1 ring-primary/20" : "border-border/70 hover:border-border"
              }`}
            >
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground text-sm">{order.order_number}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase font-bold px-2 py-0.2 ${
                        isShipped
                          ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {order.status}
                    </Badge>
                    {order.courier_name && (
                      <span className="text-[11px] font-semibold text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/40 capitalize">
                        {order.courier_name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="font-semibold text-foreground">{order.customer_name || "Guest Customer"}</span>
                    {order.guest_phone && (
                      <>
                        <span className="text-border">•</span>
                        <span className="font-mono">{order.guest_phone}</span>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground tabular-nums">৳{Number(order.total || 0).toLocaleString()}</p>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(order.created_at), "MMM d, h:mm a")}</span>
                  </div>

                  {!isShipped ? (
                    <Button
                      size="sm"
                      onClick={() => setSelectedOrderId(isSelected ? null : order.id)}
                      className={`h-9 px-3.5 rounded-xl text-xs font-bold gap-1.5 cursor-pointer ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>{isSelected ? "Cancel" : "Dispatch"}</span>
                    </Button>
                  ) : (
                    order.tracking_code && (
                      <button
                        type="button"
                        onClick={() => handleCopy(order.tracking_code!, order.id)}
                        className="px-2.5 py-1 rounded-lg bg-muted/40 text-muted-foreground hover:text-foreground text-xs font-mono flex items-center gap-1.5 border border-border/50"
                        title="Copy tracking code"
                      >
                        {copiedId === order.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{order.tracking_code}</span>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Dispatch Form Expansion */}
              {isSelected && (
                <div className="p-4 border-t border-border/60 bg-muted/10 space-y-4 animate-in fade-in">
                  {/* Financial & Pre-paid Summary Banner */}
                  <div className="p-3 rounded-xl bg-card border border-border/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">Order Total: ৳{order.total.toLocaleString()}</span>
                        {order.shipping_fee ? (
                          <span className="text-muted-foreground">(Delivery Fee: ৳{order.shipping_fee})</span>
                        ) : null}
                      </div>
                      {order.is_delivery_prepaid && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Delivery Fee Pre-Paid via MFS
                          {order.delivery_prepaid_trx ? ` (Trx ID: ${order.delivery_prepaid_trx})` : ""}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[11px] uppercase font-mono font-bold">
                        {order.payment_method} ({order.payment_status})
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground">Select Partner</Label>
                      <select
                        value={selectedCourier}
                        onChange={(e) => setSelectedCourier(e.target.value)}
                        className="w-full h-10 rounded-xl bg-card border border-border/80 px-3 text-xs text-foreground font-semibold"
                      >
                        {COURIER_PROVIDERS.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground">Tracking / Waybill ID</Label>
                      <Input
                        value={trackingInput}
                        onChange={(e) => setTrackingInput(e.target.value)}
                        placeholder="e.g. STDF-982734 or Waybill #"
                        className="h-10 rounded-xl bg-card text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground">Consignment ID (Optional)</Label>
                      <Input
                        value={consignmentInput}
                        onChange={(e) => setConsignmentInput(e.target.value)}
                        placeholder="e.g. CS-98214"
                        className="h-10 rounded-xl bg-card text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* COD & Pre-paid Delivery Controls */}
                  <div className="p-3 rounded-xl bg-card/80 border border-border/70 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                        <input
                          type="checkbox"
                          checked={isPrepaidChecked}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setIsPrepaidChecked(checked);
                            const fee = order.delivery_prepaid_amount || order.shipping_fee || 0;
                            const newCod = checked ? Math.max(0, order.total - fee) : order.total;
                            setCustomCodAmount(order.payment_status === "paid" ? 0 : newCod);
                          }}
                          className="w-4 h-4 rounded accent-primary cursor-pointer"
                        />
                        <span>Delivery Charge Pre-paid (Deduct ৳{order.delivery_prepaid_amount || order.shipping_fee || 0} from COD)</span>
                      </label>

                      {order.payment_status === "paid" && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                          Full Order Paid (COD = ৳0)
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-foreground">COD Amount to Collect (৳)</Label>
                        <Input
                          type="number"
                          value={customCodAmount ?? (
                            order.payment_status === "paid"
                              ? 0
                              : order.is_delivery_prepaid || isPrepaidChecked
                              ? Math.max(0, order.total - (order.delivery_prepaid_amount || order.shipping_fee || 0))
                              : order.total
                          )}
                          onChange={(e) => setCustomCodAmount(Number(e.target.value))}
                          placeholder="e.g. 1000"
                          className="h-9 rounded-xl font-mono font-bold text-xs bg-background"
                        />
                        <p className="text-[10px] text-muted-foreground">Amount driver will collect at customer's doorstep.</p>
                      </div>

                      <div className="flex items-center text-xs text-muted-foreground p-2 rounded-lg bg-muted/40 border border-border/40 self-end">
                        <span>
                          {order.payment_status === "paid" ? (
                            "Customer paid full bill online/MFS. Courier COD is set to ৳0."
                          ) : (isPrepaidChecked || order.is_delivery_prepaid) ? (
                            `Delivery fee (৳${order.delivery_prepaid_amount || order.shipping_fee || 0}) is deducted. Driver collects ৳${customCodAmount ?? Math.max(0, order.total - (order.delivery_prepaid_amount || order.shipping_fee || 0))}.`
                          ) : (
                            `Standard COD: Driver collects full ৳${order.total} at doorstep.`
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrderId(null)}
                      className="h-9 rounded-xl text-xs bg-card"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={dispatchMutation.isPending}
                      onClick={() =>
                        dispatchMutation.mutate({
                          orderId: order.id,
                          courierName: selectedCourier,
                          trackingCode: trackingInput,
                          consignmentId: consignmentInput,
                          codAmount: customCodAmount ?? (
                            order.payment_status === "paid"
                              ? 0
                              : (order.is_delivery_prepaid || isPrepaidChecked)
                              ? Math.max(0, order.total - (order.delivery_prepaid_amount || order.shipping_fee || 0))
                              : order.total
                          ),
                        })
                      }
                      className="h-9 px-4 rounded-xl text-xs font-bold gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Confirm Courier Handoff</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
