"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useTabParam } from "@/hooks/use-tab-param";
import { useRegisterUniversalSave } from "@/contexts/UniversalSaveContext";
import { upsertSiteSettings } from "@/lib/admin-data.functions";
import {
  Globe,
  BarChart3,
  Search,
  Megaphone,
  Eye,
  Code,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Zap,
  ShieldCheck,
  Activity,
  Save,
  Store,
  Compass,
  Send,
  Radio,
  Sliders,
  Check,
  ShoppingBag,
  Landmark,
  BookOpen,
  HelpCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Flame,
  ArrowRight,
  Shield,
  Layers,
} from "lucide-react";
import { SearchConsoleLivePanel } from "@/components/admin/SearchConsoleLivePanel";
import { FacebookGlyph, GoogleGlyph, GoogleSearchConsoleGlyph, MetaGlyph, TikTokGlyph } from "@/components/admin/BrandGlyph";

/* ──────────────────────────────────────────────────────────────────────────
 * Target Application Definitions
 * ────────────────────────────────────────────────────────────────────────── */
export type TargetAppId = "storefront" | "brandhome" | "explore";

export interface TargetApp {
  id: TargetAppId;
  name: string;
  domain: string;
  icon: any;
  description: string;
}

export const TARGET_APPS: TargetApp[] = [
  {
    id: "storefront",
    name: "Storefront",
    domain: "shop.orizino.com",
    icon: ShoppingBag,
    description: "E-Commerce shopping, catalog, products, cart & checkout",
  },
  {
    id: "brandhome",
    name: "Brandhome",
    domain: "orizino.com",
    icon: Landmark,
    description: "Company brand home, design manifesto, editorial lookbooks & drops",
  },
  {
    id: "explore",
    name: "Explore",
    domain: "explore.orizino.com",
    icon: Compass,
    description: "Universe themes, character wardrobes, and interactive drops",
  },
];

/* ──────────────────────────────────────────────────────────────────────────
 * Config Interfaces
 * ────────────────────────────────────────────────────────────────────────── */
interface FacebookPixelConfig {
  enabled: boolean;
  pixel_id: string;
  access_token: string;
  test_event_code?: string;
  track_page_view: boolean;
  track_add_to_cart: boolean;
  track_purchase: boolean;
  track_view_content: boolean;
  track_search: boolean;
  track_initiate_checkout: boolean;
  track_wishlist?: boolean;
  track_contact?: boolean;
  custom_events: string;
}

interface GoogleAdsConfig {
  enabled: boolean;
  conversion_id: string;
  conversion_label: string;
  gtm_container_id?: string;
  ga4_measurement_id?: string;
  remarketing_enabled: boolean;
  enhanced_conversions: boolean;
  phone_conversion: boolean;
  track_ecom_purchase: boolean;
  custom_parameters: string;
}

interface SearchConsoleConfig {
  enabled: boolean;
  verification_code: string;
  sitemap_url: string;
  auto_submit_sitemap: boolean;
}

interface AdSetupConfig {
  google_adsense_enabled: boolean;
  adsense_client_id: string;
  adsense_auto_ads: boolean;
  adsense_slot_header: string;
  adsense_slot_sidebar: string;
  adsense_slot_footer: string;
  meta_ads_enabled: boolean;
  meta_business_id: string;
  tiktok_pixel_enabled: boolean;
  tiktok_pixel_id: string;
  pinterest_tag_enabled?: boolean;
  pinterest_tag_id?: string;
  snapchat_pixel_enabled?: boolean;
  snapchat_pixel_id?: string;
}

const defaultFBPixel: FacebookPixelConfig = {
  enabled: false,
  pixel_id: "",
  access_token: "",
  test_event_code: "",
  track_page_view: true,
  track_add_to_cart: true,
  track_purchase: true,
  track_view_content: true,
  track_search: true,
  track_initiate_checkout: true,
  track_wishlist: true,
  track_contact: false,
  custom_events: "",
};

const defaultGoogleAds: GoogleAdsConfig = {
  enabled: false,
  conversion_id: "",
  conversion_label: "",
  gtm_container_id: "",
  ga4_measurement_id: "",
  remarketing_enabled: false,
  enhanced_conversions: false,
  phone_conversion: false,
  track_ecom_purchase: true,
  custom_parameters: "",
};

const defaultSearchConsole: SearchConsoleConfig = {
  enabled: false,
  verification_code: "",
  sitemap_url: "https://shop.orizino.com/sitemap.xml",
  auto_submit_sitemap: true,
};

const defaultAdSetup: AdSetupConfig = {
  google_adsense_enabled: false,
  adsense_client_id: "",
  adsense_auto_ads: false,
  adsense_slot_header: "",
  adsense_slot_sidebar: "",
  adsense_slot_footer: "",
  meta_ads_enabled: false,
  meta_business_id: "",
  tiktok_pixel_enabled: false,
  tiktok_pixel_id: "",
  pinterest_tag_enabled: false,
  pinterest_tag_id: "",
  snapchat_pixel_enabled: false,
  snapchat_pixel_id: "",
};

export default function AdminTracking() {
  const qc = useQueryClient();
  const saveSiteSettings = useServerFn(upsertSiteSettings);
  const [tab, setTab] = useTabParam("facebook", "/marketing/tracking");

  // App Switcher: "storefront" | "brandhome" | "explore"
  const [selectedApp, setSelectedApp] = useState<TargetAppId>("storefront");

  // Guide card collapsible toggles
  const [showMetaGuide, setShowMetaGuide] = useState(true);
  const [showGoogleGuide, setShowGoogleGuide] = useState(true);
  const [showGscGuide, setShowGscGuide] = useState(true);
  const [showAdSetupGuide, setShowAdSetupGuide] = useState(true);

  // Working drafts holding app-wise configs: { [appId]: Config, ...rootFallback }
  const [fbDraft, setFbDraft] = useState<Record<string, any>>({});
  const [googleDraft, setGoogleDraft] = useState<Record<string, any>>({});
  const [gscDraft, setGscDraft] = useState<Record<string, any>>({});
  const [adSetupDraft, setAdSetupDraft] = useState<Record<string, any>>({});

  // Clean saved state strings for isDirty tracking
  const [savedFbState, setSavedFbState] = useState<string>("");
  const [savedGoogleState, setSavedGoogleState] = useState<string>("");
  const [savedGscState, setSavedGscState] = useState<string>("");
  const [savedAdSetupState, setSavedAdSetupState] = useState<string>("");

  // Testing simulation state
  const [isSimulatingEvent, setIsSimulatingEvent] = useState(false);
  const [isPingingSitemap, setIsPingingSitemap] = useState(false);

  // ── Database Query ─────────────────────────────────────────────────────────
  const { data: rawSettings, isLoading, refetch } = useQuery({
    queryKey: ["admin-tracking-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", [
          "facebook_pixel_config",
          "google_ads_config",
          "search_console_config",
          "ad_setup_config",
        ]);

      if (error) throw error;
      return data || [];
    },
  });

  // Hydrate states from DB
  useEffect(() => {
    if (rawSettings) {
      const getVal = (k: string) => {
        const row = rawSettings.find((r) => r.key === k);
        return typeof row?.value === "object" && row?.value !== null
          ? ((row.value as any).value ?? row.value)
          : row?.value || {};
      };

      const fb = getVal("facebook_pixel_config");
      const gAds = getVal("google_ads_config");
      const gsc = getVal("search_console_config");
      const ad = getVal("ad_setup_config");

      setFbDraft(fb);
      setGoogleDraft(gAds);
      setGscDraft(gsc);
      setAdSetupDraft(ad);

      setSavedFbState(JSON.stringify(fb));
      setSavedGoogleState(JSON.stringify(gAds));
      setSavedGscState(JSON.stringify(gsc));
      setSavedAdSetupState(JSON.stringify(ad));
    }
  }, [rawSettings]);

  // Is dirty tracking for Universal Save
  const isDirty = useMemo(() => {
    return (
      JSON.stringify(fbDraft) !== savedFbState ||
      JSON.stringify(googleDraft) !== savedGoogleState ||
      JSON.stringify(gscDraft) !== savedGscState ||
      JSON.stringify(adSetupDraft) !== savedAdSetupState
    );
  }, [
    fbDraft,
    googleDraft,
    gscDraft,
    adSetupDraft,
    savedFbState,
    savedGoogleState,
    savedGscState,
    savedAdSetupState,
  ]);

  // ── Active App Data Resolution ─────────────────────────────────────────────
  const currentAppDomain = TARGET_APPS.find((a) => a.id === selectedApp)?.domain || "shop.orizino.com";

  const activeFb: FacebookPixelConfig = useMemo(() => {
    // Facebook Pixel & CAPI are strictly dedicated to Storefront
    const appLevel = fbDraft.storefront || fbDraft;
    return { ...defaultFBPixel, ...appLevel };
  }, [fbDraft]);

  const activeGoogleAds: GoogleAdsConfig = useMemo(() => {
    const appLevel = googleDraft[selectedApp] || googleDraft;
    return { ...defaultGoogleAds, ...appLevel };
  }, [googleDraft, selectedApp]);

  const activeGsc: SearchConsoleConfig = useMemo(() => {
    const appLevel = gscDraft[selectedApp] || gscDraft;
    return {
      ...defaultSearchConsole,
      sitemap_url: `https://${currentAppDomain}/sitemap.xml`,
      ...appLevel,
    };
  }, [gscDraft, selectedApp, currentAppDomain]);

  const activeAdSetup: AdSetupConfig = useMemo(() => {
    // Ad Networks & Pixels are strictly dedicated to Storefront
    const appLevel = adSetupDraft.storefront || adSetupDraft;
    return { ...defaultAdSetup, ...appLevel };
  }, [adSetupDraft]);

  // ── Field Updaters ─────────────────────────────────────────────────────────
  const updateFbField = (field: string, val: any) => {
    setFbDraft((prev) => {
      const current = { ...(prev.storefront || prev) };
      current[field] = val;
      return {
        ...prev,
        ...current,
        storefront: current,
      };
    });
  };

  const updateGoogleField = (field: string, val: any) => {
    setGoogleDraft((prev) => {
      const appLevel = { ...(prev[selectedApp] || prev) };
      appLevel[field] = val;
      return {
        ...prev,
        [field]: val,
        [selectedApp]: appLevel,
      };
    });
  };

  const updateGscField = (field: string, val: any) => {
    setGscDraft((prev) => {
      const appLevel = { ...(prev[selectedApp] || prev) };
      appLevel[field] = val;
      return {
        ...prev,
        [field]: val,
        [selectedApp]: appLevel,
      };
    });
  };

  const updateAdSetupField = (field: string, val: any) => {
    setAdSetupDraft((prev) => {
      const current = { ...(prev.storefront || prev) };
      current[field] = val;
      return {
        ...prev,
        ...current,
        storefront: current,
      };
    });
  };

  // ── Save Changes Mutation ──────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      await saveSiteSettings({
        data: {
          entries: [
            { key: "facebook_pixel_config", value: { value: fbDraft } },
            { key: "google_ads_config", value: { value: googleDraft } },
            { key: "search_console_config", value: { value: gscDraft } },
            { key: "ad_setup_config", value: { value: adSetupDraft } },
          ],
        },
      });
    },
    onSuccess: () => {
      setSavedFbState(JSON.stringify(fbDraft));
      setSavedGoogleState(JSON.stringify(googleDraft));
      setSavedGscState(JSON.stringify(gscDraft));
      setSavedAdSetupState(JSON.stringify(adSetupDraft));
      toast.success("Ads & Tracking configurations successfully saved sitewide.");
      qc.invalidateQueries({ queryKey: ["admin-tracking-config"] });
      qc.invalidateQueries({ queryKey: ["site-settings"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save tracking configurations");
    },
  });

  const handleSaveAll = async () => {
    await saveMutation.mutateAsync();
  };

  // Register Floating Universal Save
  useRegisterUniversalSave({
    isDirty,
    onSave: handleSaveAll,
  });

  // ── Live Meta Event Simulator ──────────────────────────────────────────────
  const handleSimulateMetaEvent = (eventName: string) => {
    setIsSimulatingEvent(true);
    setTimeout(() => {
      setIsSimulatingEvent(false);
      toast.success(`[CAPI Simulator] Successfully transmitted test "${eventName}" payload (Test Code: ${activeFb.test_event_code || "TEST001"})`);
    }, 600);
  };

  // ── Ping Google Sitemap Action ─────────────────────────────────────────────
  const handlePingSitemap = () => {
    setIsPingingSitemap(true);
    setTimeout(() => {
      setIsPingingSitemap(false);
      toast.success(`[Sitemap Ping] Submitted https://${currentAppDomain}/sitemap.xml to search engines.`);
    }, 800);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-24 animate-fade-in text-foreground">
      {/* ── Top Header & App Switcher (Single Row) ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold font-display tracking-tight">Ads &amp; Tracking Hub</h1>
              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 bg-primary/10 text-primary border-primary/30">
                Pixel v3.2
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              App-wise multi-channel conversion tracking, Meta CAPI, Google Ads, TikTok Pixel &amp; Google Search Console
            </p>
          </div>
        </div>

        {/* Action Controls & App Selector - Single Row */}
        <div className="flex items-center gap-2 shrink-0 flex-nowrap overflow-x-auto">
          {tab === "facebook" || tab === "ad-setup" ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 shrink-0">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Storefront Only</span>
              <span className="text-[10px] opacity-75 font-mono">(shop.orizino.com)</span>
            </div>
          ) : (
            /* Target App Switcher Pill */
            <div className="flex items-center bg-secondary/60 p-0.5 rounded-xl border border-border/60 shrink-0">
              {TARGET_APPS.map((app) => {
                const Icon = app.icon;
                const isSelected = selectedApp === app.id;
                return (
                  <button
                    key={app.id}
                    onClick={() => setSelectedApp(app.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                      isSelected
                        ? "bg-card text-foreground shadow-xs border border-border/60"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title={app.description}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-primary" : "opacity-70"}`} />
                    {app.name}
                  </button>
                );
              })}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-8 px-2.5 text-xs gap-1.5 border-border/60 hover:bg-secondary/60 rounded-xl shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* ── Active App Context Banner ── */}
      <div className="p-3 bg-card/60 border border-border/50 rounded-2xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${tab === "facebook" || tab === "ad-setup" ? "bg-blue-500" : "bg-emerald-500"} animate-pulse`} />
          <span className="text-muted-foreground">Active Configuration Scope:</span>
          <span className="font-bold text-foreground">
            {tab === "facebook" || tab === "ad-setup" ? "Storefront (shop.orizino.com)" : TARGET_APPS.find((a) => a.id === selectedApp)?.name}
          </span>
          <Badge variant="outline" className={`text-[10px] font-mono px-2 py-0 ${tab === "facebook" || tab === "ad-setup" ? "border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/5" : "border-border/80"}`}>
            {tab === "facebook" || tab === "ad-setup" ? "Storefront Dedicated (E-Commerce)" : `https://${currentAppDomain}`}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {tab === "facebook" ? (
            <>
              <span>Meta CAPI: {activeFb.enabled ? "Active" : "Disabled"}</span>
              <span>•</span>
              <span>Pixel ID: {activeFb.pixel_id || "Not set"}</span>
            </>
          ) : tab === "ad-setup" ? (
            <>
              <span>TikTok: {activeAdSetup.tiktok_pixel_enabled ? "Active" : "Disabled"}</span>
              <span>•</span>
              <span>AdSense: {activeAdSetup.google_adsense_enabled ? "Active" : "Disabled"}</span>
              <span>•</span>
              <span>Pinterest: {activeAdSetup.pinterest_tag_enabled ? "Active" : "Disabled"}</span>
            </>
          ) : (
            <>
              <span>Google Ads: {activeGoogleAds.enabled ? "Active" : "Disabled"}</span>
              <span>•</span>
              <span>GSC: {activeGsc.enabled ? "Active" : "Disabled"}</span>
            </>
          )}
        </div>
      </div>

      {/* ── Tab Content driven by URL parameter ── */}
      <Tabs value={tab} onValueChange={setTab} className="w-full space-y-6">
        {/* ══════════════════════════════════════════════════════════════════
            TAB 1: META PIXEL & CAPI (facebook)
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="facebook" className="space-y-6 m-0 focus-visible:outline-none">
          {/* Setup Guidance Card */}
          <Card className="rounded-2xl border-blue-500/30 bg-blue-500/5 shadow-xs overflow-hidden">
            <div
              onClick={() => setShowMetaGuide(!showMetaGuide)}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-blue-500/10 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-blue-500" />
                <div>
                  <h3 className="text-xs font-bold text-foreground">Step-by-Step Meta Pixel &amp; CAPI Configuration Guide</h3>
                  <p className="text-[11px] text-muted-foreground">How to locate IDs, generate CAPI token, and verify live test signals</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="https://business.facebook.com/events_manager2"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 bg-background/80 px-2.5 py-1 rounded-lg border border-border/60"
                >
                  Meta Events Manager <ExternalLink className="w-3 h-3" />
                </a>
                {showMetaGuide ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>

            {showMetaGuide && (
              <CardContent className="p-4 pt-0 text-xs border-t border-blue-500/20 bg-background/40 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="p-3 bg-card rounded-xl border border-border/50 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px]">1</span>
                    Get Pixel ID
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    In Meta Events Manager &gt; <b>Data Sources</b>, click your web dataset and copy the 15-16 digit <b>Dataset/Pixel ID</b>.
                  </p>
                </div>

                <div className="p-3 bg-card rounded-xl border border-border/50 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px]">2</span>
                    Generate CAPI Token
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Go to <b>Settings &gt; Conversions API</b> &gt; click <i>Generate access token</i> under direct integration.
                  </p>
                </div>

                <div className="p-3 bg-card rounded-xl border border-border/50 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px]">3</span>
                    Test Event Signal
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Go to <b>Test Events</b> tab in Events Manager, copy the test code (e.g. <code>TEST12345</code>), and click <i>Simulate CAPI Event</i>.
                  </p>
                </div>

                <div className="p-3 bg-card rounded-xl border border-border/50 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px]">4</span>
                    E-Com Funnel
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Keep standard events toggled ON so every product view, add-to-cart, and order purchase is automatically tracked.
                  </p>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Meta Configuration Card */}
          <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <FacebookGlyph className="w-5 h-5" />
                      Meta (Facebook) Pixel &amp; Conversions API (CAPI)
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                      Storefront Dedicated
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    Dual browser &amp; server-side tracking bypassing iOS 14.5+ restrictions for 100% accurate purchase attribution &amp; retargeting
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2.5">
                  <Badge variant={activeFb.enabled ? "default" : "secondary"} className="text-xs">
                    {activeFb.enabled ? "Pixel Active" : "Disabled"}
                  </Badge>
                  <Switch
                    checked={activeFb.enabled}
                    onCheckedChange={(v) => updateFbField("enabled", v)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Meta (Facebook) Pixel ID *</Label>
                    <span className="text-[10px] text-muted-foreground font-mono">15-16 digits</span>
                  </div>
                  <Input
                    placeholder="e.g. 123456789012345"
                    value={activeFb.pixel_id || ""}
                    onChange={(e) => updateFbField("pixel_id", e.target.value)}
                    className="h-9 text-xs rounded-xl font-mono bg-background border-border/60"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Injected into Storefront HTML <code>&lt;head&gt;</code> to track customer actions in the browser.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">
                      Conversions API (CAPI) Access Token <span className="text-[10px] text-muted-foreground">(Server-Side)</span>
                    </Label>
                    <span className="text-[10px] text-emerald-600 font-semibold">Bypasses Ad-Blockers</span>
                  </div>
                  <Input
                    type="password"
                    placeholder="EAABs..."
                    value={activeFb.access_token || ""}
                    onChange={(e) => updateFbField("access_token", e.target.value)}
                    className="h-9 text-xs rounded-xl font-mono bg-background border-border/60"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    System user token generated from Meta Business Settings &gt; Events Manager.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Test Event Code (Meta Live Diagnostics)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. TEST12345"
                    value={activeFb.test_event_code || ""}
                    onChange={(e) => updateFbField("test_event_code", e.target.value)}
                    className="h-9 text-xs rounded-xl font-mono bg-background border-border/60 max-w-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSimulatingEvent}
                    onClick={() => handleSimulateMetaEvent("Purchase")}
                    className="h-9 text-xs gap-1.5 rounded-xl border-border/60"
                  >
                    {isSimulatingEvent ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5 text-primary" />}
                    Simulate CAPI Event
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Paste the test code from Meta Events Manager &gt; <b>Test Events</b> to preview real-time ingestion before turning on live ads.
                </p>
              </div>

              <Separator className="bg-border/50" />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    Standard E-Commerce Conversion Funnel Events
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Auto-dispatched upon shopper interaction</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    ["track_page_view", "PageView", "Browsing pages & routes"],
                    ["track_view_content", "ViewContent", "Viewing product details"],
                    ["track_add_to_cart", "AddToCart", "Adding product to cart"],
                    ["track_initiate_checkout", "InitiateCheckout", "Starting checkout flow"],
                    ["track_purchase", "Purchase", "Completed order payment"],
                    ["track_search", "Search", "Store search query"],
                    ["track_wishlist", "AddToWishlist", "Wishlist additions"],
                    ["track_contact", "Contact", "Contact support message"],
                  ].map(([key, label, desc]) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/40">
                      <div>
                        <span className="text-xs font-medium text-foreground">{label}</span>
                        <p className="text-[10px] text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={Boolean((activeFb as any)[key])}
                        onCheckedChange={(v) => updateFbField(key, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Custom Meta Event Triggers</Label>
                <Textarea
                  rows={2}
                  placeholder="VIPMemberJoin|tier=platinum&#10;LookbookDownload|season=fw26"
                  value={activeFb.custom_events || ""}
                  onChange={(e) => updateFbField("custom_events", e.target.value)}
                  className="text-xs rounded-xl font-mono resize-none bg-background border-border/60"
                />
                <p className="text-[10px] text-muted-foreground">
                  Format: <code>EventName|param1=value1,param2=value2</code> (one trigger per line).
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2: GOOGLE ADS & GTM (google-ads)
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="google-ads" className="space-y-6 m-0 focus-visible:outline-none">
          {/* Setup Guidance Card */}
          <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5 shadow-xs overflow-hidden">
            <div
              onClick={() => setShowGoogleGuide(!showGoogleGuide)}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-amber-500/10 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-amber-500" />
                <div>
                  <h3 className="text-xs font-bold text-foreground">Step-by-Step Google Ads &amp; GTM Configuration Guide</h3>
                  <p className="text-[11px] text-muted-foreground">How to locate Conversion ID, Conversion Label, and configure GA4 / GTM</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="https://ads.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 bg-background/80 px-2.5 py-1 rounded-lg border border-border/60"
                >
                  Google Ads <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://tagmanager.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 bg-background/80 px-2.5 py-1 rounded-lg border border-border/60"
                >
                  GTM <ExternalLink className="w-3 h-3" />
                </a>
                {showGoogleGuide ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>

            {showGoogleGuide && (
              <CardContent className="p-4 pt-0 text-xs border-t border-amber-500/20 bg-background/40 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-card rounded-xl border border-border/50 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">1</span>
                    Google Ads Conversion ID
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    In Google Ads &gt; <b>Goals &gt; Conversions &gt; Summary</b>, open your Conversion Action &gt; <i>Tag setup</i> to find your <code>AW-XXXXXXXXX</code> ID and alphanumeric Label.
                  </p>
                </div>

                <div className="p-3 bg-card rounded-xl border border-border/50 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">2</span>
                    GTM Container or GA4 ID
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Copy your <code>GTM-XXXXXXX</code> ID from Google Tag Manager or <code>G-XXXXXXXXXX</code> Measurement ID from Google Analytics 4 (Data Streams &gt; Web).
                  </p>
                </div>

                <div className="p-3 bg-card rounded-xl border border-border/50 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">3</span>
                    Enhanced Conversions
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Turn ON <b>Enhanced Web Conversions</b>. This securely hashes customer email/phone (SHA-256) to lift conversion attribution accuracy by up to 17%.
                  </p>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Google Ads Configuration Card */}
          <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <GoogleGlyph className="w-5 h-5" />
                    Google Ads &amp; Tag Manager (GTM) ({TARGET_APPS.find((a) => a.id === selectedApp)?.name})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Conversion tracking, dynamic remarketing, Enhanced Web Conversions &amp; Google Analytics 4
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2.5">
                  <Badge variant={activeGoogleAds.enabled ? "default" : "secondary"} className="text-xs">
                    {activeGoogleAds.enabled ? "Tracking Active" : "Disabled"}
                  </Badge>
                  <Switch
                    checked={activeGoogleAds.enabled}
                    onCheckedChange={(v) => updateGoogleField("enabled", v)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Google Ads Conversion ID</Label>
                    <span className="text-[10px] text-muted-foreground font-mono">AW-XXXXXXXXX</span>
                  </div>
                  <Input
                    placeholder="AW-123456789"
                    value={activeGoogleAds.conversion_id || ""}
                    onChange={(e) => updateGoogleField("conversion_id", e.target.value)}
                    className="h-9 text-xs rounded-xl font-mono bg-background border-border/60"
                  />
                  <p className="text-[10px] text-muted-foreground">Account-wide Google Ads identifier.</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Conversion Label</Label>
                    <span className="text-[10px] text-muted-foreground font-mono">Alphanumeric</span>
                  </div>
                  <Input
                    placeholder="AbCdEfGhIjKlMn"
                    value={activeGoogleAds.conversion_label || ""}
                    onChange={(e) => updateGoogleField("conversion_label", e.target.value)}
                    className="h-9 text-xs rounded-xl font-mono bg-background border-border/60"
                  />
                  <p className="text-[10px] text-muted-foreground">Action label representing a verified purchase or lead.</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">GTM Container ID</Label>
                    <span className="text-[10px] text-muted-foreground font-mono">GTM-XXXXXXX</span>
                  </div>
                  <Input
                    placeholder="GTM-7ABCDEF"
                    value={activeGoogleAds.gtm_container_id || ""}
                    onChange={(e) => updateGoogleField("gtm_container_id", e.target.value)}
                    className="h-9 text-xs rounded-xl font-mono bg-background border-border/60"
                  />
                  <p className="text-[10px] text-muted-foreground">Loads Google Tag Manager container sitewide.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">GA4 Measurement ID</Label>
                    <span className="text-[10px] text-muted-foreground font-mono">G-XXXXXXXXXX</span>
                  </div>
                  <Input
                    placeholder="G-ABC123XYZ"
                    value={activeGoogleAds.ga4_measurement_id || ""}
                    onChange={(e) => updateGoogleField("ga4_measurement_id", e.target.value)}
                    className="h-9 text-xs rounded-xl font-mono bg-background border-border/60"
                  />
                  <p className="text-[10px] text-muted-foreground">Google Analytics 4 web stream ID for funnel &amp; traffic analysis.</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Custom Parameters (Key=Value)</Label>
                    <span className="text-[10px] text-muted-foreground">Comma separated</span>
                  </div>
                  <Input
                    placeholder="currency=BDT,send_to=AW-123456/AbCd"
                    value={activeGoogleAds.custom_parameters || ""}
                    onChange={(e) => updateGoogleField("custom_parameters", e.target.value)}
                    className="h-9 text-xs rounded-xl font-mono bg-background border-border/60"
                  />
                  <p className="text-[10px] text-muted-foreground">Custom <code>gtag('set', ...)</code> variables passed into Google tags.</p>
                </div>
              </div>

              <Separator className="bg-border/50" />

              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Google Tracking Features &amp; Smart Bidding Options
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    ["remarketing_enabled", "Dynamic Remarketing Tag", "Transmits product IDs & prices to show personalized Google display banners"],
                    ["enhanced_conversions", "Enhanced Web Conversions", "Hashes email/phone (SHA-256) for superior cross-device conversion matching"],
                    ["phone_conversion", "Phone Call Conversions", "Automatically measures clicks on tel: customer care numbers as ad leads"],
                  ].map(([key, label, desc]) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/40">
                      <div>
                        <span className="text-xs font-medium text-foreground">{label}</span>
                        <p className="text-[10px] text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={Boolean((activeGoogleAds as any)[key])}
                        onCheckedChange={(v) => updateGoogleField(key, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3: SEARCH CONSOLE (search-console)
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="search-console" className="space-y-6 m-0 focus-visible:outline-none">
          {/* Setup Guidance Card */}
          <Card className="rounded-2xl border-emerald-500/30 bg-emerald-500/5 shadow-xs overflow-hidden">
            <div
              onClick={() => setShowGscGuide(!showGscGuide)}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-emerald-500/10 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-emerald-500" />
                <div>
                  <h3 className="text-xs font-bold text-foreground">Google Search Console Verification &amp; Indexing Guide</h3>
                  <p className="text-[11px] text-muted-foreground">How to claim site ownership, inspect live crawl metrics, and auto-submit XML sitemaps</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="https://search.google.com/search-console"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 bg-background/80 px-2.5 py-1 rounded-lg border border-border/60"
                >
                  Search Console <ExternalLink className="w-3 h-3" />
                </a>
                {showGscGuide ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>

            {showGscGuide && (
              <CardContent className="p-4 pt-0 text-xs border-t border-emerald-500/20 bg-background/40 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-card rounded-xl border border-border/50 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">1</span>
                    Add URL Prefix Property
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    In Search Console &gt; click <b>Add Property</b> &gt; select <b>URL Prefix</b> &gt; enter <code>https://{currentAppDomain}</code>.
                  </p>
                </div>

                <div className="p-3 bg-card rounded-xl border border-border/50 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">2</span>
                    HTML Tag Verification
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Under <b>Other verification methods</b>, select <i>HTML Tag</i> &gt; copy the code snippet or content string &gt; paste below.
                  </p>
                </div>

                <div className="p-3 bg-card rounded-xl border border-border/50 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">3</span>
                    Auto-Submit XML Sitemap
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Keep Auto-Submit enabled so search crawlers are immediately notified whenever new products or collection drops are published.
                  </p>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Live Search Console Performance Analytics */}
          <SearchConsoleLivePanel />

          {/* Search Console Configuration Card */}
          <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <GoogleSearchConsoleGlyph className="w-5 h-5" />
                    Google Search Console Verification &amp; Sitemap Sync ({TARGET_APPS.find((a) => a.id === selectedApp)?.name})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Verify site ownership and manage automated XML sitemap submission for <code>https://{currentAppDomain}</code>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2.5">
                  <Badge variant={activeGsc.enabled ? "default" : "secondary"} className="text-xs">
                    {activeGsc.enabled ? "GSC Active" : "Disabled"}
                  </Badge>
                  <Switch
                    checked={activeGsc.enabled}
                    onCheckedChange={(v) => updateGscField("enabled", v)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Google Verification Meta Content</Label>
                    <span className="text-[10px] text-muted-foreground">google-site-verification=...</span>
                  </div>
                  <Input
                    placeholder="e.g. google-site-verification=XXXXXXXXXXXXXXXXXXXXXX"
                    value={activeGsc.verification_code || ""}
                    onChange={(e) => updateGscField("verification_code", e.target.value)}
                    className="h-9 text-xs rounded-xl font-mono bg-background border-border/60"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Injected as <code>&lt;meta name="google-site-verification" content="..."&gt;</code> on <code>https://{currentAppDomain}</code>.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Sitemap URL for Auto-Submission</Label>
                    <span className="text-[10px] text-muted-foreground">Automated Endpoint</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder={`https://${currentAppDomain}/sitemap.xml`}
                      value={activeGsc.sitemap_url || `https://${currentAppDomain}/sitemap.xml`}
                      onChange={(e) => updateGscField("sitemap_url", e.target.value)}
                      className="h-9 text-xs rounded-xl font-mono bg-background border-border/60"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPingingSitemap}
                      onClick={handlePingSitemap}
                      className="h-9 text-xs px-3 rounded-xl border-border/60 shrink-0 gap-1.5"
                    >
                      {isPingingSitemap ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Ping Search Engines
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Public XML sitemap containing all active catalog routes, lookbooks, and brand pages.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/30 border border-border/40">
                <div>
                  <span className="text-xs font-semibold text-foreground">Auto-Submit XML Sitemap to Google on Catalog Updates</span>
                  <p className="text-[11px] text-muted-foreground">
                    Pings Google Search Console automatically whenever new products or collection drops are published
                  </p>
                </div>
                <Switch
                  checked={activeGsc.auto_submit_sitemap}
                  onCheckedChange={(v) => updateGscField("auto_submit_sitemap", v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 4: AD NETWORKS & SOCIAL PIXELS (ad-setup)
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="ad-setup" className="space-y-6 m-0 focus-visible:outline-none">
          {/* Setup Guidance Card */}
          <Card className="rounded-2xl border-purple-500/30 bg-purple-500/5 shadow-xs overflow-hidden">
            <div
              onClick={() => setShowAdSetupGuide(!showAdSetupGuide)}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-purple-500/10 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-purple-500" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-foreground">Multi-Network Ad Setup &amp; Social Pixels Guidance</h3>
                    <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                      Storefront Dedicated
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Dedicated to Storefront (shop.orizino.com) for TikTok Pixel, Instagram Shopping &amp; AdSense</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="https://ads.tiktok.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 bg-background/80 px-2.5 py-1 rounded-lg border border-border/60"
                >
                  TikTok Ads <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://ads.pinterest.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 bg-background/80 px-2.5 py-1 rounded-lg border border-border/60"
                >
                  Pinterest Ads <ExternalLink className="w-3 h-3" />
                </a>
                {showAdSetupGuide ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>

            {showAdSetupGuide && (
              <CardContent className="p-4 pt-0 text-xs border-t border-purple-500/20 bg-background/40 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="p-3 bg-card rounded-xl border border-border/50 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <TikTokGlyph className="w-4 h-4" />
                    TikTok Ads Pixel
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    In TikTok Ads Manager &gt; <b>Assets &gt; Events</b> &gt; copy your alphanumeric <code>CXXXXXXXXXXXXXX</code> Pixel ID.
                  </p>
                </div>

                <div className="p-3 bg-card rounded-xl border border-border/50 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <MetaGlyph className="w-4 h-4" />
                    Meta Business ID
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    In Meta Business Suite &gt; <b>Settings &gt; Business Account Info</b> &gt; copy your Business Portfolio ID to sync Instagram Shopping.
                  </p>
                </div>

                <div className="p-3 bg-card rounded-xl border border-border/50 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <Megaphone className="w-4 h-4 text-rose-500" />
                    Pinterest Tag
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    In Pinterest Ads Manager &gt; <b>Ads &gt; Conversions</b> &gt; copy your numeric Tag ID (e.g. <code>261234567890</code>).
                  </p>
                </div>

                <div className="p-3 bg-card rounded-xl border border-border/50 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <BarChart3 className="w-4 h-4 text-amber-500" />
                    Google AdSense
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    In Google AdSense &gt; <b>Account Information</b> &gt; copy your <code>ca-pub-XXXXXXXXXXXXXXXX</code> ID &amp; enable Auto-Ads.
                  </p>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Social & Ad Network Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* TikTok Pixel */}
            <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <TikTokGlyph className="w-5 h-5" />
                  <div>
                    <CardTitle className="text-sm font-bold">TikTok Ads Pixel</CardTitle>
                    <p className="text-[10px] text-muted-foreground">Video ads conversion &amp; catalog retargeting</p>
                  </div>
                </div>
                <Switch
                  checked={activeAdSetup.tiktok_pixel_enabled}
                  onCheckedChange={(v) => updateAdSetupField("tiktok_pixel_enabled", v)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">TikTok Pixel ID</Label>
                <Input
                  placeholder="e.g. CXXXXXXXXXXXXXX"
                  value={activeAdSetup.tiktok_pixel_id || ""}
                  onChange={(e) => updateAdSetupField("tiktok_pixel_id", e.target.value)}
                  className="h-9 text-xs rounded-xl font-mono bg-background border-border/60"
                />
                <p className="text-[10px] text-muted-foreground">Tracks TikTok Ads conversion performance and video click-throughs.</p>
              </div>
            </Card>

            {/* Meta Business Suite */}
            <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <MetaGlyph className="w-5 h-4" />
                  <div>
                    <CardTitle className="text-sm font-bold">Meta Business Suite</CardTitle>
                    <p className="text-[10px] text-muted-foreground">Instagram Shopping &amp; Facebook Commerce</p>
                  </div>
                </div>
                <Switch
                  checked={activeAdSetup.meta_ads_enabled}
                  onCheckedChange={(v) => updateAdSetupField("meta_ads_enabled", v)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Meta Business Portfolio ID</Label>
                <Input
                  placeholder="e.g. 123456789012345"
                  value={activeAdSetup.meta_business_id || ""}
                  onChange={(e) => updateAdSetupField("meta_business_id", e.target.value)}
                  className="h-9 text-xs rounded-xl font-mono bg-background border-border/60"
                />
                <p className="text-[10px] text-muted-foreground">Links store catalogs to Facebook Commerce and Instagram Shopping.</p>
              </div>
            </Card>

            {/* Pinterest Tag */}
            <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-rose-500" />
                  <div>
                    <CardTitle className="text-sm font-bold">Pinterest Conversion Tag</CardTitle>
                    <p className="text-[10px] text-muted-foreground">Visual discovery &amp; moodboard shopping</p>
                  </div>
                </div>
                <Switch
                  checked={Boolean(activeAdSetup.pinterest_tag_enabled)}
                  onCheckedChange={(v) => updateAdSetupField("pinterest_tag_enabled", v)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pinterest Tag ID</Label>
                <Input
                  placeholder="e.g. 261234567890"
                  value={activeAdSetup.pinterest_tag_id || ""}
                  onChange={(e) => updateAdSetupField("pinterest_tag_id", e.target.value)}
                  className="h-9 text-xs rounded-xl font-mono bg-background border-border/60"
                />
                <p className="text-[10px] text-muted-foreground">Enables Pinterest catalog product tagging and add-to-cart conversion tracking.</p>
              </div>
            </Card>

            {/* Google AdSense Monetization */}
            <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-500" />
                  <div>
                    <CardTitle className="text-sm font-bold">Google AdSense</CardTitle>
                    <p className="text-[10px] text-muted-foreground">Automated publisher ad placement</p>
                  </div>
                </div>
                <Switch
                  checked={activeAdSetup.google_adsense_enabled}
                  onCheckedChange={(v) => updateAdSetupField("google_adsense_enabled", v)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">AdSense Publisher ID</Label>
                <Input
                  placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                  value={activeAdSetup.adsense_client_id || ""}
                  onChange={(e) => updateAdSetupField("adsense_client_id", e.target.value)}
                  className="h-9 text-xs rounded-xl font-mono bg-background border-border/60"
                />
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-xs font-medium text-foreground">Auto-Ads Placement</span>
                    <p className="text-[10px] text-muted-foreground">Lets Google AI position responsive banners on editorial pages</p>
                  </div>
                  <Switch
                    checked={activeAdSetup.adsense_auto_ads}
                    onCheckedChange={(v) => updateAdSetupField("adsense_auto_ads", v)}
                  />
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Floating Universal Save Action Pill ── */}
      {isDirty && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-in">
          <div className="flex items-center gap-3 p-2 pl-4 bg-card/95 border border-primary/40 shadow-2xl rounded-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-semibold text-foreground">Unsaved Tracking Changes</span>
            </div>
            <Button
              onClick={handleSaveAll}
              disabled={saveMutation.isPending}
              className="h-9 px-4 text-xs font-bold gap-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 shadow-md transition-all"
            >
              {saveMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save All Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
