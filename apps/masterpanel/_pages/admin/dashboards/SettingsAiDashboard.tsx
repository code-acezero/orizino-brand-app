"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Settings,
  Bot,
  Bell,
  Phone,
  ExternalLink,
  Brain,
  Cpu,
  MessageSquare,
  Palette,
  Layout,
  Type,
  Eye,
  Paintbrush,
  Sliders,
  CheckCircle2,
  Globe,
  Layers,
  ArrowRight,
  ShieldCheck,
  Megaphone,
  ShoppingBag,
  CreditCard,
} from "lucide-react";
import { BrandImage, type LogoFilter } from "@/lib/brand-image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { useKpiCount } from "@/components/admin/dashboards/useKpiCount";

export default function SettingsAiDashboard() {
  const notifications = useKpiCount(["notifications", "24h"], "notifications", (q) =>
    q.gte("created_at", new Date(Date.now() - 24 * 3600_000).toISOString())
  );
  const telegram = useKpiCount(["telegram-chats"], "telegram_chats");
  const aiMemory = useKpiCount(["ai-memory"], "ai_user_memory");
  const banners = useKpiCount(["banners", "active"], "banners", (q) => q.eq("is_active", true));

  const aiWidget = useQuery({
    queryKey: ["ai-widget"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_widget_settings")
        .select("welcome_enabled")
        .limit(1)
        .maybeSingle();
      return { configured: !!data, enabled: !!data?.welcome_enabled };
    },
  });

  const { data: brandSettings, isLoading: isBrandLoading } = useQuery({
    queryKey: ["brand-settings-unified-dashboard"],
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
          "storefront_appearance",
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
  const logoFilter = (brandSettings?.logo_color_filter as LogoFilter) || "none";
  const logoTint = (brandSettings?.logo_tint_color as string) || "#ffffff";
  const titleFont = (brandSettings?.title_font as string) || "Instrument Serif";
  const siteTheme = (brandSettings?.site_theme as string) || "default";
  const siteMode = (brandSettings?.site_mode as string) || "auto";
  const siteDescription =
    (brandSettings?.site_description as string) || "Luxury Storefront & E-commerce Brand Experience";
  const storefrontAppearance = (brandSettings?.storefront_appearance as any) || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── UNIFIED HERO BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-secondary/15 to-background p-6 sm:p-8 shadow-sm">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
                <Cpu className="w-3 h-3 text-primary animate-pulse" />
                Settings &amp; AI Control Center
              </span>
              <Badge variant="outline" className="text-[10px] font-mono border-border/60 text-muted-foreground">
                Unified Brand &amp; System Engine
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Settings &amp; Brand Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Global command hub for brand identity, multi-surface appearance &amp; typography, AI assistants, automated integrations, and system configuration.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <NavLink to="/brand/branding">
              <Button size="sm" className="h-9 rounded-xl font-bold gap-2 text-xs">
                <Paintbrush className="w-3.5 h-3.5" /> Branding Hub
              </Button>
            </NavLink>
            <NavLink to="/brand/appearance">
              <Button size="sm" variant="outline" className="h-9 rounded-xl font-semibold gap-2 text-xs border-border/60">
                <Layout className="w-3.5 h-3.5 text-primary" /> Appearance Studio
              </Button>
            </NavLink>
          </div>
        </div>
      </div>

      {/* ── SYMMETRICAL 4-COLUMN KPI TELEMETRY ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* AI Assistant */}
        <Card className="border-border/50 bg-card/60 shadow-xs hover:border-primary/40 transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">AI Assistant</p>
              <p className="text-2xl font-black text-foreground">
                {aiWidget.data?.enabled ? "Active" : "Ready"}
              </p>
              <p className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {aiWidget.data?.configured ? "Configured" : "Online"}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
              <Bot className="w-5.5 h-5.5" />
            </div>
          </CardContent>
        </Card>

        {/* Brand Theme & Mode */}
        <Card className="border-border/50 bg-card/60 shadow-xs hover:border-primary/40 transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Active Theme</p>
              <p className="text-xl font-black text-foreground capitalize truncate max-w-[130px]">
                {siteTheme}
              </p>
              <p className="text-[11px] text-muted-foreground font-medium capitalize">
                Mode: <strong className="text-foreground">{siteMode}</strong>
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400">
              <Palette className="w-5.5 h-5.5" />
            </div>
          </CardContent>
        </Card>

        {/* AI Memory & Notes */}
        <Card className="border-border/50 bg-card/60 shadow-xs hover:border-primary/40 transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">AI User Memory</p>
              <p className="text-2xl font-black text-foreground">
                {aiMemory.isLoading ? "…" : aiMemory.data ?? 0}
              </p>
              <p className="text-[11px] text-primary font-medium flex items-center gap-1">
                <Brain className="w-3 h-3" /> Stored Insights
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Brain className="w-5.5 h-5.5" />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-border/50 bg-card/60 shadow-xs hover:border-primary/40 transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Notifications (24h)</p>
              <p className="text-2xl font-black text-foreground">
                {notifications.isLoading ? "…" : notifications.data ?? 0}
              </p>
              <p className="text-[11px] text-amber-500 font-medium flex items-center gap-1">
                <Bell className="w-3 h-3" /> Dispatched
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
              <Bell className="w-5.5 h-5.5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── MAIN WORKSPACE: BRAND LIVE SHOWCASE + SETTINGS MODULES ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Col: Live Brand Showcase */}
        <Card className="border-border/50 bg-card/60 shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between">
          <CardHeader className="py-4 px-5 border-b border-border/40 bg-secondary/15">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Eye className="w-4 h-4 text-primary" /> Live Brand Identity
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                Synchronized
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-secondary/20 border border-border/40 text-center space-y-3">
              <div className="w-20 h-20 rounded-2xl bg-secondary/40 border border-border/60 flex items-center justify-center overflow-hidden shadow-xs">
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
                <h3 className="text-xl font-bold tracking-tight text-foreground">{siteName}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{siteDescription}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/20 border border-border/40">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-primary" /> Display Typography
                </span>
                <span className="font-mono font-bold text-foreground">{titleFont}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/20 border border-border/40">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Layout className="w-3.5 h-3.5 text-primary" /> Storefront Layout
                </span>
                <span className="font-mono font-bold text-foreground capitalize">
                  {storefrontAppearance?.layout_variant || "Hero Grid"}
                </span>
              </div>
            </div>

            <NavLink to="/brand/branding" className="block pt-2">
              <Button variant="outline" size="sm" className="w-full text-xs font-semibold gap-1.5 border-border/60">
                <Paintbrush className="w-3.5 h-3.5 text-primary" /> Edit Brand Assets
              </Button>
            </NavLink>
          </CardContent>
        </Card>

        {/* Middle Col: AI & Automation Center */}
        <Card className="border-border/50 bg-card/60 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="py-4 px-5 border-b border-border/40 bg-secondary/15">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Bot className="w-4 h-4 text-primary" /> AI &amp; Intelligence Center
            </CardTitle>
            <CardDescription className="text-xs">Configure autonomous assistants and algorithms.</CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-3">
            {[
              {
                title: "AI Agent Assistant",
                desc: "Welcome greetings, shopper chat & order assistance",
                icon: Bot,
                url: "/settings-ai/ai-settings",
                badge: "Autonomous",
              },
              {
                title: "Recommendations Engine",
                desc: "Collaborative filtering & AI cart upsell suggestions",
                icon: Brain,
                url: "/settings-ai/recommendations",
                badge: "AI Model",
              },
              {
                title: "Voice & Call Settings",
                desc: "IVR routing, customer voice channels & support logic",
                icon: Phone,
                url: "/settings-ai/call-settings",
                badge: "Voice",
              },
              {
                title: "Telegram Community Bot",
                desc: "Order alerts, admin dispatch & customer broadcast",
                icon: MessageSquare,
                url: "/settings-ai/telegram",
                badge: "Bot API",
              },
            ].map((mod) => (
              <NavLink key={mod.title} to={mod.url} className="block group">
                <div className="p-3.5 rounded-2xl border border-border/40 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/40 transition-all flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <mod.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                        {mod.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{mod.desc}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </NavLink>
            ))}
          </CardContent>
        </Card>

        {/* Right Col: System & Storefront Preferences */}
        <Card className="border-border/50 bg-card/60 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="py-4 px-5 border-b border-border/40 bg-secondary/15">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Sliders className="w-4 h-4 text-primary" /> Surfaces &amp; Preferences
            </CardTitle>
            <CardDescription className="text-xs">Global configurations across all storefront pages.</CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-3">
            {[
              {
                title: "Storefront Appearance",
                desc: "15+ Luxury typography pairs & surface styling",
                icon: Layout,
                url: "/brand/appearance",
              },
              {
                title: "Brand Themes & Colors",
                desc: "Theme palette, logo filter & brand voice",
                icon: Palette,
                url: "/brand/branding",
              },
              {
                title: "Payment Gateways",
                desc: "MFS (bKash, Nagad, Upay, Rocket), COD & Stripe",
                icon: CreditCard,
                url: "/sales/payment-gateways",
              },
              {
                title: "General Preferences",
                desc: "Currency, locale, tax & store preferences",
                icon: Settings,
                url: "/settings-ai/general",
              },
              {
                title: "URL Redirects",
                desc: "301 & 302 canonical forwarding rules",
                icon: ExternalLink,
                url: "/settings-ai/redirects",
              },
            ].map((mod) => (
              <NavLink key={mod.title} to={mod.url} className="block group">
                <div className="p-3.5 rounded-2xl border border-border/40 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/40 transition-all flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-secondary/60 text-foreground flex items-center justify-center shrink-0">
                      <mod.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                        {mod.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{mod.desc}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </NavLink>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
