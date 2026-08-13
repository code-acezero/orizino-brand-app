"use client";
/**
 * BrandHome Landing Studio (Unified Hero Media & Responsive Mobile Control Studio)
 * ----------------------------------------------------------------------------------
 * Next-generation CMS control studio for the BrandHome app (`apps/company/components/landing`).
 *
 * Features:
 * - Unified Merged Hero Media Control (Video vs Image backdrop with live media status)
 * - Redesigned Mobile UI with responsive layout & Viewport tab switcher (Controls vs Preview)
 * - Category filter tabs & search input for fast control navigation
 * - Sleek accordion section cards with status badges & micro-switches
 * - Custom Icon picker with live visual previews
 * - Tabbed Media upload (File Upload vs Direct URL) with instant thumbnails
 * - Drag/move/duplicate repeater cards for Stats, Features, Testimonials & Navigation
 * - Realtime postMessage synchronization with the full-fidelity preview iframe
 * - Auto-fitting device frames (Desktop, Laptop, Tablet, Mobile) with zoom controls
 */
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getBrandHomeUrl, getLiveBrandHomeUrl } from "@/lib/cross-app-urls";
import { toast } from "@/lib/app-toast";
import ImageUpload from "@/components/ImageUpload";
import { BrandHomeSubNav } from "@/components/admin/BrandHomeSubNav";
import {
  Save, RotateCcw, Eye, Plus, Trash2, GripVertical, Image as ImageIcon,
  Layout, BarChart3, MessageSquare, Star, Package, Loader2,
  ExternalLink, LayoutTemplate, Rocket, Monitor, Laptop, Tablet, Smartphone,
  RefreshCw, Sliders, Sparkles, Shield, Truck, Users, Globe, ArrowUpRight, ArrowRight,
  ChevronDown, ChevronUp, ZoomIn, ZoomOut, Maximize2, ShoppingBag, Layers,
  Search, Copy, Check, Filter, Heart, Zap, Play, Upload, Link as LinkIcon,
  EyeOff, ArrowUp, ArrowDown, Video, Film, Award
} from "lucide-react";

/* ─── Types (mirror of company app LandingConfig) ────────────────── */
interface Feature { icon: string; title: string; desc: string }
interface Stat    { value: string; label: string }
interface Testimonial { name: string; text: string; rating: number }
interface DiscoverItem { label: string; href: string; icon: string; desc: string; external?: boolean }

interface LandingConfig {
  hero_title_line1: string;
  hero_title_line2: string;
  hero_subtitle: string;
  hero_badge: string;
  hero_cta_primary: string;
  hero_cta_secondary: string;
  hero_bg_url: string;
  hero_bg_mobile_url: string;
  hero_video_url: string;
  features: Feature[];
  stats: Stat[];
  show_stats: boolean;
  show_features: boolean;
  show_categories: boolean;
  show_testimonials: boolean;
  show_cta: boolean;
  show_about: boolean;
  show_mission_vision: boolean;
  show_brand_showcase: boolean;
  cta_title: string;
  cta_subtitle: string;
  cta_button: string;
  testimonials: Testimonial[];
  about_title: string;
  about_text: string;
  about_image_url?: string;
  mission_text: string;
  vision_text: string;
  showcase_image_url: string;
  showcase_headline: string;
  showcase_description: string;
  showcase_cta_text: string;
  showcase_cta_link: string;
  showcase_product_id: string;
  show_discover: boolean;
  discover_eyebrow: string;
  discover_title: string;
  discover_items: DiscoverItem[];
}

const DEFAULTS: LandingConfig = {
  hero_title_line1: "Timeless",
  hero_title_line2: "elegance",
  hero_subtitle: "Premium fashion, crafted with intention.",
  hero_badge: "New Collection",
  hero_cta_primary: "Shop the collection",
  hero_cta_secondary: "Our story",
  hero_bg_url: "",
  hero_bg_mobile_url: "",
  hero_video_url: "",
  features: [
    { icon: "Shield",   title: "Authentic",     desc: "Every piece verified for quality and origin." },
    { icon: "Truck",    title: "Global reach",  desc: "Shipping wherever style travels." },
    { icon: "Users",    title: "Community",     desc: "Built with and for people who care." },
    { icon: "Sparkles", title: "Timeless",      desc: "Designed to outlast the trend cycle." },
  ],
  stats: [
    { value: "10K+", label: "HAPPY CUSTOMERS" },
    { value: "500+", label: "PRODUCTS SHIPPED" },
    { value: "4.9★", label: "AVERAGE RATING" },
    { value: "2026", label: "EST. KUSHTIA, BD" },
  ],
  show_stats: true,
  show_features: true,
  show_categories: true,
  show_testimonials: false,
  show_cta: true,
  show_about: true,
  show_mission_vision: false,
  show_brand_showcase: false,
  cta_title: "Step into the world",
  cta_subtitle: "Premium quality, delivered to you.",
  cta_button: "Enter the Store",
  testimonials: [],
  about_title: "Our Story",
  about_text:
    "We believe fashion is more than clothing — it is a language. A declaration. We craft every piece to tell your story, with the precision of artisans and the vision of poets.",
  about_image_url: "",
  mission_text: "",
  vision_text: "",
  showcase_image_url: "",
  showcase_headline: "",
  showcase_description: "",
  showcase_cta_text: "Shop Now",
  showcase_cta_link: "/",
  showcase_product_id: "",
  show_discover: true,
  discover_eyebrow: "Discover",
  discover_title: "Explore Orizino",
  discover_items: [
    { label: "Docs", href: "/docs", icon: "Sparkles", desc: "Case studies & references" },
    { label: "News", href: "/news", icon: "Star", desc: "Latest updates" },
    { label: "Products", href: "/products", icon: "Package", desc: "Product highlights" },
    { label: "Shop", href: "", icon: "ArrowUpRight", desc: "Enter the store", external: true },
  ],
};

const ICON_MAP: Record<string, React.ElementType> = {
  Shield, Truck, Users, Sparkles, Star, Package, Heart, Zap, Globe, RotateCcw, ArrowUpRight, ArrowRight, Layers, ShoppingBag
};

type DeviceMode = "desktop" | "laptop" | "tablet" | "mobile";
type ControlCategory = "all" | "hero" | "text" | "grid";

/* ─── Field Primitives & Input UI Components ───────────────────────── */
const Field: React.FC<{ label: string; hint?: string; badge?: string; children: React.ReactNode }> = ({ label, hint, badge, children }) => (
  <div className="flex flex-col gap-1.5 w-full min-w-0">
    <div className="flex items-center justify-between gap-1">
      <span className="text-[10px] font-extrabold tracking-wider uppercase text-muted-foreground truncate">
        {label}
      </span>
      {badge && <span className="text-[9px] font-mono text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/20 shrink-0">{badge}</span>}
    </div>
    {children}
    {hint && <span className="text-[10px] text-muted-foreground/75 leading-snug">{hint}</span>}
  </div>
);

const inputCls =
  "w-full rounded-xl border border-border/70 bg-background/90 px-3 py-2 text-xs font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all shadow-xs placeholder:text-muted-foreground/50";
const textareaCls = inputCls + " resize-y min-h-[80px] leading-relaxed";

/* Visual Icon Picker Primitive */
const IconPicker: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const CurrentIcon = ICON_MAP[value] || Sparkles;

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-xl border border-border/70 bg-background/90 px-3 py-2 text-xs font-medium hover:border-primary/50 transition"
      >
        <div className="flex items-center gap-2 truncate">
          <div className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <CurrentIcon className="w-3.5 h-3.5" />
          </div>
          <span className="truncate">{value || "Select Icon"}</span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-64 p-2 rounded-xl border border-border bg-popover shadow-xl z-50 grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto">
          {Object.keys(ICON_MAP).map((iconKey) => {
            const IconComp = ICON_MAP[iconKey];
            const isSelected = value === iconKey;
            return (
              <button
                key={iconKey}
                type="button"
                onClick={() => { onChange(iconKey); setOpen(false); }}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition ${isSelected ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                <IconComp className="w-4 h-4" />
                <span className="truncate w-full text-center text-[9px]">{iconKey}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* Tabbed Media Input Component (File Upload vs Direct URL) */
const MediaInput: React.FC<{
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  accept?: string;
}> = ({ label, hint, value, onChange, folder = "company-landing", accept }) => {
  const [tab, setTab] = React.useState<"upload" | "url">("upload");

  return (
    <Field label={label} hint={hint}>
      <div className="rounded-xl border border-border/70 bg-card/40 p-2.5 space-y-2.5 w-full min-w-0">
        <div className="flex items-center justify-between gap-1 border-b border-border/40 pb-2 flex-wrap">
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setTab("upload")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${tab === "upload" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Upload className="w-3 h-3" /> Upload File
            </button>
            <button
              type="button"
              onClick={() => setTab("url")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${tab === "url" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LinkIcon className="w-3 h-3" /> Direct URL
            </button>
          </div>

          {value && (
            <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold flex items-center gap-1">
              <Check className="w-3 h-3" /> Set
            </span>
          )}
        </div>

        {tab === "upload" ? (
          <ImageUpload bucket="site-assets" folder={folder} value={value} onUploaded={onChange} accept={accept} />
        ) : (
          <input
            className={inputCls}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://domain.com/asset.mp4 or .jpg"
          />
        )}
      </div>
    </Field>
  );
};

/* Unified Merged Hero Media Component (Image or Video) */
const UnifiedHeroMediaControl: React.FC<{
  videoUrl: string;
  bgUrl: string;
  mobileBgUrl: string;
  onVideoChange: (url: string) => void;
  onBgChange: (url: string) => void;
  onMobileBgChange: (url: string) => void;
}> = ({ videoUrl, bgUrl, mobileBgUrl, onVideoChange, onBgChange, onMobileBgChange }) => {
  const hasVideo = Boolean(videoUrl);
  const hasDesktopImg = Boolean(bgUrl);
  const hasMobileImg = Boolean(mobileBgUrl);
  const activeDesktopUrl = videoUrl || bgUrl;

  return (
    <div className="rounded-2xl border border-border/80 bg-card/60 p-3.5 space-y-3 w-full min-w-0">
      <div className="flex items-center justify-between gap-1 flex-wrap border-b border-border/40 pb-2.5">
        <div className="flex items-center gap-1.5">
          <Film className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-foreground">Hero Background Media</span>
        </div>

        {/* Live Active Status Badge */}
        {hasVideo ? (
          <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
            <Video className="w-3 h-3" /> Video
          </span>
        ) : hasDesktopImg ? (
          <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center gap-1">
            <ImageIcon className="w-3 h-3" /> Image
          </span>
        ) : (
          <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-transparent">
            Gradient
          </span>
        )}
      </div>

      <MediaInput
        label="Desktop Background (Video / Image)"
        hint="Upload MP4/WebM for video, or JPG/PNG for image."
        value={activeDesktopUrl}
        onChange={(url) => {
          if (url.match(/\.(mp4|webm|mov|ogg)(\?.*)?$/i) || url.startsWith("data:video/")) {
            onVideoChange(url);
            onBgChange("");
          } else {
            onBgChange(url);
            onVideoChange("");
          }
        }}
        accept="image/*,video/*,video/mp4,video/webm,video/quicktime,video/ogg"
      />
      
      <MediaInput
        label="Mobile Background Image (Optional)"
        hint="Optional mobile-specific image crop for smartphone screens."
        value={mobileBgUrl}
        onChange={onMobileBgChange}
        accept="image/*"
      />
    </div>
  );
};

/* Accordion Section Component with Color Accents */
const AccordionSection: React.FC<{
  id: string;
  title: string;
  sub?: string;
  badgeColor?: string;
  icon: React.ElementType;
  toggle?: { on: boolean; onToggle: (v: boolean) => void };
  isOpen: boolean;
  onToggleOpen: () => void;
  children: React.ReactNode;
}> = ({ title, sub, badgeColor = "bg-primary/10 text-primary border-primary/20", icon: Icon, toggle, isOpen, onToggleOpen, children }) => (
  <div className="rounded-2xl border border-border/70 bg-card/70 backdrop-blur-md overflow-hidden shadow-xs transition-all duration-200 hover:border-border w-full min-w-0">
    <header className="flex items-center gap-3 px-4 py-3.5 bg-muted/20 select-none cursor-pointer" onClick={onToggleOpen}>
      <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${badgeColor}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-foreground tracking-tight truncate">{title}</h3>
          {toggle && (
            <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-full border shrink-0 ${toggle.on ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-muted text-muted-foreground border-transparent"}`}>
              {toggle.on ? "Active" : "Hidden"}
            </span>
          )}
        </div>
        {sub && <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5">{sub}</p>}
      </div>

      {toggle && (
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => toggle.onToggle(!toggle.on)}
            role="switch"
            aria-checked={toggle.on}
            className={`relative w-9 h-5 rounded-full transition-colors ${toggle.on ? "bg-primary" : "bg-muted"}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background shadow transition-transform ${toggle.on ? "translate-x-4" : ""}`}
            />
          </button>
        </div>
      )}

      <button type="button" className="text-muted-foreground hover:text-foreground transition p-1 shrink-0">
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
    </header>

    {isOpen && (
      <div className={`p-4 space-y-4 border-t border-border/40 ${toggle && !toggle.on ? "opacity-45 pointer-events-none" : ""}`}>
        {children}
      </div>
    )}
  </div>
);

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN STUDIO COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export default function AdminCompanyLanding() {
  const queryClient = useQueryClient();
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  const [device, setDevice] = React.useState<DeviceMode>("desktop");
  const [mobileTab, setMobileTab] = React.useState<"controls" | "preview">("controls");
  const [zoomScale, setZoomScale] = React.useState<number>(100);
  const [autoFit, setAutoFit] = React.useState<boolean>(true);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [categoryFilter, setCategoryFilter] = React.useState<ControlCategory>("all");

  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({
    hero: true,
    about: false,
    mission: false,
    stats: false,
    features: false,
    discover: false,
    testimonials: false,
    showcase: false,
    cta: false,
  });
  const [iframeKey, setIframeKey] = React.useState(0);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const { data: current, isLoading } = useQuery({
    queryKey: ["company-landing-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "landing_config")
        .maybeSingle();
      if (error) throw error;
      const raw = data?.value as any;
      const val = raw && typeof raw === "object" && "value" in raw ? raw.value : raw;
      return { ...DEFAULTS, ...(val ?? {}) } as LandingConfig;
    },
    staleTime: 0,
  });

  const [draft, setDraft] = React.useState<LandingConfig | null>(null);
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    if (current && !draft) setDraft(current);
  }, [current, draft]);

  // Realtime sync to preview iframe via postMessage
  const syncToIframe = React.useCallback((cfg: LandingConfig) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: "ORIZINO_LANDING_DRAFT_UPDATE", config: cfg },
        "*"
      );
    }
  }, []);

  const patch = React.useCallback(<K extends keyof LandingConfig>(key: K, val: LandingConfig[K]) => {
    setDraft((d) => {
      if (!d) return d;
      const next = { ...d, [key]: val };
      syncToIframe(next);
      return next;
    });
    setDirty(true);
  }, [syncToIframe]);

  const save = useMutation({
    mutationFn: async (cfg: LandingConfig) => {
      const { error } = await supabase
        .from("site_settings")
        .upsert(
          { key: "landing_config", value: cfg as any },
          { onConflict: "key" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("BrandHome landing page updated");
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["company-landing-config"] });
      queryClient.invalidateQueries({ queryKey: ["site-settings-landing"] });
      setIframeKey((k) => k + 1);
    },
    onError: (e: any) => toast.error(e?.message || "Failed to save"),
  });

  const reset = () => {
    if (!current) return;
    setDraft(current);
    syncToIframe(current);
    setDirty(false);
  };

  const resetToDefaults = () => {
    if (!confirm("Reset every field to the shipped defaults? Unsaved changes will be lost.")) return;
    setDraft(DEFAULTS);
    syncToIframe(DEFAULTS);
    setDirty(true);
  };

  const onIframeLoad = () => {
    if (draft) {
      syncToIframe(draft);
    }
  };

  if (isLoading || !draft) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-primary" /> Loading BrandHome studio…
      </div>
    );
  }

  // Section Filtering Logic
  const matchesSearch = (title: string, desc: string) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return title.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* ── Studio Header Toolbar ────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-2.5 sm:px-5 sm:py-3 border-b border-border/60 bg-card/40 shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground flex items-center gap-2 truncate">
              BrandHome Landing Studio
              {dirty && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />}
            </h1>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              {dirty ? "Unsaved changes in draft" : "Synchronized with live BrandHome app"}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mobile Viewport Switcher (< lg screens) */}
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/40 lg:hidden text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setMobileTab("controls")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${mobileTab === "controls" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"}`}
            >
              <Sliders className="w-3 h-3 text-primary" /> Controls
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("preview")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${mobileTab === "preview" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"}`}
            >
              <Eye className="w-3 h-3 text-primary" /> Preview
            </button>
          </div>

          <button
            type="button"
            onClick={resetToDefaults}
            className="text-[11px] px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition hidden sm:block"
          >
            Defaults
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={!dirty || save.isPending}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border/60 hover:bg-muted/60 disabled:opacity-40 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Revert
          </button>
          <button
            type="button"
            onClick={() => draft && save.mutate(draft)}
            disabled={!dirty || save.isPending}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:brightness-110 shadow-sm transition"
          >
            {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </button>
          <a
            href={getLiveBrandHomeUrl("/")}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            <Eye className="w-3.5 h-3.5" />
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        </div>
      </header>

      {/* ── Main Responsive Split View ───────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden flex-col lg:flex-row">
        {/* LEFT PANEL: CMS Section Controls */}
        <div className={`w-full lg:w-[430px] shrink-0 lg:border-r border-border/60 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 bg-muted/10 ${mobileTab === "controls" ? "block flex-1 lg:flex-none" : "hidden lg:block"}`}>
          {/* Quick Search & Category Filter Header */}
          <div className="space-y-2.5 mb-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
              <input
                className={inputCls + " pl-8 text-xs py-1.5 bg-background"}
                placeholder="Search controls (Hero, Story, Video, Stats...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Category Nav Tabs */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/40 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className={`flex-1 py-1 rounded-lg transition ${categoryFilter === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("hero")}
                className={`flex-1 py-1 rounded-lg transition ${categoryFilter === "hero" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                Hero
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("text")}
                className={`flex-1 py-1 rounded-lg transition ${categoryFilter === "text" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                Text
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("grid")}
                className={`flex-1 py-1 rounded-lg transition ${categoryFilter === "grid" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                Grid
              </button>
            </div>
          </div>

          {/* 1. HERO */}
          {(categoryFilter === "all" || categoryFilter === "hero") && matchesSearch("Hero Section", "First impression, video/image background & CTAs") && (
            <AccordionSection
              id="hero"
              title="Hero Section"
              sub="First impression, video & CTA buttons"
              badgeColor="bg-rose-500/10 text-rose-500 border-rose-500/20"
              icon={LayoutTemplate}
              isOpen={openSections.hero}
              onToggleOpen={() => toggleSection("hero")}
            >
              <Field label="Badge Label"><input className={inputCls} value={draft.hero_badge} onChange={(e) => patch("hero_badge", e.target.value)} /></Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Field label="Title Line 1"><input className={inputCls} value={draft.hero_title_line1} onChange={(e) => patch("hero_title_line1", e.target.value)} /></Field>
                <Field label="Title Line 2"><input className={inputCls} value={draft.hero_title_line2} onChange={(e) => patch("hero_title_line2", e.target.value)} /></Field>
              </div>
              <Field label="Subtitle Text"><textarea className={textareaCls} value={draft.hero_subtitle} onChange={(e) => patch("hero_subtitle", e.target.value)} /></Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Field label="Primary CTA Label"><input className={inputCls} value={draft.hero_cta_primary} onChange={(e) => patch("hero_cta_primary", e.target.value)} /></Field>
                <Field label="Secondary CTA Label"><input className={inputCls} value={draft.hero_cta_secondary} onChange={(e) => patch("hero_cta_secondary", e.target.value)} /></Field>
              </div>

              {/* UNIFIED MERGED HERO BACKGROUND MEDIA CONTROL */}
              <UnifiedHeroMediaControl
                videoUrl={draft.hero_video_url}
                bgUrl={draft.hero_bg_url}
                mobileBgUrl={draft.hero_bg_mobile_url}
                onVideoChange={(url) => patch("hero_video_url", url)}
                onBgChange={(url) => patch("hero_bg_url", url)}
                onMobileBgChange={(url) => patch("hero_bg_mobile_url", url)}
              />
            </AccordionSection>
          )}

          {/* 2. ABOUT STORY */}
          {(categoryFilter === "all" || categoryFilter === "text") && matchesSearch("About / Brand Story", "Company narrative & vision statement") && (
            <AccordionSection
              id="about"
              title="About / Brand Story"
              sub="Company narrative & vision statement"
              badgeColor="bg-amber-500/10 text-amber-500 border-amber-500/20"
              icon={MessageSquare}
              toggle={{ on: draft.show_about, onToggle: (v) => patch("show_about", v) }}
              isOpen={openSections.about}
              onToggleOpen={() => toggleSection("about")}
            >
              <Field label="Section Title"><input className={inputCls} value={draft.about_title} onChange={(e) => patch("about_title", e.target.value)} /></Field>
              <Field label="Brand Story Body Copy"><textarea className={textareaCls + " min-h-[100px]"} value={draft.about_text} onChange={(e) => patch("about_text", e.target.value)} /></Field>
            </AccordionSection>
          )}

          {/* 3. MISSION / VISION */}
          {(categoryFilter === "all" || categoryFilter === "text") && matchesSearch("Mission & Vision", "Corporate mission and long-term vision") && (
            <AccordionSection
              id="mission"
              title="Mission & Vision"
              sub="Corporate mission and long-term vision"
              badgeColor="bg-blue-500/10 text-blue-500 border-blue-500/20"
              icon={Star}
              toggle={{ on: draft.show_mission_vision, onToggle: (v) => patch("show_mission_vision", v) }}
              isOpen={openSections.mission}
              onToggleOpen={() => toggleSection("mission")}
            >
              <Field label="Mission Statement"><textarea className={textareaCls} value={draft.mission_text} onChange={(e) => patch("mission_text", e.target.value)} placeholder="Our mission is to..." /></Field>
              <Field label="Vision Statement"><textarea className={textareaCls} value={draft.vision_text} onChange={(e) => patch("vision_text", e.target.value)} placeholder="Our vision is to..." /></Field>
            </AccordionSection>
          )}

          {/* 4. STATS COUNTERS */}
          {(categoryFilter === "all" || categoryFilter === "grid") && matchesSearch("Stats Strip", "Key achievements & quantitative figures") && (
            <AccordionSection
              id="stats"
              title="Stats Strip"
              sub="Key achievements & quantitative metrics"
              badgeColor="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
              icon={BarChart3}
              toggle={{ on: draft.show_stats, onToggle: (v) => patch("show_stats", v) }}
              isOpen={openSections.stats}
              onToggleOpen={() => toggleSection("stats")}
            >
              <Repeater
                items={draft.stats}
                onChange={(next) => patch("stats", next)}
                empty="No stats added."
                add={{ label: "Add Stat Metric", make: () => ({ value: "", label: "" }) }}
                render={(s, i, upd) => (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                    <input className={inputCls} placeholder="10K+" value={s.value} onChange={(e) => upd({ ...s, value: e.target.value })} />
                    <input className={inputCls} placeholder="HAPPY CUSTOMERS" value={s.label} onChange={(e) => upd({ ...s, label: e.target.value })} />
                  </div>
                )}
              />
            </AccordionSection>
          )}

          {/* 5. FEATURE CARDS */}
          {(categoryFilter === "all" || categoryFilter === "grid") && matchesSearch("Feature Cards", "Brand values, promises & guarantees") && (
            <AccordionSection
              id="features"
              title="Feature Cards"
              sub="Brand values, promises & guarantees"
              badgeColor="bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
              icon={Layout}
              toggle={{ on: draft.show_features, onToggle: (v) => patch("show_features", v) }}
              isOpen={openSections.features}
              onToggleOpen={() => toggleSection("features")}
            >
              <Repeater
                items={draft.features}
                onChange={(next) => patch("features", next)}
                empty="No features added."
                add={{ label: "Add Feature Card", make: () => ({ icon: "Shield", title: "", desc: "" }) }}
                render={(f, i, upd) => (
                  <div className="space-y-2 flex-1">
                    <Field label="Icon Selection">
                      <IconPicker value={f.icon} onChange={(iconKey) => upd({ ...f, icon: iconKey })} />
                    </Field>
                    <input className={inputCls} placeholder="Feature Title" value={f.title} onChange={(e) => upd({ ...f, title: e.target.value })} />
                    <input className={inputCls} placeholder="Description" value={f.desc} onChange={(e) => upd({ ...f, desc: e.target.value })} />
                  </div>
                )}
              />
            </AccordionSection>
          )}

          {/* 6. DISCOVER NAV */}
          {(categoryFilter === "all" || categoryFilter === "grid") && matchesSearch("Discover Section", "Explore tiles & platform navigation links") && (
            <AccordionSection
              id="discover"
              title="Discover Section"
              sub="Explore tiles & platform navigation links"
              badgeColor="bg-sky-500/10 text-sky-500 border-sky-500/20"
              icon={Globe}
              toggle={{ on: draft.show_discover, onToggle: (v) => patch("show_discover", v) }}
              isOpen={openSections.discover}
              onToggleOpen={() => toggleSection("discover")}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                <Field label="Eyebrow"><input className={inputCls} placeholder="Discover" value={draft.discover_eyebrow} onChange={(e) => patch("discover_eyebrow", e.target.value)} /></Field>
                <Field label="Section Title"><input className={inputCls} placeholder="Explore Orizino" value={draft.discover_title} onChange={(e) => patch("discover_title", e.target.value)} /></Field>
              </div>
              <Repeater
                items={draft.discover_items}
                onChange={(next) => patch("discover_items", next)}
                empty="No discover tiles added."
                add={{ label: "Add Navigation Tile", make: () => ({ label: "", href: "", icon: "Sparkles", desc: "", external: false }) }}
                render={(it, i, upd) => (
                  <div className="space-y-2 flex-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input className={inputCls} placeholder="Label" value={it.label} onChange={(e) => upd({ ...it, label: e.target.value })} />
                      <input className={inputCls} placeholder="Target URL (/docs)" value={it.href} onChange={(e) => upd({ ...it, href: e.target.value })} />
                    </div>
                    <input className={inputCls} placeholder="Short Description" value={it.desc} onChange={(e) => upd({ ...it, desc: e.target.value })} />
                    <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer select-none">
                      <input type="checkbox" checked={!!it.external} onChange={(e) => upd({ ...it, external: e.target.checked })} className="rounded text-primary focus:ring-primary/20" />
                      External link (opens in new tab)
                    </label>
                  </div>
                )}
              />
            </AccordionSection>
          )}

          {/* 7. TESTIMONIALS */}
          {(categoryFilter === "all" || categoryFilter === "text") && matchesSearch("Testimonials", "Customer reviews & feedback highlights") && (
            <AccordionSection
              id="testimonials"
              title="Testimonials"
              sub="Customer reviews & feedback highlights"
              badgeColor="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
              icon={Star}
              toggle={{ on: draft.show_testimonials, onToggle: (v) => patch("show_testimonials", v) }}
              isOpen={openSections.testimonials}
              onToggleOpen={() => toggleSection("testimonials")}
            >
              <Repeater
                items={draft.testimonials}
                onChange={(next) => patch("testimonials", next)}
                empty="No testimonials added."
                add={{ label: "Add Testimonial", make: () => ({ name: "", text: "", rating: 5 }) }}
                render={(t, i, upd) => (
                  <div className="space-y-1.5 flex-1">
                    <div className="grid grid-cols-[1fr_5rem] gap-2">
                      <input className={inputCls} placeholder="Customer Name" value={t.name} onChange={(e) => upd({ ...t, name: e.target.value })} />
                      <input className={inputCls} type="number" min={1} max={5} value={t.rating} onChange={(e) => upd({ ...t, rating: Number(e.target.value) || 5 })} />
                    </div>
                    <textarea className={textareaCls} placeholder="Customer quote or review..." value={t.text} onChange={(e) => upd({ ...t, text: e.target.value })} />
                  </div>
                )}
              />
            </AccordionSection>
          )}

          {/* 8. BRAND SHOWCASE */}
          {(categoryFilter === "all" || categoryFilter === "hero") && matchesSearch("Brand Showcase", "Editorial feature or highlighted collection block") && (
            <AccordionSection
              id="showcase"
              title="Brand Showcase"
              sub="Editorial feature or highlighted collection block"
              badgeColor="bg-purple-500/10 text-purple-500 border-purple-500/20"
              icon={ImageIcon}
              toggle={{ on: draft.show_brand_showcase, onToggle: (v) => patch("show_brand_showcase", v) }}
              isOpen={openSections.showcase}
              onToggleOpen={() => toggleSection("showcase")}
            >
              <MediaInput
                label="Showcase Backdrop Image"
                value={draft.showcase_image_url}
                onChange={(url) => patch("showcase_image_url", url)}
              />
              <Field label="Headline"><input className={inputCls} value={draft.showcase_headline} onChange={(e) => patch("showcase_headline", e.target.value)} /></Field>
              <Field label="Description"><textarea className={textareaCls} value={draft.showcase_description} onChange={(e) => patch("showcase_description", e.target.value)} /></Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Field label="CTA Button Label"><input className={inputCls} value={draft.showcase_cta_text} onChange={(e) => patch("showcase_cta_text", e.target.value)} /></Field>
                <Field label="CTA Link Target"><input className={inputCls} value={draft.showcase_cta_link} onChange={(e) => patch("showcase_cta_link", e.target.value)} /></Field>
              </div>
            </AccordionSection>
          )}

          {/* 9. CLOSING CTA */}
          {(categoryFilter === "all" || categoryFilter === "hero") && matchesSearch("Closing Call to Action", "Bottom conversion banner") && (
            <AccordionSection
              id="cta"
              title="Closing Call to Action"
              sub="Bottom conversion banner"
              badgeColor="bg-red-500/10 text-red-500 border-red-500/20"
              icon={Rocket}
              toggle={{ on: draft.show_cta, onToggle: (v) => patch("show_cta", v) }}
              isOpen={openSections.cta}
              onToggleOpen={() => toggleSection("cta")}
            >
              <Field label="CTA Title"><input className={inputCls} value={draft.cta_title} onChange={(e) => patch("cta_title", e.target.value)} /></Field>
              <Field label="CTA Subtitle"><input className={inputCls} value={draft.cta_subtitle} onChange={(e) => patch("cta_subtitle", e.target.value)} /></Field>
              <Field label="Button Label"><input className={inputCls} value={draft.cta_button} onChange={(e) => patch("cta_button", e.target.value)} /></Field>
            </AccordionSection>
          )}
        </div>

        {/* RIGHT PANEL: Sleek Auto-Fitting Canvas */}
        <div className={`flex-1 flex flex-col bg-background/50 overflow-hidden relative ${mobileTab === "preview" ? "block flex-1" : "hidden lg:flex"}`}>
          {/* Studio Canvas Grid Background */}
          <div className="absolute inset-0 z-0 bg-[radial-gradient(hsl(var(--foreground)/0.07)_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          {/* Toolbar */}
          <div className="relative z-10 flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 border-b border-border/60 bg-card/80 backdrop-blur-md shrink-0 flex-wrap gap-2">
            {/* Device Switcher */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/40">
              <button
                type="button"
                onClick={() => setDevice("desktop")}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${device === "desktop" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Monitor className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setDevice("laptop")}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${device === "laptop" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Laptop className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Laptop</span>
              </button>
              <button
                type="button"
                onClick={() => setDevice("tablet")}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${device === "tablet" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Tablet className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Tablet</span>
              </button>
              <button
                type="button"
                onClick={() => setDevice("mobile")}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${device === "mobile" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Smartphone className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Mobile</span>
              </button>
            </div>

            {/* Mode Selector & Zoom Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Auto Fit Toggle & Zoom Controls */}
              <div className="flex items-center gap-1.5 bg-muted/60 px-2 py-1 rounded-xl border border-border/40 text-xs">
                <button
                  type="button"
                  onClick={() => setAutoFit(!autoFit)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition ${autoFit ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  title="Auto-Fit Viewport"
                >
                  <Maximize2 className="w-3 h-3" /> Auto-Fit
                </button>
                {!autoFit && (
                  <>
                    <button type="button" onClick={() => setZoomScale((z) => Math.max(40, z - 10))} className="p-0.5 hover:text-primary transition" title="Zoom Out">
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-[11px] font-bold w-9 text-center">{zoomScale}%</span>
                    <button type="button" onClick={() => setZoomScale((z) => Math.min(100, z + 10))} className="p-0.5 hover:text-primary transition" title="Zoom In">
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIframeKey((k) => k + 1)}
                className="p-1.5 rounded-xl border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition"
                title="Reload Preview"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Full-Fidelity Device Bezel Canvas Container */}
          <div className="relative z-10 flex-1 overflow-hidden p-3 sm:p-4 flex items-center justify-center">
            <div
              className={`transition-all duration-300 flex items-center justify-center w-full h-full max-h-[calc(100vh-9.5rem)]`}
              style={{ transform: autoFit ? "scale(1)" : `scale(${zoomScale / 100})` }}
            >
              {/* MOBILE BEZEL */}
              {device === "mobile" && (
                <div className="w-[375px] max-w-full h-full max-h-[720px] rounded-[40px] border-[8px] border-neutral-900 bg-background shadow-2xl relative overflow-hidden flex flex-col ring-1 ring-white/10 shrink-0">
                  {/* Speaker Notch */}
                  <div className="h-5 bg-neutral-900 flex items-center justify-center shrink-0">
                    <div className="w-16 h-3 bg-black rounded-b-lg flex items-center justify-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-neutral-800" />
                    </div>
                  </div>
                  <iframe
                    ref={iframeRef}
                    key={iframeKey}
                    src={getBrandHomeUrl()}
                    onLoad={onIframeLoad}
                    className="w-full flex-1 border-0"
                    title="Mobile Studio Preview"
                  />
                  {/* Home Bar */}
                  <div className="h-3.5 bg-neutral-900 flex items-center justify-center shrink-0">
                    <div className="w-24 h-1 rounded-full bg-neutral-700" />
                  </div>
                </div>
              )}

              {/* TABLET BEZEL */}
              {device === "tablet" && (
                <div className="w-[768px] max-w-full h-full max-h-[820px] rounded-[28px] border-[10px] border-neutral-900 bg-background shadow-2xl relative overflow-hidden flex flex-col ring-1 ring-white/10 shrink-0">
                  <iframe
                    ref={iframeRef}
                    key={iframeKey}
                    src={getBrandHomeUrl()}
                    onLoad={onIframeLoad}
                    className="w-full flex-1 border-0"
                    title="Tablet Studio Preview"
                  />
                </div>
              )}

              {/* LAPTOP BEZEL */}
              {device === "laptop" && (
                <div className="w-[1024px] max-w-full h-full max-h-[760px] rounded-[18px] border-[8px] border-neutral-900 bg-background shadow-2xl relative overflow-hidden flex flex-col ring-1 ring-white/10 shrink-0">
                  <div className="h-5 bg-neutral-900 flex items-center justify-start px-3 gap-1.5 border-b border-neutral-800 shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <iframe
                    ref={iframeRef}
                    key={iframeKey}
                    src={getBrandHomeUrl()}
                    onLoad={onIframeLoad}
                    className="w-full flex-1 border-0"
                    title="Laptop Studio Preview"
                  />
                </div>
              )}

              {/* DESKTOP BEZEL */}
              {device === "desktop" && (
                <div className="w-full max-w-[1280px] h-full max-h-[820px] rounded-2xl border border-border/80 bg-background shadow-2xl relative overflow-hidden flex flex-col">
                  <div className="h-6 bg-card flex items-center justify-between px-3 border-b border-border/50 text-[10px] text-muted-foreground font-mono shrink-0">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-500/70" />
                      <div className="w-2 h-2 rounded-full bg-amber-500/70" />
                      <div className="w-2 h-2 rounded-full bg-emerald-500/70" />
                    </div>
                    <span>https://orizino.com/</span>
                    <span className="text-primary font-bold">BrandHome Live Preview</span>
                  </div>
                  <iframe
                    ref={iframeRef}
                    key={iframeKey}
                    src={getBrandHomeUrl()}
                    onLoad={onIframeLoad}
                    className="w-full flex-1 border-0"
                    title="Desktop Studio Preview"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Generic Symmetrical Repeater Component ──────────────────────── */
function Repeater<T>({
  items, onChange, render, add, empty,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  render: (item: T, index: number, update: (next: T) => void) => React.ReactNode;
  add: { label: string; make: () => T };
  empty: string;
}) {
  return (
    <div className="space-y-2 w-full min-w-0">
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground italic px-1 text-center py-2 border border-dashed border-border/50 rounded-xl">{empty}</p>
      )}
      {items.map((item, i) => (
        <div key={i} className="group relative rounded-xl border border-border/60 bg-background/80 p-3 shadow-xs space-y-2 hover:border-primary/40 transition w-full min-w-0">
          <div className="flex items-center justify-between border-b border-border/40 pb-1.5 gap-1 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-muted text-[10px] font-mono font-bold text-muted-foreground flex items-center justify-center">
                #{i + 1}
              </span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Item Card</span>
            </div>

            {/* Quick Action Toolbar */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onChange(moveItem(items, i, i - 1))}
                disabled={i === 0}
                className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30 transition"
                title="Move Up"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onChange(moveItem(items, i, i + 1))}
                disabled={i === items.length - 1}
                className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30 transition"
                title="Move Down"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = [...items];
                  next.splice(i + 1, 0, JSON.parse(JSON.stringify(item)));
                  onChange(next);
                }}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition"
                title="Duplicate"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {render(item, i, (next) => {
            const arr = [...items]; arr[i] = next; onChange(arr);
          })}
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...items, add.make()])}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-dashed border-border/80 text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition w-full justify-center"
      >
        <Plus className="w-3.5 h-3.5" /> {add.label}
      </button>
    </div>
  );
}


