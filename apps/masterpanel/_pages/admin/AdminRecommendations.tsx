"use client";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/lib/app-toast";
import { Wand2, Sliders, Brain } from "lucide-react";

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
const WEIGHT_LABELS: Record<WeightKey, string> = {
  affinity: "Personal affinity",
  trending: "Trending",
  recent: "Recent activity",
  featured: "Featured boost",
  fresh: "New arrivals",
};
const KIND_LABELS: Record<KindKey, string> = {
  view: "View",
  hover: "Hover (interest)",
  click: "Click",
  wishlist: "Wishlist",
  cart: "Add to cart",
  purchase: "Purchase",
  dwell: "Dwell time",
};

const AdminRecommendations = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState<Config>(DEFAULT_CONFIG);

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
    if (data) {
      setForm({
        ...DEFAULT_CONFIG,
        ...data,
        weights: { ...DEFAULT_CONFIG.weights, ...(data.weights || {}) },
        kind_weights: { ...DEFAULT_KIND_WEIGHTS, ...(data.kind_weights || {}) },
      });
    }
  }, [data]);

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
      qc.invalidateQueries({ queryKey: ["admin-reco-config"] });
      qc.invalidateQueries({ queryKey: ["recommendations"] });
      toast.success("Recommendation settings saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setWeight = (k: WeightKey, v: number) =>
    setForm((f) => ({ ...f, weights: { ...f.weights, [k]: v } }));

  const setKindWeight = (k: KindKey, v: number) =>
    setForm((f) => ({ ...f, kind_weights: { ...f.kind_weights, [k]: v } }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Recommendations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tune the Discover section on Home & Shop pages.
          </p>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" /> Engine
            </CardTitle>
            <CardDescription>Enable or disable the Discover section globally.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Show Discover section</p>
                <p className="text-xs text-muted-foreground">Hides Discover from Home and Shop when off.</p>
              </div>
              <Switch
                checked={form.enabled}
                onCheckedChange={(v) => setForm({ ...form, enabled: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>Diversity cap (max items per category)</Label>
              <Input
                type="number"
                min={1}
                max={12}
                value={form.diversity_cap}
                onChange={(e) =>
                  setForm({ ...form, diversity_cap: Math.max(1, Number(e.target.value) || 1) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Freshness window (days)</Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={form.freshness_days}
                onChange={(e) =>
                  setForm({ ...form, freshness_days: Math.max(1, Number(e.target.value) || 1) })
                }
              />
              <p className="text-xs text-muted-foreground">
                How far back to look when computing trending demand. Shorter = more reactive.
              </p>
            </div>

          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" /> AI Reranking
            </CardTitle>
            <CardDescription>
              Apply a Lovable AI pass to reorder the heuristic top-K for higher relevance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Enable AI rerank</p>
                <p className="text-xs text-muted-foreground">Adds ~300–800 ms per request.</p>
              </div>
              <Switch
                checked={form.ai_rerank_enabled}
                onCheckedChange={(v) => setForm({ ...form, ai_rerank_enabled: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>Top-K to rerank</Label>
              <Input
                type="number"
                min={4}
                max={48}
                value={form.ai_rerank_top_k}
                onChange={(e) =>
                  setForm({ ...form, ai_rerank_top_k: Math.max(4, Number(e.target.value) || 4) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input
                value={form.ai_rerank_model}
                onChange={(e) => setForm({ ...form, ai_rerank_model: e.target.value })}
                placeholder="google/gemini-2.5-flash"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sliders className="w-5 h-5" /> Scoring Weights
            </CardTitle>
            <CardDescription>
              Relative pull of each signal in the heuristic blend. Values are normalized internally.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {(Object.keys(WEIGHT_LABELS) as WeightKey[]).map((k) => (
              <div key={k} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{WEIGHT_LABELS[k]}</Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {form.weights[k].toFixed(2)}
                  </span>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.05}
                  value={[form.weights[k]]}
                  onValueChange={(v) => setWeight(k, v[0] ?? 0)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sliders className="w-5 h-5" /> Signal Weights (per interaction)
            </CardTitle>
            <CardDescription>
              How much each shopper action counts toward affinity and trending. Hover captures early
              browsing interest before a click.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            {(Object.keys(KIND_LABELS) as KindKey[]).map((k) => (
              <div key={k} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{KIND_LABELS[k]}</Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {(form.kind_weights[k] ?? 0).toFixed(1)}
                  </span>
                </div>
                <Slider
                  min={0}
                  max={5}
                  step={0.1}
                  value={[form.kind_weights[k] ?? 0]}
                  onValueChange={(v) => setKindWeight(k, v[0] ?? 0)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminRecommendations;
// code:4ce0
