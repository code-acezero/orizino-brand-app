"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useTabParam } from "@/hooks/use-tab-param";
import { toast } from "@/lib/app-toast";
import { format } from "date-fns";
import {
  Heart,
  Package,
  Bell,
  BellRing,
  Search,
  ExternalLink,
  Edit3,
  TrendingUp,
  AlertCircle,
  Users,
  CheckCircle2,
  Filter,
  MessageSquare,
  ShoppingBag,
  RotateCcw,
  X,
} from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { TableLoadingRow, TableEmptyRow } from "@/components/admin/TableStates";
import { Link } from "@/lib/router-compat";

type DemandView = "wishlists" | "restock-alerts" | "inquiries";

const AdminRequests: React.FC = () => {
  const queryClient = useQueryClient();
  const [view, setView] = useTabParam("wishlists", "/sales/requests");
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [alertStatusFilter, setAlertStatusFilter] = useState("all");
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState("all");

  // ── Query 1: All Wishlist Items with Product Details ──
  const { data: wishlistItems = [], isLoading: loadingWishlists } = useQuery({
    queryKey: ["admin-wishlist-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("id, user_id, product_id, created_at, products(id, name, slug, price, thumbnail, stock_quantity, category_id, is_active)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // ── Query 2: All Stock Notifications / Restock Alert Requests ──
  const { data: stockNotifications = [], isLoading: loadingNotifs } = useQuery({
    queryKey: ["admin-stock-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_notifications")
        .select("id, user_id, product_id, email, is_notified, created_at, products(id, name, slug, thumbnail, stock_quantity, price)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // ── Query 3: In-House Customer Product Suggestions / Inquiries ──
  const { data: productInquiries = [], isLoading: loadingInquiries } = useQuery({
    queryKey: ["admin-product-inquiries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Mutation to update inquiry status
  const updateInquiryStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("product_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product-inquiries"] });
      toast.success("Inquiry status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Aggregate Wishlist Product Demand ──
  const productDemandMap = new Map<string, { product: any; count: number; restockSubscribers: number }>();

  wishlistItems.forEach((item: any) => {
    const p = item.products;
    if (!p) return;
    if (!productDemandMap.has(p.id)) {
      productDemandMap.set(p.id, { product: p, count: 0, restockSubscribers: 0 });
    }
    const current = productDemandMap.get(p.id)!;
    current.count += 1;
  });

  stockNotifications.forEach((notif: any) => {
    const p = notif.products;
    if (!p) return;
    if (!productDemandMap.has(p.id)) {
      productDemandMap.set(p.id, { product: p, count: 0, restockSubscribers: 0 });
    }
    const current = productDemandMap.get(p.id)!;
    if (!notif.is_notified) {
      current.restockSubscribers += 1;
    }
  });

  const aggregatedProducts = Array.from(productDemandMap.values()).sort((a, b) => b.count - a.count);

  // Filter aggregated products
  const filteredProducts = aggregatedProducts.filter((item) => {
    const p = item.product;
    const matchQuery = !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
    const isOut = p.stock_quantity <= 0;
    const matchStock =
      stockFilter === "all" ||
      (stockFilter === "out_of_stock" && isOut) ||
      (stockFilter === "in_stock" && !isOut);
    return matchQuery && matchStock;
  });

  // Filter stock notifications
  const filteredNotifications = stockNotifications.filter((notif: any) => {
    const p = notif.products;
    const email = notif.email || "";
    const productName = p?.name || "";
    const matchQuery =
      !searchQuery.trim() ||
      email.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      productName.toLowerCase().includes(searchQuery.toLowerCase().trim());

    const matchStatus =
      alertStatusFilter === "all" ||
      (alertStatusFilter === "pending" && !notif.is_notified) ||
      (alertStatusFilter === "notified" && notif.is_notified);

    return matchQuery && matchStatus;
  });

  // Filter product inquiries
  const filteredInquiries = productInquiries.filter((inq: any) => {
    const name = inq.product_name || "";
    const desc = inq.description || inq.notes || "";
    const matchQuery =
      !searchQuery.trim() ||
      name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      desc.toLowerCase().includes(searchQuery.toLowerCase().trim());

    const matchStatus =
      inquiryStatusFilter === "all" || (inq.status || "pending") === inquiryStatusFilter;

    return matchQuery && matchStatus;
  });

  // Telemetry Calculations
  const totalWishlistSaves = wishlistItems.length;
  const uniqueUsers = new Set(wishlistItems.map((i: any) => i.user_id)).size;
  const outOfStockDemands = aggregatedProducts.filter((item) => item.product.stock_quantity <= 0).length;
  const pendingRestockAlerts = stockNotifications.filter((n: any) => !n.is_notified).length;

  const resetFilters = () => {
    setSearchQuery("");
    setStockFilter("all");
    setAlertStatusFilter("all");
    setInquiryStatusFilter("all");
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    (view === "wishlists" && stockFilter !== "all") ||
    (view === "restock-alerts" && alertStatusFilter !== "all") ||
    (view === "inquiries" && inquiryStatusFilter !== "all");

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6 pb-12">
      {/* ── Page Header ── */}
      <PageHeader
        icon={<Heart className="w-5 h-5 text-rose-500 fill-rose-500/20" />}
        title="Wishlists & Product Demand"
        description="Monitor customer saved items, restock alert queues, and high-demand product insights"
      />

      {/* ── Telemetry KPI Ribbon ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border-border/60 bg-gradient-to-br from-card to-card/60 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Wishlist Saves</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tracking-tight text-foreground">{totalWishlistSaves}</span>
                <span className="text-xs text-rose-500 font-medium flex items-center gap-0.5">
                  <Heart className="w-3 h-3 fill-rose-500/30" /> Saved
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
              <Heart className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-gradient-to-br from-card to-card/60 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Active Customers</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tracking-tight text-foreground">{uniqueUsers}</span>
                <span className="text-xs text-muted-foreground">with saved items</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-gradient-to-br from-card to-card/60 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Restock Alerts Queue</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tracking-tight text-foreground">{pendingRestockAlerts}</span>
                <span className="text-xs text-amber-500 font-medium">waiting for stock</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Bell className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-gradient-to-br from-card to-card/60 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Out of Stock Demand</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tracking-tight text-foreground">{outOfStockDemands}</span>
                <span className="text-xs text-destructive font-medium">items at 0 stock</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive">
              <AlertCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Unified Filter & Control Bar (Single Combined Filter Selector) ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm">
        <div className="flex flex-1 items-center gap-2.5 flex-wrap">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                view === "wishlists"
                  ? "Search wishlisted products..."
                  : view === "restock-alerts"
                  ? "Search by email or product..."
                  : "Search customer inquiries..."
              }
              className="pl-9 h-9 text-xs bg-background/50 border-border/70 rounded-xl"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Minimal Primary View Filter Selector */}
          <Select value={view} onValueChange={(val: DemandView) => setView(val)}>
            <SelectTrigger className="h-8.5 px-3 rounded-full bg-secondary/35 hover:bg-secondary/55 border-border/70 text-xs font-semibold gap-2 w-auto shadow-2xs transition-all">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                {view === "wishlists" && <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0 fill-rose-500/20" />}
                {view === "restock-alerts" && <Bell className="w-3.5 h-3.5 text-amber-500 shrink-0 fill-amber-500/20" />}
                {view === "inquiries" && <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0" />}
                <span>
                  {view === "wishlists" && "Wishlist"}
                  {view === "restock-alerts" && "Restock Alerts"}
                  {view === "inquiries" && "Inquiries"}
                </span>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-full bg-background/80 text-muted-foreground border border-border/40 ml-0.5">
                  {view === "wishlists"
                    ? aggregatedProducts.length
                    : view === "restock-alerts"
                    ? pendingRestockAlerts
                    : productInquiries.length}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent align="start" className="rounded-xl min-w-[200px] p-1 shadow-lg">
              <SelectItem value="wishlists" className="text-xs rounded-lg py-2 cursor-pointer">
                <div className="flex items-center justify-between w-full gap-3">
                  <span className="flex items-center gap-2 font-medium">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    <span>Wishlist</span>
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded-full">
                    {aggregatedProducts.length}
                  </span>
                </div>
              </SelectItem>

              <SelectItem value="restock-alerts" className="text-xs rounded-lg py-2 cursor-pointer">
                <div className="flex items-center justify-between w-full gap-3">
                  <span className="flex items-center gap-2 font-medium">
                    <Bell className="w-3.5 h-3.5 text-amber-500" />
                    <span>Restock Alerts</span>
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    pendingRestockAlerts > 0 ? "bg-rose-500/15 text-rose-500 font-bold" : "bg-secondary/60 text-muted-foreground"
                  }`}>
                    {pendingRestockAlerts}
                  </span>
                </div>
              </SelectItem>

              <SelectItem value="inquiries" className="text-xs rounded-lg py-2 cursor-pointer">
                <div className="flex items-center justify-between w-full gap-3">
                  <span className="flex items-center gap-2 font-medium">
                    <MessageSquare className="w-3.5 h-3.5 text-primary" />
                    <span>Inquiries</span>
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded-full">
                    {productInquiries.length}
                  </span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Minimal Secondary Filter Controls */}
          {view === "wishlists" && (
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="h-8.5 px-3 rounded-full bg-secondary/20 hover:bg-secondary/40 border-border/60 text-xs font-medium w-auto min-w-[120px] transition-all">
                <SelectValue placeholder="All Inventory" />
              </SelectTrigger>
              <SelectContent align="start" className="rounded-xl text-xs">
                <SelectItem value="all" className="text-xs">All Inventory</SelectItem>
                <SelectItem value="out_of_stock" className="text-xs">Out of Stock Only</SelectItem>
                <SelectItem value="in_stock" className="text-xs">In Stock Only</SelectItem>
              </SelectContent>
            </Select>
          )}

          {view === "restock-alerts" && (
            <Select value={alertStatusFilter} onValueChange={setAlertStatusFilter}>
              <SelectTrigger className="h-8.5 px-3 rounded-full bg-secondary/20 hover:bg-secondary/40 border-border/60 text-xs font-medium w-auto min-w-[125px] transition-all">
                <SelectValue placeholder="All Alerts" />
              </SelectTrigger>
              <SelectContent align="start" className="rounded-xl text-xs">
                <SelectItem value="all" className="text-xs">All Alerts</SelectItem>
                <SelectItem value="pending" className="text-xs">Pending Restock</SelectItem>
                <SelectItem value="notified" className="text-xs">Already Notified</SelectItem>
              </SelectContent>
            </Select>
          )}

          {view === "inquiries" && (
            <Select value={inquiryStatusFilter} onValueChange={setInquiryStatusFilter}>
              <SelectTrigger className="h-8.5 px-3 rounded-full bg-secondary/20 hover:bg-secondary/40 border-border/60 text-xs font-medium w-auto min-w-[120px] transition-all">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent align="start" className="rounded-xl text-xs">
                <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                <SelectItem value="reviewed" className="text-xs">Reviewed</SelectItem>
                <SelectItem value="sourced" className="text-xs">Sourced</SelectItem>
                <SelectItem value="completed" className="text-xs">Completed</SelectItem>
                <SelectItem value="rejected" className="text-xs">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          )}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8.5 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1 rounded-full transition-all"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </Button>
          )}
        </div>

        {/* Counter Pill */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <span className="text-xs text-muted-foreground font-mono">
            {view === "wishlists" && `${filteredProducts.length} items`}
            {view === "restock-alerts" && `${filteredNotifications.length} alerts`}
            {view === "inquiries" && `${filteredInquiries.length} inquiries`}
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          VIEW 1: WISHLISTED PRODUCTS & DEMAND RANKING
          ══════════════════════════════════════════════════════════════ */}
      {view === "wishlists" && (
        <Card className="border-border/60 overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-secondary/40">
              <TableRow>
                <TableHead className="w-[80px]">Rank</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Current Price</TableHead>
                <TableHead>Inventory</TableHead>
                <TableHead className="text-center">Wishlist Saves</TableHead>
                <TableHead className="text-center">Restock Alerts</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingWishlists ? (
                <TableLoadingRow cols={7} rows={6} />
              ) : filteredProducts.length === 0 ? (
                <TableEmptyRow
                  cols={7}
                  icon={<Heart className="w-5 h-5 text-rose-500" />}
                  message="No wishlisted products found"
                  hint="When customers save products to their wishlist, demand metrics will appear here."
                />
              ) : (
                filteredProducts.map((item, index) => {
                  const p = item.product;
                  const isOutOfStock = p.stock_quantity <= 0;

                  return (
                    <TableRow key={p.id} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-xs font-bold text-muted-foreground">
                        #{index + 1}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-secondary/30 border border-border/60 shrink-0">
                            <img
                              src={p.thumbnail || "/placeholder.svg"}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <p className="font-semibold text-xs text-foreground truncate max-w-xs">{p.name}</p>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              slug: {p.slug}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="font-mono text-xs font-bold">
                        ৳{Number(p.price).toLocaleString()}
                      </TableCell>

                      <TableCell>
                        {isOutOfStock ? (
                          <Badge variant="destructive" className="text-[10px] font-semibold gap-1">
                            <AlertCircle className="w-3 h-3" /> Out of Stock
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 border-emerald-500/30">
                            {p.stock_quantity} in stock
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                          <Heart className="w-3 h-3 fill-rose-500/30" />
                          {item.count}
                        </span>
                      </TableCell>

                      <TableCell className="text-center font-mono text-xs">
                        {item.restockSubscribers > 0 ? (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                            <Bell className="w-3 h-3" />
                            {item.restockSubscribers}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title="View in Storefront"
                          >
                            <a href={`/product/${p.slug}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title="Edit in Catalog"
                          >
                            <Link to={`/sales/products-management?tab=products&search=${encodeURIComponent(p.name)}`}>
                              <Edit3 className="w-3.5 h-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════
          VIEW 2: RESTOCK NOTIFICATION ALERTS
          ══════════════════════════════════════════════════════════════ */}
      {view === "restock-alerts" && (
        <Card className="border-border/60 overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-secondary/40">
              <TableRow>
                <TableHead>Customer Email</TableHead>
                <TableHead>Requested Product</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Date Requested</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingNotifs ? (
                <TableLoadingRow cols={5} rows={5} />
              ) : filteredNotifications.length === 0 ? (
                <TableEmptyRow
                  cols={5}
                  icon={<Bell className="w-5 h-5 text-amber-500" />}
                  message="No restock alerts found"
                  hint="When shoppers request back-in-stock alerts on sold-out products, they will appear here."
                />
              ) : (
                filteredNotifications.map((notif: any) => {
                  const p = notif.products;
                  return (
                    <TableRow key={notif.id} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-xs font-semibold">
                        {notif.email || "Registered User"}
                      </TableCell>

                      <TableCell>
                        {p ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg overflow-hidden bg-secondary/30 shrink-0">
                              <img src={p.thumbnail || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                            </div>
                            <span className="text-xs font-medium">{p.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Product #{notif.product_id}</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {p && p.stock_quantity > 0 ? (
                          <Badge variant="outline" className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 border-emerald-500/30">
                            {p.stock_quantity} available
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">
                            0 (Out of stock)
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(notif.created_at), "MMM d, yyyy · h:mm a")}
                      </TableCell>

                      <TableCell>
                        {notif.is_notified ? (
                          <Badge variant="outline" className="text-[10px] text-emerald-500 bg-emerald-500/10 border-emerald-500/30 gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Notified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-amber-500 bg-amber-500/10 border-amber-500/30 gap-1">
                            <BellRing className="w-3 h-3" /> Pending Restock
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════
          VIEW 3: PRODUCT INQUIRIES
          ══════════════════════════════════════════════════════════════ */}
      {view === "inquiries" && (
        <Card className="border-border/60 overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-secondary/40">
              <TableRow>
                <TableHead>Suggested Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Notes / Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingInquiries ? (
                <TableLoadingRow cols={5} rows={5} />
              ) : filteredInquiries.length === 0 ? (
                <TableEmptyRow
                  cols={5}
                  icon={<MessageSquare className="w-5 h-5 text-primary" />}
                  message="No customer product suggestions found"
                  hint="Customer feedback or product requests will be listed here for review."
                />
              ) : (
                filteredInquiries.map((inq: any) => (
                  <TableRow key={inq.id} className="hover:bg-muted/40">
                    <TableCell className="font-semibold text-xs text-foreground">
                      {inq.product_name}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {inq.category || "—"}
                    </TableCell>

                    <TableCell className="max-w-[240px] truncate text-xs text-muted-foreground">
                      {inq.description || inq.notes || "—"}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(inq.created_at), "MMM d, yyyy")}
                    </TableCell>

                    <TableCell>
                      <Select
                        value={inq.status || "pending"}
                        onValueChange={(val) => updateInquiryStatus.mutate({ id: inq.id, status: val })}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                          <SelectItem value="reviewed" className="text-xs">Reviewed</SelectItem>
                          <SelectItem value="sourced" className="text-xs">Sourced</SelectItem>
                          <SelectItem value="completed" className="text-xs">Completed</SelectItem>
                          <SelectItem value="rejected" className="text-xs">Dismissed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default AdminRequests;
