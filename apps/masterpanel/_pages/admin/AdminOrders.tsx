"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useTabParam } from "@/hooks/use-tab-param";
import {
  Eye,
  Trash2,
  FileText,
  Printer,
  CheckCircle2,
  XCircle,
  Mail,
  Smartphone,
  ShoppingBag,
  Truck,
  RotateCcw,
  SlidersHorizontal,
  Search,
  X,
  RefreshCw,
  Clock,
  Package,
  Calendar,
  CreditCard,
  User,
  Phone,
  Check,
  ChevronDown,
  Download,
  Image as ImageIcon,
  Layers,
  FileCheck,
} from "lucide-react";
import OrderGoogleDocs from "@/components/admin/OrderGoogleDocs";
import PageHeader from "@/components/admin/PageHeader";
import { TableLoadingRow, TableEmptyRow } from "@/components/admin/TableStates";
import CardGridSkeleton from "@/components/skeletons/CardGridSkeleton";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/lib/app-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { format, isToday, isWithinInterval, subDays, startOfMonth } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import type { Tables } from "@/integrations/supabase/types";
import AdminPaymentProofs from "@/components/admin/AdminPaymentProofs";
import CourierPushDialog from "@/components/admin/CourierPushDialog";
import ManualTrackingSection from "@/components/admin/ManualTrackingSection";
import { decideCancellation, decideReturn } from "@/lib/order-workflows.functions";
import { printOrderDocuments, exportOrderPdf, exportOrderJpg } from "@/lib/invoice-export-utils";
import { emailOrderInvoice } from "@/lib/order-invoice-email.functions";

type Order = Tables<"orders">;

const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  confirmed: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  processing: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  shipped: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  delivered: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  cancelled: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

const returnStatusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  approved: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  rejected: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

interface FilterState {
  status: string;
  paymentMethod: string;
  courier: string;
  dateRange: "all" | "today" | "7days" | "month";
}

const DEFAULT_FILTERS: FilterState = {
  status: "all",
  paymentMethod: "all",
  courier: "all",
  dateRange: "all",
};

export default function AdminOrders() {
  const qc = useQueryClient();
  const { formatPrice } = useCurrency();
  const [tab, setTab] = useTabParam("orders", "/sales/orders");

  // Selection & Modal States
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [courierOpen, setCourierOpen] = useState(false);

  // Search & One-Button Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  // Returns & Cancellations selected items
  const [returnSel, setReturnSel] = useState<any>(null);
  const [cancelSel, setCancelSel] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [returnTracking, setReturnTracking] = useState<string>("");
  const [refundDeliveryCharge, setRefundDeliveryCharge] = useState<boolean>(false);
  const [refundMethod, setRefundMethod] = useState<string>("bkash");
  const [refundReference, setRefundReference] = useState<string>("");
  const [refundStatus, setRefundStatus] = useState<string>("pending");

  // 1. Fetch Orders
  const { data: orders = [], isLoading, refetch: refetchOrders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Order[];
    },
    staleTime: 10000,
  });

  // 2. Fetch Order Items for Selected Order
  const { data: orderItems = [] } = useQuery({
    queryKey: ["admin-order-items", selectedOrder?.id],
    queryFn: async () => {
      if (!selectedOrder) return [];
      const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", selectedOrder.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedOrder,
  });

  // 3. Fetch Returns
  const { data: returns = [], isLoading: rLoading } = useQuery({
    queryKey: ["admin-returns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("return_requests")
        .select("*, orders(order_number, total, subtotal, shipping_fee, payment_method, shipping_address)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 15000,
  });

  // 4. Fetch Cancellations
  const { data: cancellations = [], isLoading: cLoading } = useQuery({
    queryKey: ["admin-cancellations"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("cancellation_requests")
        .select("*, orders(order_number, total, payment_method, shipping_address)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 15000,
  });

  // 5. Fetch Pending Payment Proofs Count
  const { data: paymentProofs = [] } = useQuery({
    queryKey: ["admin-payment-proofs-count"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payment_proofs")
        .select("id, status")
        .eq("status", "pending");
      return data || [];
    },
    staleTime: 15000,
  });

  const [isSendingInvoice, setIsSendingInvoice] = useState(false);

  const handleSendInvoiceEmail = async (orderId: string, customTo?: string) => {
    setIsSendingInvoice(true);
    try {
      const res = await emailOrderInvoice({ data: { order_id: orderId, to: customTo } });
      if (res?.ok) {
        toast.success(`Invoice email successfully dispatched to ${res.to || "customer"}`);
      } else {
        toast.error(res?.error || "Failed to dispatch invoice email");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send invoice email");
    } finally {
      setIsSendingInvoice(false);
    }
  };

  // Mutations
  const updateStatus = useMutation({
    mutationFn: async ({ id, status, tracking }: { id: string; status: string; tracking?: string }) => {
      const update: any = { status, updated_at: new Date().toISOString() };
      if (tracking) update.tracking_number = tracking;
      const { error } = await supabase.from("orders").update(update).eq("id", id);
      if (error) throw error;

      // Automatically email invoice upon order confirmation / processing
      if (status === "confirmed" || status === "processing") {
        try {
          await emailOrderInvoice({ data: { order_id: id } });
        } catch (e) {
          console.warn("[admin-orders] Auto invoice email dispatch note:", e);
        }
      }
    },
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      if (status === "confirmed" || status === "processing") {
        toast.success("Order confirmed & invoice emailed to customer");
      } else {
        toast.success("Order status updated");
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkAction = useMutation({
    mutationFn: async ({ ids, action, status }: { ids: string[]; action: "delete" | "status"; status?: string }) => {
      if (action === "delete") {
        const { error: itemsErr } = await supabase.from("order_items").delete().in("order_id", ids);
        if (itemsErr) throw itemsErr;
        const { error } = await supabase.from("orders").delete().in("id", ids);
        if (error) throw error;
      } else if (action === "status" && status) {
        const { error } = await supabase
          .from("orders")
          .update({ status, updated_at: new Date().toISOString() })
          .in("id", ids);
        if (error) throw error;
      }
    },
    onSuccess: (_, { ids, action, status }) => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      setSelected(new Set());
      setBulkStatus(null);
      toast.success(
        action === "delete"
          ? `${ids.length} order${ids.length > 1 ? "s" : ""} deleted`
          : `${ids.length} order${ids.length > 1 ? "s" : ""} updated to ${status}`
      );
    },
    onError: (e: any) => toast.error(e.message),
  });

  const returnMutation = useMutation({
    mutationFn: (input: {
      id: string;
      decision: "approve" | "reject" | "complete";
      refund_delivery_charge?: boolean;
      refund_method?: string;
      refund_reference?: string;
      refund_status?: string;
      refund_amount?: number;
      return_tracking?: string;
      admin_notes?: string;
    }) =>
      decideReturn({
        data: {
          id: input.id,
          decision: input.decision,
          admin_notes: input.admin_notes ?? (adminNotes || undefined),
          return_tracking: input.return_tracking ?? (returnTracking || undefined),
          refund_amount: input.refund_amount ?? (refundAmount ? Number(refundAmount) : undefined),
          refund_delivery_charge: input.refund_delivery_charge ?? refundDeliveryCharge,
          refund_method: input.refund_method ?? refundMethod,
          refund_reference: input.refund_reference ?? (refundReference || undefined),
          refund_status: (input.refund_status ?? refundStatus) as any,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-returns"] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      setReturnSel(null);
      setAdminNotes("");
      setReturnTracking("");
      setRefundAmount("");
      setRefundReference("");
      toast.success("Return request updated");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update return"),
  });

  const cancelMutation = useMutation({
    mutationFn: (input: { id: string; decision: "approve" | "reject"; refund_approved?: boolean }) =>
      decideCancellation({
        data: {
          id: input.id,
          decision: input.decision,
          admin_notes: adminNotes || undefined,
          refund_approved: input.refund_approved,
          refund_amount: refundAmount ? Number(refundAmount) : undefined,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-cancellations"] });
      setCancelSel(null);
      setAdminNotes("");
      setRefundAmount("");
      toast.success("Cancellation request updated");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update cancellation"),
  });

  // Filter count & active check
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.status !== "all") count++;
    if (filters.paymentMethod !== "all") count++;
    if (filters.courier !== "all") count++;
    if (filters.dateRange !== "all") count++;
    return count;
  }, [filters]);

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery("");
    setSelected(new Set());
  };

  // Filtered Orders calculation
  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter((o) => {
      // 1. Status Filter
      if (filters.status !== "all" && o.status !== filters.status) return false;

      // 2. Payment Method Filter
      if (filters.paymentMethod !== "all") {
        const pm = (o.payment_method || "").toLowerCase();
        if (filters.paymentMethod === "cod" && !pm.includes("cod") && !pm.includes("cash")) return false;
        if (filters.paymentMethod === "bkash" && !pm.includes("bkash")) return false;
        if (filters.paymentMethod === "nagad" && !pm.includes("nagad")) return false;
        if (filters.paymentMethod === "rocket" && !pm.includes("rocket")) return false;
        if (filters.paymentMethod === "card" && !pm.includes("card") && !pm.includes("visa") && !pm.includes("master")) return false;
      }

      // 3. Courier Filter
      if (filters.courier !== "all") {
        const assigned = ((o as any).assigned_courier || "").toLowerCase();
        if (assigned !== filters.courier.toLowerCase()) return false;
      }

      // 4. Date Range Filter
      if (filters.dateRange !== "all") {
        const orderDate = new Date(o.created_at);
        if (filters.dateRange === "today" && !isToday(orderDate)) return false;
        if (filters.dateRange === "7days") {
          const sevenDaysAgo = subDays(now, 7);
          if (!isWithinInterval(orderDate, { start: sevenDaysAgo, end: now })) return false;
        }
        if (filters.dateRange === "month") {
          const monthStart = startOfMonth(now);
          if (orderDate < monthStart) return false;
        }
      }

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const num = (o.order_number || "").toLowerCase();
        const tracking = (o.tracking_number || "").toLowerCase();
        const addr = o.shipping_address as any;
        const name = (addr?.full_name || addr?.name || "").toLowerCase();
        const phone = (addr?.phone || "").toLowerCase();
        const city = (addr?.city || "").toLowerCase();
        return num.includes(q) || tracking.includes(q) || name.includes(q) || phone.includes(q) || city.includes(q);
      }

      return true;
    });
  }, [orders, filters, searchQuery]);

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filteredOrders.length) setSelected(new Set());
    else setSelected(new Set(filteredOrders.map((o) => o.id)));
  };

  const allSelected = filteredOrders.length > 0 && selected.size === filteredOrders.length;
  const someSelected = selected.size > 0;

  // Pending counts for badges
  const pendingReturnsCount = useMemo(() => returns.filter((r: any) => r.status === "pending").length, [returns]);
  const pendingCancellationsCount = useMemo(() => cancellations.filter((c: any) => c.status === "pending").length, [cancellations]);
  const pendingProofsCount = paymentProofs.length;

  // Print & Export Handler for a specific order
  const handlePrintOrExport = async (
    order: any,
    action: "print" | "pdf" | "jpg",
    mode: "both" | "invoice" | "slip"
  ) => {
    try {
      // Fetch order items if not already available
      const { data: items = [] } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", order.id);

      const ctx = {
        order,
        items: items || [],
        brand: {
          name: "ORIZINO",
          addr: "House 42, Road 11, Banani, Dhaka, Bangladesh",
          email: "concierge@orizino.com",
          phone: "+880 1700-000000",
          website: "https://orizino.com",
        },
      };

      if (action === "print") {
        printOrderDocuments(ctx, mode);
      } else if (action === "pdf") {
        exportOrderPdf(ctx, mode);
      } else if (action === "jpg") {
        await exportOrderJpg(ctx, mode);
      }
    } catch (err: any) {
      toast.error(err?.message || "Action failed");
    }
  };

  return (
    <div className="max-w-[1700px] mx-auto w-full space-y-3 pb-8">
      {/* ── UNIFIED ULTRA-COMPACT TOOLBAR (NO ROW MENU) ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 p-3 rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md shadow-xs">
        {/* Left: View Selector (Dropdown instead of row menu) + Search */}
        <div className="flex items-center gap-2 flex-1 flex-wrap sm:flex-nowrap">
          {/* Single Dropdown View Selector (NO row menu) */}
          <Select value={tab} onValueChange={setTab}>
            <SelectTrigger className="h-8.5 w-auto min-w-[170px] max-w-[230px] rounded-xl text-xs font-bold bg-background/80 border-border/80 shadow-2xs gap-1.5 shrink-0">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-border/80 bg-background/95 backdrop-blur-xl shadow-xl">
              <SelectItem value="orders" className="text-xs font-semibold cursor-pointer">
                <span className="flex items-center gap-2">
                  <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                  <span>All Orders</span>
                  <span className="ml-auto font-mono text-[10px] bg-muted px-1.5 py-0.2 rounded-full font-bold">
                    {orders.length}
                  </span>
                </span>
              </SelectItem>
              <SelectItem value="returns" className="text-xs font-semibold cursor-pointer">
                <span className="flex items-center gap-2">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                  <span>Returns &amp; Exchanges</span>
                  {pendingReturnsCount > 0 && (
                    <span className="ml-auto font-mono text-[10px] bg-amber-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                      {pendingReturnsCount}
                    </span>
                  )}
                </span>
              </SelectItem>
              <SelectItem value="cancellations" className="text-xs font-semibold cursor-pointer">
                <span className="flex items-center gap-2">
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span>Cancellations</span>
                  {pendingCancellationsCount > 0 && (
                    <span className="ml-auto font-mono text-[10px] bg-rose-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                      {pendingCancellationsCount}
                    </span>
                  )}
                </span>
              </SelectItem>
              <SelectItem value="payments" className="text-xs font-semibold cursor-pointer">
                <span className="flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                  <span>Payment Proofs</span>
                  {pendingProofsCount > 0 && (
                    <span className="ml-auto font-mono text-[10px] bg-amber-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                      {pendingProofsCount}
                    </span>
                  )}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Search bar */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order #, customer, phone, tracking..."
              className="pl-8 h-8.5 rounded-xl text-xs bg-background/80 border-border/70 placeholder:text-muted-foreground/70"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* ONE BUTTON FILTER POPOVER */}
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant={activeFiltersCount > 0 ? "default" : "outline"}
                className="h-8.5 rounded-xl gap-1.5 text-xs font-semibold shrink-0 cursor-pointer shadow-xs"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filter</span>
                {activeFiltersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-white/25 text-white text-[10px] font-mono flex items-center justify-center font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={8}
              className="w-80 p-4 rounded-2xl border border-border/80 bg-background/95 backdrop-blur-xl shadow-2xl space-y-3 z-50"
            >
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-primary" /> Filter Orders
                </span>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="text-[11px] text-muted-foreground hover:text-primary font-medium"
                  >
                    Reset All
                  </button>
                )}
              </div>

              {/* Status filter */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Order Status
                </Label>
                <Select
                  value={filters.status}
                  onValueChange={(v) => setFilters((p) => ({ ...p, status: v }))}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {ORDER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Courier filter */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Assigned Courier
                </Label>
                <Select
                  value={filters.courier}
                  onValueChange={(v) => setFilters((p) => ({ ...p, courier: v }))}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Couriers</SelectItem>
                    <SelectItem value="pathao">Pathao Logistics</SelectItem>
                    <SelectItem value="steadfast">Steadfast Courier</SelectItem>
                    <SelectItem value="orizino">In-House Orizino</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method filter */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Payment Method
                </Label>
                <Select
                  value={filters.paymentMethod}
                  onValueChange={(v) => setFilters((p) => ({ ...p, paymentMethod: v }))}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payment Methods</SelectItem>
                    <SelectItem value="cod">Cash on Delivery (COD)</SelectItem>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="nagad">Nagad</SelectItem>
                    <SelectItem value="rocket">Rocket</SelectItem>
                    <SelectItem value="card">Card / Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date range filter */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Date Range
                </Label>
                <Select
                  value={filters.dateRange}
                  onValueChange={(v: any) => setFilters((p) => ({ ...p, dateRange: v }))}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="7days">Last 7 Days</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2 border-t border-border/50 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => setFilterOpen(false)}
                  className="h-7 px-3 text-xs rounded-lg font-bold"
                >
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Right: Refresh & Quick Actions */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {activeFiltersCount > 0 && (
            <button
              onClick={resetFilters}
              className="text-[11px] text-muted-foreground hover:text-primary font-semibold underline mr-1 cursor-pointer"
            >
              Clear filters
            </button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              refetchOrders();
              qc.invalidateQueries({ queryKey: ["admin-returns"] });
              qc.invalidateQueries({ queryKey: ["admin-cancellations"] });
              toast.info("Refreshed");
            }}
            className="h-8.5 rounded-xl gap-1 text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* ══════════════ 1. ALL ORDERS VIEW ══════════════ */}
      {tab === "orders" && (
        <div className="space-y-3">
          {/* ── BULK ACTIONS FLOATING BAR ── */}
          <AnimatePresence>
            {someSelected && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border border-primary/30 bg-primary/10 backdrop-blur-md"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary font-mono px-2 py-0.5 rounded-md bg-primary/20">
                    {selected.size} selected
                  </span>
                  <span className="text-xs text-foreground font-medium">Bulk Actions:</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Bulk status changer */}
                  <Select value={bulkStatus ?? ""} onValueChange={setBulkStatus}>
                    <SelectTrigger className="h-8 w-36 text-xs rounded-xl bg-background border-border">
                      <SelectValue placeholder="Set status..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    disabled={!bulkStatus || bulkAction.isPending}
                    onClick={() => bulkAction.mutate({ ids: Array.from(selected), action: "status", status: bulkStatus! })}
                    className="h-8 rounded-xl text-xs font-bold"
                  >
                    Apply Status
                  </Button>

                  {/* Bulk delete dialog */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={bulkAction.isPending}
                        className="h-8 rounded-xl text-xs font-bold gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selected.size} orders?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete {selected.size} order(s) and associated items from the database.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => bulkAction.mutate({ ids: Array.from(selected), action: "delete" })}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── DESKTOP ORDERS TABLE ── */}
          <div className="hidden md:block rounded-2xl border border-border/70 bg-card/40 backdrop-blur-md overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Select all" />
                  </TableHead>
                  <TableHead className="text-xs font-bold">Order #</TableHead>
                  <TableHead className="text-xs font-bold">Customer</TableHead>
                  <TableHead className="text-xs font-bold">Date</TableHead>
                  <TableHead className="text-xs font-bold">Payment</TableHead>
                  <TableHead className="text-xs font-bold">Courier</TableHead>
                  <TableHead className="text-xs font-bold">Total</TableHead>
                  <TableHead className="text-xs font-bold">Status</TableHead>
                  <TableHead className="text-right text-xs font-bold">Print &amp; Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/40">
                {isLoading ? (
                  <TableLoadingRow cols={9} />
                ) : filteredOrders.length === 0 ? (
                  <TableEmptyRow
                    cols={9}
                    icon={<ShoppingBag className="w-6 h-6 text-muted-foreground opacity-50" />}
                    message="No orders match your criteria"
                    hint={searchQuery || activeFiltersCount > 0 ? "Try adjusting your filters or search query." : "New orders will appear here automatically."}
                  />
                ) : (
                  filteredOrders.map((o) => {
                    const isSelected = selected.has(o.id);
                    const addr = o.shipping_address as any;
                    const customerName = addr?.full_name || addr?.name || "Customer";
                    const isCod = (o.payment_method || "").toLowerCase().includes("cod") || (o.payment_method || "").toLowerCase().includes("cash");

                    return (
                      <TableRow
                        key={o.id}
                        className={`hover:bg-secondary/20 transition-colors ${isSelected ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(o.id)}
                            aria-label={`Select order ${o.order_number}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-foreground">
                          #{o.order_number}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-semibold text-foreground truncate max-w-[140px]">
                            {customerName}
                          </div>
                          {addr?.phone && (
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {addr.phone}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(o.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[9.5px] font-mono uppercase ${
                              isCod
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            }`}
                          >
                            {isCod ? "COD" : o.payment_method || "Paid"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(o as any).assigned_courier ? (
                            <span className="text-xs font-medium text-foreground capitalize flex items-center gap-1">
                              <Truck className="w-3 h-3 text-primary shrink-0" />
                              {(o as any).assigned_courier}
                            </span>
                          ) : (
                            <span className="text-[10.5px] text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell className="font-bold text-xs text-foreground whitespace-nowrap font-mono">
                          {formatPrice(Number(o.total))}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                              statusColors[o.status] || "bg-secondary text-foreground"
                            }`}
                          >
                            {o.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* ── PRINT & EXPORT BUTTON DROPDOWN ── */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs rounded-lg gap-1 border-border/80 hover:bg-secondary/40 font-semibold cursor-pointer shadow-2xs"
                                  title="Print or Export documents"
                                >
                                  <Printer className="w-3.5 h-3.5 text-primary" />
                                  <span>Print / Export</span>
                                  <ChevronDown className="w-3 h-3 opacity-60" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                sideOffset={4}
                                className="w-56 rounded-2xl border border-border/80 bg-background/95 backdrop-blur-xl p-1.5 shadow-2xl z-50 space-y-1 text-xs"
                              >
                                <DropdownMenuLabel className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  Print Document
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => handlePrintOrExport(o, "print", "both")}
                                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl cursor-pointer font-bold text-primary hover:bg-primary/10"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>Print Both (Invoice + Slip)</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handlePrintOrExport(o, "print", "invoice")}
                                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl cursor-pointer font-medium"
                                >
                                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span>Print A4 Invoice</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handlePrintOrExport(o, "print", "slip")}
                                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl cursor-pointer font-medium"
                                >
                                  <Package className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span>Print Thermal POS Slip</span>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator className="my-1 bg-border/40" />

                                <DropdownMenuLabel className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  Export as PDF / JPG
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => handlePrintOrExport(o, "pdf", "both")}
                                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl cursor-pointer font-medium"
                                >
                                  <Download className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>Export Combined (PDF)</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handlePrintOrExport(o, "jpg", "both")}
                                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl cursor-pointer font-medium"
                                >
                                  <ImageIcon className="w-3.5 h-3.5 text-sky-500" />
                                  <span>Export Both (JPG Images)</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handlePrintOrExport(o, "jpg", "invoice")}
                                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl cursor-pointer font-medium"
                                >
                                  <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span>Export Invoice (JPG)</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handlePrintOrExport(o, "jpg", "slip")}
                                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl cursor-pointer font-medium"
                                >
                                  <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span>Export POS Slip (JPG)</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedOrder(o)}
                              className="h-7 px-2 text-xs rounded-lg gap-1 hover:bg-primary/10 hover:text-primary font-semibold"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden lg:inline">Details</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* ── MOBILE CARDS LIST ── */}
          <div className="md:hidden space-y-2">
            {filteredOrders.length > 0 && (
              <div className="flex items-center justify-between px-1 pb-1">
                <div className="flex items-center gap-2">
                  <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Select all" />
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                    Select All ({filteredOrders.length})
                  </span>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Loading orders...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-10 text-center rounded-2xl border border-border/70 bg-card/40 space-y-2">
                <ShoppingBag className="w-8 h-8 mx-auto text-muted-foreground opacity-40" />
                <p className="text-xs font-semibold">No orders found</p>
              </div>
            ) : (
              filteredOrders.map((o) => {
                const isSelected = selected.has(o.id);
                const addr = o.shipping_address as any;

                return (
                  <div
                    key={o.id}
                    className={`rounded-2xl border ${
                      isSelected ? "border-primary/50 bg-primary/5" : "border-border/70 bg-card/60"
                    } p-3.5 space-y-2 transition-all`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(o.id)}
                          aria-label={`Select order ${o.order_number}`}
                        />
                        <span className="font-mono text-xs font-bold text-foreground">
                          #{o.order_number}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold border capitalize ${
                          statusColors[o.status] || "bg-secondary text-foreground"
                        }`}
                      >
                        {o.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                      <div>
                        <p className="font-semibold text-foreground">{addr?.full_name || addr?.name || "Customer"}</p>
                        <p className="text-[10px] text-muted-foreground">{format(new Date(o.created_at), "MMM d, yyyy")}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-foreground">{formatPrice(Number(o.total))}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{o.payment_method || "COD"}</p>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-2">
                      {/* Print / Export button on mobile */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs rounded-xl font-bold gap-1"
                          >
                            <Printer className="w-3.5 h-3.5 text-primary" /> Print / Export
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="start"
                          sideOffset={4}
                          className="w-56 rounded-2xl border border-border/80 bg-background/95 backdrop-blur-xl p-1.5 shadow-2xl z-50 text-xs"
                        >
                          <DropdownMenuItem onClick={() => handlePrintOrExport(o, "print", "both")} className="font-bold text-primary">
                            <Printer className="w-3.5 h-3.5 mr-2" /> Print Both (Invoice + Slip)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePrintOrExport(o, "pdf", "both")}>
                            <Download className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Export PDF (Both)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePrintOrExport(o, "jpg", "both")}>
                            <ImageIcon className="w-3.5 h-3.5 mr-2 text-sky-500" /> Export JPG (Both)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => setSelectedOrder(o)}
                        className="h-7 text-xs rounded-xl font-bold gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Details
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ══════════════ 2. RETURNS & EXCHANGES VIEW ══════════════ */}
      {tab === "returns" && (
        <div className="space-y-3">
          <div className="p-3 rounded-2xl border border-border/60 bg-secondary/15 flex items-center justify-between text-xs">
            <span className="font-bold text-foreground">Customer Return &amp; Exchange Requests</span>
            <span className="text-muted-foreground">{returns.length} total</span>
          </div>

          {rLoading ? (
            <CardGridSkeleton count={4} cols={2} aspect="2/1" />
          ) : returns.length === 0 ? (
            <Card className="rounded-2xl border-border/70 bg-card/40">
              <CardContent className="py-12 text-center text-muted-foreground space-y-2">
                <RotateCcw className="w-10 h-10 mx-auto opacity-30 text-primary" />
                <p className="text-xs font-semibold text-foreground">No return requests</p>
                <p className="text-[11px]">When customers file return/exchange tickets, they will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {returns.map((r: any) => {
                const orderTotal = Number(r.orders?.total || 0);
                const shippingFee = Number(r.orders?.shipping_fee || 0);
                const productAmount = Math.max(0, orderTotal - shippingFee);
                const hasDeliveryLoss = r.refund_delivery_charge === true;

                return (
                  <Card
                    key={r.id}
                    onClick={() => {
                      setReturnSel(r);
                      setAdminNotes(r.admin_notes || "");
                      const initialDeliveryChargeRefund = r.refund_delivery_charge ?? false;
                      setRefundDeliveryCharge(initialDeliveryChargeRefund);

                      const initialAmount = r.refund_amount != null && Number(r.refund_amount) > 0
                        ? String(r.refund_amount)
                        : String(initialDeliveryChargeRefund ? orderTotal : productAmount);

                      setRefundAmount(initialAmount);
                      setReturnTracking(r.return_tracking || "");
                      setRefundMethod(r.refund_method || r.orders?.payment_method || "bkash");
                      setRefundReference(r.refund_reference || "");
                      setRefundStatus(r.refund_status || "pending");
                    }}
                    className="rounded-2xl border-border/70 hover:border-primary/50 transition-all cursor-pointer bg-card/60 hover:shadow-xs group"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                          Order #{r.orders?.order_number ?? r.order_id.slice(0, 8)}
                        </span>
                        <Badge className={`text-[10px] uppercase font-mono ${returnStatusColors[r.status] || ""}`}>
                          {r.status}
                        </Badge>
                      </div>

                      <p className="text-xs text-foreground/90 font-medium line-clamp-2">
                        {r.reason}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-secondary/30 p-2.5 rounded-xl border border-border/40 font-mono">
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase">Refund Amount</span>
                          <span className="font-bold text-foreground">
                            ৳{Number(r.refund_amount || productAmount).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase">Delivery Fee</span>
                          <span className={`font-semibold ${hasDeliveryLoss ? "text-rose-500 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {hasDeliveryLoss ? `Refunded (-৳${shippingFee} loss)` : `Retained (৳${shippingFee})`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" /> {format(new Date(r.created_at), "MMM d, yyyy")}
                        </span>
                        {r.refund_status && (
                          <Badge variant="outline" className="text-[10px] font-mono capitalize">
                            Refund: {r.refund_status}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════ 3. CANCELLATIONS VIEW ══════════════ */}
      {tab === "cancellations" && (
        <div className="space-y-3">
          <div className="p-3 rounded-2xl border border-border/60 bg-secondary/15 flex items-center justify-between text-xs">
            <span className="font-bold text-foreground">Order Cancellation Requests</span>
            <span className="text-muted-foreground">{cancellations.length} total</span>
          </div>

          {cLoading ? (
            <CardGridSkeleton count={4} cols={2} aspect="2/1" />
          ) : cancellations.length === 0 ? (
            <Card className="rounded-2xl border-border/70 bg-card/40">
              <CardContent className="py-12 text-center text-muted-foreground space-y-2">
                <XCircle className="w-10 h-10 mx-auto opacity-30 text-rose-500" />
                <p className="text-xs font-semibold text-foreground">No cancellation requests</p>
                <p className="text-[11px]">Customer cancellation requests will appear here for review.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cancellations.map((c: any) => (
                <Card
                  key={c.id}
                  onClick={() => {
                    setCancelSel(c);
                    setAdminNotes(c.admin_notes || "");
                    setRefundAmount(String(c.refund_amount ?? ""));
                  }}
                  className="rounded-2xl border-border/70 hover:border-primary/50 transition-all cursor-pointer bg-card/60 hover:shadow-xs"
                >
                  <CardContent className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-foreground">
                        Order #{c.orders?.order_number ?? c.order_id.slice(0, 8)}
                      </span>
                      <Badge className={`text-[10px] uppercase font-mono ${returnStatusColors[c.status] || ""}`}>
                        {c.status}
                      </Badge>
                    </div>

                    <p className="text-xs text-foreground/90 font-medium line-clamp-2">
                      {c.reason}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" /> {format(new Date(c.created_at), "MMM d, yyyy")}
                      </span>
                      {c.refund_required && (
                        <span className="font-semibold text-amber-500">Refund Required</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════ 4. PAYMENT PROOFS VIEW ══════════════ */}
      {tab === "payments" && (
        <div className="space-y-3">
          <AdminPaymentProofs />
        </div>
      )}

      {/* ── ORDER DETAIL MODAL ── */}
      <Dialog open={!!selectedOrder} onOpenChange={(v) => !v && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl p-6">
          <DialogHeader className="border-b border-border/50 pb-3">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold font-display">
                Order #{selectedOrder?.order_number}
              </DialogTitle>
              {selectedOrder && (
                <Badge
                  className={`text-[10px] font-bold capitalize ${
                    statusColors[selectedOrder.status] || "bg-secondary text-foreground"
                  }`}
                >
                  {selectedOrder.status}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4 pt-2">
              {/* Financial Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-secondary/25 border border-border/60 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold">Subtotal</span>
                  <span className="font-mono font-semibold">{formatPrice(Number(selectedOrder.subtotal))}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold">Shipping</span>
                  <span className="font-mono font-semibold">{formatPrice(Number(selectedOrder.shipping_fee))}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold">Total</span>
                  <span className="font-mono font-bold text-primary">{formatPrice(Number(selectedOrder.total))}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold">Payment</span>
                  <span className="font-semibold uppercase">{selectedOrder.payment_method}</span>
                </div>
              </div>

              {/* Shipping Address */}
              {selectedOrder.shipping_address && typeof selectedOrder.shipping_address === "object" && (
                <div className="p-3.5 rounded-2xl bg-card/60 border border-border/60 text-xs space-y-1">
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary" /> Delivery Address
                  </p>
                  {(() => {
                    const addr = selectedOrder.shipping_address as any;
                    return (
                      <div className="text-muted-foreground pl-5 space-y-0.5">
                        <p className="font-semibold text-foreground">{addr.full_name || addr.name}</p>
                        <p>{addr.phone}</p>
                        <p>{addr.street}, {addr.city}</p>
                        <p>{addr.state} {addr.zip}, {addr.country}</p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Items List */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground">Items ({orderItems.length})</Label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {orderItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl border border-border/50 bg-secondary/20 text-xs"
                    >
                      {item.product_image ? (
                        <img src={item.product_image} alt="" className="w-9 h-9 rounded-lg object-cover border" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                          <Package className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground truncate">{item.product_name}</p>
                        <p className="text-[10px] text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <span className="font-mono font-bold text-foreground">{formatPrice(Number(item.total_price))}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Updater */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/50">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Update Order Status</Label>
                  <Select
                    value={selectedOrder.status}
                    onValueChange={(v) => {
                      updateStatus.mutate({ id: selectedOrder.id, status: v });
                      setSelectedOrder({ ...selectedOrder, status: v });
                    }}
                  >
                    <SelectTrigger className="h-8 rounded-xl text-xs capitalize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Assign Courier */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold flex items-center gap-1">
                    <Truck className="w-3 h-3 text-primary" /> Assign Courier
                  </Label>
                  <Select
                    value={(selectedOrder as any).assigned_courier ?? ""}
                    onValueChange={async (v) => {
                      const { error } = await supabase
                        .from("orders")
                        .update({
                          assigned_courier: v,
                          courier_assigned_at: new Date().toISOString(),
                        } as any)
                        .eq("id", selectedOrder.id);
                      if (error) {
                        toast.error(error.message);
                        return;
                      }
                      setSelectedOrder({ ...(selectedOrder as any), assigned_courier: v } as Order);
                      qc.invalidateQueries({ queryKey: ["admin-orders"] });
                      toast.success(`Assigned to ${v}`);
                    }}
                  >
                    <SelectTrigger className="h-8 rounded-xl text-xs">
                      <SelectValue placeholder="Pick courier..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pathao">Pathao Logistics</SelectItem>
                      <SelectItem value="steadfast">Steadfast Courier</SelectItem>
                      <SelectItem value="orizino">In-House Orizino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Manual Tracking & Courier Live Status */}
              <ManualTrackingSection
                orderId={selectedOrder.id}
                currentCourier={(selectedOrder as any).tracking_courier ?? null}
                currentTrackingNumber={selectedOrder.tracking_number ?? null}
              />

              {/* Pending Order Quick Confirm */}
              {selectedOrder.status === "pending" && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                    Awaiting Store Review:
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        updateStatus.mutate({ id: selectedOrder.id, status: "processing" });
                        setSelectedOrder({ ...selectedOrder, status: "processing" });
                        toast.success("Order confirmed");
                      }}
                      className="h-7 text-xs rounded-xl font-bold bg-primary"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        updateStatus.mutate({ id: selectedOrder.id, status: "cancelled" });
                        setSelectedOrder({ ...selectedOrder, status: "cancelled" });
                        toast.info("Order cancelled");
                      }}
                      className="h-7 text-xs rounded-xl font-bold"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Google Docs Archive */}
              <OrderGoogleDocs orderId={selectedOrder.id} orderNumber={selectedOrder.order_number} />

              {/* Comprehensive Print / Export Action Buttons */}
              <div className="pt-3 border-t border-border/50 flex flex-wrap items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      className="h-8 rounded-xl text-xs font-bold gap-1 bg-primary text-primary-foreground shadow-xs cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print Documents
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 rounded-2xl p-1.5 text-xs shadow-2xl">
                    <DropdownMenuItem
                      onClick={() => handlePrintOrExport(selectedOrder, "print", "both")}
                      className="font-bold text-primary cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 mr-2" /> Print Both (Invoice + Slip)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handlePrintOrExport(selectedOrder, "print", "invoice")}
                      className="cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 mr-2" /> Print A4 Invoice
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handlePrintOrExport(selectedOrder, "print", "slip")}
                      className="cursor-pointer"
                    >
                      <Package className="w-3.5 h-3.5 mr-2" /> Print POS Thermal Slip
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-xl text-xs font-bold gap-1 border-border/80 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Export PDF / JPG
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 rounded-2xl p-1.5 text-xs shadow-2xl">
                    <DropdownMenuItem
                      onClick={() => handlePrintOrExport(selectedOrder, "pdf", "both")}
                      className="font-semibold text-emerald-600 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 mr-2" /> Export Combined PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handlePrintOrExport(selectedOrder, "jpg", "both")}
                      className="font-semibold text-sky-600 cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5 mr-2" /> Export Both as JPG
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handlePrintOrExport(selectedOrder, "jpg", "invoice")}
                      className="cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5 mr-2 text-muted-foreground" /> Export Invoice JPG
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handlePrintOrExport(selectedOrder, "jpg", "slip")}
                      className="cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5 mr-2 text-muted-foreground" /> Export Slip JPG
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSendInvoiceEmail(selectedOrder.id)}
                  disabled={isSendingInvoice}
                  className="h-8 rounded-xl text-xs font-semibold gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                >
                  <Mail className={`w-3.5 h-3.5 ${isSendingInvoice ? "animate-pulse" : ""}`} />
                  {isSendingInvoice ? "Sending…" : "Email Invoice"}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCourierOpen(true)}
                  className="h-8 rounded-xl text-xs font-semibold gap-1 ml-auto bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                >
                  <Truck className="w-3.5 h-3.5" /> Push Courier
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── COURIER PUSH DIALOG ── */}
      {selectedOrder && (
        <CourierPushDialog
          open={courierOpen}
          onOpenChange={setCourierOpen}
          orderId={selectedOrder.id}
          orderNumber={selectedOrder.order_number}
        />
      )}

      {/* ── RETURN REVIEW MODAL ── */}
      <Dialog open={!!returnSel} onOpenChange={(v) => !v && setReturnSel(null)}>
        <DialogContent className="max-w-xl rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <span>Return &amp; Refund Review — Order #{returnSel?.orders?.order_number}</span>
              {returnSel?.status && (
                <Badge className={`text-[10px] uppercase font-mono ${returnStatusColors[returnSel.status] || ""}`}>
                  {returnSel.status}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {returnSel && (() => {
            const orderTotal = Number(returnSel.orders?.total || 0);
            const shippingFee = Number(returnSel.orders?.shipping_fee || 0);
            const productAmount = Math.max(0, orderTotal - shippingFee);

            return (
              <div className="space-y-4 pt-2">
                {/* 1. Financial Context Banner */}
                <div className="grid grid-cols-3 gap-2 bg-secondary/30 p-3 rounded-2xl border border-border/50 text-xs font-mono">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Product Total</span>
                    <span className="font-bold text-foreground">৳{productAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Delivery Fee</span>
                    <span className="font-bold text-foreground">৳{shippingFee.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Order Grand Total</span>
                    <span className="font-bold text-primary">৳{orderTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* 2. Customer Reason & Proof */}
                <div className="p-3 rounded-2xl bg-secondary/20 text-xs space-y-1 border border-border/40">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Customer Return Reason</span>
                  <p className="text-foreground">{returnSel.reason}</p>
                </div>

                {returnSel.images?.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-foreground">Customer Attached Proof Photos</span>
                    <div className="flex gap-2 flex-wrap">
                      {returnSel.images.map((u: string, idx: number) => (
                        <a key={u + idx} href={u} target="_blank" rel="noreferrer" className="group relative">
                          <img
                            src={u}
                            className="w-16 h-16 rounded-xl object-cover border border-border/60 hover:opacity-80 transition-opacity"
                            alt="return proof"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Delivery Charge Refund Control (Core Business Rule) */}
                <div className={`p-3.5 rounded-2xl border transition-colors ${refundDeliveryCharge ? "bg-amber-500/10 border-amber-500/30" : "bg-card border-border/70"}`}>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="refund_delivery_charge"
                      checked={refundDeliveryCharge}
                      onCheckedChange={(checked) => {
                        const isChecked = Boolean(checked);
                        setRefundDeliveryCharge(isChecked);
                        setRefundAmount(String(isChecked ? orderTotal : productAmount));
                      }}
                      className="mt-0.5"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="refund_delivery_charge" className="text-xs font-bold cursor-pointer text-foreground flex items-center gap-1.5">
                        Include delivery charge in refund (৳{shippingFee.toLocaleString()})
                      </Label>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {refundDeliveryCharge ? (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">
                            ⚠️ Marked: Delivery charge will be refunded to customer and calculated as business loss in financial reports.
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            ✅ Unmarked: Delivery fee is retained by the store and is NOT considered a financial loss.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. Refund Payout Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Refund Amount (৳)</Label>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setRefundDeliveryCharge(false);
                            setRefundAmount(String(productAmount));
                          }}
                          className="text-[10px] text-primary hover:underline"
                        >
                          Product Only
                        </button>
                        <span className="text-[10px] text-muted-foreground">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            setRefundDeliveryCharge(true);
                            setRefundAmount(String(orderTotal));
                          }}
                          className="text-[10px] text-primary hover:underline"
                        >
                          Full
                        </button>
                      </div>
                    </div>
                    <Input
                      type="number"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      className="h-8 text-xs rounded-xl mt-1"
                      placeholder={`e.g. ${refundDeliveryCharge ? orderTotal : productAmount}`}
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Refund Method / Channel</Label>
                    <Select value={refundMethod} onValueChange={setRefundMethod}>
                      <SelectTrigger className="h-8 text-xs rounded-xl mt-1">
                        <SelectValue placeholder="Select payout channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bkash">bKash (MFS)</SelectItem>
                        <SelectItem value="nagad">Nagad (MFS)</SelectItem>
                        <SelectItem value="rocket">Rocket (MFS)</SelectItem>
                        <SelectItem value="upay">Upay (MFS)</SelectItem>
                        <SelectItem value="bank">Bank Transfer</SelectItem>
                        <SelectItem value="original">Original Payment Method</SelectItem>
                        <SelectItem value="store_credit">Store Credit / Wallet</SelectItem>
                        <SelectItem value="cash">Cash on Hand</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold">Refund Reference / Trx ID</Label>
                    <Input
                      value={refundReference}
                      onChange={(e) => setRefundReference(e.target.value)}
                      placeholder="e.g. bKash TrxID or Bank Ref"
                      className="h-8 text-xs rounded-xl mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Return Courier Tracking #</Label>
                    <Input
                      value={returnTracking}
                      onChange={(e) => setReturnTracking(e.target.value)}
                      placeholder="e.g. Return parcel tracking ID"
                      className="h-8 text-xs rounded-xl mt-1 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Admin Notes &amp; Return Memo</Label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={2}
                    placeholder="Internal audit notes regarding returned condition or refund payout..."
                    className="text-xs rounded-xl mt-1"
                  />
                </div>

                {/* 5. Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-border/50 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      returnMutation.mutate({
                        id: returnSel.id,
                        decision: "approve",
                        refund_status: "approved",
                      })
                    }
                    disabled={returnMutation.isPending}
                    className="h-9 text-xs rounded-xl font-bold border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                  >
                    Approve Return
                  </Button>

                  <Button
                    size="sm"
                    onClick={() =>
                      returnMutation.mutate({
                        id: returnSel.id,
                        decision: "complete",
                        refund_status: "refunded",
                      })
                    }
                    disabled={returnMutation.isPending}
                    className="h-9 text-xs rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Confirm &amp; Issue Refund
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      returnMutation.mutate({
                        id: returnSel.id,
                        decision: "reject",
                        refund_status: "rejected",
                      })
                    }
                    disabled={returnMutation.isPending}
                    className="h-9 text-xs rounded-xl font-bold"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Reject Return
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── CANCELLATION REVIEW MODAL ── */}
      <Dialog open={!!cancelSel} onOpenChange={(v) => !v && setCancelSel(null)}>
        <DialogContent className="max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Cancellation — Order #{cancelSel?.orders?.order_number}
            </DialogTitle>
          </DialogHeader>
          {cancelSel && (
            <div className="space-y-3.5 pt-2">
              <div className="p-3 rounded-2xl bg-secondary/30 text-xs space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Customer Reason</span>
                <p className="text-foreground">{cancelSel.reason}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded-xl bg-muted/40 font-mono">
                <span>Payment: {cancelSel.orders?.payment_method || "COD"}</span>
                <span>Total: {formatPrice(Number(cancelSel.orders?.total || 0))}</span>
              </div>

              {cancelSel.refund_required && (
                <div>
                  <Label className="text-xs">Refund Amount (৳)</Label>
                  <Input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="h-8 text-xs rounded-xl mt-1"
                  />
                </div>
              )}

              <div>
                <Label className="text-xs">Admin Notes</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                  className="text-xs rounded-xl mt-1"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                <Button
                  size="sm"
                  onClick={() => cancelMutation.mutate({ id: cancelSel.id, decision: "approve", refund_approved: false })}
                  disabled={cancelMutation.isPending}
                  className="h-8 text-xs rounded-xl font-bold bg-primary"
                >
                  Approve Cancel
                </Button>
                {cancelSel.refund_required && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => cancelMutation.mutate({ id: cancelSel.id, decision: "approve", refund_approved: true })}
                    disabled={cancelMutation.isPending}
                    className="h-8 text-xs rounded-xl font-bold"
                  >
                    Approve + Refund
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => cancelMutation.mutate({ id: cancelSel.id, decision: "reject" })}
                  disabled={cancelMutation.isPending}
                  className="h-8 text-xs rounded-xl font-bold"
                >
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
