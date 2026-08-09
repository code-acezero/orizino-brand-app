"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@/lib/router-compat";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import {
  ShoppingCart, Search, Tag, Palette, Activity, Settings, Users2,
  ChevronRight, Package, Users, BarChart3, LayoutGrid,
  Mail, Radio, ShieldCheck, Database, Bug, Megaphone, Image as ImageIcon,
  FileText, Home, Layers, CreditCard, Truck, Star, Gift, Rocket,
  Presentation, Bot, Wand2, ScanLine,
} from "lucide-react";
import LiveVitals from "@/components/admin/LiveVitals";
import MobileMasterPanel from "./MobileMasterPanel";

/** Below xl (1280px) → mobile + tablet get the stacked ControlPanel-style UI. */
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

/**
 * MasterPanel — the founder / master-admin cockpit.
 * A single page containing the entire library of admin controls,
 * grouped by domain, plus live dashboard vitals.
 */

type Item = { label: string; url: string; icon: React.ComponentType<any> };
type Group = { key: string; title: string; sub: string; color: string; icon: React.ComponentType<any>; items: Item[] };

const CHERRY = "#9a0002";
const CREAM = "#efe6dd";

const GROUPS: Group[] = [
  {
    key: "dashboard", title: "Dashboard", sub: "Overview, analytics, live activity",
    color: CHERRY, icon: LayoutGrid,
    items: [
      { label: "Overview",       url: "/",                           icon: Home },
      { label: "Live Activity",  url: "/sales/live-activity",        icon: Radio },
      { label: "Analytics",      url: "/sales/customer-analytics",   icon: BarChart3 },
      { label: "Audit Log",      url: "/team/audit-log",             icon: FileText },
    ],
  },
  {
    key: "products", title: "Products", sub: "Catalogue, categories, inventory, reviews",
    color: "#f59e0b", icon: Package,
    items: [
      { label: "All Products",       url: "/sales/products-hub",      icon: Package },
      { label: "Product Management", url: "/sales/products-management",icon: Layers },
      { label: "Categories",         url: "/sales/categories",        icon: LayoutGrid },
      { label: "Reviews",            url: "/sales/reviews",           icon: Star },
      { label: "Barcode Scanner",    url: "/sales/products-management?tab=scanner", icon: ScanLine },
      { label: "Recommendations",   url: "/settings-ai/recommendations", icon: Wand2 },
    ],
  },
  {
    key: "orders", title: "Orders", sub: "All orders, returns, offline, offline POS",
    color: "#0ea5e9", icon: ShoppingCart,
    items: [
      { label: "All Orders",      url: "/sales/orders",          icon: ShoppingCart },
      { label: "Returns",         url: "/sales/returns",          icon: Truck },
      { label: "Offline Orders",  url: "/sales/offline-orders",  icon: CreditCard },
      { label: "Order Reasons",   url: "/sales/order-reasons",   icon: FileText },
    ],
  },
  {
    key: "customers", title: "Customers", sub: "Customer list, analytics, promos",
    color: "#8b5cf6", icon: Users,
    items: [
      { label: "Customer List",    url: "/sales/customers-hub",      icon: Users },
      { label: "Customer Analytics", url: "/sales/customer-analytics", icon: BarChart3 },
      { label: "User Promos",      url: "/sales/user-promos",        icon: Gift },
      { label: "Coupons",          url: "/sales/coupons",            icon: Tag },
      { label: "Affiliate Program",url: "/affiliate",               icon: Rocket },
    ],
  },
  {
    key: "marketing", title: "Marketing", sub: "Email, banners, SEO, announcements, campaigns",
    color: "#ec4899", icon: Megaphone,
    items: [
      { label: "Announcements",     url: "/marketing/announcements", icon: Megaphone },
      { label: "Banners",           url: "/brand/banners",           icon: ImageIcon },
      { label: "Email Provider",    url: "/email/provider",          icon: Mail },
      { label: "Email Campaigns",   url: "/email/campaigns",         icon: Mail },
      { label: "Email Automations", url: "/email/automations",       icon: Rocket },
      { label: "Email Templates",   url: "/email/templates",         icon: FileText },
      { label: "Subscribers",       url: "/email/subscribers",       icon: Users },
      { label: "SEO Control",       url: "/marketing",               icon: Search },
      { label: "Ads & Tracking",    url: "/marketing/tracking",      icon: BarChart3 },
    ],
  },
  {
    key: "operations", title: "Operations", sub: "Shipping, payments, couriers, support",
    color: "#f97316", icon: Truck,
    items: [
      { label: "Payments & Couriers", url: "/sales/payments-couriers", icon: CreditCard },
      { label: "Payment Gateways",    url: "/sales/payment-gateways",  icon: CreditCard },
      { label: "Shipping",            url: "/sales/shipping",           icon: Truck },
      { label: "Couriers",            url: "/sales/couriers",           icon: Truck },
      { label: "Courier Sync",        url: "/sales/courier-sync",       icon: Activity },
      { label: "Delivery Offers",     url: "/sales/delivery-offers",    icon: Gift },
      { label: "Customer Support",    url: "/sales/support",            icon: ShieldCheck },
      { label: "Order Tracking",      url: "/sales/tracking",           icon: BarChart3 },
    ],
  },
  {
    key: "settings", title: "Settings & System", sub: "Branding, staff, AI, appearance, backend",
    color: "#38bdf8", icon: Settings,
    items: [
      { label: "Branding",        url: "/brand/branding",         icon: Palette },
      { label: "Appearance",      url: "/brand/appearance",       icon: Palette },
      { label: "Auth Appearance", url: "/brand/auth-appearance",  icon: ShieldCheck },
      { label: "Mobile UI",       url: "/brand/mobile-ui",        icon: Layers },
      { label: "Storefront Home", url: "/brand/home",             icon: Home },
      { label: "Company Landing", url: "/brand/landing",          icon: Presentation },
      { label: "Footer Settings", url: "/brand/footer",           icon: Layers },
      { label: "CMS Pages",       url: "/brand/cms-pages",        icon: FileText },
      { label: "Showcase/Slides", url: "/sales/showcase",         icon: Presentation },
      { label: "Teams & Staff",   url: "/team/teams",             icon: Users2 },
      { label: "Employees",       url: "/team/employees",         icon: Users },
      { label: "Staff Access",    url: "/team/staff",             icon: ShieldCheck },
      { label: "Site Settings",   url: "/settings-ai",            icon: Settings },
      { label: "AI Settings",     url: "/settings-ai/ai-settings",icon: Bot },
      { label: "Call Settings",   url: "/settings-ai/call-settings", icon: Radio },
      { label: "Redirects",       url: "/settings-ai/redirects",  icon: FileText },
      { label: "DB Health",       url: "/system/db-health",       icon: Database },
      { label: "Debug Console",   url: "/system/debug",           icon: Bug },
      { label: "Affiliate Hub",   url: "/affiliate",              icon: Tag },
    ],
  },
  {
    key: "corporate", title: "Corporate & Access", sub: "Teams, staff, roles, audit trail",
    color: "#a855f7", icon: Users2,
    items: [
      { label: "Teams",       url: "/team/teams",     icon: Users2 },
      { label: "Employees",   url: "/team/employees", icon: Users },
      { label: "Staff Access",url: "/team/staff",     icon: ShieldCheck },
      { label: "My Team",     url: "/team/my-team",   icon: Users },
      { label: "Audit Log",   url: "/team/audit-log", icon: FileText },
    ],
  },
  {
    key: "backend", title: "Backend & System", sub: "DB health, debug, edge functions, settings",
    color: "#38bdf8", icon: Activity,
    items: [
      { label: "DB Health",       url: "/system/db-health",           icon: Database },
      { label: "Debug",           url: "/system/debug",               icon: Bug },
      { label: "Site Settings",   url: "/settings-ai",                    icon: Settings },
      { label: "AI Settings",     url: "/settings-ai/ai-settings",        icon: Bot },
      { label: "Call Settings",   url: "/settings-ai/call-settings",      icon: Radio },
      { label: "Recommendations", url: "/settings-ai/recommendations",    icon: Wand2 },
    ],
  },
];

export default function MasterPanel() {
  const isBelowDesktop = useIsBelowDesktop();
  return isBelowDesktop ? <MobileMasterPanel /> : <DesktopMasterPanel />;
}

function DesktopMasterPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["master-profile", user?.id],
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["master-vitals"],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const [ordersRes, productsRes, customersRes, revenueRes] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("total_amount").eq("status", "paid"),
      ]);
      const revenue = (revenueRes.data ?? []).reduce((s: number, r: any) => s + Number(r.total_amount ?? 0), 0);
      return {
        orders:    ordersRes.count ?? 0,
        products:  productsRes.count ?? 0,
        customers: customersRes.count ?? 0,
        revenue,
      };
    },
  });

  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Working late" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = profile?.full_name?.split(" ")[0] || "Founder";

  return (
    <div className="space-y-6 sm:space-y-8 pb-8 sm:pb-10">
      {/* Header — no duplicate 'Master Panel' pill; the sidebar/topbar carry that */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <motion.h1
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            className="text-xl sm:text-2xl md:text-3xl font-display font-bold truncate"
          >
            {greeting}, {firstName}
          </motion.h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Full library of controls — the entire operation, one page.
          </p>
        </div>
        <button
          onClick={() => navigate({ to: "/scanner" })}
          className="hidden sm:inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#c8102e]/30 bg-gradient-to-br from-[#c8102e]/10 to-transparent px-3.5 py-2.5 hover:from-[#c8102e]/20 hover:border-[#c8102e]/60 transition-all"
          title="Open standalone barcode scanner"
        >
          <ScanLine className="w-4 h-4 text-[#ff5064]" />
          <span className="text-xs font-semibold">Scanner</span>
        </button>
      </div>

      {/* Live vitals — realtime widgets from the corporate data sources */}
      <LiveVitals />

      {/* Aggregate stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Revenue",   value: `৳${stats.revenue.toLocaleString()}`, icon: BarChart3, url: "/sales/customer-analytics", highlight: true },
            { label: "Orders",    value: stats.orders.toLocaleString(),         icon: ShoppingCart, url: "/sales/orders", highlight: false },
            { label: "Products",  value: stats.products.toLocaleString(),       icon: Package,      url: "/sales/products-hub", highlight: false },
            { label: "Customers", value: stats.customers.toLocaleString(),      icon: Users,        url: "/sales/customers-hub", highlight: false },
          ].map(({ label, value, icon: Icon, url, highlight }) => (
            <button
              key={label}
              onClick={() => navigate({ to: url })}
              className={`flex flex-col items-start gap-1 border p-3 text-left transition-all hover:shadow-md ${
                highlight
                  ? "border-[hsl(0_100%_30%/0.4)] bg-[hsl(0_100%_30%/0.08)] hover:bg-[hsl(0_100%_30%/0.12)]"
                  : "border-border/60 bg-card/60 hover:bg-card hover:border-border"
              }`}
              style={{ borderRadius: "4px" }}
            >
              <Icon className="w-4 h-4" style={{ color: highlight ? "hsl(0 100% 30%)" : undefined }} strokeWidth={1.5} />
              <span className="text-lg font-bold text-foreground leading-none truncate w-full" style={{ fontFamily: "'Playfair Display', serif", color: highlight ? "hsl(0 100% 30%)" : undefined }}>{value}</span>
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Library */}
      <div className="space-y-6">
        {GROUPS.map((g, gi) => {
          const GIcon = g.icon;
          return (
            <motion.section
              key={g.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.04, duration: 0.28, ease: "easeOut" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${g.color}20`, border: `1px solid ${g.color}33` }}
                >
                  <GIcon className="w-3.5 h-3.5" style={{ color: g.color }} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-foreground leading-snug tracking-[-0.005em]">{g.title}</h2>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{g.sub}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {g.items.map((it) => {
                  const IIcon = it.icon;
                  return (
                    <button
                      key={it.url}
                      onClick={() => navigate({ to: it.url })}
                      className="group flex items-center gap-2.5 rounded-lg border border-border/50 bg-card/40 px-3 py-2.5 text-left hover:bg-card hover:border-border hover:shadow-sm transition-all"
                    >
                      <IIcon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
                      <span className="text-xs font-medium text-foreground/90 truncate flex-1">{it.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/70 shrink-0 transition-colors" />
                    </button>
                  );
                })}
              </div>
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}
// code:4ce0
