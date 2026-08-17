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
  ChevronRight,
  Package,
  Users,
  BarChart3,
  LayoutGrid,
  Mail,
  ShieldCheck,
  Database,
  Bug,
  Megaphone,
  FileText,
  Layers,
  CreditCard,
  Truck,
  Star,
  Presentation,
  ScanLine,
  Barcode,
  Printer,
  AppWindow,
  Phone,
  MessageSquare,
  RotateCcw,
  Compass,
  Smartphone,
  Layout,
  Workflow,
  Share2,
  Send,
  X,
  ArrowUpRight,
  SlidersHorizontal,
  ChevronDown,
  Check,
} from "lucide-react";
import { Sparkle } from "@/components/icons/Sparkle";
import DashboardSalesChart from "@/components/admin/DashboardSalesChart";
import MobileMasterPanel from "./MobileMasterPanel";
import { type StaffSectionKey } from "@/components/admin/admin-nav";
import { formatDistanceToNow } from "date-fns";
import { calculateOrderFinancials } from "@orizino/shared";

/** Below xl (1280px) → mobile + tablet get the optimized stacked UI. */
function useIsBelowDesktop(): boolean {
  const [below, setBelow] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 1279px)");
    const apply = () => setBelow(mql.matches);
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);
  return below;
}

export type AdminToolItem = {
  label: string;
  url: string;
  icon: React.ComponentType<any>;
  section?: StaffSectionKey;
  adminOnly?: boolean;
  badge?: string;
  featured?: boolean;
  keywords?: string[];
};

export type AdminDomainGroup = {
  key: string;
  category: "sales" | "growth" | "brand" | "system";
  title: string;
  sub: string;
  hubUrl: string;
  color: string;
  icon: React.ComponentType<any>;
  sections: StaffSectionKey[];
  items: AdminToolItem[];
};

export const ADMIN_DOMAIN_GROUPS: AdminDomainGroup[] = [
  {
    key: "sales",
    category: "sales",
    title: "Sales & Customers",
    sub: "Fulfillment, offline counter POS, live customer support & order intelligence",
    hubUrl: "/sales",
    color: "#f59e0b",
    icon: ShoppingCart,
    sections: ["orders", "offline_orders", "customers", "analytics"],
    items: [
      { label: "Sales Dashboard",      url: "/sales",                      icon: LayoutGrid,  section: "orders" },
      { label: "OrderOps Hub",         url: "/sales/orderops",             icon: ScanLine,    section: "orders", badge: "HUB", featured: true, keywords: ["pack", "ship", "scanner", "dispatch", "courier", "steadfast", "pathao"] },
      { label: "Orders & Returns",     url: "/sales/orders",               icon: ShoppingCart,section: "orders", keywords: ["returns", "exchange", "refund"] },
      { label: "Offline Orders (POS)", url: "/sales/offline-orders",       icon: CreditCard,  section: "offline_orders", badge: "POS", keywords: ["cash", "counter", "in-person", "receipt"] },
      { label: "Product Scanner",      url: "/sales/products-management?tab=scanner", icon: ScanLine, section: "products", badge: "SCAN", keywords: ["camera", "barcode", "serial", "verification"] },
      { label: "Customer Support",     url: "/sales/customers-hub",        icon: Users,       section: "customers", badge: "INBOX", keywords: ["chat", "tickets", "conversations"] },
      { label: "Customer Reviews",     url: "/sales/reviews",              icon: Star,        section: "customers", keywords: ["ratings", "testimonials", "feedback", "stars"] },
      { label: "Live Activity",        url: "/sales/live-activity",        icon: Activity,    section: "customers", badge: "LIVE", keywords: ["realtime", "visitors", "online"] },
      { label: "Customer Analytics",   url: "/sales/customer-analytics",   icon: BarChart3,   section: "analytics", keywords: ["kpi", "sales chart", "growth"] },
    ],
  },
  {
    key: "products",
    category: "sales",
    title: "PSO Management",
    sub: "Products, catalogue variants, stock synchronization, serial logs, shipping & stickers",
    hubUrl: "/sales/products-management?tab=products",
    color: "#10b981",
    icon: Package,
    sections: ["products"],
    items: [
      { label: "Product Management",    url: "/sales/products-management?tab=products", icon: Layers, section: "products", badge: "HUB", featured: true, keywords: ["inventory", "variants", "stock"] },
      { label: "Categories & Tree",     url: "/sales/products-management?tab=categories", icon: LayoutGrid, section: "products", keywords: ["subcategories", "navigation"] },
      { label: "Stock & Serials Sync",  url: "/sales/products-management?tab=stock", icon: Database, section: "products", badge: "SYNC", keywords: ["quad-sync", "sheets", "barcode"] },
      { label: "Wishlists & Demand",    url: "/sales/requests",             icon: MessageSquare, section: "products", keywords: ["wishlist", "demand"] },
      { label: "Invoice & Stickers",    url: "/sales/invoice-stickers",     icon: Printer, section: "orders", badge: "PRINT", keywords: ["thermal", "slip", "pdf"] },
      { label: "Promotions & Discounts",url: "/sales/coupons",              icon: Tag, section: "products", keywords: ["discounts", "vouchers", "delivery offers"] },
    ],
  },
  {
    key: "seo",
    category: "growth",
    title: "SEO & Ads Management",
    sub: "Search optimization, Meta CAPI & conversion pixels, audience segments & modals",
    hubUrl: "/marketing",
    color: "#f97316",
    icon: Search,
    sections: ["seo"],
    items: [
      { label: "SEO & Ads Dashboard",   url: "/marketing",                  icon: LayoutGrid, section: "seo" },
      { label: "SEO Control Center",    url: "/marketing/seo",              icon: Search, section: "seo", adminOnly: true, keywords: ["meta tags", "sitemap", "google search console"] },
      { label: "Ads & Tracking (CAPI)", url: "/marketing/tracking",         icon: BarChart3, section: "seo", badge: "CAPI", featured: true, adminOnly: true, keywords: ["facebook pixel", "tiktok", "meta capi", "google tag manager"] },
      { label: "Marketing Audiences",   url: "/email/subscribers",          icon: Users, section: "customers", keywords: ["segments", "retargeting"] },
      { label: "Promotional Modals",    url: "/marketing/popups",           icon: AppWindow, section: "customers", badge: "POPUPS", keywords: ["interactive alerts", "newsletter popup"] },
      { label: "Announcements",         url: "/marketing/announcements",    icon: Megaphone, section: "customers", keywords: ["header banners", "notice bar"] },
    ],
  },
  {
    key: "email",
    category: "growth",
    title: "Emails & Marketing",
    sub: "Resend campaigns, automated event drips, marketing templates & audience sync",
    hubUrl: "/email",
    color: "#0ea5e9",
    icon: Mail,
    sections: ["customers"],
    items: [
      { label: "Email Dashboard",       url: "/email",                      icon: LayoutGrid, section: "customers" },
      { label: "Audience & Subscribers",url: "/email/subscribers",          icon: Users, section: "customers", badge: "LIST", keywords: ["google sheet sync", "newsletter list"] },
      { label: "Email Campaigns",       url: "/email/campaigns",            icon: Mail, section: "customers", keywords: ["broadcasts", "blasts", "newsletter"] },
      { label: "Email Automations",     url: "/email/automations",          icon: Workflow, section: "customers", badge: "AUTO", featured: true, keywords: ["welcome drip", "abandoned cart", "order notification"] },
      { label: "Email Templates",       url: "/email/templates",            icon: FileText, section: "customers", keywords: ["html", "resend templates"] },
      { label: "Email Provider (Resend)",url: "/settings-ai/email-provider",icon: Send, section: "settings", badge: "RESEND", adminOnly: true, keywords: ["resend api key", "sender domain", "smtp"] },
    ],
  },
  {
    key: "affiliate",
    category: "growth",
    title: "Affiliate Program",
    sub: "Creator partnerships, referral link generators, commission ledger & payouts",
    hubUrl: "/affiliate",
    color: "#84cc16",
    icon: Tag,
    sections: ["affiliate"],
    items: [
      { label: "Affiliate Hub",         url: "/affiliate",                 icon: Tag, section: "affiliate", adminOnly: true },
      { label: "Partners Roster",       url: "/affiliate?tab=partners",     icon: Users, section: "affiliate", keywords: ["creators", "influencers"] },
      { label: "Commissions & Payouts", url: "/affiliate?tab=commissions",  icon: CreditCard, section: "affiliate", badge: "PAYOUT", featured: true, keywords: ["balance", "bkash payout", "approval"] },
      { label: "Referral Links",        url: "/affiliate?tab=links",        icon: Share2, section: "affiliate", keywords: ["tracking links", "promo codes"] },
    ],
  },
  {
    key: "brand",
    category: "brand",
    title: "Public Contents & UI",
    sub: "Visual aesthetics, storefront homepage composer, mobile app surfaces & CMS",
    hubUrl: "/brand",
    color: "#ec4899",
    icon: Palette,
    sections: ["storefront_ui", "portfolio"],
    items: [
      { label: "Public UI Dashboard",   url: "/brand",                      icon: LayoutGrid, section: "storefront_ui" },
      { label: "Storefront UI",         url: "/brand/home",                 icon: Layers, section: "storefront_ui", featured: true, keywords: ["page builder", "homepage sections", "banners"] },
      { label: "BrandHome UI",          url: "/brand/landing",              icon: Presentation, section: "portfolio", keywords: ["corporate site", "landing page", "news", "docs"] },
      { label: "CMS & Legal Pages",     url: "/brand/cms-pages",            icon: FileText, section: "storefront_ui", keywords: ["custom pages", "markdown", "privacy", "terms"] },
      { label: "Mobile UI",             url: "/brand/mobile-ui",            icon: Smartphone, section: "storefront_ui", badge: "APP", keywords: ["pwa", "bottom navigation", "app theme"] },
      { label: "OrderOps UI",           url: "/brand/orderops",             icon: AppWindow, section: "storefront_ui" },
      { label: "Explore / Social UI",   url: "/brand/explore-ui",           icon: Compass, section: "storefront_ui", keywords: ["social feed", "explore tabs"] },
    ],
  },
  {
    key: "system",
    category: "system",
    title: "Backend & System",
    sub: "Database diagnostics, server logs, edge functions, SMS & WhatsApp integrations",
    hubUrl: "/system",
    color: "#38bdf8",
    icon: Activity,
    sections: ["settings"],
    items: [
      { label: "System Dashboard",      url: "/system",                     icon: LayoutGrid, section: "settings" },
      { label: "Database Health",       url: "/system/db-health",           icon: Database, section: "settings", badge: "HEALTH", adminOnly: true, keywords: ["storage", "telemetry", "table size"] },
      { label: "Debug Console",         url: "/system/debug",               icon: Bug, section: "settings", badge: "LOGS", featured: true, adminOnly: true, keywords: ["server errors", "diagnostics", "edge functions"] },
      { label: "SMS Gateway Provider",  url: "/settings-ai/sms",            icon: Phone, section: "settings", badge: "SMS", adminOnly: true, keywords: ["bulksms", "otp", "sms balance"] },
      { label: "WhatsApp Business API", url: "/settings-ai/whatsapp",       icon: MessageSquare, section: "settings", badge: "API", adminOnly: true, keywords: ["meta cloud api", "whatsapp templates"] },
      { label: "Telegram Bot Studio",   url: "/settings-ai/telegram",       icon: Send, section: "settings", adminOnly: true },
    ],
  },
  {
    key: "settings",
    category: "system",
    title: "Settings & AI",
    sub: "Primary brand identity, global currencies, AI models, voice telephony & redirects",
    hubUrl: "/settings-ai",
    color: "#6366f1",
    icon: Settings,
    sections: ["settings", "ai"],
    items: [
      { label: "Settings Dashboard",    url: "/settings-ai",                icon: LayoutGrid, section: "settings" },
      { label: "Branding & Assets",     url: "/settings-ai/branding",       icon: Palette, section: "settings", badge: "BRAND", featured: true, adminOnly: true, keywords: ["brand name", "logo", "favicons", "colors"] },
      { label: "Appearance & Surfaces", url: "/settings-ai/appearance",     icon: Layout, section: "settings", adminOnly: true },
      { label: "General Settings",      url: "/settings-ai/general",        icon: Settings, section: "settings", adminOnly: true, keywords: ["currency", "maintenance mode"] },
      { label: "AI Agent",              url: "/settings-ai/ai-settings",    icon: Sparkle, section: "ai", badge: "AI", adminOnly: true, keywords: ["gemini", "prompt", "widget", "assistant"] },
      { label: "AI Recommendations",    url: "/settings-ai/recommendations",icon: Sparkle, section: "ai", adminOnly: true },
      { label: "Call Center",           url: "/settings-ai/call-settings",  icon: Phone, section: "settings", badge: "VOICE", adminOnly: true },
      { label: "Payment Gateways",      url: "/sales/payment-gateways",     icon: CreditCard, section: "settings", badge: "MFS", adminOnly: true, keywords: ["bkash", "nagad", "stripe", "cod"] },
      { label: "Apps Redirection",      url: "/settings-ai/redirects",      icon: Workflow, section: "settings", adminOnly: true },
    ],
  },
  {
    key: "team",
    category: "system",
    title: "Team & Access",
    sub: "Staff directory, department routing, granular permission controls & audit logs",
    hubUrl: "/team",
    color: "#a855f7",
    icon: Users2,
    sections: ["employees"],
    items: [
      { label: "Team Dashboard",        url: "/team",                       icon: LayoutGrid, section: "employees" },
      { label: "Teams & Departments",   url: "/team/teams",                 icon: Users2, section: "employees", adminOnly: true, keywords: ["groups", "departments"] },
      { label: "My Team",               url: "/team/my-team",               icon: Users, section: "employees" },
      { label: "Employees Directory",   url: "/team/employees",             icon: Users, section: "employees", adminOnly: true, keywords: ["staff roster", "employees"] },
      { label: "Access Manager",        url: "/team/access",                icon: ShieldCheck, section: "employees", badge: "RBAC", featured: true, adminOnly: true, keywords: ["permissions", "roles", "section access"] },
      { label: "Audit Log",             url: "/team/audit-log",             icon: FileText, section: "employees", badge: "AUDIT", adminOnly: true, keywords: ["security trail", "activity logs"] },
    ],
  },
];

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:    { label: "Pending",    color: "text-amber-500" },
  confirmed:  { label: "Confirmed",  color: "text-blue-500" },
  processing: { label: "Processing", color: "text-blue-500" },
  shipped:    { label: "Shipped",    color: "text-purple-500" },
  delivered:  { label: "Delivered",  color: "text-emerald-500" },
  cancelled:  { label: "Cancelled",  color: "text-rose-500" },
};

export default function MasterPanel() {
  const isBelowDesktop = useIsBelowDesktop();
  return isBelowDesktop ? <MobileMasterPanel /> : <DesktopMasterPanel />;
}

function DesktopMasterPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = useAdminRole();
  const { data: staff } = useStaffSections();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "sales" | "growth" | "brand" | "system">("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const isAdmin = role === "admin" || !!staff?.isAdmin;
  const hasAnyGrant = (staff?.accessible?.length ?? 0) > 0;

  // Realtime visitors
  const visitors = useRealtimeVisitors();

  // Profile query
  const { data: profile } = useQuery({
    queryKey: ["master-profile", user?.id],
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();
      return data;
    },
  });

  // Business scale metrics
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
        shippingFeesCollected: financials.shippingFeesCollected,
        returnedValue: financials.returnedProductsValue,
        shippingLoss: financials.shippingLossOnReturns,
      };
    },
  });

  // Today's orders query
  const { data: ordersToday } = useQuery({
    queryKey: ["vitals", "orders-today-master"],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      const { data, count } = await supabase
        .from("orders" as any)
        .select("id, total, subtotal, shipping_fee, coupon_discount, loyalty_discount, status, payment_method, is_delivery_prepaid", { count: "exact" })
        .gte("created_at", d.toISOString());
      const financials = calculateOrderFinancials((data ?? []) as any[]);
      return { count: count ?? 0, revenue: financials.recognizedRevenue };
    },
  });

  // Recent Orders Query for Tabular Feed
  const { data: recentOrders = [] } = useQuery({
    queryKey: ["master-recent-orders-table"],
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, total, status, created_at, shipping_address")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  // Active Support count
  const { data: supportCount = 0 } = useQuery({
    queryKey: ["vitals", "support-count-master"],
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { count } = await supabase
        .from("support_conversations")
        .select("*", { count: "exact", head: true })
        .eq("status", "open");
      return count ?? 0;
    },
  });

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Shortcut key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Working late" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = profile?.full_name?.split(" ")[0] || (isAdmin ? "Admin" : "Staff");

  // Gated Groups based on Access Permissions
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return ADMIN_DOMAIN_GROUPS.filter((group) => {
      if (isAdmin) return true;
      return group.sections.some((s) => staff?.hasAccess(s));
    }).map((group) => {
      const categoryMatch = selectedCategory === "all" || group.category === selectedCategory;
      if (!categoryMatch) return null;

      const accessFilteredItems = group.items.filter((item) => {
        if (isAdmin) return true;
        if (item.adminOnly) return false;
        if (item.section) return staff?.hasAccess(item.section);
        return hasAnyGrant ? false : true;
      });

      if (accessFilteredItems.length === 0) return null;

      if (!q) {
        return {
          ...group,
          items: accessFilteredItems,
        };
      }

      const groupMatch = group.title.toLowerCase().includes(q) || group.sub.toLowerCase().includes(q);
      const matchedItems = accessFilteredItems.filter((it) => {
        if (groupMatch) return true;
        const labelMatch = it.label.toLowerCase().includes(q);
        const badgeMatch = it.badge?.toLowerCase().includes(q);
        const urlMatch = it.url.toLowerCase().includes(q);
        const kwMatch = it.keywords?.some((k) => k.toLowerCase().includes(q));
        return labelMatch || badgeMatch || urlMatch || kwMatch;
      });

      if (matchedItems.length === 0 && !groupMatch) return null;

      return {
        ...group,
        items: matchedItems.length > 0 ? matchedItems : accessFilteredItems,
      };
    }).filter(Boolean) as AdminDomainGroup[];
  }, [searchQuery, selectedCategory, isAdmin, staff, hasAnyGrant]);

  const categoriesList = [
    { key: "all", label: `All Sections (${filteredGroups.length})` },
    { key: "sales", label: "Sales & Inventory" },
    { key: "growth", label: "Marketing & Growth" },
    { key: "brand", label: "Brand & UI" },
    { key: "system", label: "System & Governance" },
  ] as const;

  const currentCategoryLabel =
    categoriesList.find((c) => c.key === selectedCategory)?.label || "All Sections";

  return (
    <div className="w-full space-y-6 pb-20 text-foreground">
      {/* 1. Header Bar with Rounded Corners */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              {isAdmin ? "Founder Cockpit" : "Staff Workspace"} · Master Controls
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-display font-bold tracking-tight text-foreground mt-0.5">
            {greeting}, {firstName}
          </h1>
        </div>

        {/* Quick Action Launchers */}
        <div className="flex items-center gap-2 shrink-0">
          {(isAdmin || staff?.hasAccess("orders")) && (
            <button
              onClick={() => navigate({ to: "/sales/orderops" })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-amber-500/50 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-all cursor-pointer"
            >
              <ScanLine className="w-3.5 h-3.5" />
              <span>OrderOps Hub</span>
            </button>
          )}

          {(isAdmin || staff?.hasAccess("offline_orders")) && (
            <button
              onClick={() => navigate({ to: "/sales/offline-orders" })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-emerald-500/50 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>POS Counter</span>
            </button>
          )}

          {(isAdmin || staff?.hasAccess("products")) && (
            <button
              onClick={() => navigate({ to: "/sales/products-management?tab=scanner" })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border/60 bg-card/60 text-foreground hover:bg-card transition-all cursor-pointer"
            >
              <Barcode className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Scanner</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Symmetrical Telemetry Table Row with Rounded Corners */}
      <div className="rounded-2xl border border-border/50 bg-card/30 overflow-hidden divide-y divide-border/40 sm:divide-y-0 sm:grid sm:grid-cols-4 lg:grid-cols-8 sm:divide-x sm:divide-border/40 text-left">
        {[
          { label: "Lifetime Revenue", value: stats ? `৳${stats.revenue.toLocaleString()}` : "—", url: "/sales/customer-analytics", color: "text-amber-500" },
          { label: "Total Orders", value: stats ? stats.orders.toLocaleString() : "—", url: "/sales/orders", color: "text-blue-500" },
          { label: "Active Products", value: stats ? stats.products.toLocaleString() : "—", url: "/sales/products-management?tab=products", color: "text-emerald-500" },
          { label: "Total Customers", value: stats ? stats.customers.toLocaleString() : "—", url: "/sales/customers-hub", color: "text-pink-500" },
          { label: "Live Visitors", value: `${visitors ?? 0} online`, url: "/sales/live-activity", color: "text-sky-400" },
          { label: "Today's Orders", value: `${ordersToday?.count ?? 0} (৳${(ordersToday?.revenue ?? 0).toLocaleString()})`, url: "/sales/orders", color: "text-amber-400" },
          { label: "System Health", value: "All Systems OK", url: "/system/db-health", color: "text-emerald-400" },
          { label: "Support Queue", value: `${supportCount} Open Chats`, url: "/sales/customers-hub", color: "text-purple-400" },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => navigate({ to: item.url })}
            className="p-3 hover:bg-muted/30 transition-colors text-left flex flex-col justify-between cursor-pointer w-full group"
          >
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate w-full">
              {item.label}
            </span>
            <div className="flex items-baseline justify-between gap-1 mt-1">
              <span className={`text-sm sm:text-base font-mono font-bold truncate ${item.color}`}>
                {item.value}
              </span>
              <ArrowUpRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-foreground shrink-0 transition-colors" />
            </div>
          </button>
        ))}
      </div>

      {/* 3. Symmetrical Split Table: Performance Graph + Recent Orders Flow */}
      <div className="rounded-2xl border border-border/50 bg-card/30 overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border/50">
        {/* Left: Trend Graph */}
        <div className="lg:col-span-7 p-4 sm:p-5">
          <DashboardSalesChart />
        </div>

        {/* Right: Recent Orders Table */}
        <div className="lg:col-span-5 flex flex-col justify-between p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Recent Orders Intake
              </span>
            </div>
            <button
              onClick={() => navigate({ to: "/sales/orders" })}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              View all <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-border/30 flex-1 my-1">
            {recentOrders.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No orders recorded yet.
              </div>
            ) : (
              recentOrders.map((ord: any) => {
                const cfg = ORDER_STATUS_CONFIG[ord.status] || ORDER_STATUS_CONFIG.pending;
                const customerName =
                  (ord.shipping_address as any)?.full_name ||
                  (ord.shipping_address as any)?.name ||
                  "Direct Customer";

                return (
                  <div
                    key={ord.id}
                    onClick={() => navigate({ to: "/sales/orders" })}
                    className="py-2 px-1 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                          #{ord.order_number || ord.id.slice(0, 8)}
                        </span>
                        <span className={`text-[10px] font-mono uppercase ${cfg.color}`}>
                          [{cfg.label}]
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {customerName} · {formatDistanceToNow(new Date(ord.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <span className="font-mono text-xs font-bold text-foreground shrink-0">
                      ৳{Number(ord.total || 0).toLocaleString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 4. Filter & Search Bar with Single Consolidated Filter Button */}
      <div className="rounded-2xl border border-border/50 p-3 flex items-center justify-between gap-3 bg-card/30">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search operations, tools & modules... (press /)"
            className="w-full h-9 pl-8 pr-8 rounded-xl bg-background border border-border/60 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Single Filter Button with Dropdown Menu */}
        <div className="relative shrink-0" ref={filterDropdownRef}>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`h-9 px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 transition-all cursor-pointer ${
              selectedCategory !== "all"
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-background border-border/60 text-foreground hover:bg-muted/40 hover:border-border"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{currentCategoryLabel}</span>
            <span className="sm:hidden">Filter</span>
            {selectedCategory !== "all" && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isFilterOpen ? "rotate-180" : ""}`} />
          </button>

          {isFilterOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-xl shadow-xl p-1.5 z-50 space-y-0.5">
              <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Filter by Category
              </div>
              {categoriesList.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => {
                    setSelectedCategory(cat.key);
                    setIsFilterOpen(false);
                  }}
                  className={`w-full px-2.5 py-2 rounded-xl text-xs font-medium text-left flex items-center justify-between transition-colors cursor-pointer ${
                    selectedCategory === cat.key
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-foreground hover:bg-muted/60"
                  }`}
                >
                  <span>{cat.label}</span>
                  {selectedCategory === cat.key && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. Section List View: Each Section Row has its Tools Grid Underneath */}
      {filteredGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center text-xs text-muted-foreground">
          No operations matching "{searchQuery}".
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => {
            const GroupIcon = group.icon;
            return (
              <div
                key={group.key}
                className="rounded-2xl border border-border/50 bg-card/30 p-4 sm:p-5 space-y-3.5 transition-all hover:border-border/80"
              >
                {/* Section Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border/40">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${group.color}18`, border: `1px solid ${group.color}30` }}
                    >
                      <GroupIcon className="w-4 h-4" style={{ color: group.color }} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight truncate leading-tight">
                          {group.title}
                        </h2>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold"
                          style={{ backgroundColor: `${group.color}15`, color: group.color }}
                        >
                          {group.items.length} tools
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {group.sub}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate({ to: group.hubUrl })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-background/80 hover:bg-card hover:border-border text-xs font-semibold text-foreground/90 transition-all cursor-pointer self-start sm:self-auto shrink-0"
                  >
                    <span>Open Hub</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>

                {/* Nav Options Grid Under the Section Name */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5">
                  {group.items.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <button
                        key={item.url}
                        onClick={() => navigate({ to: item.url })}
                        className={`group/item flex flex-col justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          item.featured
                            ? "bg-primary/10 border-primary/30 hover:bg-primary/15 hover:border-primary/50"
                            : "bg-background/60 border-border/40 hover:bg-background hover:border-border/80 hover:shadow-xs"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <div className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 group-hover/item:text-primary transition-colors">
                            <ItemIcon className="w-3.5 h-3.5 text-muted-foreground group-hover/item:text-primary transition-colors" />
                          </div>
                          {item.badge && (
                            <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase font-mono tracking-wider ${
                              item.featured ? "bg-primary/20 text-primary" : "bg-muted/80 text-muted-foreground"
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-foreground/90 group-hover/item:text-foreground line-clamp-1">
                            {item.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
