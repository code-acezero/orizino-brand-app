"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine,
  Truck,
  PackageCheck,
  Printer,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Boxes,
  Phone,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
  Barcode,
  QrCode,
  Tag,
  ShieldCheck,
  Check,
  Copy,
  Receipt,
  FileText,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/lib/app-toast";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "packing"
  | "ready_to_ship"
  | "dispatched"
  | "in_transit"
  | "delivered"
  | "returned"
  | "cancelled";

interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  product_name: string;
  variant_title?: string;
  size?: string;
  color?: string;
  sku?: string;
  serial_number?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  scanned_verified?: boolean;
}

interface OrderRecord {
  id: string;
  order_number?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  shipping_address?: string;
  city?: string;
  zone?: string;
  payment_method?: string;
  payment_status?: string;
  total_amount: number;
  shipping_fee?: number;
  discount_amount?: number;
  status: OrderStatus;
  courier_name?: string;
  consignment_id?: string;
  tracking_code?: string;
  notes?: string;
  created_at: string;
  order_items?: OrderItem[];
}

export default function AdminOrderOps() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"queue" | "scanner" | "dispatch" | "returns" | "print">("queue");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  // Scanner Terminal States
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scannedHistory, setScannedHistory] = useState<Array<{ code: string; time: string; success: boolean; msg: string }>>([]);
  const [verifiedItemSkus, setVerifiedItemSkus] = useState<Record<string, boolean>>({});
  const scannerInputRef = useRef<HTMLInputElement>(null);

  // Fetch real orders from database
  const { data: rawOrders, isLoading, refetch } = useQuery({
    queryKey: ["admin-orderops-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (*)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.warn("Failed to fetch orders, falling back:", error);
        return [];
      }
      return (data || []) as any[];
    },
    refetchInterval: 30000,
  });

  const orders: OrderRecord[] = (rawOrders || []) as any[];

  // Sound feedback simulation using Web Audio API
  const playTone = (type: "success" | "error" | "beep") => {
    try {
      if (typeof window === "undefined") return;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "success") {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === "error") {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(164.81, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.frequency.setValueAtTime(1046.5, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      }
    } catch {
      // AudioContext not allowed or unsupported
    }
  };

  // Status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const { error } = await supabase.from("orders").update({ status, updated_at: new Date().toISOString() } as any).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["admin-orderops-orders"] });
      playTone("success");
      toast.success(`Order status moved to ${status.toUpperCase()}`);
    },
    onError: (err: any) => {
      playTone("error");
      toast.error(err.message || "Failed to update order status");
    },
  });

  // Courier booking mutation
  const bookCourierMutation = useMutation({
    mutationFn: async ({ orderId, courierName }: { orderId: string; courierName: string }) => {
      const randomConsignment = `${courierName.toUpperCase().slice(0, 3)}-${Math.floor(100000 + Math.random() * 900000)}`;
      const { error } = await supabase.from("orders").update({
        courier_name: courierName,
        consignment_id: randomConsignment,
        status: "ready_to_ship",
        updated_at: new Date().toISOString(),
      } as any).eq("id", orderId);
      if (error) throw error;
      return randomConsignment;
    },
    onSuccess: (consignment) => {
      qc.invalidateQueries({ queryKey: ["admin-orderops-orders"] });
      playTone("success");
      toast.success(`Consignment created: ${consignment}`);
    },
    onError: (err: any) => {
      playTone("error");
      toast.error(err.message || "Failed to book courier");
    },
  });

  // Handle barcode submission (hardware gun or manual input)
  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = barcodeInput.trim();
    if (!raw) return;

    playTone("beep");
    const code = raw.toUpperCase();

    // 1. Search by Order ID or Order Number
    const matchedOrder = orders.find(
      (o) =>
        o.id.toUpperCase() === code ||
        o.id.toUpperCase().slice(0, 8) === code ||
        (o.order_number && o.order_number.toUpperCase() === code) ||
        (o.customer_phone && o.customer_phone.includes(code))
    );

    if (matchedOrder) {
      setSelectedOrder(matchedOrder);
      playTone("success");
      setScannedHistory((prev) => [
        { code, time: new Date().toLocaleTimeString(), success: true, msg: `Matched Order #${matchedOrder.order_number || matchedOrder.id.slice(0, 8)}` },
        ...prev.slice(0, 15),
      ]);
      setBarcodeInput("");
      return;
    }

    // 2. Search by Product SKU / Item Serial inside selected order
    if (selectedOrder && selectedOrder.order_items) {
      const matchedItem = selectedOrder.order_items.find(
        (it) => (it.sku && it.sku.toUpperCase() === code) || (it.serial_number && it.serial_number.toUpperCase() === code)
      );
      if (matchedItem) {
        setVerifiedItemSkus((prev) => ({ ...prev, [matchedItem.id]: true }));
        playTone("success");
        setScannedHistory((prev) => [
          { code, time: new Date().toLocaleTimeString(), success: true, msg: `Verified Item: ${matchedItem.product_name}` },
          ...prev.slice(0, 15),
        ]);
        setBarcodeInput("");
        toast.success(`Verified: ${matchedItem.product_name}`);
        return;
      }
    }

    // 3. Not found
    playTone("error");
    setScannedHistory((prev) => [
      { code, time: new Date().toLocaleTimeString(), success: false, msg: "No matching order or serial found" },
      ...prev.slice(0, 15),
    ]);
    toast.error(`Code ${code} not recognized`);
    setBarcodeInput("");
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = statusFilter === "all" ? true : o.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        o.id.toLowerCase().includes(q) ||
        (o.order_number && o.order_number.toLowerCase().includes(q)) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
        (o.customer_phone && o.customer_phone.toLowerCase().includes(q)) ||
        (o.shipping_address && o.shipping_address.toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
  }, [orders, statusFilter, searchQuery]);

  // Realtime KPIs
  const kpis = useMemo(() => {
    const total = orders.length;
    const pendingPack = orders.filter((o) => o.status === "confirmed" || o.status === "packing" || o.status === "pending").length;
    const readyShip = orders.filter((o) => o.status === "ready_to_ship").length;
    const inTransit = orders.filter((o) => o.status === "dispatched" || o.status === "in_transit").length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const returns = orders.filter((o) => o.status === "returned").length;
    return { total, pendingPack, readyShip, inTransit, delivered, returns };
  }, [orders]);

  // Copy to clipboard helper
  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header HUD */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">
                OrderOps Management Hub
              </h1>
              <p className="text-xs text-muted-foreground">
                High-velocity fulfillment, live barcode scanner terminal, courier dispatch & returns intake
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5 text-xs h-9 rounded-xl border-border/80"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Sync Live</span>
          </Button>

          <Button
            onClick={() => {
              setActiveTab("scanner");
              setTimeout(() => scannerInputRef.current?.focus(), 100);
            }}
            className="gap-1.5 text-xs h-9 rounded-xl bg-primary text-primary-foreground shadow-sm"
          >
            <Barcode className="w-4 h-4" />
            <span>Scanner Terminal</span>
          </Button>
        </div>
      </div>

      {/* Realtime KPI HUD Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-card/40 border-border/60 shadow-none p-3.5 rounded-2xl flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Pipeline</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-display text-foreground">{kpis.total}</span>
            <Boxes className="w-4 h-4 text-muted-foreground" />
          </div>
        </Card>

        <Card className="bg-amber-500/10 border-amber-500/30 shadow-none p-3.5 rounded-2xl flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-amber-500 uppercase tracking-wider">To Pack</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-display text-amber-500">{kpis.pendingPack}</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
        </Card>

        <Card className="bg-blue-500/10 border-blue-500/30 shadow-none p-3.5 rounded-2xl flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">Ready to Ship</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-display text-blue-400">{kpis.readyShip}</span>
            <PackageCheck className="w-4 h-4 text-blue-400" />
          </div>
        </Card>

        <Card className="bg-purple-500/10 border-purple-500/30 shadow-none p-3.5 rounded-2xl flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">In Transit</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-display text-purple-400">{kpis.inTransit}</span>
            <Truck className="w-4 h-4 text-purple-400" />
          </div>
        </Card>

        <Card className="bg-emerald-500/10 border-emerald-500/30 shadow-none p-3.5 rounded-2xl flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Delivered</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-display text-emerald-400">{kpis.delivered}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
        </Card>

        <Card className="bg-rose-500/10 border-rose-500/30 shadow-none p-3.5 rounded-2xl flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Returns / Hold</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-display text-rose-400">{kpis.returns}</span>
            <RotateCcw className="w-4 h-4 text-rose-400" />
          </div>
        </Card>
      </div>

      {/* Main Operational Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full bg-secondary/50 p-1 rounded-2xl h-auto">
          <TabsTrigger value="queue" className="rounded-xl text-xs py-2 gap-1.5">
            <Boxes className="w-3.5 h-3.5" />
            <span>Fulfillment Queue</span>
          </TabsTrigger>
          <TabsTrigger value="scanner" className="rounded-xl text-xs py-2 gap-1.5">
            <Barcode className="w-3.5 h-3.5 text-primary" />
            <span>Scanner Terminal</span>
          </TabsTrigger>
          <TabsTrigger value="dispatch" className="rounded-xl text-xs py-2 gap-1.5">
            <Truck className="w-3.5 h-3.5" />
            <span>Courier Dispatch</span>
          </TabsTrigger>
          <TabsTrigger value="print" className="rounded-xl text-xs py-2 gap-1.5">
            <Printer className="w-3.5 h-3.5" />
            <span>Thermal Slips & Labels</span>
          </TabsTrigger>
          <TabsTrigger value="returns" className="rounded-xl text-xs py-2 gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Returns & Intake</span>
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: FULFILLMENT QUEUE ───────────────────────── */}
        <TabsContent value="queue" className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search Order #, Customer, Phone, Address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl bg-card/40 border-border/70 text-xs"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: "all", label: "All" },
                { id: "pending", label: "Pending" },
                { id: "confirmed", label: "Confirmed" },
                { id: "packing", label: "Packing" },
                { id: "ready_to_ship", label: "Ready to Ship" },
                { id: "dispatched", label: "Dispatched" },
                { id: "delivered", label: "Delivered" },
                { id: "returned", label: "Returned" },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setStatusFilter(pill.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    statusFilter === pill.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Orders Table / Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order List */}
            <div className="lg:col-span-2 space-y-3">
              {filteredOrders.length === 0 ? (
                <div className="border border-dashed border-border/80 rounded-3xl p-12 text-center space-y-3">
                  <PackageCheck className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm font-semibold text-foreground">No orders in this queue</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    New storefront or offline orders will appear here automatically with live refresh.
                  </p>
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const isSelected = selectedOrder?.id === order.id;
                  return (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer select-none space-y-3 ${
                        isSelected
                          ? "border-primary bg-primary/[0.04] ring-1 ring-primary/40 shadow-md"
                          : "border-border/70 bg-card/40 hover:border-border hover:bg-card/70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-foreground">
                            #{order.order_number || order.id.slice(0, 8)}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg ${
                              order.status === "delivered"
                                ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                                : order.status === "ready_to_ship"
                                ? "border-blue-500/40 text-blue-400 bg-blue-500/10"
                                : order.status === "packing"
                                ? "border-amber-500/40 text-amber-500 bg-amber-500/10"
                                : "border-border text-muted-foreground"
                            }`}
                          >
                            {order.status.replace("_", " ")}
                          </Badge>
                        </div>

                        <div className="text-right">
                          <span className="font-mono text-sm font-bold text-foreground">
                            ৳{Number(order.total_amount || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>
                          <p className="font-semibold text-foreground truncate">{order.customer_name || "Customer"}</p>
                          <p className="font-mono text-[11px]">{order.customer_phone || "No phone"}</p>
                        </div>
                        <div className="sm:text-right">
                          <p className="truncate">{order.shipping_address || "Standard Delivery"}</p>
                          <p className="text-[11px] text-muted-foreground/70">
                            {new Date(order.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                          </p>
                        </div>
                      </div>

                      {/* Quick Pipeline Actions */}
                      <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {order.courier_name && (
                            <Badge variant="secondary" className="text-[10px] gap-1">
                              <Truck className="w-3 h-3 text-primary" />
                              {order.courier_name}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {order.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateStatusMutation.mutate({ orderId: order.id, status: "confirmed" });
                              }}
                              className="h-7 text-[11px] px-2.5 rounded-lg"
                            >
                              Confirm
                            </Button>
                          )}
                          {order.status === "confirmed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateStatusMutation.mutate({ orderId: order.id, status: "packing" });
                              }}
                              className="h-7 text-[11px] px-2.5 rounded-lg bg-amber-500/10 text-amber-500 border-amber-500/30"
                            >
                              Start Pack
                            </Button>
                          )}
                          {order.status === "packing" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateStatusMutation.mutate({ orderId: order.id, status: "ready_to_ship" });
                              }}
                              className="h-7 text-[11px] px-2.5 rounded-lg bg-blue-500/10 text-blue-400 border-blue-500/30"
                            >
                              Ready Ship
                            </Button>
                          )}
                          {order.status === "ready_to_ship" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateStatusMutation.mutate({ orderId: order.id, status: "dispatched" });
                              }}
                              className="h-7 text-[11px] px-2.5 rounded-lg bg-purple-500/10 text-purple-400 border-purple-500/30"
                            >
                              Dispatch
                            </Button>
                          )}
                          {order.status === "dispatched" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateStatusMutation.mutate({ orderId: order.id, status: "delivered" });
                              }}
                              className="h-7 text-[11px] px-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            >
                              Delivered
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Order Inspection Sidebar */}
            <div className="space-y-4">
              {selectedOrder ? (
                <Card className="border-border/80 bg-card/60 rounded-3xl p-5 space-y-5 sticky top-4 shadow-none">
                  <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-4">
                    <div>
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Selected Order</span>
                      <h3 className="text-lg font-bold font-mono text-foreground">
                        #{selectedOrder.order_number || selectedOrder.id.slice(0, 8)}
                      </h3>
                      <p className="text-xs text-muted-foreground">{selectedOrder.customer_name}</p>
                    </div>
                    <Badge className="capitalize text-xs">{selectedOrder.status.replace("_", " ")}</Badge>
                  </div>

                  {/* Customer Direct Channels */}
                  <div className="space-y-2 bg-secondary/30 p-3.5 rounded-2xl border border-border/50 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <div className="flex items-center gap-1 font-mono font-semibold">
                        <span>{selectedOrder.customer_phone || "N/A"}</span>
                        {selectedOrder.customer_phone && (
                          <button
                            onClick={() => copyText(selectedOrder.customer_phone!, "Phone")}
                            className="p-1 hover:text-primary transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Address:</span>
                      <span className="font-medium text-right max-w-[180px] truncate">{selectedOrder.shipping_address || "Standard"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Payment:</span>
                      <span className="font-semibold uppercase">{selectedOrder.payment_method || "COD"} ({selectedOrder.payment_status || "Pending"})</span>
                    </div>
                  </div>

                  {/* Order Items & Serial Tag Verification */}
                  <div className="space-y-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Order Items ({selectedOrder.order_items?.length || 0})</span>
                      <Barcode className="w-3.5 h-3.5 text-primary" />
                    </span>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {(selectedOrder.order_items || []).map((item) => {
                        const isVerified = verifiedItemSkus[item.id];
                        return (
                          <div
                            key={item.id}
                            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-colors ${
                              isVerified ? "border-emerald-500/40 bg-emerald-500/10" : "border-border/60 bg-card/40"
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">{item.product_name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                Qty: {item.quantity} · {item.size || "Free Size"} · {item.color || "Standard"}
                              </p>
                              {item.sku && <p className="font-mono text-[10px] text-muted-foreground">SKU: {item.sku}</p>}
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono font-bold text-foreground">৳{Number(item.unit_price).toLocaleString()}</span>
                              <div className="mt-1">
                                {isVerified ? (
                                  <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-500/40 gap-1 py-0">
                                    <Check className="w-2.5 h-2.5" /> Verified
                                  </Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setVerifiedItemSkus((prev) => ({ ...prev, [item.id]: true }));
                                      playTone("success");
                                      toast.success("Item verified");
                                    }}
                                    className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-primary"
                                  >
                                    Verify
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions & Print */}
                  <div className="pt-2 border-t border-border/50 flex flex-col gap-2">
                    <Button
                      onClick={() => {
                        setActiveTab("print");
                      }}
                      className="w-full h-9 rounded-xl gap-2 text-xs bg-primary text-primary-foreground"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Slip & 4x6 Label</span>
                    </Button>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveTab("dispatch");
                        }}
                        className="h-8 text-xs rounded-xl border-border/80"
                      >
                        <Truck className="w-3.5 h-3.5 mr-1" /> Book Courier
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (selectedOrder.customer_phone) {
                            window.open(`https://wa.me/${selectedOrder.customer_phone.replace(/\D/g, "")}`, "_blank");
                          } else {
                            toast.error("No phone number for WhatsApp");
                          }
                        }}
                        className="h-8 text-xs rounded-xl border-border/80"
                      >
                        <Send className="w-3.5 h-3.5 mr-1 text-emerald-500" /> WhatsApp
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
                <div className="border border-border/70 rounded-3xl p-8 text-center space-y-2 text-muted-foreground bg-card/20">
                  <SlidersHorizontal className="w-8 h-8 mx-auto opacity-40" />
                  <p className="text-xs font-semibold text-foreground">Select an order</p>
                  <p className="text-[11px]">Click on any order card to inspect items, verify garment serials, and generate slips.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 2: SCANNER TERMINAL ───────────────────────── */}
        <TabsContent value="scanner" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Scanner Input Panel */}
            <div className="lg:col-span-7 space-y-5">
              <Card className="border-border/80 bg-card/60 rounded-3xl p-6 space-y-5 shadow-none">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Barcode className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">Live Barcode & QR Terminal</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Scan invoice barcodes, packing slips, garment serial stickers, or customer phone numbers directly with your handheld scanner or keyboard.
                  </CardDescription>
                </div>

                <form onSubmit={handleBarcodeSubmit} className="space-y-4">
                  <div className="relative">
                    <Input
                      ref={scannerInputRef}
                      placeholder="Scan or type Barcode / Serial / Phone and press Enter..."
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      className="h-14 pl-4 pr-24 rounded-2xl bg-secondary/40 border-primary/40 focus-visible:ring-primary text-base font-mono font-bold tracking-wider"
                      autoFocus
                    />
                    <Button
                      type="submit"
                      className="absolute right-2 top-2 bottom-2 rounded-xl px-4 text-xs font-bold bg-primary text-primary-foreground"
                    >
                      Scan
                    </Button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Scanner Input Listener Active
                    </span>
                    <span className="font-mono text-[11px]">Auto-Detecting 1D/2D Barcodes</span>
                  </div>
                </form>

                {/* Quick Scan Test Triggers */}
                <div className="pt-4 border-t border-border/50 space-y-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Fast Scan Simulators:</span>
                  <div className="flex flex-wrap gap-2">
                    {orders.slice(0, 4).map((o) => (
                      <Button
                        key={o.id}
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setBarcodeInput(o.order_number || o.id.slice(0, 8));
                          setTimeout(() => handleBarcodeSubmit(), 50);
                        }}
                        className="text-xs h-7 rounded-lg font-mono"
                      >
                        #{o.order_number || o.id.slice(0, 8)}
                      </Button>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Scanned Activity History Log */}
              <Card className="border-border/80 bg-card/40 rounded-3xl p-5 space-y-3 shadow-none">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Terminal Activity Log</span>
                {scannedHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 py-4 text-center">No scans recorded in this session yet.</p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {scannedHistory.map((h, i) => (
                      <div
                        key={i}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 font-mono ${
                          h.success ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400" : "border-rose-500/30 bg-rose-500/5 text-rose-400"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {h.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                          <span className="font-bold">{h.code}</span>
                          <span className="text-[11px] text-muted-foreground font-sans truncate">{h.msg}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{h.time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Matched Order Preview */}
            <div className="lg:col-span-5 space-y-4">
              {selectedOrder ? (
                <Card className="border-border/80 bg-card/60 rounded-3xl p-5 space-y-4 shadow-none">
                  <div className="flex items-center justify-between border-b border-border/50 pb-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Active Terminal Target
                    </span>
                    <Badge className="text-[10px] uppercase font-bold">{selectedOrder.status.replace("_", " ")}</Badge>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-mono text-lg font-bold text-foreground">
                      #{selectedOrder.order_number || selectedOrder.id.slice(0, 8)}
                    </h3>
                    <p className="text-sm font-semibold text-foreground">{selectedOrder.customer_name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{selectedOrder.customer_phone}</p>
                    <p className="text-xs text-muted-foreground pt-1">{selectedOrder.shipping_address}</p>
                  </div>

                  <div className="pt-3 border-t border-border/50 space-y-2">
                    <span className="text-xs font-semibold text-foreground">Items to Pack:</span>
                    <div className="space-y-1.5">
                      {(selectedOrder.order_items || []).map((it) => (
                        <div key={it.id} className="p-2 rounded-xl bg-secondary/30 border border-border/40 text-xs flex justify-between">
                          <span>{it.product_name} (x{it.quantity})</span>
                          <span className="font-mono font-bold">৳{it.unit_price}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/50 flex gap-2">
                    <Button
                      onClick={() => updateStatusMutation.mutate({ orderId: selectedOrder.id, status: "ready_to_ship" })}
                      className="flex-1 rounded-xl h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      <PackageCheck className="w-3.5 h-3.5 mr-1" /> Mark Pack Complete
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("print")}
                      className="rounded-xl h-9 text-xs px-3"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="border border-border/70 rounded-3xl p-10 text-center space-y-3 bg-card/20 text-muted-foreground">
                  <ScanLine className="w-10 h-10 mx-auto opacity-40 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Awaiting Scan Input</p>
                  <p className="text-xs max-w-xs mx-auto">Scan any barcode to load order data directly into the inspection cockpit.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 3: COURIER DISPATCH ───────────────────────── */}
        <TabsContent value="dispatch" className="space-y-5">
          <Card className="border-border/80 bg-card/60 rounded-3xl p-6 space-y-5 shadow-none">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                Courier Logistics & Consignment Booking Engine
              </CardTitle>
              <CardDescription className="text-xs">
                Direct booking with Steadfast, Pathao, Paperfly, and RedX logistics partners.
              </CardDescription>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {["Steadfast", "Pathao", "Paperfly", "RedX"].map((courier) => (
                <div key={courier} className="p-4 rounded-2xl border border-border/70 bg-card/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">{courier}</span>
                    <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">API Connected</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Automated tracking creation, pickup scheduling & COD sync.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!selectedOrder}
                    onClick={() => {
                      if (selectedOrder) {
                        bookCourierMutation.mutate({ orderId: selectedOrder.id, courierName: courier });
                      }
                    }}
                    className="w-full text-xs h-8 rounded-xl border-border/80 hover:border-primary/50"
                  >
                    Book with {courier}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* ── TAB 4: THERMAL SLIPS & LABELS ──────────────────── */}
        <TabsContent value="print" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 space-y-4">
              <Card className="border-border/80 bg-card/60 rounded-3xl p-5 space-y-4 shadow-none">
                <CardTitle className="text-base flex items-center gap-2">
                  <Printer className="w-4 h-4 text-primary" /> Print Options & Layout
                </CardTitle>
                <div className="space-y-2 text-xs">
                  <p className="text-muted-foreground">Select print format for thermal POS roll (80mm) or shipping sticker (4x6 AWB):</p>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => window.print()}
                      className="rounded-xl h-10 text-xs font-bold gap-1.5"
                    >
                      <Receipt className="w-4 h-4 text-primary" /> Print 80mm POS Slip
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.print()}
                      className="rounded-xl h-10 text-xs font-bold gap-1.5"
                    >
                      <Tag className="w-4 h-4 text-primary" /> Print 4x6 AWB Label
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            {/* Thermal Print Slip Preview */}
            <div className="lg:col-span-6">
              <div className="bg-white text-black p-6 rounded-3xl shadow-xl max-w-sm mx-auto font-mono text-xs space-y-4 border border-zinc-300 select-none">
                <div className="text-center space-y-1 border-b border-dashed border-zinc-400 pb-3">
                  <h4 className="text-base font-black tracking-widest uppercase">ORIZINO</h4>
                  <p className="text-[10px] text-zinc-600">The Mark of What's Next · Dhaka Atelier</p>
                  <p className="text-[10px] text-zinc-600">www.orizino.com · +880 1800-000000</p>
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>ORDER:</span>
                    <span className="font-bold">#{selectedOrder?.order_number || selectedOrder?.id.slice(0, 8) || "ORZ-8849"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DATE:</span>
                    <span>{new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CUSTOMER:</span>
                    <span className="font-bold truncate max-w-[140px]">{selectedOrder?.customer_name || "Azim Khan"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PHONE:</span>
                    <span>{selectedOrder?.customer_phone || "+880 1812-345678"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ADDRESS:</span>
                    <span className="truncate max-w-[140px]">{selectedOrder?.shipping_address || "Banani, Dhaka"}</span>
                  </div>
                </div>

                <div className="border-t border-b border-dashed border-zinc-400 py-2 space-y-1 text-[11px]">
                  <div className="flex justify-between font-bold text-[10px] pb-1 border-b border-zinc-200">
                    <span>ITEM</span>
                    <span>QTY</span>
                    <span>PRICE</span>
                  </div>
                  {(selectedOrder?.order_items && selectedOrder.order_items.length > 0 ? selectedOrder.order_items : [
                    { id: "1", product_name: "CYBERPUNK HOODIE", quantity: 1, unit_price: 3450 },
                    { id: "2", product_name: "OVERSIZED TEE", quantity: 2, unit_price: 1850 },
                  ]).map((it, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="truncate max-w-[150px]">{it.product_name}</span>
                      <span>x{it.quantity}</span>
                      <span>৳{Number(it.unit_price * it.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 text-right text-[11px]">
                  <div className="flex justify-between">
                    <span>SUBTOTAL:</span>
                    <span>৳{Number(selectedOrder?.total_amount || 7150).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm pt-1 border-t border-zinc-300">
                    <span>COD DUE:</span>
                    <span>৳{Number(selectedOrder?.total_amount || 7150).toLocaleString()}</span>
                  </div>
                </div>

                {/* Simulated Barcode at bottom */}
                <div className="text-center pt-2 border-t border-dashed border-zinc-400 space-y-1">
                  <div className="h-8 bg-zinc-900 mx-auto rounded flex items-center justify-center text-white text-[9px] tracking-[0.4em]">
                    |||||||||||||||||||||||||||||||||
                  </div>
                  <span className="text-[9px] tracking-widest font-mono">
                    *{selectedOrder?.order_number || selectedOrder?.id.slice(0, 8) || "ORZ-8849"}*
                  </span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 5: RETURNS & INTAKE ───────────────────────── */}
        <TabsContent value="returns" className="space-y-5">
          <Card className="border-border/80 bg-card/60 rounded-3xl p-6 space-y-5 shadow-none">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-primary" />
                Returns & Exchange Intake Desk
              </CardTitle>
              <CardDescription className="text-xs">
                Process customer returns, inspect garment condition (A-Grade Restock / B-Grade / Write-Off), and authorize replacements.
              </CardDescription>
            </div>

            <div className="border border-dashed border-border/80 rounded-2xl p-6 text-center space-y-3">
              <PackageCheck className="w-8 h-8 text-primary mx-auto" />
              <p className="text-sm font-semibold text-foreground">Scan Returned Package Barcode</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Scan the return parcel AWB to match original invoice, verify security serial seals, and update inventory counts.
              </p>
              <Button
                size="sm"
                onClick={() => {
                  setActiveTab("scanner");
                  setTimeout(() => scannerInputRef.current?.focus(), 100);
                }}
                className="text-xs rounded-xl bg-primary text-primary-foreground"
              >
                Open Return Scanner
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
