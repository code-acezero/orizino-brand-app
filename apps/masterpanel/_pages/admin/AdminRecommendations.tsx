"use client";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/lib/app-toast";
import { useRegisterUniversalSave } from "@/contexts/UniversalSaveContext";
import {
  Wand2,
  Brain,
  Sliders,
  TrendingUp,
  Star,
  Clock,
  Zap,
  Eye,
  ShoppingCart,
  Heart,
  MousePointerClick,
  Timer,
  Package,
  Tag,
  LayoutGrid,
  Activity,
} from "lucide-react";
import { Sparkle } from "@/components/icons/Sparkle";

// ── Types ─────────────────────────────────────────────────────────────────────
const DEFAULT_KIND_WEIGHTS = {
  view: 1,
  hover: 0.8,
  click: 1.5,
  wishlist: 2.5,
  cart: 3,
  purchase: 4,
  dwell: 0.5,
};

const DEFAULT_CONFIG = {
  enabled: true,
  weights: { affinity: 0.4, trending: 0.25, recent: 0.2, featured: 0.1, fresh: 0.05 },
  kind_weights: DEFAULT_KIND_WEIGHTS,
  freshness_days: 7,
  diversity_cap: 3,
  ai_rerank_enabled: false,
  ai_rerank_top_k: 24,
  ai_rerank_model: "google/gemini-2.5-flash",
};

type Config = typeof DEFAULT_CONFIG;
type WeightKey = keyof Config["weights"];
type KindKey = keyof typeof DEFAULT_KIND_WEIGHTS;

const WEIGHT_META: Record<WeightKey, { label: string; desc: string; icon: React.ElementType; color: string }> = {
  affinity:  { label: "Personal Affinity",  desc: "Based on each shopper's past behavior",        icon: Heart,       color: "text-pink-400" },
  trending:  { label: "Trending Demand",     desc: "Boost items surging in popularity recently",   icon: TrendingUp,  color: "text-amber-400" },
  recent:    { label: "Recent Activity",     desc: "Surfaces items the user viewed or clicked",    icon: Clock,       color: "text-sky-400" },
  featured:  { label: "Featured Boost",      desc: "Manual boost for highlighted collections",     icon: Star,        color: "text-violet-400" },
  fresh:     { label: "New Arrivals",        desc: "Prioritize newly added products",              icon: Tag,         color: "text-emerald-400" },
};

const KIND_META: Record<KindKey, { label: string; desc: string; icon: React.ElementType; color: string; max: number }> = {
  view:      { label: "View",          desc: "Product page opened",               icon: Eye,              color: "text-slate-400",   max: 5 },
  hover:     { label: "Hover",         desc: "Cursor rested on card (interest)",  icon: MousePointerClick,color: "text-sky-400",     max: 5 },
  click:     { label: "Click",         desc: "Card or CTA clicked",               icon: Activity,         color: "text-blue-400",    max: 5 },
  wishlist:  { label: "Wishlist",      desc: "Saved to wishlist",                 icon: Heart,            color: "text-pink-400",    max: 5 },
  cart:      { label: "Add to Cart",   desc: "Item added to cart",                icon: ShoppingCart,     color: "text-orange-400",  max: 5 },
  purchase:  { label: "Purchase",      desc: "Completed order including item",    icon: Package,          color: "text-emerald-400", max: 5 },
  dwell:     { label: "Dwell Time",    desc: "Time spent reading description",    icon: Timer,            color: "text-muted-foreground", max: 5 },
};

const AI_MODELS = [
  { value: "google/gemini-2.5-flash",  label: "Gemini 2.5 Flash",  desc: "Fastest · 1500 RPD free" },
  { value: "google/gemini-2.5-pro",    label: "Gemini 2.5 Pro",    desc: "Most capable · premium" },
  { value: "google/gemini-2.0-flash",  label: "Gemini 2.0 Flash",  desc: "Balanced · stable" },
];

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ title, desc, icon: Icon, children, accent = "text-primary" }: {
  title: string; desc?: string; icon?: React.ElementType; children: React.ReactNode; accent?: string;
}) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card/40 overflow-hidden">
      {(title || Icon) && (
        <div className="px-5 py-4 border-b border-border/40 bg-secondary/20 flex items-start gap-3">
          {Icon && (
            <div className={`mt-0.5 w-7 h-7 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0`}>
              <Icon className={`w-3.5 h-3.5 ${accent}`} />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground leading-none mb-0.5">{title}</p>
            {desc && <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>}
          </div>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}


// ── Main component ────────────────────────────────────────────────────────────
const AdminRecommendations = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState<Config>(DEFAULT_CONFIG);
  const [initialForm, setInitialForm] = useState<Config>(DEFAULT_CONFIG);

  const { data } = useQuery({
    queryKey: ["admin-reco-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "recommendations_config")
        .maybeSingle();
      return (data?.value as any) || {};
    },
  });

  useEffect(() => {
    if (data && Object.keys(data).length) {
      const loaded: Config = {
        ...DEFAULT_CONFIG,
        ...data,
        weights:      { ...DEFAULT_CONFIG.weights,      ...(data.weights      || {}) },
        kind_weights: { ...DEFAULT_KIND_WEIGHTS,        ...(data.kind_weights || {}) },
      };
      setForm(loaded);
      setInitialForm(loaded);
    }
  }, [data]);

  const isDirty = useMemo(() => {
    try { return JSON.stringify(form) !== JSON.stringify(initialForm); } catch { return false; }
  }, [form, initialForm]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("site_settings")
        .upsert(
          { key: "recommendations_config", value: form as any, updated_at: new Date().toISOString() },
          { onConflict: "key" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      setInitialForm(form);
      qc.invalidateQueries({ queryKey: ["admin-reco-config"] });
      qc.invalidateQueries({ queryKey: ["recommendations"] });
      toast.success("Recommendations engine config saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Register with floating save button
  useRegisterUniversalSave(
    useMemo(() => ({
      id: "recommendations-engine",
      label: "Save Recommendations Config",
      isSaving: save.isPending,
      isDirty,
      onSave: () => save.mutate(),
      onReject: () => setForm(initialForm),
      canReject: isDirty,
    }), [save.isPending, isDirty, initialForm])
  );

  const setWeight     = (k: WeightKey, v: number) => setForm((f) => ({ ...f, weights:      { ...f.weights,      [k]: v } }));
  const setKindWeight = (k: KindKey,   v: number) => setForm((f) => ({ ...f, kind_weights: { ...f.kind_weights, [k]: v } }));

  // Normalize weights sum for display
  const totalWeight = Object.values(form.weights).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-6 w-full pb-16">

      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-background p-6 md:p-8 shadow-sm">
        <div className="absolute right-0 top-0 -mr-20 -mt-20 h-72 w-72 rounded-full bg-primary/8 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
                <Wand2 className="w-3 h-3" /> Discover Engine
              </span>
              {isDirty && (
                <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30 bg-amber-500/5">
                  Unsaved changes
                </Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              Recommendations Engine
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Tune the multi-signal ranking blend that powers the Discover section on Home and Shop pages.
              Signal weights are blended heuristically, with optional AI reranking on top.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-secondary/40 p-3 rounded-2xl border border-border/60 shrink-0">
            <div className="text-right">
              <p className="text-xs font-bold text-foreground">Discover Engine</p>
              <p className="text-[10px] text-muted-foreground">{form.enabled ? "Live on all surfaces" : "Hidden globally"}</p>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => setForm({ ...form, enabled: v })}
            />
          </div>
        </div>
      </div>

      {/* ── Stats overview ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Active Signals",   value: Object.values(DEFAULT_KIND_WEIGHTS).length, icon: Activity,   color: "text-sky-400" },
          { label: "Diversity Cap",    value: `${form.diversity_cap} / cat`,               icon: LayoutGrid, color: "text-violet-400" },
          { label: "Freshness Window", value: `${form.freshness_days}d`,                   icon: Clock,      color: "text-amber-400" },
          { label: "AI Rerank",        value: form.ai_rerank_enabled ? "On" : "Off",       icon: Sparkle,    color: form.ai_rerank_enabled ? "text-emerald-400" : "text-muted-foreground" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-border/50 bg-card/40 p-4 space-y-2">
            <div className={`w-7 h-7 rounded-xl bg-secondary/60 flex items-center justify-center`}>
              <Icon className={`w-3.5 h-3.5 ${color}`} />
            </div>
            <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
            <p className="text-[11px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Engine Config ── */}
      <Section title="Engine Configuration" desc="Global discovery controls that apply across all recommendation surfaces." icon={Sliders}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Diversity Cap</p>
            <p className="text-[11px] text-muted-foreground">Max products per category in a single Discover row.</p>
            <div className="flex items-center gap-3">
              <Slider
                value={[form.diversity_cap]}
                min={1} max={12} step={1}
                onValueChange={([v]) => setForm({ ...form, diversity_cap: v })}
                className="flex-1"
              />
              <span className="text-xs font-mono font-bold text-primary w-6 text-right">{form.diversity_cap}</span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Freshness Window</p>
            <p className="text-[11px] text-muted-foreground">Days back to scan for trending demand. Shorter = more reactive.</p>
            <div className="flex items-center gap-3">
              <Slider
                value={[form.freshness_days]}
                min={1} max={90} step={1}
                onValueChange={([v]) => setForm({ ...form, freshness_days: v })}
                className="flex-1"
              />
              <span className="text-xs font-mono font-bold text-primary w-8 text-right">{form.freshness_days}d</span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">AI Rerank Pool</p>
            <p className="text-[11px] text-muted-foreground">Heuristic top-K candidates sent to AI for reranking.</p>
            <div className="flex items-center gap-3">
              <Slider
                value={[form.ai_rerank_top_k]}
                min={4} max={48} step={4}
                onValueChange={([v]) => setForm({ ...form, ai_rerank_top_k: v })}
                className="flex-1"
              />
              <span className="text-xs font-mono font-bold text-primary w-8 text-right">{form.ai_rerank_top_k}</span>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Scoring Weights ── */}
      <Section title="Scoring Signal Blend" desc="Relative pull of each ranking signal. The engine normalizes these weights internally." icon={TrendingUp} accent="text-amber-400">
        <div className="space-y-4">
          {(Object.keys(WEIGHT_META) as WeightKey[]).map((k) => {
            const meta = WEIGHT_META[k];
            const Icon = meta.icon;
            const pct = Math.round((form.weights[k] / totalWeight) * 100);
            return (
              <div key={k} className="space-y-2.5 p-3 rounded-2xl bg-secondary/20 border border-border/40 hover:border-border/70 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-secondary/60 flex items-center justify-center shrink-0">
                      <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-foreground">{meta.label}</span>
                      <span className="text-[11px] text-muted-foreground hidden sm:inline ml-1.5">— {meta.desc}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground tabular-nums font-medium">{pct}%</span>
                    <span className="text-xs font-mono font-bold text-primary tabular-nums w-10 text-right">
                      {form.weights[k].toFixed(2)}
                    </span>
                  </div>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.05}
                  value={[form.weights[k]]}
                  onValueChange={(v) => setWeight(k, v[0] ?? 0)}
                  className="pt-0.5"
                />
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── Signal Weights (Interaction Kind) ── */}
      <Section title="Interaction Signal Weights" desc="How much each shopper action contributes to their affinity score and trending calculations." icon={Zap} accent="text-sky-400">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {(Object.keys(KIND_META) as KindKey[]).map((k) => {
            const meta = KIND_META[k];
            const Icon = meta.icon;
            const val = form.kind_weights[k] ?? 0;
            return (
              <div key={k} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${meta.color}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground leading-none">{meta.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{meta.desc}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-primary tabular-nums shrink-0 w-8 text-right">
                    ×{val.toFixed(1)}
                  </span>
                </div>
                <Slider
                  min={0} max={meta.max} step={0.1}
                  value={[val]}
                  onValueChange={(v) => setKindWeight(k, v[0] ?? 0)}
                />
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── AI Reranking ── */}
      <Section title="AI Reranking" desc="Apply a Gemini AI pass to reorder the heuristic top-K for contextual relevance." icon={Sparkle} accent="text-violet-400">
        <div className="space-y-5">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/30 border border-border/50">
            <div>
              <p className="text-sm font-bold text-foreground">Enable AI Reranking</p>
              <p className="text-xs text-muted-foreground mt-0.5">Adds ~300–800 ms per Discover request. Uses your configured Gemini API key.</p>
            </div>
            <Switch
              checked={form.ai_rerank_enabled}
              onCheckedChange={(v) => setForm({ ...form, ai_rerank_enabled: v })}
            />
          </div>

          {form.ai_rerank_enabled && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rerank Model</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {AI_MODELS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setForm({ ...form, ai_rerank_model: m.value })}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      form.ai_rerank_model === m.value
                        ? "border-primary bg-primary/8 ring-1 ring-primary/30"
                        : "border-border/60 bg-card/30 hover:border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-foreground">{m.label}</p>
                      {form.ai_rerank_model === m.value && (
                        <Badge className="text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5">Active</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{m.desc}</p>
                  </button>
                ))}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground bg-secondary/20 rounded-2xl p-4 border border-border/40">
                <div>
                  <p className="font-semibold text-foreground mb-0.5">Top-K Pool</p>
                  <p className="text-[11px]">First {form.ai_rerank_top_k} candidates from heuristic blend are sent to Gemini for reranking.</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-0.5">Cost Impact</p>
                  <p className="text-[11px]">Each Discover page load = 1 Gemini inference call against your project quota.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
};

export default AdminRecommendations;
// code:4ce0
