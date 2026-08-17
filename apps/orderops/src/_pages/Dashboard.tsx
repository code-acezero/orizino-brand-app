import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";
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
} from "lucide-react";
import { format } from "date-fns";

export function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["orderops-dashboard-stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [ordersRes, todayOrdersRes, openTicketsRes, stockRes] = (await Promise.all([
        supabase.from("orders").select("id, total, status, order_source, created_at").order("created_at", { ascending: false }).limit(200),
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

  return (
    <div className="space-y-6 pt-1 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2 font-display">
          <LayoutGrid className="w-6 h-6 text-primary" />
          <span>Operations Command</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Realtime sales metrics, fast counter operations & fulfillment terminal
        </p>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-3xl border border-border/70 bg-card/70 backdrop-blur-md p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold mb-1">
            <span>Today's Sales</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-foreground font-display">
            ৳{(stats?.todayRevenue || 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {stats?.todayOrdersCount || 0} orders today
          </p>
        </div>

        <div className="rounded-3xl border border-border/70 bg-card/70 backdrop-blur-md p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold mb-1">
            <span>Pending Packing</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-500 font-display">
            {stats?.pendingFulfillment || 0}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Needs packing & dispatch</p>
        </div>

        <div className="rounded-3xl border border-border/70 bg-card/70 backdrop-blur-md p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold mb-1">
            <span>Support Tickets</span>
            <Headphones className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-foreground font-display">
            {stats?.openTickets || 0}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Open customer tickets</p>
        </div>

        <div className="rounded-3xl border border-border/70 bg-card/70 backdrop-blur-md p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold mb-1">
            <span>Inventory Stock</span>
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground font-display">
            {(stats?.totalUnitsStock || 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Live stock in warehouse</p>
        </div>
      </div>

      {/* Priority Action Tiles (Mobile-First High Touch) */}
      <div>
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
          Priority Operations
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Tile 1: Offline Orders POS */}
          <Link
            to="/offline"
            className="group rounded-3xl border border-primary/30 bg-primary/8 p-5 flex items-center justify-between shadow-md hover:bg-primary/12 transition-all"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shrink-0">
                <Store className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                  Offline Orders POS
                </h3>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  Walk-in counter, WhatsApp, TikTok & Facebook sales
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform shrink-0" />
          </Link>

          {/* Tile 2: Scanner Terminal */}
          <Link
            to="/scanner"
            className="group rounded-3xl border border-border/80 bg-card/80 p-5 flex items-center justify-between shadow-md hover:bg-card transition-all"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-secondary text-foreground flex items-center justify-center border border-border shrink-0">
                <ScanLine className="w-6 h-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                  Product & Order Scanner
                </h3>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  Scan normal orders & serial numbers in real time
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform shrink-0" />
          </Link>
        </div>
      </div>

      {/* Operations Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Link
          to="/orders"
          className="p-3.5 rounded-2xl border border-border/70 bg-card/60 hover:bg-card flex flex-col gap-1.5 transition-all"
        >
          <PackageSearch className="w-5 h-5 text-primary" />
          <span className="text-xs font-bold text-foreground">Fulfillment Queue</span>
          <span className="text-[10px] text-muted-foreground">Order packing list</span>
        </Link>
        <Link
          to="/stock"
          className="p-3.5 rounded-2xl border border-border/70 bg-card/60 hover:bg-card flex flex-col gap-1.5 transition-all"
        >
          <Layers className="w-5 h-5 text-emerald-500" />
          <span className="text-xs font-bold text-foreground">Stock & Serials</span>
          <span className="text-[10px] text-muted-foreground">Inventory ledger</span>
        </Link>
        <Link
          to="/support"
          className="p-3.5 rounded-2xl border border-border/70 bg-card/60 hover:bg-card flex flex-col gap-1.5 transition-all"
        >
          <Headphones className="w-5 h-5 text-blue-500" />
          <span className="text-xs font-bold text-foreground">Support Inbox</span>
          <span className="text-[10px] text-muted-foreground">Customer tickets</span>
        </Link>
        <Link
          to="/labels"
          className="p-3.5 rounded-2xl border border-border/70 bg-card/60 hover:bg-card flex flex-col gap-1.5 transition-all"
        >
          <Printer className="w-5 h-5 text-amber-500" />
          <span className="text-xs font-bold text-foreground">Slips & Labels</span>
          <span className="text-[10px] text-muted-foreground">Thermal 4x6 labels</span>
        </Link>
      </div>

      {/* Recent Orders Ticker */}
      <div className="rounded-3xl border border-border/70 bg-card/60 p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span>Recent Orders Stream</span>
          </h3>
          <Link to="/orders" className="text-xs text-primary font-semibold hover:underline">
            View All →
          </Link>
        </div>

        <div className="space-y-2">
          {isLoading && (
            <p className="text-center py-6 text-xs text-muted-foreground">Loading stream…</p>
          )}
          {stats?.recentOrders?.map((o: any) => (
            <div
              key={o.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/30 border border-border/40 text-xs"
            >
              <div className="min-w-0">
                <p className="font-mono font-bold text-foreground truncate">{o.order_number}</p>
                <p className="text-[10px] text-muted-foreground capitalize">
                  {o.order_source} · {format(new Date(o.created_at), "h:mm a")}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-foreground">৳{Number(o.total).toLocaleString()}</p>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                  {o.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
