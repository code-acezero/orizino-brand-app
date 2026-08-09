import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listOrders, updateOrderStatus, type OrderRow } from "@/lib/orders";
import { generateInvoice, printInvoiceHtml } from "@/lib/invoice";
import { Input } from "@ui/components/ui/input";
import { Search, Printer, Mail, ChevronDown } from "lucide-react";

const STATUS_OPTIONS = ["all", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
const SOURCE_OPTIONS = ["all", "online", "offline", "page", "whatsapp", "tiktok", "instagram"];
const SOURCE_LABEL: Record<string, string> = {
  online: "Online",
  offline: "Offline",
  page: "Page",
  whatsapp: "WhatsApp",
  tiktok: "TikTok",
  instagram: "Instagram",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700",
  confirmed: "bg-blue-500/15 text-blue-700",
  processing: "bg-indigo-500/15 text-indigo-700",
  shipped: "bg-cyan-500/15 text-cyan-700",
  delivered: "bg-emerald-500/15 text-emerald-700",
  cancelled: "bg-red-500/15 text-red-700",
};

function OrderCard({ order }: { order: OrderRow }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const setStatus = async (status: string) => {
    await updateOrderStatus(order.id, status);
    qc.invalidateQueries({ queryKey: ["orders"] });
  };

  const invoice = async (sendEmail: boolean) => {
    const r = await generateInvoice(order.id, sendEmail);
    if (!sendEmail) printInvoiceHtml(r.invoice_html);
  };

  return (
    <div className="rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium truncate">{order.order_number}</p>
          <p className="text-xs text-muted-foreground truncate">
            {order.customer_name || order.guest_phone || order.guest_email || "Guest"} · {SOURCE_LABEL[order.order_source] ?? order.order_source}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold">৳{Number(order.total).toLocaleString()}</p>
          <span className={`inline-block mt-0.5 text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[order.status] ?? "bg-muted"}`}>{order.status}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/60 pt-3">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.filter((s) => s !== "all").map((s) => (
              <button
                key={s}
                onClick={() => void setStatus(s)}
                className={`text-xs px-2.5 py-1.5 rounded-full font-medium transition-colors ${
                  order.status === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground active:bg-muted/70"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => void invoice(false)} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-muted py-2.5 text-xs font-medium">
              <Printer className="w-3.5 h-3.5" /> Print invoice
            </button>
            <button onClick={() => void invoice(true)} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-muted py-2.5 text-xs font-medium">
              <Mail className="w-3.5 h-3.5" /> Email invoice
            </button>
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

  const { data, isLoading } = useQuery({
    queryKey: ["orders", status, source, search],
    queryFn: () => listOrders({ status, source, search: search || undefined }),
  });

  return (
    <div className="space-y-4 pt-1">
      <div>
        <h1 className="text-[22px] sm:text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground">Every channel, one list</p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order number or customer…"
          className="h-11 rounded-2xl pl-10 text-[15px]"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              status === s ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
            }`}
          >
            {s === "all" ? "All statuses" : s}
          </button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {SOURCE_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setSource(s)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              source === s ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            {s === "all" ? "All sources" : SOURCE_LABEL[s] ?? s}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {isLoading && <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>}
        {!isLoading && (data ?? []).length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No orders match these filters</p>}
        {(data ?? []).map((o) => (
          <OrderCard key={o.id} order={o} />
        ))}
      </div>
    </div>
  );
}
