import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  Store,
  ScanLine,
  PackageSearch,
  Truck,
  Printer,
  Headphones,
  Layers,
  RotateCcw,
  TrendingUp,
  Clock,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  Box,
  Radio,
  Check,
  PackageCheck
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { updateOrderStatus } from "@/lib/orders";

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  confirmed: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  processing: "bg-indigo-500/15 text-indigo-500 border-indigo-500/30",
  shipped: "bg-cyan-500/15 text-cyan-500 border-cyan-500/30",
  delivered: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

export function Dashboard() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["orderops-dashboard-stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [ordersRes, todayOrdersRes, openTicketsRes, stockRes] = (await Promise.all([
        supabase.from("orders").select("id, order_number, total, status, order_source, created_at, guest_name").order("created_at", { ascending: false }).limit(200),
        supabase.from("orders").select("id, total").gte("created_at", today.toISOString()),
        supabase.from("support_conversations").select("id", { count: "exact", head: true }).eq("status", "open"),
        (supabase.from as any)("products").select("stock"),
      ])) as any[];

      const allOrders: any[] = ordersRes.data || [];
      const todayOrders: any[] = todayOrdersRes.data || [];
      const todayRevenue = todayOrders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);
      const pendingFulfillment = allOrders.filter((o: any) => o.status === "pending" || o.status === "processing" || o.status === "confirmed").length;
      const offlineCount = allOrders.filter((o: any) => o.order_source !== "online").length;
      const totalUnitsStock = (stockRes.data || []).reduce((sum: number, p: any) => sum + (Number(p.stock) || 0), 0);

      return {
        todayOrdersCount: todayOrders.length,
        todayRevenue,
        pendingFulfillment,
        offlineCount,
        openTickets: openTicketsRes.count || 0,
        totalUnitsStock,
        recentOrders: allOrders.slice(0, 8),
      };
    },
    refetchInterval: 15_000,
  });

  const handleQuickAdvance = async (orderId: string, orderNumber: string, nextStatus: string) => {
    try {
      await updateOrderStatus(orderId, nextStatus);
      toast.success(`Order ${orderNumber} updated to ${nextStatus}`);
      qc.invalidateQueries({ queryKey: ["orderops-dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to advance order");
    }
  };

  return (
    <div className="space-y-6 pt-1 pb-10">
      {/* Top Welcome / Operations Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5 font-display">
            <LayoutGrid className="w-7 h-7 text-primary shrink-0" />
            <span>Dashboard</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Real-time fulfillment metrics, offline orders & warehouse scanner
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <Link
            to="/offline"
            className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 shadow-sm hover:opacity-90 transition-all"
          >
            <Store className="w-4 h-4" />
            <span>New POS Order</span>
          </Link>
          <Link
            to="/scanner"
            className="h-9 px-3.5 rounded-xl border border-border/80 bg-card/80 text-foreground text-xs font-semibold flex items-center gap-1.5 hover:bg-card transition-all"
          >
            <ScanLine className="w-4 h-4 text-primary" />
            <span>Scanner</span>
          </Link>
        </div>
      </div>

      {/* ── Main KPI Bento Grid (4 Symmetrical Tiles) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-border/70 bg-card p-4.5 shadow-xs space-y-1.5 hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Today's Sales</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-foreground font-display tabular-nums">
            ৳{(stats?.todayRevenue || 0).toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{stats?.todayOrdersCount || 0} orders processed today</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4.5 shadow-xs space-y-1.5 hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Pending Packing</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-amber-500 font-display tabular-nums">
            {stats?.pendingFulfillment || 0}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Awaiting pack & courier booking</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4.5 shadow-xs space-y-1.5 hover:border-blue-500/40 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Open Support Tickets</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Headphones className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-blue-500 font-display tabular-nums">
            {stats?.openTickets || 0}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>Customer live conversations</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4.5 shadow-xs space-y-1.5 hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Warehouse Stock</span>
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-foreground font-display tabular-nums">
            {(stats?.totalUnitsStock || 0).toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span>Live inventory units</span>
          </div>
        </div>
      </div>

      {/* ── Priority Action Launchers (2 High-Priority Hero Banners) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Offline POS Counter Banner */}
        <Link
          to="/offline"
          className="group relative rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-xs hover:border-primary transition-all flex items-center justify-between gap-4 overflow-hidden"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition-transform">
              <Store className="w-6 h-6" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                  Offline Orders
                </h3>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                  Fast Sale
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                Walk-in counter, WhatsApp, TikTok & Phone sales
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform shrink-0" />
        </Link>

        {/* Scanner Terminal Banner */}
        <Link
          to="/scanner"
          className="group relative rounded-2xl border border-border/80 bg-gradient-to-br from-secondary/50 via-card to-card p-5 shadow-xs hover:border-primary/50 transition-all flex items-center justify-between gap-4 overflow-hidden"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-secondary text-foreground flex items-center justify-center border border-border shrink-0 group-hover:scale-105 transition-transform">
              <ScanLine className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                  Barcode Scanner
                </h3>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                  Camera + Laser
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                Verify parcel items, pack orders & check serials
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all shrink-0" />
        </Link>
      </div>

      {/* ── Operational Modules Shortcuts (4 Symmetrical Cards) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link
          to="/orders"
          className="p-4 rounded-xl border border-border/70 bg-card hover:border-primary/40 hover:bg-card/90 flex flex-col justify-between gap-3 shadow-2xs transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <PackageSearch className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">Orders</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Fulfillment & deliveries</p>
          </div>
        </Link>

        <Link
          to="/labels"
          className="p-4 rounded-xl border border-border/70 bg-card hover:border-amber-500/40 hover:bg-card/90 flex flex-col justify-between gap-3 shadow-2xs transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground group-hover:text-amber-500 transition-colors">Shipping Labels</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Print thermal labels & slips</p>
          </div>
        </Link>

        <Link
          to="/dispatch"
          className="p-4 rounded-xl border border-border/70 bg-card hover:border-cyan-500/40 hover:bg-card/90 flex flex-col justify-between gap-3 shadow-2xs transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-all" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground group-hover:text-cyan-500 transition-colors">Courier Dispatch</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Steadfast & Pathao handoff</p>
          </div>
        </Link>

        <Link
          to="/returns"
          className="p-4 rounded-xl border border-border/70 bg-card hover:border-destructive/40 hover:bg-card/90 flex flex-col justify-between gap-3 shadow-2xs transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-destructive group-hover:translate-x-0.5 transition-all" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground group-hover:text-destructive transition-colors">Returns & Exchange</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Intake & restocking</p>
          </div>
        </Link>
      </div>

      {/* ── Recent Live Fulfillment Stream ── */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Live Orders Stream</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-mono">
              Auto-Refresh
            </span>
          </div>
          <Link to="/orders" className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
            <span>Fulfillment Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-2.5">
          {isLoading && (
            <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Fetching orders stream…</p>
            </div>
          )}

          {stats?.recentOrders?.length === 0 && !isLoading && (
            <p className="text-center py-6 text-xs text-muted-foreground">No orders found in recent queue.</p>
          )}

          {stats?.recentOrders?.map((o: any) => (
            <div
              key={o.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-muted/20 border border-border/50 hover:border-border transition-colors gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center text-primary font-bold shrink-0">
                  <Box className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground text-sm truncate">{o.order_number}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${STATUS_COLOR[o.status] || "bg-muted text-muted-foreground"}`}>
                      {o.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {o.guest_name || "Direct Customer"} · <span className="capitalize">{o.order_source || "online"}</span> · {format(new Date(o.created_at), "MMM d, h:mm a")}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                <p className="text-sm font-bold text-foreground tabular-nums">৳{Number(o.total || 0).toLocaleString()}</p>
                <div className="flex items-center gap-1.5">
                  {o.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => handleQuickAdvance(o.id, o.order_number, "confirmed")}
                      className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-semibold hover:bg-blue-500/20 transition-colors"
                    >
                      Confirm
                    </button>
                  )}
                  {o.status === "confirmed" && (
                    <button
                      type="button"
                      onClick={() => handleQuickAdvance(o.id, o.order_number, "processing")}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-semibold hover:bg-indigo-500/20 transition-colors"
                    >
                      Pack
                    </button>
                  )}
                  {o.status === "processing" && (
                    <button
                      type="button"
                      onClick={() => handleQuickAdvance(o.id, o.order_number, "shipped")}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 text-xs font-semibold hover:bg-cyan-500/20 transition-colors"
                    >
                      Dispatch
                    </button>
                  )}
                  <Link
                    to="/orders"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border transition-all"
                    title="View details"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
