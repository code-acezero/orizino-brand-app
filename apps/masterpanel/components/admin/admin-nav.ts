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
  Key,
  KeyRound,
  Bot,
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

export interface AdminNavChild {
  title: string;
  url: string;
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
  // Overview  (shown at /)
  // ─────────────────────────────────────────────────────────────────
  {
    label: "Overview",
    items: [
      {
        title: "Master Controls",
        url: "/",
        icon: LayoutGrid,
        description: "Section navigator & KPIs",
        children: [
          { title: "Overview",                     url: "/" },
          { title: "Customer & Sales",             url: "/sales" },
          { title: "Products, Shipping & Offers",   url: "/sales/products-management?tab=products" },
          { title: "Marketing",           url: "/marketing" },
          { title: "Email",               url: "/email" },
          { title: "Affiliate",           url: "/affiliate" },
          { title: "Public Contents & UI",url: "/brand" },
          { title: "Backend",             url: "/system" },
          { title: "Settings",            url: "/settings-ai" },
          { title: "Corporate",           url: "/team" },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // 1. Customer & Sales — sales management, orders & support
  // ─────────────────────────────────────────────────────────────────
  {
    label: "Customer & Sales",
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
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // 2. Products, Shipping & Offers — catalogue, stock, shipping & offers
  // ─────────────────────────────────────────────────────────────────
  {
    label: "Products, Shipping & Offers",
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
        title: "Customer Reviews",
        url: "/sales/reviews",
        icon: Star,
        section: "products",
        description: "Product star ratings, customer feedback & moderation",
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
        icon: Receipt,
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
  // SEO  /seo — marketing & search
  // ─────────────────────────────────────────────────────────────────
  {
    label: "Marketing Management",
    items: [
      {
        title: "Marketing Dashboard",
        url: "/marketing",
        icon: LayoutDashboard,
        section: "seo",
        description: "Overview of SEO, tracking & announcements",
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
          { title: "Dashboard",           url: "/marketing/seo?tab=dashboard" },
          { title: "Pages",               url: "/marketing/seo?tab=pages" },
          { title: "Audit",               url: "/marketing/seo?tab=audit" },
          { title: "Global & Verification", url: "/marketing/seo?tab=global" },
          { title: "Schema library",      url: "/marketing/seo?tab=schema" },
          { title: "Tools",               url: "/marketing/seo?tab=tools" },
        ],
      },
      {
        title: "Ads & Tracking",
        url: "/marketing/tracking",
        icon: TrendingUp,
        adminOnly: true,
        section: "seo",
        description: "Analytics & pixels",
        children: [
          { title: "Facebook Pixel",  url: "/marketing/tracking?tab=facebook" },
          { title: "Google Ads",      url: "/marketing/tracking?tab=google-ads" },
          { title: "Search Console",  url: "/marketing/tracking?tab=search-console" },
          { title: "Ad Setup",        url: "/marketing/tracking?tab=ad-setup" },
        ],
      },
      {
        title: "Announcements",
        url: "/marketing/announcements",
        icon: Megaphone,
        section: "customers",
        description: "Site-wide banners",
        children: [
          { title: "Announcements", url: "/marketing/announcements?tab=announcements" },
          { title: "Popups",        url: "/marketing/announcements?tab=popups" },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // EMAIL  /email
  // ─────────────────────────────────────────────────────────────────
  {
    label: "Email Marketing",
    items: [
      {
        title: "Email Dashboard",
        url: "/email",
        icon: LayoutDashboard,
        section: "customers",
        description: "Reach, deliverability & campaigns overview",
      },
      {
        title: "Email Provider",
        url: "/email/provider",
        icon: KeyRound,
        adminOnly: true,
        section: "customers",
        description: "API keys, webhooks, sender identity",
        keywords: "resend api key webhook smtp",
        children: [
          { title: "Sender identity", url: "/email/provider?tab=sender" },
          { title: "Senders",         url: "/email/provider?tab=senders" },
          { title: "API & webhooks",  url: "/email/provider?tab=keys" },
          { title: "Send test",       url: "/email/provider?tab=test" },
          { title: "Stats",           url: "/email/provider?tab=stats" },
          { title: "Dispatch log",    url: "/email/provider?tab=log" },
        ],
      },
      {
        title: "Subscribers",
        url: "/email/subscribers",
        icon: AtSign,
        section: "customers",
        description: "Newsletter signups",
      },
      {
        title: "Campaigns",
        url: "/email/campaigns",
        icon: Send,
        section: "customers",
        description: "Bulk email blasts",
        children: [
          { title: "HTML",    url: "/email/campaigns?panel=html" },
          { title: "Preview", url: "/email/campaigns?panel=preview" },
        ],
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
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // AFFILIATE  /affiliate
  // ─────────────────────────────────────────────────────────────────
  {
    label: "Affiliate Program",
    items: [
      {
        title: "Affiliate Dashboard",
        url: "/affiliate",
        icon: LayoutDashboard,
        section: "affiliate",
        description: "Partners, clicks & payouts overview",
      },
      {
        title: "Affiliate Hub",
        url: "/affiliate/overview",
        icon: Briefcase,
        section: "affiliate",
        adminOnly: true,
        description: "Partner programs, referral links & commissions",
        keywords: "affiliate referral commission payout marketing hub",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // BRANDCONFIG  /brandconfig — branding & UI
  // ─────────────────────────────────────────────────────────────────
  {
    label: "Public Contents & UI",
    items: [
      // ─────────────────────────────────────────────────────────────
      // APP-WISE REORGANIZED UI SECTIONS
      // ─────────────────────────────────────────────────────────────
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
        title: "Appearance & Typography",
        url: "/brand/appearance",
        icon: Palette,
        adminOnly: true,
        section: "storefront_ui",
        description: "Typography pairings, marquee ticker studio, layout & auth styling",
        children: [
          { title: "Storefront Typography", url: "/brand/appearance?tab=storefront" },
          { title: "Marquee Ticker Studio", url: "/brand/appearance?tab=marquee" },
          { title: "Product Detail Layout", url: "/brand/appearance?tab=product" },
          { title: "Profile Appearance",   url: "/brand/appearance?tab=profile" },
          { title: "Auth Page Styling",    url: "/brand/appearance?tab=auth" },
        ],
      },
      {
        title: "Branding & Assets",
        url: "/brand/branding",
        icon: Paintbrush,
        adminOnly: true,
        section: "storefront_ui",
        description: "Logo, favicon, icons, color tokens & brand voice",
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
        title: "OrderOps UI",
        url: "/brand/mobile-ui?app=orderops",
        icon: AppWindow,
        adminOnly: true,
        section: "storefront_ui",
        description: "OrderOps app interface & scanner controls (Placeholder)",
      },
      {
        title: "Explore / Social UI",
        url: "/brand/explore-ui",
        icon: Compass,
        adminOnly: true,
        section: "storefront_ui",
        description: "Explore feed & social app UI controls (Placeholder)",
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
        description: "Disk IO, seq scans, cron runs & alerts",
        children: [
          { title: "Table stats", url: "/system/db-health?tab=tables" },
          { title: "Cron runs",   url: "/system/db-health?tab=cron" },
          { title: "Alerts",      url: "/system/db-health?tab=alerts" },
        ],
      },
      {
        title: "Debug",
        url: "/system/debug",
        icon: Bug,
        adminOnly: true,
        section: "settings",
        description: "Developer tools",
        children: [
          { title: "Push",           url: "/system/debug?tab=push" },
          { title: "Calls",          url: "/system/debug?tab=calls" },
          { title: "Edge functions", url: "/system/debug?tab=edge" },
          { title: "Realtime",       url: "/system/debug?tab=realtime" },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // SETTINGS  /settings — site configuration
  // ─────────────────────────────────────────────────────────────────
  {
    label: "Settings & AI",
    items: [
      {
        title: "Dashboard",
        url: "/settings-ai",
        icon: LayoutDashboard,
        section: "settings",
        description: "Brand identity, appearance, AI & system overview",
      },
      {
        title: "Branding",
        url: "/brand/branding",
        icon: Palette,
        adminOnly: true,
        section: "storefront_ui",
        description: "Theme & brand identity",
        children: [
          { title: "Overview",         url: "/brand/branding" },
          { title: "Logo & icon",      url: "/brand/branding?tab=logo" },
          { title: "Shape & effects",  url: "/brand/branding?tab=shape" },
          { title: "Color filter",     url: "/brand/branding?tab=color" },
          { title: "Typography",       url: "/brand/branding?tab=typography" },
          { title: "Brand voice",      url: "/brand/branding?tab=voice" },
          { title: "Site theme",       url: "/brand/branding?tab=theme" },
        ],
      },
      {
        title: "Appearance",
        url: "/brand/appearance",
        icon: Layout,
        adminOnly: true,
        section: "storefront_ui",
        description: "Typography & layout for every surface",
        keywords: "appearance typography layout fonts storefront profile auth signin",
        children: [
          { title: "Storefront",           url: "/brand/appearance?tab=storefront" },
          { title: "Product details",      url: "/brand/appearance?tab=product" },
          { title: "Profile & Settings",   url: "/brand/appearance?tab=profile" },
          { title: "Sign-in / Sign-up",    url: "/brand/appearance?tab=auth" },
        ],
      },
      {
        title: "General Settings",
        url: "/settings-ai/general",
        icon: Settings,
        adminOnly: true,
        section: "settings",
        description: "Global preferences",
        children: [
          { title: "General",    url: "/settings-ai/general?tab=general" },
          {
            title: "Customizer",
            url: "/settings-ai/general?tab=customizer",
            children: [
              { title: "Type",   url: "/settings-ai/general?tab=customizer&panel=typography" },
              { title: "Space",  url: "/settings-ai/general?tab=customizer&panel=spacing" },
              { title: "Nav",    url: "/settings-ai/general?tab=customizer&panel=navbar" },
              { title: "UI",     url: "/settings-ai/general?tab=customizer&panel=components" },
              { title: "Motion", url: "/settings-ai/general?tab=customizer&panel=animations" },
            ],
          },
          { title: "Currency",   url: "/settings-ai/general?tab=currency" },
        ],
      },
      {
        title: "AI Agent",
        url: "/settings-ai/ai-settings",
        icon: Bot,
        section: "ai",
        adminOnly: true,
        description: "AI assistant config",
      },
      {
        title: "Recommendations",
        url: "/settings-ai/recommendations",
        icon: Wand2,
        section: "ai",
        adminOnly: true,
        description: "Discover engine & AI rerank",
        keywords: "recommendations discover personalization ai rerank",
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
        title: "Telegram",
        url: "/settings-ai/telegram",
        icon: Send,
        section: "settings",
        adminOnly: true,
        description: "Bot chats & notification routing",
        keywords: "telegram bot chat notifications",
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
        title: "Redirects",
        url: "/settings-ai/redirects",
        icon: ExternalLink,
        section: "settings",
        adminOnly: true,
        description: "Cross-app URLs and CTA targets (Shop, Start Shopping, Explore Categories)",
        keywords: "redirects urls links storefront shop back to shop start shopping explore categories cta",
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

export { Eye, BarChart3, Search, Type, Paintbrush, Layout, Receipt, Mail, Send, AtSign, ShieldCheck, ClipboardList, Briefcase };
// code:4ce0
