"use client";
import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Type,
  LayoutGrid,
  Check,
  Palette,
  Maximize2,
  Smartphone,
  Square,
  Sparkles,
  Sliders,
  Eye,
  Search,
  Filter,
  RefreshCw,
  Layers,
  ShoppingBag,
  ArrowUpRight,
  Shield,
  Star,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import {
  STOREFRONT_TYPOGRAPHY_PAIRS,
  STOREFRONT_LAYOUT_VARIANTS,
  STOREFRONT_ACCENT_PRESETS,
  defaultStorefrontAppearance,
  getStorefrontTypographyPair,
  type StorefrontAppearanceConfig,
  type ProfileTypographyPair,
  type TypographyCategory,
} from "@/lib/storefront-appearance";
import { useRegisterUniversalSave } from "@/contexts/UniversalSaveContext";

const loadedFonts = new Set<string>();
function ensureFont(gfUrl: string) {
  if (typeof document === "undefined") return;
  const href = `https://fonts.googleapis.com/css2?family=${gfUrl}&display=swap`;
  if (loadedFonts.has(href)) return;
  loadedFonts.add(href);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

const CATEGORIES: { id: TypographyCategory; label: string; icon: string }[] = [
  { id: "all", label: "All Fonts", icon: "✦" },
  { id: "editorial", label: "Editorial & Luxury", icon: "✨" },
  { id: "classic", label: "Classic & Haute Couture", icon: "🏛️" },
  { id: "creative", label: "Creative & Avant-Garde", icon: "⚡" },
  { id: "minimal", label: "Minimal & Scandinavian", icon: "🤍" },
  { id: "geometric", label: "Geometric Studio", icon: "📐" },
];

const AdminStorefrontAppearance: React.FC = () => {
  useSeoMeta("Storefront Appearance", "Typography and layout for all storefront pages");
  const [cfg, setCfg] = useState<StorefrontAppearanceConfig>(defaultStorefrontAppearance);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TypographyCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [customSampleText, setCustomSampleText] = useState("");
  const [customBodyText, setCustomBodyText] = useState("");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    STOREFRONT_TYPOGRAPHY_PAIRS.forEach((p) => ensureFont(p.gfUrl));
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "storefront_appearance")
        .maybeSingle();
      const v = (data?.value as unknown as Partial<StorefrontAppearanceConfig>) || null;
      if (v) setCfg({ ...defaultStorefrontAppearance, ...v });
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "storefront_appearance", value: cfg as any }, { onConflict: "key" });
    setSaving(false);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved", description: "Storefront appearance updated successfully." });
  };

  useRegisterUniversalSave(
    {
      label: "Save Appearance",
      onSave: save,
      isSaving: saving,
      onReject: () => {
        setCfg(defaultStorefrontAppearance);
        toast.warning("Appearance settings reset to default");
      },
      canReject: true,
    },
    [cfg, saving]
  );

  const activePair = getStorefrontTypographyPair(cfg.typography_pair);

  const filteredPairs = useMemo(() => {
    return STOREFRONT_TYPOGRAPHY_PAIRS.filter((p) => {
      const matchCategory = selectedCategory === "all" || p.category === selectedCategory;
      const matchSearch =
        searchQuery.trim() === "" ||
        p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tag?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* ── HERO BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-secondary/15 to-background p-6 sm:p-8 shadow-sm">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
                <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                Storefront Design System
              </span>
              <Badge variant="outline" className="text-[10px] font-mono border-border/60 text-muted-foreground">
                {STOREFRONT_TYPOGRAPHY_PAIRS.length} Luxury Pairs
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Storefront Typography &amp; Appearance
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Curate the master typographic identity, layout structure, corner radii, and color accents applied
              globally to every public storefront touchpoint.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2.5 rounded-2xl border border-border/50 bg-secondary/30 text-right">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Active Pair</p>
              <p className="text-xs sm:text-sm font-bold text-primary truncate max-w-[200px]" style={{ fontFamily: activePair.heading }}>
                {activePair.label.split("+")[0]}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── TYPOGRAPHY SECTION ── */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-base font-bold text-foreground">
              <Type className="w-4 h-4 text-primary" /> Curated Typography Catalog
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Harmonized display headlines and high-legibility body pairs from Google Fonts.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search font pairs..."
              className="pl-8 h-9 text-xs rounded-xl bg-secondary/20 border-border/50"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/60 border border-border/40"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Font Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPairs.map((p) => {
            const active = p.id === cfg.typography_pair;
            const headingSample = customSampleText || "Architectural Silhouettes";
            const bodySample = customBodyText || "380 GSM heavyweight french terry tailored with precision drop-shoulder fit.";

            return (
              <motion.div
                key={p.id}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setCfg((c) => ({ ...c, typography_pair: p.id }))}
                className={`relative text-left rounded-2xl border p-4 sm:p-5 transition-all cursor-pointer flex flex-col justify-between ${
                  active
                    ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/30"
                    : "border-border/50 hover:border-primary/40 bg-card/60 hover:bg-card shadow-xs"
                }`}
              >
                {/* Header Tag + Check */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-secondary/80 text-foreground border border-border/40">
                      {p.tag || "Editorial"}
                    </span>
                    <span className="text-[9px] font-mono uppercase text-muted-foreground">
                      {p.category}
                    </span>
                  </div>

                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                    active ? "bg-primary text-primary-foreground shadow-xs" : "border border-border/60 bg-secondary/30 opacity-40"
                  }`}>
                    {active ? <Check className="w-3 h-3 stroke-[3]" /> : null}
                  </div>
                </div>

                {/* Big Typographic Showcase */}
                <div className="my-2 space-y-2">
                  <div className="flex items-baseline justify-between border-b border-border/30 pb-2">
                    <span className="text-4xl sm:text-5xl font-normal leading-none select-none text-foreground/90" style={{ fontFamily: p.heading }}>
                      Aa
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/70">
                      DISPLAY + SANS
                    </span>
                  </div>

                  {/* Heading Line */}
                  <h3
                    className="text-lg sm:text-xl font-bold tracking-tight text-foreground line-clamp-1"
                    style={{ fontFamily: p.heading }}
                  >
                    {headingSample}
                  </h3>

                  {/* Body Line */}
                  <p
                    className="text-xs text-muted-foreground leading-relaxed line-clamp-2"
                    style={{ fontFamily: p.body }}
                  >
                    {bodySample}
                  </p>
                </div>

                {/* Footer specs */}
                <div className="mt-3 pt-2.5 border-t border-border/30 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground/80 truncate">{p.label}</span>
                  <span className="text-[9.5px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    Google Font
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredPairs.length === 0 && (
          <div className="py-12 text-center rounded-2xl border border-dashed border-border/60 bg-card/20">
            <Type className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs font-bold text-foreground">No font pairings found</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Try searching with a different keyword or category.</p>
          </div>
        )}
      </section>

      {/* ── INTERACTIVE TYPE LABORATORY & LIVE TESTER ── */}
      <Card className="border-border/50 bg-gradient-to-br from-card to-secondary/10 shadow-sm overflow-hidden">
        <CardHeader className="py-4 px-5 border-b border-border/40 bg-secondary/15">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Sliders className="w-4 h-4 text-primary" /> Interactive Typography Laboratory
              </CardTitle>
              <CardDescription className="text-xs">
                Type custom text below to preview the active pairing (<span className="text-primary font-semibold">{activePair.label}</span>) live.
              </CardDescription>
            </div>
            {(customSampleText || customBodyText) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setCustomSampleText(""); setCustomBodyText(""); }}
                className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="w-3 h-3" /> Reset Sample
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-muted-foreground uppercase">Headline Tester</label>
              <Input
                value={customSampleText}
                onChange={(e) => setCustomSampleText(e.target.value)}
                placeholder="e.g. Winter Heavyweight Oversized Drops"
                className="text-xs rounded-xl bg-background border-border/50 font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-muted-foreground uppercase">Body Copy Tester</label>
              <Input
                value={customBodyText}
                onChange={(e) => setCustomBodyText(e.target.value)}
                placeholder="e.g. Engineered for high architectural structure and lasting comfort."
                className="text-xs rounded-xl bg-background border-border/50 font-medium"
              />
            </div>
          </div>

          {/* Interactive Live Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Dark Card */}
            <div className="rounded-2xl border border-white/10 bg-black/90 p-5 text-white space-y-3 shadow-xl">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 border-b border-white/10 pb-2">
                <span>DARK STOREFRONT THEME</span>
                <span className="text-primary font-bold">LIVE RENDER</span>
              </div>
              <h4 className="text-xl sm:text-2xl font-bold tracking-tight text-white" style={{ fontFamily: activePair.heading }}>
                {customSampleText || "High-Structure 380GSM Oversized Terry"}
              </h4>
              <p className="text-xs text-zinc-300 leading-relaxed" style={{ fontFamily: activePair.body }}>
                {customBodyText || "Cut with dropped shoulders and a heavy ribbed collar for a boxy, contemporary silhouette."}
              </p>
              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs font-bold text-primary font-mono">৳ 2,450 BDT</span>
                <span className="text-[10px] bg-white/10 text-zinc-300 px-2 py-0.5 rounded font-mono">IN STOCK</span>
              </div>
            </div>

            {/* Light / Cream Card */}
            <div className="rounded-2xl border border-border/60 bg-[#faf8f5] dark:bg-zinc-900/90 p-5 text-zinc-900 dark:text-zinc-100 space-y-3 shadow-sm">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 border-b border-border/40 pb-2">
                <span>EDITORIAL MINIMAL THEME</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">READY</span>
              </div>
              <h4 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ fontFamily: activePair.heading }}>
                {customSampleText || "Minimalist French Terry Collection"}
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed" style={{ fontFamily: activePair.body }}>
                {customBodyText || "Precision crafted in Dhaka with double-needle stitching and raw luxury aesthetics."}
              </p>
              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 font-mono">৳ 2,450 BDT</span>
                <span className="text-[10px] bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded font-mono">LIMITED PIECES</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── LAYOUT VARIANT & STRUCTURAL OPTIONS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Layout Variant */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <LayoutGrid className="w-4 h-4 text-primary" /> Storefront Layout Variant
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              {STOREFRONT_LAYOUT_VARIANTS.length} Configurations
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {STOREFRONT_LAYOUT_VARIANTS.map((l) => {
              const active = l.id === cfg.layout_variant;
              return (
                <motion.button
                  key={l.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCfg((c) => ({ ...c, layout_variant: l.id }))}
                  className={`relative text-left rounded-2xl border p-3.5 transition-all cursor-pointer flex flex-col justify-between ${
                    active
                      ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/30"
                      : "border-border/50 hover:border-primary/40 bg-card/60 hover:bg-card shadow-xs"
                  }`}
                >
                  <LayoutPreview id={l.id} />
                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{l.label}</span>
                      {active && <Check className="w-3.5 h-3.5 text-primary" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-tight">
                      {l.description}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Right: Fine-Tuning Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Sliders className="w-4 h-4 text-primary" /> Surface &amp; Spacing Calibration
          </div>

          <Card className="border-border/50 bg-card/60 space-y-4 p-4 rounded-2xl">
            {/* Accent Color */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-primary" /> Accent Palette
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {cfg.accent_hsl ? "Custom HSL" : "Brand Default"}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STOREFRONT_ACCENT_PRESETS.map((a) => {
                  const active = (cfg.accent_hsl ?? "") === a.hsl;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setCfg((c) => ({ ...c, accent_hsl: a.hsl || null }))}
                      className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer ${
                        active
                          ? "border-primary bg-primary/10 ring-2 ring-primary/30 text-foreground font-bold"
                          : "border-border/50 hover:border-border text-muted-foreground bg-secondary/20"
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                        style={{
                          background: a.hsl
                            ? `hsl(${a.hsl})`
                            : "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                        }}
                      />
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Corner Radius */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <Square className="w-3.5 h-3.5 text-primary" /> Card Corner Radius
                </span>
                <span className="text-[10px] font-mono uppercase text-primary font-bold">
                  {cfg.rounded ?? "2xl"}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {(["sm", "md", "lg", "xl", "2xl"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setCfg((c) => ({ ...c, rounded: r }))}
                    className={`py-1.5 rounded-lg border text-[11px] font-mono uppercase transition-all cursor-pointer ${
                      (cfg.rounded ?? "2xl") === r
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30 text-primary font-bold"
                        : "border-border/50 text-muted-foreground hover:text-foreground bg-secondary/15"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Density */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-primary" /> Spacing Density
                </span>
                <span className="text-[10px] font-mono capitalize text-primary font-bold">
                  {cfg.density ?? "comfortable"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(["compact", "comfortable", "spacious"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setCfg((c) => ({ ...c, density: d }))}
                    className={`py-1.5 rounded-lg border text-[11px] capitalize transition-all cursor-pointer ${
                      (cfg.density ?? "comfortable") === d
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30 text-primary font-bold"
                        : "border-border/50 text-muted-foreground hover:text-foreground bg-secondary/15"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Nav */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-primary" /> Mobile Nav Mode
                </span>
                <span className="text-[10px] font-mono capitalize text-primary font-bold">
                  {cfg.mobile_nav ?? "tabs"}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(["tabs", "segmented", "pill", "sheet"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setCfg((c) => ({ ...c, mobile_nav: m }))}
                    className={`py-1.5 rounded-lg border text-[11px] capitalize transition-all cursor-pointer ${
                      (cfg.mobile_nav ?? "tabs") === m
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30 text-primary font-bold"
                        : "border-border/50 text-muted-foreground hover:text-foreground bg-secondary/15"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const LayoutPreview: React.FC<{ id: string }> = ({ id }) => {
  const common = "w-full h-14 rounded-lg bg-secondary/40 border border-border/40 p-1 flex gap-1";
  const block = "rounded-xs bg-foreground/20";
  switch (id) {
    case "magazine":
      return (
        <div className={common + " flex-col"}>
          <div className={block + " h-2 w-3/5 mx-auto"} />
          <div className={block + " flex-1"} />
        </div>
      );
    case "bento":
      return (
        <div className={common}>
          <div className={block + " flex-1"} />
          <div className="flex flex-col gap-1 flex-1">
            <div className={block + " flex-1"} />
            <div className={block + " h-2"} />
          </div>
        </div>
      );
    case "split-screen":
      return (
        <div className={common}>
          <div className={block + " flex-1"} />
          <div className={block + " flex-1"} />
        </div>
      );
    case "full-bleed":
      return (
        <div className={common + " p-0"}>
          <div className={block + " flex-1 m-0 rounded-none"} />
        </div>
      );
    case "minimal":
      return (
        <div className={common + " bg-transparent"}>
          <div className="flex-1 border border-dashed border-border rounded-xs" />
        </div>
      );
    case "editorial":
      return (
        <div className={common + " flex-col"}>
          <div className={block + " h-2 w-4/5"} />
          <div className={block + " h-1 w-2/3"} />
          <div className={block + " flex-1"} />
        </div>
      );
    case "compact-grid":
      return (
        <div className={common + " grid grid-cols-4 gap-1"}>
          <div className={block} />
          <div className={block} />
          <div className={block} />
          <div className={block} />
        </div>
      );
    case "boutique":
      return (
        <div className={common + " flex-col items-center"}>
          <div className={block + " w-1/2 h-1.5"} />
          <div className={block + " w-2/3 flex-1"} />
        </div>
      );
    case "showcase":
      return (
        <div className={common + " flex-col"}>
          <div className={block + " flex-1"} />
          <div className="flex gap-1 h-3">
            <div className={block + " flex-1"} />
            <div className={block + " flex-1"} />
            <div className={block + " flex-1"} />
          </div>
        </div>
      );
    case "hero-grid":
    default:
      return (
        <div className={common + " flex-col"}>
          <div className={block + " h-2.5"} />
          <div className="flex gap-1 flex-1">
            <div className={block + " flex-1"} />
            <div className={block + " flex-1"} />
            <div className={block + " flex-1"} />
          </div>
        </div>
      );
  }
};

export default AdminStorefrontAppearance;
