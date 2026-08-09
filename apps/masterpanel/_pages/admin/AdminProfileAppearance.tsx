"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Type, LayoutGrid, Save, Check, Palette, Maximize2, Smartphone, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import {
  PROFILE_TYPOGRAPHY_PAIRS,
  PROFILE_LAYOUT_VARIANTS,
  ACCENT_PRESETS,
  defaultProfileAppearance,
  getTypographyPair,
  type ProfileAppearanceConfig,
} from "@/lib/profile-appearance";

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

const AdminProfileAppearance: React.FC = () => {
  useSeoMeta("Profile Appearance", "Switch Profile & Settings typography and layout");
  const [cfg, setCfg] = useState<ProfileAppearanceConfig>(defaultProfileAppearance);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    PROFILE_TYPOGRAPHY_PAIRS.forEach((p) => ensureFont(p.gfUrl));
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
    toast({ title: "Saved", description: "Profile & Settings appearance updated." });
  };

  const activePair = getTypographyPair(cfg.typography_pair);

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Profile Appearance</h1>
          <p className="text-sm text-muted-foreground">
            Pick the typography pair and structural layout used by the customer Profile and Settings pages.
          </p>
        </div>
        <Button onClick={save} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save changes"}
        </Button>
      </header>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Type className="w-4 h-4" /> Typography pair
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PROFILE_TYPOGRAPHY_PAIRS.map((p) => {
            const active = p.id === cfg.typography_pair;
            return (
              <motion.button
                key={p.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCfg((c) => ({ ...c, typography_pair: p.id }))}
                className={`relative text-left rounded-2xl border p-4 transition-all ${
                  active ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border/60 hover:border-primary/40 bg-card"
                }`}
              >
                {active && (
                  <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
                <div className="text-3xl leading-tight" style={{ fontFamily: p.heading }}>
                  Aa
                </div>
                <div className="mt-1 text-sm" style={{ fontFamily: p.body }}>
                  The quick brown fox jumps over the lazy dog
                </div>
                <div className="mt-3 text-xs text-muted-foreground">{p.label}</div>
              </motion.button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <LayoutGrid className="w-4 h-4" /> Layout variant
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {PROFILE_LAYOUT_VARIANTS.map((l) => {
            const active = l.id === cfg.layout_variant;
            return (
              <motion.button
                key={l.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCfg((c) => ({ ...c, layout_variant: l.id }))}
                className={`relative text-left rounded-xl border p-3 transition-all ${
                  active ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border/60 hover:border-primary/40 bg-card"
                }`}
              >
                {active && (
                  <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </span>
                )}
                <LayoutPreview id={l.id} />
                <div className="mt-2 text-sm font-medium">{l.label}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-2">{l.description}</div>
              </motion.button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Palette className="w-4 h-4" /> Accent color
        </div>
        <div className="flex flex-wrap gap-2">
          {ACCENT_PRESETS.map((a) => {
            const active = (cfg.accent_hsl ?? "") === a.hsl;
            return (
              <button
                key={a.id}
                onClick={() => setCfg((c) => ({ ...c, accent_hsl: a.hsl || null }))}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-all ${
                  active ? "border-primary bg-primary/10 ring-2 ring-primary/30" : "border-border/60 hover:border-primary/40"
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full border border-border/60"
                  style={{ background: a.hsl ? `hsl(${a.hsl})` : "linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))" }}
                />
                {a.label}
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Maximize2 className="w-4 h-4" /> Density
          </div>
          <div className="flex gap-2">
            {(["compact", "comfortable", "spacious"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setCfg((c) => ({ ...c, density: d }))}
                className={`flex-1 rounded-lg border px-2 py-2 text-xs capitalize ${
                  (cfg.density ?? "comfortable") === d
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                    : "border-border/60 hover:border-primary/40"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Square className="w-4 h-4" /> Card radius
          </div>
          <div className="flex gap-2">
            {(["sm", "md", "lg", "xl", "2xl"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setCfg((c) => ({ ...c, rounded: r }))}
                className={`flex-1 rounded-lg border px-2 py-2 text-xs uppercase ${
                  (cfg.rounded ?? "2xl") === r
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                    : "border-border/60 hover:border-primary/40"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Smartphone className="w-4 h-4" /> Mobile nav
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["tabs", "segmented", "pill", "sheet"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setCfg((c) => ({ ...c, mobile_nav: m }))}
                className={`rounded-lg border px-2 py-2 text-xs capitalize ${
                  (cfg.mobile_nav ?? "tabs") === m
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                    : "border-border/60 hover:border-primary/40"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </section>
      </div>


      <section className="rounded-2xl border border-border/60 p-5 bg-card">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Live preview</div>
        <div style={{ fontFamily: activePair.body }}>
          <h2 className="text-3xl font-bold" style={{ fontFamily: activePair.heading }}>
            Your profile, your story
          </h2>
          <p className="mt-2 text-muted-foreground">
            Layout: <span className="font-medium text-foreground">{cfg.layout_variant}</span> · Pair:{" "}
            <span className="font-medium text-foreground">{activePair.label}</span>
          </p>
        </div>
      </section>
    </div>
  );
};

const LayoutPreview: React.FC<{ id: string }> = ({ id }) => {
  // Small SVG wireframes per layout
  const common = "w-full h-16 rounded-md bg-muted/50 border border-border/40 p-1 flex gap-1";
  const block = "rounded-sm bg-foreground/15";
  switch (id) {
    case "magazine":
      return (
        <div className={common + " flex-col"}>
          <div className={block + " h-2 w-3/5 mx-auto"} />
          <div className={block + " flex-1"} />
        </div>
      );
    case "bento-grid":
      return (
        <div className={common}>
          <div className={block + " flex-1"} />
          <div className="flex flex-col gap-1 flex-1">
            <div className={block + " flex-1"} />
            <div className={block + " h-2"} />
          </div>
        </div>
      );
    case "asymmetric":
      return (
        <div className={common}>
          <div className={block + " w-3/5"} />
          <div className={block + " flex-1"} />
        </div>
      );
    case "sidebar":
      return (
        <div className={common}>
          <div className={block + " w-1/4"} />
          <div className={block + " flex-1"} />
        </div>
      );
    case "split-screen":
      return (
        <div className={common}>
          <div className={block + " flex-1"} />
          <div className={block + " flex-1"} />
        </div>
      );
    case "single-column":
      return (
        <div className={common + " flex-col items-center"}>
          <div className={block + " w-1/2 h-2"} />
          <div className={block + " w-1/2 flex-1"} />
        </div>
      );
    case "minimal":
      return (
        <div className={common + " bg-transparent"}>
          <div className="flex-1 border border-dashed border-border rounded-sm" />
        </div>
      );
    case "card-grid":
      return (
        <div className={common + " grid grid-cols-3 gap-1 flex"}>
          <div className={block} />
          <div className={block} />
          <div className={block} />
        </div>
      );
    case "editorial":
      return (
        <div className={common + " flex-col"}>
          <div className={block + " h-3 w-4/5"} />
          <div className={block + " h-1 w-2/3"} />
          <div className={block + " flex-1"} />
        </div>
      );
    case "hero-grid":
    default:
      return (
        <div className={common + " flex-col"}>
          <div className={block + " h-3"} />
          <div className="flex gap-1 flex-1">
            <div className={block + " flex-1"} />
            <div className={block + " flex-1"} />
          </div>
        </div>
      );
  }
};

export default AdminProfileAppearance;
// code:4ce0
