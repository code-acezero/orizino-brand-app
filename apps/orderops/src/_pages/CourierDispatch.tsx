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
} from "lucide-react";

interface DispatchOrder {
  id: string;
  order_number: string;
  customer_name: string | null;
  guest_phone: string | null;
  shipping_address: any;
  total: number;
  status: string;
  payment_status: string;
  payment_method: string;
  order_source: string;
  created_at: string;
  courier_name?: string | null;
  consignment_id?: string | null;
  tracking_code?: string | null;
}

const COURIER_PROVIDERS = [
  { id: "steadfast", name: "Steadfast Courier", defaultZone: "All Bangladesh" },
  { id: "pathao", name: "Pathao Logistics", defaultZone: "Express / Dhaka & Sadar" },
  { id: "redx", name: "RedX Delivery", defaultZone: "Nationwide" },
  { id: "paperfly", name: "Paperfly", defaultZone: "Doorstep Delivery" },
  { id: "in_house", name: "In-House Rider", defaultZone: "Local Express" },
];

export function CourierDispatch() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCourier, setSelectedCourier] = useState("steadfast");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState("");
  const [consignmentInput, setConsignmentInput] = useState("");
  const [filter, setFilter] = useState<"ready" | "dispatched" | "all">("ready");

  const { data: orders = [], isLoading } = useQuery<DispatchOrder[]>({
    queryKey: ["dispatch-orders", filter, search],
    queryFn: async () => {
      let q = (supabase as any)
        .from("orders")
        .select("id, order_number, customer_name, guest_phone, shipping_address, total, status, payment_status, payment_method, order_source, created_at, courier_name, consignment_id, tracking_code")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filter === "ready") {
        q = q.in("status", ["confirmed", "packing", "ready_to_ship", "pending"]);
      } else if (filter === "dispatched") {
        q = q.in("status", ["dispatched", "in_transit", "shipped"]);
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
    }: {
      orderId: string;
      courierName: string;
      trackingCode: string;
      consignmentId?: string;
    }) => {
      const { error } = await (supabase as any)
        .from("orders")
        .update({
          status: "dispatched",
          courier_name: courierName,
          tracking_code: trackingCode || null,
          consignment_id: consignmentId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Order marked as Dispatched with tracking code");
      qc.invalidateQueries({ queryKey: ["dispatch-orders"] });
      setSelectedOrderId(null);
      setTrackingInput("");
      setConsignmentInput("");
    },
    onError: (e: any) => {
      toast.error("Dispatch Failed", { description: e.message });
    },
  });

  const handleQuickDispatch = (order: DispatchOrder) => {
    const courier = COURIER_PROVIDERS.find((c) => c.id === selectedCourier)?.name || selectedCourier;
    const generatedTracking = trackingInput.trim() || `${selectedCourier.toUpperCase().slice(0, 3)}-${order.order_number.replace(/\D/g, "").slice(-6) || Date.now().toString().slice(-6)}`;
    dispatchMutation.mutate({
      orderId: order.id,
      courierName: courier,
      trackingCode: generatedTracking,
      consignmentId: consignmentInput.trim() || undefined,
    });
  };

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  return (
    <div className="space-y-4 pt-1 pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-[22px] sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" /> Courier Dispatch
          </h1>
          <p className="text-sm text-muted-foreground">
            Consignment booking, parcel handover, and Steadfast / Pathao tracking sync
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-2xl bg-muted/60 p-1">
          <button
            onClick={() => setFilter("ready")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filter === "ready" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
            }`}
          >
            Ready to Ship
          </button>
          <button
            onClick={() => setFilter("dispatched")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filter === "dispatched" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
            }`}
          >
            Dispatched
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filter === "all" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
            }`}
          >
            All Orders
          </button>
        </div>
      </div>

      {/* Courier Partner Selection Grid */}
      <div className="rounded-3xl border border-border/60 bg-card p-4 space-y-3 shadow-xs">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Active Courier Partner
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {COURIER_PROVIDERS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCourier(c.id)}
              className={`p-3 rounded-2xl border text-left transition-all ${
                selectedCourier === c.id
                  ? "bg-primary/10 border-primary text-foreground font-semibold"
                  : "bg-muted/40 border-border/50 text-muted-foreground hover:bg-muted/70"
              }`}
            >
              <p className="text-xs leading-tight truncate font-semibold">{c.name}</p>
              <span className="text-[10px] text-muted-foreground block mt-0.5">{c.defaultZone}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order #, customer name or phone..."
          className="pl-10 h-11 rounded-2xl"
        />
      </div>

      {/* Orders List & Dispatch Action Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-2.5">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading orders for dispatch...</div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center rounded-3xl border border-border/60 bg-card text-muted-foreground text-sm">
              No orders found matching the criteria.
            </div>
          ) : (
            orders.map((order) => {
              const isSelected = selectedOrderId === order.id;
              const addr =
                typeof order.shipping_address === "string"
                  ? order.shipping_address
                  : order.shipping_address?.address_line || order.shipping_address?.city || "No address provided";

              return (
                <div
                  key={order.id}
                  onClick={() => {
                    setSelectedOrderId(order.id);
                    setTrackingInput(order.tracking_code || "");
                    setConsignmentInput(order.consignment_id || "");
                  }}
                  className={`p-4 rounded-3xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "border-border/60 bg-card hover:border-border"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{order.order_number}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {order.order_source || "online"}
                        </Badge>
                        <Badge
                          className={`text-[10px] ${
                            order.status === "dispatched" || order.status === "in_transit"
                              ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-600 border-amber-500/30"
                          }`}
                        >
                          {order.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {order.customer_name || "Guest"} · {order.guest_phone || "No phone"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{addr}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">৳{Number(order.total || 0).toLocaleString()}</p>
                      <span className="text-[10px] text-muted-foreground block font-mono">
                        {order.payment_method?.toUpperCase()}
                      </span>
                      {order.tracking_code && (
                        <span className="text-[10px] font-mono text-primary block mt-1">
                          TRK: {order.tracking_code}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Dispatch Action Panel */}
        <div className="rounded-3xl border border-border/60 bg-card p-4 sm:p-5 space-y-4 shadow-sm sticky top-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-primary" /> Dispatch Action Panel
          </h3>

          {selectedOrder ? (
            <div className="space-y-3.5">
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 text-xs space-y-1">
                <p className="font-bold text-foreground">{selectedOrder.order_number}</p>
                <p className="text-muted-foreground">{selectedOrder.customer_name} ({selectedOrder.guest_phone})</p>
                <p className="text-muted-foreground font-mono">Amount to collect: ৳{Number(selectedOrder.total || 0).toLocaleString()}</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Consignment ID (Optional)</Label>
                <Input
                  value={consignmentInput}
                  onChange={(e) => setConsignmentInput(e.target.value)}
                  placeholder="e.g. SF-8823419"
                  className="h-10 rounded-xl font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tracking Code / Parcel AWB</Label>
                <Input
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  placeholder="Auto-generated if left blank"
                  className="h-10 rounded-xl font-mono text-xs"
                />
              </div>

              <Button
                onClick={() => handleQuickDispatch(selectedOrder)}
                disabled={dispatchMutation.isPending}
                className="w-full h-11 rounded-2xl gap-2 font-semibold text-xs"
              >
                <Send className="w-4 h-4" />
                {dispatchMutation.isPending ? "Dispatching..." : `Hand Over to ${COURIER_PROVIDERS.find((c) => c.id === selectedCourier)?.name}`}
              </Button>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Select an order from the list on the left to configure dispatch and tracking.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
