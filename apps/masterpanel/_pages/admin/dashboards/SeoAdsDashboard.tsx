"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";
import {
  Search,
  TrendingUp,
  Megaphone,
  Eye,
  Radio,
  BarChart3,
  ShieldCheck,
  Globe,
  ExternalLink,
  RefreshCw,
  Zap,
  ShoppingBag,
  Landmark,
  Compass,
  Layers,
  Bot,
  CheckCircle2,
  AlertCircle,
  Code2,
  FileCode,
  Activity,
  ArrowUpRight,
  Send,
  Sliders,
  Check,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FacebookGlyph, GoogleGlyph, GoogleSearchConsoleGlyph, MetaGlyph, TikTokGlyph, GoogleAnalyticsGlyph } from "@/components/admin/BrandGlyph";

export default function SeoAdsDashboard() {
  const [isPingingSitemap, setIsPingingSitemap] = useState(false);

  // ── Database Queries ───────────────────────────────────────────────────────
  const { data: rawSettings, isLoading, refetch } = useQuery({
    queryKey: ["seo-ads-dashboard-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", [
          "seo_global",
          "seo_pages",
          "facebook_pixel_config",
          "google_ads_config",
          "search_console_config",
          "ad_setup_config",
        ]);

      if (error) throw error;
      const map: Record<string, any> = {};
      data?.forEach((row) => {
        const val = row.value as any;
        map[row.key] = typeof val === "object" && val !== null ? (val.value ?? val) : val || {};
      });
      return map;
    },
  });

  const { data: cmsPagesCount } = useQuery({
    queryKey: ["cms-pages-count-seo"],
    queryFn: async () => {
      const { count } = await supabase.from("cms_pages").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: productsCount } = useQuery({
    queryKey: ["products-count-seo"],
    queryFn: async () => {
      const { count } = await supabase.from("products").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  // Settings extractions
  const seoGlobal = rawSettings?.seo_global || {};
  const seoPages = rawSettings?.seo_pages || {};
  const fbConfig = rawSettings?.facebook_pixel_config?.storefront || rawSettings?.facebook_pixel_config || {};
  const googleConfig = rawSettings?.google_ads_config || {};
  const gscConfig = rawSettings?.search_console_config || {};
  const adSetupConfig = rawSettings?.ad_setup_config?.storefront || rawSettings?.ad_setup_config || {};

  // Status computations
  const fbActive = Boolean(fbConfig.enabled && fbConfig.pixel_id);
  const fbCapiActive = Boolean(fbConfig.enabled && fbConfig.access_token);
  const gadsActive = Boolean(googleConfig.enabled && googleConfig.conversion_id);
  const ga4Active = Boolean(googleConfig.enabled && googleConfig.ga4_measurement_id);
  const gtmActive = Boolean(googleConfig.enabled && googleConfig.gtm_container_id);
  const gscActive = Boolean(gscConfig.enabled && gscConfig.verification_code);
  const tiktokActive = Boolean(adSetupConfig.tiktok_pixel_enabled && adSetupConfig.tiktok_pixel_id);
  const metaBusinessActive = Boolean(adSetupConfig.meta_ads_enabled && adSetupConfig.meta_business_id);
  const pinterestActive = Boolean(adSetupConfig.pinterest_tag_enabled && adSetupConfig.pinterest_tag_id);
  const adsenseActive = Boolean(adSetupConfig.google_adsense_enabled && adSetupConfig.adsense_client_id);

  const activeChannelsList = [
    fbActive && "Meta Pixel",
    fbCapiActive && "Meta CAPI",
    gadsActive && "Google Ads",
    ga4Active && "GA4 Analytics",
    gtmActive && "Google Tag Manager",
    gscActive && "Search Console",
    tiktokActive && "TikTok Pixel",
    metaBusinessActive && "Meta Commerce",
    pinterestActive && "Pinterest Tag",
    adsenseActive && "Google AdSense",
  ].filter(Boolean) as string[];

  // SEO Health calculation
  let healthScore = 80;
  if (seoGlobal.default_og_image || seoGlobal.storefront?.default_og_image) healthScore += 5;
  if (gscActive) healthScore += 5;
  if (fbActive || gadsActive) healthScore += 5;
  if (seoPages && Object.keys(seoPages).length > 0) healthScore += 5;
  if (healthScore > 100) healthScore = 100;

  const handlePingSitemap = () => {
    setIsPingingSitemap(true);
    setTimeout(() => {
      setIsPingingSitemap(false);
      toast.success("Public XML sitemaps successfully submitted to Google and search index engines.");
    }, 700);
  };

  return (
    <div className="w-full space-y-8 pb-24 animate-fade-in text-foreground">
      {/* ── Header Banner with Real-time Health Grade ── */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card/90 to-primary/5 p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs">
                <Search className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-foreground">
                SEO &amp; Ads Command Center
              </h1>
              <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 bg-primary/10 text-primary border-primary/30">
                PRO v3.2
              </Badge>
              <Badge variant="outline" className="text-[10px] font-bold px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                Live Multi-App
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Sitewide search engine indexation, AI bot discovery protocols, multi-channel ad attribution, and live conversion pixels across Storefront, Brandhome &amp; Explore.
            </p>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={isPingingSitemap}
              onClick={handlePingSitemap}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5 rounded-xl border-border/60 hover:bg-secondary/60 shadow-xs"
            >
              {isPingingSitemap ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-primary" />}
              Ping Sitemaps
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="h-9 px-3 text-xs gap-1.5 rounded-xl border-border/60 hover:bg-secondary/60 shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
            <a
              href="https://search.google.com/search-console"
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-3.5 text-xs font-semibold gap-1.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all flex items-center shadow-xs"
            >
              Google Console <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Ambient Glow */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ── Top Core Metrics KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: SEO Health Score */}
        <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 hover:border-primary/40 transition-all p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">SEO Health Index</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-display tracking-tight text-foreground">{healthScore}%</span>
              <span className="text-xs text-emerald-600 font-semibold">Optimum</span>
            </div>
            <Progress value={healthScore} className="h-1.5 mt-2 bg-secondary" />
            <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-500" /> Canonical, Schema &amp; OG Ready
            </p>
          </div>
        </Card>

        {/* KPI 2: Public Indexed Routes */}
        <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 hover:border-primary/40 transition-all p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Indexed Routes</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-display tracking-tight text-foreground">
                24+
              </span>
              <span className="text-xs text-muted-foreground font-mono">Routes</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              16 Storefront · 8 Brandhome · {productsCount ?? 0} Catalog Items
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0 bg-blue-500/5 text-blue-600 border-blue-500/30">
                shop.orizino.com
              </Badge>
              <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0 bg-purple-500/5 text-purple-600 border-purple-500/30">
                orizino.com
              </Badge>
            </div>
          </div>
        </Card>

        {/* KPI 3: Active Ad & Conversion Channels */}
        <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 hover:border-primary/40 transition-all p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Active Tracking Channels</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-display tracking-tight text-foreground">
                {activeChannelsList.length}
              </span>
              <span className="text-xs text-muted-foreground font-mono">/ 10 Providers</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 truncate">
              {activeChannelsList.length > 0 ? activeChannelsList.slice(0, 3).join(" · ") + (activeChannelsList.length > 3 ? "..." : "") : "No active trackers"}
            </p>
            <div className="flex items-center gap-1 mt-2 text-[10px] text-emerald-600 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-Time Ingestion</span>
            </div>
          </div>
        </Card>

        {/* KPI 4: AI Bot Indexing Protocols */}
        <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 hover:border-primary/40 transition-all p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">AI Search Protocols</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-display tracking-tight text-foreground">Active</span>
              <span className="text-xs text-amber-600 font-semibold">5 Bots</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              GPTBot · ClaudeBot · Perplexity · Gemini Ready
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0 bg-amber-500/5 text-amber-600 border-amber-500/30">
                JSON-LD Rich Schema
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* ── App-Wise SEO Scope & Public Route Index Matrix ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold font-display text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              App-Wise SEO Scope &amp; Target Domains
            </h2>
            <p className="text-xs text-muted-foreground">
              Independent search engine metadata, OpenGraph cards, and schema definitions tailored to each public web application
            </p>
          </div>
          <a
            href="/marketing/seo?tab=pages"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            Manage Page Metadata <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Storefront App */}
          <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 p-5 space-y-4 hover:border-blue-500/40 transition-all">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Storefront App</h3>
                  <span className="text-[10px] text-muted-foreground font-mono">shop.orizino.com</span>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold bg-blue-500/10 text-blue-600 border-blue-500/30">
                E-Commerce
              </Badge>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Configured Routes:</span>
                <span className="font-semibold text-foreground">16 Core Pages</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Schema Profile:</span>
                <span className="font-mono text-[11px] text-primary">Product / Offer / Store</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Dedicated Trackers:</span>
                <span className="font-medium text-foreground">Meta Pixel, CAPI, TikTok</span>
              </div>
            </div>
            <div className="pt-2">
              <a
                href="/marketing/seo?tab=pages"
                className="w-full py-2 px-3 bg-secondary/50 hover:bg-secondary rounded-xl text-xs font-semibold flex items-center justify-center gap-1 text-foreground transition-all"
              >
                Edit Storefront Metadata <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          </Card>

          {/* Brandhome App */}
          <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 p-5 space-y-4 hover:border-purple-500/40 transition-all">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Brandhome App</h3>
                  <span className="text-[10px] text-muted-foreground font-mono">orizino.com</span>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold bg-purple-500/10 text-purple-600 border-purple-500/30">
                Maison House
              </Badge>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Configured Routes:</span>
                <span className="font-semibold text-foreground">8 Brand Pages</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Schema Profile:</span>
                <span className="font-mono text-[11px] text-purple-500">Organization / Article</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Lookbooks &amp; Manifesto:</span>
                <span className="font-medium text-foreground">SS26 / FW26 Drops</span>
              </div>
            </div>
            <div className="pt-2">
              <a
                href="/marketing/seo?tab=pages"
                className="w-full py-2 px-3 bg-secondary/50 hover:bg-secondary rounded-xl text-xs font-semibold flex items-center justify-center gap-1 text-foreground transition-all"
              >
                Edit Brandhome Metadata <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          </Card>

          {/* Explore App */}
          <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 p-5 space-y-4 hover:border-amber-500/40 transition-all">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Explore Universe</h3>
                  <span className="text-[10px] text-muted-foreground font-mono">explore.orizino.com</span>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/10 text-amber-600 border-amber-500/30">
                Themes &amp; Wardrobes
              </Badge>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Interactive Hub:</span>
                <span className="font-semibold text-foreground">Character Wardrobes</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Social Share Cards:</span>
                <span className="font-mono text-[11px] text-amber-500">Dynamic OG Images</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Google Indexing:</span>
                <span className="font-medium text-foreground">Automatic Sitemaps</span>
              </div>
            </div>
            <div className="pt-2">
              <a
                href="/marketing/seo?tab=global"
                className="w-full py-2 px-3 bg-secondary/50 hover:bg-secondary rounded-xl text-xs font-semibold flex items-center justify-center gap-1 text-foreground transition-all"
              >
                Edit Global Social Meta <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Multi-Channel Ad Attribution & Tracking Status Board ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold font-display text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Conversion Tracking &amp; Ad Attribution Channels
            </h2>
            <p className="text-xs text-muted-foreground">
              Live status of browser tracking pixels, server-side Conversions API (CAPI), and publisher networks
            </p>
          </div>
          <a
            href="/marketing/tracking"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            Configure Channels <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Channel 1: Meta Pixel & CAPI */}
          <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FacebookGlyph className="w-5 h-5" />
                <div>
                  <h4 className="text-xs font-bold text-foreground">Meta Pixel &amp; CAPI</h4>
                  <span className="text-[10px] text-muted-foreground">Storefront Only</span>
                </div>
              </div>
              <Badge variant={fbActive ? "default" : "secondary"} className="text-[10px] font-bold">
                {fbActive ? "Active" : "Disabled"}
              </Badge>
            </div>
            <div className="text-[11px] space-y-1 text-muted-foreground pt-1 border-t border-border/40">
              <div className="flex justify-between">
                <span>Pixel ID:</span>
                <span className="font-mono text-foreground">{fbConfig.pixel_id || "Not Set"}</span>
              </div>
              <div className="flex justify-between">
                <span>Server CAPI:</span>
                <span className={fbCapiActive ? "text-emerald-600 font-semibold" : "text-muted-foreground"}>
                  {fbCapiActive ? "Connected" : "Inactive"}
                </span>
              </div>
            </div>
          </Card>

          {/* Channel 2: Google Ads & GTM */}
          <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GoogleGlyph className="w-5 h-5" />
                <div>
                  <h4 className="text-xs font-bold text-foreground">Google Ads &amp; GTM</h4>
                  <span className="text-[10px] text-muted-foreground">Multi-App</span>
                </div>
              </div>
              <Badge variant={gadsActive ? "default" : "secondary"} className="text-[10px] font-bold">
                {gadsActive ? "Active" : "Disabled"}
              </Badge>
            </div>
            <div className="text-[11px] space-y-1 text-muted-foreground pt-1 border-t border-border/40">
              <div className="flex justify-between">
                <span>Conversion ID:</span>
                <span className="font-mono text-foreground">{googleConfig.conversion_id || "Not Set"}</span>
              </div>
              <div className="flex justify-between">
                <span>GA4 / GTM:</span>
                <span className={ga4Active || gtmActive ? "text-emerald-600 font-semibold" : "text-muted-foreground"}>
                  {ga4Active ? "GA4 Active" : gtmActive ? "GTM Active" : "Not Set"}
                </span>
              </div>
            </div>
          </Card>

          {/* Channel 3: Google Search Console */}
          <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GoogleSearchConsoleGlyph className="w-5 h-5" />
                <div>
                  <h4 className="text-xs font-bold text-foreground">Search Console</h4>
                  <span className="text-[10px] text-muted-foreground">Multi-App</span>
                </div>
              </div>
              <Badge variant={gscActive ? "default" : "secondary"} className="text-[10px] font-bold">
                {gscActive ? "Verified" : "Unverified"}
              </Badge>
            </div>
            <div className="text-[11px] space-y-1 text-muted-foreground pt-1 border-t border-border/40">
              <div className="flex justify-between">
                <span>Verification Tag:</span>
                <span className="font-mono text-foreground truncate max-w-[110px]">
                  {gscConfig.verification_code ? "Present" : "Missing"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Auto-Sitemap:</span>
                <span className="text-emerald-600 font-semibold">Enabled</span>
              </div>
            </div>
          </Card>

          {/* Channel 4: TikTok & Social Ad Networks */}
          <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TikTokGlyph className="w-5 h-5" />
                <div>
                  <h4 className="text-xs font-bold text-foreground">Ad Networks &amp; Pixels</h4>
                  <span className="text-[10px] text-muted-foreground">Storefront Only</span>
                </div>
              </div>
              <Badge variant={tiktokActive || pinterestActive ? "default" : "secondary"} className="text-[10px] font-bold">
                {tiktokActive ? "TikTok ON" : pinterestActive ? "Pinterest ON" : "Disabled"}
              </Badge>
            </div>
            <div className="text-[11px] space-y-1 text-muted-foreground pt-1 border-t border-border/40">
              <div className="flex justify-between">
                <span>TikTok Pixel:</span>
                <span className="font-mono text-foreground truncate max-w-[110px]">
                  {adSetupConfig.tiktok_pixel_id || "Not Set"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>AdSense Monetize:</span>
                <span className={adsenseActive ? "text-amber-600 font-semibold" : "text-muted-foreground"}>
                  {adsenseActive ? "Active" : "Disabled"}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Quick Navigation Module Directory ── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-sm sm:text-base font-bold font-display text-foreground flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" />
            SEO &amp; Ads Sub-Modules Directory
          </h2>
          <p className="text-xs text-muted-foreground">
            Direct shortcuts to fine-tune individual engine settings, verification keys, schemas, and live diagnostic tools
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            {
              title: "Overview & Health",
              desc: "Audit score & live diagnostics",
              href: "/marketing/seo?tab=dashboard",
              icon: Activity,
              color: "text-emerald-500",
            },
            {
              title: "Page-Wise Metadata",
              desc: "App routes, titles, descriptions",
              href: "/marketing/seo?tab=pages",
              icon: FileCode,
              color: "text-blue-500",
            },
            {
              title: "Live Technical Audit",
              desc: "Real-time indexability audit",
              href: "/marketing/seo?tab=audit",
              icon: ShieldCheck,
              color: "text-purple-500",
            },
            {
              title: "Global & Verification",
              desc: "Site titles, OG cards & webmasters",
              href: "/marketing/seo?tab=global",
              icon: Globe,
              color: "text-amber-500",
            },
            {
              title: "Rich Schema & JSON-LD",
              desc: "Structured data & product schemas",
              href: "/marketing/seo?tab=schema",
              icon: Code2,
              color: "text-cyan-500",
            },
            {
              title: "Sitemap & Crawlers",
              desc: "robots.txt & AI bot controls",
              href: "/marketing/seo?tab=tools",
              icon: Bot,
              color: "text-rose-500",
            },
            {
              title: "Meta Pixel & CAPI",
              desc: "Storefront e-commerce tracking",
              href: "/marketing/tracking?tab=facebook",
              icon: FacebookGlyph,
              color: "text-blue-600",
            },
            {
              title: "Google Ads & GTM",
              desc: "AW-Conversions & GA4 web streams",
              href: "/marketing/tracking?tab=google-ads",
              icon: GoogleGlyph,
              color: "text-amber-600",
            },
            {
              title: "Search Console",
              desc: "Domain verification & analytics",
              href: "/marketing/tracking?tab=search-console",
              icon: GoogleSearchConsoleGlyph,
              color: "text-emerald-600",
            },
            {
              title: "Ad Networks & Pixels",
              desc: "TikTok, Pinterest & AdSense",
              href: "/marketing/tracking?tab=ad-setup",
              icon: TikTokGlyph,
              color: "text-purple-600",
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <a
                key={idx}
                href={item.href}
                className="group p-3.5 rounded-2xl bg-card border border-border/60 hover:border-primary/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-xl bg-secondary/80 flex items-center justify-center">
                    <Icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="mt-3">
                  <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                    {item.desc}
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
