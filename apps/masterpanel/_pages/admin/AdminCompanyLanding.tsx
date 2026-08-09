"use client";
/**
 * Company Landing Editor
 * -----------------------
 * Full CMS control for the company app's `LandingPage`
 * (apps/company/_pages/LandingPage.tsx).
 *
 * Reads / writes the `landing_config` row inside the shared
 * `site_settings` table so it stays in sync across every app
 * that reads the same key.
 */
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { companyHref } from "@/lib/cross-app-urls";
import { toast } from "@/lib/app-toast";
import ImageUpload from "@/components/ImageUpload";
import {
  Save, RotateCcw, Eye, Plus, Trash2, GripVertical, Image as ImageIcon,
  Layout, BarChart3, MessageSquare, Star, Package, Loader2,
  ExternalLink, LayoutTemplate, Rocket,
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
  features: [
    { icon: "Shield",  title: "Authentic",     desc: "Every piece verified for quality and origin." },
    { icon: "Truck",   title: "Global reach",  desc: "Shipping wherever style travels." },
    { icon: "Users",   title: "Community",     desc: "Built with and for people who care." },
    { icon: "Sparkles",title: "Timeless",      desc: "Designed to outlast the trend cycle." },
  ],
  stats: [
    { value: "50k+", label: "Customers" },
    { value: "12",   label: "Countries" },
    { value: "4.9",  label: "Avg rating" },
    { value: "24h",  label: "Support" },
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

const ICON_CHOICES = ["Shield", "Truck", "Users", "Sparkles", "Star", "Package", "Heart", "Zap", "Globe", "RotateCcw", "ArrowUpRight", "ArrowRight"] as const;

/* ─── Field primitives ───────────────────────────────────────────── */
const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-xs font-semibold tracking-wide text-muted-foreground">{label}</span>
    {children}
    {hint && <span className="text-[10px] text-muted-foreground/70">{hint}</span>}
  </label>
);
const inputCls =
  "w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition";
const textareaCls = inputCls + " resize-y min-h-[80px]";

const Section: React.FC<{
  title: string; sub?: string; icon: React.ElementType;
  toggle?: { on: boolean; onToggle: (v: boolean) => void };
  children: React.ReactNode;
}> = ({ title, sub, icon: Icon, toggle, children }) => (
  <section className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
    <header className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
      <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {toggle && (
        <button
          type="button"
          onClick={() => toggle.onToggle(!toggle.on)}
          role="switch"
          aria-checked={toggle.on}
          className={`relative w-10 h-6 rounded-full transition-colors ${toggle.on ? "bg-primary" : "bg-muted"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform ${toggle.on ? "translate-x-4" : ""}`}
          />
        </button>
      )}
    </header>
    <div className={`px-5 py-4 space-y-4 ${toggle && !toggle.on ? "opacity-40 pointer-events-none" : ""}`}>
      {children}
    </div>
  </section>
);

/* ─── Repeater helpers ───────────────────────────────────────────── */
function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════════ */
export default function AdminCompanyLanding() {
  const queryClient = useQueryClient();

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

  const patch = React.useCallback(<K extends keyof LandingConfig>(key: K, val: LandingConfig[K]) => {
    setDraft((d) => (d ? { ...d, [key]: val } : d));
    setDirty(true);
  }, []);

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
      toast.success("Landing page updated");
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["company-landing-config"] });
      queryClient.invalidateQueries({ queryKey: ["site-settings-landing"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to save"),
  });

  const reset = () => {
    if (!current) return;
    setDraft(current);
    setDirty(false);
  };

  const resetToDefaults = () => {
    if (!confirm("Reset every field to the shipped defaults? Unsaved changes will be lost.")) return;
    setDraft(DEFAULTS);
    setDirty(true);
  };

  if (isLoading || !draft) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading landing config…
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* ── Header ───────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Company landing page</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Full CMS control over the marketing site landing page.
            Changes go live the next time a visitor loads the page.
          </p>
        </div>
        <a
          href={companyHref("/")}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-border transition"
        >
          <Eye className="w-3.5 h-3.5" /> Preview live site
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      </header>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <Section title="Hero" sub="First thing every visitor sees" icon={LayoutTemplate}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Badge (small pill)"><input className={inputCls} value={draft.hero_badge} onChange={(e) => patch("hero_badge", e.target.value)} /></Field>
          <div className="hidden sm:block" />
          <Field label="Background image — desktop" hint="Full-bleed hero backdrop (≥1920w recommended). Upload or paste a URL.">
            <ImageUpload bucket="site-assets" folder="company-landing" value={draft.hero_bg_url} onUploaded={(url) => patch("hero_bg_url", url)} />
            <input className={inputCls + " mt-2"} value={draft.hero_bg_url} onChange={(e) => patch("hero_bg_url", e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Background image — mobile" hint="Portrait crop for phones (falls back to desktop if empty).">
            <ImageUpload bucket="site-assets" folder="company-landing" value={draft.hero_bg_mobile_url} onUploaded={(url) => patch("hero_bg_mobile_url", url)} />
            <input className={inputCls + " mt-2"} value={draft.hero_bg_mobile_url} onChange={(e) => patch("hero_bg_mobile_url", e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Title — line 1"><input className={inputCls} value={draft.hero_title_line1} onChange={(e) => patch("hero_title_line1", e.target.value)} /></Field>
          <Field label="Title — line 2"><input className={inputCls} value={draft.hero_title_line2} onChange={(e) => patch("hero_title_line2", e.target.value)} /></Field>
          <Field label="Subtitle"><textarea className={textareaCls} value={draft.hero_subtitle} onChange={(e) => patch("hero_subtitle", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Primary CTA"><input className={inputCls} value={draft.hero_cta_primary} onChange={(e) => patch("hero_cta_primary", e.target.value)} /></Field>
            <Field label="Secondary CTA"><input className={inputCls} value={draft.hero_cta_secondary} onChange={(e) => patch("hero_cta_secondary", e.target.value)} /></Field>
          </div>
        </div>
      </Section>

      {/* ── ABOUT ────────────────────────────────────────────── */}
      <Section title="About / brand story" icon={MessageSquare} toggle={{ on: draft.show_about, onToggle: (v) => patch("show_about", v) }}>
        <div className="grid gap-4">
          <Field label="Section title"><input className={inputCls} value={draft.about_title} onChange={(e) => patch("about_title", e.target.value)} /></Field>
          <Field label="Body copy"><textarea className={textareaCls + " min-h-[120px]"} value={draft.about_text} onChange={(e) => patch("about_text", e.target.value)} /></Field>
        </div>
      </Section>

      {/* ── MISSION / VISION ─────────────────────────────────── */}
      <Section title="Mission &amp; vision" icon={Star} toggle={{ on: draft.show_mission_vision, onToggle: (v) => patch("show_mission_vision", v) }}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Mission"><textarea className={textareaCls} value={draft.mission_text} onChange={(e) => patch("mission_text", e.target.value)} /></Field>
          <Field label="Vision"><textarea className={textareaCls} value={draft.vision_text} onChange={(e) => patch("vision_text", e.target.value)} /></Field>
        </div>
      </Section>

      {/* ── STATS ────────────────────────────────────────────── */}
      <Section title="Stats strip" sub="Animated counters" icon={BarChart3} toggle={{ on: draft.show_stats, onToggle: (v) => patch("show_stats", v) }}>
        <Repeater
          items={draft.stats}
          onChange={(next) => patch("stats", next)}
          empty="No stats yet."
          add={{ label: "Add stat", make: () => ({ value: "", label: "" }) }}
          render={(s, i, upd) => (
            <div className="grid grid-cols-2 gap-2 flex-1">
              <input className={inputCls} placeholder="12k+" value={s.value} onChange={(e) => upd({ ...s, value: e.target.value })} />
              <input className={inputCls} placeholder="Customers" value={s.label} onChange={(e) => upd({ ...s, label: e.target.value })} />
            </div>
          )}
        />
      </Section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <Section title="Feature cards" sub="Values, benefits, promises" icon={Layout} toggle={{ on: draft.show_features, onToggle: (v) => patch("show_features", v) }}>
        <Repeater
          items={draft.features}
          onChange={(next) => patch("features", next)}
          empty="No features yet."
          add={{ label: "Add feature", make: () => ({ icon: "Shield", title: "", desc: "" }) }}
          render={(f, i, upd) => (
            <div className="grid sm:grid-cols-[9rem_1fr] gap-2 flex-1">
              <select
                className={inputCls}
                value={f.icon}
                onChange={(e) => upd({ ...f, icon: e.target.value })}
              >
                {ICON_CHOICES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="grid gap-2">
                <input className={inputCls} placeholder="Title" value={f.title} onChange={(e) => upd({ ...f, title: e.target.value })} />
                <input className={inputCls} placeholder="Short description" value={f.desc} onChange={(e) => upd({ ...f, desc: e.target.value })} />
              </div>
            </div>
          )}
        />
      </Section>

      {/* ── DISCOVER / EXPLORE NAV ────────────────────────────── */}
      <Section title="Discover section" sub="Explore-nav tiles on landing page" icon={Layout} toggle={{ on: draft.show_discover, onToggle: (v) => patch("show_discover", v) }}>
        <div className="grid sm:grid-cols-2 gap-2 mb-3">
          <input className={inputCls} placeholder="Eyebrow (e.g. Discover)" value={draft.discover_eyebrow} onChange={(e) => patch("discover_eyebrow", e.target.value)} />
          <input className={inputCls} placeholder="Section title" value={draft.discover_title} onChange={(e) => patch("discover_title", e.target.value)} />
        </div>
        <Repeater
          items={draft.discover_items}
          onChange={(next) => patch("discover_items", next)}
          empty="No discover tiles yet."
          add={{ label: "Add tile", make: () => ({ label: "", href: "", icon: "Sparkles", desc: "", external: false }) }}
          render={(it, i, upd) => (
            <div className="grid sm:grid-cols-[9rem_1fr] gap-2 flex-1">
              <select className={inputCls} value={it.icon} onChange={(e) => upd({ ...it, icon: e.target.value })}>
                {ICON_CHOICES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="grid gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <input className={inputCls} placeholder="Label" value={it.label} onChange={(e) => upd({ ...it, label: e.target.value })} />
                  <input className={inputCls} placeholder="URL (e.g. /docs or full URL)" value={it.href} onChange={(e) => upd({ ...it, href: e.target.value })} />
                </div>
                <input className={inputCls} placeholder="Short description" value={it.desc} onChange={(e) => upd({ ...it, desc: e.target.value })} />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={!!it.external} onChange={(e) => upd({ ...it, external: e.target.checked })} />
                  External link (opens new tab; empty URL falls back to storefront)
                </label>
              </div>
            </div>
          )}
        />
      </Section>


      {/* ── TESTIMONIALS ─────────────────────────────────────── */}
      <Section title="Testimonials" icon={Star} toggle={{ on: draft.show_testimonials, onToggle: (v) => patch("show_testimonials", v) }}>
        <Repeater
          items={draft.testimonials}
          onChange={(next) => patch("testimonials", next)}
          empty="No testimonials yet."
          add={{ label: "Add testimonial", make: () => ({ name: "", text: "", rating: 5 }) }}
          render={(t, i, upd) => (
            <div className="grid gap-2 flex-1">
              <div className="grid grid-cols-[1fr_5rem] gap-2">
                <input className={inputCls} placeholder="Customer name" value={t.name} onChange={(e) => upd({ ...t, name: e.target.value })} />
                <input className={inputCls} type="number" min={1} max={5} value={t.rating} onChange={(e) => upd({ ...t, rating: Number(e.target.value) || 5 })} />
              </div>
              <textarea className={textareaCls} placeholder="What they said…" value={t.text} onChange={(e) => upd({ ...t, text: e.target.value })} />
            </div>
          )}
        />
      </Section>

      {/* ── PRODUCT SHOWCASE ─────────────────────────────────── */}
      <Section title="Brand showcase" sub="Featured product / editorial block" icon={ImageIcon} toggle={{ on: draft.show_brand_showcase, onToggle: (v) => patch("show_brand_showcase", v) }}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Hero image URL"><input className={inputCls} value={draft.showcase_image_url} onChange={(e) => patch("showcase_image_url", e.target.value)} /></Field>
          <Field label="Linked product ID (optional)"><input className={inputCls} value={draft.showcase_product_id} onChange={(e) => patch("showcase_product_id", e.target.value)} placeholder="uuid or slug" /></Field>
          <Field label="Headline"><input className={inputCls} value={draft.showcase_headline} onChange={(e) => patch("showcase_headline", e.target.value)} /></Field>
          <Field label="CTA text"><input className={inputCls} value={draft.showcase_cta_text} onChange={(e) => patch("showcase_cta_text", e.target.value)} /></Field>
          <Field label="Description"><textarea className={textareaCls} value={draft.showcase_description} onChange={(e) => patch("showcase_description", e.target.value)} /></Field>
          <Field label="CTA link"><input className={inputCls} value={draft.showcase_cta_link} onChange={(e) => patch("showcase_cta_link", e.target.value)} placeholder="/product/slug" /></Field>
        </div>
      </Section>

      {/* ── COLLECTION / CATEGORIES TOGGLE ────────────────────── */}
      <Section title="Collection rail" sub="Latest products carousel" icon={Package} toggle={{ on: draft.show_categories, onToggle: (v) => patch("show_categories", v) }}>
        <p className="text-xs text-muted-foreground">
          Products come from the live product catalog (latest 8 active).
          Manage them in <span className="font-semibold text-foreground">Products</span>.
        </p>
      </Section>

      {/* ── FINAL CTA ────────────────────────────────────────── */}
      <Section title="Closing CTA" icon={Rocket} toggle={{ on: draft.show_cta, onToggle: (v) => patch("show_cta", v) }}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Title"><input className={inputCls} value={draft.cta_title} onChange={(e) => patch("cta_title", e.target.value)} /></Field>
          <Field label="Button label"><input className={inputCls} value={draft.cta_button} onChange={(e) => patch("cta_button", e.target.value)} /></Field>
          <Field label="Subtitle"><input className={inputCls} value={draft.cta_subtitle} onChange={(e) => patch("cta_subtitle", e.target.value)} /></Field>
        </div>
      </Section>

      {/* ── Sticky save bar ──────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-40 pointer-events-none px-4 pb-4">
        <div className={`pointer-events-auto max-w-2xl mx-auto rounded-2xl border shadow-xl backdrop-blur transition-all ${dirty ? "border-primary/40 bg-card/95" : "border-border/60 bg-card/85"}`}>
          <div className="flex items-center gap-3 px-4 py-3">
            <span className={`w-2 h-2 rounded-full shrink-0 ${dirty ? "bg-primary animate-pulse" : "bg-muted-foreground/40"}`} />
            <span className="text-xs text-muted-foreground flex-1">
              {dirty ? "You have unsaved changes" : "All changes saved"}
            </span>
            <button
              type="button"
              onClick={resetToDefaults}
              className="text-[11px] px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
            >
              Defaults
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={!dirty || save.isPending}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border/60 hover:bg-muted/50 disabled:opacity-40 transition"
            >
              <RotateCcw className="w-3 h-3" /> Revert
            </button>
            <button
              type="button"
              onClick={() => draft && save.mutate(draft)}
              disabled={!dirty || save.isPending}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-40 hover:brightness-110 transition"
            >
              {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Generic list repeater ──────────────────────────────────────── */
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
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground italic">{empty}</p>
      )}
      {items.map((item, i) => (
        <div key={i} className="group flex items-start gap-2 rounded-lg border border-border/50 bg-background/50 p-2">
          <div className="flex flex-col items-center gap-0.5 pt-1">
            <button type="button" onClick={() => onChange(moveItem(items, i, i - 1))} className="text-muted-foreground/50 hover:text-foreground transition p-0.5" aria-label="Move up">
              <GripVertical className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-muted-foreground/40">{i + 1}</span>
          </div>
          {render(item, i, (next) => {
            const arr = [...items]; arr[i] = next; onChange(arr);
          })}
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition p-1 shrink-0"
            aria-label="Remove"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, add.make()])}
        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-dashed border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition"
      >
        <Plus className="w-3.5 h-3.5" /> {add.label}
      </button>
    </div>
  );
}
// code:4ce0
