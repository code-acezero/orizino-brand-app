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

      {/* ── FONT CARDS GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredPairs.map((p) => {
          const active = p.id === cfg.typography_pair;
          const isCustom = p.category === "custom";
          const headingSample = customSampleText || "Architectural Silhouettes";
          const bodySample =
            customBodyText || "380 GSM heavyweight french terry tailored with precision drop-shoulder fit.";

          return (
            <motion.div
              key={p.id}
              whileHover={{ y: -1.5 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setCfg((c) => ({ ...c, typography_pair: p.id }))}
              className={`relative text-left rounded-2xl border p-4 transition-all cursor-pointer flex flex-col justify-between ${
                active
                  ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/30"
                  : "border-border/50 hover:border-primary/40 bg-card/60 hover:bg-card shadow-xs"
              }`}
            >
              {/* Header Badge + Active Indicator */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                      isCustom
                        ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        : "bg-secondary/80 text-foreground border-border/40"
                    }`}
                  >
                    {p.tag}
                  </span>
                  <span className="text-[9px] font-mono uppercase text-muted-foreground">
                    {p.category}
                  </span>
                </div>

                <div
                  className={`w-4.5 h-4.5 rounded-full flex items-center justify-center transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "border border-border/60 bg-secondary/30 opacity-40"
                  }`}
                >
                  {active ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : null}
                </div>
              </div>

              {/* Glyph + Samples */}
              <div className="my-1.5 space-y-1.5">
                <div className="flex items-baseline justify-between border-b border-border/30 pb-1.5">
                  <span
                    className="text-3xl sm:text-4xl font-normal leading-none select-none text-foreground/90"
                    style={{ fontFamily: p.heading }}
                  >
                    Aa
                  </span>
                  <span className="text-[9.5px] font-mono text-muted-foreground/70 uppercase">
                    {isCustom ? "Custom Brand Font" : "Google Font"}
                  </span>
                </div>

                <h3
                  className="text-base font-bold tracking-tight text-foreground line-clamp-1"
                  style={{ fontFamily: p.heading }}
                >
                  {headingSample}
                </h3>

                <p
                  className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2"
                  style={{ fontFamily: p.body }}
                >
                  {bodySample}
                </p>
              </div>

              {/* Footer */}
              <div className="mt-2.5 pt-2 border-t border-border/30 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-foreground/80 truncate">{p.label}</span>
                <span className="text-[9px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  {isCustom ? "Bundled" : "Web Font"}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── INTERACTIVE TESTER ── */}
      <Card className="border-border/50 bg-card/60 shadow-xs rounded-2xl overflow-hidden">
        <CardHeader className="py-3.5 px-4 border-b border-border/40 bg-secondary/15">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-primary" />
              <CardTitle className="text-xs font-bold text-foreground">Live Typography Laboratory</CardTitle>
            </div>
            {(customSampleText || customBodyText) && (
              <button
                onClick={() => {
                  setCustomSampleText("");
                  setCustomBodyText("");
                }}
                className="text-[10px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-2.5 h-2.5" /> Reset
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Input
              value={customSampleText}
              onChange={(e) => setCustomSampleText(e.target.value)}
              placeholder="Headline: e.g. Winter Heavyweight Oversized Drops"
              className="text-xs rounded-xl h-8 bg-background border-border/50"
            />
            <Input
              value={customBodyText}
              onChange={(e) => setCustomBodyText(e.target.value)}
              placeholder="Body: e.g. Engineered with 380GSM double-needle french terry."
              className="text-xs rounded-xl h-8 bg-background border-border/50"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl border border-white/10 bg-black/90 p-4 text-white space-y-2">
              <span className="text-[9px] font-mono text-zinc-400">DARK STOREFRONT THEME</span>
              <h4 className="text-lg font-bold text-white line-clamp-1" style={{ fontFamily: activePair.heading }}>
                {customSampleText || "High-Structure 380GSM Oversized Terry"}
              </h4>
              <p className="text-[11px] text-zinc-300 line-clamp-2" style={{ fontFamily: activePair.body }}>
                {customBodyText || "Cut with dropped shoulders and a heavy ribbed collar for a boxy, contemporary silhouette."}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-[#faf8f5] dark:bg-zinc-900/90 p-4 text-zinc-900 dark:text-zinc-100 space-y-2">
              <span className="text-[9px] font-mono text-zinc-500">EDITORIAL MINIMAL THEME</span>
              <h4 className="text-lg font-bold line-clamp-1" style={{ fontFamily: activePair.heading }}>
                {customSampleText || "Minimalist French Terry Collection"}
              </h4>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-300 line-clamp-2" style={{ fontFamily: activePair.body }}>
                {customBodyText || "Precision crafted in Dhaka with double-needle stitching and raw luxury aesthetics."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── STRUCTURAL & CALIBRATION OPTIONS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Layout Variants */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <LayoutGrid className="w-3.5 h-3.5 text-primary" /> Storefront Layout Variant
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              {STOREFRONT_LAYOUT_VARIANTS.length} Presets
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {STOREFRONT_LAYOUT_VARIANTS.map((l) => {
              const active = l.id === cfg.layout_variant;
              return (
                <motion.button
                  key={l.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCfg((c) => ({ ...c, layout_variant: l.id }))}
                  className={`relative text-left rounded-xl border p-3 transition-all cursor-pointer flex flex-col justify-between ${
                    active
                      ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30"
                      : "border-border/50 hover:border-primary/40 bg-card/60 hover:bg-card"
                  }`}
                >
                  <LayoutPreview id={l.id} />
                  <div className="mt-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-foreground">{l.label}</span>
                      {active && <Check className="w-3 h-3 text-primary" />}
                    </div>
                    <p className="text-[9.5px] text-muted-foreground mt-0.5 line-clamp-1 leading-tight">
                      {l.description}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Surface Controls */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Sliders className="w-3.5 h-3.5 text-primary" /> Surface Calibration
          </div>

          <Card className="border-border/50 bg-card/60 p-4 rounded-2xl space-y-3.5">
            {/* Accent Color */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className="flex items-center gap-1">
                  <Palette className="w-3 h-3 text-primary" /> Accent Palette
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {STOREFRONT_ACCENT_PRESETS.map((a) => {
                  const active = (cfg.accent_hsl ?? "") === a.hsl;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setCfg((c) => ({ ...c, accent_hsl: a.hsl || null }))}
                      className={`flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-medium transition-all cursor-pointer ${
                        active
                          ? "border-primary bg-primary/10 ring-1 ring-primary/30 text-foreground font-bold"
                          : "border-border/50 text-muted-foreground bg-secondary/20 hover:border-border"
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
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
            <div className="space-y-1.5 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className="flex items-center gap-1">
                  <Square className="w-3 h-3 text-primary" /> Corner Radius
                </span>
                <span className="text-[9.5px] font-mono uppercase text-primary font-bold">{cfg.rounded ?? "2xl"}</span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {(["sm", "md", "lg", "xl", "2xl"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setCfg((c) => ({ ...c, rounded: r }))}
                    className={`py-1 rounded-md border text-[10px] font-mono uppercase transition-all cursor-pointer ${
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
            <div className="space-y-1.5 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className="flex items-center gap-1">
                  <Maximize2 className="w-3 h-3 text-primary" /> Density
                </span>
                <span className="text-[9.5px] font-mono capitalize text-primary font-bold">
                  {cfg.density ?? "comfortable"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(["compact", "comfortable", "spacious"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setCfg((c) => ({ ...c, density: d }))}
                    className={`py-1 rounded-md border text-[10px] capitalize transition-all cursor-pointer ${
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
            <div className="space-y-1.5 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className="flex items-center gap-1">
                  <Smartphone className="w-3 h-3 text-primary" /> Mobile Nav
                </span>
                <span className="text-[9.5px] font-mono capitalize text-primary font-bold">
                  {cfg.mobile_nav ?? "tabs"}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {(["tabs", "segmented", "pill", "sheet"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setCfg((c) => ({ ...c, mobile_nav: m }))}
                    className={`py-1 rounded-md border text-[10px] capitalize transition-all cursor-pointer ${
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
