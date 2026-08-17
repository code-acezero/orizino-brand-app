"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Compass,
  LayoutTemplate,
  LayoutGrid,
  Link2,
  Mail,
  Users,
  Inbox,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Loader2,
  Reply,
  Copy,
  ChevronDown,
  ChevronUp,
  Sliders,
  Check,
  Globe,
  Maximize2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useRegisterUniversalSave } from "@/contexts/UniversalSaveContext";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_CONFIG,
  mergeConfig,
  type OrizinoConfig,
  type ThemeItem,
  type LinkItem,
  type ContactItem,
  type ContactNote,
  type PersonItem,
  newLinkId,
  newContactItemId,
  newContactNoteId,
  newPersonId,
} from "@/lib/explore-config-types";
import { ICON_OPTIONS } from "@/lib/explore-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Inquiry = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "new" | "read" | "responded" | "archived";
  created_at: string;
};

/**
 * Reusable expandable text box that lets admins comfortably view and edit
 * long paragraphs, bios, and narratives in an expansive modal editor.
 */
function ExpandableTextBox({
  label,
  value,
  onChange,
  placeholder = "",
  rows = 2,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] text-muted-foreground">{label}</Label>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title="Open expanded text box"
          className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline hover:text-primary/80 transition-colors cursor-pointer"
        >
          <Maximize2 className="w-2.5 h-2.5" />
          <span>Expand View</span>
        </button>
      </div>

      <textarea
        rows={rows}
        value={value || ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-md bg-background border border-border/60 p-2 text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary ${className}`}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl bg-card border-border/80 p-5 space-y-4">
          <DialogHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-3">
            <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Maximize2 className="w-4 h-4 text-primary" />
              <span>Expanded Text Editor: {label}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <span>{value ? `${value.length} characters` : "0 characters"}</span>
              <span>{value ? `${value.trim().split(/\s+/).filter(Boolean).length} words` : "0 words"}</span>
            </div>

            <textarea
              rows={10}
              value={value || ""}
              placeholder={placeholder}
              onChange={(e) => onChange(e.target.value)}
              className="w-full rounded-xl bg-background border border-border/60 p-3.5 text-xs font-normal leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={() => setIsOpen(false)} className="h-8 px-4 text-xs font-semibold">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminExploreUI() {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<OrizinoConfig>(DEFAULT_CONFIG);
  const [isDirty, setIsDirty] = useState(false);
  const [inquiryFilter, setInquiryFilter] = useState<string>("all");
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);

  // Load Explore Config from site_settings (key: explore_config)
  const { data: dbConfig, isLoading: isConfigLoading } = useQuery({
    queryKey: ["admin_explore_config"],
    queryFn: async () => {
      const { data: settingData, error: settingErr } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "explore_config")
        .maybeSingle();

      if (!settingErr && settingData?.value) {
        return mergeConfig(settingData.value as any);
      }

      const { data: siteConfigData } = await (supabase as any)
        .from("site_config")
        .select("data")
        .eq("key", "main")
        .maybeSingle();

      if (siteConfigData?.data) {
        return mergeConfig(siteConfigData.data as any);
      }

      return DEFAULT_CONFIG;
    },
  });

  useEffect(() => {
    if (dbConfig) {
      setConfig(dbConfig);
      setIsDirty(false);
    }
  }, [dbConfig]);

  // Load live inquiries
  const { data: inquiries = [], isLoading: isInquiriesLoading } = useQuery<Inquiry[]>({
    queryKey: ["admin_inquiries"],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("inquiries")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.warn("Inquiries load note:", error.message);
          return [];
        }
        return (data as Inquiry[]) || [];
      } catch (err) {
        return [];
      }
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("site_settings").upsert(
        {
          key: "explore_config",
          value: config as any,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["admin_explore_config"] });
      toast.success("Explore Studio configuration saved");
    },
    onError: (err: any) => {
      toast.error("Failed to save configuration", { description: err.message });
    },
  });

  const updateInquiryStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Inquiry["status"] }) => {
      const { error } = await (supabase as any)
        .from("inquiries")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_inquiries"] });
      toast.success("Inquiry status updated");
    },
    onError: (err: any) => {
      toast.error("Failed to update inquiry", { description: err.message });
    },
  });

  const deleteInquiry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("inquiries")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_inquiries"] });
      toast.success("Inquiry deleted");
    },
    onError: (err: any) => {
      toast.error("Failed to delete inquiry", { description: err.message });
    },
  });

  // Universal Save Bar
  useRegisterUniversalSave(
    {
      id: "admin-explore-ui",
      label: "Save Explore UI Config",
      onSave: () => saveMutation.mutate(),
      isSaving: saveMutation.isPending,
      isDirty: isDirty,
    },
    [isDirty, saveMutation.isPending, config]
  );

  const updateCfg = (updater: (prev: OrizinoConfig) => OrizinoConfig) => {
    setConfig((prev) => {
      const next = updater(prev);
      setIsDirty(true);
      return next;
    });
  };

  const filteredInquiries = inquiries.filter((inq) => {
    if (inquiryFilter === "all") return true;
    return inq.status === inquiryFilter;
  });

  if (isConfigLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* ── HEADER ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Explore & Social Studio
            </h1>
            <p className="text-xs text-muted-foreground">
              Discovery feed, collection universes, connect channels, team & inquiries.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="h-8 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground"
          >
            {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>{saveMutation.isPending ? "Saving..." : "Save Config"}</span>
          </Button>

          <a
            href={process.env.NEXT_PUBLIC_EXPLORE_URL || "http://localhost:3004"}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-secondary text-foreground hover:bg-secondary/80 border border-border/60 transition-colors"
          >
            <span>Live Explore App</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* ── 1. HERO & VISUALS ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-5">
        <div className="flex items-center gap-2 text-foreground font-bold text-sm border-b border-border/40 pb-3">
          <LayoutTemplate className="w-4 h-4 text-primary" />
          <span>1. Hero & Motion Physics</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Eyebrow Tag</Label>
            <Input
              value={config.hero?.eyebrow || ""}
              onChange={(e) => updateCfg((c) => ({ ...c, hero: { ...c.hero, eyebrow: e.target.value } }))}
              className="h-8 text-xs bg-background/80"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Primary CTA Button</Label>
            <Input
              value={config.hero?.primaryCta || ""}
              onChange={(e) => updateCfg((c) => ({ ...c, hero: { ...c.hero, primaryCta: e.target.value } }))}
              className="h-8 text-xs bg-background/80"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Ghost CTA Button</Label>
            <Input
              value={config.hero?.ghostCta || ""}
              onChange={(e) => updateCfg((c) => ({ ...c, hero: { ...c.hero, ghostCta: e.target.value } }))}
              className="h-8 text-xs bg-background/80"
            />
          </div>
        </div>

        {/* 3 Headlines */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Headline Line 1</Label>
            <Input
              value={config.hero?.line1 || ""}
              onChange={(e) => updateCfg((c) => ({ ...c, hero: { ...c.hero, line1: e.target.value } }))}
              className="h-8 text-xs bg-background/80"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Headline Line 2</Label>
            <Input
              value={config.hero?.line2 || ""}
              onChange={(e) => updateCfg((c) => ({ ...c, hero: { ...c.hero, line2: e.target.value } }))}
              className="h-8 text-xs bg-background/80"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Headline Line 3 (Crimson)</Label>
            <Input
              value={config.hero?.line3 || ""}
              onChange={(e) => updateCfg((c) => ({ ...c, hero: { ...c.hero, line3: e.target.value } }))}
              className="h-8 text-xs bg-background/80 text-[#FF6B7A] font-semibold"
            />
          </div>
        </div>

        <ExpandableTextBox
          label="Hero Subtitle & Statement"
          value={config.hero?.subtitle || ""}
          onChange={(val) => updateCfg((c) => ({ ...c, hero: { ...c.hero, subtitle: val } }))}
          placeholder="Enter the main hero subtitle and positioning copy..."
          rows={2}
        />

        {/* Physics Controls */}
        <div className="pt-2 border-t border-border/40 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Speed Multiplier</span>
              <span className="font-mono text-primary font-bold">{config.motion?.speed ?? 1}x</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={2.5}
              step={0.1}
              value={config.motion?.speed ?? 1}
              onChange={(e) => updateCfg((c) => ({ ...c, motion: { ...c.motion, speed: parseFloat(e.target.value) } }))}
              className="w-full accent-primary"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Particle Intensity</span>
              <span className="font-mono text-primary font-bold">{config.motion?.intensity ?? 1}x</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={2.0}
              step={0.1}
              value={config.motion?.intensity ?? 1}
              onChange={(e) => updateCfg((c) => ({ ...c, motion: { ...c.motion, intensity: parseFloat(e.target.value) } }))}
              className="w-full accent-primary"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Logo Spin Interval</span>
              <span className="font-mono text-primary font-bold">{config.motion?.logoRotateInterval ?? 12}s</span>
            </div>
            <input
              type="range"
              min={3}
              max={30}
              step={1}
              value={config.motion?.logoRotateInterval ?? 12}
              onChange={(e) => updateCfg((c) => ({ ...c, motion: { ...c.motion, logoRotateInterval: parseInt(e.target.value) } }))}
              className="w-full accent-primary"
            />
          </div>
        </div>
      </div>

      {/* ── 2. COLLECTION WORLDS ──────────────────────────────────── */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2 text-foreground font-bold text-sm">
            <LayoutGrid className="w-4 h-4 text-primary" />
            <span>2. Collection Worlds ({config.themes?.length || 0})</span>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              updateCfg((c) => ({
                ...c,
                themes: [
                  ...c.themes,
                  {
                    id: `theme_${Math.random().toString(36).slice(2, 7)}`,
                    label: "New Universe",
                    blurb: "Universe summary...",
                    accent: "#B81E30",
                  },
                ],
              }))
            }
            className="h-7 text-xs rounded-lg gap-1 border-border/60"
          >
            <Plus className="w-3 h-3 text-primary" /> Add Universe
          </Button>
        </div>

        {/* Section copy */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Eyebrow</Label>
            <Input
              value={config.themesIntro?.eyebrow || ""}
              onChange={(e) => updateCfg((c) => ({ ...c, themesIntro: { ...c.themesIntro, eyebrow: e.target.value } }))}
              className="h-8 text-xs bg-background/80"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Title</Label>
            <Input
              value={config.themesIntro?.title || ""}
              onChange={(e) => updateCfg((c) => ({ ...c, themesIntro: { ...c.themesIntro, title: e.target.value } }))}
              className="h-8 text-xs bg-background/80"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Subtitle</Label>
            <Input
              value={config.themesIntro?.subtitle || ""}
              onChange={(e) => updateCfg((c) => ({ ...c, themesIntro: { ...c.themesIntro, subtitle: e.target.value } }))}
              className="h-8 text-xs bg-background/80"
            />
          </div>
        </div>

        {/* Universe Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {config.themes.map((theme, idx) => (
            <div
              key={theme.id}
              className="p-3.5 rounded-xl border border-border/60 bg-secondary/20 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={theme.accent || "#B81E30"}
                    onChange={(e) =>
                      updateCfg((c) => {
                        const arr = [...c.themes];
                        arr[idx] = { ...arr[idx], accent: e.target.value };
                        return { ...c, themes: arr };
                      })
                    }
                    className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                    title="Change accent color"
                  />
                  <span className="font-bold text-xs text-foreground">{theme.label || "Untitled Universe"}</span>
                </div>

                <div className="flex items-center gap-1">
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        updateCfg((c) => {
                          const arr = [...c.themes];
                          [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                          return { ...c, themes: arr };
                        })
                      }
                      className="p-1 rounded text-muted-foreground hover:text-foreground"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                  )}
                  {idx < config.themes.length - 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        updateCfg((c) => {
                          const arr = [...c.themes];
                          [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
                          return { ...c, themes: arr };
                        })
                      }
                      className="p-1 rounded text-muted-foreground hover:text-foreground"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      updateCfg((c) => ({
                        ...c,
                        themes: c.themes.filter((_, i) => i !== idx),
                      }))
                    }
                    className="p-1 rounded text-muted-foreground hover:text-destructive ml-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Label</Label>
                  <Input
                    value={theme.label || ""}
                    onChange={(e) =>
                      updateCfg((c) => {
                        const arr = [...c.themes];
                        arr[idx] = { ...arr[idx], label: e.target.value };
                        return { ...c, themes: arr };
                      })
                    }
                    className="h-7 text-xs bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Accent Hex</Label>
                  <Input
                    value={theme.accent || ""}
                    onChange={(e) =>
                      updateCfg((c) => {
                        const arr = [...c.themes];
                        arr[idx] = { ...arr[idx], accent: e.target.value };
                        return { ...c, themes: arr };
                      })
                    }
                    className="h-7 text-xs font-mono bg-background"
                  />
                </div>
              </div>

              <ExpandableTextBox
                label="Blurb (Summary)"
                value={theme.blurb || ""}
                onChange={(val) =>
                  updateCfg((c) => {
                    const arr = [...c.themes];
                    arr[idx] = { ...arr[idx], blurb: val };
                    return { ...c, themes: arr };
                  })
                }
                placeholder="Short summary displayed on the universe card..."
                rows={2}
              />

              <ExpandableTextBox
                label="Extended Lore / Story (Optional)"
                value={theme.longDescription || ""}
                onChange={(val) =>
                  updateCfg((c) => {
                    const arr = [...c.themes];
                    arr[idx] = { ...arr[idx], longDescription: val };
                    return { ...c, themes: arr };
                  })
                }
                placeholder="Detailed thematic narrative, garment philosophy, and world building..."
                rows={2}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. CONNECT GRID ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2 text-foreground font-bold text-sm">
            <Link2 className="w-4 h-4 text-primary" />
            <span>3. Connect Grid ({config.links?.length || 0} Channels)</span>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              updateCfg((c) => ({
                ...c,
                links: [
                  ...c.links,
                  {
                    id: newLinkId(),
                    name: "New Channel",
                    desc: "Channel description",
                    href: "https://",
                    icon: "globe",
                    enabled: true,
                  },
                ],
              }))
            }
            className="h-7 text-xs rounded-lg gap-1 border-border/60"
          >
            <Plus className="w-3 h-3 text-primary" /> Add Channel
          </Button>
        </div>

        {/* Section copy */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Eyebrow</Label>
            <Input
              value={config.connectIntro?.eyebrow || ""}
              onChange={(e) => updateCfg((c) => ({ ...c, connectIntro: { ...c.connectIntro, eyebrow: e.target.value } }))}
              className="h-8 text-xs bg-background/80"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Title</Label>
            <Input
              value={config.connectIntro?.title || ""}
              onChange={(e) => updateCfg((c) => ({ ...c, connectIntro: { ...c.connectIntro, title: e.target.value } }))}
              className="h-8 text-xs bg-background/80"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Subtitle</Label>
            <Input
              value={config.connectIntro?.subtitle || ""}
              onChange={(e) => updateCfg((c) => ({ ...c, connectIntro: { ...c.connectIntro, subtitle: e.target.value } }))}
              className="h-8 text-xs bg-background/80"
            />
          </div>
        </div>

        {/* Channel rows */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {config.links.map((link, idx) => (
            <div
              key={link.id}
              className={`p-3 rounded-xl border bg-secondary/20 space-y-2.5 transition-opacity ${
                link.enabled ? "border-border/60" : "border-border/30 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={link.enabled}
                    onCheckedChange={(checked) =>
                      updateCfg((c) => {
                        const arr = [...c.links];
                        arr[idx] = { ...arr[idx], enabled: checked };
                        return { ...c, links: arr };
                      })
                    }
                  />
                  <span className="font-bold text-xs text-foreground">{link.name || "Channel"}</span>
                </div>

                <div className="flex items-center gap-1">
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        updateCfg((c) => {
                          const arr = [...c.links];
                          [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                          return { ...c, links: arr };
                        })
                      }
                      className="p-1 rounded text-muted-foreground hover:text-foreground"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                  )}
                  {idx < config.links.length - 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        updateCfg((c) => {
                          const arr = [...c.links];
                          [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
                          return { ...c, links: arr };
                        })
                      }
                      className="p-1 rounded text-muted-foreground hover:text-foreground"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      updateCfg((c) => ({
                        ...c,
                        links: c.links.filter((_, i) => i !== idx),
                      }))
                    }
                    className="p-1 rounded text-muted-foreground hover:text-destructive ml-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Channel Name</Label>
                  <Input
                    value={link.name || ""}
                    onChange={(e) =>
                      updateCfg((c) => {
                        const arr = [...c.links];
                        arr[idx] = { ...arr[idx], name: e.target.value };
                        return { ...c, links: arr };
                      })
                    }
                    className="h-7 text-xs bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Icon</Label>
                  <select
                    value={link.icon || "globe"}
                    onChange={(e) =>
                      updateCfg((c) => {
                        const arr = [...c.links];
                        arr[idx] = { ...arr[idx], icon: e.target.value as any };
                        return { ...c, links: arr };
                      })
                    }
                    className="w-full h-7 rounded-md bg-background border border-border/60 px-2 text-xs"
                  >
                    {ICON_OPTIONS.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Description</Label>
                  <Input
                    value={link.desc || ""}
                    onChange={(e) =>
                      updateCfg((c) => {
                        const arr = [...c.links];
                        arr[idx] = { ...arr[idx], desc: e.target.value };
                        return { ...c, links: arr };
                      })
                    }
                    className="h-7 text-xs bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Destination URL</Label>
                  <Input
                    value={link.href || ""}
                    onChange={(e) =>
                      updateCfg((c) => {
                        const arr = [...c.links];
                        arr[idx] = { ...arr[idx], href: e.target.value };
                        return { ...c, links: arr };
                      })
                    }
                    className="h-7 text-xs font-mono bg-background"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. CONTACT & POLICY ───────────────────────────────────── */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-foreground font-bold text-sm border-b border-border/40 pb-3">
          <Mail className="w-4 h-4 text-primary" />
          <span>4. Contact Channels & Atelier Location</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">General Contact Email</Label>
            <Input
              value={config.contact?.email || ""}
              onChange={(e) => updateCfg((c) => ({ ...c, contact: { ...c.contact, email: e.target.value } }))}
              className="h-8 text-xs bg-background/80"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Direct Phone Number</Label>
            <Input
              value={config.contact?.phone || ""}
              onChange={(e) => updateCfg((c) => ({ ...c, contact: { ...c.contact, phone: e.target.value } }))}
              className="h-8 text-xs bg-background/80"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Business Inquiries Email</Label>
            <Input
              value={config.contact?.business || ""}
              onChange={(e) => updateCfg((c) => ({ ...c, contact: { ...c.contact, business: e.target.value } }))}
              className="h-8 text-xs bg-background/80"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Partnerships Email</Label>
            <Input
              value={config.contact?.partnership || ""}
              onChange={(e) => updateCfg((c) => ({ ...c, contact: { ...c.contact, partnership: e.target.value } }))}
              className="h-8 text-xs bg-background/80"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label className="text-[11px] text-muted-foreground">Flagship / Atelier Address</Label>
            <Input
              value={config.contact?.address || ""}
              onChange={(e) => updateCfg((c) => ({ ...c, contact: { ...c.contact, address: e.target.value } }))}
              className="h-8 text-xs bg-background/80"
            />
          </div>
        </div>
      </div>

      {/* ── 5. TEAM & ARTISANS ────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2 text-foreground font-bold text-sm">
            <Users className="w-4 h-4 text-primary" />
            <span>5. Team & Artisans ({config.people.length} Members)</span>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              updateCfg((c) => ({
                ...c,
                people: [
                  ...c.people,
                  {
                    id: newPersonId(),
                    name: "New Artisan",
                    designation: "Designer",
                    bio: "Craft bio...",
                    link: "https://",
                    enabled: true,
                  },
                ],
              }))
            }
            className="h-7 text-xs rounded-lg gap-1 border-border/60"
          >
            <Plus className="w-3 h-3 text-primary" /> Add Member
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {config.people.map((person, idx) => (
            <div
              key={person.id}
              className="p-3.5 rounded-xl border border-border/60 bg-secondary/20 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                    {person.name ? person.name[0] : "O"}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-foreground">{person.name || "Member"}</p>
                    <p className="text-[10px] text-muted-foreground">{person.designation}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        updateCfg((c) => {
                          const arr = [...c.people];
                          [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                          return { ...c, people: arr };
                        })
                      }
                      className="p-1 rounded text-muted-foreground hover:text-foreground"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                  )}
                  {idx < config.people.length - 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        updateCfg((c) => {
                          const arr = [...c.people];
                          [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
                          return { ...c, people: arr };
                        })
                      }
                      className="p-1 rounded text-muted-foreground hover:text-foreground"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      updateCfg((c) => ({
                        ...c,
                        people: c.people.filter((_, i) => i !== idx),
                      }))
                    }
                    className="p-1 rounded text-muted-foreground hover:text-destructive ml-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Full Name</Label>
                  <Input
                    value={person.name}
                    onChange={(e) =>
                      updateCfg((c) => {
                        const arr = [...c.people];
                        arr[idx] = { ...arr[idx], name: e.target.value };
                        return { ...c, people: arr };
                      })
                    }
                    className="h-7 text-xs bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Designation / Role</Label>
                  <Input
                    value={person.designation}
                    onChange={(e) =>
                      updateCfg((c) => {
                        const arr = [...c.people];
                        arr[idx] = { ...arr[idx], designation: e.target.value };
                        return { ...c, people: arr };
                      })
                    }
                    className="h-7 text-xs bg-background"
                  />
                </div>
              </div>

              <ExpandableTextBox
                label="Bio & Craft Specialization"
                value={person.bio || ""}
                onChange={(val) =>
                  updateCfg((c) => {
                    const arr = [...c.people];
                    arr[idx] = { ...arr[idx], bio: val };
                    return { ...c, people: arr };
                  })
                }
                placeholder="Artisan craftsmanship background, heritage, and focus..."
                rows={2}
              />

              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Social Link URL</Label>
                <Input
                  value={person.link || ""}
                  onChange={(e) =>
                    updateCfg((c) => {
                      const arr = [...c.people];
                      arr[idx] = { ...arr[idx], link: e.target.value };
                      return { ...c, people: arr };
                    })
                  }
                  className="h-7 text-xs font-mono bg-background"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 6. INQUIRIES INBOX ────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 text-foreground font-bold text-sm">
            <Inbox className="w-4 h-4 text-primary" />
            <span>6. Inquiries Inbox ({inquiries.length})</span>
          </div>

          <div className="flex items-center gap-1.5">
            {["all", "new", "read", "responded", "archived"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setInquiryFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  inquiryFilter === st
                    ? "bg-secondary text-foreground border border-border"
                    : "text-muted-foreground hover:bg-secondary/40"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {filteredInquiries.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No inquiries match the &quot;{inquiryFilter}&quot; filter.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredInquiries.map((inq) => (
              <div
                key={inq.id}
                className="p-3.5 rounded-xl border border-border/50 bg-secondary/20 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{inq.name}</span>
                    <span className="text-muted-foreground font-mono">({inq.email})</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase font-bold ${
                      inq.status === "new"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : inq.status === "responded"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {inq.status}
                  </Badge>
                </div>

                <p className="font-semibold text-foreground">{inq.subject}</p>
                <p className="text-muted-foreground line-clamp-2 leading-relaxed">{inq.message}</p>

                <div className="flex items-center justify-between pt-1 border-t border-border/30">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {new Date(inq.created_at).toLocaleString()}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedInquiry(inq)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> View Full Message
                    </button>
                    <a
                      href={`mailto:${inq.email}?subject=Re: ${encodeURIComponent(inq.subject)}`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:underline"
                    >
                      <Reply className="w-3 h-3" /> Reply
                    </a>
                    {inq.status !== "responded" && (
                      <button
                        type="button"
                        onClick={() => updateInquiryStatus.mutate({ id: inq.id, status: "responded" })}
                        className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                      >
                        Mark Responded
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteInquiry.mutate(inq.id)}
                      className="text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── INQUIRY FULL VIEW DIALOG ──────────────────────────────── */}
      <Dialog open={!!selectedInquiry} onOpenChange={(open) => !open && setSelectedInquiry(null)}>
        <DialogContent className="sm:max-w-xl bg-card border-border/80 p-5 space-y-4">
          <DialogHeader className="border-b border-border/40 pb-3">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Inbox className="w-4 h-4 text-primary" />
                <span>Inquiry Details</span>
              </DialogTitle>
              {selectedInquiry && (
                <Badge variant="outline" className="text-[10px] uppercase font-bold">
                  {selectedInquiry.status}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {selectedInquiry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-secondary/30 text-xs">
                <div>
                  <p className="text-muted-foreground text-[10px]">From</p>
                  <p className="font-bold text-foreground">{selectedInquiry.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px]">Email</p>
                  <p className="font-mono text-foreground select-all">{selectedInquiry.email}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-[10px]">Subject</p>
                  <p className="font-semibold text-foreground">{selectedInquiry.subject}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-[10px]">Received At</p>
                  <p className="font-mono text-muted-foreground text-[11px]">
                    {new Date(selectedInquiry.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-muted-foreground">Full Message</Label>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedInquiry.message);
                      toast.success("Message copied to clipboard");
                    }}
                    className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline cursor-pointer"
                  >
                    <Copy className="w-2.5 h-2.5" /> Copy Text
                  </button>
                </div>
                <div className="p-3.5 rounded-xl bg-background border border-border/60 text-xs leading-relaxed max-h-[300px] overflow-y-auto whitespace-pre-wrap select-text">
                  {selectedInquiry.message}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <a
                  href={`mailto:${selectedInquiry.email}?subject=Re: ${encodeURIComponent(selectedInquiry.subject)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  <Reply className="w-3.5 h-3.5" /> Reply by Email
                </a>

                <Button size="sm" variant="outline" onClick={() => setSelectedInquiry(null)} className="h-8 text-xs">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
