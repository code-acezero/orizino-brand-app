"use client";
import React, { useEffect } from "react";
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
  Mail,
  Truck,
  FileText,
  Activity,
  Database,
  Sparkles,
  Zap,
  Compass,
} from "lucide-react";
import { Sparkle } from "@/components/icons/Sparkle";
import { BrandImage, type LogoFilter } from "@/lib/brand-image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { useKpiCount } from "@/components/admin/dashboards/useKpiCount";

const loadedFontsSet = new Set<string>();

function ensureGoogleFontLoaded(family: string) {
  if (typeof document === "undefined" || !family) return;
  const key = family.trim().toLowerCase();
  if (loadedFontsSet.has(key)) return;
  loadedFontsSet.add(key);

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@300;400;500;600;700;800;900&display=swap`;
  link.setAttribute("data-brand-font", "1");
  document.head.appendChild(link);
}

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
          "logo_display_style",
          "logo_effect",
          "brand_title_size_nav",
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
  const logoStyle = (brandSettings?.logo_display_style as string) || "rounded";
  const titleFont = (brandSettings?.title_font as string) || "Audiowide";
  const siteTheme = (brandSettings?.site_theme as string) || "cherry_vanilla";
  const siteMode = (brandSettings?.site_mode as string) || "auto";
  const siteDescription =
    (brandSettings?.site_description as string) || "Luxury Storefront & E-commerce Brand Experience";
  const storefrontAppearance = (brandSettings?.storefront_appearance as any) || {};

  // Dynamically load Google Font for the active brand typography
  useEffect(() => {
    if (titleFont) {
      ensureGoogleFontLoaded(titleFont);
    }
  }, [titleFont]);

  return (
    <div className="space-y-6 w-full pb-16 animate-in fade-in duration-300">
      {/* ━━━ HERO COMMAND BANNER ━━━ */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-secondary/15 to-background p-6 sm:p-8 shadow-sm">
        <div className="absolute right-0 top-0 -mr-20 -mt-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/2 bottom-0 -mb-24 h-48 w-48 rounded-full bg-secondary/30 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/25 px-2.5 py-1 rounded-full shadow-xs">
                <Cpu className="w-3 h-3 text-primary animate-pulse" />
                Settings &amp; AI Intelligence
              </span>
              <Badge variant="outline" className="text-[10px] font-mono border-border/60 text-muted-foreground bg-secondary/30">
                Synchronized System Engine
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Settings &amp; Brand Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Unified command center for brand identity, luxury typography, multi-surface design tokens, autonomous AI assistants, communication gateways, and store preferences.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <NavLink to="/settings-ai/branding">
              <Button size="sm" className="h-9 px-4 rounded-xl font-bold gap-2 text-xs shadow-sm shadow-primary/20">
                <Paintbrush className="w-3.5 h-3.5" /> Branding Hub
              </Button>
            </NavLink>
            <NavLink to="/settings-ai/appearance">
              <Button size="sm" variant="outline" className="h-9 px-4 rounded-xl font-semibold gap-2 text-xs border-border/70 hover:bg-secondary/40">
                <Layout className="w-3.5 h-3.5 text-primary" /> Appearance Studio
              </Button>
            </NavLink>
          </div>
        </div>
      </div>

      {/* ━━━ SYMMETRICAL 4-COLUMN KPI TELEMETRY STRIP ━━━ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: AI Concierge */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-xs hover:border-primary/40 hover:shadow-sm transition-all rounded-2xl overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">AI Concierge</p>
              <p className="text-xl sm:text-2xl font-black text-foreground">
                {aiWidget.data?.enabled ? "Active" : "Online"}
              </p>
              <p className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Autonomous Agent
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
              <Bot className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Active Theme */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-xs hover:border-primary/40 hover:shadow-sm transition-all rounded-2xl overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Theme &amp; Mode</p>
              <p className="text-lg sm:text-xl font-black text-foreground capitalize truncate max-w-[130px]">
                {siteTheme.replace(/_/g, " ")}
              </p>
              <p className="text-[11px] text-muted-foreground font-medium capitalize">
                Mode: <strong className="text-foreground">{siteMode}</strong>
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
              <Palette className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Display Typography */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-xs hover:border-primary/40 hover:shadow-sm transition-all rounded-2xl overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Brand Typography</p>
              <p
                style={{ fontFamily: titleFont ? `'${titleFont}', sans-serif` : undefined }}
                className="text-lg sm:text-xl font-black text-foreground truncate max-w-[130px]"
              >
                {titleFont}
              </p>
              <p className="text-[11px] text-primary font-medium flex items-center gap-1">
                <Type className="w-3 h-3" /> Live Applied
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Type className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Storefront Surface */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-xs hover:border-primary/40 hover:shadow-sm transition-all rounded-2xl overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Storefront Grid</p>
              <p className="text-lg sm:text-xl font-black text-foreground capitalize truncate max-w-[130px]">
                {storefrontAppearance?.layout_variant?.replace(/-/g, " ") || "Hero Grid"}
              </p>
              <p className="text-[11px] text-amber-500 font-medium flex items-center gap-1">
                <Layout className="w-3 h-3" /> {storefrontAppearance?.rounded || "2xl"} Rounded
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Layout className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ━━━ MAIN WORKSPACE: 3 PARALLEL SYMMETRICAL COLUMNS ━━━ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* ─── Column 1: Live Brand Identity & Specs ─── */}
        <Card className="border-border/60 bg-card/70 backdrop-blur-sm shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between">
          <div>
            <CardHeader className="py-4 px-5 border-b border-border/40 bg-secondary/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Eye className="w-4 h-4 text-primary" /> Live Brand Identity
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                  ● Synchronized
                </Badge>
              </div>
              <CardDescription className="text-xs">Live rendered brand visual &amp; typography.</CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              {/* Brand Visual Canvas Preview */}
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-secondary/25 border border-border/50 text-center space-y-3.5 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

                {/* Brand Logo Container */}
                <div className="w-20 h-20 rounded-2xl bg-secondary/50 border border-border/80 flex items-center justify-center overflow-hidden shadow-sm relative group">
                  {logoUrl ? (
                    <BrandImage
                      src={logoUrl}
                      alt={siteName}
                      filter={logoFilter}
                      customColor={logoTint}
                      className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span
                      style={{ fontFamily: titleFont ? `'${titleFont}', sans-serif` : undefined }}
                      className="text-3xl font-black text-foreground"
                    >
                      {siteName.charAt(0)}
                    </span>
                  )}
                </div>

                {/* Brand Name Rendered with Active Font */}
                <div className="space-y-1 relative z-10">
                  <h3
                    style={{
                      fontFamily: titleFont ? `'${titleFont}', sans-serif` : undefined,
                      letterSpacing: "0.04em",
                    }}
                    className="text-2xl sm:text-3xl font-extrabold tracking-wide text-foreground transition-all duration-300"
                  >
                    {siteName}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto line-clamp-2 leading-relaxed">
                    {siteDescription}
                  </p>
                </div>
              </div>

              {/* Symmetrical Specification Matrix */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-secondary/20 border border-border/40 space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Type className="w-3 h-3 text-primary" /> Display Font
                  </span>
                  <p
                    style={{ fontFamily: titleFont ? `'${titleFont}', sans-serif` : undefined }}
                    className="font-bold text-foreground text-xs truncate"
                  >
                    {titleFont}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-secondary/20 border border-border/40 space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Palette className="w-3 h-3 text-primary" /> Color Theme
                  </span>
                  <p className="font-bold text-foreground text-xs capitalize truncate">
                    {siteTheme.replace(/_/g, " ")}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-secondary/20 border border-border/40 space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Layout className="w-3 h-3 text-primary" /> Layout Variant
                  </span>
                  <p className="font-bold text-foreground text-xs capitalize truncate">
                    {storefrontAppearance?.layout_variant?.replace(/-/g, " ") || "Hero Grid"}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-secondary/20 border border-border/40 space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-primary" /> Logo Geometry
                  </span>
                  <p className="font-bold text-foreground text-xs capitalize truncate">
                    {logoStyle || "Rounded"}
                  </p>
                </div>
              </div>
            </CardContent>
          </div>

          <div className="p-5 pt-0 space-y-2">
            <NavLink to="/settings-ai/branding" className="block">
              <Button variant="outline" size="sm" className="w-full text-xs font-bold gap-1.5 h-9 rounded-xl border-border/70 hover:bg-secondary/40">
                <Paintbrush className="w-3.5 h-3.5 text-primary" /> Edit Brand Assets
              </Button>
            </NavLink>
            <NavLink to="/settings-ai/appearance" className="block">
              <Button variant="ghost" size="sm" className="w-full text-xs font-semibold gap-1.5 h-8 rounded-xl text-muted-foreground hover:text-foreground">
                <Layout className="w-3 h-3" /> Customize Storefront Surfaces
              </Button>
            </NavLink>
          </div>
        </Card>

        {/* ─── Column 2: AI & Autonomous Intelligence Center ─── */}
        <Card className="border-border/60 bg-card/70 backdrop-blur-sm shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between">
          <div>
            <CardHeader className="py-4 px-5 border-b border-border/40 bg-secondary/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Sparkle className="w-4 h-4 text-primary" /> AI &amp; Intelligence Hub
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono font-bold text-primary bg-primary/10 border-primary/20">
                  7 Gateways
                </Badge>
              </div>
              <CardDescription className="text-xs">Configure autonomous assistants and algorithms.</CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-2.5">
              {[
                {
                  title: "AI Agent Assistant (MR. Slime)",
                  desc: "Welcome greetings, shopper chat & size advice",
                  icon: Sparkle,
                  url: "/settings-ai/ai-settings",
                  badge: "Autonomous",
                },
                {
                  title: "Recommendations Engine",
                  desc: "Collaborative filtering & AI cart upsell suggestions",
                  icon: Compass,
                  url: "/settings-ai/recommendations",
                  badge: "Neural Model",
                },
                {
                  title: "Chat & Social Automations",
                  desc: "WhatsApp, Facebook Page, Instagram DM & TikTok Shop hub",
                  icon: MessageSquare,
                  url: "/settings-ai/social-automations",
                  badge: "4 Channels",
                },
                {
                  title: "Voice & Call Support Logic",
                  desc: "IVR routing, customer voice channels & support logic",
                  icon: Phone,
                  url: "/settings-ai/call-settings",
                  badge: "Voice",
                },
                {
                  title: "Email Provider (Resend)",
                  desc: "Transactional senders, Resend API key & logs",
                  icon: Mail,
                  url: "/settings-ai/email-provider",
                  badge: "Resend",
                },
                {
                  title: "SMS Gateway (Carrier OTP)",
                  desc: "Local BD (BulkSMSBD) & Global carrier SMS",
                  icon: Phone,
                  url: "/settings-ai/sms",
                  badge: "SMS API",
                },
                {
                  title: "Telegram Community Bot",
                  desc: "Order alerts, admin dispatch & broadcast",
                  icon: MessageSquare,
                  url: "/settings-ai/telegram",
                  badge: "Bot API",
                },
              ].map((mod) => (
                <NavLink key={mod.title} to={mod.url} className="block group">
                  <div className="p-3 rounded-xl border border-border/40 bg-secondary/15 hover:bg-secondary/35 hover:border-primary/40 transition-all flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <mod.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                            {mod.title}
                          </p>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{mod.desc}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </div>
                </NavLink>
              ))}
            </CardContent>
          </div>

          <div className="p-5 pt-0">
            <NavLink to="/settings-ai/ai-settings" className="block">
              <Button variant="ghost" size="sm" className="w-full text-xs font-semibold gap-1.5 h-8 rounded-xl text-muted-foreground hover:text-foreground">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Open AI Prompt Tuning
              </Button>
            </NavLink>
          </div>
        </Card>

        {/* ─── Column 3: Surfaces & Global Preferences ─── */}
        <Card className="border-border/60 bg-card/70 backdrop-blur-sm shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between">
          <div>
            <CardHeader className="py-4 px-5 border-b border-border/40 bg-secondary/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Sliders className="w-4 h-4 text-primary" /> Surfaces &amp; Preferences
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono font-bold text-muted-foreground bg-secondary/30 border-border/60">
                  6 Modules
                </Badge>
              </div>
              <CardDescription className="text-xs">Global configurations across all storefront pages.</CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-2.5">
              {[
                {
                  title: "Storefront Appearance",
                  desc: "15+ Luxury typography pairs & surface styling",
                  icon: Layout,
                  url: "/settings-ai/appearance",
                },
                {
                  title: "Brand Themes & Colors",
                  desc: "Theme palette, logo filter & brand voice",
                  icon: Palette,
                  url: "/settings-ai/branding",
                },
                {
                  title: "Payment Gateways & MFS",
                  desc: "bKash, Nagad, Upay, Rocket, COD & Stripe",
                  icon: CreditCard,
                  url: "/sales/payment-gateways",
                },
                {
                  title: "Logistics & Couriers",
                  desc: "Pathao & Steadfast automated parcel creation",
                  icon: Truck,
                  url: "/sales/courier-settings",
                },
                {
                  title: "General Preferences",
                  desc: "Currency, locale, tax & store preferences",
                  icon: Settings,
                  url: "/settings-ai/general",
                },
                {
                  title: "Apps Redirection",
                  desc: "Cross-app domain gateway, CTA destinations & UTM",
                  icon: ExternalLink,
                  url: "/settings-ai/redirects",
                },
                {
                  title: "Legal & Trust Policies",
                  desc: "Terms of service, privacy policy & refund policies",
                  icon: FileText,
                  url: "/settings-ai/general?tab=legal",
                },
              ].map((mod) => (
                <NavLink key={mod.title} to={mod.url} className="block group">
                  <div className="p-3 rounded-xl border border-border/40 bg-secondary/15 hover:bg-secondary/35 hover:border-primary/40 transition-all flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary/60 text-foreground border border-border/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <mod.icon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                          {mod.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{mod.desc}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </div>
                </NavLink>
              ))}
            </CardContent>
          </div>

          <div className="p-5 pt-0">
            <NavLink to="/settings-ai/general" className="block">
              <Button variant="ghost" size="sm" className="w-full text-xs font-semibold gap-1.5 h-8 rounded-xl text-muted-foreground hover:text-foreground">
                <Settings className="w-3 h-3" /> Open Global Store Config
              </Button>
            </NavLink>
          </div>
        </Card>
      </div>

      {/* ━━━ SYMMETRICAL SYSTEM DIAGNOSTICS STRIP ━━━ */}
      <div className="rounded-2xl border border-border/50 bg-secondary/15 p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-foreground">System Health Telemetry:</span>
          <span>All services operational</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-muted-foreground font-mono text-[11px]">
          <span className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-primary" /> Supabase DB: <strong className="text-foreground">Online</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> AI Inference: <strong className="text-foreground">Gemini 2.5</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Realtime Sync: <strong className="text-foreground">Connected</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
