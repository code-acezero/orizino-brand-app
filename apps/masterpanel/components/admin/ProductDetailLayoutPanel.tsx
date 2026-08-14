"use client";
import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Layers,
  Sparkles,
  Image as ImageIcon,
  Check,
  Layout,
  Smartphone,
  Monitor,
  Flame,
  ShieldCheck,
  Truck,
  RotateCcw,
  Star,
  ShoppingBag,
  Sliders,
  Ruler,
  MessageSquare,
  Zap,
  Eye,
  Columns,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { toast } from "@/lib/app-toast";
import { useRegisterUniversalSave } from "@/contexts/UniversalSaveContext";

export type LayoutStyle = "dark-luxury" | "glass" | "neon" | "minimal" | "magazine" | "glass-minimal";
export type GalleryStyle = "default" | "infinity" | "coverflow" | "filmstrip" | "mosaic" | "parallax-stack";

interface ProductPageConfig {
  layout: LayoutStyle;
  gallery: GalleryStyle;
  show_sticky_tray: boolean;
  show_scarcity_badge: boolean;
  show_trust_badges: boolean;
  show_size_chart: boolean;
  show_reviews: boolean;
}

const DEFAULT_CONFIG: ProductPageConfig = {
  layout: "glass",
  gallery: "default",
  show_sticky_tray: true,
  show_scarcity_badge: true,
  show_trust_badges: true,
  show_size_chart: true,
  show_reviews: true,
};

const STUDIO_PRESETS = [
  {
    layout: "dark-luxury" as LayoutStyle,
    gallery: "infinity" as GalleryStyle,
    label: "Midnight Runway",
    tag: "High Fashion",
    desc: "Obsidian dark background, gold ambient glow & continuous 3D Infinity Loop gallery.",
    emoji: "🖤",
  },
  {
    layout: "glass" as LayoutStyle,
    gallery: "coverflow" as GalleryStyle,
    label: "Modern Atrium",
    tag: "Signature",
    desc: "Translucent frosted glassmorphism cards & 3D Coverflow perspective rotation.",
    emoji: "🔮",
  },
  {
    layout: "neon" as LayoutStyle,
    gallery: "parallax-stack" as GalleryStyle,
    label: "High-Voltage Drop",
    tag: "Cyber Street",
    desc: "Cyberpunk edge glow, electrified price accent & 3D cursor parallax card stack.",
    emoji: "⚡",
  },
  {
    layout: "minimal" as LayoutStyle,
    gallery: "default" as GalleryStyle,
    label: "Pure Minimalist",
    tag: "Scandinavian",
    desc: "Pure whitespace, clean typography, hairline borders & Lightbox Zoom lens.",
    emoji: "🤍",
  },
  {
    layout: "magazine" as LayoutStyle,
    gallery: "mosaic" as GalleryStyle,
    label: "Editorial Lookbook",
    tag: "Curated",
    desc: "Italic serif typography, asymmetric magazine narrative flow & adaptive mosaic grid.",
    emoji: "📰",
  },
  {
    layout: "glass-minimal" as LayoutStyle,
    gallery: "filmstrip" as GalleryStyle,
    label: "Vintage Cinema",
    tag: "Atelier",
    desc: "Clean neutral glass borders with vintage 35mm filmstrip cinema sprocket frames.",
    emoji: "🎬",
  },
];

const LAYOUT_STYLES: {
  id: LayoutStyle;
  label: string;
  desc: string;
  tag: string;
  emoji: string;
  previewBg: string;
  accentText: string;
}[] = [
  {
    id: "dark-luxury",
    label: "Dark Luxury",
    tag: "Obsidian",
    desc: "Deep obsidian backdrop with gold accents, ambient reflections & frosted cards",
    emoji: "🖤",
    previewBg: "bg-gradient-to-br from-black via-zinc-900 to-black",
    accentText: "text-amber-400",
  },
  {
    id: "glass",
    label: "Glassmorphism",
    tag: "Translucent",
    desc: "Frosted glass cards with smooth backdrop blur and signature brand borders",
    emoji: "🔮",
    previewBg: "bg-gradient-to-br from-primary/25 via-background to-primary/10",
    accentText: "text-primary",
  },
  {
    id: "neon",
    label: "Neon Cyber",
    tag: "Electrified",
    desc: "High-contrast dark styling with glowing borders and electric price highlighting",
    emoji: "⚡",
    previewBg: "bg-gradient-to-br from-background via-primary/20 to-background",
    accentText: "text-primary font-black",
  },
  {
    id: "minimal",
    label: "Apple Minimal",
    tag: "Monochrome",
    desc: "Pure whitespace, clean precision typography, and zero visual clutter",
    emoji: "🤍",
    previewBg: "bg-gradient-to-br from-zinc-100 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950",
    accentText: "text-foreground",
  },
  {
    id: "magazine",
    label: "Editorial Magazine",
    tag: "Serif & Story",
    desc: "Asymmetric lookbook layout with italic display serif typography and narrative blocks",
    emoji: "📰",
    previewBg: "bg-gradient-to-br from-amber-500/10 via-background to-orange-500/10",
    accentText: "font-serif italic text-foreground",
  },
  {
    id: "glass-minimal",
    label: "Glass Minimal",
    tag: "Neutral",
    desc: "Ultra-clean neutral glass with subtle outlines and crisp balanced contrast",
    emoji: "✨",
    previewBg: "bg-gradient-to-br from-secondary/40 via-card to-secondary/20",
    accentText: "text-foreground",
  },
];

const GALLERY_ENGINES: {
  id: GalleryStyle;
  label: string;
  tag: string;
  desc: string;
  emoji: string;
  badge: string;
}[] = [
  {
    id: "default",
    label: "Classic Lightbox Zoom",
    tag: "Standard",
    desc: "Thumbnail rail with cursor zoom lens and immersive full-screen modal lightbox",
    emoji: "🖼️",
    badge: "2D Rail",
  },
  {
    id: "infinity",
    label: "Infinity Loop 3D",
    tag: "3D Motion",
    desc: "Continuous 3D revolving carousel loop with smooth velocity transitions",
    emoji: "♾️",
    badge: "3D Carousel",
  },
  {
    id: "coverflow",
    label: "Coverflow 3D",
    tag: "Perspective",
    desc: "Perspective depth rotation with centered active card and angled side thumbnails",
    emoji: "💿",
    badge: "3D Angle",
  },
  {
    id: "filmstrip",
    label: "Filmstrip Cinema",
    tag: "Vintage",
    desc: "Cinematic dark presentation with vintage 35mm film sprocket border frame",
    emoji: "🎬",
    badge: "Cinema Frame",
  },
  {
    id: "mosaic",
    label: "Adaptive Grid Mosaic",
    tag: "Editorial",
    desc: "Pinterest-style adaptive masonry multi-image layout with cursor hover zoom",
    emoji: "🧩",
    badge: "Masonry",
  },
  {
    id: "parallax-stack",
    label: "Parallax Stack 3D",
    tag: "Interactive",
    desc: "Stacked image cards with 3D cursor tilt, depth layers, and gesture swipe",
    emoji: "📚",
    badge: "3D Tilt",
  },
];

export default function ProductDetailLayoutPanel() {
  const qc = useQueryClient();
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile" | "split">("desktop");
  const [openAccordion, setOpenAccordion] = useState<"specs" | "story" | "fit" | "reviews" | null>("specs");
  const [previewSelectedSize, setPreviewSelectedSize] = useState("L");
  const [previewSelectedColor, setPreviewSelectedColor] = useState("charcoal");

  const { data: layoutSettingsRow } = useQuery({
    queryKey: ["admin-product-page-layout"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("key", "product_page_layout")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [cfg, setCfg] = useState<ProductPageConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    if (layoutSettingsRow?.value) {
      const val = layoutSettingsRow.value as any;
      if (typeof val === "string") {
        setCfg((c) => ({ ...c, layout: val as LayoutStyle }));
      } else if (typeof val === "object" && val !== null) {
        setCfg({
          layout: (val.layout || "glass") as LayoutStyle,
          gallery: (val.gallery || "default") as GalleryStyle,
          show_sticky_tray: val.show_sticky_tray ?? true,
          show_scarcity_badge: val.show_scarcity_badge ?? true,
          show_trust_badges: val.show_trust_badges ?? true,
          show_size_chart: val.show_size_chart ?? true,
          show_reviews: val.show_reviews ?? true,
        });
      }
    }
  }, [layoutSettingsRow]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const jsonValue: any = { ...cfg };
      if (layoutSettingsRow) {
        await supabase.from("site_settings").update({ value: jsonValue }).eq("id", layoutSettingsRow.id);
      } else {
        await supabase.from("site_settings").insert({ key: "product_page_layout", value: jsonValue });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-product-page-layout"] });
      qc.invalidateQueries({ queryKey: ["product-page-layout"] });
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Product details architecture saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  useRegisterUniversalSave(
    {
      label: "Save Product Layout",
      onSave: async () => {
        await saveMutation.mutateAsync();
      },
      isSaving: saveMutation.isPending,
      onReject: () => {
        setCfg(DEFAULT_CONFIG);
        toast.warning("Product layout reset to default");
      },
      canReject: true,
    },
    [cfg, saveMutation.isPending]
  );

  const activeLayoutObj = LAYOUT_STYLES.find((l) => l.id === cfg.layout) || LAYOUT_STYLES[1];
  const activeGalleryObj = GALLERY_ENGINES.find((g) => g.id === cfg.gallery) || GALLERY_ENGINES[0];

  return (
    <div className="space-y-5">
      {/* ── TOP CONTROL BAR ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-card/80 backdrop-blur-md border border-border/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/25 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-foreground tracking-tight">
                Product Details &amp; Gallery Architecture
              </h2>
              <Badge variant="outline" className="text-[9px] font-mono border-primary/30 text-primary bg-primary/10 capitalize">
                {activeLayoutObj.label} + {activeGalleryObj.badge}
              </Badge>
            </div>
            <p className="text-[10.5px] text-muted-foreground">
              Configure surface themes, 3D presentation engines, conversion docks, and trust architecture.
            </p>
          </div>
        </div>

        {/* Viewport Switcher */}
        <div className="flex items-center p-0.5 rounded-lg bg-background/80 border border-border/50">
          <button
            onClick={() => setPreviewMode("desktop")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10.5px] font-semibold transition-all cursor-pointer ${
              previewMode === "desktop"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Monitor className="w-3 h-3" />
            <span>Desktop</span>
          </button>
          <button
            onClick={() => setPreviewMode("mobile")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10.5px] font-semibold transition-all cursor-pointer ${
              previewMode === "mobile"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="w-3 h-3" />
            <span>Mobile</span>
          </button>
          <button
            onClick={() => setPreviewMode("split")}
            className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-md text-[10.5px] font-semibold transition-all cursor-pointer ${
              previewMode === "split"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Columns className="w-3 h-3" />
            <span>Split Stage</span>
          </button>
        </div>
      </div>

      {/* ── LIVE INTERACTIVE PRODUCT PREVIEW STAGE ── */}
      <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-md overflow-hidden space-y-0">
        {/* Stage Subheader */}
        <div className="flex items-center justify-between p-3 px-4 border-b border-border/40 bg-secondary/20">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-foreground">Interactive Stage Preview</span>
            <span className="text-[9.5px] font-mono text-muted-foreground">
              (Live rendering with active theme &amp; gallery engine)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[9px] font-mono">
              Mode: {cfg.layout}
            </Badge>
            <Badge variant="secondary" className="text-[9px] font-mono">
              Engine: {cfg.gallery}
            </Badge>
          </div>
        </div>

        {/* Stage Canvas */}
        <div className={`p-4 sm:p-6 transition-all ${cfg.layout === "dark-luxury" ? "bg-black text-white" : cfg.layout === "minimal" ? "bg-[#FAF8F5] text-zinc-900" : "bg-background/70 text-foreground"}`}>
          <div className={`mx-auto ${previewMode === "mobile" ? "max-w-xs" : previewMode === "split" ? "max-w-5xl" : "max-w-4xl"}`}>
            <div className={`grid gap-5 ${previewMode === "mobile" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-12"} items-start`}>
              
              {/* Product Gallery Column */}
              <div className={`${previewMode === "mobile" ? "col-span-1" : "md:col-span-6"} space-y-2.5`}>
                {/* Main Image Frame with chosen Gallery Engine styling */}
                <div
                  className={`relative aspect-square rounded-2xl overflow-hidden border flex flex-col items-center justify-between p-4 transition-all ${
                    cfg.layout === "dark-luxury"
                      ? "bg-zinc-950 border-white/10"
                      : cfg.layout === "neon"
                      ? "bg-zinc-900 border-primary/40"
                      : "bg-secondary/40 border-border/70"
                  }`}
                >
                  {/* Gallery Engine Badge */}
                  <div className="w-full flex items-center justify-between z-10">
                    <span className="text-[8.5px] font-mono px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-md uppercase tracking-wider">
                      {activeGalleryObj.label}
                    </span>
                    {cfg.show_scarcity_badge && (
                      <span className="text-[8.5px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1 font-bold">
                        <Flame className="w-2.5 h-2.5" /> ONLY 4 LEFT
                      </span>
                    )}
                  </div>

                  {/* Visual 3D / Mockup Centerpiece */}
                  <div className="my-auto flex flex-col items-center justify-center text-center space-y-2">
                    <span className="text-4xl">{activeGalleryObj.emoji}</span>
                    <span className="text-xs font-bold uppercase tracking-wider opacity-80 font-mono">
                      {activeGalleryObj.badge} Active
                    </span>
                    <p className="text-[9.5px] max-w-[200px] opacity-60">
                      High-resolution 380 GSM garment photography
                    </p>
                  </div>

                  {/* Thumbnail Strip / 3D Navigation Dots */}
                  <div className="flex items-center gap-1.5 z-10">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all ${
                          i === 1 ? "w-5 bg-primary" : "w-1.5 bg-foreground/25"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Product Info & Conversion Column */}
              <div className={`${previewMode === "mobile" ? "col-span-1" : "md:col-span-6"} space-y-3.5`}>
                {/* Brand Header */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono uppercase tracking-widest opacity-60">
                      ORIZINO STUDIO — A/W 2026
                    </span>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>4.9</span>
                      <span className="opacity-60 text-[9px] font-normal">(48 reviews)</span>
                    </div>
                  </div>

                  <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
                    Heavyweight Boxy Drop Terry Hoodie
                  </h3>

                  <div className="flex items-baseline gap-2 pt-0.5">
                    <span className={`text-2xl font-black ${activeLayoutObj.accentText}`}>
                      $120.00 USD
                    </span>
                    <span className="text-xs opacity-50 line-through font-mono">$150.00</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-bold">
                      SAVE 20%
                    </span>
                  </div>
                </div>

                {/* Colorways */}
                <div className="space-y-1.5 pt-1 border-t border-border/30">
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="font-semibold">Colorway:</span>
                    <span className="font-mono uppercase opacity-70 text-[9.5px]">{previewSelectedColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[
                      { id: "charcoal", color: "#1E1E1E", label: "Charcoal" },
                      { id: "vanilla", color: "#EFE6DD", label: "Vanilla Cream" },
                      { id: "cherry", color: "#800000", label: "Deep Cherry" },
                    ].map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setPreviewSelectedColor(c.id)}
                        className={`w-6 h-6 rounded-full border transition-all cursor-pointer ${
                          previewSelectedColor === c.id
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105"
                            : "border-white/20 opacity-80 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: c.color }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Sizing & Measurement */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="font-semibold">Select Size:</span>
                    {cfg.show_size_chart && (
                      <span className="text-primary hover:underline cursor-pointer flex items-center gap-1 font-medium text-[9.5px]">
                        <Ruler className="w-2.5 h-2.5" /> Size Chart &amp; Fit Guide
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {["S", "M", "L", "XL"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setPreviewSelectedSize(s)}
                        className={`py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                          previewSelectedSize === s
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/60 bg-secondary/30 hover:bg-secondary text-foreground"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <button className="py-2.5 px-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-1.5 hover:brightness-110 transition-all cursor-pointer">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>ADD TO CART</span>
                    </button>
                    <button className="py-2.5 px-3 rounded-xl bg-foreground text-background font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition-all cursor-pointer">
                      <Zap className="w-3.5 h-3.5" />
                      <span>BUY NOW</span>
                    </button>
                  </div>

                  {cfg.show_sticky_tray && (
                    <div className="p-2 rounded-xl bg-secondary/40 border border-border/50 flex items-center justify-between text-[10px]">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Smartphone className="w-3 h-3 text-primary" /> Sticky Mobile Dock Active
                      </span>
                      <span className="font-mono text-primary font-bold">Auto-enabled</span>
                    </div>
                  )}
                </div>

                {/* Trust Badges */}
                {cfg.show_trust_badges && (
                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-border/30 text-[9px] text-center opacity-80 font-medium">
                    <div className="p-1.5 rounded-lg bg-secondary/20 flex flex-col items-center gap-0.5">
                      <Truck className="w-3 h-3 text-primary" />
                      <span>Express Air Shipping</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-secondary/20 flex flex-col items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3 text-primary" />
                      <span>100% Authentic</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-secondary/20 flex flex-col items-center gap-0.5">
                      <RotateCcw className="w-3 h-3 text-primary" />
                      <span>30-Day Easy Exchange</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── LUXURY PRODUCT INTELLIGENCE (ACCORDION DISCLOSURES — NO ROW MENUS) ── */}
            <div className="mt-6 pt-4 border-t border-border/40 space-y-2">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-bold">
                  Product Architecture &amp; Intelligence
                </span>
                <span className="text-[9px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  Interactive Disclosures
                </span>
              </div>

              <div className="space-y-1.5">
                {/* 1. Garment Specs */}
                <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden transition-all">
                  <button
                    onClick={() => setOpenAccordion(openAccordion === "specs" ? null : "specs")}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-secondary/20 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Sliders className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Garment Specifications</h4>
                        <span className="text-[9.5px] text-muted-foreground">380 GSM • Combed Cotton • Dhaka Atelier</span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                        openAccordion === "specs" ? "rotate-180 text-primary" : ""
                      }`}
                    />
                  </button>

                  {openAccordion === "specs" && (
                    <div className="p-3 pt-0 border-t border-border/30 mt-1">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[10.5px]">
                        <div className="p-2 rounded-lg bg-secondary/30">
                          <span className="opacity-50 block font-mono text-[8.5px] uppercase">Fabric Density</span>
                          <strong className="text-foreground">380 GSM Heavy Terry</strong>
                        </div>
                        <div className="p-2 rounded-lg bg-secondary/30">
                          <span className="opacity-50 block font-mono text-[8.5px] uppercase">Yarn Fiber</span>
                          <strong className="text-foreground">100% Combed Cotton</strong>
                        </div>
                        <div className="p-2 rounded-lg bg-secondary/30">
                          <span className="opacity-50 block font-mono text-[8.5px] uppercase">Atelier Origin</span>
                          <strong className="text-foreground">Dhaka, Bangladesh</strong>
                        </div>
                        <div className="p-2 rounded-lg bg-secondary/30">
                          <span className="opacity-50 block font-mono text-[8.5px] uppercase">Hardware</span>
                          <strong className="text-foreground">Laser-Etched Aglets</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Atelier Story */}
                <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden transition-all">
                  <button
                    onClick={() => setOpenAccordion(openAccordion === "story" ? null : "story")}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-secondary/20 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Atelier Craft &amp; Story</h4>
                        <span className="text-[9.5px] text-muted-foreground">Yarn-dyed organic ring-spun cotton</span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                        openAccordion === "story" ? "rotate-180 text-primary" : ""
                      }`}
                    />
                  </button>

                  {openAccordion === "story" && (
                    <div className="p-3 pt-0 border-t border-border/30 mt-1">
                      <p className="text-xs text-muted-foreground leading-relaxed pt-2">
                        Engineered from yarn-dyed organic ring-spun cotton. Each piece is garment-dyed in Dhaka and enzyme washed for a broken-in vintage patina with heavyweight boxy drape.
                      </p>
                    </div>
                  )}
                </div>

                {/* 3. Fit & Measurements */}
                <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden transition-all">
                  <button
                    onClick={() => setOpenAccordion(openAccordion === "fit" ? null : "fit")}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-secondary/20 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Ruler className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Fit Guidance &amp; Sizing</h4>
                        <span className="text-[9.5px] text-muted-foreground">Boxy oversized streetwear silhouette</span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                        openAccordion === "fit" ? "rotate-180 text-primary" : ""
                      }`}
                    />
                  </button>

                  {openAccordion === "fit" && (
                    <div className="p-3 pt-0 border-t border-border/30 mt-1">
                      <p className="text-xs text-muted-foreground leading-relaxed pt-2">
                        Boxy oversized silhouette with dropped shoulders. True to contemporary streetwear sizing. Take your normal size for relaxed drape, or size down for tailored fit.
                      </p>
                    </div>
                  )}
                </div>

                {/* 4. Verified Reviews */}
                <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden transition-all">
                  <button
                    onClick={() => setOpenAccordion(openAccordion === "reviews" ? null : "reviews")}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-secondary/20 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Customer Reviews &amp; Ratings</h4>
                        <span className="text-[9.5px] text-muted-foreground">⭐️⭐️⭐️⭐️⭐️ 4.9/5 (48 verified buyers)</span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                        openAccordion === "reviews" ? "rotate-180 text-primary" : ""
                      }`}
                    />
                  </button>

                  {openAccordion === "reviews" && (
                    <div className="p-3 pt-0 border-t border-border/30 mt-1">
                      <div className="flex items-center justify-between text-xs pt-2">
                        <span>⭐️⭐️⭐️⭐️⭐️ &ldquo;Insane 380 GSM fabric weight and perfect boxy silhouette.&rdquo;</span>
                        <span className="font-mono opacity-60 text-[9px]">Verified Buyer — 2 days ago</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 1: CURATED STUDIO PRESETS ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <Sparkles className="w-3 h-3" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">Curated Studio Combinations</h3>
              <p className="text-[10px] text-muted-foreground">1-click designer pairings of surface aesthetics and 3D gallery engines.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {STUDIO_PRESETS.map((rec) => {
            const active = cfg.layout === rec.layout && cfg.gallery === rec.gallery;
            return (
              <button
                key={rec.label}
                onClick={() => setCfg((c) => ({ ...c, layout: rec.layout, gallery: rec.gallery }))}
                className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  active
                    ? "border-primary bg-primary/15 ring-1 ring-primary/40"
                    : "border-border/60 hover:border-primary/40 bg-card/70 hover:bg-card"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{rec.emoji}</span>
                    <div>
                      <p className="font-bold text-foreground text-xs">{rec.label}</p>
                      <span className="text-[8.5px] font-mono text-primary uppercase font-bold">{rec.tag}</span>
                    </div>
                  </div>
                  {active ? (
                    <Check className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                  )}
                </div>
                <p className="text-muted-foreground text-[10px] leading-snug">{rec.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 2: VISUAL SURFACE THEMES ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <Layout className="w-3 h-3" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">Visual Surface Theme (6 Layouts)</h3>
              <p className="text-[10px] text-muted-foreground">Select overall backdrop atmosphere, typography treatment, and card blur.</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[9.5px] font-mono text-primary border-primary/30">
            Active: {activeLayoutObj.label}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {LAYOUT_STYLES.map((opt) => {
            const active = cfg.layout === opt.id;
            return (
              <motion.div
                key={opt.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCfg((c) => ({ ...c, layout: opt.id }))}
                className={`text-left rounded-xl border transition-all cursor-pointer overflow-hidden ${
                  active
                    ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                    : "border-border/60 bg-card/70 hover:border-primary/40 hover:bg-card"
                }`}
              >
                <div className={`h-12 ${opt.previewBg} relative flex items-center justify-between px-3 border-b border-border/30`}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl">{opt.emoji}</span>
                    <span className="text-[10px] font-mono uppercase font-bold text-foreground/80">{opt.tag}</span>
                  </div>
                  {active && (
                    <Badge variant="outline" className="text-[8.5px] font-mono border-primary/40 text-primary bg-background/90">
                      Active
                    </Badge>
                  )}
                </div>
                <div className="p-3 space-y-0.5">
                  <p className="font-bold text-foreground text-xs">{opt.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight line-clamp-1">{opt.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 3: IMAGE GALLERY ENGINE ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <ImageIcon className="w-3 h-3" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">Image Gallery Engine (6 Motion Engines)</h3>
              <p className="text-[10px] text-muted-foreground">Select how product photography and lookbook angles are presented.</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[9.5px] font-mono text-primary border-primary/30">
            Active: {activeGalleryObj.label}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {GALLERY_ENGINES.map((opt) => {
            const active = cfg.gallery === opt.id;
            return (
              <motion.div
                key={opt.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCfg((c) => ({ ...c, gallery: opt.id }))}
                className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  active
                    ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                    : "border-border/60 bg-card/70 hover:border-primary/40 hover:bg-card"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{opt.emoji}</span>
                    <div>
                      <p className="font-bold text-foreground text-xs">{opt.label}</p>
                      <span className="text-[8.5px] font-mono text-primary uppercase font-bold">{opt.badge}</span>
                    </div>
                  </div>
                  {active && <Check className="w-3.5 h-3.5 text-primary" />}
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight mt-1">{opt.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 4: CONVERSION & TRUST ARCHITECTURE ── */}
      <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-md overflow-hidden p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <ShieldCheck className="w-3 h-3" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">Conversion &amp; Trust Architecture</h3>
              <p className="text-[10px] text-muted-foreground">Toggle conversion modules, scarcity banners, and trust guarantees.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-secondary/15">
            <div className="space-y-0.5 pr-2">
              <span className="text-xs font-bold text-foreground block">Sticky Mobile Dock</span>
              <span className="text-[9.5px] text-muted-foreground block">Bottom fixed buy now tray on mobile</span>
            </div>
            <Switch
              checked={cfg.show_sticky_tray}
              onCheckedChange={(v) => setCfg((c) => ({ ...c, show_sticky_tray: v }))}
            />
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-secondary/15">
            <div className="space-y-0.5 pr-2">
              <span className="text-xs font-bold text-foreground block">Scarcity Counter</span>
              <span className="text-[9.5px] text-muted-foreground block">"Only X left in stock" badge</span>
            </div>
            <Switch
              checked={cfg.show_scarcity_badge}
              onCheckedChange={(v) => setCfg((c) => ({ ...c, show_scarcity_badge: v }))}
            />
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-secondary/15">
            <div className="space-y-0.5 pr-2">
              <span className="text-xs font-bold text-foreground block">Trust Guarantee Badges</span>
              <span className="text-[9.5px] text-muted-foreground block">Authentic, shipping &amp; returns</span>
            </div>
            <Switch
              checked={cfg.show_trust_badges}
              onCheckedChange={(v) => setCfg((c) => ({ ...c, show_trust_badges: v }))}
            />
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-secondary/15">
            <div className="space-y-0.5 pr-2">
              <span className="text-xs font-bold text-foreground block">Size Chart &amp; Fit Guide</span>
              <span className="text-[9.5px] text-muted-foreground block">Interactive measurements modal</span>
            </div>
            <Switch
              checked={cfg.show_size_chart}
              onCheckedChange={(v) => setCfg((c) => ({ ...c, show_size_chart: v }))}
            />
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-secondary/15">
            <div className="space-y-0.5 pr-2">
              <span className="text-xs font-bold text-foreground block">Customer Reviews Tab</span>
              <span className="text-[9.5px] text-muted-foreground block">Verified buyer ratings &amp; photos</span>
            </div>
            <Switch
              checked={cfg.show_reviews}
              onCheckedChange={(v) => setCfg((c) => ({ ...c, show_reviews: v }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
