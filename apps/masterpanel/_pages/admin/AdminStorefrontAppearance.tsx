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
  Sparkles,
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
import { useRegisterUniversalSave } from "@/contexts/UniversalSaveContext";
import { useQueryClient } from "@tanstack/react-query";

const PRESET_SNIPPETS = [
  { label: "Oversized Drop", head: "HIGH-STRUCTURE 380GSM TERRY", body: "Tailored with dropped shoulders and double-needle french terry for a heavyweight boxy drape." },
  { label: "Dhaka Atelier", head: "CRAFTED IN DHAKA ATELIER", body: "Every seam reinforced with 380 GSM combed cotton and garment-dyed vintage washes." },
  { label: "Limited Capsule", head: "WINTER CAPSULE 004 / 50 PIECES", body: "Engineered boxy silhouette with custom metal hardware and minimal branding accents." },
];

const loadedFonts = new Set<string>();
function ensureFont(gfUrl: string) {
  if (typeof document === "undefined" || !gfUrl || gfUrl.trim() === "") return;
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
  { id: "custom", label: "Custom Brand Fonts", icon: "💎" },
  { id: "editorial", label: "Editorial & Luxury", icon: "✨" },
  { id: "classic", label: "Classic & Haute Couture", icon: "🏛️" },
  { id: "creative", label: "Creative & Avant-Garde", icon: "⚡" },
  { id: "minimal", label: "Minimal & Clean", icon: "🤍" },
  { id: "geometric", label: "Geometric Studio", icon: "📐" },
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
  const [cfg, setCfg] = useState<StorefrontAppearanceConfig>(defaultStorefrontAppearance);
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

      setCfg({ ...defaultStorefrontAppearance, ...appearanceVal });
    })();
  }, []);

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
      onReject: () => {
        setCfg(defaultStorefrontAppearance);
        toast.warning("Appearance settings reset to default");
      },
      canReject: true,
    },
    [cfg, saving]
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border/50 shadow-xs">
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
                className="flex items-center gap-2 h-8 px-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 border border-border/50 text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs hover:border-primary/40 shrink-0"
              >
                <Filter className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate max-w-[140px]">
                  {CATEGORIES.find((c) => c.id === selectedCategory)?.icon}{" "}
                  {CATEGORIES.find((c) => c.id === selectedCategory)?.label || "All Fonts"}
                </span>
                <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl border border-border/60 bg-popover/95 backdrop-blur-md shadow-lg">
              <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2 py-1">
                Filter by Category
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1 border-border/40" />
              {CATEGORIES.map((cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <DropdownMenuItem
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      active ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-secondary/60"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{cat.icon}</span>
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
                  ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40"
                  : "border-border/50 hover:border-primary/40 bg-card/60 hover:bg-card shadow-2xs"
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
                      ? "bg-primary text-primary-foreground shadow-2xs"
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
      <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-md shadow-sm overflow-hidden space-y-0">
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
            <div className="flex items-center p-0.5 rounded-lg bg-background/80 border border-border/50 shadow-2xs">
              <button
                onClick={() => setPreviewScene("hero")}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                  previewScene === "hero"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="w-2.5 h-2.5" />
                <span>Hero Drop</span>
              </button>
              <button
                onClick={() => setPreviewScene("product")}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                  previewScene === "product"
                    ? "bg-primary text-primary-foreground shadow-2xs"
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
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Quote className="w-2.5 h-2.5" />
                <span>Lookbook Story</span>
              </button>
            </div>

            {/* Theme Toggle (Split, Dark, Light) */}
            <div className="hidden sm:flex items-center p-0.5 rounded-lg bg-background/80 border border-border/50 shadow-2xs">
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
                <div className="relative rounded-xl border border-white/10 bg-[#161616] p-4 sm:p-5 text-white overflow-hidden flex flex-col justify-between min-h-[170px] shadow-md">
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
                        className="px-3 py-1 rounded-md text-[10px] font-bold bg-primary text-white flex items-center gap-1 shadow-xs"
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
                <div className="relative rounded-xl border border-border/80 bg-[#FAF8F5] p-4 sm:p-5 text-zinc-900 overflow-hidden flex flex-col justify-between min-h-[170px] shadow-sm">
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
                        className="px-3 py-1 rounded-md text-[10px] font-bold bg-zinc-900 text-white flex items-center gap-1 shadow-xs"
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
              <div className="rounded-xl border border-white/10 bg-[#161616] p-3 text-white flex gap-3 shadow-md items-center">
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
              <div className="rounded-xl border border-border/80 bg-[#FAF8F5] p-3 text-zinc-900 flex gap-3 shadow-sm items-center">
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
            <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 space-y-3 shadow-sm">
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

      {/* ── STRUCTURAL & CALIBRATION OPTIONS (COMPACT) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Layout Variants */}
        <div className="lg:col-span-7 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <LayoutGrid className="w-3 h-3 text-primary" /> Storefront Layout Variant
            </div>
            <span className="text-[9.5px] font-mono text-muted-foreground">
              {STOREFRONT_LAYOUT_VARIANTS.length} Presets
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {STOREFRONT_LAYOUT_VARIANTS.map((l) => {
              const active = l.id === cfg.layout_variant;
              return (
                <motion.button
                  key={l.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCfg((c) => ({ ...c, layout_variant: l.id }))}
                  className={`relative text-left rounded-lg border p-2 transition-all cursor-pointer flex flex-col justify-between ${
                    active
                      ? "border-primary bg-primary/10 shadow-2xs ring-1 ring-primary/30"
                      : "border-border/50 hover:border-primary/40 bg-card/60 hover:bg-card"
                  }`}
                >
                  <LayoutPreview id={l.id} />
                  <div className="mt-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-foreground truncate">{l.label}</span>
                      {active && <Check className="w-2.5 h-2.5 text-primary shrink-0" />}
                    </div>
                    <p className="text-[8.5px] text-muted-foreground mt-0.5 line-clamp-1 leading-tight">
                      {l.description}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Surface Controls */}
        <div className="lg:col-span-5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Sliders className="w-3 h-3 text-primary" /> Surface Calibration
          </div>

          <Card className="border-border/50 bg-card/60 p-3 rounded-xl space-y-2.5">
            {/* Accent Color */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10.5px] font-semibold">
                <span className="flex items-center gap-1">
                  <Palette className="w-2.5 h-2.5 text-primary" /> Accent Palette
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {STOREFRONT_ACCENT_PRESETS.map((a) => {
                  const active = (cfg.accent_hsl ?? "") === a.hsl;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setCfg((c) => ({ ...c, accent_hsl: a.hsl || null }))}
                      className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-medium transition-all cursor-pointer ${
                        active
                          ? "border-primary bg-primary/10 ring-1 ring-primary/30 text-foreground font-bold"
                          : "border-border/50 text-muted-foreground bg-secondary/20 hover:border-border"
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full border border-white/20 shrink-0"
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
            <div className="space-y-1 pt-1.5 border-t border-border/40">
              <div className="flex items-center justify-between text-[10.5px] font-semibold">
                <span className="flex items-center gap-1">
                  <Square className="w-2.5 h-2.5 text-primary" /> Corner Radius
                </span>
                <span className="text-[9px] font-mono uppercase text-primary font-bold">{cfg.rounded ?? "2xl"}</span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {(["sm", "md", "lg", "xl", "2xl"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setCfg((c) => ({ ...c, rounded: r }))}
                    className={`py-0.5 rounded border text-[9px] font-mono uppercase transition-all cursor-pointer ${
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
            <div className="space-y-1 pt-1.5 border-t border-border/40">
              <div className="flex items-center justify-between text-[10.5px] font-semibold">
                <span className="flex items-center gap-1">
                  <Maximize2 className="w-2.5 h-2.5 text-primary" /> Density
                </span>
                <span className="text-[9px] font-mono capitalize text-primary font-bold">
                  {cfg.density ?? "comfortable"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(["compact", "comfortable", "spacious"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setCfg((c) => ({ ...c, density: d }))}
                    className={`py-0.5 rounded border text-[9px] capitalize transition-all cursor-pointer ${
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
            <div className="space-y-1 pt-1.5 border-t border-border/40">
              <div className="flex items-center justify-between text-[10.5px] font-semibold">
                <span className="flex items-center gap-1">
                  <Smartphone className="w-2.5 h-2.5 text-primary" /> Mobile Nav
                </span>
                <span className="text-[9px] font-mono capitalize text-primary font-bold">
                  {cfg.mobile_nav ?? "tabs"}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {(["tabs", "segmented", "pill", "sheet"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setCfg((c) => ({ ...c, mobile_nav: m }))}
                    className={`py-0.5 rounded border text-[9px] capitalize transition-all cursor-pointer ${
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
  const common = "w-full h-11 rounded-md bg-secondary/40 border border-border/40 p-1 flex gap-1";
  const block = "rounded-xs bg-foreground/20";
  switch (id) {
    case "magazine":
      return (
        <div className={common + " flex-col"}>
          <div className={block + " h-1.5 w-3/5 mx-auto"} />
          <div className={block + " flex-1"} />
        </div>
      );
    case "bento":
      return (
        <div className={common}>
          <div className={block + " flex-1"} />
          <div className="flex flex-col gap-0.5 flex-1">
            <div className={block + " flex-1"} />
            <div className={block + " h-1.5"} />
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
          <div className={block + " h-1.5 w-4/5"} />
          <div className={block + " h-1 w-2/3"} />
          <div className={block + " flex-1"} />
        </div>
      );
    case "compact-grid":
      return (
        <div className={common + " grid grid-cols-4 gap-0.5"}>
          <div className={block} />
          <div className={block} />
          <div className={block} />
          <div className={block} />
        </div>
      );
    case "boutique":
      return (
        <div className={common + " flex-col items-center"}>
          <div className={block + " w-1/2 h-1"} />
          <div className={block + " w-2/3 flex-1"} />
        </div>
      );
    case "showcase":
      return (
        <div className={common + " flex-col"}>
          <div className={block + " flex-1"} />
          <div className="flex gap-0.5 h-2">
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
          <div className={block + " h-2"} />
          <div className="flex gap-0.5 flex-1">
            <div className={block + " flex-1"} />
            <div className={block + " flex-1"} />
            <div className={block + " flex-1"} />
          </div>
        </div>
      );
  }
};

export default AdminStorefrontAppearance;
