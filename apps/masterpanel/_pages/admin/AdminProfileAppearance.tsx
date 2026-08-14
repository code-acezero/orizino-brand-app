"use client";
import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Type,
  LayoutGrid,
  Check,
  Palette,
  Maximize2,
  Square,
  User,
  Sliders,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import {
  PROFILE_TYPOGRAPHY_PAIRS,
  PROFILE_LAYOUT_VARIANTS,
  ACCENT_PRESETS,
  defaultProfileAppearance,
  getTypographyPair,
  type ProfileAppearanceConfig,
  type TypographyCategory,
} from "@/lib/profile-appearance";
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

const AdminProfileAppearance: React.FC = () => {
  useSeoMeta("Profile Appearance", "Switch Profile & Settings typography and layout");
  const qc = useQueryClient();
  const [cfg, setCfg] = useState<ProfileAppearanceConfig>(defaultProfileAppearance);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TypographyCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    PROFILE_TYPOGRAPHY_PAIRS.forEach((p) => {
      if (p.gfUrl) ensureFont(p.gfUrl);
    });
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "profile_appearance")
        .maybeSingle();
      const v = (data?.value as unknown as Partial<ProfileAppearanceConfig>) || null;
      if (v) setCfg({ ...defaultProfileAppearance, ...v });
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "profile_appearance", value: cfg as any }, { onConflict: "key" });
    setSaving(false);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["site-settings"] });
    toast({ title: "Saved", description: "Profile & Settings appearance updated." });
  };

  useRegisterUniversalSave(
    {
      label: "Save Profile Appearance",
      onSave: save,
      isSaving: saving,
      onReject: () => {
        setCfg(defaultProfileAppearance);
        toast.warning("Profile appearance reset to default");
      },
      canReject: true,
    },
    [cfg, saving]
  );

  const activePair = getTypographyPair(cfg.typography_pair);
  const activeHeadingName = extractFontName(activePair.heading);

  const filteredPairs = useMemo(() => {
    return PROFILE_TYPOGRAPHY_PAIRS.filter((p) => {
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
            <User className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground">Profile &amp; Settings Portal</h2>
              <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/10">
                Active: {activeHeadingName}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Typography and layout for customer accounts, orders, and preference panels.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-60 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter typography..."
            className="pl-8 h-8 text-xs rounded-xl bg-secondary/20 border-border/50"
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

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredPairs.map((p) => {
          const active = p.id === cfg.typography_pair;
          const isCustom = p.category === "custom";
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
                  <span className="text-[9px] font-mono uppercase text-muted-foreground">{p.category}</span>
                </div>

                <div
                  className={`w-4.5 h-4.5 rounded-full flex items-center justify-center transition-all ${
                    active ? "bg-primary text-primary-foreground shadow-xs" : "border border-border/60 bg-secondary/30 opacity-40"
                  }`}
                >
                  {active ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : null}
                </div>
              </div>

              <div className="my-1.5 space-y-1.5">
                <div className="flex items-baseline justify-between border-b border-border/30 pb-1.5">
                  <span className="text-3xl sm:text-4xl font-normal leading-none select-none text-foreground/90" style={{ fontFamily: p.heading }}>
                    Aa
                  </span>
                  <span className="text-[9.5px] font-mono text-muted-foreground/70 uppercase">
                    {isCustom ? "Custom Brand Font" : "Google Font"}
                  </span>
                </div>
                <h3 className="text-base font-bold tracking-tight text-foreground line-clamp-1" style={{ fontFamily: p.heading }}>
                  Customer Account Portal
                </h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2" style={{ fontFamily: p.body }}>
                  Order tracking, verified measurements, and loyalty tier benefits.
                </p>
              </div>

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

      {/* Structural Options */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <LayoutGrid className="w-3.5 h-3.5 text-primary" /> Profile Layout Structure
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {PROFILE_LAYOUT_VARIANTS.map((l) => {
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
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] font-bold text-foreground">{l.label}</span>
                      {active && <Check className="w-3 h-3 text-primary" />}
                    </div>
                    <p className="text-[9.5px] text-muted-foreground leading-tight line-clamp-1">{l.description}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Sliders className="w-3.5 h-3.5 text-primary" /> Profile Density &amp; Corners
          </div>
          <Card className="border-border/50 bg-card/60 p-4 rounded-2xl space-y-3.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className="flex items-center gap-1">
                  <Palette className="w-3 h-3 text-primary" /> Accent Color
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {ACCENT_PRESETS.map((a) => {
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
                          background: a.hsl ? `hsl(${a.hsl})` : "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                        }}
                      />
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>

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

            <div className="space-y-1.5 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className="flex items-center gap-1">
                  <Maximize2 className="w-3 h-3 text-primary" /> Density
                </span>
                <span className="text-[9.5px] font-mono capitalize text-primary font-bold">{cfg.density ?? "comfortable"}</span>
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
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminProfileAppearance;
