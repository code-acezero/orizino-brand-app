"use client";
import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@/lib/router-compat";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/components/AdminRoute";
import { useStaffSections } from "@/hooks/use-staff-sections";
import { useRealtimeVisitors } from "@/hooks/use-realtime-visitors";
import {
  ShoppingCart,
  Search,
  Tag,
  Palette,
  Activity,
  Settings,
  Users2,
  Package,
  Users,
  BarChart3,
  LayoutGrid,
  ChevronDown,
  ChevronRight,
  ScanLine,
  Barcode,
  CreditCard,
  Layers,
  ArrowUpRight,
  SlidersHorizontal,
  X,
  Check,
} from "lucide-react";
import DashboardSalesChart from "@/components/admin/DashboardSalesChart";
import { ADMIN_DOMAIN_GROUPS } from "./MasterPanel";
import { calculateOrderFinancials } from "@orizino/shared";

export default function MobileMasterPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = useAdminRole();
  const { data: staff } = useStaffSections();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const visitors = useRealtimeVisitors();

  const [mobileSearch, setMobileSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "sales" | "growth" | "brand" | "system">("all");

  const isAdmin = role === "admin" || !!staff?.isAdmin;
  const hasAnyGrant = (staff?.accessible?.length ?? 0) > 0;

  const { data: profile } = useQuery({
    queryKey: ["master-profile", user?.id],
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();
      return data;
    },
  });

  const { data: activeOrderCount = 0 } = useQuery({
    queryKey: ["active-orders-count"],
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "confirmed", "processing", "shipped"]);
      return count ?? 0;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["master-vitals-accurate"],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const [ordersRes, productsRes, customersRes, revenueRes] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders" as any).select("id, total, subtotal, shipping_fee, coupon_discount, loyalty_discount, status, payment_method, is_delivery_prepaid").neq("status", "cancelled"),
      ]);
      const financials = calculateOrderFinancials((revenueRes.data ?? []) as any[]);
      return {
        orders:    ordersRes.count ?? 0,
        products:  productsRes.count ?? 0,
        customers: customersRes.count ?? 0,
        revenue:   financials.recognizedRevenue,
      };
    },
  });

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Working late" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = profile?.full_name?.split(" ")[0] || (isAdmin ? "Admin" : "Staff");

  // Gated Groups based on Access Permissions
  const accessibleGroups = useMemo(() => {
    const q = mobileSearch.trim().toLowerCase();

    return ADMIN_DOMAIN_GROUPS.filter((group) => {
      if (isAdmin) return true;
      return group.sections.some((s) => staff?.hasAccess(s));
    }).map((group) => {
      const categoryMatch = selectedCategory === "all" || group.category === selectedCategory;
      if (!categoryMatch) return null;

      const filteredItems = group.items.filter((item) => {
        if (isAdmin) return true;
        if (item.adminOnly) return false;
        if (item.section) return staff?.hasAccess(item.section);
        return hasAnyGrant ? false : true;
      });

      if (filteredItems.length === 0) return null;

      if (!q) {
        return {
          ...group,
          items: filteredItems,
        };
      }

      const groupMatch = group.title.toLowerCase().includes(q) || group.sub.toLowerCase().includes(q);
      const matched = filteredItems.filter(
        (it) => groupMatch || it.label.toLowerCase().includes(q) || it.keywords?.some((k) => k.toLowerCase().includes(q))
      );

      return {
        ...group,
        items: matched,
      };
    }).filter(Boolean) as typeof ADMIN_DOMAIN_GROUPS;
  }, [isAdmin, staff, hasAnyGrant, mobileSearch, selectedCategory]);

  const categoriesList = [
    { key: "all", label: `All Sections (${accessibleGroups.length})` },
    { key: "sales", label: "Sales & Inventory" },
    { key: "growth", label: "Marketing & Growth" },
    { key: "brand", label: "Brand & UI" },
    { key: "system", label: "System & Governance" },
  ] as const;

  return (
    <div className="w-full space-y-4 pb-16 text-foreground">
      {/* 1. Header with Rounded Corners */}
      <div className="pb-3 border-b border-border/50">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            {isAdmin ? "Founder Cockpit" : "Staff Panel"} · Master Ops
          </span>
        </div>
        <h1 className="text-lg font-bold font-display text-foreground mt-0.5">
          {greeting}, {firstName}
        </h1>
      </div>

      {/* 2. Flat Telemetry Table with Rounded Corners */}
      <div className="rounded-2xl border border-border/50 bg-card/30 overflow-hidden grid grid-cols-2 divide-x divide-y divide-border/40 text-left">
        {[
          { label: "Revenue", value: stats ? `৳${stats.revenue.toLocaleString()}` : "—", color: "text-amber-500", url: "/sales/customer-analytics" },
          { label: "Orders", value: stats ? stats.orders.toLocaleString() : "—", color: "text-blue-500", url: "/sales/orders" },
          { label: "Products", value: stats ? stats.products.toLocaleString() : "—", color: "text-emerald-500", url: "/sales/products-management?tab=products" },
          { label: "Customers", value: stats ? stats.customers.toLocaleString() : "—", color: "text-pink-500", url: "/sales/customers-hub" },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => navigate({ to: item.url })}
            className="p-3 flex flex-col justify-between text-left hover:bg-muted/20 transition-colors cursor-pointer"
          >
            <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
              {item.label}
            </span>
            <span className={`text-base font-bold font-mono mt-0.5 ${item.color}`}>
              {item.value}
            </span>
          </button>
        ))}
      </div>

      {/* 3. Performance Trend (Flat embedded) */}
      <div className="rounded-2xl border border-border/50 bg-card/30 p-3">
        <DashboardSalesChart isCompact={true} />
      </div>

      {/* 4. Filter & Search with Consolidated Single Filter Button */}
      <div className="rounded-2xl border border-border/50 bg-card/30 p-2.5 flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={mobileSearch}
            onChange={(e) => setMobileSearch(e.target.value)}
            placeholder="Search tools & operations..."
            className="w-full h-8 pl-7 pr-6 rounded-lg bg-background border border-border/60 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground"
          />
          {mobileSearch && (
            <button
              onClick={() => setMobileSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Single Filter Button */}
        <div className="relative shrink-0" ref={filterRef}>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`h-8 px-2.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
              selectedCategory !== "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border/60 text-foreground"
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Filter</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {isFilterOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-border/80 bg-popover p-1.5 shadow-xl z-50 space-y-0.5">
              {categoriesList.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => {
                    setSelectedCategory(cat.key);
                    setIsFilterOpen(false);
                  }}
                  className={`w-full px-2 py-1.5 rounded-lg text-xs text-left flex items-center justify-between ${
                    selectedCategory === cat.key
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-foreground hover:bg-muted/60"
                  }`}
                >
                  <span>{cat.label}</span>
                  {selectedCategory === cat.key && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. Section List View: Each Section Row has its Tools Grid Underneath */}
      <div className="space-y-3">
        {accessibleGroups.map((group) => {
          const GroupIcon = group.icon;
          return (
            <div
              key={group.key}
              className="rounded-2xl border border-border/50 bg-card/30 p-3.5 space-y-2.5"
            >
              {/* Section Header Row */}
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${group.color}18`, border: `1px solid ${group.color}30` }}
                  >
                    <GroupIcon className="w-3.5 h-3.5" style={{ color: group.color }} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-foreground truncate block">
                      {group.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate block">
                      {group.items.length} tools
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate({ to: group.hubUrl })}
                  className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Open Hub"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tools Grid Underneath Section */}
              <div className="grid grid-cols-2 gap-2">
                {group.items.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <button
                      key={item.url}
                      onClick={() => navigate({ to: item.url })}
                      className={`flex flex-col justify-between p-2.5 rounded-xl border text-left cursor-pointer transition-all active:scale-[0.98] ${
                        item.featured
                          ? "bg-primary/10 border-primary/30 text-primary font-medium"
                          : "bg-background/60 border-border/40 text-foreground hover:bg-background"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1.5">
                        <ItemIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        {item.badge && (
                          <span className="px-1 py-0.2 rounded text-[8px] font-mono font-bold uppercase bg-muted/80 text-muted-foreground">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold truncate">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
