"use client";
import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Type,
  LayoutGrid,
  Check,
  Palette,
  Maximize2,
  Smartphone,
  Square,
  Sliders,
  Search,
  RefreshCw,
  Filter,
  ChevronDown,
  ShoppingBag,
  ArrowRight,
  Quote,
  Sun,
  Moon,
  Columns,
  Eye,
  Crown,
  BookOpen,
  Layers,
  Zap,
  Compass,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { useRegisterUniversalSave, useUndoRedoState } from "@/contexts/UniversalSaveContext";
import { useQueryClient } from "@tanstack/react-query";

const PRESET_SNIPPETS = [
  { label: "Oversized Drop", head: "HIGH-STRUCTURE 380GSM TERRY", body: "Tailored with dropped shoulders and double-needle french terry for a heavyweight boxy drape." },
  { label: "Dhaka Atelier", head: "CRAFTED IN DHAKA ATELIER", body: "Every seam reinforced with 380 GSM combed cotton and garment-dyed vintage washes." },
  { label: "Limited Drops", head: "EXCLUSIVE STREETWEAR ARCHITECTURE", body: "Zero mass production. Individually inspected limited editions engineered for longevity." },
];

function ensureFont(url: string) {
  if (typeof document === "undefined") return;
  const existing = document.querySelector(`link[href="${url}"]`);
  if (!existing) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
  }
}

const CATEGORIES: { id: TypographyCategory; label: string; icon: React.ElementType }[] = [
  { id: "all", label: "All Fonts", icon: Type },
  { id: "custom", label: "Custom Brand Fonts", icon: Crown },
  { id: "editorial", label: "Editorial & Luxury", icon: BookOpen },
  { id: "classic", label: "Classic & Haute Couture", icon: Layers },
  { id: "creative", label: "Creative & Avant-Garde", icon: Zap },
  { id: "minimal", label: "Minimal & Clean", icon: Square },
  { id: "geometric", label: "Geometric Studio", icon: Compass },
];

function extractFontName(fontFamilyStr: string): string {
  if (!fontFamilyStr) return "";
  const match = fontFamilyStr.match(/^"([^"]+)"/) || fontFamilyStr.match(/^'([^']+)'/);
  if (match) return match[1];
  return fontFamilyStr.split(",")[0].trim().replace(/['"]/g, "");
}

const AdminStorefrontAppearance: React.FC = () => {
  useSeoMeta("Storefront Appearance", "Typography and layout for all storefront pages");
  const qc = useQueryClient();
  const [cfg, setCfg, { undo, redo, canUndo, canRedo, reject, canReject, setInitial }] =
    useUndoRedoState<StorefrontAppearanceConfig>(defaultStorefrontAppearance);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TypographyCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [customSampleText, setCustomSampleText] = useState("");
  const [customBodyText, setCustomBodyText] = useState("");
  const [previewScene, setPreviewScene] = useState<"hero" | "product" | "editorial">("hero");
  const [previewTheme, setPreviewTheme] = useState<"split" | "dark" | "light">("split");

  useEffect(() => {
    STOREFRONT_TYPOGRAPHY_PAIRS.forEach((p) => {
      if (p.gfUrl) ensureFont(p.gfUrl);
    });
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["storefront_appearance", "title_font"]);

      const map: Record<string, any> = {};
      data?.forEach((s) => {
        const val: any = s.value;
        map[s.key] = typeof val === "object" && val !== null ? val.value ?? val : val;
      });

      let appearanceVal = (map.storefront_appearance as Partial<StorefrontAppearanceConfig>) || {};
      const currentTitleFont = map.title_font as string | undefined;

      // If typography pair is not explicitly set in storefront_appearance or defaults, match by title_font
      if (currentTitleFont && (!appearanceVal.typography_pair || appearanceVal.typography_pair === "instrument-serif-work-sans")) {
        const matched = STOREFRONT_TYPOGRAPHY_PAIRS.find(
          (p) => extractFontName(p.heading).toLowerCase() === currentTitleFont.toLowerCase()
        );
        if (matched) {
          appearanceVal.typography_pair = matched.id;
        }
      }

      setInitial({ ...defaultStorefrontAppearance, ...appearanceVal });
    })();
  }, [setInitial]);

  const save = async () => {
    setSaving(true);
    const activeP = getStorefrontTypographyPair(cfg.typography_pair);
    const headingFontFamily = extractFontName(activeP.heading);

    const [resApp, resTitle] = await Promise.all([
      supabase.from("site_settings").upsert(
        { key: "storefront_appearance", value: cfg as any },
        { onConflict: "key" }
      ),
      headingFontFamily
        ? supabase.from("site_settings").upsert(
            { key: "title_font", value: headingFontFamily as any },
            { onConflict: "key" }
          )
        : Promise.resolve({ error: null }),
    ]);

    setSaving(false);
    if (resApp.error || (resTitle && resTitle.error)) {
      toast({
        title: "Failed to save",
        description: resApp.error?.message || (resTitle.error as any)?.message,
        variant: "destructive",
      });
      return;
    }

    qc.invalidateQueries({ queryKey: ["site-settings"] });
    qc.invalidateQueries({ queryKey: ["admin-settings"] });
    qc.invalidateQueries({ queryKey: ["brand-identity"] });
    toast({ title: "Saved", description: "Storefront typography & appearance synchronized globally." });
  };

  useRegisterUniversalSave(
    {
      label: "Save Appearance",
      onSave: save,
      isSaving: saving,
      onUndo: undo,
      canUndo: canUndo,
      onRedo: redo,
      canRedo: canRedo,
      onReject: () => {
        reject();
        toast.warning("Appearance settings reverted");
      },
      canReject: canReject,
    },
    [cfg, saving, canUndo, canRedo, canReject]
  );

  const activePair = getStorefrontTypographyPair(cfg.typography_pair);
  const activeHeadingName = extractFontName(activePair.heading);

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
    <div className="space-y-6">
      {/* ── TOP CONTROL BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Type className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground">Storefront Typography &amp; Identity</h2>
              <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/10">
                Active: {activeHeadingName}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Select curated display and body pairings across your storefront touchpoints.
            </p>
          </div>
        </div>

        {/* Filter Dropdown + Search */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 h-8 px-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 border border-border/50 text-xs font-semibold text-foreground transition-all cursor-pointer hover:border-primary/40 shrink-0"
              >
                <Filter className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate max-w-[140px] flex items-center gap-1.5">
                  {(() => {
                    const SelectedIcon = CATEGORIES.find((c) => c.id === selectedCategory)?.icon || Type;
                    return <SelectedIcon className="w-3 h-3 text-muted-foreground" />;
                  })()}
                  <span>{CATEGORIES.find((c) => c.id === selectedCategory)?.label || "All Fonts"}</span>
                </span>
                <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl border border-border/60 bg-popover/95 backdrop-blur-md">
              <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2 py-1">
                Filter by Category
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1 border-border/40" />
              {CATEGORIES.map((cat) => {
                const active = selectedCategory === cat.id;
                const IconComp = cat.icon;
                return (
                  <DropdownMenuItem
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      active ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-secondary/60"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <IconComp className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{cat.label}</span>
                    </div>
                    {active && <Check className="w-3.5 h-3.5 text-primary stroke-[2.5]" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="relative flex-1 sm:w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter typography..."
              className="pl-8 h-8 text-xs rounded-xl bg-secondary/20 border-border/50"
            />
          </div>
        </div>
      </div>

      {/* ── FONT CARDS GRID (COMPACT & SLEEK) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5">
        {filteredPairs.map((p) => {
          const active = p.id === cfg.typography_pair;
          const isCustom = p.category === "custom";
          const headingSample = customSampleText || "Architectural Cut";
          const bodySample =
            customBodyText || "380 GSM heavyweight french terry drop-shoulder.";

          return (
            <motion.div
              key={p.id}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setCfg((c) => ({ ...c, typography_pair: p.id }))}
              className={`relative text-left rounded-xl border p-2.5 sm:p-3 transition-all cursor-pointer flex flex-col justify-between ${
                active
                  ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                  : "border-border/50 hover:border-primary/40 bg-card/60 hover:bg-card"
              }`}
            >
              {/* Header Badge + Active Indicator */}
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <div className="flex items-center gap-1">
                  <span
                    className={`text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                      isCustom
                        ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                        : "bg-secondary text-foreground border border-border/40"
                    }`}
                  >
                    {p.tag}
                  </span>
                  <span className="text-[8px] font-mono uppercase text-muted-foreground truncate max-w-[60px]">
                    {p.category}
                  </span>
                </div>

                <div
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "border border-border/60 bg-secondary/30 opacity-40"
                  }`}
                >
                  {active ? <Check className="w-2 h-2 stroke-[3]" /> : null}
                </div>
              </div>

              {/* Glyph + Samples */}
              <div className="my-1 space-y-1">
                <div className="flex items-baseline justify-between border-b border-border/30 pb-1">
                  <span
                    className="text-xl sm:text-2xl font-normal leading-none select-none text-foreground/90"
                    style={{ fontFamily: p.heading }}
                  >
                    Aa
                  </span>
                  <span className="text-[8.5px] font-mono text-muted-foreground/70 uppercase">
                    {isCustom ? "Brand" : "Web"}
                  </span>
                </div>

                <h3
                  className="text-xs sm:text-sm font-bold tracking-tight text-foreground line-clamp-1"
                  style={{ fontFamily: p.heading }}
                >
                  {headingSample}
                </h3>

                <p
                  className="text-[10px] text-muted-foreground leading-tight line-clamp-1"
                  style={{ fontFamily: p.body }}
                >
                  {bodySample}
                </p>
              </div>

              {/* Footer */}
              <div className="mt-1.5 pt-1.5 border-t border-border/30 flex items-center justify-between text-[10px]">
                <span className="font-semibold text-foreground/80 truncate max-w-[85px]">{p.label}</span>
                <span className="text-[8px] font-mono text-primary bg-primary/10 px-1 py-0.2 rounded">
                  {isCustom ? "Bundled" : "Web Font"}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── LIVE TYPOGRAPHY STUDIO (LUXURY REDESIGN) ── */}
      <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-md overflow-hidden space-y-0">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 sm:px-4 border-b border-border/40 bg-secondary/20">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="absolute w-3.5 h-3.5 rounded-full bg-emerald-500/20" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-foreground tracking-tight">Live Typography Studio</h3>
              <Badge variant="outline" className="text-[9px] font-mono border-primary/30 text-primary bg-primary/10">
                Display: {activeHeadingName}
              </Badge>
              <Badge variant="secondary" className="hidden sm:inline-flex text-[9px] font-mono text-muted-foreground">
                Body: {extractFontName(activePair.body)}
              </Badge>
            </div>
          </div>

          {/* Right Controls: Scene Selector & Theme Mode Switcher */}
          <div className="flex items-center gap-2">
            {/* Scene Selector */}
            <div className="flex items-center p-0.5 rounded-lg bg-background/80 border border-border/50">
              <button
                onClick={() => setPreviewScene("hero")}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                  previewScene === "hero"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="w-2.5 h-2.5" />
                <span>Hero Drop</span>
              </button>
              <button
                onClick={() => setPreviewScene("product")}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                  previewScene === "product"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ShoppingBag className="w-2.5 h-2.5" />
                <span>Product Card</span>
              </button>
              <button
                onClick={() => setPreviewScene("editorial")}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                  previewScene === "editorial"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Quote className="w-2.5 h-2.5" />
                <span>Lookbook Story</span>
              </button>
            </div>

            {/* Theme Toggle (Split, Dark, Light) */}
            <div className="hidden sm:flex items-center p-0.5 rounded-lg bg-background/80 border border-border/50">
              <button
                onClick={() => setPreviewTheme("split")}
                title="Split Dark & Light"
                className={`p-1 rounded-md text-[10px] transition-all cursor-pointer ${
                  previewTheme === "split" ? "bg-secondary text-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Columns className="w-3 h-3" />
              </button>
              <button
                onClick={() => setPreviewTheme("dark")}
                title="Dark Mode"
                className={`p-1 rounded-md text-[10px] transition-all cursor-pointer ${
                  previewTheme === "dark" ? "bg-secondary text-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Moon className="w-3 h-3" />
              </button>
              <button
                onClick={() => setPreviewTheme("light")}
                title="Light Mode"
                className={`p-1 rounded-md text-[10px] transition-all cursor-pointer ${
                  previewTheme === "light" ? "bg-secondary text-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sun className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Custom Text Bar with Quick Presets */}
        <div className="p-3 bg-card/40 border-b border-border/30 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              <span className="text-[9.5px] font-mono text-muted-foreground shrink-0 uppercase tracking-wider">
                Presets:
              </span>
              {PRESET_SNIPPETS.map((pr) => (
                <button
                  key={pr.label}
                  onClick={() => {
                    setCustomSampleText(pr.head);
                    setCustomBodyText(pr.body);
                  }}
                  className="px-2 py-0.5 rounded-md text-[9.5px] font-medium bg-secondary/40 hover:bg-secondary border border-border/40 text-foreground transition-colors cursor-pointer shrink-0"
                >
                  {pr.label}
                </button>
              ))}
            </div>

            {(customSampleText || customBodyText) && (
              <button
                onClick={() => {
                  setCustomSampleText("");
                  setCustomBodyText("");
                }}
                className="text-[9.5px] font-mono text-muted-foreground hover:text-primary flex items-center gap-1 cursor-pointer transition-colors ml-auto"
              >
                <RefreshCw className="w-2.5 h-2.5" /> Clear custom text
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="relative">
              <Type className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                value={customSampleText}
                onChange={(e) => setCustomSampleText(e.target.value)}
                placeholder="Headline text: e.g. HIGH-STRUCTURE 380GSM TERRY"
                className="pl-7.5 text-xs rounded-lg h-7.5 bg-background/60 border-border/50"
              />
            </div>
            <div className="relative">
              <Sliders className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                value={customBodyText}
                onChange={(e) => setCustomBodyText(e.target.value)}
                placeholder="Body text: e.g. Tailored with dropped shoulders..."
                className="pl-7.5 text-xs rounded-lg h-7.5 bg-background/60 border-border/50"
              />
            </div>
          </div>
        </div>

        {/* Live Stage Canvas */}
        <div className="p-3 sm:p-4 bg-background/40">
          {previewScene === "hero" && (
            <div className={`grid gap-3 ${previewTheme === "split" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
              {/* Dark Hero */}
              {(previewTheme === "split" || previewTheme === "dark") && (
                <div className="relative rounded-xl border border-white/10 bg-[#161616] p-4 sm:p-5 text-white overflow-hidden flex flex-col justify-between min-h-[170px]">
                  <div className="absolute inset-0 bg-radial-gradient from-primary/15 via-transparent to-transparent opacity-60 pointer-events-none" />
                  <div className="relative z-10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[8.5px] font-mono tracking-widest text-zinc-400 uppercase">
                        ORIZINO STUDIO — A/W 2026
                      </span>
                      <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-primary/20 text-primary border border-primary/30 uppercase">
                        LIMITED 50 PIECES
                      </span>
                    </div>

                    <h4
                      className="text-lg sm:text-xl font-extrabold tracking-tight text-white line-clamp-2 uppercase"
                      style={{ fontFamily: activePair.heading }}
                    >
                      {customSampleText || "ARCHITECTURAL OVERSIZED TERRY"}
                    </h4>

                    <p
                      className="text-xs text-zinc-300 line-clamp-2 leading-relaxed max-w-lg"
                      style={{ fontFamily: activePair.body }}
                    >
                      {customBodyText ||
                        "Tailored with dropped shoulders and double-needle french terry for a heavyweight boxy drape."}
                    </p>
                  </div>

                  <div className="relative z-10 mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="px-3 py-1 rounded-md text-[10px] font-bold bg-primary text-white flex items-center gap-1"
                        style={{ fontFamily: activePair.heading }}
                      >
                        EXPLORE DROP <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                      <span
                        className="px-2.5 py-1 rounded-md text-[10px] text-zinc-400 hover:text-white border border-white/10"
                        style={{ fontFamily: activePair.body }}
                      >
                        LOOKBOOK
                      </span>
                    </div>
                    <span className="text-[8.5px] font-mono text-zinc-500">Dark Aesthetic</span>
                  </div>
                </div>
              )}

              {/* Light Hero */}
              {(previewTheme === "split" || previewTheme === "light") && (
                <div className="relative rounded-xl border border-border/80 bg-[#FAF8F5] p-4 sm:p-5 text-zinc-900 overflow-hidden flex flex-col justify-between min-h-[170px]">
                  <div className="relative z-10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[8.5px] font-mono tracking-widest text-zinc-500 uppercase">
                        EDITORIAL ARCHIVE — DROP 004
                      </span>
                      <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-zinc-200 text-zinc-700 border border-zinc-300 uppercase">
                        DHAKA ATELIER
                      </span>
                    </div>

                    <h4
                      className="text-lg sm:text-xl font-extrabold tracking-tight text-zinc-950 line-clamp-2 uppercase"
                      style={{ fontFamily: activePair.heading }}
                    >
                      {customSampleText || "MINIMALIST FRENCH TERRY CAPSULE"}
                    </h4>

                    <p
                      className="text-xs text-zinc-700 line-clamp-2 leading-relaxed max-w-lg"
                      style={{ fontFamily: activePair.body }}
                    >
                      {customBodyText ||
                        "Precision crafted in Dhaka with double-needle stitching, raw luxury aesthetics, and boxy drape."}
                    </p>
                  </div>

                  <div className="relative z-10 mt-3 pt-2.5 border-t border-zinc-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="px-3 py-1 rounded-md text-[10px] font-bold bg-zinc-900 text-white flex items-center gap-1"
                        style={{ fontFamily: activePair.heading }}
                      >
                        DISCOVER <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                      <span
                        className="px-2.5 py-1 rounded-md text-[10px] text-zinc-600 border border-zinc-300"
                        style={{ fontFamily: activePair.body }}
                      >
                        SPECIFICATIONS
                      </span>
                    </div>
                    <span className="text-[8.5px] font-mono text-zinc-500">Vanilla Light</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {previewScene === "product" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Product Card Dark */}
              <div className="rounded-xl border border-white/10 bg-[#161616] p-3 text-white flex gap-3 items-center">
                <div className="w-20 h-24 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex flex-col items-center justify-center shrink-0 text-center p-1">
                  <span className="text-[8px] font-mono text-zinc-400">380 GSM</span>
                  <span className="text-xs font-bold text-white mt-1" style={{ fontFamily: activePair.heading }}>
                    TEE
                  </span>
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-wider">01 / APPAREL</span>
                  <h4 className="text-sm font-bold text-white truncate" style={{ fontFamily: activePair.heading }}>
                    {customSampleText || "Heavyweight Boxy Drop Tee"}
                  </h4>
                  <p className="text-[10.5px] text-zinc-300 line-clamp-2 leading-tight" style={{ fontFamily: activePair.body }}>
                    {customBodyText || "Reinforced rib collar and custom silhouette crafted in Dhaka."}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-primary font-mono">$68.00 USD</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/10 text-white">IN STOCK</span>
                  </div>
                </div>
              </div>

              {/* Product Card Light */}
              <div className="rounded-xl border border-border/80 bg-[#FAF8F5] p-3 text-zinc-900 flex gap-3 items-center">
                <div className="w-20 h-24 rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-200 border border-zinc-300 flex flex-col items-center justify-center shrink-0 text-center p-1">
                  <span className="text-[8px] font-mono text-zinc-500">420 GSM</span>
                  <span className="text-xs font-bold text-zinc-900 mt-1" style={{ fontFamily: activePair.heading }}>
                    HOODIE
                  </span>
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider">02 / OUTERWEAR</span>
                  <h4 className="text-sm font-bold text-zinc-950 truncate" style={{ fontFamily: activePair.heading }}>
                    {customSampleText || "Overdyed Terry Zip Hoodie"}
                  </h4>
                  <p className="text-[10.5px] text-zinc-700 line-clamp-2 leading-tight" style={{ fontFamily: activePair.body }}>
                    {customBodyText || "Double-needle construction with raw-hem metal zipper finishes."}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-zinc-900 font-mono">$120.00 USD</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-zinc-200 text-zinc-800">LIMITED</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {previewScene === "editorial" && (
            <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-[9px] font-mono uppercase tracking-widest text-primary font-bold">
                  ORIZINO EDITORIAL STATEMENT
                </span>
                <span className="text-[8.5px] font-mono text-muted-foreground">Vol. 04 / Contemporary Dhaka</span>
              </div>
              <blockquote
                className="text-base sm:text-lg font-bold text-foreground leading-snug tracking-tight"
                style={{ fontFamily: activePair.heading }}
              >
                &ldquo;{customSampleText || "Architecture for the human form — where rigid structure meets effortless drape."}&rdquo;
              </blockquote>
              <p
                className="text-xs text-muted-foreground leading-relaxed columns-1 sm:columns-2 gap-4 pt-1"
                style={{ fontFamily: activePair.body }}
              >
                {customBodyText ||
                  "Every garment in our capsule is engineered starting with raw yarn density. We believe that true contemporary luxury requires no oversized logos — rather, presence is defined by silhouette, fabric weight, and tailored precision."}
              </p>
            </div>
          )}

          {/* Typography Telemetry Strip */}
          <div className="mt-3 pt-2.5 border-t border-border/40 flex flex-wrap items-center justify-between gap-2 text-[9.5px] font-mono text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>
                <strong className="text-foreground">Display:</strong> {activeHeadingName}
              </span>
              <span>
                <strong className="text-foreground">Body:</strong> {extractFontName(activePair.body)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground/70">Sample Glyphs:</span>
              <span className="text-foreground font-sans text-xs tracking-wider" style={{ fontFamily: activePair.heading }}>
                Aa Bb Gg Rr 0123456789 &amp;?!
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── STRUCTURAL & CALIBRATION OPTIONS (REDESIGNED LUXURY SUITE) ── */}
      <div className="space-y-4 pt-2">
        {/* SECTION 1: Storefront Layout Architecture */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                <LayoutGrid className="w-3 h-3" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground">Storefront Layout Architecture</h3>
                <p className="text-[10px] text-muted-foreground">Select the structural rhythm, hero banner ratio, and product grid flow.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9.5px] font-mono border-primary/30 text-primary bg-primary/5">
                Active: {STOREFRONT_LAYOUT_VARIANTS.find((v) => v.id === cfg.layout_variant)?.label ?? "Hero Grid"}
              </Badge>
              <Badge variant="secondary" className="text-[9.5px] font-mono text-muted-foreground">
                10 Presets
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {STOREFRONT_LAYOUT_VARIANTS.map((l) => {
              const active = l.id === cfg.layout_variant;
              return (
                <motion.button
                  key={l.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCfg((c) => ({ ...c, layout_variant: l.id }))}
                  className={`group relative text-left rounded-xl border p-2.5 transition-all cursor-pointer flex flex-col justify-between overflow-hidden ${
                    active
                      ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                      : "border-border/60 hover:border-primary/40 bg-card/70 hover:bg-card"
                  }`}
                >
                  <LayoutPreview id={l.id} active={active} />
                  <div className="mt-2 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10.5px] font-bold truncate ${active ? "text-primary" : "text-foreground"}`}>
                        {l.label}
                      </span>
                      {active ? (
                        <Check className="w-3 h-3 text-primary shrink-0" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-border group-hover:bg-primary/40 transition-colors" />
                      )}
                    </div>
                    <p className="text-[9px] text-muted-foreground line-clamp-1 leading-tight">
                      {l.description}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: Surface Calibration & Ergonomics */}
        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-md overflow-hidden p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                <Sliders className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground">Surface Calibration &amp; Ergonomics</h3>
                <p className="text-[10px] text-muted-foreground">Customize your brand accent glow, corner curvature, viewport density, and mobile navigation.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] font-mono text-muted-foreground border-border/60">
                Radius: {cfg.rounded ?? "2xl"} • Density: {cfg.density ?? "comfortable"} • Nav: {cfg.mobile_nav ?? "tabs"}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
            {/* 1. Accent Palette */}
            <div className="rounded-xl border border-border/50 bg-secondary/15 p-3 space-y-2 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                  <Palette className="w-3 h-3 text-primary" />
                  <span>Accent Glow</span>
                </div>
                <span className="text-[9px] font-mono text-primary font-bold">
                  {STOREFRONT_ACCENT_PRESETS.find((a) => (cfg.accent_hsl ?? "") === a.hsl)?.label ?? "Brand Default"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {STOREFRONT_ACCENT_PRESETS.map((a) => {
                  const active = (cfg.accent_hsl ?? "") === a.hsl;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setCfg((c) => ({ ...c, accent_hsl: a.hsl || null }))}
                      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[9.5px] font-medium transition-all cursor-pointer ${
                        active
                          ? "border-primary bg-primary/15 ring-1 ring-primary/40 text-foreground font-bold"
                          : "border-border/50 text-muted-foreground bg-background/50 hover:bg-background hover:text-foreground"
                      }`}
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 border ${active ? "ring-1 ring-white/50 border-white/80" : "border-white/20"}`}
                        style={{
                          background: a.hsl
                            ? `hsl(${a.hsl})`
                            : "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                        }}
                      />
                      <span className="truncate">{a.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Corner Radius */}
            <div className="rounded-xl border border-border/50 bg-secondary/15 p-3 space-y-2 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                  <Square className="w-3 h-3 text-primary" />
                  <span>Corner Curvature</span>
                </div>
                <span className="text-[9px] font-mono uppercase text-primary font-bold">{cfg.rounded ?? "2xl"}</span>
              </div>

              <div className="grid grid-cols-5 gap-1 pt-1">
                {(
                  [
                    { id: "sm", label: "SM", radius: "rounded-xs", desc: "4px" },
                    { id: "md", label: "MD", radius: "rounded-sm", desc: "8px" },
                    { id: "lg", label: "LG", radius: "rounded-md", desc: "12px" },
                    { id: "xl", label: "XL", radius: "rounded-lg", desc: "16px" },
                    { id: "2xl", label: "2XL", radius: "rounded-2xl", desc: "Pill" },
                  ] as const
                ).map((r) => {
                  const active = (cfg.rounded ?? "2xl") === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setCfg((c) => ({ ...c, rounded: r.id }))}
                      className={`flex flex-col items-center justify-center p-1.5 border transition-all cursor-pointer ${r.radius} ${
                        active
                          ? "border-primary bg-primary/20 ring-1 ring-primary/40 text-primary font-bold"
                          : "border-border/60 text-muted-foreground hover:text-foreground bg-background/50 hover:bg-background"
                      }`}
                    >
                      <span className="text-[10px] font-mono uppercase font-bold">{r.label}</span>
                      <span className="text-[7.5px] opacity-70 font-mono">{r.desc}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[9px] text-muted-foreground leading-tight">
                Controls buttons, product tiles, badges, and modal curvatures.
              </p>
            </div>

            {/* 3. Viewport Density */}
            <div className="rounded-xl border border-border/50 bg-secondary/15 p-3 space-y-2 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                  <Maximize2 className="w-3 h-3 text-primary" />
                  <span>Viewport Density</span>
                </div>
                <span className="text-[9px] font-mono capitalize text-primary font-bold">
                  {cfg.density ?? "comfortable"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {(
                  [
                    { id: "compact", label: "Compact", sub: "Tight 4-Col" },
                    { id: "comfortable", label: "Comfort", sub: "Balanced" },
                    { id: "spacious", label: "Spacious", sub: "Editorial" },
                  ] as const
                ).map((d) => {
                  const active = (cfg.density ?? "comfortable") === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setCfg((c) => ({ ...c, density: d.id }))}
                      className={`flex flex-col items-center justify-center p-1.5 rounded-lg border transition-all cursor-pointer ${
                        active
                          ? "border-primary bg-primary/20 ring-1 ring-primary/40 text-primary font-bold"
                          : "border-border/60 text-muted-foreground hover:text-foreground bg-background/50 hover:bg-background"
                      }`}
                    >
                      <span className="text-[10px] font-semibold">{d.label}</span>
                      <span className="text-[7.5px] opacity-70 font-mono">{d.sub}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[9px] text-muted-foreground leading-tight">
                Adjusts vertical padding, gutters, and product card aspect ratios.
              </p>
            </div>

            {/* 4. Mobile Navigation Architecture */}
            <div className="rounded-xl border border-border/50 bg-secondary/15 p-3 space-y-2 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                  <Smartphone className="w-3 h-3 text-primary" />
                  <span>Mobile Navigation</span>
                </div>
                <span className="text-[9px] font-mono capitalize text-primary font-bold">
                  {cfg.mobile_nav ?? "tabs"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {(
                  [
                    { id: "tabs", label: "Bottom Dock", sub: "Classic 5-tab bar" },
                    { id: "segmented", label: "Glass Capsule", sub: "Floating dock" },
                    { id: "pill", label: "Center Pill", sub: "Minimalist action" },
                    { id: "sheet", label: "Action Sheet", sub: "Swipe menu" },
                  ] as const
                ).map((m) => {
                  const active = (cfg.mobile_nav ?? "tabs") === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setCfg((c) => ({ ...c, mobile_nav: m.id }))}
                      className={`flex flex-col items-start p-1.5 rounded-lg border transition-all cursor-pointer ${
                        active
                          ? "border-primary bg-primary/20 ring-1 ring-primary/40 text-primary font-bold"
                          : "border-border/60 text-muted-foreground hover:text-foreground bg-background/50 hover:bg-background"
                      }`}
                    >
                      <span className="text-[10px] font-semibold truncate w-full text-left">{m.label}</span>
                      <span className="text-[7.5px] opacity-70 font-mono truncate w-full text-left">{m.sub}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[9px] text-muted-foreground leading-tight">
                Phone viewport floating navigation dock style and ergonomics.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LayoutPreview: React.FC<{ id: string; active?: boolean }> = ({ id, active }) => {
  const container = `w-full h-12 rounded-lg p-1.5 flex gap-1 transition-all ${
    active ? "bg-primary/15 border border-primary/40" : "bg-secondary/40 border border-border/50"
  }`;
  const heroBlock = active ? "rounded-xs bg-primary/70" : "rounded-xs bg-foreground/35";
  const itemBlock = active ? "rounded-xs bg-primary/30" : "rounded-xs bg-foreground/20";
  const lineBlock = active ? "rounded-xs bg-primary/50" : "rounded-xs bg-foreground/25";

  switch (id) {
    case "magazine":
      return (
        <div className={container + " flex-col justify-between"}>
          <div className={`${lineBlock} h-1.5 w-3/5 mx-auto`} />
          <div className={`${heroBlock} flex-1`} />
          <div className="flex gap-1 h-1.5">
            <div className={`${itemBlock} flex-1`} />
            <div className={`${itemBlock} flex-1`} />
          </div>
        </div>
      );
    case "bento":
      return (
        <div className={container}>
          <div className={`${heroBlock} flex-1`} />
          <div className="flex flex-col gap-1 flex-1">
            <div className={`${itemBlock} flex-1`} />
            <div className={`${lineBlock} h-2.5`} />
          </div>
        </div>
      );
    case "split-screen":
      return (
        <div className={container}>
          <div className={`${heroBlock} flex-1`} />
          <div className="flex flex-col gap-1 flex-1 justify-center">
            <div className={`${lineBlock} h-2 w-4/5`} />
            <div className={`${itemBlock} h-1.5 w-full`} />
            <div className={`${itemBlock} h-1.5 w-2/3`} />
          </div>
        </div>
      );
    case "full-bleed":
      return (
        <div className={container + " p-0"}>
          <div className={`${heroBlock} flex-1 m-0 rounded-md`} />
        </div>
      );
    case "minimal":
      return (
        <div className={container + " bg-transparent flex-col justify-between p-1.5"}>
          <div className={`${lineBlock} h-1 w-1/2 mx-auto`} />
          <div className="flex-1 border border-dashed border-border/80 rounded-xs my-0.5 flex items-center justify-center">
            <div className={`${heroBlock} w-3 h-3 rounded-full opacity-40`} />
          </div>
          <div className={`${itemBlock} h-1 w-2/3 mx-auto`} />
        </div>
      );
    case "editorial":
      return (
        <div className={container + " flex-col justify-between"}>
          <div className={`${lineBlock} h-1.5 w-4/5`} />
          <div className={`${itemBlock} h-1 w-1/2`} />
          <div className="flex gap-1 flex-1">
            <div className={`${heroBlock} flex-1`} />
            <div className={`${itemBlock} flex-1`} />
          </div>
        </div>
      );
    case "compact-grid":
      return (
        <div className={container + " grid grid-cols-4 gap-1 items-stretch"}>
          <div className={itemBlock} />
          <div className={itemBlock} />
          <div className={itemBlock} />
          <div className={itemBlock} />
        </div>
      );
    case "boutique":
      return (
        <div className={container + " flex-col items-center justify-between"}>
          <div className={`${lineBlock} w-1/2 h-1`} />
          <div className={`${heroBlock} w-4/5 flex-1 my-0.5`} />
          <div className={`${itemBlock} w-3/5 h-1`} />
        </div>
      );
    case "showcase":
      return (
        <div className={container + " flex-col justify-between"}>
          <div className={`${heroBlock} flex-1`} />
          <div className="flex gap-1 h-2">
            <div className={`${itemBlock} flex-1`} />
            <div className={`${itemBlock} flex-1`} />
            <div className={`${itemBlock} flex-1`} />
          </div>
        </div>
      );
    case "hero-grid":
    default:
      return (
        <div className={container + " flex-col justify-between"}>
          <div className={`${heroBlock} h-3.5`} />
          <div className="flex gap-1 flex-1">
            <div className={`${itemBlock} flex-1`} />
            <div className={`${itemBlock} flex-1`} />
            <div className={`${itemBlock} flex-1`} />
          </div>
        </div>
      );
  }
};

export default AdminStorefrontAppearance;
