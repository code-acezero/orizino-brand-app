"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  MoveHorizontal,
  Plus,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Play,
  Pause,
  Layers,
  Palette,
  Sliders,
  Type,
  Check,
  Eye,
  RotateCcw,
  Zap,
  Tag,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";
import { useRegisterUniversalSave, useUndoRedoState } from "@/contexts/UniversalSaveContext";
import { useQueryClient, useQuery } from "@tanstack/react-query";

export interface MarqueeConfig {
  words: string[];
  speed_seconds: number;
  direction: "left" | "right";
  pause_on_hover: boolean;
  separator_type: "logo" | "star" | "bullet" | "slash" | "custom";
  custom_separator: string;
  // Primary strip (under hero slider)
  bg_mode: "accent" | "cherry" | "dark" | "vanilla" | "custom";
  custom_bg: string;
  custom_text: string;
  // Secondary strip (mid-page section divider)
  strip2_bg_mode?: "dark" | "accent" | "cherry" | "vanilla" | "custom";
  strip2_custom_bg?: string;
  strip2_custom_text?: string;
  font_tracking: "normal" | "wide" | "luxury" | "ultra";
  font_size: "micro" | "small" | "medium" | "large";
  edge_fade: boolean;
}

export const defaultMarqueeConfig: MarqueeConfig = {
  words: [
    "ORIZINO ATELIER",
    "ARCHITECTURAL STREETWEAR",
    "HEAVYWEIGHT TEXTILES",
    "BESPOKE CRAFTSMANSHIP",
    "LIMITED EDITION DROPS",
    "TIMELESS SILHOUETTES",
  ],
  speed_seconds: 25,
  direction: "left",
  pause_on_hover: true,
  separator_type: "logo",
  custom_separator: "✦",
  bg_mode: "accent",
  custom_bg: "#9a0002",
  custom_text: "#efe6dd",
  strip2_bg_mode: "dark",
  strip2_custom_bg: "#1c1c1a",
  strip2_custom_text: "#fafafa",
  font_tracking: "luxury",
  font_size: "small",
  edge_fade: true,
};

const PRESET_WORD_SETS = [
  {
    name: "Atelier Signature",
    words: [
      "ORIZINO ATELIER",
      "ARCHITECTURAL STREETWEAR",
      "HEAVYWEIGHT TEXTILES",
      "BESPOKE CRAFTSMANSHIP",
      "LIMITED EDITION DROPS",
    ],
  },
  {
    name: "Drop 01 / 2026 Collection",
    words: [
      "LIMITED DROP 01 / 2026",
      "380 GSM HEAVYWEIGHT TERRY",
      "DROP SHOULDER SILHOUETTE",
      "REACTIVE GARMENT DYE",
      "HANDCRAFTED IN DHAKA",
    ],
  },
  {
    name: "E-Commerce & Service Highlights",
    words: [
      "COMPLIMENTARY SHIPPING OVER ৳2000",
      "EXCHANGE & RETURN GUARANTEE",
      "AUTHENTICITY VERIFIED",
      "PREMIUM BESPOKE PACKAGING",
      "SECURE ENCRYPTED CHECKOUT",
    ],
  },
  {
    name: "Editorial Heritage",
    words: [
      "ORIZINO — ARCHITECTURAL LUXURY",
      "STRUCTURAL PRECISION",
      "PARISIAN & DHAKA HERITAGE",
      "TIMELESS ESSENTIALS",
      "LIMITED NUMBERS ONLY",
    ],
  },
];

export function MarqueeStripConfigPanel() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [previewPaused, setPreviewPaused] = useState(false);
  const [activeStripTab, setActiveStripTab] = useState<"strip1" | "strip2">("strip1");

  // Universal Undo / Redo state manager
  const [
    cfg,
    setCfg,
    { undo, redo, canUndo, canRedo, reject, canReject, setInitial },
  ] = useUndoRedoState<MarqueeConfig>(defaultMarqueeConfig);

  // Fetch current branding and marquee config
  const { data: settingsData } = useQuery({
    queryKey: ["admin-marquee-config-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["marquee_config", "site_icon_url", "logo_url"]);

      if (error) throw error;

      const map: Record<string, any> = {};
      data?.forEach((row) => {
        const val = row.value as any;
        map[row.key] = typeof val === "object" && val !== null ? val.value ?? val : val;
      });
      return map;
    },
  });

  useEffect(() => {
    if (settingsData?.marquee_config) {
      let mc = settingsData.marquee_config;
      if (typeof mc === "string") {
        try {
          mc = JSON.parse(mc);
        } catch {}
      }
      if (mc && typeof mc === "object") {
        setInitial({
          ...defaultMarqueeConfig,
          ...mc,
          bg_mode: mc.bg_mode || "accent",
          strip2_bg_mode: mc.strip2_bg_mode || "dark",
          direction: mc.direction === "right" ? "right" : "left",
          speed_seconds: Number(mc.speed_seconds) || defaultMarqueeConfig.speed_seconds,
          words: Array.isArray(mc.words) && mc.words.length > 0 ? mc.words : defaultMarqueeConfig.words,
        });
      }
    }
  }, [settingsData, setInitial]);

  const logoUrl = settingsData?.logo_url || settingsData?.site_icon_url || "/orizino-logo.svg";

  // Add word
  const addWord = () => {
    const trimmed = newWord.trim();
    if (!trimmed) return;
    setCfg((prev) => ({
      ...prev,
      words: [...(prev?.words || []), trimmed],
    }));
    setNewWord("");
  };

  // Remove word
  const removeWord = (index: number) => {
    setCfg((prev) => ({
      ...prev,
      words: (prev?.words || []).filter((_, i) => i !== index),
    }));
  };

  // Move word
  const moveWord = (index: number, direction: "up" | "down") => {
    const currentWords = cfg?.words || [];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentWords.length) return;
    const newWords = [...currentWords];
    const temp = newWords[index];
    newWords[index] = newWords[targetIndex];
    newWords[targetIndex] = temp;
    setCfg((prev) => ({ ...prev, words: newWords }));
  };

  // Edit in place
  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditingValue((cfg?.words || [])[index] || "");
  };

  const saveEditing = (index: number) => {
    const trimmed = editingValue.trim();
    if (trimmed) {
      const newWords = [...(cfg?.words || [])];
      newWords[index] = trimmed;
      setCfg((prev) => ({ ...prev, words: newWords }));
    }
    setEditingIndex(null);
  };

  // Apply preset
  const applyPreset = (presetWords: string[]) => {
    setCfg((prev) => ({
      ...prev,
      words: [...presetWords],
    }));
    toast.success("Marquee preset applied");
  };

  // Save handler
  const save = async () => {
    setSaving(true);
    try {
      const payload: MarqueeConfig = {
        ...defaultMarqueeConfig,
        ...cfg,
        direction: cfg?.direction === "right" ? "right" : "left",
        speed_seconds: Number(cfg?.speed_seconds) || defaultMarqueeConfig.speed_seconds,
        words: Array.isArray(cfg?.words) && cfg.words.length > 0 ? cfg.words : defaultMarqueeConfig.words,
      };

      const { error } = await supabase.from("site_settings").upsert(
        {
          key: "marquee_config",
          value: payload as any,
        },
        { onConflict: "key" }
      );

      if (error) throw error;

      qc.invalidateQueries({ queryKey: ["admin-marquee-config-settings"] });
      qc.invalidateQueries({ queryKey: ["site-settings"] });

      toast({
        title: "Marquee Settings Saved",
        description: "Live storefront tickers updated immediately across all pages.",
        type: "success",
      });
    } catch (e: any) {
      toast({
        title: "Could not save marquee settings",
        description: e.message,
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  useRegisterUniversalSave(
    {
      label: "Save Marquee Settings",
      onSave: save,
      isSaving: saving,
      onUndo: undo,
      canUndo: canUndo,
      onRedo: redo,
      canRedo: canRedo,
      onReject: () => {
        reject();
        toast.info("Marquee changes reverted");
      },
      canReject: canReject || Boolean(settingsData?.marquee_config),
    },
    [cfg, saving, canUndo, canRedo, canReject]
  );

  // Resolved background & text for live preview (Strip 1)
  const previewBg1 = useMemo(() => {
    if (cfg.bg_mode === "cherry" || cfg.bg_mode === "accent") return "#9a0002";
    if (cfg.bg_mode === "dark") return "#1c1c1a";
    if (cfg.bg_mode === "vanilla") return "#efe6dd";
    return cfg.custom_bg || "#9a0002";
  }, [cfg.bg_mode, cfg.custom_bg]);

  const previewText1 = useMemo(() => {
    if (cfg.bg_mode === "cherry" || cfg.bg_mode === "accent") return "#efe6dd";
    if (cfg.bg_mode === "dark") return "#fafafa";
    if (cfg.bg_mode === "vanilla") return "#9a0002";
    return cfg.custom_text || "#efe6dd";
  }, [cfg.bg_mode, cfg.custom_text]);

  // Resolved background & text for live preview (Strip 2)
  const previewBg2 = useMemo(() => {
    const mode = cfg.strip2_bg_mode || "dark";
    if (mode === "dark") return "#1c1c1a";
    if (mode === "cherry" || mode === "accent") return "#9a0002";
    if (mode === "vanilla") return "#efe6dd";
    return cfg.strip2_custom_bg || "#1c1c1a";
  }, [cfg.strip2_bg_mode, cfg.strip2_custom_bg]);

  const previewText2 = useMemo(() => {
    const mode = cfg.strip2_bg_mode || "dark";
    if (mode === "dark") return "#fafafa";
    if (mode === "cherry" || mode === "accent") return "#efe6dd";
    if (mode === "vanilla") return "#1c1c1a";
    return cfg.strip2_custom_text || "#fafafa";
  }, [cfg.strip2_bg_mode, cfg.strip2_custom_text]);

  const trackingClass = useMemo(() => {
    if (cfg.font_tracking === "normal") return "tracking-normal";
    if (cfg.font_tracking === "wide") return "tracking-wider";
    if (cfg.font_tracking === "ultra") return "tracking-[0.3em]";
    return "tracking-[0.22em]";
  }, [cfg.font_tracking]);

  const sizeClass = useMemo(() => {
    if (cfg.font_size === "micro") return "text-[0.6rem]";
    if (cfg.font_size === "medium") return "text-[0.75rem]";
    if (cfg.font_size === "large") return "text-[0.85rem]";
    return "text-[0.68rem]";
  }, [cfg.font_size]);

  // Render preview item
  const renderPreviewItem = (item: string, i: number, activeTextColor: string) => {
    if (item === "__LOGO__") {
      if (cfg.separator_type === "logo") {
        return (
          <span key={i} className="inline-flex items-center px-4 shrink-0 notranslate" translate="no">
            <span
              className="h-3.5 w-3.5 inline-block shrink-0 opacity-90"
              style={{
                backgroundColor: activeTextColor,
                maskImage: `url("${logoUrl}")`,
                WebkitMaskImage: `url("${logoUrl}")`,
                maskSize: "contain",
                WebkitMaskSize: "contain",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskPosition: "center",
                WebkitMaskPosition: "center",
              }}
              role="img"
              aria-label="Logo"
            />
          </span>
        );
      }
      const sepChar =
        cfg.separator_type === "star"
          ? "✦"
          : cfg.separator_type === "bullet"
          ? "•"
          : cfg.separator_type === "slash"
          ? "/"
          : cfg.custom_separator || "✦";

      return (
        <span key={i} className="inline-block px-4 opacity-80 text-xs notranslate" style={{ color: activeTextColor }}>
          {sepChar}
        </span>
      );
    }

    return (
      <span
        key={i}
        className={`inline-block px-5 font-sans-brand font-bold uppercase whitespace-nowrap notranslate ${trackingClass} ${sizeClass}`}
        style={{ color: activeTextColor }}
      >
        {item}
      </span>
    );
  };

  const previewList = ((cfg?.words?.length || 0) > 0 ? cfg.words : defaultMarqueeConfig.words).flatMap((w) => [w, "__LOGO__"]);

  return (
    <div className="space-y-6">
      {/* ── HEADER TITLE ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <MoveHorizontal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-foreground">Marquee Ticker Studio</h2>
              <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/10">
                {cfg?.words?.length || 0} Phrases Active
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure phrases, animation speed, separator icons, and individual color themes for Strip 1 (Hero) and Strip 2 (Divider).
            </p>
          </div>
        </div>
      </div>

      {/* ── LIVE INTERACTIVE REAL-TIME PREVIEW ── */}
      <Card className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-md overflow-hidden">
        <CardHeader className="p-4 border-b border-border/40 bg-secondary/20 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
              Live Real-Time Storefront Preview
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">
              {cfg?.speed_seconds ?? 25}s Loop · {(cfg?.direction || "left").toUpperCase()}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 bg-background/50 space-y-4">
          {/* ── STRIP 1 PREVIEW ── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-foreground/90 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full border border-white/20 shadow-xs" style={{ backgroundColor: previewBg1 }} />
                Strip 1: Hero Banner (Under Slider)
              </span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase px-2 py-0.5 rounded-md bg-secondary/50 border border-border/40">
                Mode: {cfg?.bg_mode === "accent" || cfg?.bg_mode === "cherry" ? "Theme Accent (Cherry Cola)" : cfg?.bg_mode}
              </span>
            </div>
            <div
              className="relative overflow-hidden py-3.5 select-none rounded-xl shadow-inner border border-border/20"
              style={{
                backgroundColor: previewBg1,
                color: previewText1,
              }}
              onMouseEnter={() => cfg?.pause_on_hover && setPreviewPaused(true)}
              onMouseLeave={() => setPreviewPaused(false)}
            >
              {cfg?.edge_fade && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-16 sm:w-20 z-10 pointer-events-none"
                  style={{ background: `linear-gradient(to right, ${previewBg1}, transparent)` }}
                />
              )}
              {cfg?.edge_fade && (
                <div
                  className="absolute right-0 top-0 bottom-0 w-16 sm:w-20 z-10 pointer-events-none"
                  style={{ background: `linear-gradient(to left, ${previewBg1}, transparent)` }}
                />
              )}

              <div
                className="marquee-track flex items-center whitespace-nowrap"
                style={{
                  display: "flex",
                  width: "max-content",
                  flexWrap: "nowrap",
                  whiteSpace: "nowrap",
                  animationDuration: `${cfg?.speed_seconds ?? 25}s`,
                  animationDirection: cfg?.direction === "right" ? "reverse" : "normal",
                  animationPlayState: previewPaused ? "paused" : "running",
                }}
              >
                {previewList.map((item, i) => renderPreviewItem(item, i, previewText1))}
                {previewList.map((item, i) => renderPreviewItem(item, previewList.length + i, previewText1))}
              </div>
            </div>
          </div>

          {/* ── STRIP 2 PREVIEW ── */}
          <div className="space-y-1.5 pt-3 border-t border-border/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-foreground/90 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full border border-white/20 shadow-xs" style={{ backgroundColor: previewBg2 }} />
                Strip 2: Section Divider (Mid-Page)
              </span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase px-2 py-0.5 rounded-md bg-secondary/50 border border-border/40">
                Mode: {cfg?.strip2_bg_mode === "accent" || cfg?.strip2_bg_mode === "cherry" ? "Theme Accent" : cfg?.strip2_bg_mode || "dark"}
              </span>
            </div>
            <div
              className="relative overflow-hidden py-3.5 select-none rounded-xl shadow-inner border border-border/20"
              style={{
                backgroundColor: previewBg2,
                color: previewText2,
              }}
              onMouseEnter={() => cfg?.pause_on_hover && setPreviewPaused(true)}
              onMouseLeave={() => setPreviewPaused(false)}
            >
              {cfg?.edge_fade && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-16 sm:w-20 z-10 pointer-events-none"
                  style={{ background: `linear-gradient(to right, ${previewBg2}, transparent)` }}
                />
              )}
              {cfg?.edge_fade && (
                <div
                  className="absolute right-0 top-0 bottom-0 w-16 sm:w-20 z-10 pointer-events-none"
                  style={{ background: `linear-gradient(to left, ${previewBg2}, transparent)` }}
                />
              )}

              <div
                className="marquee-track flex items-center whitespace-nowrap"
                style={{
                  display: "flex",
                  width: "max-content",
                  flexWrap: "nowrap",
                  whiteSpace: "nowrap",
                  animationDuration: `${cfg?.speed_seconds ?? 25}s`,
                  animationDirection: cfg?.direction === "right" ? "reverse" : "normal",
                  animationPlayState: previewPaused ? "paused" : "running",
                }}
              >
                {previewList.map((item, i) => renderPreviewItem(item, i, previewText2))}
                {previewList.map((item, i) => renderPreviewItem(item, previewList.length + i, previewText2))}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground text-center italic pt-1">
            Both strips share the same live phrases, speed, and separator icon while maintaining separate, tailored color themes.
          </p>
        </CardContent>
      </Card>

      {/* ── MAIN CONFIGURATION GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: PHRASES & CONTENT MANAGEMENT (7 COLS) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Quick Presets */}
          <Card className="rounded-2xl border border-border/60 bg-card">
            <CardHeader className="p-4 border-b border-border/40">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                Editorial Presets & Quick Curations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                {PRESET_WORD_SETS.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(preset.words)}
                    className="text-xs h-8 rounded-lg border-border/60 hover:border-primary/50 hover:bg-primary/10"
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Words List Manager */}
          <Card className="rounded-2xl border border-border/60 bg-card">
            <CardHeader className="p-4 border-b border-border/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Type className="w-4 h-4 text-primary" />
                  Phrase List
                </CardTitle>
                <CardDescription className="text-xs">
                  Reorder, edit, or add marquee ticker phrases in real time.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs font-mono">
                {cfg?.words?.length || 0} Total
              </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Add New Word Input */}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="e.g. BESPOKE CRAFTSMANSHIP"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addWord())}
                  className="text-xs h-9 uppercase font-mono"
                />
                <Button size="sm" onClick={addWord} className="h-9 px-3 gap-1 shrink-0">
                  <Plus className="w-3.5 h-3.5" />
                  Add Phrase
                </Button>
              </div>

              {/* Phrases List */}
              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                {(cfg?.words || []).map((word, idx) => {
                  const isEditing = editingIndex === idx;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border/40 bg-secondary/15 hover:bg-secondary/30 transition-all gap-2"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0 w-4 text-right">
                          {idx + 1}.
                        </span>
                        {isEditing ? (
                          <Input
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEditing(idx);
                              if (e.key === "Escape") setEditingIndex(null);
                            }}
                            onBlur={() => saveEditing(idx)}
                            autoFocus
                            className="h-7 text-xs font-mono uppercase flex-1"
                          />
                        ) : (
                          <span
                            onClick={() => startEditing(idx)}
                            className="text-xs font-mono font-medium text-foreground truncate cursor-pointer hover:underline"
                            title="Click to edit phrase"
                          >
                            {word}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          disabled={idx === 0}
                          onClick={() => moveWord(idx, "up")}
                          title="Move Up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          disabled={idx === (cfg?.words?.length || 0) - 1}
                          onClick={() => moveWord(idx, "down")}
                          title="Move Down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeWord(idx)}
                          title="Delete Phrase"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: ANIMATION, SEPARATORS & COLOR THEMES (5 COLS) */}
        <div className="lg:col-span-5 space-y-4">
          {/* COLOR & THEME MODE */}
          <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            <CardHeader className="p-4 border-b border-border/40 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" />
                  Color & Style Themes
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Select colors for both primary (hero) and secondary (mid-page) strips.
              </CardDescription>

              {/* Strip 1 vs Strip 2 Selector Pill Bar */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-secondary/30 rounded-xl border border-border/40 mt-2">
                <button
                  type="button"
                  onClick={() => setActiveStripTab("strip1")}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeStripTab === "strip1"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: previewBg1 }} />
                  Strip 1 (Hero)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStripTab("strip2")}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeStripTab === "strip2"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: previewBg2 }} />
                  Strip 2 (Divider)
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {activeStripTab === "strip1" ? (
                /* ── STRIP 1 COLOR OPTIONS ── */
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Strip 1 (Under Hero Slider)</span>
                    <span className="text-[10px] font-mono uppercase">Hero Accent Strip</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        id: "accent",
                        label: "Theme Accent",
                        desc: "Cherry Cola in active theme",
                        color: "#9a0002",
                        textColor: "#efe6dd",
                      },
                      {
                        id: "dark",
                        label: "Dark Atelier",
                        desc: "Midnight Charcoal luxury",
                        color: "#1c1c1a",
                        textColor: "#fafafa",
                      },
                      {
                        id: "vanilla",
                        label: "Cream Vanilla",
                        desc: "Light ivory cream background",
                        color: "#efe6dd",
                        textColor: "#9a0002",
                      },
                      {
                        id: "custom",
                        label: "Custom Colors",
                        desc: "Custom hex picker",
                        color: cfg.custom_bg || "#9a0002",
                        textColor: cfg.custom_text || "#efe6dd",
                      },
                    ].map((m) => {
                      const isSelected = (cfg.bg_mode === m.id) || (m.id === "accent" && cfg.bg_mode === "cherry");
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setCfg((p) => ({ ...p, bg_mode: m.id as any }))}
                          className={`p-2.5 rounded-xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                              : "border-border/50 bg-secondary/20 hover:bg-secondary/40"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className="w-4 h-4 rounded-full border border-white/20 shadow-xs"
                              style={{ backgroundColor: m.color }}
                            />
                            {isSelected && <Check className="w-3 h-3 text-primary" />}
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-foreground block">{m.label}</span>
                            <span className="text-[10px] text-muted-foreground block truncate">{m.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Strip 1 Custom Hex Pickers */}
                  {cfg.bg_mode === "custom" && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-muted-foreground">Background Color</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={cfg.custom_bg}
                            onChange={(e) => setCfg((p) => ({ ...p, custom_bg: e.target.value }))}
                            className="w-8 h-8 rounded-lg border border-border cursor-pointer"
                          />
                          <Input
                            value={cfg.custom_bg}
                            onChange={(e) => setCfg((p) => ({ ...p, custom_bg: e.target.value }))}
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-muted-foreground">Text Color</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={cfg.custom_text}
                            onChange={(e) => setCfg((p) => ({ ...p, custom_text: e.target.value }))}
                            className="w-8 h-8 rounded-lg border border-border cursor-pointer"
                          />
                          <Input
                            value={cfg.custom_text}
                            onChange={(e) => setCfg((p) => ({ ...p, custom_text: e.target.value }))}
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ── STRIP 2 COLOR OPTIONS ── */
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Strip 2 (Mid-Page Section Divider)</span>
                    <span className="text-[10px] font-mono uppercase">Section Divider Strip</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        id: "dark",
                        label: "Dark Atelier",
                        desc: "Midnight Charcoal contrast (Default)",
                        color: "#1c1c1a",
                        textColor: "#fafafa",
                      },
                      {
                        id: "accent",
                        label: "Theme Accent",
                        desc: "Cherry Cola in active theme",
                        color: "#9a0002",
                        textColor: "#efe6dd",
                      },
                      {
                        id: "vanilla",
                        label: "Cream Vanilla",
                        desc: "Light ivory cream divider",
                        color: "#efe6dd",
                        textColor: "#1c1c1a",
                      },
                      {
                        id: "custom",
                        label: "Custom Colors",
                        desc: "Custom hex picker",
                        color: cfg.strip2_custom_bg || "#1c1c1a",
                        textColor: cfg.strip2_custom_text || "#fafafa",
                      },
                    ].map((m) => {
                      const isSelected = ((cfg.strip2_bg_mode || "dark") === m.id) || (m.id === "accent" && cfg.strip2_bg_mode === "cherry");
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setCfg((p) => ({ ...p, strip2_bg_mode: m.id as any }))}
                          className={`p-2.5 rounded-xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                              : "border-border/50 bg-secondary/20 hover:bg-secondary/40"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className="w-4 h-4 rounded-full border border-white/20 shadow-xs"
                              style={{ backgroundColor: m.color }}
                            />
                            {isSelected && <Check className="w-3 h-3 text-primary" />}
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-foreground block">{m.label}</span>
                            <span className="text-[10px] text-muted-foreground block truncate">{m.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Strip 2 Custom Hex Pickers */}
                  {cfg.strip2_bg_mode === "custom" && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-muted-foreground">Strip 2 Background</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={cfg.strip2_custom_bg || "#1c1c1a"}
                            onChange={(e) => setCfg((p) => ({ ...p, strip2_custom_bg: e.target.value }))}
                            className="w-8 h-8 rounded-lg border border-border cursor-pointer"
                          />
                          <Input
                            value={cfg.strip2_custom_bg || "#1c1c1a"}
                            onChange={(e) => setCfg((p) => ({ ...p, strip2_custom_bg: e.target.value }))}
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-muted-foreground">Strip 2 Text Color</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={cfg.strip2_custom_text || "#fafafa"}
                            onChange={(e) => setCfg((p) => ({ ...p, strip2_custom_text: e.target.value }))}
                            className="w-8 h-8 rounded-lg border border-border cursor-pointer"
                          />
                          <Input
                            value={cfg.strip2_custom_text || "#fafafa"}
                            onChange={(e) => setCfg((p) => ({ ...p, strip2_custom_text: e.target.value }))}
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ANIMATION & BEHAVIOR */}
          <Card className="rounded-2xl border border-border/60 bg-card">
            <CardHeader className="p-4 border-b border-border/40">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                Animation & Behavior
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Loop Speed (Seconds)</Label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={cfg.speed_seconds}
                    onChange={(e) => setCfg((p) => ({ ...p, speed_seconds: Number(e.target.value) }))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-secondary"
                  />
                  <span className="text-xs font-mono font-bold w-12 text-right">{cfg.speed_seconds}s</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <Label className="text-xs">Pause on Hover</Label>
                <Switch 
                  checked={cfg.pause_on_hover} 
                  onCheckedChange={(v) => setCfg((p) => ({ ...p, pause_on_hover: v }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs">Edge Fade Masks</Label>
                <Switch 
                  checked={cfg.edge_fade} 
                  onCheckedChange={(v) => setCfg((p) => ({ ...p, edge_fade: v }))}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default MarqueeStripConfigPanel;
// code:4ce0
