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
} from "lucide-react";

interface PrintableOrder {
  id: string;
  order_number: string;
  customer_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  shipping_address: any;
  total: number;
  status: string;
  payment_method: string;
  order_source: string;
  created_at: string;
  courier_name?: string | null;
  tracking_code?: string | null;
}

export function LabelsAndSlips() {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [format, setFormat] = useState<"4x6" | "80mm" | "a4">("4x6");

  const { data: orders = [], isLoading } = useQuery<PrintableOrder[]>({
    queryKey: ["printable-orders", search],
    queryFn: async () => {
      let q = (supabase as any)
        .from("orders")
        .select("id, order_number, customer_name, guest_phone, guest_email, shipping_address, total, status, payment_method, order_source, created_at, courier_name, tracking_code")
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

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked", { description: "Please allow popups to print thermal labels." });
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Thermal Labels Batch Print (${selectedOrders.length})</title>
          <style>
            @page {
              size: ${format === "4x6" ? "4in 6in" : format === "80mm" ? "80mm auto" : "A4"};
              margin: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              margin: 0;
              padding: 0;
              background: #fff;
              color: #000;
              font-size: 11px;
            }
            .label-container {
              width: 100%;
              max-width: ${format === "4x6" ? "3.8in" : format === "80mm" ? "76mm" : "7.5in"};
              margin: 0 auto;
              padding: 12px;
              box-sizing: border-box;
              page-break-after: always;
            }
            .header-box {
              border-bottom: 2px solid #000;
              padding-bottom: 8px;
              margin-bottom: 8px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .brand-name { font-size: 18px; font-weight: 900; letter-spacing: -0.5px; }
            .order-badge { font-size: 14px; font-weight: 800; font-family: monospace; }
            .barcode-box {
              text-align: center;
              border: 1px dashed #666;
              padding: 6px;
              margin: 8px 0;
              font-family: monospace;
              font-size: 13px;
              font-weight: bold;
              background: #f9f9f9;
            }
            .section-title { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #555; margin-bottom: 3px; }
            .recipient-box {
              border: 1.5px solid #000;
              border-radius: 4px;
              padding: 8px;
              margin-bottom: 8px;
            }
            .recipient-name { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
            .recipient-phone { font-size: 13px; font-weight: bold; font-family: monospace; }
            .recipient-addr { font-size: 11px; line-height: 1.3; margin-top: 4px; }
            .cod-banner {
              background: #000;
              color: #fff;
              padding: 6px 8px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-weight: bold;
              font-size: 13px;
              margin-top: 8px;
            }
            .sender-box { font-size: 9px; color: #444; border-top: 1px solid #ccc; padding-top: 6px; margin-top: 8px; }
          </style>
        </head>
        <body>
          ${selectedOrders
            .map((order) => {
              const addr =
                typeof order.shipping_address === "string"
                  ? order.shipping_address
                  : order.shipping_address?.address_line || order.shipping_address?.city || "No delivery address provided";
              const courier = order.courier_name || "Standard Courier";
              const tracking = order.tracking_code || `TRK-${order.order_number}`;

              return `
                <div class="label-container">
                  <div class="header-box">
                    <div>
                      <div class="brand-name">ORIZINO</div>
                      <div style="font-size:9px;color:#555;">PREMIUM APPAREL</div>
                    </div>
                    <div style="text-align:right;">
                      <div class="order-badge">${order.order_number}</div>
                      <div style="font-size:10px;font-weight:bold;color:#444;">${courier.toUpperCase()}</div>
                    </div>
                  </div>

                  <div class="barcode-box">
                    <div>* ${order.order_number} *</div>
                    <div style="font-size:9px;color:#777;margin-top:2px;">AWB / TRACKING: ${tracking}</div>
                  </div>

                  <div class="section-title">DELIVER TO / RECIPIENT:</div>
                  <div class="recipient-box">
                    <div class="recipient-name">${order.customer_name || "Valued Customer"}</div>
                    <div class="recipient-phone">📞 ${order.guest_phone || "No Phone"}</div>
                    <div class="recipient-addr">📍 ${addr}</div>
                  </div>

                  <div class="cod-banner">
                    <span>${order.payment_method === "cod" ? "CASH ON DELIVERY (COD)" : "PREPAID ORDER"}</span>
                    <span>৳${Number(order.total || 0).toLocaleString()}</span>
                  </div>

                  <div class="sender-box">
                    <strong>RETURN SENDER:</strong> Orizino Bangladesh · Hotline: +880 1888-000000 · Dhaka, Bangladesh
                  </div>
                </div>
              `;
            })
            .join("")}
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4 pt-1 pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-[22px] sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Printer className="w-6 h-6 text-primary" /> Slips &amp; 4x6 Labels
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate 4x6 thermal shipping labels, barcodes, and 80mm packing slips
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-2xl">
            <button
              onClick={() => setFormat("4x6")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
                format === "4x6" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
              }`}
            >
              4x6 Thermal
            </button>
            <button
              onClick={() => setFormat("80mm")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
                format === "80mm" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
              }`}
            >
              80mm Slip
            </button>
            <button
              onClick={() => setFormat("a4")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
                format === "a4" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
              }`}
            >
              A4 Sheet
            </button>
          </div>

          <Button
            onClick={handlePrintSelected}
            disabled={selectedIds.length === 0}
            className="h-10 rounded-2xl gap-2 font-semibold text-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Selected ({selectedIds.length})
          </Button>
        </div>
      </div>

      {/* Filter and Selection Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders to print..."
            className="pl-10 h-11 rounded-2xl w-full"
          />
        </div>

        <Button variant="outline" size="sm" onClick={selectAll} className="h-11 rounded-2xl text-xs gap-1.5 shrink-0">
          {selectedIds.length === orders.length && orders.length > 0 ? (
            <>
              <CheckSquare className="w-4 h-4 text-primary" /> Deselect All
            </>
          ) : (
            <>
              <Square className="w-4 h-4" /> Select All ({orders.length})
            </>
          )}
        </Button>
      </div>

      {/* Orders Grid for Label Selection */}
      {isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="p-8 text-center rounded-3xl border border-border/60 bg-card text-muted-foreground text-sm">
          No orders found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {orders.map((order) => {
            const isSelected = selectedIds.includes(order.id);
            const addr =
              typeof order.shipping_address === "string"
                ? order.shipping_address
                : order.shipping_address?.address_line || order.shipping_address?.city || "No address";

            return (
              <div
                key={order.id}
                onClick={() => toggleSelect(order.id)}
                className={`p-4 rounded-3xl border transition-all cursor-pointer select-none ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40"
                    : "border-border/60 bg-card hover:border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{order.order_number}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{order.customer_name || "Guest"}</p>
                    <p className="text-xs text-muted-foreground font-mono">{order.guest_phone || "No phone"}</p>
                    <p className="text-xs text-muted-foreground truncate mt-1">{addr}</p>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="w-5 h-5 rounded-lg border flex items-center justify-center bg-background">
                      {isSelected && <div className="w-3 h-3 rounded-sm bg-primary" />}
                    </div>
                    <span className="text-xs font-bold text-primary font-mono">
                      ৳{Number(order.total || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
