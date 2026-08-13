"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Palette,
  Layout,
  Image,
  Layers,
  Home,
  Globe,
  FileText,
  Smartphone,
  CheckCircle2,
  Sliders,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  Eye,
  Paintbrush,
  Boxes,
  LayoutTemplate,
  PanelBottom,
  Megaphone,
  Presentation,
  Rocket,
  LayoutGrid,
  Type,
  Search,
} from "lucide-react";
import { BrandImage, type LogoFilter } from "@/lib/brand-image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { useKpiCount } from "@/components/admin/dashboards/useKpiCount";
import { cn } from "@/lib/utils";

export default function BrandDashboard() {
  const banners = useKpiCount(["banners", "active"], "banners", (q) => q.eq("is_active", true));
  const showcase = useKpiCount(["showcase"], "showcase_slides", (q) => q.eq("is_active", true));
  const cms = useKpiCount(["cms"], "cms_pages", (q) => q.eq("published", true));

  // Query site branding settings for live brand telemetry card
  const { data: brandSettings, isLoading: isBrandLoading } = useQuery({
    queryKey: ["brand-dashboard-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", [
          "site_name",
          "logo_url",
          "site_icon_url",
          "site_theme",
          "site_mode",
          "title_font",
          "brand_suffix",
          "site_description",
          "logo_color_filter",
          "logo_tint_color",
        ]);
      const map: Record<string, any> = {};
      data?.forEach((s) => {
        const val: any = s.value;
        map[s.key] = typeof val === "object" && val !== null ? val.value ?? val : val;
      });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  const siteName = (brandSettings?.site_name as string) || "ORIZINO";
  const logoUrl = (brandSettings?.logo_url as string) || "";
  const siteIconUrl = (brandSettings?.site_icon_url as string) || "";
  const logoFilter = (brandSettings?.logo_color_filter as LogoFilter) || "none";
  const logoTint = (brandSettings?.logo_tint_color as string) || "#ffffff";
  const titleFont = (brandSettings?.title_font as string) || "Inter";
  const siteTheme = (brandSettings?.site_theme as string) || "default";
  const siteMode = (brandSettings?.site_mode as string) || "dark";
  const siteDescription = (brandSettings?.site_description as string) || "Luxury Storefront & E-commerce Brand Experience";

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner & Quick Actions */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-background p-6 md:p-8 shadow-xl">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/20 text-primary shadow-inner">
                <Palette className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="rounded-full bg-primary/10 text-primary border-primary/20 text-xs px-3 py-1 font-bold">
                Storefront Identity Control Center
              </Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-black tracking-tight text-foreground">
              Brand &amp; Experience Dashboard
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Manage your visual brand identity, per-app themes, promotional hero banners, homepage carousels, and storefront surface layouts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <NavLink to="/brand/branding">
              <Button size="sm" className="h-10 rounded-xl font-bold gap-2 shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground">
                <Paintbrush className="w-4 h-4" />
                Branding Hub
              </Button>
            </NavLink>
            <NavLink to="/brand/home">
              <Button size="sm" variant="outline" className="h-10 rounded-xl font-semibold gap-2 border-border/60 bg-card/60 backdrop-blur-md">
                <Home className="w-4 h-4 text-primary" />
                Home Layout
              </Button>
            </NavLink>
          </div>
        </div>
      </div>

      {/* Symmetrical Top Telemetry KPI Cards (4 Equal Columns) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-stretch">
        {/* Active Banners */}
        <Card className="border border-border/50 bg-card/60 backdrop-blur-xl shadow-md hover:border-primary/40 transition-all flex flex-col justify-between">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Banners</p>
              <p className="text-2xl font-display font-black text-foreground">
                {banners.isLoading ? "…" : banners.data ?? 0}
              </p>
              <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Live on Storefront
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
              <Megaphone className="w-5.5 h-5.5" />
            </div>
          </CardContent>
        </Card>

        {/* Showcase Slides */}
        <Card className="border border-border/50 bg-card/60 backdrop-blur-xl shadow-md hover:border-primary/40 transition-all flex flex-col justify-between">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Showcase Slides</p>
              <p className="text-2xl font-display font-black text-foreground">
                {showcase.isLoading ? "…" : showcase.data ?? 0}
              </p>
              <p className="text-[11px] text-primary font-medium flex items-center gap-1">
                <Image className="w-3 h-3" /> Hero Carousel
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400">
              <Presentation className="w-5.5 h-5.5" />
            </div>
          </CardContent>
        </Card>

        {/* Published CMS Pages */}
        <Card className="border border-border/50 bg-card/60 backdrop-blur-xl shadow-md hover:border-primary/40 transition-all flex flex-col justify-between">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CMS Pages</p>
              <p className="text-2xl font-display font-black text-foreground">
                {cms.isLoading ? "…" : cms.data ?? 0}
              </p>
              <p className="text-[11px] text-sky-400 font-medium flex items-center gap-1">
                <Globe className="w-3 h-3" /> Published &amp; Indexed
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400">
              <FileText className="w-5.5 h-5.5" />
            </div>
          </CardContent>
        </Card>

        {/* Active Theme & Mode */}
        <Card className="border border-border/50 bg-card/60 backdrop-blur-xl shadow-md hover:border-primary/40 transition-all flex flex-col justify-between">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Palette</p>
              <p className="text-lg font-display font-bold text-foreground capitalize truncate max-w-[120px]">
                {siteTheme}
              </p>
              <p className="text-[11px] text-muted-foreground font-medium capitalize">
                Mode: <strong className="text-foreground">{siteMode}</strong>
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-500/10 text-pink-400">
              <Paintbrush className="w-5.5 h-5.5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Parallel Symmetrical Grid: Live Brand Card + Management Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Left Col (1 col): Live Brand Showcase Widget */}
        <div className="h-full">
          <Card className="border border-border/60 bg-card/60 backdrop-blur-xl shadow-xl overflow-hidden h-full flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  Live Brand Preview
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  Synchronized
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 flex-1 flex flex-col justify-between space-y-6">
              {/* Brand Logo & Wordmark Showcase */}
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-secondary/20 border border-border/50 text-center space-y-3 relative overflow-hidden flex-1">
                <div className="w-20 h-20 rounded-2xl bg-secondary/40 border border-border/60 flex items-center justify-center overflow-hidden shadow-sm">
                  {logoUrl ? (
                    <BrandImage
                      src={logoUrl}
                      alt={siteName}
                      filter={logoFilter}
                      customColor={logoTint}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <span className="text-3xl font-black text-foreground">{siteName.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-display font-black tracking-tight text-foreground" style={{ fontFamily: `'${titleFont}', sans-serif` }}>
                    {siteName}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{siteDescription}</p>
                </div>
              </div>

              {/* Brand Health & Asset Status List */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Brand Asset Telemetry</p>
                <div className="divide-y divide-border/40 rounded-xl border border-border/50 bg-secondary/10 overflow-hidden">
                  <div className="flex items-center justify-between p-3 text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-primary" /> Primary Typography
                    </span>
                    <Badge variant="outline" className="font-mono text-[11px] bg-primary/10 text-primary border-primary/20">
                      {titleFont}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-sky-400" /> Favicon &amp; App Icon
                    </span>
                    <span className="font-semibold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Configured
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Paintbrush className="w-3.5 h-3.5 text-pink-400" /> Theme Palette
                    </span>
                    <span className="font-semibold text-foreground capitalize">{siteTheme} ({siteMode})</span>
                  </div>
                  <div className="flex items-center justify-between p-3 text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Storefront Status
                    </span>
                    <span className="font-semibold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active &amp; Live
                    </span>
                  </div>
                </div>
              </div>

              <NavLink to="/brand/branding" className="block">
                <Button variant="outline" className="w-full h-10 rounded-xl text-xs font-bold gap-2 border-primary/30 text-primary hover:bg-primary/10">
                  <Sliders className="w-3.5 h-3.5" /> Edit Brand Settings
                </Button>
              </NavLink>
            </CardContent>
          </Card>
        </div>

        {/* Right Col (2 cols): Core Symmetrical Brand Management Modules */}
        <div className="lg:col-span-2 space-y-6 flex flex-col justify-between">
          {/* Module 1: Identity & Surface Customization (Symmetrical 6-Grid) */}
          <Card className="border border-border/60 bg-card/60 backdrop-blur-xl shadow-xl flex-1 flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                Identity &amp; Surface Styling
              </CardTitle>
              <CardDescription>Visual branding, per-app overrides, mobile widgets, and layout builders</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  title: "Branding Hub",
                  sub: "Logo, colors, typography & title letter colors",
                  icon: Paintbrush,
                  color: "text-pink-400 bg-pink-500/10 border-pink-500/20",
                  href: "/brand/branding",
                },
                {
                  title: "Per-App Overrides",
                  sub: "Override logo, title & favicon per application",
                  icon: Boxes,
                  color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
                  href: "/brand/per-app",
                },
                {
                  title: "Surface Appearance",
                  sub: "Layout & surface styling options",
                  icon: LayoutTemplate,
                  color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
                  href: "/brand/appearance",
                },
                {
                  title: "Header Navigation",
                  sub: "Header layout, sticky search & navigation bar",
                  icon: Layout,
                  color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
                  href: "/brand/appearance",
                },
                {
                  title: "Mobile UI & Widgets",
                  sub: "Mobile navigation bars, top widgets & FABs",
                  icon: Smartphone,
                  color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
                  href: "/brand/mobile-ui",
                },
                {
                  title: "Footer Builder",
                  sub: "Site-wide footer links, copyright & newsletter",
                  icon: PanelBottom,
                  color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
                  href: "/brand/footer",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink key={item.title + item.href} to={item.href} className="group">
                    <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-border/50 bg-secondary/10 hover:bg-secondary/30 hover:border-primary/40 transition-all duration-200 h-full">
                      <div className={cn("p-2.5 rounded-xl border shrink-0", item.color)}>
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

          {/* Module 2: Content & Storefront Surfaces (Symmetrical 6-Grid) */}
          <Card className="border border-border/60 bg-card/60 backdrop-blur-xl shadow-xl flex-1 flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Storefront Surfaces &amp; Banners
              </CardTitle>
              <CardDescription>Hero banners, homepage carousels, CMS pages, and landing page builder</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  title: "Active Promo Banners",
                  sub: "Hero promo banners & site marquee announcements",
                  icon: Megaphone,
                  color: "text-orange-400 bg-orange-500/10 border-orange-500/20",
                  href: "/brand/banners",
                  badge: `${banners.data ?? 0} Live`,
                },
                {
                  title: "Showcase Slides",
                  sub: "Homepage product showcase carousel",
                  icon: Presentation,
                  color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
                  href: "/sales/showcase",
                  badge: `${showcase.data ?? 0} Slides`,
                },
                {
                  title: "Published CMS Pages",
                  sub: "About, Terms, Privacy & custom marketing pages",
                  icon: FileText,
                  color: "text-lime-400 bg-lime-500/10 border-lime-500/20",
                  href: "/brand/cms-pages",
                  badge: `${cms.data ?? 0} Pages`,
                },
                {
                  title: "SEO & Social Meta",
                  sub: "Meta tags, OpenGraph images & search previews",
                  icon: Search,
                  color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                  href: "/brand/cms-pages",
                },
                {
                  title: "Home Page Layout",
                  sub: "Reorder homepage sections & hero blocks",
                  icon: LayoutGrid,
                  color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
                  href: "/brand/home",
                },
                {
                  title: "Landing Page Builder",
                  sub: "High-converting standalone landing pages",
                  icon: Rocket,
                  color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
                  href: "/brand/landing",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink key={item.title + item.href} to={item.href} className="group">
                    <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-border/50 bg-secondary/10 hover:bg-secondary/30 hover:border-primary/40 transition-all duration-200 h-full">
                      <div className={cn("p-2.5 rounded-xl border shrink-0", item.color)}>
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
