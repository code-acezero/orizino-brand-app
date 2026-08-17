"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRegisterUniversalSave } from "@/contexts/UniversalSaveContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/lib/app-toast";
import {
  ExternalLink,
  ShoppingBag,
  Store,
  LayoutGrid,
  Smartphone,
  Compass,
  Link2,
  Copy,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Globe,
  Radio,
  Sliders,
  Play,
  Layers,
  Laptop,
  CheckCircle2,
} from "lucide-react";
import type { ExternalRedirects } from "@orizino/shared/lib/cross-app-urls";

const defaultRedirects: ExternalRedirects = {
  storefront_url: "",
  brandhome_url: "",
  masterpanel_url: "",
  orderops_url: "",
  explore_url: "",
  shop_url: "",
  start_shopping_url: "",
  explore_categories_url: "",
  shop_label: "Shop",
  back_to_shop_label: "Back to Shop",
  back_to_shop_label_short: "Shop",
  preserve_query_params: true,
  custom_routes: [
    { id: "1", from: "/shop", to: "/shop", app: "storefront", active: true },
    { id: "2", from: "/pos", to: "/scanner", app: "orderops", active: true },
    { id: "3", from: "/fit-studio", to: "/studio", app: "explore", active: true },
    { id: "4", from: "/track", to: "/orders", app: "storefront", active: true },
  ],
};

const PRESETS = {
  production: {
    label: "Production Cluster",
    urls: {
      storefront_url: "https://shop.orizino.com",
      brandhome_url: "https://orizino.com",
      masterpanel_url: "https://mp.orizino.com",
      orderops_url: "https://om.orizino.com",
      explore_url: "https://explore.orizino.com",
    },
  },
  localhost: {
    label: "Local Dev Mesh (3000-3004)",
    urls: {
      storefront_url: "http://localhost:3001",
      brandhome_url: "http://localhost:3000",
      masterpanel_url: "http://localhost:3002",
      orderops_url: "http://localhost:3003",
      explore_url: "http://localhost:3004",
    },
  },
  staging: {
    label: "Staging Preview",
    urls: {
      storefront_url: "https://shop-staging.orizino.com",
      brandhome_url: "https://staging.orizino.com",
      masterpanel_url: "https://admin-staging.orizino.com",
      orderops_url: "https://ops-staging.orizino.com",
      explore_url: "https://explore-staging.orizino.com",
    },
  },
};

export default function AdminRedirects() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"origins" | "cta" | "routes" | "tester">("origins");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form State
  const [config, setConfig] = useState<ExternalRedirects>(defaultRedirects);
  const [savedConfig, setSavedConfig] = useState<ExternalRedirects>(defaultRedirects);

  // Simulator State
  const [simSourceApp, setSimSourceApp] = useState<"brandhome" | "storefront" | "masterpanel" | "orderops" | "explore">("brandhome");
  const [simPath, setSimPath] = useState("/shop?utm_source=instagram&ref=vip");

  // ── Load from site_settings ──────────────────────────────────────────────────
  const { data: rawSettings } = useQuery({
    queryKey: ["site-settings-redirects"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "external_redirects")
        .maybeSingle();
      const raw = data?.value as any;
      if (!raw) return null;
      return (typeof raw === "object" && "value" in raw && typeof raw.value === "object" ? raw.value : raw) as ExternalRedirects;
    },
  });

  useEffect(() => {
    if (rawSettings) {
      const merged = { ...defaultRedirects, ...rawSettings };
      setConfig(merged);
      setSavedConfig(merged);
    }
  }, [rawSettings]);

  // ── Save Mutation ────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "external_redirects", value: config as any, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      setSavedConfig({ ...config });
      qc.invalidateQueries({ queryKey: ["site-settings-redirects"] });
      toast.success("Apps Redirection settings saved");
    },
    onError: (err: any) => toast.error(err.message || "Failed to save redirection settings"),
  });

  // ── Universal Save Registration ─────────────────────────────────────────────
  const isDirty = useMemo(() => {
    return JSON.stringify(config) !== JSON.stringify(savedConfig);
  }, [config, savedConfig]);

  useRegisterUniversalSave({
    id: "apps-redirection-settings",
    label: "Save Redirects",
    isDirty,
    isSaving: saveMutation.isPending,
    onSave: () => saveMutation.mutate(),
  });

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast.success("URL copied to clipboard");
  };

  const applyPreset = (presetKey: keyof typeof PRESETS) => {
    const p = PRESETS[presetKey];
    setConfig((c) => ({
      ...c,
      ...p.urls,
    }));
    toast.success(`Applied "${p.label}" preset`);
  };

  const clearAllOverrides = () => {
    setConfig((c) => ({
      ...c,
      storefront_url: "",
      brandhome_url: "",
      masterpanel_url: "",
      orderops_url: "",
      explore_url: "",
    }));
    toast.info("Cleared URL overrides — using build-time env or localhost defaults");
  };

  // App definitions
  const apps = [
    {
      id: "storefront_url" as const,
      name: "Storefront Hub",
      icon: ShoppingBag,
      defaultPort: "3001",
      fallbackProd: "https://shop.orizino.com",
      desc: "Customer-facing shopping portal, product catalog, cart & checkout.",
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      id: "brandhome_url" as const,
      name: "Brand Home",
      icon: Store,
      defaultPort: "3000",
      fallbackProd: "https://orizino.com",
      desc: "Corporate showcase, brand story, lookbooks & editorial content.",
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      id: "masterpanel_url" as const,
      name: "Master Panel",
      icon: LayoutGrid,
      defaultPort: "3002",
      fallbackProd: "https://mp.orizino.com",
      desc: "Central business command center, marketing, AI & executive controls.",
      color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    },
    {
      id: "orderops_url" as const,
      name: "Order Ops (Mobile)",
      icon: Smartphone,
      defaultPort: "3003",
      fallbackProd: "https://om.orizino.com",
      desc: "Mobile-first POS, barcode scanner & warehouse order dispatch.",
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
    {
      id: "explore_url" as const,
      name: "Explore Studio",
      icon: Compass,
      defaultPort: "3004",
      fallbackProd: "https://explore.orizino.com",
      desc: "Interactive discovery engine, virtual fit studio & 3D styling.",
      color: "text-pink-400 bg-pink-500/10 border-pink-500/20",
    },
  ];

  // Simulator resolution logic
  const resolvedSimulatorTarget = useMemo(() => {
    let base = "";
    const cleanPath = simPath.startsWith("/") ? simPath : `/${simPath}`;

    // Check custom route alias matches
    const matchedRoute = (config.custom_routes || []).find((r) => r.active && cleanPath.startsWith(r.from));
    if (matchedRoute) {
      const appKey = `${matchedRoute.app}_url` as keyof ExternalRedirects;
      const appBase = config[appKey] || (matchedRoute.app === "storefront" ? "https://shop.orizino.com" : matchedRoute.app === "brandhome" ? "https://orizino.com" : matchedRoute.app === "masterpanel" ? "https://mp.orizino.com" : matchedRoute.app === "orderops" ? "https://om.orizino.com" : "https://explore.orizino.com");
      base = appBase as string;
    } else {
      if (simSourceApp === "brandhome") base = config.brandhome_url || "https://orizino.com";
      else if (simSourceApp === "storefront") base = config.storefront_url || "https://shop.orizino.com";
      else if (simSourceApp === "masterpanel") base = config.masterpanel_url || "https://mp.orizino.com";
      else if (simSourceApp === "orderops") base = config.orderops_url || "https://om.orizino.com";
      else base = config.explore_url || "https://explore.orizino.com";
    }

    const trimmedBase = base.replace(/\/$/, "");
    return `${trimmedBase}${cleanPath}`;
  }, [simSourceApp, simPath, config]);

  return (
    <div className="space-y-6 w-full pb-16">

      {/* ── HERO BANNER ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-secondary/15 to-background p-6 sm:p-8 shadow-sm">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
                <Globe className="w-3 h-3 text-primary" />
                Cross-App Gateway
              </span>
              <Badge variant="outline" className="text-[10px] font-mono border-border/60 text-muted-foreground">
                Runtime URL Mesh (No Rebuild Required)
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              Apps Redirection &amp; Domain Gateway
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Unified cross-app routing, custom domain origins, CTA link destinations, and deep-link aliases across all 5 ORIZINO apps.
            </p>
          </div>

          {/* Quick Environment Presets */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset("production")}
              className="h-8 rounded-xl text-xs gap-1.5 border-border/60 font-semibold"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              Production
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset("localhost")}
              className="h-8 rounded-xl text-xs gap-1.5 border-border/60 font-semibold"
            >
              <Laptop className="w-3.5 h-3.5 text-blue-400" />
              Localhost (3000-3004)
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllOverrides}
              className="h-8 rounded-xl text-xs text-muted-foreground hover:text-foreground"
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* ── 5-NODE APP CLUSTER TOPOLOGY RIBBON ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {apps.map((app) => {
          const Icon = app.icon;
          const currentUrl = config[app.id] || app.fallbackProd;
          const isOverridden = Boolean(config[app.id]);

          return (
            <div
              key={app.id}
              className="rounded-2xl border border-border/50 bg-card/40 p-4 space-y-3 flex flex-col justify-between hover:border-border/80 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${app.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[9px] ${
                      isOverridden ? "text-primary border-primary/30 bg-primary/10" : "text-muted-foreground border-border/50"
                    }`}
                  >
                    {isOverridden ? "Custom Origin" : "Default"}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">{app.name}</h4>
                  <p className="text-[11px] font-mono text-muted-foreground truncate mt-0.5" title={currentUrl}>
                    {currentUrl}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px]">
                <span className="text-muted-foreground font-mono">Port :{app.defaultPort}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleCopy(currentUrl, app.id)}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy URL"
                  >
                    {copiedKey === app.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                  <a
                    href={currentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-muted-foreground hover:text-primary transition-colors"
                    title="Open App"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── MAIN STUDIO TABS ─────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full bg-secondary/35 p-1 rounded-2xl h-11 border border-border/40">
          <TabsTrigger value="origins" className="w-full text-xs rounded-xl py-2 gap-1.5 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Globe className="w-3.5 h-3.5" /> App Origins (5)
          </TabsTrigger>
          <TabsTrigger value="cta" className="w-full text-xs rounded-xl py-2 gap-1.5 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Link2 className="w-3.5 h-3.5" /> CTA &amp; Button Links
          </TabsTrigger>
          <TabsTrigger value="routes" className="w-full text-xs rounded-xl py-2 gap-1.5 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Sliders className="w-3.5 h-3.5" /> Route Aliases &amp; UTM
          </TabsTrigger>
          <TabsTrigger value="tester" className="w-full text-xs rounded-xl py-2 gap-1.5 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Play className="w-3.5 h-3.5" /> Route Simulator
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: APP ORIGINS ─────────────────────────────────────────────── */}
        <TabsContent value="origins" className="space-y-4">
          <div className="rounded-3xl border border-border/60 bg-card/30 p-5 sm:p-6 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" /> Application Domain &amp; Origin Configuration
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Set custom base URLs for each application in the monorepo. Changes take effect instantly in client rendering and TanStack Start SSR.
              </p>
            </div>

            <div className="space-y-4">
              {apps.map((app) => {
                const Icon = app.icon;
                const value = config[app.id] ?? "";

                return (
                  <div
                    key={app.id}
                    className="p-4 rounded-2xl bg-secondary/15 border border-border/50 space-y-2 hover:border-border/70 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${app.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <Label htmlFor={app.id} className="text-xs font-bold text-foreground cursor-pointer">
                          {app.name}
                        </Label>
                      </div>
                      <span className="text-[11px] text-muted-foreground">{app.desc}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        id={app.id}
                        value={value}
                        onChange={(e) => setConfig((c) => ({ ...c, [app.id]: e.target.value }))}
                        placeholder={app.fallbackProd}
                        className="h-10 rounded-xl text-xs font-mono bg-background border-border/70 flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(value || app.fallbackProd, app.id)}
                        className="h-10 rounded-xl px-3 border-border/60"
                        title="Copy URL"
                      >
                        {copiedKey === app.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                      <a
                        href={value || app.fallbackProd}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-10 px-3 rounded-xl border border-border/60 bg-background text-muted-foreground hover:text-primary transition-colors"
                        title="Open App in New Tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 2: CTA & BUTTON TARGETS ────────────────────────────────────── */}
        <TabsContent value="cta" className="space-y-4">
          <div className="rounded-3xl border border-border/60 bg-card/30 p-5 sm:p-6 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" /> Cross-App CTA Targets &amp; Button Copy
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Customize where primary call-to-action buttons redirect visitors across apps, and override navigation labels.
              </p>
            </div>

            {/* Destination URLs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">"Shop" Button Target URL</Label>
                <Input
                  value={config.shop_url || ""}
                  onChange={(e) => setConfig((c) => ({ ...c, shop_url: e.target.value }))}
                  placeholder="https://shop.orizino.com/shop"
                  className="h-10 rounded-xl text-xs font-mono bg-background border-border/70"
                />
                <p className="text-[10px] text-muted-foreground">Overrides the "Shop" button in MasterPanel and BrandHome.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">"Start Shopping" Hero CTA</Label>
                <Input
                  value={config.start_shopping_url || ""}
                  onChange={(e) => setConfig((c) => ({ ...c, start_shopping_url: e.target.value }))}
                  placeholder="https://shop.orizino.com/shop"
                  className="h-10 rounded-xl text-xs font-mono bg-background border-border/70"
                />
                <p className="text-[10px] text-muted-foreground">Target URL for hero banner CTA buttons.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">"Explore Categories" CTA</Label>
                <Input
                  value={config.explore_categories_url || ""}
                  onChange={(e) => setConfig((c) => ({ ...c, explore_categories_url: e.target.value }))}
                  placeholder="https://shop.orizino.com/categories"
                  className="h-10 rounded-xl text-xs font-mono bg-background border-border/70"
                />
                <p className="text-[10px] text-muted-foreground">Target URL for categories discovery CTAs.</p>
              </div>
            </div>

            {/* Button Label Customization */}
            <div className="pt-4 border-t border-border/50 space-y-3">
              <h4 className="text-xs font-bold text-foreground">Navigation Button Text Overrides</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">BrandHome Nav "Shop" Label</Label>
                  <Input
                    value={config.shop_label || ""}
                    onChange={(e) => setConfig((c) => ({ ...c, shop_label: e.target.value }))}
                    placeholder="Shop"
                    className="h-10 rounded-xl text-xs bg-background border-border/70"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">MasterPanel "Back to Shop" Label</Label>
                  <Input
                    value={config.back_to_shop_label || ""}
                    onChange={(e) => setConfig((c) => ({ ...c, back_to_shop_label: e.target.value }))}
                    placeholder="Back to Shop"
                    className="h-10 rounded-xl text-xs bg-background border-border/70"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">MasterPanel Compact Label</Label>
                  <Input
                    value={config.back_to_shop_label_short || ""}
                    onChange={(e) => setConfig((c) => ({ ...c, back_to_shop_label_short: e.target.value }))}
                    placeholder="Shop"
                    className="h-10 rounded-xl text-xs bg-background border-border/70"
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 3: ROUTE ALIASES & UTM TRACKING ─────────────────────────────── */}
        <TabsContent value="routes" className="space-y-4">
          <div className="rounded-3xl border border-border/60 bg-card/30 p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary" /> Route Aliases &amp; Tracking Policies
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure custom path redirects (e.g. <code>/pos</code> → Order Ops) and query parameter forwarding.
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setConfig((c) => ({
                    ...c,
                    custom_routes: [
                      ...(c.custom_routes || []),
                      {
                        id: String(Date.now()),
                        from: "/new-link",
                        to: "/target",
                        app: "storefront",
                        active: true,
                      },
                    ],
                  }))
                }
                className="h-8 rounded-xl text-xs gap-1.5 border-border/60 font-semibold"
              >
                <Plus className="w-3.5 h-3.5 text-primary" /> Add Route Alias
              </Button>
            </div>

            {/* UTM / Query Param Preservation Toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-border/60 bg-secondary/15">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">Preserve &amp; Forward Query Parameters</span>
                <span className="text-[11px] text-muted-foreground block">
                  Automatically forward UTM tags, referral IDs, and search parameters when redirecting users across apps.
                </span>
              </div>
              <Switch
                checked={config.preserve_query_params ?? true}
                onCheckedChange={(v) => setConfig((c) => ({ ...c, preserve_query_params: v }))}
              />
            </div>

            {/* Custom Routes Table */}
            <div className="space-y-2.5">
              {(config.custom_routes || []).map((route, idx) => (
                <div
                  key={route.id || idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-secondary/20 border border-border/40"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={route.from}
                      onChange={(e) => {
                        const arr = [...(config.custom_routes || [])];
                        arr[idx].from = e.target.value;
                        setConfig((c) => ({ ...c, custom_routes: arr }));
                      }}
                      placeholder="/alias"
                      className="h-8 rounded-lg text-xs font-mono bg-background max-w-[160px]"
                    />
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <select
                      value={route.app}
                      onChange={(e) => {
                        const arr = [...(config.custom_routes || [])];
                        arr[idx].app = e.target.value as any;
                        setConfig((c) => ({ ...c, custom_routes: arr }));
                      }}
                      className="h-8 rounded-lg text-xs bg-background border border-border/70 px-2 font-semibold text-foreground focus:outline-none"
                    >
                      <option value="storefront">Storefront Hub</option>
                      <option value="brandhome">Brand Home</option>
                      <option value="masterpanel">Master Panel</option>
                      <option value="orderops">Order Ops (Mobile)</option>
                      <option value="explore">Explore Studio</option>
                    </select>
                    <Input
                      value={route.to}
                      onChange={(e) => {
                        const arr = [...(config.custom_routes || [])];
                        arr[idx].to = e.target.value;
                        setConfig((c) => ({ ...c, custom_routes: arr }));
                      }}
                      placeholder="/destination"
                      className="h-8 rounded-lg text-xs font-mono bg-background flex-1"
                    />
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                      <Switch
                        checked={route.active}
                        onCheckedChange={(v) => {
                          const arr = [...(config.custom_routes || [])];
                          arr[idx].active = v;
                          setConfig((c) => ({ ...c, custom_routes: arr }));
                        }}
                      />
                      <span className="text-[11px]">{route.active ? "Active" : "Paused"}</span>
                    </label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const arr = (config.custom_routes || []).filter((_, i) => i !== idx);
                        setConfig((c) => ({ ...c, custom_routes: arr }));
                      }}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 4: ROUTE SIMULATOR & TESTER ─────────────────────────────────── */}
        <TabsContent value="tester" className="space-y-4">
          <div className="rounded-3xl border border-border/60 bg-card/30 p-5 sm:p-6 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Play className="w-4 h-4 text-primary" /> Live Cross-App Redirection Simulator
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Simulate clicking any navigation link or CTA from any app to inspect the final resolved destination URL.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Originating Source App</Label>
                <select
                  value={simSourceApp}
                  onChange={(e) => setSimSourceApp(e.target.value as any)}
                  className="w-full h-10 rounded-xl text-xs bg-background border border-border/70 px-3 font-semibold text-foreground focus:outline-none"
                >
                  <option value="brandhome">Brand Home (orizino.com)</option>
                  <option value="storefront">Storefront Hub (shop.orizino.com)</option>
                  <option value="masterpanel">Master Panel (mp.orizino.com)</option>
                  <option value="orderops">Order Ops (om.orizino.com)</option>
                  <option value="explore">Explore Studio (explore.orizino.com)</option>
                </select>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold">Test Path / Action Target</Label>
                <Input
                  value={simPath}
                  onChange={(e) => setSimPath(e.target.value)}
                  placeholder="/shop?utm_source=fb"
                  className="h-10 rounded-xl text-xs font-mono bg-background border-border/70"
                />
              </div>
            </div>

            {/* Resolved Output Visualizer */}
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Resolved Runtime Destination:
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(resolvedSimulatorTarget, "sim-target")}
                  className="h-7 text-[11px] gap-1 px-2.5 border-border/60"
                >
                  {copiedKey === "sim-target" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  Copy URL
                </Button>
              </div>

              <div className="p-3 rounded-xl bg-background border border-border/70 font-mono text-xs text-primary break-all select-all">
                {resolvedSimulatorTarget}
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-muted-foreground">
                  Ready for live navigation verification:
                </span>
                <a
                  href={resolvedSimulatorTarget}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  Test in Browser <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
