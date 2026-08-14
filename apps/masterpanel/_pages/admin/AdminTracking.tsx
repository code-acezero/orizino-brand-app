"use client";
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "@/lib/router-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Globe, BarChart3, Search, Megaphone, Eye, Code, CheckCircle2, AlertCircle, Copy, ExternalLink } from "lucide-react";
import { SearchConsoleLivePanel } from "@/components/admin/SearchConsoleLivePanel";
import { FacebookGlyph, GoogleGlyph, GoogleSearchConsoleGlyph, MetaGlyph, TikTokGlyph } from "@/components/admin/BrandGlyph";
import { upsertSiteSettings } from "@/lib/admin-data.functions";
import { useRegisterUniversalSave } from "@/contexts/UniversalSaveContext";

interface FacebookPixelConfig {
  enabled: boolean;
  pixel_id: string;
  access_token: string;
  track_page_view: boolean;
  track_add_to_cart: boolean;
  track_purchase: boolean;
  track_view_content: boolean;
  track_search: boolean;
  track_initiate_checkout: boolean;
  custom_events: string;
}

interface GoogleAdsConfig {
  enabled: boolean;
  conversion_id: string;
  conversion_label: string;
  remarketing_enabled: boolean;
  enhanced_conversions: boolean;
  phone_conversion: boolean;
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
  adsense_slot_header: string;
  adsense_slot_sidebar: string;
  adsense_slot_footer: string;
  meta_ads_enabled: boolean;
  meta_business_id: string;
  tiktok_pixel_enabled: boolean;
  tiktok_pixel_id: string;
}

const defaultFBPixel: FacebookPixelConfig = {
  enabled: false, pixel_id: "", access_token: "",
  track_page_view: true, track_add_to_cart: true, track_purchase: true,
  track_view_content: true, track_search: true, track_initiate_checkout: true,
  custom_events: "",
};

const defaultGoogleAds: GoogleAdsConfig = {
  enabled: false, conversion_id: "", conversion_label: "",
  remarketing_enabled: false, enhanced_conversions: false,
  phone_conversion: false, custom_parameters: "",
};

const defaultSearchConsole: SearchConsoleConfig = {
  enabled: false, verification_code: "", sitemap_url: "",
  auto_submit_sitemap: true,
};

const defaultAdSetup: AdSetupConfig = {
  google_adsense_enabled: false, adsense_client_id: "",
  adsense_slot_header: "", adsense_slot_sidebar: "", adsense_slot_footer: "",
  meta_ads_enabled: false, meta_business_id: "",
  tiktok_pixel_enabled: false, tiktok_pixel_id: "",
};

const AdminTracking: React.FC = () => {
  const queryClient = useQueryClient();
  const saveSiteSettings = useServerFn(upsertSiteSettings);
  const location = useLocation();
  const navigate = useNavigate();
  const urlTab = new URLSearchParams(location.search).get("tab") || "facebook";
  const [tab, setTab] = useState(urlTab);
  useEffect(() => { setTab(urlTab); }, [urlTab]);
  const handleTabChange = (v: string) => {
    setTab(v);
    navigate(`/marketing/tracking?tab=${v}`);
  };
  const [fbPixel, setFbPixel] = useState<FacebookPixelConfig>(defaultFBPixel);
  const [googleAds, setGoogleAds] = useState<GoogleAdsConfig>(defaultGoogleAds);
  const [searchConsole, setSearchConsole] = useState<SearchConsoleConfig>(defaultSearchConsole);
  const [adSetup, setAdSetup] = useState<AdSetupConfig>(defaultAdSetup);

  const { isLoading } = useQuery({
    queryKey: ["admin-tracking-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").in("key", [
        "facebook_pixel_config", "google_ads_config", "search_console_config", "ad_setup_config"
      ]);

      if (error) throw error;

      (data || []).forEach((row: any) => {
        const val = typeof row.value === "object" && row.value !== null ? (row.value.value ?? row.value) : row.value;
        if (row.key === "facebook_pixel_config") setFbPixel({ ...defaultFBPixel, ...val });
        if (row.key === "google_ads_config") setGoogleAds({ ...defaultGoogleAds, ...val });
        if (row.key === "search_console_config") setSearchConsole({ ...defaultSearchConsole, ...val });
        if (row.key === "ad_setup_config") setAdSetup({ ...defaultAdSetup, ...val });
      });
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (configs: { key: string; value: any }[]) => {
      await saveSiteSettings({ data: { entries: configs } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tracking-config"] });
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Tracking settings saved!");
    },
    onError: (error: any) => {
      console.error("Failed to save tracking settings", error);
      const msg = error?.message || error?.error_description || error?.details || error?.hint || "Unknown error";
      toast.error(`Failed to save: ${msg}`);
    },
  });

  const saveAll = () => saveMutation.mutate([
    { key: "facebook_pixel_config", value: fbPixel },
    { key: "google_ads_config", value: googleAds },
    { key: "search_console_config", value: searchConsole },
    { key: "ad_setup_config", value: adSetup },
  ]);

  useRegisterUniversalSave(
    {
      label: "Save",
      onSave: saveAll,
      isSaving: saveMutation.isPending,
      onReject: () => {
        queryClient.invalidateQueries({ queryKey: ["admin-tracking-configs"] });
        toast.warning("Tracking settings reverted");
      },
      canReject: true,
    },
    [fbPixel, googleAds, searchConsole, adSetup, saveMutation.isPending, queryClient]
  );

  const copySnippet = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">Tracking & Ads</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure tracking pixels, ads, and search console for your store</p>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="hidden">
          <TabsTrigger value="facebook" className="gap-1.5 text-xs"><Eye className="w-3.5 h-3.5" />Facebook Pixel</TabsTrigger>
          <TabsTrigger value="google-ads" className="gap-1.5 text-xs"><BarChart3 className="w-3.5 h-3.5" />Google Ads</TabsTrigger>
          <TabsTrigger value="search-console" className="gap-1.5 text-xs"><Search className="w-3.5 h-3.5" />Search Console</TabsTrigger>
          <TabsTrigger value="ad-setup" className="gap-1.5 text-xs"><Megaphone className="w-3.5 h-3.5" />Ad Setup</TabsTrigger>
        </TabsList>

        {/* Facebook Pixel */}
        <TabsContent value="facebook" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FacebookGlyph className="w-7 h-7" />
                    Facebook Pixel
                  </CardTitle>
                  <CardDescription>Track user behavior and optimize Facebook ad campaigns</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={fbPixel.enabled ? "default" : "secondary"}>{fbPixel.enabled ? "Active" : "Inactive"}</Badge>
                  <Switch checked={fbPixel.enabled} onCheckedChange={(v) => setFbPixel({ ...fbPixel, enabled: v })} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Pixel ID</Label>
                  <Input placeholder="e.g. 123456789012345" value={fbPixel.pixel_id} onChange={(e) => setFbPixel({ ...fbPixel, pixel_id: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Conversions API Access Token <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input type="password" placeholder="EAABs..." value={fbPixel.access_token} onChange={(e) => setFbPixel({ ...fbPixel, access_token: e.target.value })} />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block">Event Tracking</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {([
                    ["track_page_view", "PageView"],
                    ["track_view_content", "ViewContent"],
                    ["track_add_to_cart", "AddToCart"],
                    ["track_initiate_checkout", "InitiateCheckout"],
                    ["track_purchase", "Purchase"],
                    ["track_search", "Search"],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between p-2 rounded-lg border border-border">
                      <span className="text-sm">{label}</span>
                      <Switch checked={(fbPixel as any)[key]} onCheckedChange={(v) => setFbPixel({ ...fbPixel, [key]: v })} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Custom Events <span className="text-muted-foreground text-xs">(one per line: event_name|param1=val1)</span></Label>
                <Textarea rows={3} placeholder="WishlistAdd|category=shoes&#10;NewsletterSignup" value={fbPixel.custom_events} onChange={(e) => setFbPixel({ ...fbPixel, custom_events: e.target.value })} />
              </div>

              {fbPixel.pixel_id && (
                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Installation Snippet</span>
                    <Button variant="ghost" size="sm" onClick={() => copySnippet(`<!-- Facebook Pixel -->\n<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${fbPixel.pixel_id}');fbq('track','PageView');</script>`)}>
                      <Copy className="w-3.5 h-3.5 mr-1" />Copy
                    </Button>
                  </div>
                  <code className="text-[10px] text-muted-foreground block overflow-auto">
                    {`fbq('init', '${fbPixel.pixel_id}'); fbq('track', 'PageView');`}
                  </code>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Google Ads */}
        <TabsContent value="google-ads" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <GoogleGlyph className="w-7 h-7" />
                    Google Ads
                  </CardTitle>
                  <CardDescription>Conversion tracking and remarketing for Google Ads campaigns</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={googleAds.enabled ? "default" : "secondary"}>{googleAds.enabled ? "Active" : "Inactive"}</Badge>
                  <Switch checked={googleAds.enabled} onCheckedChange={(v) => setGoogleAds({ ...googleAds, enabled: v })} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Conversion ID</Label>
                  <Input placeholder="AW-XXXXXXXXX" value={googleAds.conversion_id} onChange={(e) => setGoogleAds({ ...googleAds, conversion_id: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Conversion Label</Label>
                  <Input placeholder="AbCdEfGhIjKlMn" value={googleAds.conversion_label} onChange={(e) => setGoogleAds({ ...googleAds, conversion_label: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  ["remarketing_enabled", "Remarketing Tag"],
                  ["enhanced_conversions", "Enhanced Conversions"],
                  ["phone_conversion", "Phone Call Conversions"],
                ].map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <span className="text-sm">{label}</span>
                    <Switch checked={(googleAds as any)[key]} onCheckedChange={(v) => setGoogleAds({ ...googleAds, [key]: v })} />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label>Custom Parameters <span className="text-muted-foreground text-xs">(JSON)</span></Label>
                <Textarea rows={3} placeholder='{"currency":"USD","value":"{{total}}"}' value={googleAds.custom_parameters} onChange={(e) => setGoogleAds({ ...googleAds, custom_parameters: e.target.value })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Search Console */}
        <TabsContent value="search-console" className="space-y-4">
          <SearchConsoleLivePanel />
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <GoogleSearchConsoleGlyph className="w-7 h-7" />

                    Google Search Console
                  </CardTitle>
                  <CardDescription>Verify site ownership and manage search indexing</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={searchConsole.enabled ? "default" : "secondary"}>{searchConsole.enabled ? "Active" : "Inactive"}</Badge>
                  <Switch checked={searchConsole.enabled} onCheckedChange={(v) => setSearchConsole({ ...searchConsole, enabled: v })} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>HTML Verification Tag Content</Label>
                <Input placeholder="google-site-verification=XXXXXXXXXXXX" value={searchConsole.verification_code} onChange={(e) => setSearchConsole({ ...searchConsole, verification_code: e.target.value })} />
                <p className="text-xs text-muted-foreground">The value of the meta tag content attribute from Google Search Console</p>
              </div>
              <div className="space-y-2">
                <Label>Sitemap URL</Label>
                <Input placeholder="https://yoursite.com/sitemap.xml" value={searchConsole.sitemap_url} onChange={(e) => setSearchConsole({ ...searchConsole, sitemap_url: e.target.value })} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <span className="text-sm font-medium">Auto-submit Sitemap</span>
                  <p className="text-xs text-muted-foreground">Automatically ping Google when sitemap updates</p>
                </div>
                <Switch checked={searchConsole.auto_submit_sitemap} onCheckedChange={(v) => setSearchConsole({ ...searchConsole, auto_submit_sitemap: v })} />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />Open Search Console
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ad Setup */}
        <TabsContent value="ad-setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GoogleGlyph className="w-6 h-6" />
                Google AdSense
              </CardTitle>
              <CardDescription>Display ads on your store to earn revenue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enable Google AdSense</Label>
                <Switch checked={adSetup.google_adsense_enabled} onCheckedChange={(v) => setAdSetup({ ...adSetup, google_adsense_enabled: v })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>AdSense Client ID</Label>
                  <Input placeholder="ca-pub-XXXXXXXXXXXXXXXX" value={adSetup.adsense_client_id} onChange={(e) => setAdSetup({ ...adSetup, adsense_client_id: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2"><Label>Header Ad Slot</Label><Input placeholder="1234567890" value={adSetup.adsense_slot_header} onChange={(e) => setAdSetup({ ...adSetup, adsense_slot_header: e.target.value })} /></div>
                <div className="space-y-2"><Label>Sidebar Ad Slot</Label><Input placeholder="1234567890" value={adSetup.adsense_slot_sidebar} onChange={(e) => setAdSetup({ ...adSetup, adsense_slot_sidebar: e.target.value })} /></div>
                <div className="space-y-2"><Label>Footer Ad Slot</Label><Input placeholder="1234567890" value={adSetup.adsense_slot_footer} onChange={(e) => setAdSetup({ ...adSetup, adsense_slot_footer: e.target.value })} /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MetaGlyph className="w-8 h-5" />
                Meta (Facebook) Business
              </CardTitle>
              <CardDescription>Connect your Meta Business Suite for advanced ad management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Enable Meta Business Integration</Label>
                <Switch checked={adSetup.meta_ads_enabled} onCheckedChange={(v) => setAdSetup({ ...adSetup, meta_ads_enabled: v })} />
              </div>
              <div className="space-y-2">
                <Label>Business ID</Label>
                <Input placeholder="123456789012345" value={adSetup.meta_business_id} onChange={(e) => setAdSetup({ ...adSetup, meta_business_id: e.target.value })} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TikTokGlyph className="w-6 h-6" />
                TikTok Pixel
              </CardTitle>
              <CardDescription>Track conversions from TikTok ad campaigns</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Enable TikTok Pixel</Label>
                <Switch checked={adSetup.tiktok_pixel_enabled} onCheckedChange={(v) => setAdSetup({ ...adSetup, tiktok_pixel_enabled: v })} />
              </div>
              <div className="space-y-2">
                <Label>Pixel ID</Label>
                <Input placeholder="XXXXXXXXXXXXXXXXXX" value={adSetup.tiktok_pixel_id} onChange={(e) => setAdSetup({ ...adSetup, tiktok_pixel_id: e.target.value })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminTracking;
// code:4ce0
