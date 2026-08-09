"use client";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSearch,
  ShoppingBag,
  FolderOpen,
  Globe,
} from "lucide-react";

/* ── Types ── */
interface AuditIssue {
  severity: "error" | "warning";
  field: string;
  message: string;
}

interface AuditItem {
  type: "product" | "category" | "page";
  name: string;
  slug: string;
  issues: AuditIssue[];
  score: number; // 0-100
}

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

/* ── Helpers ── */
const auditProduct = (p: any): AuditItem => {
  const issues: AuditIssue[] = [];
  if (!p.meta_title) issues.push({ severity: "error", field: "Meta Title", message: "Missing meta title" });
  else if (p.meta_title.length > 60) issues.push({ severity: "warning", field: "Meta Title", message: `Title is ${p.meta_title.length} chars (recommended ≤60)` });
  if (!p.meta_description) issues.push({ severity: "error", field: "Meta Description", message: "Missing meta description" });
  else if (p.meta_description.length > 160) issues.push({ severity: "warning", field: "Meta Description", message: `Description is ${p.meta_description.length} chars (recommended ≤160)` });
  if (!p.meta_keywords) issues.push({ severity: "warning", field: "Keywords", message: "No keywords set" });
  if (!p.thumbnail && (!p.images || p.images.length === 0)) issues.push({ severity: "warning", field: "Image", message: "No product image (affects rich results)" });
  if (!p.short_description && !p.description) issues.push({ severity: "warning", field: "Description", message: "No product description" });

  const total = 5;
  const passed = total - issues.filter(i => i.severity === "error").length - issues.filter(i => i.severity === "warning").length * 0.5;
  return { type: "product", name: p.name, slug: `/product/${p.slug}`, issues, score: Math.round(Math.max(0, (passed / total) * 100)) };
};

const auditCategory = (c: any): AuditItem => {
  const issues: AuditIssue[] = [];
  if (!c.meta_title) issues.push({ severity: "error", field: "Meta Title", message: "Missing meta title" });
  if (!c.meta_description) issues.push({ severity: "error", field: "Meta Description", message: "Missing meta description" });
  if (!c.meta_keywords) issues.push({ severity: "warning", field: "Keywords", message: "No keywords set" });
  if (!c.description) issues.push({ severity: "warning", field: "Description", message: "No category description" });
  if (!c.image_url) issues.push({ severity: "warning", field: "Image", message: "No category image" });

  const total = 5;
  const passed = total - issues.filter(i => i.severity === "error").length - issues.filter(i => i.severity === "warning").length * 0.5;
  return { type: "category", name: c.name, slug: `/categories/${c.slug}`, issues, score: Math.round(Math.max(0, (passed / total) * 100)) };
};

const auditPage = (pageId: string, label: string, path: string, seo: any): AuditItem => {
  const issues: AuditIssue[] = [];
  if (!seo?.title) issues.push({ severity: "error", field: "Page Title", message: "Missing page title" });
  else if (seo.title.length > 60) issues.push({ severity: "warning", field: "Page Title", message: `Title is ${seo.title.length} chars (recommended ≤60)` });
  if (!seo?.description) issues.push({ severity: "error", field: "Meta Description", message: "Missing meta description" });
  else if (seo.description.length > 160) issues.push({ severity: "warning", field: "Meta Description", message: `Description is ${seo.description.length} chars (recommended ≤160)` });
  if (!seo?.keywords) issues.push({ severity: "warning", field: "Keywords", message: "No keywords set" });
  if (!seo?.og_title && !seo?.title) issues.push({ severity: "warning", field: "OG Title", message: "No Open Graph title" });

  const total = 4;
  const passed = total - issues.filter(i => i.severity === "error").length - issues.filter(i => i.severity === "warning").length * 0.5;
  return { type: "page", name: label, slug: path, issues, score: Math.round(Math.max(0, (passed / total) * 100)) };
};

const scoreColor = (score: number) => {
  if (score >= 80) return "text-emerald-500";
  if (score >= 50) return "text-amber-500";
  return "text-destructive";
};

const scoreBg = (score: number) => {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-destructive";
};

const typeIcon = (type: string) => {
  if (type === "product") return <ShoppingBag className="w-3.5 h-3.5" />;
  if (type === "category") return <FolderOpen className="w-3.5 h-3.5" />;
  return <Globe className="w-3.5 h-3.5" />;
};

/* ── Component ── */
const SeoAuditTool = () => {
  const { data: products } = useQuery({
    queryKey: ["seo-audit-products"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("products")
        .select("name, slug, meta_title, meta_description, meta_keywords, thumbnail, images, short_description, description")
        .eq("is_active", true);
      return data || [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["seo-audit-categories"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("categories")
        .select("name, slug, meta_title, meta_description, meta_keywords, description, image_url")
        .eq("is_active", true);
      return data || [];
    },
  });

  const { data: seoSettings } = useQuery({
    queryKey: ["admin-seo-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("*")
        .in("key", ["seo_pages"]);
      return data || [];
    },
  });

  const auditResults = useMemo(() => {
    const results: AuditItem[] = [];

    // Audit pages
    const pagesRow = seoSettings?.find((s) => s.key === "seo_pages");
    const pageSeoData = (pagesRow?.value as any)?.value ?? pagesRow?.value ?? {};
    seoPages.forEach((p) => {
      results.push(auditPage(p.id, p.label, p.path, pageSeoData[p.id]));
    });

    // Audit products
    products?.forEach((p: any) => results.push(auditProduct(p)));

    // Audit categories
    categories?.forEach((c: any) => results.push(auditCategory(c)));

    // Sort by score ascending (worst first)
    results.sort((a, b) => a.score - b.score);
    return results;
  }, [products, categories, seoSettings]);

  const stats = useMemo(() => {
    if (!auditResults.length) return { total: 0, errors: 0, warnings: 0, avgScore: 0, perfect: 0 };
    const errors = auditResults.reduce((s, r) => s + r.issues.filter(i => i.severity === "error").length, 0);
    const warnings = auditResults.reduce((s, r) => s + r.issues.filter(i => i.severity === "warning").length, 0);
    const avgScore = Math.round(auditResults.reduce((s, r) => s + r.score, 0) / auditResults.length);
    const perfect = auditResults.filter(r => r.issues.length === 0).length;
    return { total: auditResults.length, errors, warnings, avgScore, perfect };
  }, [auditResults]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="glass">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Items Audited</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${scoreColor(stats.avgScore)}`}>{stats.avgScore}%</p>
            <p className="text-xs text-muted-foreground">Avg Score</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{stats.errors}</p>
            <p className="text-xs text-muted-foreground">Errors</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-500">{stats.warnings}</p>
            <p className="text-xs text-muted-foreground">Warnings</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-500">{stats.perfect}</p>
            <p className="text-xs text-muted-foreground">Perfect</p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Overall SEO Health</span>
            <span className={`text-sm font-bold ${scoreColor(stats.avgScore)}`}>{stats.avgScore}%</span>
          </div>
          <Progress value={stats.avgScore} className="h-2" />
        </CardContent>
      </Card>

      {/* Audit Results List */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSearch className="w-5 h-5 text-primary" />
            Audit Results
          </CardTitle>
          <CardDescription>Items sorted by SEO score (worst first). Fix errors for maximum impact.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-2">
            <div className="space-y-2">
              {auditResults.map((item, idx) => (
                <div
                  key={`${item.type}-${item.slug}-${idx}`}
                  className="p-3 rounded-xl border border-border/30 hover:bg-secondary/10 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="text-muted-foreground">{typeIcon(item.type)}</div>
                      <span className="text-sm font-medium text-foreground truncate">{item.name}</span>
                      <Badge variant="outline" className="text-[10px] font-mono shrink-0">{item.slug}</Badge>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.issues.length === 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <span className={`text-sm font-bold ${scoreColor(item.score)}`}>{item.score}%</span>
                      )}
                      <div className={`w-2 h-2 rounded-full ${scoreBg(item.score)}`} />
                    </div>
                  </div>

                  {item.issues.length > 0 && (
                    <div className="mt-2 space-y-1 pl-6">
                      {item.issues.map((issue, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          {issue.severity === "error" ? (
                            <XCircle className="w-3 h-3 text-destructive shrink-0" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                          )}
                          <span className="text-muted-foreground">
                            <span className="font-medium text-foreground">{issue.field}:</span> {issue.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {auditResults.length === 0 && (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                  Loading audit data...
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default SeoAuditTool;
// code:4ce0
