"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Globe,
  Layout,
  Smartphone,
  AppWindow,
  Compass,
  FileText,
  Megaphone,
  Presentation,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Eye,
  LayoutGrid,
  Newspaper,
  BookOpen,
  MapPin,
  Layers,
  ShoppingBag,
  Sliders,
  MoveHorizontal,
  Inbox,
  QrCode,
  Truck,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { useKpiCount } from "@/components/admin/dashboards/useKpiCount";
import { cn } from "@/lib/utils";

type SurfaceKey = "storefront" | "explore" | "brandhome" | "mobile" | "orderops";

interface SurfaceInfo {
  id: SurfaceKey;
  title: string;
  badge: string;
  badgeColor: string;
  icon: React.ElementType;
  description: string;
  editUrl: string;
  previewUrl: string;
  metrics: { label: string; value: string; status?: string }[];
  highlightFeatures: string[];
}

const SURFACES: SurfaceInfo[] = [
  {
    id: "storefront",
    title: "Storefront Home",
    badge: "Primary E-Commerce",
    badgeColor: "bg-primary/10 text-primary border-primary/20",
    icon: ShoppingBag,
    description: "Main customer shopping homepage featuring hero showcases, category mosaic grids, and marquee ticker strips.",
    editUrl: "/brand/home",
    previewUrl: "http://localhost:3000/",
    metrics: [
      { label: "Homepage Hero", value: "Showcase Carousel" },
      { label: "Ticker Strip", value: "Live & Animated" },
      { label: "Category Grid", value: "Mosaic & Feeds" },
      { label: "Footer Layout", value: "Multicolumn + Legal" },
    ],
    highlightFeatures: [
      "Custom section ordering & drag-and-drop hierarchy",
      "Dynamic marquee announcement bar with custom speed",
      "Curated drops, new arrivals & seasonal editorial blocks",
    ],
  },
  {
    id: "explore",
    title: "Explore / Social Studio",
    badge: "Discovery & Feed",
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    icon: Compass,
    description: "Interactive brand universe feed, social connect grid, artisan profile stories, and customer inquiry hub.",
    editUrl: "/brand/explore-ui",
    previewUrl: "http://localhost:3000/explore",
    metrics: [
      { label: "Discovery Feed", value: "Anime, Cinema & Gaming" },
      { label: "Connect Grid", value: "Social & Community" },
      { label: "Artisan Bio", value: "Philosophy & Lore" },
      { label: "Inquiries Pipeline", value: "Active CRM" },
    ],
    highlightFeatures: [
      "Multi-universe curated feeds with expandable lore descriptions",
      "Interactive social media channels with direct link tracking",
      "Live inquiry capture & contact form integration",
    ],
  },
  {
    id: "brandhome",
    title: "BrandHome Portal",
    badge: "Company Experience",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    icon: Globe,
    description: "High-impact storytelling landing page, brand manifesto, digital newsroom, documentation, and product scanner.",
    editUrl: "/brand/landing",
    previewUrl: "http://localhost:3003/",
    metrics: [
      { label: "Story Manifesto", value: "Luxury Streetwear" },
      { label: "Digital Newsroom", value: "Articles & Drops" },
      { label: "Knowledge Docs", value: "Care & Sizing" },
      { label: "Order Tracking", value: "Live Lookup" },
    ],
    highlightFeatures: [
      "Brand manifesto hero with interactive video/image background",
      "Official press releases, product launch stories & newsroom",
      "Direct authentication & batch barcode QR scanner info",
    ],
  },
  {
    id: "mobile",
    title: "Mobile App UI",
    badge: "Responsive Mobile",
    badgeColor: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    icon: Smartphone,
    description: "Mobile-first navigation bar, quick floating action buttons, sticky search header, and mobile app drawer.",
    editUrl: "/brand/mobile-ui",
    previewUrl: "http://localhost:3000/",
    metrics: [
      { label: "Bottom Nav Bar", value: "Sticky 5-Tab Bar" },
      { label: "Floating Buttons", value: "WhatsApp / Chat" },
      { label: "Mobile Drawer", value: "Instant Categories" },
      { label: "Touch Gestures", value: "Swipe Optimized" },
    ],
    highlightFeatures: [
      "Customizable mobile navigation bar with active icon states",
      "Floating action buttons for fast checkout & support chat",
      "Lightweight responsive touch menus for seamless mobile shopping",
    ],
  },
  {
    id: "orderops",
    title: "OrderOps Terminal",
    badge: "Fulfillment UI",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: AppWindow,
    description: "Warehouse fulfillment terminal, live barcode scanning UI, courier batch dispatching, and thermal label generator.",
    editUrl: "/brand/orderops",
    previewUrl: "http://localhost:3004/",
    metrics: [
      { label: "Terminal Display", value: "High Contrast Dark" },
      { label: "Barcode Scanner", value: "Camera & USB Scan" },
      { label: "Courier Dispatch", value: "Steadfast & Pathao" },
      { label: "Thermal Slips", value: "4x6 Inch Ready" },
    ],
    highlightFeatures: [
      "Instant camera & hardware barcode scanner input processing",
      "Automated slip printing and parcel weight verification",
      "Live order status update to customer tracking timeline",
    ],
  },
];

export default function BrandDashboard() {
  const [activeSurface, setActiveSurface] = useState<SurfaceKey>("storefront");

  const banners = useKpiCount(["banners", "active"], "banners", (q) => q.eq("is_active", true));
  const showcase = useKpiCount(["showcase"], "showcase_slides", (q) => q.eq("is_active", true));
  const cms = useKpiCount(["cms"], "cms_pages", (q) => q.eq("published", true));

  // Query inquiries count
  const { data: inquiriesCount = 0 } = useQuery({
    queryKey: ["dashboard-inquiries-count"],
    queryFn: async () => {
      try {
        const { count, error } = await (supabase as any)
          .from("inquiries")
          .select("*", { count: "exact", head: true });
        return count ?? 0;
      } catch {
        return 0;
      }
    },
    staleTime: 60 * 1000,
  });

  const currentSurface = SURFACES.find((s) => s.id === activeSurface) || SURFACES[0];
  const SurfaceIcon = currentSurface.icon;

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* ── HEADER BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-background p-6 md:p-8 shadow-sm">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/20 text-primary shadow-inner">
                <Globe className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="rounded-full bg-primary/10 text-primary border-primary/20 text-xs px-3 py-1 font-bold">
                Public Contents &amp; Surface Experiences
              </Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-black tracking-tight text-foreground">
              Public Contents &amp; UI Dashboard
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Command center for customer-facing storefront surfaces, BrandHome landing portals, Explore discovery feeds, mobile layout widgets, CMS policies, and live OrderOps fulfillment screens.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <NavLink to="/brand/home">
              <Button size="sm" className="h-9 rounded-xl font-bold gap-2 text-xs">
                <ShoppingBag className="w-3.5 h-3.5" /> Storefront UI
              </Button>
            </NavLink>
            <NavLink to="/brand/explore-ui">
              <Button size="sm" variant="outline" className="h-9 rounded-xl font-semibold gap-2 text-xs border-border/60">
                <Compass className="w-3.5 h-3.5 text-primary" /> Explore Studio
              </Button>
            </NavLink>
            <NavLink to="/brand/landing">
              <Button size="sm" variant="outline" className="h-9 rounded-xl font-semibold gap-2 text-xs border-border/60">
                <Globe className="w-3.5 h-3.5 text-primary" /> BrandHome UI
              </Button>
            </NavLink>
          </div>
        </div>
      </div>

      {/* ── 4 EQUAL SYMMETRICAL TELEMETRY KPI CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Promo Banners */}
        <NavLink to="/brand/banners" className="group">
          <Card className="border border-border/50 bg-card/60 backdrop-blur-xl shadow-xs hover:border-primary/40 transition-all h-full">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Promo Banners</p>
                <p className="text-2xl font-display font-black text-foreground group-hover:text-primary transition-colors">
                  {banners.isLoading ? "…" : banners.data ?? 0}
                </p>
                <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Live on Storefront
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 shrink-0">
                <Megaphone className="w-5.5 h-5.5" />
              </div>
            </CardContent>
          </Card>
        </NavLink>

        {/* Showcase Slides */}
        <NavLink to="/sales/showcase" className="group">
          <Card className="border border-border/50 bg-card/60 backdrop-blur-xl shadow-xs hover:border-primary/40 transition-all h-full">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Hero Showcase</p>
                <p className="text-2xl font-display font-black text-foreground group-hover:text-primary transition-colors">
                  {showcase.isLoading ? "…" : showcase.data ?? 0}
                </p>
                <p className="text-[11px] text-purple-400 font-medium flex items-center gap-1">
                  <Presentation className="w-3 h-3" /> Carousel Slides
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 shrink-0">
                <Presentation className="w-5.5 h-5.5" />
              </div>
            </CardContent>
          </Card>
        </NavLink>

        {/* Published CMS Pages */}
        <NavLink to="/brand/cms-pages" className="group">
          <Card className="border border-border/50 bg-card/60 backdrop-blur-xl shadow-xs hover:border-primary/40 transition-all h-full">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">CMS &amp; Legal</p>
                <p className="text-2xl font-display font-black text-foreground group-hover:text-primary transition-colors">
                  {cms.isLoading ? "…" : cms.data ?? 0}
                </p>
                <p className="text-[11px] text-sky-400 font-medium flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Published Policies
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400 shrink-0">
                <FileText className="w-5.5 h-5.5" />
              </div>
            </CardContent>
          </Card>
        </NavLink>

        {/* Explore Inquiries */}
        <NavLink to="/brand/explore-ui" className="group">
          <Card className="border border-border/50 bg-card/60 backdrop-blur-xl shadow-xs hover:border-primary/40 transition-all h-full">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Explore Inquiries</p>
                <p className="text-2xl font-display font-black text-foreground group-hover:text-primary transition-colors">
                  {inquiriesCount}
                </p>
                <p className="text-[11px] text-cyan-400 font-medium flex items-center gap-1">
                  <Inbox className="w-3 h-3" /> Direct Messages
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 shrink-0">
                <Compass className="w-5.5 h-5.5" />
              </div>
            </CardContent>
          </Card>
        </NavLink>
      </div>

      {/* ── MAIN 2-COLUMN SECTION: SURFACE PREVIEWER + INTERFACE BUILDERS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols): Interactive Public Surface Previewer & Simulator */}
        <Card className="lg:col-span-5 border border-border/60 bg-card/60 backdrop-blur-xl shadow-sm flex flex-col justify-between overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                Live Surface Simulator &amp; Status
              </CardTitle>
              <Badge variant="outline" className={cn("text-[10px] font-semibold", currentSurface.badgeColor)}>
                {currentSurface.badge}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Select a customer-facing surface to inspect active modules and live telemetry
            </CardDescription>

            {/* Surface Selector Tabs */}
            <div className="grid grid-cols-5 gap-1 pt-2">
              {SURFACES.map((s) => {
                const active = activeSurface === s.id;
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSurface(s.id)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-[10px] font-semibold transition-all cursor-pointer",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary/20 text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate w-full text-center">{s.title.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4 flex-1 flex flex-col justify-between">
            {/* Active Surface Detail Card */}
            <div className="p-4 rounded-2xl bg-secondary/15 border border-border/50 space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
                  <SurfaceIcon className="w-5 h-5" />
                </div>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    {currentSurface.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {currentSurface.description}
                  </p>
                </div>
              </div>

              {/* Surface Telemetry Grid */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {currentSurface.metrics.map((m) => (
                  <div key={m.label} className="p-2.5 rounded-xl bg-card border border-border/40">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
                    <p className="text-xs font-bold text-foreground mt-0.5 truncate">{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Feature Highlights */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active Capabilities</p>
                <div className="space-y-1">
                  {currentSurface.highlightFeatures.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Action CTAs */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <NavLink to={currentSurface.editUrl} className="w-full">
                <Button className="w-full h-9 rounded-xl text-xs font-bold gap-2">
                  <Sliders className="w-3.5 h-3.5" /> Edit Surface UI
                </Button>
              </NavLink>
              <a
                href={currentSurface.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button variant="outline" className="w-full h-9 rounded-xl text-xs font-semibold gap-2 border-border/60">
                  <ExternalLink className="w-3.5 h-3.5 text-primary" /> View Live
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Right Column (7 cols): Public Interface Builders & Content Hubs */}
        <div className="lg:col-span-7 space-y-6">
          {/* Module 1: Core Interface Builders (6-Grid) */}
          <Card className="border border-border/60 bg-card/60 backdrop-blur-xl shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                Public Interface Builders
              </CardTitle>
              <CardDescription className="text-xs">Visual block editors, mobile navigation, and interactive web layouts</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  title: "Storefront UI Builder",
                  sub: "Section order, banners, marquee & footer",
                  icon: ShoppingBag,
                  color: "text-pink-400 bg-pink-500/10 border-pink-500/20",
                  href: "/brand/home",
                },
                {
                  title: "BrandHome Landing",
                  sub: "Story manifesto, vision & company page",
                  icon: Globe,
                  color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
                  href: "/brand/landing",
                },
                {
                  title: "Explore & Social Studio",
                  sub: "Discovery feeds, universes & inquiries",
                  icon: Compass,
                  color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
                  href: "/brand/explore-ui",
                },
                {
                  title: "CMS & Legal Pages",
                  sub: "Terms, privacy, return policy & pages",
                  icon: FileText,
                  color: "text-lime-400 bg-lime-500/10 border-lime-500/20",
                  href: "/brand/cms-pages",
                },
                {
                  title: "Mobile UI & Widgets",
                  sub: "Sticky bottom navigation & touch menus",
                  icon: Smartphone,
                  color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
                  href: "/brand/mobile-ui",
                },
                {
                  title: "OrderOps Fulfillment UI",
                  sub: "Live barcode terminal & courier dispatch",
                  icon: AppWindow,
                  color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                  href: "/brand/orderops",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink key={item.title + item.href} to={item.href} className="group">
                    <div className="flex items-start gap-3 p-3 rounded-2xl border border-border/50 bg-secondary/10 hover:bg-secondary/30 hover:border-primary/40 transition-all duration-200 h-full">
                      <div className={cn("p-2 rounded-xl border shrink-0", item.color)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                            {item.title}
                          </h4>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{item.sub}</p>
                      </div>
                    </div>
                  </NavLink>
                );
              })}
            </CardContent>
          </Card>

          {/* Module 2: Public Media & Editorial Content Hubs (4-Grid) */}
          <Card className="border border-border/60 bg-card/60 backdrop-blur-xl shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-primary" />
                Editorial &amp; Public Information Hubs
              </CardTitle>
              <CardDescription className="text-xs">Press articles, customer sizing docs, order tracking &amp; promo banners</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  title: "Promotional Banners",
                  sub: "Top announcement bar & hero promotions",
                  icon: Megaphone,
                  color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
                  href: "/brand/banners",
                  badge: `${banners.data ?? 0} Live`,
                },
                {
                  title: "Newsroom & Articles",
                  sub: "Official press releases & brand stories",
                  icon: Newspaper,
                  color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
                  href: "/brand/news",
                },
                {
                  title: "Docs & Sizing Guides",
                  sub: "Public documentation, care & FAQ",
                  icon: BookOpen,
                  color: "text-teal-400 bg-teal-500/10 border-teal-500/20",
                  href: "/brand/docs",
                },
                {
                  title: "Order Tracking Portal",
                  sub: "Customer delivery timeline & lookup",
                  icon: Truck,
                  color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                  href: "/brand/track",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink key={item.title + item.href} to={item.href} className="group">
                    <div className="flex items-start gap-3 p-3 rounded-2xl border border-border/50 bg-secondary/10 hover:bg-secondary/30 hover:border-primary/40 transition-all duration-200 h-full">
                      <div className={cn("p-2 rounded-xl border shrink-0", item.color)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                            {item.title}
                          </h4>
                          {item.badge ? (
                            <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                              {item.badge}
                            </Badge>
                          ) : (
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{item.sub}</p>
                      </div>
                    </div>
                  </NavLink>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
