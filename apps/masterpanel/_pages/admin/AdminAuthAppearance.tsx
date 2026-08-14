"use client";
import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_AUTH_APPEARANCE, AuthAppearance } from "@/hooks/use-auth-appearance";
import { toast } from "@/lib/app-toast";
import { Plus, Trash2, ShieldCheck, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useRegisterUniversalSave } from "@/contexts/UniversalSaveContext";

const AdminAuthAppearance: React.FC = () => {
  const qc = useQueryClient();
  const [cfg, setCfg] = useState<AuthAppearance>(DEFAULT_AUTH_APPEARANCE);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-auth-appearance"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "auth_appearance")
        .maybeSingle();
      const v: any = data?.value;
      const raw = typeof v === "object" && v !== null && "value" in v ? v.value : v;
      return { ...DEFAULT_AUTH_APPEARANCE, ...(raw || {}) } as AuthAppearance;
    },
  });

  useEffect(() => {
    if (data) setCfg(data);
  }, [data]);

  const set = <K extends keyof AuthAppearance>(k: K, v: AuthAppearance[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "auth_appearance", value: cfg as any }, { onConflict: "key" });
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Auth appearance saved");
      qc.invalidateQueries({ queryKey: ["site-settings", "auth_appearance"] });
      qc.invalidateQueries({ queryKey: ["admin-auth-appearance"] });
    }
  };

  useRegisterUniversalSave(
    {
      label: "Save Auth Design",
      onSave: save,
      isSaving: saving,
      onReject: () => {
        setCfg(DEFAULT_AUTH_APPEARANCE);
        toast.warning("Auth appearance reset to default");
      },
      canReject: true,
    },
    [cfg, saving]
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-secondary/15 to-background p-6 sm:p-8 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
              <Lock className="w-3 h-3 text-primary" />
              Auth Gateway Design
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Sign-in &amp; Sign-up Page Appearance
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Customize the brand onboarding screen, security badges, split-screen brand hero, and rotating testimonials.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Layout & Background */}
        <Card className="border-border/50 bg-card/60 rounded-2xl shadow-sm space-y-4 p-5">
          <h3 className="text-sm font-bold text-foreground">Screen Layout &amp; Security Elements</h3>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Layout Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {(["split", "centered"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => set("layout", v)}
                  className={`h-10 rounded-xl border text-xs font-bold capitalize transition-all cursor-pointer ${
                    cfg.layout === v
                      ? "border-primary bg-primary/10 ring-1 ring-primary/30 text-primary"
                      : "border-border/50 text-muted-foreground hover:text-foreground bg-secondary/15"
                  }`}
                >
                  {v === "split" ? "Split Screen (Editorial)" : "Centered Modal"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Show brand hero panel (Desktop)</span>
              <Switch checked={cfg.show_brand_panel} onCheckedChange={(c) => set("show_brand_panel", c)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Remember-me checkbox</span>
              <Switch checked={cfg.show_remember_me} onCheckedChange={(c) => set("show_remember_me", c)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Cloudflare / Bot verification badge</span>
              <Switch checked={cfg.show_robot_check} onCheckedChange={(c) => set("show_robot_check", c)} />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-border/40">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Background Style</label>
            <div className="grid grid-cols-3 gap-2">
              {(["gradient", "mesh", "solid"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => set("background_style", v)}
                  className={`h-9 rounded-xl border text-xs capitalize transition-all cursor-pointer ${
                    cfg.background_style === v
                      ? "border-primary bg-primary/10 ring-1 ring-primary/30 text-primary font-bold"
                      : "border-border/50 text-muted-foreground hover:text-foreground bg-secondary/15"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Copy & Messaging */}
        <Card className="border-border/50 bg-card/60 rounded-2xl shadow-sm space-y-3 p-5">
          <h3 className="text-sm font-bold text-foreground">Brand Copy &amp; Headlines</h3>
          {[
            ["welcome_kicker", "Welcome Kicker / Pre-title"],
            ["headline_signin", "Sign-in Headline"],
            ["headline_signup", "Sign-up Headline"],
            ["headline_forgot", "Forgot Password Headline"],
            ["subheadline", "Sub-headline Description"],
            ["secured_label", "Footer Security Badge"],
          ].map(([k, label]) => (
            <div key={k} className="space-y-1">
              <label className="text-[11px] font-mono text-muted-foreground uppercase">{label}</label>
              <Input
                value={(cfg as any)[k] || ""}
                onChange={(e) => set(k as any, e.target.value)}
                className="h-8 text-xs rounded-xl bg-secondary/20 border-border/50"
              />
            </div>
          ))}
        </Card>

        {/* Testimonials */}
        <Card className="border-border/50 bg-card/60 rounded-2xl shadow-sm space-y-3 p-5 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Rotating Customer Quotes &amp; Trust Signals</h3>
              <p className="text-xs text-muted-foreground">Displayed on the editorial side panel of the sign-in page.</p>
            </div>
            <Button
              size="sm"
              onClick={() => set("testimonials", [...cfg.testimonials, { quote: "", author: "" }])}
              className="gap-1.5 text-xs h-8 rounded-xl"
            >
              <Plus className="w-3.5 h-3.5" /> Add Quote
            </Button>
          </div>

          <div className="space-y-2.5">
            {cfg.testimonials.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={t.quote}
                  onChange={(e) => {
                    const next = [...cfg.testimonials];
                    next[i] = { ...next[i], quote: e.target.value };
                    set("testimonials", next);
                  }}
                  placeholder="e.g. The craftsmanship on the 380GSM collection is unmatched in Bangladesh."
                  className="text-xs rounded-xl flex-1 bg-secondary/20 border-border/50"
                />
                <Input
                  value={t.author}
                  onChange={(e) => {
                    const next = [...cfg.testimonials];
                    next[i] = { ...next[i], author: e.target.value };
                    set("testimonials", next);
                  }}
                  placeholder="— Verified Buyer"
                  className="text-xs rounded-xl w-48 bg-secondary/20 border-border/50"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => set("testimonials", cfg.testimonials.filter((_, j) => j !== i))}
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminAuthAppearance;
