"use client";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Package, ShoppingCart, Users, TrendingUp, TrendingDown,
  Star, ArrowRight, Clock, CheckCircle2, XCircle, Truck, Eye,
  BarChart3, Activity, Layers, Filter, AlertTriangle, Globe, ExternalLink,
  Phone, Key, Headphones, ChevronRight, Zap, Target, DollarSign,
  ArrowUpRight, PieChart as PieChartIcon, RefreshCw, Box
} from "lucide-react";
import CurrencyIcon from "@/components/CurrencyIcon";
import { useNavigate } from "@/lib/router-compat";
import DeviceBrowserBreakdown from "@/components/admin/DeviceBrowserBreakdown";
import GeoBreakdown from "@/components/admin/GeoBreakdown";
import { format, subDays, startOfDay, differenceInDays } from "date-fns";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { calculateOrderFinancials } from "@orizino/shared";

/* ── Executive Stat Card ── */
const StatCard = ({
  title, value, icon: Icon, iconNode, trend, trendLabel, color = "text-primary", subtitle, bgGlow
}: {
  title: string; value: string | number; icon?: any; iconNode?: React.ReactNode;
  trend?: number; trendLabel?: string; color?: string; subtitle?: string; bgGlow?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35 }}
    className="h-full"
  >
    <Card className="relative overflow-hidden border border-border/60 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-xl group hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 h-full">
      {bgGlow && (
        <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-2xl opacity-15 pointer-events-none ${bgGlow}`} />
      )}
      <CardContent className="p-4 sm:p-5 h-full flex flex-col justify-between relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{title}</p>
            <p className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight truncate">{value}</p>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-secondary/80 border border-border/50 flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/30 group-hover:scale-105 transition-all duration-300 shrink-0 shadow-sm">
            {iconNode ?? <Icon className={`w-5 h-5 ${color}`} />}
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between gap-2 text-xs">
          {trend !== undefined ? (
            <div className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-[11px] ${trend >= 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
              {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{trend >= 0 ? "+" : ""}{trend}%</span>
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground">{subtitle ?? "Live Metric"}</span>
          )}
          {trendLabel && <span className="text-[11px] text-muted-foreground/80 truncate">{trendLabel}</span>}
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

/* ── Order status helpers ── */
const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending:    { label: "Pending",    color: "bg-amber-500/10 text-amber-400 border-amber-500/20",      icon: Clock },
  confirmed:  { label: "Confirmed",  color: "bg-blue-500/10 text-blue-400 border-blue-500/20",         icon: CheckCircle2 },
  shipped:    { label: "Shipped",    color: "bg-violet-500/10 text-violet-400 border-violet-500/20",    icon: Truck },
  delivered:  { label: "Delivered",  color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
  cancelled:  { label: "Cancelled",  color: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
};

const PIE_COLORS = [
  "hsl(45, 90%, 55%)",   // pending → amber
  "hsl(210, 80%, 55%)",  // confirmed → blue
  "hsl(270, 70%, 55%)",  // shipped → violet
  "hsl(160, 84%, 45%)",  // delivered → primary
  "hsl(0, 72%, 51%)",    // cancelled → destructive
];

/* ── Main Component ── */
const SalesDashboard = () => {
  const navigate = useNavigate();
  const { formatPrice, currency } = useCurrency();
  /* ── Date range state ── */
  const [rangePreset, setRangePreset] = useState("7d");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [chartTab, setChartTab] = useState("revenue");

  const dateRange = useMemo(() => {
    if (rangePreset === "custom" && customFrom) {
      return {
        from: startOfDay(customFrom).toISOString(),
        to: customTo ? new Date(startOfDay(customTo).getTime() + 86400000 - 1).toISOString() : new Date().toISOString(),
        days: differenceInDays(customTo || new Date(), customFrom) + 1,
        label: `${format(customFrom, "MMM dd")} – ${format(customTo || new Date(), "MMM dd")}`,
      };
    }
    const presets: Record<string, number> = { "7d": 7, "14d": 14, "30d": 30, "90d": 90 };
    const days = presets[rangePreset] || 7;
    return {
      from: subDays(new Date(), days).toISOString(),
      to: new Date().toISOString(),
      days,
      label: `Last ${days} days`,
    };
  }, [rangePreset, customFrom, customTo]);

  const prevRange = useMemo(() => {
    const d = dateRange.days;
    return {
      from: subDays(new Date(dateRange.from), d).toISOString(),
      to: dateRange.from,
    };
  }, [dateRange]);

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["admin-dashboard-stats", dateRange.from, dateRange.to],
    queryFn: async () => {
      const [products, orders, profiles, reviews, recentOrders, previousOrders] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders" as any).select("id, total, subtotal, shipping_fee, coupon_discount, loyalty_discount, status, payment_method, is_delivery_prepaid, created_at"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("reviews").select("id", { count: "exact", head: true }),
        supabase.from("orders" as any).select("id, total, subtotal, shipping_fee, coupon_discount, loyalty_discount, status, payment_method, is_delivery_prepaid, created_at").gte("created_at", dateRange.from).lte("created_at", dateRange.to),
        supabase.from("orders" as any).select("id, total, subtotal, shipping_fee, coupon_discount, loyalty_discount, status, payment_method, is_delivery_prepaid, created_at").gte("created_at", prevRange.from).lt("created_at", prevRange.to),
      ]);

      const allOrders = orders.data ?? [];
      const financialSummary = calculateOrderFinancials(allOrders as any[]);
      const totalRevenue = financialSummary.recognizedRevenue;
      const netRevenue = financialSummary.netProductRevenue;
      const pendingOrders = financialSummary.pendingOrdersCount;
      const deliveredOrders = financialSummary.deliveredOrdersCount;

      const recentFin = calculateOrderFinancials((recentOrders.data ?? []) as any[]);
      const prevFin = calculateOrderFinancials((previousOrders.data ?? []) as any[]);
      const recentRevenue = recentFin.recognizedRevenue;
      const prevRevenue = prevFin.recognizedRevenue;
      const revenueTrend = prevRevenue > 0 ? Math.round(((recentRevenue - prevRevenue) / prevRevenue) * 100) : 0;

      const recentOrderCount = recentOrders.data?.length ?? 0;
      const prevOrderCount = previousOrders.data?.length ?? 0;
      const orderTrend = prevOrderCount > 0 ? Math.round(((recentOrderCount - prevOrderCount) / prevOrderCount) * 100) : 0;

      const statusBreakdown: Record<string, number> = {};
      (allOrders as any[]).forEach((o) => {
        statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;
      });

      const rangeOrders = (allOrders as any[]).filter(o => {
        const d = new Date(o.created_at);
        return d >= new Date(dateRange.from) && d <= new Date(dateRange.to);
      });

      // Advanced calculated KPIs
      const eligibleCount = financialSummary.confirmedOrdersCount;
      const aov = eligibleCount > 0 ? totalRevenue / eligibleCount : 0;
      const fulfillmentRate = allOrders.length > 0 ? Math.round((deliveredOrders / allOrders.length) * 100) : 0;

      return {
        products: products.count ?? 0,
        orders: allOrders.length,
        users: profiles.count ?? 0,
        reviews: reviews.count ?? 0,
        revenue: totalRevenue,
        netRevenue,
        shippingCollected: financialSummary.shippingFeesCollected,
        shippingLoss: financialSummary.shippingLossOnReturns,
        returnedValue: financialSummary.returnedProductsValue,
        pendingCodRevenue: financialSummary.pendingCodRevenue,
        pendingOrders,
        deliveredOrders,
        revenueTrend,
        orderTrend,
        statusBreakdown,
        allOrders,
        rangeOrders,
        aov,
        fulfillmentRate,
      };
    },
    staleTime: 30_000,
  });

  /* ── Fetch recent orders ── */
  const { data: latestOrders } = useQuery({
    queryKey: ["admin-latest-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, total, status, created_at, shipping_address")
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    staleTime: 30_000,
  });

  /* ── Fetch top products ── */
  const { data: topProducts } = useQuery({
    queryKey: ["admin-top-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, thumbnail, price, stock_quantity, avg_rating, review_count")
        .eq("is_active", true)
        .order("review_count", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    staleTime: 60_000,
  });

  /* ── Low stock products ── */
  const { data: lowStockProducts } = useQuery({
    queryKey: ["admin-low-stock"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, thumbnail, price, stock_quantity")
        .eq("is_active", true)
        .lt("stock_quantity", 10)
        .order("stock_quantity", { ascending: true })
        .limit(10);
      return data ?? [];
    },
    staleTime: 60_000,
  });

  // Fetch analytics & order shipping data for the geo map
  const { data: analyticsData = [] } = useQuery({
    queryKey: ["dashboard-analytics-geo", dateRange.from, dateRange.to],
    queryFn: async () => {
      const [analyticsRes, ordersRes] = await Promise.all([
        supabase
          .from("page_analytics")
          .select("metadata, created_at")
          .gte("created_at", dateRange.from)
          .lte("created_at", dateRange.to)
          .not("metadata", "is", null)
          .limit(5000),
        supabase
          .from("orders")
          .select("shipping_address, created_at")
          .gte("created_at", dateRange.from)
          .lte("created_at", dateRange.to)
          .not("shipping_address", "is", null)
          .limit(2000),
      ]);

      const events: any[] = [];

      // 1. Process page_analytics
      (analyticsRes.data ?? []).forEach((e: any) => {
        if (e.metadata && typeof e.metadata === "object") {
          events.push(e);
        }
      });

      // 2. Process orders shipping_address as high-confidence geo events
      (ordersRes.data ?? []).forEach((o: any) => {
        const addr = o.shipping_address as any;
        if (addr) {
          const country = addr.country || addr.country_name || "Bangladesh";
          const code = addr.country_code || (country.toLowerCase().includes("bangladesh") ? "BD" : country.slice(0, 2).toUpperCase());
          const city = addr.city || addr.district || addr.division || "Dhaka";
          events.push({
            created_at: o.created_at,
            metadata: {
              country,
              country_code: code,
              city,
            },
          });
        }
      });

      return events;
    },
    staleTime: 60_000,
  });

  const revenueChart = useMemo(() => {
    if (!stats?.rangeOrders) return [];
    const days: Record<string, { revenue: number; orders: number }> = {};
    for (let i = dateRange.days - 1; i >= 0; i--) {
      const d = format(subDays(new Date(dateRange.to), i), "MMM dd");
      days[d] = { revenue: 0, orders: 0 };
    }
    stats.rangeOrders.forEach((o: any) => {
      const d = format(new Date(o.created_at), "MMM dd");
      if (d in days) {
        days[d].revenue += Number(o.total);
        days[d].orders += 1;
      }
    });
    return Object.entries(days).map(([date, data]) => ({
      date,
      revenue: +data.revenue.toFixed(2),
      orders: data.orders,
      aov: data.orders > 0 ? +(data.revenue / data.orders).toFixed(2) : 0,
    }));
  }, [stats?.rangeOrders, dateRange]);

  /* ── Order status pie data ── */
  const pieData = useMemo(() => {
    if (!stats?.statusBreakdown) return [];
    const order = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
    return order
      .filter((s) => (stats.statusBreakdown[s] || 0) > 0)
      .map((s) => ({ name: statusConfig[s]?.label ?? s, value: stats.statusBreakdown[s] }));
  }, [stats?.statusBreakdown]);

  /* ── Sales conversion funnel data ── */
  const { data: funnelData } = useQuery({
    queryKey: ["admin-sales-funnel", dateRange.from, dateRange.to],
    queryFn: async () => {
      const [visitorsRes, cartRes, checkoutsRes, completedRes] = await Promise.all([
        supabase.from("page_analytics").select("session_id").eq("event_type", "page_view").gte("created_at", dateRange.from).lte("created_at", dateRange.to),
        supabase.from("cart_items").select("user_id").gte("created_at", dateRange.from).lte("created_at", dateRange.to),
        supabase.from("orders").select("id, status").gte("created_at", dateRange.from).lte("created_at", dateRange.to),
        supabase.from("orders").select("id").eq("status", "delivered").gte("created_at", dateRange.from).lte("created_at", dateRange.to),
      ]);

      const rawVisitors = new Set((visitorsRes.data ?? []).map((r) => r.session_id)).size;
      const rawCart = new Set((cartRes.data ?? []).map((r) => r.user_id)).size;
      const rawCheckouts = checkoutsRes.data?.length ?? 0;
      const rawCompleted = completedRes.data?.length ?? 0;

      // Monotonic Funnel Normalization (Visitors >= Cart Adds >= Checkouts >= Completed)
      const completed = rawCompleted;
      const checkouts = Math.max(rawCheckouts, completed);
      const cartAdds = Math.max(rawCart, checkouts);
      const visitors = Math.max(rawVisitors, cartAdds, 1);

      return [
        { name: "Visitors", value: visitors, fill: "hsl(217, 91%, 60%)" },
        { name: "Cart Adds", value: cartAdds, fill: "hsl(270, 95%, 65%)" },
        { name: "Checkouts", value: checkouts, fill: "hsl(38, 92%, 55%)" },
        { name: "Completed", value: completed, fill: "hsl(160, 84%, 45%)" },
      ];
    },
    staleTime: 60_000,
  });

  const quickActions = [
    { label: "Add Product", icon: Package, path: "/sales/products", color: "text-primary" },
    { label: "View Orders", icon: ShoppingCart, path: "/sales/orders", color: "text-amber-400" },
    { label: "Customers", icon: Users, path: "/sales/customers", color: "text-blue-400" },
    { label: "Couriers", icon: Truck, path: "/sales/couriers", color: "text-violet-400" },
  ];

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-12"
    >
      {/* Executive Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6 rounded-3xl border border-border/60 bg-gradient-to-r from-card/90 via-card/60 to-primary/5 backdrop-blur-2xl shadow-xl shadow-black/10">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Zap className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-foreground tracking-tight">
              Executive Sales Intelligence
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Real-time analytics, revenue forecasting & operational performance tracking
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-9 gap-1.5 text-xs border-border/60 hover:bg-muted/50 rounded-xl"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>

          <Select value={rangePreset} onValueChange={(v) => setRangePreset(v)}>
            <SelectTrigger className="w-[140px] sm:w-[150px] h-9 text-xs font-medium rounded-xl border-border/60 bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="14d">Last 14 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>

          <Badge variant="outline" className="h-9 px-3 text-xs font-semibold bg-primary/5 text-primary border-primary/20 rounded-xl hidden sm:inline-flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            {dateRange.label}
          </Badge>
        </div>

        {rangePreset === "custom" && (
          <div className="w-full flex items-center gap-2 pt-2 border-t border-border/40">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs flex-1 rounded-xl", !customFrom && "text-muted-foreground")}>
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {customFrom ? format(customFrom, "MMM dd, yyyy") : "From Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customFrom}
                  onSelect={setCustomFrom}
                  disabled={(date) => date > new Date()}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">–</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs flex-1 rounded-xl", !customTo && "text-muted-foreground")}>
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {customTo ? format(customTo, "MMM dd, yyyy") : "To Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={customTo}
                  onSelect={setCustomTo}
                  disabled={(date) => date > new Date() || (customFrom ? date < customFrom : false)}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* 6 Executive KPI Metric Cards (2 rows of 3 on desktop for spacious display) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        <StatCard
          title="Total Revenue"
          value={formatPrice(stats?.revenue ?? 0)}
          iconNode={<CurrencyIcon code={currency} className="w-5 h-5 text-primary" />}
          trend={stats?.revenueTrend}
          trendLabel="vs prev range"
          color="text-primary"
          bgGlow="bg-primary"
        />
        <StatCard
          title="Total Orders"
          value={stats?.orders ?? 0}
          icon={ShoppingCart}
          trend={stats?.orderTrend}
          trendLabel="vs prev range"
          color="text-amber-400"
          bgGlow="bg-amber-500"
        />
        <StatCard
          title="Avg Order Value (AOV)"
          value={formatPrice(stats?.aov ?? 0)}
          icon={Target}
          subtitle="Revenue per order"
          color="text-blue-400"
          bgGlow="bg-blue-500"
        />
        <StatCard
          title="Fulfillment Rate"
          value={`${stats?.fulfillmentRate ?? 0}%`}
          icon={Truck}
          subtitle={`${stats?.deliveredOrders ?? 0} delivered`}
          color="text-emerald-400"
          bgGlow="bg-emerald-500"
        />
        <StatCard
          title="Active Catalog"
          value={stats?.products ?? 0}
          icon={Package}
          subtitle="Listed items"
          color="text-violet-400"
          bgGlow="bg-violet-500"
        />
        <StatCard
          title="Registered Clients"
          value={stats?.users ?? 0}
          icon={Users}
          subtitle="Profiles active"
          color="text-accent"
          bgGlow="bg-amber-500"
        />
      </div>

      {/* Interactive Multi-Tab Analytics Chart & Order Status Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Multi-Metric Chart (2 cols) */}
        <Card className="border border-border/60 bg-card/60 backdrop-blur-xl shadow-xl lg:col-span-2 flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Performance Analytics
                </CardTitle>
                <CardDescription>Daily revenue, order volume & AOV trajectories</CardDescription>
              </div>

              <Tabs value={chartTab} onValueChange={setChartTab} className="w-full sm:w-auto">
                <TabsList className="grid grid-cols-3 h-8 p-1 bg-secondary/40 border border-border/40 rounded-xl">
                  <TabsTrigger value="revenue" className="text-[11px] font-semibold rounded-lg px-2.5">Revenue</TabsTrigger>
                  <TabsTrigger value="orders" className="text-[11px] font-semibold rounded-lg px-2.5">Orders</TabsTrigger>
                  <TabsTrigger value="aov" className="text-[11px] font-semibold rounded-lg px-2.5">AOV</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="h-[250px] sm:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartTab === "revenue" ? (
                  <AreaChart data={revenueChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={{ stroke: "hsl(var(--border)/0.5)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => formatPrice(v)} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "14px",
                        fontSize: "12px",
                        boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)",
                      }}
                      formatter={(val: number) => [formatPrice(val), "Revenue"]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#revGrad)" />
                  </AreaChart>
                ) : chartTab === "orders" ? (
                  <BarChart data={revenueChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={{ stroke: "hsl(var(--border)/0.5)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "14px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="orders" fill="hsl(210, 80%, 55%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                ) : (
                  <AreaChart data={revenueChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="aovGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(270, 70%, 55%)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="hsl(270, 70%, 55%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={{ stroke: "hsl(var(--border)/0.5)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => formatPrice(v)} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "14px",
                        fontSize: "12px",
                      }}
                      formatter={(val: number) => [formatPrice(val), "Avg Order Value"]}
                    />
                    <Area type="monotone" dataKey="aov" stroke="hsl(270, 70%, 55%)" strokeWidth={2.5} fill="url(#aovGrad)" />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Order Status Distribution Pie */}
        <Card className="border border-border/60 bg-card/60 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <CardHeader className="pb-2 border-b border-border/40">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-accent" />
              Order Status Distribution
            </CardTitle>
            <CardDescription>Live fulfillment status mix</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex-1 flex flex-col justify-between">
            {pieData.length > 0 ? (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                No order status records yet
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-border/40">
              {pieData.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-2 p-1.5 rounded-lg bg-secondary/20">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium truncate text-foreground">{entry.name}</p>
                    <p className="text-[10px] font-semibold text-muted-foreground">{entry.value} orders</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Conversion Funnel & Call Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Conversion Funnel (2 cols) */}
        <Card className="border border-border/60 bg-card/60 backdrop-blur-xl shadow-xl lg:col-span-2 flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary" />
                  Sales Conversion Funnel
                </CardTitle>
                <CardDescription>Audience progression: Visitors → Cart Adds → Checkouts → Completed</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5 flex-1 flex flex-col justify-between">
            {funnelData && funnelData[0]?.value > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Funnel Visual Bars */}
                <div className="space-y-4">
                  {funnelData.map((step, i) => {
                    const maxVal = funnelData[0].value;
                    const pct = maxVal > 0 ? (step.value / maxVal) * 100 : 0;
                    const convRate = i > 0 && funnelData[i - 1].value > 0
                      ? ((step.value / funnelData[i - 1].value) * 100).toFixed(1)
                      : "100";

                    const stepGradients = [
                      "linear-gradient(90deg, #2563eb, #06b6d4)", // Visitors: Blue → Cyan
                      "linear-gradient(90deg, #7c3aed, #ec4899)", // Cart Adds: Purple → Pink
                      "linear-gradient(90deg, #f59e0b, #ea580c)", // Checkouts: Amber → Orange
                      "linear-gradient(90deg, #10b981, #059669)", // Completed: Emerald → Green
                    ];

                    return (
                      <div key={step.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: step.fill }} />
                            {step.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-display font-extrabold text-foreground">{step.value.toLocaleString()}</span>
                            {i > 0 && (
                              <Badge variant="outline" className="text-[10px] font-mono font-bold bg-secondary/50 border-border/50">
                                {convRate}%
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="h-9 rounded-2xl bg-secondary/40 overflow-hidden relative border border-border/40 p-1">
                          <motion.div
                            initial={{ width: "0%" }}
                            animate={{ width: `${Math.max(pct, 4)}%` }}
                            transition={{ duration: 0.8, delay: i * 0.12, ease: "easeOut" }}
                            className="h-full rounded-xl min-w-[12px]"
                            style={{ background: stepGradients[i % stepGradients.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Conversion Summary Matrix */}
                <div className="flex flex-col justify-center gap-3">
                  {[
                    { from: "Visitors", to: "Cart Add", idx: 1 },
                    { from: "Cart", to: "Checkout", idx: 2 },
                    { from: "Checkout", to: "Completed", idx: 3 },
                  ].map(({ from, to, idx }) => {
                    const prev = funnelData[idx - 1]?.value ?? 0;
                    const curr = funnelData[idx]?.value ?? 0;
                    const rate = prev > 0 ? ((curr / prev) * 100).toFixed(1) : "0.0";
                    const drop = prev > 0 ? (((prev - curr) / prev) * 100).toFixed(1) : "0.0";
                    return (
                      <div key={to} className="flex items-center gap-3 p-3.5 rounded-2xl border border-border/50 bg-secondary/20 hover:border-primary/40 hover:bg-secondary/30 transition-all">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center font-display font-bold text-xs shrink-0 shadow-sm" style={{ backgroundColor: `${funnelData[idx].fill}25`, color: funnelData[idx].fill, border: `1px solid ${funnelData[idx].fill}40` }}>
                          {rate}%
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground">{from} → {to}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{drop}% drop-off · {curr.toLocaleString()} of {prev.toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div className="p-4 rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/10 to-primary/5 text-center shadow-inner">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary/80">Overall Funnel Efficiency</p>
                    <p className="text-2xl sm:text-3xl font-display font-black text-primary my-1">
                      {funnelData[0].value > 0
                        ? ((funnelData[3].value / funnelData[0].value) * 100).toFixed(2)
                        : "0.00"}%
                    </p>
                    <p className="text-[11px] text-muted-foreground font-medium">Visitors to Completed Purchases</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                <Filter className="w-8 h-8 opacity-30 mb-2 text-primary" />
                <p className="text-sm font-semibold">No conversion telemetry captured</p>
                <p className="text-xs opacity-75 max-w-xs mt-1">Analytics data will aggregate automatically as store visitors browse, add items to cart, and place orders.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Call Analytics Component */}
        <CallAnalyticsSection dateRange={dateRange} />
      </div>

      {/* Visitor World Map */}
      <GeoBreakdown analyticsData={analyticsData} />

      {/* Detailed Operations Grid: Recent Orders & Stock Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders (2 cols) */}
        <Card className="border border-border/60 bg-card/60 backdrop-blur-xl shadow-xl lg:col-span-2 flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-primary" />
                  Live Recent Orders
                </CardTitle>
                <CardDescription>{stats?.pendingOrders ?? 0} orders awaiting processing</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary hover:text-primary hover:bg-primary/10 rounded-xl"
                onClick={() => navigate("/sales/orders")}
              >
                View all orders <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <ScrollArea className="h-[340px] sm:h-[380px]">
              <div className="divide-y divide-border/40">
                {(latestOrders ?? []).map((order) => {
                  const sc = statusConfig[order.status] || statusConfig.pending;
                  const StatusIcon = sc.icon;
                  const address = order.shipping_address as any;
                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-secondary/30 transition-all cursor-pointer group"
                      onClick={() => navigate("/sales/orders")}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${sc.color}`}>
                          <StatusIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            #{order.order_number}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {address?.name || address?.full_name || "Customer"} · {format(new Date(order.created_at), "MMM dd, HH:mm")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-sm font-display font-extrabold text-foreground">{formatPrice(Number(order.total))}</p>
                        <Badge variant="outline" className={`text-[10px] font-semibold ${sc.color}`}>{sc.label}</Badge>
                      </div>
                    </div>
                  );
                })}
                {(!latestOrders || latestOrders.length === 0) && (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                    No orders recorded yet
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Low Stock & Device Telemetry Sidebar */}
        <div className="space-y-6">
          {/* Low Stock Alert */}
          <Card className="border border-destructive/30 bg-card/60 backdrop-blur-xl shadow-xl">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  Inventory Stock Alert
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-bold text-destructive border-destructive/30 bg-destructive/10">
                  {lowStockProducts?.length ?? 0} low stock
                </Badge>
              </div>
              <CardDescription>Items below minimum inventory threshold (&lt;10)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[220px]">
                <div className="divide-y divide-border/40">
                  {(lowStockProducts ?? []).map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors cursor-pointer"
                      onClick={() => navigate("/sales/products")}
                    >
                      <div className="w-9 h-9 rounded-xl bg-secondary/80 border border-border/50 overflow-hidden shrink-0">
                        {product.thumbnail ? (
                          <img src={product.thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Box className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{product.name}</p>
                        <p className="text-[11px] text-muted-foreground">{formatPrice(Number(product.price))}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold shrink-0 ${
                          product.stock_quantity === 0
                            ? "text-destructive border-destructive/30 bg-destructive/10"
                            : product.stock_quantity <= 3
                            ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
                            : "text-muted-foreground"
                        }`}
                      >
                        {product.stock_quantity === 0 ? "Out of stock" : `${product.stock_quantity} left`}
                      </Badge>
                    </div>
                  ))}
                  {(!lowStockProducts || lowStockProducts.length === 0) && (
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                      All products are well-stocked 🎉
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Quick Hub Navigation Actions */}
          <Card className="border border-border/60 bg-card/60 backdrop-blur-xl shadow-xl">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-bold">Quick Operations</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2.5 pt-4">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  className="h-auto py-3.5 flex flex-col items-center gap-2 border-border/60 hover:border-primary/40 hover:bg-secondary/40 rounded-2xl transition-all"
                  onClick={() => navigate(action.path)}
                >
                  <action.icon className={`w-4 h-4 ${action.color}`} />
                  <span className="text-xs font-semibold">{action.label}</span>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Device & Browser Telemetry */}
          <DeviceBrowserBreakdown />
        </div>
      </div>
    </motion.div>
  );
};

/* ── Call Analytics Section ── */
const CallAnalyticsSection = ({ dateRange }: { dateRange: { from: string; to: string; days: number; label: string } }) => {
  const { data: callLogs = [] } = useQuery({
    queryKey: ["admin-call-analytics", dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_logs")
        .select("*")
        .gte("created_at", dateRange.from)
        .lte("created_at", dateRange.to)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const analytics = useMemo(() => {
    if (!callLogs.length) return null;

    const totalCalls = callLogs.length;
    const completed = callLogs.filter((c: any) => c.status === "completed");
    const connected = callLogs.filter((c: any) => c.status === "connected" || c.status === "completed");
    const missed = callLogs.filter((c: any) => c.status === "missed").length;
    const rejected = callLogs.filter((c: any) => c.status === "rejected").length;

    const completionRate = totalCalls > 0 ? ((connected.length / totalCalls) * 100).toFixed(1) : "0";
    const avgDuration = completed.length > 0
      ? Math.round(completed.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0) / completed.length)
      : 0;

    const dailyMap: Record<string, number> = {};
    for (let i = dateRange.days - 1; i >= 0; i--) {
      const d = format(subDays(new Date(dateRange.to), i), "MMM dd");
      dailyMap[d] = 0;
    }
    callLogs.forEach((c: any) => {
      const d = format(new Date(c.created_at), "MMM dd");
      if (d in dailyMap) dailyMap[d]++;
    });
    const dailyChart = Object.entries(dailyMap).map(([date, calls]) => ({ date, calls }));

    const statusData = [
      { name: "Completed", value: completed.length, fill: "hsl(160, 84%, 45%)" },
      { name: "Missed", value: missed, fill: "hsl(0, 84%, 60%)" },
      { name: "Rejected", value: rejected, fill: "hsl(45, 90%, 55%)" },
      { name: "Other", value: totalCalls - completed.length - missed - rejected, fill: "hsl(215, 20%, 50%)" },
    ].filter(s => s.value > 0);

    return { totalCalls, completionRate, avgDuration, missed, dailyChart, statusData };
  }, [callLogs, dateRange]);

  if (!analytics) {
    return (
      <Card className="border border-border/60 bg-card/60 backdrop-blur-xl shadow-xl flex flex-col justify-between">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            Voice & Support Telemetry
          </CardTitle>
          <CardDescription>Call center & helpline logs</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 flex-1 flex flex-col items-center justify-center text-center p-5">
          <div className="w-12 h-12 rounded-2xl bg-secondary/40 border border-border/50 flex items-center justify-center text-muted-foreground mb-3">
            <Phone className="w-5 h-5 opacity-40 text-primary" />
          </div>
          <p className="text-xs font-bold text-foreground">No call logs captured</p>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-[200px]">Voice & WhatsApp support logs will sync automatically when calls occur.</p>
        </CardContent>
      </Card>
    );
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <Card className="border border-border/60 bg-card/60 backdrop-blur-xl shadow-xl">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              Voice & Call Center Intelligence
            </CardTitle>
            <CardDescription>{dateRange.label}: {analytics.totalCalls} total call logs</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-3.5 rounded-2xl border border-border/40 bg-secondary/15 text-center">
              <p className="text-xs text-muted-foreground font-semibold">Total Calls</p>
              <p className="text-xl font-display font-extrabold text-foreground">{analytics.totalCalls}</p>
            </div>
            <div className="p-3.5 rounded-2xl border border-border/40 bg-secondary/15 text-center">
              <p className="text-xs text-muted-foreground font-semibold">Completion Rate</p>
              <p className="text-xl font-display font-extrabold text-emerald-400">{analytics.completionRate}%</p>
            </div>
            <div className="p-3.5 rounded-2xl border border-border/40 bg-secondary/15 text-center">
              <p className="text-xs text-muted-foreground font-semibold">Avg Duration</p>
              <p className="text-xl font-display font-extrabold text-foreground">{formatDuration(analytics.avgDuration)}</p>
            </div>
            <div className="p-3.5 rounded-2xl border border-border/40 bg-secondary/15 text-center">
              <p className="text-xs text-muted-foreground font-semibold">Missed Calls</p>
              <p className="text-xl font-display font-extrabold text-destructive">{analytics.missed}</p>
            </div>
          </div>

          <div className="lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Daily Call Frequency</p>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.dailyChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.4)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={{ stroke: "hsl(var(--border)/0.5)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }} />
                  <Bar dataKey="calls" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Call Outcomes</p>
            <div className="h-[150px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {analytics.statusData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {analytics.statusData.map((entry: any) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                  {entry.name} ({entry.value})
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesDashboard;
