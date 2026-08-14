"use client";
import React, { useState, useMemo } from "react";
import { Link } from "@/lib/router-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  ChevronRight,
  Clock,
  ChevronDown,
  ChevronUp,
  Truck,
  XCircle,
  RotateCcw,
  ScanLine,
  Copy,
  ExternalLink,
  Check,
  Search,
  Filter,
  ArrowRight,
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  CreditCard,
  MapPin,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import OrderTrackingTimeline from "@/components/OrderTrackingTimeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/lib/app-toast";
import { requestOrderCancellation, requestOrderReturn } from "@/lib/order-workflows.functions";

interface ReasonRow {
  id: string;
  kind: "cancel" | "return";
  label: string;
  description?: string | null;
  sort_order: number;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  confirmed: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  processing: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  shipped: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  out_for_delivery: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  delivered: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  cancelled: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
  cancellation_requested: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
  return_requested: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
  returned: "bg-muted text-muted-foreground border-border",
  refunded: "bg-muted text-muted-foreground border-border",
};

const CANCELLABLE = new Set(["pending", "confirmed"]);
const RETURNABLE = new Set(["delivered"]);

const prettyStatus = (s: string) => (s || "").replace(/_/g, " ");

const OrdersPage: React.FC = () => {
  useSeoMeta("orders", "My Orders | Store");
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const qc = useQueryClient();

  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [workflow, setWorkflow] = useState<{ orderId: string; orderNumber: string; kind: "cancel" | "return" } | null>(null);
  const [reasonId, setReasonId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: reasonOptions = [] } = useQuery({
    queryKey: ["order_reasons_public"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("order_reasons")
        .select("id, kind, label, description, sort_order")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as ReasonRow[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const localPlacedOrderNumbers = useMemo(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("orizino_placed_orders");
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }, []);

  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const urlTrackingToken = searchParams?.get("t") || null;
  const urlOrderNum = searchParams?.get("num") || null;

  const { data: rawOrders = [], isLoading } = useQuery({
    queryKey: ["orders", user?.id, localPlacedOrderNumbers, urlTrackingToken, urlOrderNum],
    queryFn: async () => {
      const selectFields = "*, order_items(*)";
      let results: any[] = [];

      const ordersTable = supabase.from("orders") as any;

      if (user?.id) {
        const { data: userOrders } = await ordersTable
          .select(selectFields)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (userOrders) results.push(...userOrders);
      }

      if (localPlacedOrderNumbers.length > 0) {
        const { data: guestOrders } = await ordersTable
          .select(selectFields)
          .in("order_number", localPlacedOrderNumbers)
          .order("created_at", { ascending: false });
        if (guestOrders) results.push(...guestOrders);
      }

      if (urlTrackingToken) {
        const { data: tokenOrders } = await ordersTable
          .select(selectFields)
          .eq("tracking_token", urlTrackingToken);
        if (tokenOrders) results.push(...tokenOrders);
      }

      if (urlOrderNum) {
        const { data: numOrders } = await ordersTable
          .select(selectFields)
          .eq("order_number", urlOrderNum);
        if (numOrders) results.push(...numOrders);
      }

      const map = new Map<string, any>();
      for (const item of results) {
        if (item?.id && !map.has(item.id)) {
          map.set(item.id, item);
        }
      }
      const finalOrders = Array.from(map.values());
      finalOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return finalOrders;
    },
    enabled: !!user || localPlacedOrderNumbers.length > 0 || !!urlTrackingToken || !!urlOrderNum,
  });

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return rawOrders.filter((order: any) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        order.order_number?.toLowerCase().includes(q) ||
        order.order_items?.some((i: any) => i.product_name?.toLowerCase().includes(q)) ||
        order.shipping_address?.full_name?.toLowerCase().includes(q)
      );

      const matchesStatus = statusFilter === "all" || (
        statusFilter === "in_progress" ? ["pending", "confirmed", "processing", "shipped", "out_for_delivery"].includes(order.status) :
        statusFilter === "delivered" ? order.status === "delivered" :
        statusFilter === "cancelled" ? ["cancelled", "cancellation_requested", "returned", "refunded"].includes(order.status) : true
      );

      return matchesSearch && matchesStatus;
    });
  }, [rawOrders, searchQuery, statusFilter]);

  // Order Counts metrics
  const orderMetrics = useMemo(() => {
    const total = rawOrders.length;
    const inProgress = rawOrders.filter((o: any) => ["pending", "confirmed", "processing", "shipped", "out_for_delivery"].includes(o.status)).length;
    const delivered = rawOrders.filter((o: any) => o.status === "delivered").length;
    const cancelled = rawOrders.filter((o: any) => ["cancelled", "returned", "refunded"].includes(o.status)).length;
    return { total, inProgress, delivered, cancelled };
  }, [rawOrders]);

  const toggleExpand = (id: string) => {
    setExpandedOrder((prev) => (prev === id ? null : id));
  };

  const copyOrderSerial = (e: React.MouseEvent, num: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(num);
    setCopiedId(num);
    toast({ title: "Order # copied to clipboard" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!workflow) return;
      const selected = reasonOptions.find((r) => r.id === reasonId);
      const composed = selected
        ? (reason.trim() ? `${selected.label}: ${reason.trim()}` : selected.label)
        : reason.trim();
      const payload = { order_id: workflow.orderId, reason: composed };
      if (workflow.kind === "cancel") {
        return requestOrderCancellation({ data: payload });
      }
      return requestOrderReturn({ data: payload });
    },
    onSuccess: () => {
      toast({ title: workflow?.kind === "cancel" ? "Cancellation submitted" : "Return submitted" });
      qc.invalidateQueries({ queryKey: ["orders", user?.id] });
      setWorkflow(null);
      setReason("");
      setReasonId("");
    },
    onError: (e: any) => toast({ title: "Failed to submit request", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="min-h-screen pb-20 lg:pb-12 bg-background/50">
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8 space-y-6">
        
        {/* Modern Header Banner */}
        <div className="border border-border/60 rounded-3xl p-6 sm:p-8 bg-card shadow-xs relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] font-mono border-border/80 text-muted-foreground bg-secondary/40">
                  Customer Workspace
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground tracking-tight">
                My Orders & Dispatches
              </h1>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Monitor live package dispatches, inspect order details, and request returns seamlessly.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
              <Link
                to="/track"
                className="inline-flex items-center gap-2 text-xs bg-foreground text-background hover:opacity-90 px-4 py-2.5 rounded-xl font-semibold transition-all shadow-xs"
              >
                <Truck className="w-4 h-4" />
                Live Tracking
              </Link>
              <Link
                to="/verify"
                className="inline-flex items-center gap-2 text-xs bg-secondary/80 hover:bg-secondary border border-border/60 text-foreground px-4 py-2.5 rounded-xl font-semibold transition-all"
              >
                <ScanLine className="w-4 h-4" />
                Verify Product
              </Link>
            </div>
          </div>

          {/* Metric Summary Bar */}
          {rawOrders.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-border/40">
              <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/40 space-y-0.5">
                <p className="text-[11px] text-muted-foreground font-medium">Total Orders</p>
                <p className="text-lg font-bold text-foreground tabular-nums">{orderMetrics.total}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-0.5">
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">In Progress</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400 tabular-nums">{orderMetrics.inProgress}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-0.5">
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Delivered</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{orderMetrics.delivered}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/40 space-y-0.5">
                <p className="text-[11px] text-muted-foreground font-medium">Cancelled / Returned</p>
                <p className="text-lg font-bold text-muted-foreground tabular-nums">{orderMetrics.cancelled}</p>
              </div>
            </div>
          )}
        </div>

        {/* Filter & Search Toolbar with Dropdown Select */}
        {rawOrders.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search orders by #, product name, or recipient..."
                className="pl-9 rounded-xl h-10 text-xs bg-card border-border/60"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 h-10 rounded-xl text-xs font-semibold bg-card border-border/60">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Filter Status" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                <SelectItem value="all">All Orders ({orderMetrics.total})</SelectItem>
                <SelectItem value="in_progress">In Progress ({orderMetrics.inProgress})</SelectItem>
                <SelectItem value="delivered">Delivered ({orderMetrics.delivered})</SelectItem>
                <SelectItem value="cancelled">Cancelled ({orderMetrics.cancelled})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Orders List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-border/60 rounded-2xl p-6 bg-card/60 animate-pulse space-y-4">
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-muted rounded w-32" />
                  <div className="h-4 bg-muted rounded w-20" />
                </div>
                <div className="h-12 bg-muted/50 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="border border-border/60 rounded-3xl p-12 bg-card text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
              <Package className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground">No Orders Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery || statusFilter !== "all"
                ? "No orders match your search or selected status filter."
                : "You haven't placed any orders yet. Browse our store collection to start shopping!"}
            </p>
            {searchQuery || statusFilter !== "all" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}
                className="rounded-xl text-xs font-semibold"
              >
                Clear Filters
              </Button>
            ) : (
              <Link
                to="/inventory"
                className="inline-flex items-center gap-2 bg-foreground text-background font-semibold px-6 py-2.5 rounded-xl text-xs shadow-xs hover:opacity-90 transition-opacity mt-2"
              >
                Explore Collection <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order: any) => {
              const isExpanded = expandedOrder === order.id;
              const items: any[] = order.order_items || [];

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-border/60 rounded-2xl bg-card overflow-hidden shadow-xs hover:border-border transition-all"
                >
                  {/* Order Top Bar */}
                  <div
                    onClick={() => toggleExpand(order.id)}
                    className="p-5 sm:p-6 cursor-pointer select-none space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/30 pb-3.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-sm font-bold text-foreground">#{order.order_number}</span>
                        <button
                          type="button"
                          onClick={(e) => copyOrderSerial(e, order.order_number)}
                          className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          title="Copy order number"
                        >
                          {copiedId === order.order_number ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <Badge variant="outline" className={`text-[10px] font-semibold border capitalize px-2.5 py-0.5 rounded-lg ${STATUS_STYLES[order.status] || "bg-secondary text-foreground"}`}>
                          {prettyStatus(order.status)}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <span className="font-bold text-base text-foreground tabular-nums">{formatPrice(order.total)}</span>
                      </div>
                    </div>

                    {/* Timeline Tracker */}
                    <OrderTrackingTimeline
                      status={order.status}
                      trackingNumber={order.tracking_number}
                      updatedAt={order.updated_at}
                    />

                    <div className="flex items-center justify-between text-xs font-semibold text-foreground pt-1 border-t border-border/30">
                      <span className="flex items-center gap-1.5 text-muted-foreground group-hover:text-foreground transition-colors">
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>{items.length} {items.length === 1 ? "Item" : "Items"}</span>
                      </span>
                      <span className="flex items-center gap-1 text-foreground">
                        {isExpanded ? "Collapse Details" : "Inspect Order"}
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Item Breakdown & Delivery Info */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border/40 bg-secondary/20 p-5 sm:p-6 space-y-5"
                      >
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Ordered Items</h4>
                          <div className="space-y-2.5">
                            {items.map((item: any) => (
                              <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40">
                                <img
                                  src={item.product_image || "/placeholder.svg"}
                                  alt=""
                                  className="w-12 h-12 rounded-lg object-cover border border-border/40 shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-foreground truncate">{item.product_name}</p>
                                  <p className="text-[11px] text-muted-foreground">Qty: {item.quantity} · {formatPrice(item.unit_price)} each</p>
                                </div>
                                <span className="text-xs font-bold text-foreground tabular-nums shrink-0">{formatPrice(item.total_price)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Order Summary & Address Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/40 text-xs">
                          <div className="space-y-1.5 p-3.5 rounded-xl bg-card border border-border/40">
                            <p className="font-semibold text-foreground flex items-center gap-1.5 mb-1">
                              <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> Shipping Destination
                            </p>
                            <p className="text-foreground font-medium">{order.shipping_address?.full_name || user?.email}</p>
                            <p className="text-muted-foreground">
                              {[order.shipping_address?.street, order.shipping_address?.city, order.shipping_address?.state, order.shipping_address?.country]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                            {order.shipping_address?.phone && (
                              <p className="text-muted-foreground font-mono">{order.shipping_address.phone}</p>
                            )}
                          </div>

                          <div className="space-y-1.5 p-3.5 rounded-xl bg-card border border-border/40">
                            <p className="font-semibold text-foreground flex items-center gap-1.5 mb-1">
                              <CreditCard className="w-3.5 h-3.5 text-muted-foreground" /> Payment Information
                            </p>
                            <div className="flex justify-between text-muted-foreground">
                              <span>Method</span>
                              <span className="font-semibold text-foreground uppercase">{order.payment_method || "COD"}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                              <span>Payment Status</span>
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize">{order.payment_status || "Unpaid"}</span>
                            </div>
                            <div className="flex justify-between text-foreground font-bold border-t border-border/40 pt-1.5 mt-1">
                              <span>Total Paid / Due</span>
                              <span className="tabular-nums">{formatPrice(order.total)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/40 text-xs">
                          <Link
                            to={`/track?q=${order.order_number}`}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background font-semibold text-xs shadow-xs hover:opacity-90 transition-opacity"
                          >
                            <Truck className="w-4 h-4" /> Track Live Dispatch <ArrowRight className="w-3.5 h-3.5" />
                          </Link>

                          <div className="flex items-center gap-2">
                            {CANCELLABLE.has(order.status) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl text-xs font-semibold border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setWorkflow({ kind: "cancel", orderId: order.id, orderNumber: order.order_number });
                                  setReason("");
                                  setReasonId("");
                                }}
                              >
                                <XCircle className="w-3.5 h-3.5 mr-1.5" /> Cancel Order
                              </Button>
                            )}
                            {RETURNABLE.has(order.status) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl text-xs font-semibold border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setWorkflow({ kind: "return", orderId: order.id, orderNumber: order.order_number });
                                  setReason("");
                                  setReasonId("");
                                }}
                              >
                                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Request Return
                              </Button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

      </main>

      {/* Cancellation / Return Request Dialog */}
      <Dialog open={!!workflow} onOpenChange={(o) => !o && setWorkflow(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {workflow?.kind === "cancel" ? "Cancel Order" : "Return Request"} #{workflow?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">Please select a reason for your request:</p>
            {reasonOptions.filter((r) => r.kind === (workflow?.kind === "cancel" ? "cancel" : "return")).length > 0 && (
              <RadioGroup value={reasonId} onValueChange={setReasonId} className="space-y-2">
                {reasonOptions
                  .filter((r) => r.kind === (workflow?.kind === "cancel" ? "cancel" : "return"))
                  .map((r) => (
                    <div key={r.id} className="flex items-center space-x-2 border border-border/50 rounded-xl p-3 hover:border-foreground/40 transition-colors">
                      <RadioGroupItem value={r.id} id={r.id} />
                      <Label htmlFor={r.id} className="text-xs font-medium text-foreground cursor-pointer flex-1">
                        {r.label}
                      </Label>
                    </div>
                  ))}
              </RadioGroup>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Additional Details (Optional)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain any details regarding your request..."
                rows={3}
                className="rounded-xl text-xs border-border/60"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setWorkflow(null)} className="rounded-xl text-xs font-semibold">Cancel</Button>
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="rounded-xl text-xs font-semibold"
            >
              {submitMutation.isPending ? "Submitting..." : "Confirm Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdersPage;
