"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@/lib/router-compat";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import {
  ShoppingCart, Search, Tag, Palette, Activity, Settings, Users2,
  Package, Users, BarChart3, LayoutGrid,
  Mail, Radio, ShieldCheck, Database, Bug, Megaphone, Image as ImageIcon,
  FileText, Home, Layers, CreditCard, Truck, Star, Gift, Rocket,
  Presentation, Bot, Wand2, ScanLine,
} from "lucide-react";
import LiveVitals from "@/components/admin/LiveVitals";
import { SectionRowGroup, type SectionRowItem } from "@/components/admin/SectionRow";

type Group = { key: string; title: string; items: SectionRowItem[] };

const GROUPS: Group[] = [
  {
    key: "sales", title: "Sales & Operations",
    items: [
      { key: "dashboard",  title: "Dashboard",       sub: "Overview & KPIs",           url: "/sales",                    icon: LayoutGrid,   color: "#f59e0b" },
      { key: "orders",     title: "Orders",          sub: "Fulfilment & tracking",     url: "/sales/orders",             icon: ShoppingCart, color: "#f59e0b" },
      { key: "products",   title: "Products",        sub: "Catalog & inventory",       url: "/sales/products-hub",       icon: Package,      color: "#f59e0b" },
      { key: "scanner",    title: "Barcode Scanner", sub: "Camera & physical scanner", url: "/sales/products-management?tab=scanner", icon: ScanLine, color: "#f59e0b" },
      { key: "customers",  title: "Customers",       sub: "Accounts, notes & tags",    url: "/sales/customers-hub",      icon: Users,        color: "#a855f7" },
      { key: "reviews",    title: "Reviews",         sub: "Ratings & feedback",        url: "/sales/reviews",            icon: Star,         color: "#f59e0b" },
      { key: "returns",    title: "Returns",         sub: "RMAs & refunds",            url: "/sales/returns",            icon: Truck,        color: "#f59e0b" },
      { key: "coupons",    title: "Coupons",         sub: "Promo codes",               url: "/sales/coupons",            icon: Tag,          color: "#f59e0b" },
      { key: "delivery",   title: "Delivery Offers", sub: "Shipping incentives",       url: "/sales/delivery-offers",    icon: Gift,         color: "#f59e0b" },
      { key: "payments",   title: "Payments",        sub: "Gateways & couriers",       url: "/sales/payments-couriers",  icon: CreditCard,   color: "#f59e0b" },
      { key: "shipping",   title: "Shipping",        sub: "Rates & zones",             url: "/sales/shipping",           icon: Truck,        color: "#f59e0b" },
      { key: "live",       title: "Live Activity",   sub: "Realtime visitors",         url: "/sales/live-activity",      icon: Radio,        color: "#38bdf8" },
      { key: "analytics",  title: "Analytics",       sub: "Sales & behavior insights", url: "/sales/customer-analytics", icon: BarChart3,    color: "#38bdf8" },
    ],
  },
  {
    key: "seo", title: "Marketing Management",
    items: [
      { key: "seo",        title: "SEO Control Center", sub: "Search tracking & sitemap", url: "/marketing",                       icon: Search,   color: "#f97316" },
      { key: "tracking",   title: "Ads & Tracking",     sub: "Pixels, tags & ad setup",   url: "/marketing/tracking",              icon: BarChart3,color: "#f97316" },
      { key: "announce",   title: "Announcements",      sub: "Sitewide banners",         url: "/marketing/announcements",         icon: Megaphone,color: "#f97316" },
    ],
  },
  {
    key: "email", title: "Email Marketing",
    items: [
      { key: "email-dash", title: "Email Dashboard",    sub: "Reach & deliverability",   url: "/email",                     icon: LayoutGrid, color: "#0ea5e9" },
      { key: "provider",   title: "Email Provider",     sub: "API keys & senders",       url: "/email/provider",            icon: ShieldCheck,color: "#0ea5e9" },
      { key: "campaigns",  title: "Email Campaigns",    sub: "Blasts & broadcasts",      url: "/email/campaigns",           icon: Mail,     color: "#0ea5e9" },
      { key: "autos",      title: "Email Automations",  sub: "Drip & triggers",          url: "/email/automations",         icon: Rocket,   color: "#0ea5e9" },
      { key: "templates",  title: "Email Templates",    sub: "Reusable designs",         url: "/email/templates",           icon: FileText, color: "#0ea5e9" },
      { key: "subs",       title: "Subscribers",        sub: "List & segments",          url: "/email/subscribers",         icon: Users,    color: "#0ea5e9" },
    ],
  },
  {
    key: "brand", title: "Branding & CMS",
    items: [
      { key: "landing",    title: "Company Landing", sub: "Corporate site editor", url: "/brand/landing",         icon: Home,         color: "#ec4899" },
      { key: "sf-home",    title: "Storefront Home", sub: "Home page composer",    url: "/brand/home",            icon: Layers,       color: "#ec4899" },
      { key: "appearance", title: "Appearance",      sub: "Theme & tokens",        url: "/brand/appearance",      icon: Palette,      color: "#ec4899" },
      { key: "banners",    title: "Banners",         sub: "Hero & promo slots",    url: "/brand/banners",         icon: ImageIcon,    color: "#ec4899" },
      { key: "showcase",   title: "Showcase",        sub: "Featured content",      url: "/sales/showcase",              icon: Presentation, color: "#ec4899" },
      { key: "footer",     title: "Footer",          sub: "Global footer editor",  url: "/brand/footer",          icon: Layers,       color: "#ec4899" },
      { key: "cms",        title: "CMS Pages",       sub: "Static content",        url: "/brand/cms-pages",       icon: FileText,     color: "#ec4899" },
      { key: "mobile-ui",  title: "Mobile UI",       sub: "App-only surfaces",     url: "/brand/mobile-ui",       icon: Palette,      color: "#ec4899" },
      { key: "auth-look",  title: "Auth Appearance", sub: "Sign-in look & feel",   url: "/brand/auth-appearance", icon: ShieldCheck,  color: "#ec4899" },
    ],
  },
  {
    key: "affiliate", title: "Affiliate Program",
    items: [
      { key: "aff-hub", title: "Affiliate Hub", sub: "Partners, referrals & commissions", url: "/affiliate", icon: Tag, color: "#84cc16" },
    ],
  },
  {
    key: "corporate", title: "Corporate & Access",
    items: [
      { key: "teams",     title: "Teams",        sub: "Groups & routing",    url: "/team/teams",     icon: Users2,      color: "#a855f7" },
      { key: "employees", title: "Employees",    sub: "Roster & profiles",   url: "/team/employees", icon: Users,       color: "#a855f7" },
      { key: "access",    title: "Staff Access", sub: "Section-level roles", url: "/team/staff",     icon: ShieldCheck, color: "#a855f7" },
      { key: "my-team",   title: "My Team",      sub: "Your teammates",      url: "/team/my-team",   icon: Users,       color: "#a855f7" },
      { key: "audit",     title: "Audit Log",    sub: "Activity trail",      url: "/team/audit-log", icon: FileText,    color: "#a855f7" },
    ],
  },
  {
    key: "backend", title: "Backend & System",
    items: [
      { key: "db",       title: "DB Health",       sub: "Database vitals",     url: "/system/db-health",        icon: Database, color: "#38bdf8" },
      { key: "debug",    title: "Debug",           sub: "Diagnostics & logs",  url: "/system/debug",            icon: Bug,      color: "#38bdf8" },
      { key: "settings", title: "Site Settings",   sub: "Global config",       url: "/settings-ai",                 icon: Settings, color: "#94a3b8" },
      { key: "ai",       title: "AI Settings",     sub: "Widget & memory",     url: "/settings-ai/ai-settings",     icon: Bot,      color: "#94a3b8" },
      { key: "calls",    title: "Call Settings",   sub: "Voice & telephony",   url: "/settings-ai/call-settings",   icon: Radio,    color: "#94a3b8" },
      { key: "recs",     title: "Recommendations", sub: "Merchandising rules", url: "/settings-ai/recommendations", icon: Wand2,    color: "#94a3b8" },
    ],
  },
];

export default function MobileMasterPanel() {
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
    <div className="space-y-6 sm:space-y-8 pb-8">
      {/* Header — matches ControlPanel */}
      <div>
        <motion.h1
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="text-xl sm:text-2xl md:text-3xl font-display font-bold"
        >
          {greeting}, {firstName}
        </motion.h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Full library of controls — the entire operation, one page.
        </p>
      </div>

      {/* Aggregate stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Revenue",   value: `৳${stats.revenue.toLocaleString()}`, icon: BarChart3,    url: "/sales/customer-analytics" },
            { label: "Orders",    value: stats.orders.toLocaleString(),         icon: ShoppingCart, url: "/sales/orders" },
            { label: "Products",  value: stats.products.toLocaleString(),       icon: Package,      url: "/sales/products-hub" },
            { label: "Customers", value: stats.customers.toLocaleString(),      icon: Users,        url: "/sales/customers-hub" },
          ].map(({ label, value, icon: Icon, url }) => (
            <button
              key={label}
              onClick={() => navigate({ to: url })}
              className="flex flex-col items-start gap-1 rounded-xl border border-border/60 bg-card/60 p-3 text-left hover:bg-card hover:border-border hover:shadow-sm transition-all"
            >
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-lg font-bold text-foreground leading-none truncate w-full">{value}</span>
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </button>
          ))}
        </div>
      )}

      <LiveVitals />

      {/* Same row markup ControlPanel uses, grouped by domain */}
      {GROUPS.map((g) => (
        <SectionRowGroup key={g.key} title={g.title} items={g.items} />
      ))}
    </div>
  );
}
// code:4ce0
