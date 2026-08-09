"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/lib/app-toast";
import { Search, Globe, FileText, AlertCircle, Check, Eye, FileSearch, Map, ExternalLink, ShieldCheck, X, Loader2, RefreshCw, PlayCircle } from "lucide-react";
import SeoAuditTool from "./SeoAuditTool";
import { getStorefrontUrl, getCompanyUrl, getMasterpanelUrl } from "@/lib/cross-app-urls";

type CheckStatus = "pending" | "pass" | "fail";
type RobotsCheck = { label: string; status: CheckStatus; detail?: string; hint?: string };
type ResourceState = {
  status: "idle" | "loading" | "ok" | "error";
  checks: RobotsCheck[];
  error?: string;
  hint?: string;
  fetchedAt?: number;
};
type AppResult = { robots: ResourceState; sitemap: ResourceState };

const emptyState = (): ResourceState => ({ status: "idle", checks: [] });

function validateRobots(text: string, expectedDisallows: string[]): RobotsCheck[] {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  const sitemaps = lines.filter((l) => /^sitemap:/i.test(l)).map((l) => l.split(":").slice(1).join(":").trim());
  const disallows = lines.filter((l) => /^disallow:/i.test(l)).map((l) => l.replace(/^disallow:\s*/i, "").trim());
  const hasUserAgent = lines.some((l) => /^user-agent:\s*\*/i.test(l));
  const isFullyBlocked = expectedDisallows.includes("/");

  const checks: RobotsCheck[] = [
    {
      label: "Has User-agent: *",
      status: hasUserAgent ? "pass" : "fail",
      hint: hasUserAgent ? undefined : "Add a `User-agent: *` block so all crawlers pick up the rules.",
    },
  ];

  if (!isFullyBlocked) {
    checks.push(
      {
        label: "Sitemap directive present",
        status: sitemaps.length > 0 ? "pass" : "fail",
        detail: sitemaps.join(", ") || undefined,
        hint: sitemaps.length ? undefined : "Add `Sitemap: <origin>/sitemap.xml` at the bottom of robots.txt.",
      },
      {
        label: "Sitemap URL points to /sitemap.xml",
        status: sitemaps.some((s) => s.endsWith("/sitemap.xml")) ? "pass" : "fail",
        detail: sitemaps.join(", ") || undefined,
        hint: "The Sitemap directive should end with `/sitemap.xml`.",
      },
    );
  }

  for (const path of expectedDisallows) {
    const ok = disallows.some((d) => d === path || d === path + "/");
    checks.push({
      label: `Disallow: ${path}`,
      status: ok ? "pass" : "fail",
      hint: ok ? undefined : `Add \`Disallow: ${path}\` under \`User-agent: *\`.`,
    });
  }
  return checks;
}

function validateSitemapXml(text: string): RobotsCheck[] {
  const urls = (text.match(/<loc>[^<]+<\/loc>/g) || []).map((m) => m.replace(/<\/?loc>/g, ""));
  return [
    {
      label: "Valid XML declaration",
      status: /^\s*<\?xml/i.test(text) ? "pass" : "fail",
      hint: "Sitemap must start with `<?xml version=\"1.0\" ...?>`.",
    },
    {
      label: "Uses <urlset> root",
      status: /<urlset[\s>]/.test(text) ? "pass" : "fail",
      hint: "Wrap entries in `<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">`.",
    },
    {
      label: "Contains at least one <url>",
      status: urls.length > 0 ? "pass" : "fail",
      detail: urls.length ? `${urls.length} URL(s)` : undefined,
      hint: urls.length ? undefined : "Add at least one `<url><loc>...</loc></url>` entry.",
    },
  ];
}

const APP_EXPECTATIONS: Record<string, string[]> = {
  Storefront: ["/sales", "/checkout", "/auth", "/orders", "/reset-password", "/wishlist"],
  Company: [],
  Masterpanel: ["/"],
};

function describeFetchError(e: unknown, url: string): { error: string; hint: string } {
  const msg = e instanceof Error ? e.message : String(e);
  if (/Failed to fetch|NetworkError|TypeError/i.test(msg)) {
    return {
      error: "Network / CORS blocked the request",
      hint: `Open ${url} in a new tab to verify — cross-origin fetch from the admin may be blocked.`,
    };
  }
  if (/HTTP 4\d\d/.test(msg)) return { error: `${msg} — file not found`, hint: `Check the file exists at ${url}.` };
  if (/HTTP 5\d\d/.test(msg)) return { error: `${msg} — server error`, hint: "Retry in a moment; the origin returned 5xx." };
  return { error: msg || "Unknown error", hint: `Try opening ${url} directly.` };
}

async function fetchWithRetry(url: string, retries = 2): Promise<string> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      lastErr = e;
      if (i < retries) await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw lastErr;
}


interface PageSEO {
  title: string;
  description: string;
  keywords: string;
  og_title: string;
  og_description: string;
  canonical_url: string;
  robots: string;
  structured_data: string;
}

const defaultPageSEO: PageSEO = {
  title: "",
  description: "",
  keywords: "",
  og_title: "",
  og_description: "",
  canonical_url: "",
  robots: "index, follow",
  structured_data: "",
};

const seoPages = [
  { id: "landing", label: "Landing Page", path: "/" },
  { id: "home", label: "Home Page", path: "/home" },
  { id: "shop", label: "Shop Page", path: "/inventory" },
  { id: "cart", label: "Cart Page", path: "/cart" },
  { id: "wishlist", label: "Wishlist Page", path: "/wishlist" },
  { id: "checkout", label: "Checkout Page", path: "/checkout" },
  { id: "profile", label: "Profile Page", path: "/profile" },
  { id: "orders", label: "Orders Page", path: "/orders" },
  { id: "auth", label: "Auth Page", path: "/auth" },
];

const robotsOptions = [
  "index, follow",
  "index, nofollow",
  "noindex, follow",
  "noindex, nofollow",
];

const SeoPageCard = ({
  page,
  seo,
  onChange,
}: {
  page: (typeof seoPages)[0];
  seo: PageSEO;
  onChange: (field: keyof PageSEO, value: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const hasSeo = seo.title || seo.description;

  return (
    <Card className={`glass transition-all ${hasSeo ? "border-primary/20" : "border-border/30"}`}>
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm">{page.label}</CardTitle>
            <Badge variant="outline" className="text-[10px] font-mono">{page.path}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {hasSeo ? (
              <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                <Check className="w-3 h-3 mr-0.5" /> Configured
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                <AlertCircle className="w-3 h-3 mr-0.5" /> Not set
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{expanded ? "▲" : "▼"}</span>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4 pt-2">
          {/* SERP Preview */}
          {(seo.title || seo.description) && (
            <div className="p-3 rounded-xl bg-secondary/20 border border-border/30 space-y-1">
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Google Preview</span>
              </div>
              <p className="text-sm text-blue-400 font-medium truncate">{seo.title || page.label}</p>
              <p className="text-xs text-primary/60 font-mono truncate">
                yoursite.com{page.path}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2">{seo.description || "No description set"}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Page Title <span className="text-muted-foreground">({seo.title.length}/60)</span></Label>
              <Input
                value={seo.title}
                onChange={(e) => onChange("title", e.target.value)}
                placeholder={`${page.label} | Your Site Name`}
                maxLength={70}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">OG Title <span className="text-muted-foreground">(Social sharing)</span></Label>
              <Input
                value={seo.og_title}
                onChange={(e) => onChange("og_title", e.target.value)}
                placeholder="Leave empty to use page title"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Meta Description <span className="text-muted-foreground">({seo.description.length}/160)</span></Label>
            <Textarea
              value={seo.description}
              onChange={(e) => onChange("description", e.target.value)}
              placeholder="A compelling description for search engines..."
              maxLength={170}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">OG Description</Label>
            <Textarea
              value={seo.og_description}
              onChange={(e) => onChange("og_description", e.target.value)}
              placeholder="Leave empty to use meta description"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Keywords <span className="text-muted-foreground">(comma separated)</span></Label>
              <Input
                value={seo.keywords}
                onChange={(e) => onChange("keywords", e.target.value)}
                placeholder="e-commerce, shop, products"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Canonical URL</Label>
              <Input
                value={seo.canonical_url}
                onChange={(e) => onChange("canonical_url", e.target.value)}
                placeholder="https://yoursite.com/page"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Robots Directive</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {robotsOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => onChange("robots", opt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    seo.robots === opt
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/50 text-muted-foreground hover:bg-secondary/50"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">JSON-LD Structured Data <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              value={seo.structured_data}
              onChange={(e) => onChange("structured_data", e.target.value)}
              placeholder='{"@context": "https://schema.org", ...}'
              rows={3}
              className="font-mono text-xs"
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
};

/* ── Global SEO ── */
interface GlobalSEO {
  site_title_suffix: string;
  default_og_image: string;
  google_analytics_id: string;
  google_search_console: string;
  facebook_pixel_id: string;
  sitemap_enabled: boolean;
  auto_generate_meta: boolean;
}

const defaultGlobalSEO: GlobalSEO = {
  site_title_suffix: " | Store",
  default_og_image: "",
  google_analytics_id: "",
  google_search_console: "",
  facebook_pixel_id: "",
  sitemap_enabled: true,
  auto_generate_meta: true,
};

const AdminSeoSettings = () => {
  const qc = useQueryClient();
  const [pageSeo, setPageSeo] = useState<Record<string, PageSEO>>({});
  const [globalSeo, setGlobalSeo] = useState<GlobalSEO>({ ...defaultGlobalSEO });

  const { data: settings } = useQuery({
    queryKey: ["admin-seo-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("*")
        .in("key", ["seo_pages", "seo_global"]);
      return data || [];
    },
  });

  useEffect(() => {
    if (settings) {
      const pagesRow = settings.find((s) => s.key === "seo_pages");
      if (pagesRow?.value) {
        const val = (pagesRow.value as any)?.value ?? pagesRow.value;
        if (typeof val === "object") setPageSeo(val);
      }
      const globalRow = settings.find((s) => s.key === "seo_global");
      if (globalRow?.value) {
        const val = (globalRow.value as any)?.value ?? globalRow.value;
        if (typeof val === "object") setGlobalSeo((prev) => ({ ...prev, ...val }));
      }
    }
  }, [settings]);

  const APPS = [
    { label: "Storefront", base: getStorefrontUrl() },
    { label: "Company", base: getCompanyUrl() },
    { label: "Masterpanel", base: getMasterpanelUrl() },
  ] as const;

  const [appResults, setAppResults] = useState<Record<string, AppResult>>({});
  const [validatingAll, setValidatingAll] = useState(false);

  const setPart = (label: string, part: Partial<AppResult>) =>
    setAppResults((p) => ({
      ...p,
      [label]: { robots: p[label]?.robots ?? emptyState(), sitemap: p[label]?.sitemap ?? emptyState(), ...part },
    }));

  const validateRobotsFor = async (label: string, base: string) => {
    const url = `${base}/robots.txt`;
    setPart(label, { robots: { status: "loading", checks: [] } });
    try {
      const raw = await fetchWithRetry(url);
      const checks = validateRobots(raw, APP_EXPECTATIONS[label] || []);
      const ok = checks.every((c) => c.status === "pass");
      setPart(label, { robots: { status: ok ? "ok" : "error", checks, fetchedAt: Date.now() } });
      return ok;
    } catch (e) {
      const { error, hint } = describeFetchError(e, url);
      setPart(label, { robots: { status: "error", checks: [], error, hint, fetchedAt: Date.now() } });
      return false;
    }
  };

  const validateSitemapFor = async (label: string, base: string) => {
    const url = `${base}/sitemap.xml`;
    setPart(label, { sitemap: { status: "loading", checks: [] } });
    try {
      const raw = await fetchWithRetry(url);
      const checks = validateSitemapXml(raw);
      const ok = checks.every((c) => c.status === "pass");
      setPart(label, { sitemap: { status: ok ? "ok" : "error", checks, fetchedAt: Date.now() } });
      return ok;
    } catch (e) {
      const { error, hint } = describeFetchError(e, url);
      setPart(label, { sitemap: { status: "error", checks: [], error, hint, fetchedAt: Date.now() } });
      return false;
    }
  };

  const validateAll = async () => {
    setValidatingAll(true);
    try {
      await Promise.all(
        APPS.flatMap((a) => [validateRobotsFor(a.label, a.base), validateSitemapFor(a.label, a.base)]),
      );
    } finally {
      setValidatingAll(false);
    }
  };

  const summary = (() => {
    let pass = 0, fail = 0, total = 0, tested = 0;
    for (const a of APPS) {
      const r = appResults[a.label];
      for (const s of [r?.robots, r?.sitemap]) {
        if (!s || s.status === "idle") continue;
        tested++;
        if (s.status === "loading") continue;
        if (s.status === "ok") pass++;
        else fail++;
        total += s.checks.length;
      }
    }
    return { pass, fail, tested, total };
  })();



  const getPageSeo = (pageId: string): PageSEO => pageSeo[pageId] || { ...defaultPageSEO };

  const updatePageSeo = (pageId: string, field: keyof PageSEO, value: string) => {
    setPageSeo((prev) => ({
      ...prev,
      [pageId]: { ...getPageSeo(pageId), [field]: value },
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const items = [
        { key: "seo_pages", value: { value: pageSeo } },
        { key: "seo_global", value: { value: globalSeo } },
      ];
      for (const item of items) {
        const existing = settings?.find((s) => s.key === item.key);
        if (existing) {
          await supabase.from("site_settings").update({ value: item.value as any }).eq("id", existing.id);
        } else {
          await supabase.from("site_settings").insert({ key: item.key, value: item.value as any });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-seo-settings"] });
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("SEO settings saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const configuredCount = seoPages.filter((p) => {
    const s = getPageSeo(p.id);
    return s.title || s.description;
  }).length;

  return (
    <Tabs defaultValue="settings" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2 max-w-md">
        <TabsTrigger value="settings" className="gap-2">
          <Globe className="w-4 h-4" /> SEO Settings
        </TabsTrigger>
        <TabsTrigger value="audit" className="gap-2">
          <FileSearch className="w-4 h-4" /> SEO Audit
        </TabsTrigger>
      </TabsList>

      <TabsContent value="settings" className="space-y-6">
        {/* Global SEO Settings */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Global SEO Settings
            </CardTitle>
            <CardDescription>
              Settings that apply site-wide. Individual pages can override these.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Title Suffix</Label>
                <Input
                  value={globalSeo.site_title_suffix}
                  onChange={(e) => setGlobalSeo({ ...globalSeo, site_title_suffix: e.target.value })}
                  placeholder=" | Your Site Name"
                />
                <p className="text-[10px] text-muted-foreground">Appended to all page titles</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Default OG Image URL</Label>
                <Input
                  value={globalSeo.default_og_image}
                  onChange={(e) => setGlobalSeo({ ...globalSeo, default_og_image: e.target.value })}
                  placeholder="https://yoursite.com/og-image.jpg"
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Google Analytics ID</Label>
                <Input
                  value={globalSeo.google_analytics_id}
                  onChange={(e) => setGlobalSeo({ ...globalSeo, google_analytics_id: e.target.value })}
                  placeholder="G-XXXXXXXXXX"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Search Console Verification</Label>
                <Input
                  value={globalSeo.google_search_console}
                  onChange={(e) => setGlobalSeo({ ...globalSeo, google_search_console: e.target.value })}
                  placeholder="Verification meta content"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Facebook Pixel ID</Label>
                <Input
                  value={globalSeo.facebook_pixel_id}
                  onChange={(e) => setGlobalSeo({ ...globalSeo, facebook_pixel_id: e.target.value })}
                  placeholder="XXXXXXXXXXXXXXX"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sitemaps & Robots */}
        <Card className="glass">
          <CardHeader>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Map className="w-5 h-5 text-primary" />
                  Sitemaps & Robots
                </CardTitle>
                <CardDescription>
                  Validate robots.txt and sitemap.xml for every app. Submit these URLs to Google Search Console.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {summary.tested > 0 && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      summary.fail === 0
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-destructive/10 text-destructive border-destructive/20"
                    }`}
                  >
                    {summary.fail === 0
                      ? `All ${summary.pass} passed`
                      : `${summary.fail} failed · ${summary.pass} passed`}
                  </Badge>
                )}
                <Button size="sm" onClick={validateAll} disabled={validatingAll} className="gap-1">
                  {validatingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
                  Validate all
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {APPS.map((app) => {
              const result = appResults[app.label];
              const renderResource = (
                kind: "robots" | "sitemap",
                state: ResourceState | undefined,
                fileName: string,
              ) => {
                const s = state ?? emptyState();
                return (
                  <div className="rounded-lg border border-border/40 bg-background/40 p-2 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                        {fileName}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {s.status === "loading" && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Loader2 className="w-3 h-3 animate-spin" /> Checking…
                          </span>
                        )}
                        {s.status === "ok" && (
                          <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                            <Check className="w-3 h-3 mr-0.5" /> Pass
                          </Badge>
                        )}
                        {s.status === "error" && (
                          <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">
                            <AlertCircle className="w-3 h-3 mr-0.5" /> Fail
                          </Badge>
                        )}
                        {(s.status === "error" || s.status === "ok") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1.5 gap-1 text-[10px]"
                            onClick={() =>
                              kind === "robots"
                                ? validateRobotsFor(app.label, app.base)
                                : validateSitemapFor(app.label, app.base)
                            }
                          >
                            <RefreshCw className="w-3 h-3" /> Retry
                          </Button>
                        )}
                      </div>
                    </div>
                    {s.status === "loading" && (
                      <div className="space-y-1">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="h-3 rounded bg-muted/40 animate-pulse" />
                        ))}
                      </div>
                    )}
                    {s.status !== "loading" && s.error && (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-[11px] text-destructive">
                          <X className="w-3 h-3 shrink-0" /> {s.error}
                        </div>
                        {s.hint && <div className="text-[10px] text-muted-foreground pl-4">{s.hint}</div>}
                      </div>
                    )}
                    {s.status !== "loading" &&
                      !s.error &&
                      s.checks.map((c, i) => (
                        <div key={i} className="text-[11px]">
                          <div className="flex items-center gap-1.5">
                            {c.status === "pass" ? (
                              <Check className="w-3 h-3 text-primary shrink-0" />
                            ) : (
                              <X className="w-3 h-3 text-destructive shrink-0" />
                            )}
                            <span className={c.status === "pass" ? "text-muted-foreground" : "text-destructive"}>
                              {c.label}
                              {c.detail ? <span className="opacity-60"> — {c.detail}</span> : null}
                            </span>
                          </div>
                          {c.status === "fail" && c.hint && (
                            <div className="text-[10px] text-muted-foreground pl-4.5 ml-4">{c.hint}</div>
                          )}
                        </div>
                      ))}
                    {s.status === "idle" && (
                      <div className="text-[10px] text-muted-foreground">Not checked yet.</div>
                    )}
                  </div>
                );
              };

              return (
                <div key={app.label} className="p-3 rounded-xl border border-border/40 bg-secondary/20 space-y-2">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="text-xs font-medium">{app.label}</div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate">{app.base}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <Button size="sm" variant="outline" asChild>
                        <a href={`${app.base}/sitemap.xml`} target="_blank" rel="noreferrer" className="gap-1">
                          sitemap.xml <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a href={`${app.base}/robots.txt`} target="_blank" rel="noreferrer" className="gap-1">
                          robots.txt <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          validateRobotsFor(app.label, app.base);
                          validateSitemapFor(app.label, app.base);
                        }}
                        disabled={result?.robots.status === "loading" || result?.sitemap.status === "loading"}
                        className="gap-1"
                      >
                        {result?.robots.status === "loading" || result?.sitemap.status === "loading" ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-3 h-3" />
                        )}
                        Validate
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {renderResource("robots", result?.robots, "robots.txt")}
                    {renderResource("sitemap", result?.sitemap, "sitemap.xml")}
                  </div>
                </div>
              );
            })}
            <p className="text-[10px] text-muted-foreground">
              Validation fetches files in the browser and retries up to 2 times. Cross-origin fetch may be blocked — open the direct link if a request fails.
            </p>
          </CardContent>
        </Card>



        {/* Per-Page SEO */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Page-Level SEO</h3>
            <Badge variant="outline" className="text-[10px]">{configuredCount}/{seoPages.length} configured</Badge>
          </div>
        </div>

        <div className="space-y-3">
          {seoPages.map((page) => (
            <SeoPageCard
              key={page.id}
              page={page}
              seo={getPageSeo(page.id)}
              onChange={(field, value) => updatePageSeo(page.id, field, value)}
            />
          ))}
        </div>

        <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving..." : "Save All SEO Settings"}
        </Button>
      </TabsContent>

      <TabsContent value="audit">
        <SeoAuditTool />
      </TabsContent>
    </Tabs>
  );
};

export default AdminSeoSettings;
// code:4ce0
