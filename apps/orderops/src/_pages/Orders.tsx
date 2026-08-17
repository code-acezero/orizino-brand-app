import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listOrders, updateOrderStatus, type OrderRow } from "@/lib/orders";
import { generateInvoice, printInvoiceHtml } from "@/lib/invoice";
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
} from "lucide-react";
import { format } from "date-fns";

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
  offline: "Counter POS",
  page: "Facebook",
  whatsapp: "WhatsApp",
  tiktok: "TikTok",
  instagram: "Instagram",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-500 border-amber-500/20",
  confirmed: "bg-blue-500/15 text-blue-500 border-blue-500/20",
  processing: "bg-indigo-500/15 text-indigo-500 border-indigo-500/20",
  shipped: "bg-cyan-500/15 text-cyan-500 border-cyan-500/20",
  delivered: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20",
  cancelled: "bg-destructive/15 text-destructive border-destructive/20",
};

function OrderCard({ order }: { order: OrderRow }) {
  const [open, setOpen] = useState(false);
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

  return (
    <div className="rounded-3xl border border-border/70 bg-card/80 shadow-2xs overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-4 text-left cursor-pointer active:bg-secondary/40"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-bold font-mono text-foreground truncate">
              {order.order_number}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] px-2 py-0.5 capitalize font-semibold ${
                STATUS_COLOR[order.status] ?? "bg-muted text-muted-foreground"
              }`}
            >
              {order.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {order.customer_name || order.guest_phone || order.guest_email || "Guest Customer"} ·{" "}
            <span className="font-semibold text-foreground/80">
              {SOURCE_LABEL[order.order_source] ?? order.order_source}
            </span>
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm sm:text-base font-bold font-display text-foreground">
            ৳{Number(order.total).toLocaleString()}
          </p>
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(order.created_at), "MMM d, h:mm a")}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3.5 border-t border-border/60 pt-3 bg-secondary/15 animate-in fade-in">
          {/* Customer info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-card/60 p-3 rounded-2xl border border-border/60">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-muted-foreground">Phone:</span>
              <span className="font-medium text-foreground">
                {order.guest_phone || "N/A"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium text-foreground truncate">
                {order.guest_email || "N/A"}
              </span>
            </div>
            {order.shipping_address && (
              <div className="sm:col-span-2 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-muted-foreground">Address:</span>
                <span className="font-medium text-foreground truncate">
                  {typeof order.shipping_address === "string"
                    ? order.shipping_address
                    : order.shipping_address?.address_line || order.shipping_address?.city || "Address on file"}
                </span>
              </div>
            )}
          </div>

          {/* Quick status switcher */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Change Status:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.filter((s) => s !== "all").map((s) => (
                <button
                  key={s}
                  disabled={updating || order.status === s}
                  onClick={() => void setStatus(s)}
                  className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                    order.status === s
                      ? "bg-primary text-primary-foreground shadow-sm scale-105"
                      : "bg-secondary text-foreground hover:bg-secondary/80 active:scale-95"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void invoice(false)}
              className="flex-1 h-10 rounded-2xl text-xs font-semibold gap-1.5 cursor-pointer bg-card"
            >
              <Printer className="w-3.5 h-3.5" /> Print Invoice
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void invoice(true)}
              className="flex-1 h-10 rounded-2xl text-xs font-semibold gap-1.5 cursor-pointer bg-card"
            >
              <Mail className="w-3.5 h-3.5" /> Email Invoice
            </Button>
          </div>
        </div>
      )}
    </div>
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

  return (
    <div className="space-y-4 pt-1 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <PackageSearch className="w-5 h-5 text-primary" />
            <span>Fulfillment Queue</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            All channels, pending shipments & order statuses
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="rounded-xl h-8 px-2.5 text-xs gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order number, phone or customer…"
          className="h-11 rounded-2xl pl-10 text-xs sm:text-sm bg-card/70 border-border/70"
        />
      </div>

      {/* Status filter pills */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`shrink-0 text-xs px-3.5 py-1.5 rounded-full font-bold capitalize transition-all cursor-pointer ${
              status === s
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "all" ? "All statuses" : s}
          </button>
        ))}
      </div>

      {/* Source filter pills */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {SOURCE_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setSource(s)}
            className={`shrink-0 text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all cursor-pointer ${
              source === s
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-secondary/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "all" ? "All Channels" : SOURCE_LABEL[s] ?? s}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {isLoading && (
          <p className="text-xs text-muted-foreground text-center py-10">Loading orders…</p>
        )}
        {!isLoading && (data ?? []).length === 0 && (
          <div className="text-center py-12 border border-border/60 rounded-3xl bg-card/40 text-xs text-muted-foreground">
            No orders match these filters
          </div>
        )}
        {(data ?? []).map((o) => (
          <OrderCard key={o.id} order={o} />
        ))}
      </div>
    </div>
  );
}
