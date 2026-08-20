import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@ui/components/ui/button";
import { Input } from "@ui/components/ui/input";
import { Badge } from "@ui/components/ui/badge";
import {
  Printer,
  Search,
  CheckSquare,
  Square,
  FileText,
  Receipt,
  RotateCcw,
  Tag,
  Barcode,
  SlidersHorizontal,
  Check
} from "lucide-react";
import { format } from "date-fns";

import { useMasterPanelDesigns } from "@/lib/design-presets";
import { printShippingSticker, printThermalSlip, printInvoicePdf } from "@/lib/invoice-pdf";

interface PrintableOrder {
  id: string;
  order_number: string;
  customer_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  shipping_address: any;
  total: number;
  subtotal?: number;
  shipping_fee?: number;
  status: string;
  payment_method: string;
  order_source: string;
  created_at: string;
  courier_name?: string | null;
  tracking_code?: string | null;
  order_items?: any[];
}

export function PrintCenterPage() {
  const { brand, invoiceSettings, posSettings, shippingStickerPreset } = useMasterPanelDesigns();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formatType, setFormatType] = useState<"4x6" | "80mm" | "a4">("4x6");

  const { data: orders = [], isLoading, refetch } = useQuery<PrintableOrder[]>({
    queryKey: ["printable-orders", search],
    queryFn: async () => {
      let q = (supabase as any)
        .from("orders")
        .select(`
          id, order_number, customer_name, guest_phone, guest_email, shipping_address, total, subtotal, shipping_fee, status, payment_method, order_source, created_at, courier_name, tracking_code,
          order_items ( id, product_name, quantity, unit_price, total_price )
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (search.trim()) {
        q = q.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,guest_phone.ilike.%${search}%`);
      }

      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const selectAll = () => {
    if (selectedIds.length === orders.length) setSelectedIds([]);
    else setSelectedIds(orders.map((o) => o.id));
  };

  const handlePrintSelected = () => {
    const selectedOrders = orders.filter((o) => selectedIds.includes(o.id));
    if (selectedOrders.length === 0) {
      toast.error("Please select at least one order to print");
      return;
    }

    if (formatType === "4x6") {
      selectedOrders.forEach((o) => {
        printShippingSticker(o, brand, shippingStickerPreset);
      });
      toast.success(`Generated ${selectedOrders.length} Shipping Labels`);
    } else if (formatType === "80mm") {
      selectedOrders.forEach((o) => {
        printThermalSlip(o, o.order_items || [], brand, posSettings);
      });
      toast.success(`Generated ${selectedOrders.length} POS Slips`);
    } else if (formatType === "a4") {
      selectedOrders.forEach((o) => {
        printInvoicePdf(o, o.order_items || [], brand, invoiceSettings);
      });
      toast.success(`Generated ${selectedOrders.length} A4 Invoices`);
    }
  };

  return (
    <div className="space-y-4 pt-1 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 font-display">
            <Printer className="w-6 h-6 text-primary" />
            <span>Shipping Labels</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Format standardized shipping labels and warehouse packing slips for thermal printers
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="rounded-xl h-8.5 px-3 text-xs gap-1.5 bg-card hover:bg-muted"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            disabled={selectedIds.length === 0}
            onClick={handlePrintSelected}
            className="rounded-xl h-8.5 px-4 text-xs font-bold gap-1.5 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Batch ({selectedIds.length})</span>
          </Button>
        </div>
      </div>

      {/* Format Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order number (#1001), phone or customer name…"
            className="h-10 rounded-xl pl-10 text-xs sm:text-sm bg-card border-border/70"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={formatType}
            onChange={(e) => setFormatType(e.target.value as any)}
            className="h-10 px-3 rounded-xl bg-card border border-border/80 text-xs text-foreground font-semibold cursor-pointer"
          >
            <option value="4x6">4" x 6" Shipping Label</option>
            <option value="80mm">80mm POS Slip</option>
            <option value="a4">A4 Invoice</option>
          </select>
        </div>
      </div>

      {/* Select All Bar */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/20 border border-border/50 text-xs">
        <button
          type="button"
          onClick={selectAll}
          className="flex items-center gap-2 text-foreground font-semibold hover:text-primary transition-colors cursor-pointer"
        >
          {selectedIds.length === orders.length && orders.length > 0 ? (
            <CheckSquare className="w-4 h-4 text-primary" />
          ) : (
            <Square className="w-4 h-4 text-muted-foreground" />
          )}
          <span>
            {selectedIds.length === orders.length && orders.length > 0
              ? "Deselect All"
              : `Select All (${orders.length})`}
          </span>
        </button>

        <span className="text-muted-foreground font-mono text-[11px]">
          {selectedIds.length} of {orders.length} selected
        </span>
      </div>

      {/* Order Cards List */}
      <div className="space-y-2.5">
        {isLoading && (
          <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Loading printable orders…</p>
          </div>
        )}

        {!isLoading && orders.length === 0 && (
          <div className="text-center py-14 border border-border/70 rounded-2xl bg-card/40 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground text-sm">No orders found</p>
            <p>No orders match the current search query.</p>
          </div>
        )}

        {orders.map((order) => {
          const isChecked = selectedIds.includes(order.id);

          return (
            <div
              key={order.id}
              onClick={() => toggleSelect(order.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                isChecked
                  ? "bg-primary/5 border-primary/50 shadow-xs"
                  : "bg-card border-border/70 hover:border-border"
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="shrink-0 text-primary">
                  {isChecked ? (
                    <CheckSquare className="w-5 h-5" />
                  ) : (
                    <Square className="w-5 h-5 text-muted-foreground/60" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground text-sm">{order.order_number}</span>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold px-2 py-0.2">
                      {order.status}
                    </Badge>
                    {order.courier_name && (
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded border border-border/40 capitalize">
                        {order.courier_name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {order.customer_name || "Guest"} · {order.guest_phone || "No Phone"} · <span className="capitalize">{order.order_source}</span>
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-foreground tabular-nums">৳{Number(order.total || 0).toLocaleString()}</p>
                <span className="text-[10px] text-muted-foreground">{format(new Date(order.created_at), "MMM d, h:mm a")}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
