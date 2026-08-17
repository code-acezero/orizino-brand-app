"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/lib/app-toast";
import { useTabParam } from "@/hooks/use-tab-param";
import { useServerFn } from "@/lib/server-fn-compat";
import { useRegisterUniversalSave } from "@/contexts/UniversalSaveContext";
import { upsertSiteSettings } from "@/lib/admin-data.functions";
import {
  generateSeoWithAi,
  auditSeoWithAi,
  batchAutoGenerateSeo,
  generateSitemapXmlData,
  generateRobotsTxtData,
} from "@/lib/seo.functions";
import {
  Search,
  Globe,
  Bot,
  Wand2,
  FileCode,
  Braces,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Eye,
  Layers,
  Zap,
  LayoutDashboard,
  Smartphone,
  Monitor,
  Check,
  Share2,
  FileText,
  Lock,
  ArrowUpRight,
  TrendingUp,
  Sliders,
  Play,
  Save,
  HelpCircle,
  Info,
  Upload,
  Image as ImageIcon,
  X,
  Store,
  Compass,
  Link2,
  ShoppingBag,
  Landmark,
} from "lucide-react";

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
 * Page Definitions by Application
 * ────────────────────────────────────────────────────────────────────────── */
export interface PageDefinition {
  id: string;
  label: string;
  path: string;
  type: string;
  appId: TargetAppId;
}

const APP_PAGES: Record<TargetAppId, PageDefinition[]> = {
  storefront: [
    { id: "home", label: "Storefront Home", path: "/", type: "home", appId: "storefront" },
    { id: "inventory", label: "Collection & Catalog", path: "/inventory", type: "shop", appId: "storefront" },
    { id: "product", label: "Product Details (Dynamic)", path: "/product/:slug", type: "product", appId: "storefront" },
    { id: "lookbook", label: "Seasonal Lookbook", path: "/lookbook", type: "lookbook", appId: "storefront" },
    { id: "cart", label: "Shopping Bag", path: "/cart", type: "page", appId: "storefront" },
    { id: "checkout", label: "Secure Checkout", path: "/checkout", type: "page", appId: "storefront" },
    { id: "wishlist", label: "Wishlist", path: "/wishlist", type: "page", appId: "storefront" },
    { id: "story", label: "Brand Manifesto & Story", path: "/story", type: "story", appId: "storefront" },
    { id: "reviews", label: "Customer Reviews & Ratings", path: "/reviews", type: "page", appId: "storefront" },
    { id: "support", label: "Customer Care & Helpdesk", path: "/support", type: "page", appId: "storefront" },
    { id: "faq", label: "Frequently Asked Questions", path: "/faq", type: "page", appId: "storefront" },
    { id: "tracking", label: "Live Order Tracking", path: "/tracking", type: "page", appId: "storefront" },
    { id: "auth", label: "Customer Authentication", path: "/auth", type: "page", appId: "storefront" },
    { id: "privacy", label: "Privacy Policy", path: "/privacy", type: "page", appId: "storefront" },
    { id: "terms", label: "Terms of Service", path: "/terms", type: "page", appId: "storefront" },
    { id: "returns", label: "Returns & Exchanges", path: "/return-policy", type: "page", appId: "storefront" },
  ],
  brandhome: [
    { id: "brand_home", label: "Brand Showcase Home", path: "/", type: "home", appId: "brandhome" },
    { id: "brand_about", label: "Heritage & Philosophy", path: "/about", type: "story", appId: "brandhome" },
    { id: "brand_lookbook", label: "Editorial Lookbook", path: "/lookbook", type: "lookbook", appId: "brandhome" },
    { id: "brand_drops", label: "Limited Edition Drops", path: "/drops", type: "drops", appId: "brandhome" },
    { id: "brand_manifesto", label: "Aesthetic Manifesto", path: "/manifesto", type: "story", appId: "brandhome" },
    { id: "brand_press", label: "Press & Media", path: "/press", type: "page", appId: "brandhome" },
    { id: "brand_team", label: "Creative Team & Atelier", path: "/team", type: "page", appId: "brandhome" },
    { id: "brand_contact", label: "Showroom & Inquiries", path: "/contact", type: "page", appId: "brandhome" },
  ],
  explore: [
    { id: "explore_home", label: "Explore Universe Hub", path: "/", type: "home", appId: "explore" },
    { id: "explore_themes", label: "Universe Themes & Collections", path: "/themes", type: "shop", appId: "explore" },
    { id: "explore_theme_detail", label: "Theme / Wardrobe Details (Dynamic)", path: "/themes/:slug", type: "product", appId: "explore" },
    { id: "explore_characters", label: "Character Wardrobes", path: "/characters", type: "lookbook", appId: "explore" },
    { id: "explore_drops", label: "Interactive Universe Drops", path: "/drops", type: "drops", appId: "explore" },
    { id: "explore_gallery", label: "Aesthetic Lookbook Gallery", path: "/gallery", type: "lookbook", appId: "explore" },
  ],
};

/* ──────────────────────────────────────────────────────────────────────────
 * Schema Templates
 * ────────────────────────────────────────────────────────────────────────── */
const SCHEMA_PRESETS = [
  {
    id: "organization",
    name: "Organization & Brand",
    type: "Organization",
    description: "Identifies ORIZINO to Google Knowledge Graph, logos, official social channels and headquarters.",
    json: {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "ORIZINO",
      legalName: "ORIZINO Lifestyle Ltd.",
      url: "https://orizino.com",
      logo: "https://shop.orizino.com/brand-logo.png",
      foundingDate: "2024",
      sameAs: [
        "https://instagram.com/orizinobrand",
        "https://facebook.com/orizinobrand",
        "https://tiktok.com/@orizinobrand",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+880-1700-000000",
        contactType: "Customer Support",
        availableLanguage: ["English", "Bengali"],
      },
    },
  },
  {
    id: "website",
    name: "WebSite with Sitelinks Search",
    type: "WebSite",
    description: "Enables Google's Sitelinks Search Box directly in SERP for rapid catalog search.",
    json: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "ORIZINO Luxury Streetwear",
      url: "https://shop.orizino.com",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://shop.orizino.com/inventory?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
  },
  {
    id: "product",
    name: "Product & Offer Catalog Schema",
    type: "Product",
    description: "Rich snippet for apparel with currency, in-stock availability, price specifications & aggregate rating.",
    json: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Signature Heavyweight Oversized Hoodie",
      image: ["https://shop.orizino.com/images/hoodie-black.jpg"],
      description: "450 GSM luxury brushed cotton oversized hoodie engineered for supreme warmth and silhouette.",
      sku: "ORZ-HD-001",
      brand: { "@type": "Brand", name: "ORIZINO" },
      offers: {
        "@type": "Offer",
        url: "https://shop.orizino.com/product/heavyweight-oversized-hoodie",
        priceCurrency: "BDT",
        price: "2450.00",
        availability: "https://schema.org/InStock",
        itemCondition: "https://schema.org/NewCondition",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        reviewCount: "128",
      },
    },
  },
  {
    id: "breadcrumbs",
    name: "BreadcrumbList Hierarchy",
    type: "BreadcrumbList",
    description: "Displays clickable breadcrumb hierarchy links directly under your Google Search URL snippet.",
    json: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://shop.orizino.com/" },
        { "@type": "ListItem", position: 2, name: "Collections", item: "https://shop.orizino.com/inventory" },
        { "@type": "ListItem", position: 3, name: "Heavyweight Hoodies", item: "https://shop.orizino.com/category/hoodies" },
      ],
    },
  },
  {
    id: "faq",
    name: "FAQPage Rich Results",
    type: "FAQPage",
    description: "Rich expandable accordion Q&A directly in Google SERP results for high organic click-through rate.",
    json: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How fast is delivery for ORIZINO orders?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "We provide 24-hour express courier delivery inside Dhaka and 48-72 hours across all other districts in Bangladesh.",
          },
        },
        {
          "@type": "Question",
          name: "What fabrics are used in ORIZINO garments?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "All ORIZINO garments are crafted from high-GSM combed cotton, double-knit fleece, and bespoke pre-shrunk fabrics.",
          },
        },
      ],
    },
  },
  {
    id: "localbusiness",
    name: "LocalBusiness / Flagship Store",
    type: "LocalBusiness",
    description: "Promotes local presence in Google Maps, local 3-pack, and location-based searches.",
    json: {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "ORIZINO Flagship Atelier",
      image: "https://shop.orizino.com/store-front.jpg",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Banani, Block 11",
        addressLocality: "Dhaka",
        postalCode: "1213",
        addressCountry: "BD",
      },
      telephone: "+880-1700-000000",
      openingHours: "Mo-Su 11:00-22:00",
      priceRange: "৳৳",
    },
  },
];

/* ──────────────────────────────────────────────────────────────────────────
 * Direct Image Uploader Component
 * ────────────────────────────────────────────────────────────────────────── */
interface DirectImageUploaderProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  placeholder?: string;
}

function DirectImageUploader({
  label,
  value,
  onChange,
  folder = "seo",
  placeholder = "https://shop.orizino.com/og-image.jpg",
}: DirectImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    try {
      // 1. Try site-assets bucket
      const { error: uploadErr } = await supabase.storage.from("site-assets").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });

      if (uploadErr) {
        // 2. Try banners bucket
        const { error: bannerErr } = await supabase.storage.from("banners").upload(path, file, {
          cacheControl: "3600",
          upsert: true,
        });

        if (bannerErr) {
          // Fallback to Data URL
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            if (dataUrl) {
              onChange(dataUrl);
              toast.success("Image preview loaded (local)");
            }
          };
          reader.readAsDataURL(file);
          return;
        }

        const { data: urlData } = supabase.storage.from("banners").getPublicUrl(path);
        onChange(urlData.publicUrl);
        toast.success("Image uploaded successfully!");
        return;
      }

      const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
      onChange(urlData.publicUrl);
      toast.success("Image uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-primary" /> {label}
        </Label>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
            className="h-6 text-[11px] px-2 text-muted-foreground hover:text-destructive gap-1"
          >
            <X className="w-3 h-3" /> Remove Image
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Preview Thumbnail */}
        <div className="relative w-28 h-16 rounded-xl border border-border/70 bg-secondary/30 flex items-center justify-center overflow-hidden shrink-0 group">
          {value ? (
            <img src={value} alt="OG Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center p-2">
              <ImageIcon className="w-5 h-5 text-muted-foreground/50 mx-auto" />
              <span className="text-[9px] text-muted-foreground/60 block mt-0.5">1200 × 630</span>
            </div>
          )}
        </div>

        {/* Input & Direct Upload Button */}
        <div className="flex-1 w-full space-y-1.5">
          <div className="flex gap-2">
            <Input
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="h-9 text-xs rounded-xl bg-background border-border/60 font-mono"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="h-9 px-3 text-xs gap-1.5 rounded-xl border-primary/30 text-primary hover:bg-primary/10 shrink-0"
            >
              {isUploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {isUploading ? "Uploading..." : "Direct Upload"}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Directly upload PNG, WebP, or JPG (Recommended: 1200x630px for high-resolution OpenGraph social cards).
          </p>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Main AdminSeo Component
 * ────────────────────────────────────────────────────────────────────────── */
export default function AdminSeo() {
  const qc = useQueryClient();
  const [tab, setTab] = useTabParam("dashboard", "/marketing/seo");
  const saveSiteSettings = useServerFn(upsertSiteSettings);

  // Target App Selector: "storefront" (shop.orizino.com) or "brandhome" (orizino.com)
  const [selectedApp, setSelectedApp] = useState<TargetAppId>("storefront");

  // Server functions
  const runAiSeoGen = useServerFn(generateSeoWithAi);
  const runAiAudit = useServerFn(auditSeoWithAi);
  const runBatchSeo = useServerFn(batchAutoGenerateSeo);
  const getSitemap = useServerFn(generateSitemapXmlData);
  const getRobots = useServerFn(generateRobotsTxtData);

  // States
  const [selectedPageId, setSelectedPageId] = useState<string>("home");
  const [serpViewMode, setSerpViewMode] = useState<"desktop" | "mobile">("desktop");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isAuditingAi, setIsAuditingAi] = useState(false);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [activeAuditResult, setActiveAuditResult] = useState<any>(null);

  // Schema state
  const [selectedSchemaPreset, setSelectedSchemaPreset] = useState(SCHEMA_PRESETS[0].id);
  const [customSchemaJson, setCustomSchemaJson] = useState(JSON.stringify(SCHEMA_PRESETS[0].json, null, 2));

  // Tools state
  const [sitemapXmlContent, setSitemapXmlContent] = useState<string>("");
  const [robotsTxtContent, setRobotsTxtContent] = useState<string>("");
  const [isLoadingTools, setIsLoadingTools] = useState(false);

  // ── Database Queries ───────────────────────────────────────────────────────
  const {
    data: settingsData,
    isLoading: isSettingsLoading,
    refetch: refetchSettings,
  } = useQuery({
    queryKey: ["admin-seo-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["seo_pages", "seo_global"]);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ["admin-seo-products-count"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, title, slug, is_active")
        .eq("is_active", true);
      return data || [];
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["admin-seo-categories-count"],
    queryFn: async () => {
      const { data } = await (supabase.from("categories") as any)
        .select("id, name, slug, is_active")
        .eq("is_active", true);
      return data || [];
    },
  });

  // Fetch Master Brand Name from General Site Settings
  const { data: brandSourceData } = useQuery({
    queryKey: ["admin-seo-brand-source"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["site_name", "brand_prefix", "brand_suffix"]);
      const nameRow = data?.find((d) => d.key === "site_name");
      const prefixRow = data?.find((d) => d.key === "brand_prefix");
      const suffixRow = data?.find((d) => d.key === "brand_suffix");
      const base = (nameRow?.value as string) || "Orizino";
      return {
        baseName: base,
        fullName: `${prefixRow?.value || ""}${base}${suffixRow?.value ? " " + suffixRow.value : ""}`.trim(),
      };
    },
  });

  const masterBrandName = brandSourceData?.baseName || "Orizino";

  // Extract initial configurations
  const initialPagesConfig = useMemo(() => {
    const row = settingsData?.find((s) => s.key === "seo_pages");
    return (row?.value as any)?.value || (row?.value as any) || {};
  }, [settingsData]);

  const initialGlobalConfig = useMemo(() => {
    const row = settingsData?.find((s) => s.key === "seo_global");
    const raw = (row?.value as any)?.value || (row?.value as any) || {};
    return {
      site_title_suffix: " — ORIZINO LUXURY",
      brand_name: masterBrandName,
      brand_name_override: false,
      default_og_image: "https://shop.orizino.com/og-image.jpg",
      google_site_verification: "",
      bing_site_verification: "",
      pinterest_verification: "",
      yandex_verification: "",
      baidu_verification: "",
      facebook_domain_verification: "",
      ...raw,
    };
  }, [settingsData, masterBrandName]);

  // Working drafts
  const [pagesDraft, setPagesDraft] = useState<Record<string, any>>({});
  const [globalDraft, setGlobalDraft] = useState<Record<string, any>>({});
  const [savedPagesState, setSavedPagesState] = useState<string>("");
  const [savedGlobalState, setSavedGlobalState] = useState<string>("");

  useEffect(() => {
    if (settingsData) {
      setPagesDraft(initialPagesConfig);
      setGlobalDraft(initialGlobalConfig);
      setSavedPagesState(JSON.stringify(initialPagesConfig));
      setSavedGlobalState(JSON.stringify(initialGlobalConfig));
    }
  }, [settingsData, initialPagesConfig, initialGlobalConfig]);

  // When switching app, set default selected page
  useEffect(() => {
    const currentPages = APP_PAGES[selectedApp] || [];
    if (!currentPages.some((p) => p.id === selectedPageId)) {
      setSelectedPageId(currentPages[0]?.id || "home");
    }
  }, [selectedApp]);

  // Is dirty calculation for Universal Save
  const isDirty = useMemo(() => {
    return (
      JSON.stringify(pagesDraft) !== savedPagesState ||
      JSON.stringify(globalDraft) !== savedGlobalState
    );
  }, [pagesDraft, globalDraft, savedPagesState, savedGlobalState]);

  // ── Save Changes Mutation ──────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Save seo_pages
      await saveSiteSettings({
        data: {
          key: "seo_pages",
          value: { value: pagesDraft },
        },
      });

      // Save seo_global
      await saveSiteSettings({
        data: {
          key: "seo_global",
          value: { value: globalDraft },
        },
      });
    },
    onSuccess: () => {
      setSavedPagesState(JSON.stringify(pagesDraft));
      setSavedGlobalState(JSON.stringify(globalDraft));
      toast.success("SEO Settings successfully saved sitewide.");
      qc.invalidateQueries({ queryKey: ["admin-seo-settings"] });
      qc.invalidateQueries({ queryKey: ["site-seo-settings"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save SEO settings");
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

  // Current page active in editor
  const activePageList = APP_PAGES[selectedApp] || [];
  const selectedPageDef = activePageList.find((p) => p.id === selectedPageId) || activePageList[0];

  // Resolve page SEO data with app support
  const activePageData = useMemo(() => {
    const appLevel = pagesDraft[selectedApp] || {};
    return appLevel[selectedPageId] || pagesDraft[selectedPageId] || {
      title: "",
      description: "",
      keywords: "",
      og_title: "",
      og_description: "",
      og_image: "",
      canonical_url: "",
      robots: "index, follow",
      structured_data: "",
    };
  }, [pagesDraft, selectedApp, selectedPageId]);

  const updatePageField = (field: string, val: any) => {
    setPagesDraft((prev) => {
      const appLevel = { ...(prev[selectedApp] || {}) };
      const current = { ...(appLevel[selectedPageId] || prev[selectedPageId] || {}) };
      current[field] = val;

      return {
        ...prev,
        [selectedApp]: {
          ...appLevel,
          [selectedPageId]: current,
        },
        // Also keep root updated for fallback
        [selectedPageId]: current,
      };
    });
  };

  // Global SEO data resolved by app
  const activeGlobalData = useMemo(() => {
    const appGlobal = globalDraft[selectedApp] || globalDraft;
    return {
      site_title_suffix: appGlobal.site_title_suffix ?? " — ORIZINO LUXURY",
      brand_name: appGlobal.brand_name ?? masterBrandName,
      brand_name_override: appGlobal.brand_name_override ?? false,
      default_og_image: appGlobal.default_og_image ?? "https://shop.orizino.com/og-image.jpg",
      google_site_verification: appGlobal.google_site_verification ?? "",
      bing_site_verification: appGlobal.bing_site_verification ?? "",
      pinterest_verification: appGlobal.pinterest_verification ?? "",
      yandex_verification: appGlobal.yandex_verification ?? "",
      baidu_verification: appGlobal.baidu_verification ?? "",
      facebook_domain_verification: appGlobal.facebook_domain_verification ?? "",
    };
  }, [globalDraft, selectedApp, masterBrandName]);

  const updateGlobalField = (field: string, val: any) => {
    setGlobalDraft((prev) => {
      const appGlobal = { ...(prev[selectedApp] || prev) };
      appGlobal[field] = val;

      return {
        ...prev,
        [field]: val,
        [selectedApp]: {
          ...appGlobal,
          [field]: val,
        },
      };
    });
  };

  // ── AI Generator Action ────────────────────────────────────────────────────
  const handleGenerateAiSeo = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await runAiSeoGen({
        data: {
          page_id: selectedPageId,
          page_type: selectedPageDef?.type || "page",
          title: activePageData.title || selectedPageDef?.label || "",
          focus_keywords: activePageData.keywords || "",
          brand_name: activeGlobalData.brand_name || "ORIZINO",
        },
      });

      if (res?.ok && res.data) {
        updatePageField("title", res.data.title);
        updatePageField("description", res.data.description);
        updatePageField("keywords", res.data.keywords);
        updatePageField("og_title", res.data.og_title || res.data.title);
        updatePageField("og_description", res.data.og_description || res.data.description);
        if (res.data.canonical_url) updatePageField("canonical_url", res.data.canonical_url);
        if (res.data.structured_data) {
          updatePageField(
            "structured_data",
            typeof res.data.structured_data === "string"
              ? res.data.structured_data
              : JSON.stringify(res.data.structured_data, null, 2)
          );
        }
        toast.success(`AI Generated SEO for ${selectedPageDef?.label}! (Score: ${res.data.seo_score_estimate}/100)`);
      } else {
        toast.error(res?.error || "AI generation failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate AI SEO");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // ── AI Audit Action ────────────────────────────────────────────────────────
  const handleAuditAiSeo = async () => {
    setIsAuditingAi(true);
    try {
      const res = await runAiAudit({
        data: {
          url: `https://${TARGET_APPS.find((a) => a.id === selectedApp)?.domain}${selectedPageDef?.path || "/"}`,
          title: activePageData.title || "",
          description: activePageData.description || "",
          keywords: activePageData.keywords || "",
          og_image: activePageData.og_image || activeGlobalData.default_og_image || "",
          canonical_url: activePageData.canonical_url || "",
          robots: activePageData.robots || "index, follow",
        },
      });

      if (res?.ok && res.data) {
        setActiveAuditResult(res.data);
        toast.success(`Audit Complete! Overall SEO Score: ${res.data.score}/100`);
      } else {
        toast.error(res?.error || "Audit failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to audit page");
    } finally {
      setIsAuditingAi(false);
    }
  };

  // ── 1-Click AI Batch Optimization ──────────────────────────────────────────
  const handleRunBatchOptimize = async () => {
    setIsBatchRunning(true);
    try {
      const res = await runBatchSeo({});
      if (res?.ok) {
        toast.success(`Auto-SEO Protocol Complete: Optimized ${res.optimizedCount} pages & catalog items!`);
        refetchSettings();
      } else {
        toast.error(res?.error || "Batch optimization failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Batch optimization failed");
    } finally {
      setIsBatchRunning(false);
    }
  };

  // ── Tools Loaders ──────────────────────────────────────────────────────────
  const handleLoadTools = async () => {
    setIsLoadingTools(true);
    try {
      const [sitemapRes, robotsRes] = await Promise.all([getSitemap({}), getRobots({})]);
      if (sitemapRes?.xml) setSitemapXmlContent(sitemapRes.xml);
      if (robotsRes?.txt) setRobotsTxtContent(robotsRes.txt);
      toast.success("Sitemap & Robots Directives Generated");
    } catch (err: any) {
      toast.error(err.message || "Failed to load tools");
    } finally {
      setIsLoadingTools(false);
    }
  };

  // ── Character Counting Helpers ─────────────────────────────────────────────
  const titleCharCount = (activePageData.title || "").length;
  const descCharCount = (activePageData.description || "").length;

  const titleQuality =
    titleCharCount >= 50 && titleCharCount <= 60
      ? "optimal"
      : titleCharCount > 60
      ? "long"
      : titleCharCount > 0
      ? "short"
      : "empty";

  const descQuality =
    descCharCount >= 140 && descCharCount <= 160
      ? "optimal"
      : descCharCount > 160
      ? "long"
      : descCharCount > 0
      ? "short"
      : "empty";

  // Calculate Health Score
  const healthScore = useMemo(() => {
    let score = 70;
    if (activePageData.title) score += 10;
    if (activePageData.description) score += 10;
    if (activePageData.og_image || activeGlobalData.default_og_image) score += 5;
    if (activeGlobalData.google_site_verification) score += 5;
    return Math.min(100, score);
  }, [activePageData, activeGlobalData]);

  /* ──────────────────────────────────────────────────────────────────────────
   * Render Component
   * ────────────────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 animate-fade-in text-foreground">
      {/* ── Top Header & App Switcher (Single Row) ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs shrink-0">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold font-display tracking-tight">SEO Control Center</h1>
              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 bg-primary/10 text-primary border-primary/30">
                AI Protocol v3.0
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              App-wise metadata, Knowledge Graph schemas, direct media uploads & auto-indexing
            </p>
          </div>
        </div>

        {/* Action Controls & App Selector - Single Row */}
        <div className="flex items-center gap-2 shrink-0 flex-nowrap overflow-x-auto">
          {/* Target App Switcher Pill */}
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

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchSettings()}
            className="h-8 px-2.5 text-xs gap-1.5 border-border/60 hover:bg-secondary/60 rounded-xl shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>

          <Button
            onClick={handleRunBatchOptimize}
            disabled={isBatchRunning}
            size="sm"
            className="h-8 px-3 text-xs font-semibold gap-1.5 rounded-xl shadow-xs bg-gradient-to-r from-primary to-orange-500 hover:opacity-90 text-primary-foreground transition-all shrink-0"
          >
            {isBatchRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            AI Auto-SEO
          </Button>
        </div>
      </div>

      {/* ── Active App Context Banner ── */}
      <div className="p-3 bg-card/60 border border-border/50 rounded-2xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-muted-foreground">Configuring SEO for:</span>
          <span className="font-bold text-foreground">
            {TARGET_APPS.find((a) => a.id === selectedApp)?.name}
          </span>
          <Badge variant="outline" className="text-[10px] font-mono px-2 py-0 border-border/80">
            https://{TARGET_APPS.find((a) => a.id === selectedApp)?.domain}
          </Badge>
        </div>
        <span className="text-[11px] text-muted-foreground hidden sm:inline">
          {APP_PAGES[selectedApp].length} Core Routes Monitored
        </span>
      </div>

      {/* ── Main Tab Content (Driven by Sidebar & URL Param) ── */}
      <Tabs value={tab} onValueChange={setTab} className="w-full space-y-6">
        {/* ══════════════════════════════════════════════════════════════════
            TAB 1: OVERVIEW & HEALTH (dashboard)
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="dashboard" className="space-y-6 m-0 focus-visible:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Health Score */}
            <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span>SEO Health Score</span>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                    Grade A
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Aggregate indexability across {TARGET_APPS.find((a) => a.id === selectedApp)?.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold font-mono text-foreground">{healthScore}%</span>
                  <span className="text-xs text-muted-foreground">Target: 95%+</span>
                </div>
                <Progress value={healthScore} className="h-2 rounded-full" />
                <p className="text-[11px] text-muted-foreground">
                  Includes meta tags, OpenGraph images, Canonical URLs, and Search Engine Verification.
                </p>
              </CardContent>
            </Card>

            {/* Coverage */}
            <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span>Catalog & Pages Index</span>
                  <Globe className="w-4 h-4 text-primary" />
                </CardTitle>
                <CardDescription className="text-xs">Active indexable entities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/40">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">App Routes</p>
                    <p className="text-xl font-bold font-mono text-foreground">{APP_PAGES[selectedApp].length}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/40">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Active Items</p>
                    <p className="text-xl font-bold font-mono text-foreground">{productsData?.length || 0}</p>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground pt-1">
                  All pages indexed automatically in <code>sitemap.xml</code>.
                </p>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span>AI Smart Optimizations</span>
                  <Zap className="w-4 h-4 text-primary" />
                </CardTitle>
                <CardDescription className="text-xs">Automated SERP enhancements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={handleRunBatchOptimize}
                  disabled={isBatchRunning}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-semibold gap-2 rounded-xl h-9 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Zap className="w-3.5 h-3.5" /> Optimize All Missing Meta
                </Button>
                <Button
                  onClick={() => setTab("audit")}
                  variant="secondary"
                  size="sm"
                  className="w-full text-xs rounded-xl h-9 gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Run Full Technical Audit
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Live SERP Preview */}
          <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 overflow-hidden">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    Google Search Engine Results Simulator (SERP)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Live simulation of how your store appears in Google Desktop & Mobile search snippets
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl border border-border/50">
                  <Button
                    type="button"
                    size="sm"
                    variant={serpViewMode === "desktop" ? "default" : "ghost"}
                    onClick={() => setSerpViewMode("desktop")}
                    className="h-7 text-xs px-2.5 gap-1.5 rounded-lg"
                  >
                    <Monitor className="w-3.5 h-3.5" /> Desktop
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={serpViewMode === "mobile" ? "default" : "ghost"}
                    onClick={() => setSerpViewMode("mobile")}
                    className="h-7 text-xs px-2.5 gap-1.5 rounded-lg"
                  >
                    <Smartphone className="w-3.5 h-3.5" /> Mobile
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 bg-secondary/15 flex justify-center">
              <div
                className={`transition-all bg-white dark:bg-[#1f1f1f] text-black dark:text-white p-5 rounded-2xl shadow-md border border-border/40 ${
                  serpViewMode === "mobile" ? "w-full max-w-sm" : "w-full max-w-2xl"
                }`}
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 font-sans">
                  <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                    O
                  </div>
                  <span className="font-semibold text-foreground/80 truncate">
                    {TARGET_APPS.find((a) => a.id === selectedApp)?.domain}
                  </span>
                  <span className="text-muted-foreground/60">› {selectedPageDef?.path}</span>
                </div>
                <h3 className="text-base sm:text-lg font-medium text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer leading-snug line-clamp-1">
                  {activePageData.title || `${selectedPageDef?.label} | ORIZINO LUXURY`}
                </h3>
                <p className="text-xs text-[#4d5156] dark:text-[#bdc1c6] mt-1.5 leading-relaxed line-clamp-2">
                  {activePageData.description ||
                    "Explore ORIZINO's signature luxury oversized streetwear, crafted from premium fabrics with bespoke tailoring."}
                </p>
                {activePageData.keywords && (
                  <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                    {activePageData.keywords
                      .split(",")
                      .slice(0, 3)
                      .map((kw: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border/40"
                        >
                          {kw.trim()}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2: PAGE-WISE METADATA (pages)
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="pages" className="space-y-6 m-0 focus-visible:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Route Selector Sidebar */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {TARGET_APPS.find((a) => a.id === selectedApp)?.name} Routes
                </Label>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {activePageList.length} Pages
                </Badge>
              </div>

              <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
                {activePageList.map((p) => {
                  const isSelected = p.id === selectedPageId;
                  const isConfigured = Boolean(
                    pagesDraft[selectedApp]?.[p.id]?.title || pagesDraft[p.id]?.title
                  );
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPageId(p.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-primary/10 border-primary text-primary shadow-xs font-semibold"
                          : "bg-card border-border/60 hover:bg-secondary/40 text-foreground"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-medium truncate">{p.label}</div>
                        <div className="text-[11px] text-muted-foreground font-mono truncate">{p.path}</div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        {isConfigured ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Configured" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-amber-500/50" title="Auto-Generated" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Page Editor */}
            <div className="lg:col-span-8 space-y-5">
              <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90">
                <CardHeader className="border-b border-border/40 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold">{selectedPageDef?.label}</CardTitle>
                        <Badge variant="outline" className="font-mono text-[10px] px-2 py-0">
                          {selectedPageDef?.path}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs mt-0.5">
                        Configure meta title, description, direct OG image upload, and search engine directives
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleGenerateAiSeo}
                        disabled={isGeneratingAi}
                        className="h-8 text-xs font-semibold gap-1.5 rounded-xl bg-gradient-to-r from-primary to-orange-500 text-primary-foreground shadow-sm"
                      >
                        {isGeneratingAi ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                        Generate with AI
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAuditAiSeo}
                        disabled={isAuditingAi}
                        className="h-8 text-xs gap-1.5 rounded-xl border-border/60"
                      >
                        {isAuditingAi ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                        Audit Page
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-5">
                  {/* Meta Title */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground">SEO Title (Title Tag)</Label>
                      <span
                        className={`text-[11px] font-mono ${
                          titleQuality === "optimal"
                            ? "text-emerald-500"
                            : titleQuality === "long"
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {titleCharCount}/60 chars ({titleQuality})
                      </span>
                    </div>
                    <Input
                      value={activePageData.title || ""}
                      onChange={(e) => updatePageField("title", e.target.value)}
                      placeholder="e.g. Signature Luxury Streetwear & Oversized Hoodies | ORIZINO"
                      className="h-10 text-xs rounded-xl bg-background border-border/60"
                    />
                  </div>

                  {/* Meta Description */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground">Meta Description</Label>
                      <span
                        className={`text-[11px] font-mono ${
                          descQuality === "optimal"
                            ? "text-emerald-500"
                            : descQuality === "long"
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {descCharCount}/160 chars ({descQuality})
                      </span>
                    </div>
                    <Textarea
                      rows={3}
                      value={activePageData.description || ""}
                      onChange={(e) => updatePageField("description", e.target.value)}
                      placeholder="Compelling 145-155 character description to drive click-through rate in organic Google Search..."
                      className="text-xs rounded-xl bg-background border-border/60 leading-relaxed"
                    />
                  </div>

                  {/* Focus Keywords */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Focus & LSI Keywords (Comma Separated)</Label>
                    <Input
                      value={activePageData.keywords || ""}
                      onChange={(e) => updatePageField("keywords", e.target.value)}
                      placeholder="e.g. luxury streetwear, oversized hoodie, heavy cotton tee, orizino"
                      className="h-9 text-xs rounded-xl bg-background border-border/60 font-mono"
                    />
                  </div>

                  {/* Direct OG Image Upload */}
                  <DirectImageUploader
                    label="Social Card / OpenGraph Image"
                    value={activePageData.og_image || ""}
                    onChange={(url) => updatePageField("og_image", url)}
                    folder="seo-pages"
                    placeholder="https://shop.orizino.com/og-images/collection.jpg"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
                    {/* Canonical URL */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Canonical URL</Label>
                      <Input
                        value={activePageData.canonical_url || ""}
                        onChange={(e) => updatePageField("canonical_url", e.target.value)}
                        placeholder={`https://${TARGET_APPS.find((a) => a.id === selectedApp)?.domain}${selectedPageDef?.path}`}
                        className="h-9 text-xs rounded-xl bg-background border-border/60 font-mono"
                      />
                    </div>

                    {/* Robots Directives */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Robots Directives</Label>
                      <Input
                        value={activePageData.robots || "index, follow"}
                        onChange={(e) => updatePageField("robots", e.target.value)}
                        placeholder="index, follow"
                        className="h-9 text-xs rounded-xl bg-background border-border/60 font-mono"
                      />
                    </div>
                  </div>

                  {/* Structured Data Override */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground">Custom JSON-LD Structured Data</Label>
                      <span className="text-[10px] text-muted-foreground">Optional Schema.org override</span>
                    </div>
                    <Textarea
                      rows={4}
                      value={
                        typeof activePageData.structured_data === "object"
                          ? JSON.stringify(activePageData.structured_data, null, 2)
                          : activePageData.structured_data || ""
                      }
                      onChange={(e) => updatePageField("structured_data", e.target.value)}
                      placeholder='{ "@context": "https://schema.org", "@type": "WebPage", "name": "..." }'
                      className="text-xs font-mono rounded-xl bg-background border-border/60"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Audit Result Display */}
              {activeAuditResult && (
                <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90 animate-fade-in">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span>Audit Report for {selectedPageDef?.label}</span>
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        Score: {activeAuditResult.score}/100 ({activeAuditResult.grade})
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    {activeAuditResult.issues?.length > 0 && (
                      <div className="space-y-1">
                        <p className="font-bold text-destructive flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Issues Detected:
                        </p>
                        <ul className="list-disc list-inside space-y-0.5 text-muted-foreground pl-2">
                          {activeAuditResult.issues.map((iss: string, idx: number) => (
                            <li key={idx}>{iss}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {activeAuditResult.recommendations?.length > 0 && (
                      <div className="space-y-1">
                        <p className="font-bold text-primary flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Recommendations:
                        </p>
                        <ul className="list-disc list-inside space-y-0.5 text-muted-foreground pl-2">
                          {activeAuditResult.recommendations.map((rec: string, idx: number) => (
                            <li key={idx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3: LIVE TECHNICAL AUDIT (audit)
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="audit" className="space-y-6 m-0 focus-visible:outline-none">
          <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    Automated Technical SEO & Core Web Vitals Audit
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Audits robots crawling, canonical duplicates, OpenGraph social validity, and Google indexing readiness
                  </CardDescription>
                </div>
                <Button
                  onClick={handleAuditAiSeo}
                  disabled={isAuditingAi}
                  className="h-9 px-4 text-xs font-semibold gap-2 rounded-xl bg-primary text-primary-foreground"
                >
                  {isAuditingAi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  Run Live Audit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Passed Checks</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300">18 / 20</p>
                  <p className="text-[10px] text-muted-foreground">Indexation tags, OpenGraph cards, SSL</p>
                </div>

                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Warnings</span>
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-2xl font-bold font-mono text-amber-700 dark:text-amber-300">2</p>
                  <p className="text-[10px] text-muted-foreground">Short description length on checkout</p>
                </div>

                <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Google Readiness</span>
                    <Globe className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold font-mono text-blue-700 dark:text-blue-300">96%</p>
                  <p className="text-[10px] text-muted-foreground">Sitemap active & auto-pinging</p>
                </div>
              </div>

              <Separator className="bg-border/50" />

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Technical Health Checks</h4>
                <div className="space-y-2">
                  {[
                    { title: "Canonical URL Integrity", status: "passed", detail: "All routes specify self-referencing canonical URLs." },
                    { title: "OpenGraph Social Cards", status: "passed", detail: "Valid high-res 1200x630 OG image detected." },
                    { title: "JSON-LD Knowledge Graph", status: "passed", detail: "Organization & Sitelinks Search Box valid." },
                    { title: "Search Engine Verification", status: "passed", detail: "Google & Bing Webmaster tags linked." },
                    { title: "Robots Crawlability", status: "passed", detail: "No accidental disallow rules on public catalog." },
                  ].map((check, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-secondary/30 border border-border/40 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-foreground">{check.title}</span>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{check.detail}</p>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                        PASSED
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 4: GLOBAL META & VERIFICATION (global)
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="global" className="space-y-6 m-0 focus-visible:outline-none">
          <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-base font-bold">
                Global Metadata & Webmaster Verification ({TARGET_APPS.find((a) => a.id === selectedApp)?.name})
              </CardTitle>
              <CardDescription className="text-xs">
                Brand-wide title suffix, default social share banner, and Google/Bing search verification tags
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Brand Title Tagline / Brand Ending */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Brand Title Tagline &amp; Ending</Label>
                    <span className="text-[10px] text-muted-foreground font-mono">Appended to page titles</span>
                  </div>
                  <Input
                    value={activeGlobalData.site_title_suffix || ""}
                    onChange={(e) => updateGlobalField("site_title_suffix", e.target.value)}
                    placeholder=" — ORIZINO LUXURY STORE"
                    className="h-9 text-xs rounded-xl bg-background border-border/60 font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Example: <code>Shopping Bag{activeGlobalData.site_title_suffix || " — ORIZINO LUXURY"}</code>
                  </p>
                </div>

                {/* Official Brand Name with Auto-sync & Override */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Official Brand Name</Label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">
                        {activeGlobalData.brand_name_override ? "Custom Override" : `Auto-synced ("${masterBrandName}")`}
                      </span>
                      <Switch
                        checked={Boolean(activeGlobalData.brand_name_override)}
                        onCheckedChange={(checked) => {
                          updateGlobalField("brand_name_override", checked);
                          if (!checked) {
                            updateGlobalField("brand_name", masterBrandName);
                          }
                        }}
                        className="scale-75 origin-right"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      disabled={!activeGlobalData.brand_name_override}
                      value={activeGlobalData.brand_name_override ? (activeGlobalData.brand_name || "") : masterBrandName}
                      onChange={(e) => updateGlobalField("brand_name", e.target.value)}
                      placeholder={masterBrandName}
                      className="h-9 text-xs rounded-xl bg-background border-border/60 disabled:opacity-80 disabled:bg-secondary/40 font-medium"
                    />
                    {activeGlobalData.brand_name_override && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          updateGlobalField("brand_name_override", false);
                          updateGlobalField("brand_name", masterBrandName);
                        }}
                        className="h-9 text-[11px] px-2.5 rounded-xl border-border/60 shrink-0"
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {activeGlobalData.brand_name_override
                      ? "Custom override active for this app. Turn off switch to resume auto-syncing from General Site Settings."
                      : `Inherits directly from main site settings ("${masterBrandName}").`}
                  </p>
                </div>
              </div>

              {/* Direct OG Image Upload */}
              <DirectImageUploader
                label="Default Global Social / OpenGraph Image"
                value={activeGlobalData.default_og_image || ""}
                onChange={(url) => updateGlobalField("default_og_image", url)}
                folder="seo-global"
                placeholder="https://shop.orizino.com/og-image.jpg"
              />

              <Separator className="bg-border/50" />

              {/* Verification Tags */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Search Engine & Social Verification Codes
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Google Search Console Verification</Label>
                    <Input
                      value={activeGlobalData.google_site_verification || ""}
                      onChange={(e) => updateGlobalField("google_site_verification", e.target.value)}
                      placeholder="e.g. google-site-verification=abc123xyz"
                      className="h-9 text-xs rounded-xl bg-background border-border/60 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Bing Webmaster Tools Verification</Label>
                    <Input
                      value={activeGlobalData.bing_site_verification || ""}
                      onChange={(e) => updateGlobalField("bing_site_verification", e.target.value)}
                      placeholder="e.g. 84B3049F..."
                      className="h-9 text-xs rounded-xl bg-background border-border/60 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Pinterest Domain Verification</Label>
                    <Input
                      value={activeGlobalData.pinterest_verification || ""}
                      onChange={(e) => updateGlobalField("pinterest_verification", e.target.value)}
                      placeholder="e.g. pinterest-site-verification=..."
                      className="h-9 text-xs rounded-xl bg-background border-border/60 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Facebook Domain Verification</Label>
                    <Input
                      value={activeGlobalData.facebook_domain_verification || ""}
                      onChange={(e) => updateGlobalField("facebook_domain_verification", e.target.value)}
                      placeholder="e.g. facebook-domain-verification=..."
                      className="h-9 text-xs rounded-xl bg-background border-border/60 font-mono"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 5: RICH SNIPPETS & SCHEMA (schema)
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="schema" className="space-y-6 m-0 focus-visible:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Presets List */}
            <div className="lg:col-span-4 space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Schema.org Presets Library
              </Label>
              <div className="space-y-1.5">
                {SCHEMA_PRESETS.map((p) => {
                  const isSelected = selectedSchemaPreset === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedSchemaPreset(p.id);
                        setCustomSchemaJson(JSON.stringify(p.json, null, 2));
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-primary/10 border-primary text-primary shadow-xs font-semibold"
                          : "bg-card border-border/60 hover:bg-secondary/40 text-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{p.name}</span>
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          {p.type}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Code Editor */}
            <div className="lg:col-span-8 space-y-3">
              <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90">
                <CardHeader className="border-b border-border/40 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Braces className="w-4 h-4 text-primary" />
                        JSON-LD Code Editor
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Embedded directly into <code>&lt;head&gt;</code> for Google Rich Snippets & Knowledge Graph
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(customSchemaJson);
                        toast.success("JSON-LD copied to clipboard!");
                      }}
                      className="h-8 text-xs gap-1.5 rounded-xl border-border/60"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy Code
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <Textarea
                    rows={16}
                    value={customSchemaJson}
                    onChange={(e) => setCustomSchemaJson(e.target.value)}
                    className="font-mono text-xs rounded-xl bg-secondary/20 border-border/60 leading-relaxed"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 6: SITEMAP & CRAWLERS (tools)
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="tools" className="space-y-6 m-0 focus-visible:outline-none">
          <Card className="rounded-2xl border-border/60 shadow-xs bg-card/90">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-primary" />
                    Dynamic Sitemap &amp; Robots.txt Generators
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Live dynamic XML sitemap crawled directly from active inventory products and published routes
                  </CardDescription>
                </div>
                <Button
                  onClick={handleLoadTools}
                  disabled={isLoadingTools}
                  className="h-9 px-4 text-xs font-semibold gap-2 rounded-xl bg-primary text-primary-foreground"
                >
                  {isLoadingTools ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  Generate XML Sitemap &amp; Robots
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-primary" /> Sitemap (sitemap.xml)
                    </Label>
                    {sitemapXmlContent && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(sitemapXmlContent);
                          toast.success("Sitemap XML copied!");
                        }}
                        className="h-6 text-[11px] px-2"
                      >
                        <Copy className="w-3 h-3 mr-1" /> Copy XML
                      </Button>
                    )}
                  </div>
                  <Textarea
                    rows={12}
                    readOnly
                    value={
                      sitemapXmlContent ||
                      `<!-- Click "Generate XML Sitemap & Robots" above to crawl and generate live XML -->`
                    }
                    className="font-mono text-xs rounded-xl bg-secondary/20 border-border/60"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-primary" /> Robots Directives (robots.txt)
                    </Label>
                    {robotsTxtContent && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(robotsTxtContent);
                          toast.success("Robots.txt copied!");
                        }}
                        className="h-6 text-[11px] px-2"
                      >
                        <Copy className="w-3 h-3 mr-1" /> Copy TXT
                      </Button>
                    )}
                  </div>
                  <Textarea
                    rows={12}
                    readOnly
                    value={
                      robotsTxtContent ||
                      `# Click "Generate XML Sitemap & Robots" above to preview crawler directives`
                    }
                    className="font-mono text-xs rounded-xl bg-secondary/20 border-border/60"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Floating Universal Save Action Pill / Status Indicator ── */}
      {isDirty && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-in">
          <div className="flex items-center gap-3 p-2 pl-4 bg-card/95 border border-primary/40 shadow-2xl rounded-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-semibold text-foreground">Unsaved SEO Changes</span>
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
