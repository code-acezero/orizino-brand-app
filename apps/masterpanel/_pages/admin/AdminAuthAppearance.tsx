"use client";
import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_AUTH_APPEARANCE, AuthAppearance } from "@/hooks/use-auth-appearance";
import { toast } from "@/lib/app-toast";
import { Plus, Trash2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRegisterUniversalSave, useUndoRedoState } from "@/contexts/UniversalSaveContext";

const AdminAuthAppearance: React.FC = () => {
  const qc = useQueryClient();
  const [cfg, setCfg, { undo, redo, canUndo, canRedo, reject, canReject, setInitial }] =
    useUndoRedoState<AuthAppearance>(DEFAULT_AUTH_APPEARANCE);
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
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
    if (data) setInitial(data);
  }, [data, setInitial]);

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
      onUndo: undo,
      canUndo: canUndo,
      onRedo: redo,
      canRedo: canRedo,
      onReject: () => {
        reject();
        toast.warning("Auth appearance reverted");
      },
      canReject: canReject,
    },
    [cfg, saving, canUndo, canRedo, canReject]
  );

  return (
    <div className="space-y-6">
      {/* ── TOP CONTROL BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground">Sign-in &amp; Sign-up Gateway</h2>
              <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/10 capitalize">
                {cfg.layout === "split" ? "Split Screen" : "Centered"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Customize brand onboarding, security elements, background styles, and rotating quotes.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Layout & Background */}
        <Card className="border-border/50 bg-card/60 rounded-2xl space-y-3.5 p-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Layout &amp; Elements</h3>

          <div className="space-y-1.5">
            <label className="text-[10.5px] font-semibold text-muted-foreground uppercase">Layout Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {(["split", "centered"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => set("layout", v)}
                  className={`h-9 rounded-xl border text-xs font-bold capitalize transition-all cursor-pointer ${
                    cfg.layout === v
                      ? "border-primary bg-primary/10 ring-1 ring-primary/30 text-primary"
                      : "border-border/50 text-muted-foreground hover:text-foreground bg-secondary/15"
                  }`}
                >
                  {v === "split" ? "Split Screen" : "Centered Modal"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">Show brand hero panel (Desktop)</span>
              <Switch checked={cfg.show_brand_panel} onCheckedChange={(c) => set("show_brand_panel", c)} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">Remember-me checkbox</span>
              <Switch checked={cfg.show_remember_me} onCheckedChange={(c) => set("show_remember_me", c)} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">Bot verification badge</span>
              <Switch checked={cfg.show_robot_check} onCheckedChange={(c) => set("show_robot_check", c)} />
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border/40">
            <label className="text-[10.5px] font-semibold uppercase text-muted-foreground">Background Style</label>
            <div className="grid grid-cols-3 gap-2">
              {(["gradient", "mesh", "solid"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => set("background_style", v)}
                  className={`h-8 rounded-xl border text-xs capitalize transition-all cursor-pointer ${
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
        <Card className="border-border/50 bg-card/60 rounded-2xl space-y-2.5 p-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Brand Copy</h3>
          {[
            ["welcome_kicker", "Welcome Kicker"],
            ["headline_signin", "Sign-in Headline"],
            ["headline_signup", "Sign-up Headline"],
            ["headline_forgot", "Forgot Password Headline"],
            ["subheadline", "Sub-headline"],
            ["secured_label", "Footer Security Badge"],
          ].map(([k, label]) => (
            <div key={k} className="space-y-0.5">
              <label className="text-[10px] font-mono text-muted-foreground uppercase">{label}</label>
              <Input
                value={(cfg as any)[k] || ""}
                onChange={(e) => set(k as any, e.target.value)}
                className="h-7 text-xs rounded-lg bg-secondary/20 border-border/50"
              />
            </div>
          ))}
        </Card>

        {/* Testimonials */}
        <Card className="border-border/50 bg-card/60 rounded-2xl space-y-3 p-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Rotating Customer Quotes</h3>
              <p className="text-[11px] text-muted-foreground">Displayed on the editorial side panel.</p>
            </div>
            <Button
              size="sm"
              onClick={() => set("testimonials", [...cfg.testimonials, { quote: "", author: "" }])}
              className="gap-1 text-xs h-7 rounded-lg"
            >
              <Plus className="w-3 h-3" /> Add Quote
            </Button>
          </div>

          <div className="space-y-2">
            {cfg.testimonials.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={t.quote}
                  onChange={(e) => {
                    const next = [...cfg.testimonials];
                    next[i] = { ...next[i], quote: e.target.value };
                    set("testimonials", next);
                  }}
                  placeholder="Quote copy..."
                  className="text-xs rounded-lg h-8 flex-1 bg-secondary/20 border-border/50"
                />
                <Input
                  value={t.author}
                  onChange={(e) => {
                    const next = [...cfg.testimonials];
                    next[i] = { ...next[i], author: e.target.value };
                    set("testimonials", next);
                  }}
                  placeholder="— Author"
                  className="text-xs rounded-lg h-8 w-44 bg-secondary/20 border-border/50"
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
