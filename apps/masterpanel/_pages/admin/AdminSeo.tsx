"use client";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useTabParam } from "@/hooks/use-tab-param";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import { toast } from "@/lib/app-toast";
import AdminSeoSettings from "@/components/admin/AdminSeoSettings";
import SeoAuditTool from "@/components/admin/SeoAuditTool";
import { useServerFn } from "@/lib/server-fn-compat";
import { upsertSiteSettings } from "@/lib/admin-data.functions";
import {
  LayoutDashboard,
  Globe,
  FileSearch,
  FileCode,
  Braces,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Link as LinkIcon,
  Map,
  ShieldCheck,
  Copy,
  Wand2,
} from "lucide-react";

/* ───────── Schema library ───────── */
const SCHEMA_TEMPLATES = [
  {
    id: "organization",
    name: "Organization",
    description: "Identify your brand to search engines (logo, name, social).",
    json: {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Your Brand",
      url: "https://yoursite.com",
      logo: "https://yoursite.com/logo.png",
      sameAs: ["https://facebook.com/yourbrand", "https://instagram.com/yourbrand"],
    },
  },
  {
    id: "website",
    name: "WebSite (with SearchAction)",
    description: "Enables the sitelinks search box in Google results.",
    json: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      url: "https://yoursite.com",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://yoursite.com/shop?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
  },
  {
    id: "breadcrumb",
    name: "BreadcrumbList",
    description: "Show breadcrumb navigation under your URL in SERPs.",
    json: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://yoursite.com/" },
        { "@type": "ListItem", position: 2, name: "Shop", item: "https://yoursite.com/shop" },
      ],
    },
  },
  {
    id: "faq",
    name: "FAQPage",
    description: "Rich result with expandable Q&A directly in search.",
    json: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: "Do you ship internationally?", acceptedAnswer: { "@type": "Answer", text: "Yes, we ship worldwide." } },
      ],
    },
  },
  {
    id: "localbusiness",
    name: "LocalBusiness",
    description: "For physical stores — appears in Google Maps and local pack.",
    json: {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "Your Store",
      address: { "@type": "PostalAddress", streetAddress: "...", addressLocality: "City", addressCountry: "BD" },
      telephone: "+880...",
      openingHours: "Mo-Sa 10:00-22:00",
    },
  },
];

/* ───────── Helpers ───────── */
const SEO_PAGES = [
  { id: "landing", label: "Landing", path: "/" },
  { id: "home", label: "Home", path: "/home" },
  { id: "shop", label: "Shop", path: "/inventory" },
  { id: "cart", label: "Cart", path: "/cart" },
  { id: "wishlist", label: "Wishlist", path: "/wishlist" },
  { id: "checkout", label: "Checkout", path: "/checkout" },
  { id: "profile", label: "Profile", path: "/profile" },
  { id: "orders", label: "Orders", path: "/orders" },
  { id: "auth", label: "Auth", path: "/auth" },
];

/* ───────── Dashboard ───────── */
const SeoDashboard = () => {
  const { data: settings } = useQuery({
    queryKey: ["seo-dashboard-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["seo_pages", "seo_global"]);
      return data || [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["seo-dashboard-products"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("products")
        .select("meta_title, meta_description")
        .eq("is_active", true);
      return data || [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["seo-dashboard-categories"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("categories")
        .select("meta_title, meta_description")
        .eq("is_active", true);
      return data || [];
    },
  });

  const stats = useMemo(() => {
    const pagesRow = settings?.find((s) => s.key === "seo_pages");
    const pageSeoData = ((pagesRow?.value as any)?.value ?? pagesRow?.value ?? {}) as Record<string, any>;
    const globalRow = settings?.find((s) => s.key === "seo_global");
    const globalSeo = ((globalRow?.value as any)?.value ?? globalRow?.value ?? {}) as Record<string, any>;

    const pagesConfigured = SEO_PAGES.filter((p) => {
      const v = pageSeoData[p.id];
      return v?.title && v?.description;
    }).length;
    const productsTotal = products?.length || 0;
    const productsOk = (products || []).filter((p: any) => p.meta_title && p.meta_description).length;
    const catsTotal = categories?.length || 0;
    const catsOk = (categories || []).filter((c: any) => c.meta_title && c.meta_description).length;

    const totalItems = SEO_PAGES.length + productsTotal + catsTotal;
    const okItems = pagesConfigured + productsOk + catsOk;
    const health = totalItems ? Math.round((okItems / totalItems) * 100) : 0;

    return {
      pagesConfigured,
      pagesTotal: SEO_PAGES.length,
      productsOk,
      productsTotal,
      catsOk,
      catsTotal,
      health,
      hasGA: !!globalSeo.google_analytics_id,
      hasGSC: !!globalSeo.google_search_console,
      hasOg: !!globalSeo.default_og_image,
    };
  }, [settings, products, categories]);

  const checklist: Array<{ label: string; ok: boolean; hint: string }> = [
    { label: "All static pages have titles & descriptions", ok: stats.pagesConfigured === stats.pagesTotal, hint: `${stats.pagesConfigured}/${stats.pagesTotal} pages configured` },
    { label: "Default Open Graph image set", ok: stats.hasOg, hint: "Used when sharing on social platforms" },
    { label: "Google Analytics connected", ok: stats.hasGA, hint: "Track traffic and conversions" },
    { label: "Search Console verified", ok: stats.hasGSC, hint: "Submit sitemap and monitor indexing" },
    { label: "All products have SEO metadata", ok: stats.productsTotal > 0 && stats.productsOk === stats.productsTotal, hint: `${stats.productsOk}/${stats.productsTotal} products` },
    { label: "All categories have SEO metadata", ok: stats.catsTotal > 0 && stats.catsOk === stats.catsTotal, hint: `${stats.catsOk}/${stats.catsTotal} categories` },
  ];

  const healthColor = stats.health >= 80 ? "text-emerald-500" : stats.health >= 50 ? "text-amber-500" : "text-destructive";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass md:col-span-2">
          <CardHeader className="pb-2">
            <CardDescription>Overall SEO Health</CardDescription>
            <CardTitle className={`text-4xl ${healthColor}`}>{stats.health}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={stats.health} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Based on pages, products, categories, and verification status.
            </p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="pb-2"><CardDescription>Pages</CardDescription>
            <CardTitle className="text-2xl">{stats.pagesConfigured}<span className="text-base text-muted-foreground">/{stats.pagesTotal}</span></CardTitle>
          </CardHeader>
          <CardContent><p className="text-xs text-muted-foreground">Static pages with full SEO</p></CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="pb-2"><CardDescription>Products</CardDescription>
            <CardTitle className="text-2xl">{stats.productsOk}<span className="text-base text-muted-foreground">/{stats.productsTotal}</span></CardTitle>
          </CardHeader>
          <CardContent><p className="text-xs text-muted-foreground">Optimized for search</p></CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /> Setup checklist</CardTitle>
          <CardDescription>Knock these out for a complete SEO foundation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {checklist.map((c, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border/30">
              {c.ok ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" /> : <XCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.hint}</p>
              </div>
              {c.ok && <Badge variant="outline" className="text-[10px]">Done</Badge>}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="glass">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Map className="w-4 h-4" /> Sitemap</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">Auto-generated XML index of public routes.</p>
            <Button variant="outline" size="sm" asChild>
              <a href="/sitemap.xml" target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5 mr-1.5" />View /sitemap.xml</a>
            </Button>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileCode className="w-4 h-4" /> Robots</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">Crawler directives served from /robots.txt.</p>
            <Button variant="outline" size="sm" asChild>
              <a href="/robots.txt" target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5 mr-1.5" />View /robots.txt</a>
            </Button>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Search className="w-4 h-4" /> Search Console</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">Submit sitemap & monitor indexing.</p>
            <Button variant="outline" size="sm" asChild>
              <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5 mr-1.5" />Open Console</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

/* ───────── Schema library ───────── */
const SchemaLibrary = () => {
  const [previewId, setPreviewId] = useState(SCHEMA_TEMPLATES[0].id);
  const tpl = SCHEMA_TEMPLATES.find((t) => t.id === previewId)!;
  const json = JSON.stringify(tpl.json, null, 2);
  return (
    <div className="grid md:grid-cols-[260px_1fr] gap-4">
      <Card className="glass">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Templates</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {SCHEMA_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setPreviewId(t.id)}
              className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${previewId === t.id ? "border-primary bg-primary/10" : "border-border/40 hover:border-primary/30"}`}
            >
              <p className="font-medium">{t.name}</p>
              <p className="text-[11px] text-muted-foreground line-clamp-1">{t.description}</p>
            </button>
          ))}
        </CardContent>
      </Card>
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{tpl.name}</CardTitle>
              <CardDescription>{tpl.description}</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(json); toast.success("Copied JSON-LD"); }}>
              <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="text-[11px] font-mono p-3 rounded-lg bg-secondary/30 overflow-auto max-h-[420px] whitespace-pre">{json}</pre>
          <p className="text-xs text-muted-foreground mt-3">
            Paste into a page's <span className="font-mono">JSON-LD Structured Data</span> field in the Pages tab, or embed via your page's <span className="font-mono">head()</span>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

/* ───────── Tools ───────── */
const SeoTools = () => {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wand2 className="w-5 h-5 text-primary" /> SERP Preview & Length Checker</CardTitle>
          <CardDescription>Preview how your page appears in Google search results.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Title <span className="text-muted-foreground">({title.length}/60)</span></Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Your page title…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description <span className="text-muted-foreground">({desc.length}/160)</span></Label>
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Compelling meta description…" />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-secondary/20 border border-border/30 space-y-1">
            <p className="text-sm text-blue-400 font-medium truncate">{title || "Your title here"}</p>
            <p className="text-xs text-primary/60 font-mono truncate">yoursite.com › page</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{desc || "Your meta description appears here. Keep it under 160 characters for best results."}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={title.length > 0 && title.length <= 60 ? "outline" : "secondary"}>
              {title.length === 0 ? "Empty" : title.length <= 60 ? "Title OK" : "Title too long"}
            </Badge>
            <Badge variant={desc.length > 0 && desc.length <= 160 ? "outline" : "secondary"}>
              {desc.length === 0 ? "Empty" : desc.length <= 160 ? "Description OK" : "Description too long"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><LinkIcon className="w-5 h-5 text-primary" /> External tools</CardTitle>
          <CardDescription>Validate and debug your SEO with the standard toolchain.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          {[
            { url: "https://search.google.com/test/rich-results", label: "Rich Results Test", desc: "Validate JSON-LD" },
            { url: "https://validator.schema.org/", label: "Schema.org Validator", desc: "Check structured data" },
            { url: "https://pagespeed.web.dev/", label: "PageSpeed Insights", desc: "Core Web Vitals" },
            { url: "https://developers.facebook.com/tools/debug/", label: "FB Sharing Debugger", desc: "OG tags preview" },
            { url: "https://cards-dev.twitter.com/validator", label: "Twitter Card Validator", desc: "Twitter preview" },
            { url: "https://search.google.com/search-console", label: "Search Console", desc: "Index status & queries" },
          ].map((t) => (
            <a key={t.url} href={t.url} target="_blank" rel="noreferrer" className="flex items-start gap-3 p-3 rounded-xl border border-border/30 hover:border-primary/40 transition-all">
              <ExternalLink className="w-4 h-4 text-primary mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </div>
            </a>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

/* ───────── Global / Verification ───────── */
interface GlobalSEO {
  site_title_suffix: string;
  default_og_image: string;
  google_analytics_id: string;
  google_search_console: string;
  facebook_pixel_id: string;
  bing_verification: string;
  sitemap_enabled: boolean;
  auto_generate_meta: boolean;
  noindex_site: boolean;
}

const defaultGlobalSEO: GlobalSEO = {
  site_title_suffix: " | Store",
  default_og_image: "",
  google_analytics_id: "",
  google_search_console: "",
  facebook_pixel_id: "",
  bing_verification: "",
  sitemap_enabled: true,
  auto_generate_meta: true,
  noindex_site: false,
};

const SeoGlobalTab = () => {
  const qc = useQueryClient();
  const saveSiteSettings = useServerFn(upsertSiteSettings);
  const [cfg, setCfg] = useState<GlobalSEO>(defaultGlobalSEO);

  const { data: row } = useQuery({
    queryKey: ["admin-seo-global"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*").eq("key", "seo_global").maybeSingle();
      if (data?.value) {
        const v = (data.value as any)?.value ?? data.value;
        if (v && typeof v === "object") setCfg((p) => ({ ...p, ...v }));
      }
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      await saveSiteSettings({ data: { entries: [{ key: "seo_global", value: { value: cfg } }] } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-seo-global"] }); qc.invalidateQueries({ queryKey: ["admin-seo-settings"] }); toast.success("Global SEO saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const u = <K extends keyof GlobalSEO>(k: K, v: GlobalSEO[K]) => setCfg((c) => ({ ...c, [k]: v }));

  return (
    <div className="space-y-6 max-w-4xl">
      <Card className="glass">
        <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-primary" /> Defaults</CardTitle>
          <CardDescription>Applied site-wide. Individual pages override these.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Title Suffix</Label>
              <Input value={cfg.site_title_suffix} onChange={(e) => u("site_title_suffix", e.target.value)} placeholder=" | Your Site" />
              <p className="text-[10px] text-muted-foreground">Appended to all page titles</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Default Open Graph Image URL</Label>
              <Input value={cfg.default_og_image} onChange={(e) => u("default_og_image", e.target.value)} placeholder="https://yoursite.com/og.jpg" />
              <p className="text-[10px] text-muted-foreground">1200×630 recommended</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between p-3 rounded-xl border border-border/30">
            <div>
              <Label>Auto-generate missing meta tags</Label>
              <p className="text-xs text-muted-foreground">Use product/category name when meta_title is blank</p>
            </div>
            <Switch checked={cfg.auto_generate_meta} onCheckedChange={(v) => u("auto_generate_meta", v)} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl border border-border/30">
            <div>
              <Label>Sitemap enabled</Label>
              <p className="text-xs text-muted-foreground">Serve /sitemap.xml for crawlers</p>
            </div>
            <Switch checked={cfg.sitemap_enabled} onCheckedChange={(v) => u("sitemap_enabled", v)} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl border border-destructive/30 bg-destructive/5">
            <div>
              <Label className="text-destructive">Hide site from search engines</Label>
              <p className="text-xs text-muted-foreground">Sets noindex globally — use only for staging</p>
            </div>
            <Switch checked={cfg.noindex_site} onCheckedChange={(v) => u("noindex_site", v)} />
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /> Verification & Analytics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Google Analytics (GA4)</Label>
              <Input value={cfg.google_analytics_id} onChange={(e) => u("google_analytics_id", e.target.value)} placeholder="G-XXXXXXXXXX" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Google Search Console verification</Label>
              <Input value={cfg.google_search_console} onChange={(e) => u("google_search_console", e.target.value)} placeholder="Meta tag content value" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Bing Webmaster verification</Label>
              <Input value={cfg.bing_verification} onChange={(e) => u("bing_verification", e.target.value)} placeholder="Meta tag content value" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Facebook Pixel ID</Label>
              <Input value={cfg.facebook_pixel_id} onChange={(e) => u("facebook_pixel_id", e.target.value)} placeholder="XXXXXXXXXXXXXXX" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? "Saving..." : "Save Global SEO"}
      </Button>
    </div>
  );
};

/* ───────── Page shell ───────── */
const AdminSeo = () => {
  useSeoMeta("admin-seo", "SEO — Admin");
  const [tab, setTab] = useTabParam("dashboard", "/marketing");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">SEO</h1>
        <p className="text-sm text-muted-foreground">Search optimization, structured data, audit, and verification — all in one place.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="hidden">
          <TabsTrigger value="dashboard" className="gap-1.5"><LayoutDashboard className="w-3.5 h-3.5" /> Dashboard</TabsTrigger>
          <TabsTrigger value="pages" className="gap-1.5"><FileCode className="w-3.5 h-3.5" /> Pages</TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5"><FileSearch className="w-3.5 h-3.5" /> Audit</TabsTrigger>
          <TabsTrigger value="global" className="gap-1.5"><Globe className="w-3.5 h-3.5" /> Global</TabsTrigger>
          <TabsTrigger value="schema" className="gap-1.5"><Braces className="w-3.5 h-3.5" /> Schema</TabsTrigger>
          <TabsTrigger value="tools" className="gap-1.5"><Wand2 className="w-3.5 h-3.5" /> Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6"><SeoDashboard /></TabsContent>
        <TabsContent value="pages" className="mt-6"><AdminSeoSettings /></TabsContent>
        <TabsContent value="audit" className="mt-6"><SeoAuditTool /></TabsContent>
        <TabsContent value="global" className="mt-6"><SeoGlobalTab /></TabsContent>
        <TabsContent value="schema" className="mt-6"><SchemaLibrary /></TabsContent>
        <TabsContent value="tools" className="mt-6"><SeoTools /></TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSeo;
// code:4ce0
