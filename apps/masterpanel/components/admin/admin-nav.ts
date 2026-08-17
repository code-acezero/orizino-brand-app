"use client";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  Star,
  Heart,
  Image,
  Settings,
  MessageSquare,
  Layers,
  Home,
  Megaphone,
  Tag,
  Truck,
  Headphones,
  KeyRound,
  Bot,
  Printer,
  Gift,
  Percent,
  Palette,
  Globe,
  Smartphone,
  Phone,
  Building2,
  Bug,
  RotateCcw,
  Activity,
  FileText,
  TrendingUp,
  Eye,
  BarChart3,
  Search,
  Type,
  Paintbrush,
  Wand2,
  Workflow,
  Layout,
  Briefcase,
  Share2,
  Shield,
  HelpCircle,
  Database,
  Terminal,
  Cpu,
  Sliders,
  DollarSign,
  Receipt,
  FileSpreadsheet,
  QrCode,
  ShieldAlert,
  HardDrive,
  CreditCard,
  AtSign,
  Send,
  AppWindow,
  Compass,
  Clock,
  Wallet,
  LayoutGrid,
  ExternalLink,
  Users2,
  ShieldCheck,
  Mail,
  ClipboardList,
  ScanLine,
  Store,
  type LucideIcon,
} from "lucide-react";
import { Sparkle } from "@/components/icons/Sparkle";

export interface AdminNavChild {
  title: string;
  url: string;
  icon?: LucideIcon;
  section?: StaffSectionKey;
  description?: string;
  keywords?: string;
  children?: AdminNavChild[];
}


export type StaffSectionKey =
  | "products"
  | "orders"
  | "offline_orders"
  | "customers"
  | "affiliate"
  | "seo"
  | "storefront_ui"
  | "portfolio"
  | "ai"
  | "analytics"
  | "employees"
  | "settings";

export interface AdminNavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  section?: StaffSectionKey;
  description?: string;
  keywords?: string;
  children?: AdminNavChild[];
}

export interface AdminNavSection {
  label: string;
  items: AdminNavItem[];
}

export const adminNav: AdminNavSection[] = [
  // ─────────────────────────────────────────────────────────────────
  // Master Controls  (shown at /)
  // ─────────────────────────────────────────────────────────────────
  {
    label: "Master Controls",
    items: [
      {
        title: "Overview",
        url: "/",
        icon: LayoutGrid,
        description: "Master Panel overview, vital metrics & stats",
      },
      {
        title: "Sales & Customers",
        url: "/sales",
        icon: ShoppingCart,
        section: "orders",
        description: "Sales overview, revenue volume & quick stats",
      },
      {
        title: "PSO Management",
        url: "/sales/products-management?tab=products",
        icon: Package,
        section: "products",
        description: "Product catalogue, variant matrix, pricing & bulk upload",
      },
      {
        title: "SEO & Ads Management",
        url: "/marketing",
        icon: Search,
        section: "seo",
        description: "Search engine optimization, ads tracking & analytics",
      },
      {
        title: "Emails & Marketing",
        url: "/email",
        icon: Send,
        section: "customers",
        description: "Audience, subscribers, campaigns & automations",
      },
      {
        title: "Affiliate Program",
        url: "/affiliate",
        icon: Tag,
        section: "affiliate",
        description: "Partners, referral links & commission payouts",
      },
      {
        title: "Public Contents & UI",
        url: "/brand",
        icon: Palette,
        section: "storefront_ui",
        description: "Storefront, BrandHome landing, CMS & public pages",
      },
      {
        title: "Backend & System",
        url: "/system",
        icon: Activity,
        section: "settings",
        description: "Database health, cron jobs & system diagnostics",
      },
      {
        title: "Settings & AI",
        url: "/settings-ai",
        icon: Settings,
        section: "settings",
        description: "Brand identity, appearance, AI agent & integrations",
      },
      {
        title: "Team & Access",
        url: "/team",
        icon: Users2,
        section: "employees",
        description: "Employees, team roles & section access manager",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // 1. Sales & Customers — sales management, orders & support
  // ─────────────────────────────────────────────────────────────────
  {
    label: "Sales & Customers",
    items: [
      {
        title: "Sales Dashboard",
        url: "/sales",
        icon: LayoutDashboard,
        section: "orders",
        description: "Sales overview, revenue volume & quick stats",
      },
      {
        title: "Orders & Returns",
        url: "/sales/orders",
        icon: ShoppingCart,
        section: "orders",
        description: "Online orders, returns, cancellations & verification",
      },
      {
        title: "Offline Orders",
        url: "/sales/offline-orders",
        icon: Store,
        section: "offline_orders",
        description: "Counter POS, Page, WhatsApp, TikTok & manual sales with live scanning",
      },
      {
        title: "Product Scanner",
        url: "/sales/products-management?tab=scanner",
        icon: ScanLine,
        section: "products",
        description: "High-speed camera & physical serial scanner for sales, returns, and verification",
      },
      {
        title: "Customer Support",
        url: "/sales/customers-hub",
        icon: Users,
        section: "customers",
        description: "Customers, support inbox, analytics & live activity",
        children: [
          {
            title: "Customers",
            url: "/sales/customers",
            children: [
              { title: "Promo / Notification", url: "/sales/customers?panel=promo" },
              { title: "Inbox",                url: "/sales/customers?panel=inbox" },
            ],
          },
          { title: "Support Inbox",      url: "/sales/support" },
          { title: "Customer Analytics", url: "/sales/customer-analytics" },
          { title: "Live Activity",      url: "/sales/live-activity" },
          { title: "Announcements",      url: "/marketing/announcements" },
        ],
      },
      {
        title: "Customer Reviews",
        url: "/sales/reviews",
        icon: Star,
        section: "customers",
        description: "Product star ratings, customer feedback & moderation",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // 2. PSO Management — catalogue, stock, shipping & offers
  // ─────────────────────────────────────────────────────────────────
  {
    label: "PSO Management",
    items: [
      {
        title: "Products",
        url: "/sales/products-management?tab=products",
        icon: Package,
        section: "products",
        description: "Product catalogue, variant matrix, pricing & bulk upload",
      },
      {
        title: "Categories",
        url: "/sales/products-management?tab=categories",
        icon: FolderTree,
        section: "products",
        description: "Catalogue hierarchy, storefront filters, branding visuals & SEO",
      },
      {
        title: "Stock & Serials",
        url: "/sales/products-management?tab=stock",
        icon: Layers,
        section: "products",
        description: "Global two-way stock sync, serial logs & inventory movement",
      },
      {
        title: "Wishlists & Demand",
        url: "/sales/requests",
        icon: Heart,
        section: "products",
        description: "Customer wishlist saves, restock alert queues & purchasing demand",
      },
      {
        title: "Invoice & Stickers",
        url: "/sales/invoice-stickers",
        icon: Printer,
        section: "orders",
        description: "Invoice & POS slip designer, and product serial stickers",
        children: [
          { title: "Invoice & POS Config",     url: "/sales/invoice-stickers" },
          { title: "Product Serial Sticker",   url: "/sales/invoice-stickers?tab=product-sticker" },
        ],
      },
      {
        title: "Promotions & Discounts",
        url: "/sales/coupons",
        icon: Tag,
        section: "products",
        description: "Discount coupons, targeted user promos & delivery offers",
        children: [
          { title: "Discount Coupons",       url: "/sales/coupons?tab=coupons" },
          { title: "Targeted User Promos",   url: "/sales/coupons?tab=user-promos" },
          { title: "Delivery Offers",        url: "/sales/delivery-offers" },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // SEO & ADS MANAGEMENT  /marketing
  // ─────────────────────────────────────────────────────────────────
  {
    label: "SEO & Ads Management",
    items: [
      {
        title: "SEO & Ads Dashboard",
        url: "/marketing",
        icon: LayoutDashboard,
        section: "seo",
        description: "Overview of SEO visibility, tracking & search metrics",
      },
      {
        title: "SEO Control Center",
        url: "/marketing/seo",
        icon: Search,
        adminOnly: true,
        section: "seo",
        description: "Search optimization, schema & audit",
        keywords: "seo search meta og structured data sitemap robots schema audit",
        children: [
          { title: "Overview & Health",        url: "/marketing/seo?tab=dashboard" },
          { title: "Page-Wise Metadata",       url: "/marketing/seo?tab=pages" },
          { title: "Live Technical Audit",     url: "/marketing/seo?tab=audit" },
          { title: "Global & Verification",    url: "/marketing/seo?tab=global" },
          { title: "Rich Snippets & Schema",   url: "/marketing/seo?tab=schema" },
          { title: "Sitemap & Crawlers",       url: "/marketing/seo?tab=tools" },
        ],
      },
      {
        title: "Ads & Tracking",
        url: "/marketing/tracking",
        icon: TrendingUp,
        adminOnly: true,
        section: "seo",
        description: "Analytics, Meta CAPI & conversion pixels",
        children: [
          { title: "Meta Pixel & CAPI",      url: "/marketing/tracking?tab=facebook" },
          { title: "Google Ads & GTM",       url: "/marketing/tracking?tab=google-ads" },
          { title: "Search Console",         url: "/marketing/tracking?tab=search-console" },
          { title: "Ad Networks & Pixels",   url: "/marketing/tracking?tab=ad-setup" },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // EMAILS & MARKETING  /email
  // ─────────────────────────────────────────────────────────────────
  {
    label: "Emails & Marketing",
    items: [
      {
        title: "Email Dashboard",
        url: "/email",
        icon: LayoutDashboard,
        section: "customers",
        description: "Reach, deliverability & campaigns overview",
      },
      {
        title: "Audience & Subscribers",
        url: "/email/subscribers",
        icon: Users,
        section: "customers",
        description: "Unified subscribers, segments & Google Sheets 2-way sync",
        keywords: "audience subscribers emails contacts sheets sync newsletter lists",
      },
      {
        title: "Campaigns",
        url: "/email/campaigns",
        icon: Send,
        section: "customers",
        description: "Bulk email blasts",
      },
      {
        title: "Templates",
        url: "/email/templates",
        icon: FileText,
        section: "customers",
        description: "Reusable designs",
      },
      {
        title: "Automations",
        url: "/email/automations",
        icon: Workflow,
        section: "customers",
        description: "Event-driven emails",
      },
      {
        title: "Announcements & Modals",
        url: "/marketing/announcements",
        icon: Megaphone,
        section: "customers",
        description: "Sitewide announcements, marquee tickers & promotional modals",
        children: [
          { title: "Announcements",        url: "/marketing/announcements" },
          { title: "Promotional Modals",   url: "/marketing/popups" },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // AFFILIATE  /affiliate
  // ─────────────────────────────────────────────────────────────────
  {
    label: "Affiliate Hub",
    items: [
      { title: "Dashboard",      url: "/affiliate?tab=dashboard",    icon: LayoutDashboard, section: "affiliate", adminOnly: true, keywords: "affiliate overview stats" },
      { title: "Applications",   url: "/affiliate?tab=applications", icon: Clock,           section: "affiliate", adminOnly: true, keywords: "affiliate apply pending approve" },
      { title: "Affiliates",     url: "/affiliate?tab=affiliates",   icon: Users,           section: "affiliate", adminOnly: true, keywords: "affiliate partners members list" },
      { title: "Commissions",    url: "/affiliate?tab=commissions",  icon: DollarSign,      section: "affiliate", adminOnly: true, keywords: "affiliate commission earnings referral" },
      { title: "Payouts",        url: "/affiliate?tab=payouts",      icon: Wallet,          section: "affiliate", adminOnly: true, keywords: "affiliate payout withdraw payment" },
      { title: "Products",       url: "/affiliate?tab=products",     icon: Package,         section: "affiliate", adminOnly: true, keywords: "affiliate products catalog enroll" },
      { title: "Category Rates", url: "/affiliate?tab=categories",   icon: Percent,         section: "affiliate", adminOnly: true, keywords: "affiliate category rate commission percent" },
      { title: "Creatives",      url: "/affiliate?tab=creatives",    icon: Image,           section: "affiliate", adminOnly: true, keywords: "affiliate banner creative assets" },
      { title: "Settings",       url: "/affiliate?tab=settings",     icon: Settings,        section: "affiliate", adminOnly: true, keywords: "affiliate settings config program" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // PUBLIC CONTENTS & UI  /brand — public pages & interface builders
  // ─────────────────────────────────────────────────────────────────
  {
    label: "Public Contents & UI",
    items: [
      {
        title: "Public UI Dashboard",
        url: "/brand",
        icon: LayoutDashboard,
        section: "storefront_ui",
        description: "Public pages, storefront, explore feed & mobile interface hub",
      },
      {
        title: "Storefront UI",
        url: "/brand/home",
        icon: ShoppingCart,
        adminOnly: true,
        section: "storefront_ui",
        description: "Storefront home builder, section ordering, banners & footer",
        children: [
          { title: "Home Dashboard",     url: "/brand/home?tab=dashboard" },
          { title: "Home Analytics",     url: "/brand/home?tab=analytics" },
          { title: "Category & Section Layout", url: "/brand/home?tab=category-displays" },
          { title: "Marquee Strip Ticker", url: "/brand/home?tab=marquee" },
          { title: "Campaigns & Drops",  url: "/brand/home?tab=campaigns" },
          { title: "Editorial & Social", url: "/brand/home?tab=editorial" },
          { title: "Appearance & Theme", url: "/brand/home?tab=layout" },
          { title: "Storefront Showcase", url: "/sales/showcase" },
          { title: "Banners & Promos",   url: "/brand/banners" },
          { title: "Footer Config",      url: "/brand/footer" },
        ],
      },
      {
        title: "BrandHome UI",
        url: "/brand/landing",
        icon: Globe,
        adminOnly: true,
        section: "portfolio",
        description: "BrandHome page builder and brand site controls",
        children: [
          { title: "Landing Page", url: "/brand/landing" },
          { title: "News & Articles", url: "/brand/news" },
          { title: "Docs & Legal", url: "/brand/docs" },
          { title: "Order Tracking", url: "/brand/track" },
          { title: "Product Scanner", url: "/brand/scanner-info" },
        ],
      },
      {
        title: "CMS & Legal Pages",
        url: "/brand/cms-pages",
        icon: FileText,
        adminOnly: true,
        section: "storefront_ui",
        description: "Visual block builder, terms, privacy, return policy & custom pages",
        keywords: "cms pages privacy terms refund legal policies builder markdown",
      },
      {
        title: "Mobile UI",
        url: "/brand/mobile-ui",
        icon: Smartphone,
        adminOnly: true,
        section: "storefront_ui",
        description: "Mobile-only widgets & mobile layout controls",
      },
      {
        title: "Explore / Social UI",
        url: "/brand/explore-ui",
        icon: Compass,
        adminOnly: true,
        section: "storefront_ui",
        description: "Explore discovery feed, universes, connect grid & inquiries studio",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // BACKEND  /backend — API & system controls
  // ─────────────────────────────────────────────────────────────────
  {
    label: "Backend & System",
    items: [
      {
        title: "System Dashboard",
        url: "/system",
        icon: LayoutDashboard,
        section: "settings",
        description: "Health, cron & alerts overview",
      },
      {
        title: "DB Health",
        url: "/system/db-health",
        icon: Activity,
        section: "settings",
        adminOnly: true,
        description: "Disk IO, sequential scans, cron runs & alerts",
        children: [
          { title: "Table Stats & IO",      url: "/system/db-health?tab=tables" },
          { title: "Cron Schedules & Runs", url: "/system/db-health?tab=cron" },
          { title: "System Alerts & Logs",  url: "/system/db-health?tab=alerts" },
        ],
      },
      {
        title: "Debug",
        url: "/system/debug",
        icon: Bug,
        adminOnly: true,
        section: "settings",
        description: "Developer tools & network diagnostics",
        children: [
          { title: "Web Push Diagnostics",   url: "/system/debug?tab=push" },
          { title: "Call Signaling (WebRTC)", url: "/system/debug?tab=calls" },
          { title: "Edge Function Probes",    url: "/system/debug?tab=edge" },
          { title: "Realtime WebSockets",     url: "/system/debug?tab=realtime" },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // SETTINGS  /settings — site configuration, branding & integrations
  // ─────────────────────────────────────────────────────────────────
  {
    label: "Settings & AI",
    items: [
      {
        title: "Settings Dashboard",
        url: "/settings-ai",
        icon: LayoutDashboard,
        section: "settings",
        description: "Brand identity, appearance, AI & system overview",
      },
      {
        title: "Branding & Assets",
        url: "/settings-ai/branding",
        icon: Paintbrush,
        adminOnly: true,
        section: "settings",
        description: "Logo, favicon, icons, color tokens & brand voice",
        keywords: "branding logo icon assets favicon tokens colors voice typography",
        children: [
          { title: "Overview",         url: "/settings-ai/branding" },
          { title: "Logo & icon",      url: "/settings-ai/branding?tab=logo" },
          { title: "Shape & effects",  url: "/settings-ai/branding?tab=shape" },
          { title: "Color filter",     url: "/settings-ai/branding?tab=color" },
          { title: "Typography",       url: "/settings-ai/branding?tab=typography" },
          { title: "Brand voice",      url: "/settings-ai/branding?tab=voice" },
          { title: "Site theme",       url: "/settings-ai/branding?tab=theme" },
        ],
      },
      {
        title: "Appearance & Surfaces",
        url: "/settings-ai/appearance",
        icon: Layout,
        adminOnly: true,
        section: "settings",
        description: "Typography pairings, marquee ticker studio, layout & auth styling",
        keywords: "appearance typography layout fonts storefront profile auth signin surfaces",
        children: [
          { title: "Storefront Typography", url: "/settings-ai/appearance?tab=storefront" },
          { title: "Marquee Ticker Studio", url: "/settings-ai/appearance?tab=marquee" },
          { title: "Product Detail Layout", url: "/settings-ai/appearance?tab=product" },
          { title: "Profile Appearance",   url: "/settings-ai/appearance?tab=profile" },
          { title: "Auth Page Styling",    url: "/settings-ai/appearance?tab=auth" },
        ],
      },
      {
        title: "General Settings",
        url: "/settings-ai/general",
        icon: Settings,
        adminOnly: true,
        section: "settings",
        description: "Global preferences, localization, customizer tokens & currency",
        keywords: "general settings preferences customizer currency localization business",
        children: [
          { title: "General & Business", url: "/settings-ai/general?tab=general" },
          { title: "UI Customizer",      url: "/settings-ai/general?tab=customizer" },
          { title: "Currency & Rates",   url: "/settings-ai/general?tab=currency" },
          { title: "Maintenance & State",url: "/settings-ai/general?tab=maintenance" },
        ],
      },
      {
        title: "AI Agent",
        url: "/settings-ai/ai-settings",
        icon: Sparkle,
        section: "ai",
        adminOnly: true,
        description: "AI assistant config",
      },
      {
        title: "Recommendations",
        url: "/settings-ai/recommendations",
        icon: Sparkle,
        section: "ai",
        adminOnly: true,
        description: "Discover engine & AI rerank",
        keywords: "recommendations discover personalization ai rerank",
      },
      {
        title: "WhatsApp Cloud API",
        url: "/settings-ai/whatsapp",
        icon: Smartphone,
        section: "settings",
        adminOnly: true,
        description: "Official Meta WhatsApp Cloud API credentials & notification templates",
        keywords: "whatsapp cloud api meta waba phone templates",
      },
      {
        title: "SMS Gateway",
        url: "/settings-ai/sms",
        icon: MessageSquare,
        section: "settings",
        adminOnly: true,
        description: "BulkSMSBD & Twilio SMS provider configurations",
        keywords: "sms bulksmsbd twilio gateway messages otp",
      },
      {
        title: "Call Center",
        url: "/settings-ai/call-settings",
        icon: Phone,
        section: "settings",
        adminOnly: true,
        description: "Voice / call routing",
      },
      {
        title: "Email Provider (Resend)",
        url: "/settings-ai/email-provider",
        icon: Mail,
        section: "settings",
        adminOnly: true,
        description: "Resend API key, sender identities, webhook events & deliverability stats",
        keywords: "email provider resend smtp sender identity webhook deliverability",
      },
      {
        title: "Telegram Bot Studio",
        url: "/settings-ai/telegram",
        icon: Send,
        section: "settings",
        adminOnly: true,
        description: "Bot credentials, interactive commands, channel routing & broadcast studio",
        keywords: "telegram bot studio chat notifications webhook commands broadcast",
      },
      {
        title: "Payment Gateways",
        url: "/sales/payment-gateways",
        icon: CreditCard,
        section: "settings",
        adminOnly: true,
        description: "MFS personal accounts (bKash, Nagad, Rocket, Upay), COD, Stripe & merchant gateway config",
        keywords: "payments payment gateways bkash nagad rocket upay stripe cod qr code merchant",
      },
      {
        title: "Apps Redirection",
        url: "/settings-ai/redirects",
        icon: ExternalLink,
        section: "settings",
        adminOnly: true,
        description: "Cross-app domain gateway, CTA button destinations, route aliases & UTM tracking",
        keywords: "apps redirection redirects urls domains gateway storefront brandhome explore orderops shop cta utm",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // CORPORATE  /corporate — teams & staff
  // ─────────────────────────────────────────────────────────────────
  {
    label: "Team & Access",
    items: [
      {
        title: "Team Dashboard",
        url: "/team",
        icon: LayoutDashboard,
        section: "employees",
        description: "Employees, roles & audit overview",
      },
      {
        title: "Teams",
        url: "/team/teams",
        icon: Users2,
        section: "employees",
        adminOnly: true,
        description: "Create teams, assign members & section access",
        keywords: "teams groups staff access sections permissions",
      },
      {
        title: "My Team",
        url: "/team/my-team",
        icon: Briefcase,
        description: "View your team membership and section access",
        keywords: "my team membership sections access teammates",
      },
      {
        title: "Employees",
        url: "/team/employees",
        icon: Users,
        section: "employees",
        adminOnly: true,
        description: "Team members, presets & section access",
        keywords: "employees staff team roles access sections permissions",
        children: [
          { title: "All employees", url: "/team/employees?tab=members" },
          { title: "Staff",         url: "/team/staff" },
          { title: "Audit Log",     url: "/team/audit-log" },
        ],
      },
      {
        title: "Access Manager",
        url: "/team/access",
        icon: ShieldCheck,
        section: "employees",
        adminOnly: true,
        description: "Grant / revoke ControlPanel sections & manage role presets",
        keywords: "access sections grants revoke permissions presets matrix",
      },
    ],
  },
];

export const allAdminItems: AdminNavItem[] = adminNav.flatMap((s) =>
  s.items.map((i) => ({ ...i, keywords: `${i.keywords ?? ""} ${s.label}`.trim() }))
);

export const allAdminDestinations: Array<{
  title: string;
  url: string;
  section: string;
  parent?: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  description?: string;
  keywords?: string;
}> = adminNav.flatMap((s) =>
  s.items.flatMap((i) => [
    {
      title: i.title,
      url: i.url,
      section: s.label,
      icon: i.icon,
      adminOnly: i.adminOnly,
      description: i.description,
      keywords: i.keywords,
    },
    ...(i.children ?? []).map((c) => ({
      title: c.title,
      url: c.url,
      section: s.label,
      parent: i.title,
      icon: i.icon,
      adminOnly: i.adminOnly,
      description: c.description,
      keywords: c.keywords,
    })),
  ])
);

export const mobilePrimary: Array<{ title: string; url: string; icon: LucideIcon; section?: string }> = [
  { title: "Panel",     url: "/",                          icon: LayoutDashboard },
  { title: "Sales",     url: "/sales",                     icon: ShoppingCart,    section: "orders" },
  { title: "Products",  url: "/sales/products-hub",        icon: Package,         section: "products" },
  { title: "Customers", url: "/sales/customers-hub",       icon: Users,           section: "customers" },
  { title: "Support",   url: "/sales/support",             icon: Headphones,      section: "customers" },
  { title: "Settings",  url: "/settings-ai",                  icon: Settings,        section: "settings" },
];
// code:4ce0
