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
  Phone, Key, Headphones, ChevronRight,
} from "lucide-react";
import CurrencyIcon from "@/components/CurrencyIcon";
import { useNavigate } from "@/lib/router-compat";
import DeviceBrowserBreakdown from "@/components/admin/DeviceBrowserBreakdown";
import GeoBreakdown from "@/components/admin/GeoBreakdown";
import { format, subDays, startOfDay, differenceInDays } from "date-fns";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/* ── Stat card with trend indicator ── */
const StatCard = ({
  title, value, icon: Icon, iconNode, trend, trendLabel, color = "text-primary",
}: {
  title: string; value: string | number; icon?: any; iconNode?: React.ReactNode;
  trend?: number; trendLabel?: string; color?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35 }}
    className="h-full"
  >
    <Card className="glass group hover:border-primary/30 transition-colors h-full">
      <CardContent className="pt-4 pb-3.5 px-4 sm:pt-5 sm:pb-4 sm:px-5 h-full flex flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{title}</p>
            <p className="text-xl sm:text-2xl font-display font-bold truncate">{value}</p>
            {trend !== undefined && (
              <div className={`flex items-center gap-1 text-[11px] sm:text-xs ${trend >= 0 ? "text-primary" : "text-destructive"}`}>
                {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{trend >= 0 ? "+" : ""}{trend}%</span>
                {trendLabel && <span className="text-muted-foreground hidden sm:inline">{trendLabel}</span>}
              </div>
            )}
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-secondary/60 flex items-center justify-center group-hover:bg-primary/10 transition-colors shrink-0">
            {iconNode ?? <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${color}`} />}
          </div>
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
  delivered:  { label: "Delivered",  color: "bg-primary/10 text-primary border-primary/20",             icon: CheckCircle2 },
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
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-dashboard-stats", dateRange.from, dateRange.to],
    queryFn: async () => {
      const [products, orders, profiles, reviews, recentOrders, previousOrders] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id, total, status, created_at"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("reviews").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id, total, created_at").gte("created_at", dateRange.from).lte("created_at", dateRange.to),
        supabase.from("orders").select("id, total, created_at").gte("created_at", prevRange.from).lt("created_at", prevRange.to),
      ]);

      const allOrders = orders.data ?? [];
      const totalRevenue = allOrders.reduce((sum, o) => sum + Number(o.total), 0);
      const pendingOrders = allOrders.filter((o) => o.status === "pending").length;

      const recentRevenue = (recentOrders.data ?? []).reduce((s, o) => s + Number(o.total), 0);
      const prevRevenue = (previousOrders.data ?? []).reduce((s, o) => s + Number(o.total), 0);
      const revenueTrend = prevRevenue > 0 ? Math.round(((recentRevenue - prevRevenue) / prevRevenue) * 100) : 0;

      const recentOrderCount = recentOrders.data?.length ?? 0;
      const prevOrderCount = previousOrders.data?.length ?? 0;
      const orderTrend = prevOrderCount > 0 ? Math.round(((recentOrderCount - prevOrderCount) / prevOrderCount) * 100) : 0;

      const statusBreakdown: Record<string, number> = {};
      allOrders.forEach((o) => {
        statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;
      });

      const rangeOrders = allOrders.filter(o => {
        const d = new Date(o.created_at);
        return d >= new Date(dateRange.from) && d <= new Date(dateRange.to);
      });

      return {
        products: products.count ?? 0,
        orders: allOrders.length,
        users: profiles.count ?? 0,
        reviews: reviews.count ?? 0,
        revenue: totalRevenue,
        pendingOrders,
        revenueTrend,
        orderTrend,
        statusBreakdown,
        allOrders,
        rangeOrders,
      };
    },
    staleTime: 30_000,
  });

  /* ── Fetch recent orders for the table ── */
  const { data: latestOrders } = useQuery({
    queryKey: ["admin-latest-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, total, status, created_at, shipping_address")
        .order("created_at", { ascending: false })
        .limit(8);
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

  // Fetch analytics data for the geo map
  const { data: analyticsData = [] } = useQuery({
    queryKey: ["dashboard-analytics-geo", dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_analytics")
        .select("metadata")
        .gte("created_at", dateRange.from)
        .lte("created_at", dateRange.to)
        .not("metadata", "is", null)
        .limit(5000);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const revenueChart = useMemo(() => {
    if (!stats?.rangeOrders) return [];
    const days: Record<string, number> = {};
    for (let i = dateRange.days - 1; i >= 0; i--) {
      const d = format(subDays(new Date(dateRange.to), i), "MMM dd");
      days[d] = 0;
    }
    stats.rangeOrders.forEach((o: any) => {
      const d = format(new Date(o.created_at), "MMM dd");
      if (d in days) days[d] += Number(o.total);
    });
    return Object.entries(days).map(([date, revenue]) => ({ date, revenue: +revenue.toFixed(2) }));
  }, [stats?.rangeOrders, dateRange]);

  /* ── Order status pie data ── */
  const pieData = useMemo(() => {
    if (!stats?.statusBreakdown) return [];
    const order = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
    return order
      .filter((s) => (stats.statusBreakdown[s] || 0) > 0)
      .map((s) => ({ name: statusConfig[s]?.label ?? s, value: stats.statusBreakdown[s] }));
  }, [stats?.statusBreakdown]);

  /* ── Sales funnel data ── */
  const { data: funnelData } = useQuery({
    queryKey: ["admin-sales-funnel", dateRange.from, dateRange.to],
    queryFn: async () => {
      const [visitorsRes, cartRes, checkoutsRes, completedRes] = await Promise.all([
        supabase.from("page_analytics").select("session_id").eq("event_type", "page_view").gte("created_at", dateRange.from).lte("created_at", dateRange.to),
        supabase.from("cart_items").select("user_id").gte("created_at", dateRange.from).lte("created_at", dateRange.to),
        supabase.from("orders").select("id, status").gte("created_at", dateRange.from).lte("created_at", dateRange.to),
        supabase.from("orders").select("id").eq("status", "delivered").gte("created_at", dateRange.from).lte("created_at", dateRange.to),
      ]);

      const uniqueVisitors = new Set((visitorsRes.data ?? []).map((r) => r.session_id)).size || 1;
      const uniqueCartUsers = new Set((cartRes.data ?? []).map((r) => r.user_id)).size;
      const checkouts = checkoutsRes.data?.length ?? 0;
      const completed = completedRes.data?.length ?? 0;

      return [
        { name: "Visitors", value: uniqueVisitors, fill: "hsl(var(--primary))" },
        { name: "Cart Adds", value: uniqueCartUsers, fill: "hsl(210, 80%, 55%)" },
        { name: "Checkouts", value: checkouts, fill: "hsl(270, 70%, 55%)" },
        { name: "Completed", value: completed, fill: "hsl(45, 90%, 55%)" },
      ];
    },
    staleTime: 60_000,
  });

  /* ── Quick actions ── */
  const quickActions = [
    { label: "Add Product", icon: Package, path: "/sales/products", color: "text-primary" },
    { label: "View Orders", icon: ShoppingCart, path: "/sales/orders", color: "text-accent" },
    { label: "Manage Users", icon: Users, path: "/sales/customers", color: "text-primary" },
    { label: "Homepage", icon: Layers, path: "/brand/home", color: "text-accent" },
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
      className="space-y-4 sm:space-y-6"
    >
      {/* Header with Date Range Selector */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:items-center sm:justify-between sm:flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-display font-bold truncate">Sales Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
            Overview of your store performance
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end sm:justify-start">
          <Select value={rangePreset} onValueChange={(v) => setRangePreset(v)}>
            <SelectTrigger className="w-[130px] sm:w-[140px] h-9">
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
          <Badge variant="outline" className="text-[10px] sm:text-xs hidden sm:inline-flex">
            <Activity className="w-3 h-3 mr-1" />
            {dateRange.label}
          </Badge>
        </div>
        {rangePreset === "custom" && (
          <div className="col-span-full flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs flex-1 sm:flex-initial", !customFrom && "text-muted-foreground")}>
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {customFrom ? format(customFrom, "MMM dd, yyyy") : "From"}
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
                <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs flex-1 sm:flex-initial", !customTo && "text-muted-foreground")}>
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {customTo ? format(customTo, "MMM dd, yyyy") : "To"}
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Revenue"
          value={formatPrice(stats?.revenue ?? 0)}
          iconNode={<CurrencyIcon code={currency} className="w-5 h-5 text-primary" />}
          trend={stats?.revenueTrend}
          trendLabel="vs last week"
          color="text-primary"
        />
        <StatCard
          title="Total Orders"
          value={stats?.orders ?? 0}
          icon={ShoppingCart}
          trend={stats?.orderTrend}
          trendLabel="vs last week"
          color="text-accent"
        />
        <StatCard
          title="Products"
          value={stats?.products ?? 0}
          icon={Package}
          color="text-primary"
        />
        <StatCard
          title="Customers"
          value={stats?.users ?? 0}
          icon={Users}
          color="text-accent"
        />
      </div>


      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart (2 cols) */}
        <Card className="glass lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Revenue ({dateRange.label})
                </CardTitle>
                <CardDescription>Daily revenue breakdown</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] sm:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(160, 84%, 45%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(160, 84%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "hsl(215, 15%, 55%)" }}
                    axisLine={{ stroke: "hsl(220, 15%, 18%)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(215, 15%, 55%)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatPrice(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(220, 20%, 10%)",
                      border: "1px solid hsl(220, 15%, 18%)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [formatPrice(value), "Revenue"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(160, 84%, 45%)"
                    strokeWidth={2}
                    fill="url(#revenueGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Order Status Pie */}
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-4 h-4 text-accent" />
              Order Status
            </CardTitle>
            <CardDescription>Breakdown by status</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="h-[180px] sm:h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(220, 20%, 10%)",
                        border: "1px solid hsl(220, 15%, 18%)",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                No orders yet
              </div>
            )}
            {/* Legend */}
            <div className="flex flex-wrap gap-2 mt-2">
              {pieData.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {entry.name} ({entry.value})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Conversion Funnel */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" />
                Sales Conversion Funnel
              </CardTitle>
              <CardDescription>{dateRange.label}: Visitors → Cart → Checkout → Completed</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {funnelData && funnelData[0]?.value > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Funnel bars */}
              <div className="space-y-3">
                {funnelData.map((step, i) => {
                  const maxVal = funnelData[0].value;
                  const pct = maxVal > 0 ? (step.value / maxVal) * 100 : 0;
                  const convRate = i > 0 && funnelData[i - 1].value > 0
                    ? ((step.value / funnelData[i - 1].value) * 100).toFixed(1)
                    : "100";
                  return (
                    <div key={step.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{step.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold">{step.value.toLocaleString()}</span>
                          {i > 0 && (
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {convRate}%
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="h-8 rounded-xl bg-secondary/30 overflow-hidden relative">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(pct, 2)}%` }}
                          transition={{ duration: 0.8, delay: i * 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
                          className="h-full rounded-xl"
                          style={{ backgroundColor: step.fill }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Conversion summary */}
              <div className="flex flex-col justify-center gap-4">
                {[
                  { from: "Visitors", to: "Cart", idx: 1 },
                  { from: "Cart", to: "Checkout", idx: 2 },
                  { from: "Checkout", to: "Completed", idx: 3 },
                ].map(({ from, to, idx }) => {
                  const prev = funnelData[idx - 1]?.value ?? 0;
                  const curr = funnelData[idx]?.value ?? 0;
                  const rate = prev > 0 ? ((curr / prev) * 100).toFixed(1) : "0";
                  const drop = prev > 0 ? (((prev - curr) / prev) * 100).toFixed(1) : "0";
                  return (
                    <div key={to} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-secondary/10">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${funnelData[idx].fill}20` }}>
                        <span className="text-sm font-display font-bold" style={{ color: funnelData[idx].fill }}>{rate}%</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{from} → {to}</p>
                        <p className="text-xs text-muted-foreground">{drop}% drop-off · {curr.toLocaleString()} of {prev.toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
                {/* Overall conversion */}
                <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 text-center">
                  <p className="text-xs text-muted-foreground">Overall Conversion</p>
                  <p className="text-2xl font-display font-bold text-primary">
                    {funnelData[0].value > 0
                      ? ((funnelData[3].value / funnelData[0].value) * 100).toFixed(2)
                      : "0"}%
                  </p>
                  <p className="text-xs text-muted-foreground">Visitors to Completed Orders</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
              No data available yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Call Analytics */}
      <CallAnalyticsSection dateRange={dateRange} />

      {/* Visitor World Map */}
      <GeoBreakdown analyticsData={analyticsData} />

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Orders (2 cols) */}
        <Card className="glass lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Orders</CardTitle>
                <CardDescription>{stats?.pendingOrders ?? 0} pending</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => navigate("/sales/orders")}
              >
                View all <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[280px] sm:h-[320px]">
              <div className="divide-y divide-border">
                {(latestOrders ?? []).map((order) => {
                  const sc = statusConfig[order.status] || statusConfig.pending;
                  const StatusIcon = sc.icon;
                  const address = order.shipping_address as any;
                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between px-4 sm:px-5 py-3 hover:bg-secondary/20 transition-colors cursor-pointer"
                      onClick={() => navigate("/sales/orders")}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${sc.color}`}>
                          <StatusIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">#{order.order_number}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {address?.name || address?.full_name || "Customer"} · {format(new Date(order.created_at), "MMM dd, HH:mm")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-sm font-display font-semibold">{formatPrice(Number(order.total))}</p>
                        <Badge variant="outline" className={`text-[10px] ${sc.color}`}>{sc.label}</Badge>
                      </div>
                    </div>
                  );
                })}
                {(!latestOrders || latestOrders.length === 0) && (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                    No orders yet
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right column: Low Stock + Quick Actions + Top Products */}
        <div className="space-y-4">
          {/* Low Stock Alert */}
          <Card className="glass border-destructive/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  Low Stock Alert
                </CardTitle>
                <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">
                  {lowStockProducts?.length ?? 0} items
                </Badge>
              </div>
              <CardDescription>Products with less than 10 units</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[200px]">
                <div className="divide-y divide-border">
                  {(lowStockProducts ?? []).map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 px-4 sm:px-5 py-2.5 hover:bg-secondary/20 transition-colors cursor-pointer"
                      onClick={() => navigate("/sales/products")}
                    >
                      <div className="w-8 h-8 rounded-lg bg-secondary/60 overflow-hidden shrink-0">
                        {product.thumbnail ? (
                          <img src={product.thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{formatPrice(Number(product.price))}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 ${
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

          {/* Device & Browser Breakdown */}
          <DeviceBrowserBreakdown />

          {/* Quick Actions */}
          <Card className="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  className="h-auto py-3 flex flex-col items-center gap-1.5 border-border/50 hover:border-primary/30 hover:bg-secondary/30"
                  onClick={() => navigate(action.path)}
                >
                  <action.icon className={`w-4 h-4 ${action.color}`} />
                  <span className="text-xs">{action.label}</span>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="glass">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Top Products</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => navigate("/sales/products")}
                >
                  View all <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(topProducts ?? []).map((product, i) => (
                <div key={product.id} className="flex items-center gap-3">
                  <span className="text-xs font-display font-bold text-muted-foreground w-4 text-right">
                    {i + 1}
                  </span>
                  <div className="w-9 h-9 rounded-lg bg-secondary/60 overflow-hidden shrink-0">
                    {product.thumbnail ? (
                      <img src={product.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatPrice(Number(product.price))}</span>
                      {(product.avg_rating ?? 0) > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {Number(product.avg_rating).toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {product.stock_quantity} in stock
                  </Badge>
                </div>
              ))}
              {(!topProducts || topProducts.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No products yet</p>
              )}
            </CardContent>
          </Card>

          {/* SEO Sitemap Quick Link */}
          <Card className="glass hover:border-primary/30 transition-colors">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Sitemap.xml</p>
                  <p className="text-xs text-muted-foreground">Auto-generated from products & categories</p>
                </div>
                <a
                  href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-sitemap`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    Preview <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sales Management Hubs — merged from AdminSalesDashboard */}
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground mb-3">Sections</p>
          <div className="space-y-2">
            {[
              { title: "Products Management", url: "/sales/products-hub",      icon: Package,      color: "#f59e0b", desc: "Catalogue, promotions, coupons & showcase" },
              { title: "Customer Support",    url: "/sales/customers-hub",     icon: Users,        color: "#38bdf8", desc: "Customers, support, analytics & email" },
              { title: "Payments & Couriers", url: "/sales/payments-couriers", icon: Key,          color: "#a855f7", desc: "Gateways, shipping, couriers & delivery" },
              { title: "Orders",              url: "/sales/orders",            icon: ShoppingCart, color: "#22c55e", desc: "All orders & payment verifications" },
            ].map((hub) => {
              const Icon = hub.icon;
              return (
                <button
                  key={hub.url}
                  onClick={() => navigate(hub.url)}
                  className="w-full flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3 text-left hover:bg-card hover:border-border hover:shadow-sm transition-all group"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${hub.color}18`, border: `1px solid ${hub.color}30` }}>
                    <Icon className="w-4 h-4" style={{ color: hub.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight">{hub.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{hub.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground mb-3">Analytics</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Customer Analytics", url: "/sales/customer-analytics", icon: BarChart3 },
              { label: "Live Activity",      url: "/sales/live-activity",      icon: Activity },
              { label: "Support Tickets",    url: "/sales/support",            icon: Headphones },
            ].map(({ label, url, icon: Icon }) => (
              <button key={url} onClick={() => navigate(url)}
                className="flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl border border-border/50 bg-card/40 text-muted-foreground hover:text-foreground hover:bg-card hover:border-border transition-all">
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
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

    // Calls per day chart
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

    // Status breakdown
    const statusData = [
      { name: "Completed", value: completed.length, fill: "hsl(160, 84%, 45%)" },
      { name: "Missed", value: missed, fill: "hsl(0, 84%, 60%)" },
      { name: "Rejected", value: rejected, fill: "hsl(45, 90%, 55%)" },
      { name: "Other", value: totalCalls - completed.length - missed - rejected, fill: "hsl(215, 20%, 50%)" },
    ].filter(s => s.value > 0);

    return { totalCalls, completionRate, avgDuration, missed, dailyChart, statusData };
  }, [callLogs, dateRange]);

  if (!analytics) {
    return null;
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              Call Analytics
            </CardTitle>
            <CardDescription>{dateRange.label}: {analytics.totalCalls} total calls</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* KPI row */}
          <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-border/40 bg-secondary/10 text-center">
              <p className="text-xs text-muted-foreground">Total Calls</p>
              <p className="text-xl font-display font-bold">{analytics.totalCalls}</p>
            </div>
            <div className="p-3 rounded-xl border border-border/40 bg-secondary/10 text-center">
              <p className="text-xs text-muted-foreground">Completion Rate</p>
              <p className="text-xl font-display font-bold text-primary">{analytics.completionRate}%</p>
            </div>
            <div className="p-3 rounded-xl border border-border/40 bg-secondary/10 text-center">
              <p className="text-xs text-muted-foreground">Avg Duration</p>
              <p className="text-xl font-display font-bold">{formatDuration(analytics.avgDuration)}</p>
            </div>
            <div className="p-3 rounded-xl border border-border/40 bg-secondary/10 text-center">
              <p className="text-xs text-muted-foreground">Missed Calls</p>
              <p className="text-xl font-display font-bold text-destructive">{analytics.missed}</p>
            </div>
          </div>

          {/* Calls per day chart */}
          <div className="lg:col-span-2">
            <p className="text-sm font-medium mb-3">Calls Per Day</p>
            <div className="h-[180px] sm:h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.dailyChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(215, 15%, 55%)" }} tickLine={false} axisLine={{ stroke: "hsl(220, 15%, 18%)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(215, 15%, 55%)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(220, 20%, 10%)", border: "1px solid hsl(220, 15%, 18%)", borderRadius: "12px", fontSize: "12px" }} />
                  <Bar dataKey="calls" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status breakdown */}
          <div>
            <p className="text-sm font-medium mb-3">Call Outcomes</p>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {analytics.statusData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(220, 20%, 10%)", border: "1px solid hsl(220, 15%, 18%)", borderRadius: "12px", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {analytics.statusData.map((entry: any) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill }} />
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
// code:4ce0
