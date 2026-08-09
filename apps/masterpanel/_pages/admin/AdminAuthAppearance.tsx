"use client";
import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_AUTH_APPEARANCE, AuthAppearance } from "@/hooks/use-auth-appearance";
import { toast } from "@/lib/app-toast";
import PageHeader from "@/components/admin/PageHeader";
import { Plus, Trash2, Save } from "lucide-react";

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

  useEffect(() => { if (data) setCfg(data); }, [data]);

  const set = <K extends keyof AuthAppearance>(k: K, v: AuthAppearance[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "auth_appearance", value: cfg as any }, { onConflict: "key" });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Auth appearance saved");
      qc.invalidateQueries({ queryKey: ["site-settings", "auth_appearance"] });
      qc.invalidateQueries({ queryKey: ["admin-auth-appearance"] });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auth Page Appearance"
        description="Customize the sign-in / sign-up experience."
        actions={
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60">
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
          </button>
        }
      />
      {isLoading ? null : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Layout */}
          <section className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold">Layout</h2>
            <div className="grid grid-cols-2 gap-2">
              {(["split", "centered"] as const).map((v) => (
                <button key={v} onClick={() => set("layout", v)}
                  className={`h-10 rounded-xl border text-xs font-medium capitalize ${cfg.layout === v ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground"}`}>
                  {v}
                </button>
              ))}
            </div>
            <label className="flex items-center justify-between text-sm">
              <span>Show brand panel (desktop)</span>
              <input type="checkbox" checked={cfg.show_brand_panel} onChange={(e) => set("show_brand_panel", e.target.checked)} className="w-4 h-4 accent-primary" />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>Remember-me checkbox</span>
              <input type="checkbox" checked={cfg.show_remember_me} onChange={(e) => set("show_remember_me", e.target.checked)} className="w-4 h-4 accent-primary" />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>"I'm not a robot" check</span>
              <input type="checkbox" checked={cfg.show_robot_check} onChange={(e) => set("show_robot_check", e.target.checked)} className="w-4 h-4 accent-primary" />
            </label>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Background</label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {(["gradient", "mesh", "solid"] as const).map((v) => (
                  <button key={v} onClick={() => set("background_style", v)}
                    className={`h-9 rounded-lg border text-xs capitalize ${cfg.background_style === v ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground"}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Copy */}
          <section className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold">Brand copy</h2>
            {[
              ["welcome_kicker", "Kicker"],
              ["headline_signin", "Sign-in headline (\\n for newline)"],
              ["headline_signup", "Sign-up headline"],
              ["headline_forgot", "Forgot-password headline"],
              ["subheadline", "Sub-headline"],
              ["secured_label", "Footer label"],
            ].map(([k, label]) => (
              <div key={k}>
                <label className="text-xs text-muted-foreground">{label}</label>
                <textarea
                  rows={k.includes("headline_") ? 2 : 1}
                  value={(cfg as any)[k] || ""}
                  onChange={(e) => set(k as any, e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm font-mono"
                />
              </div>
            ))}
          </section>

          {/* Testimonials */}
          <section className="rounded-2xl border border-border/60 bg-card p-5 space-y-3 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Rotating quotes</h2>
              <button
                onClick={() => set("testimonials", [...cfg.testimonials, { quote: "", author: "" }])}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-secondary text-xs font-medium">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {cfg.testimonials.map((t, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-2 items-start">
                  <input value={t.quote} onChange={(e) => {
                    const next = [...cfg.testimonials]; next[i] = { ...next[i], quote: e.target.value }; set("testimonials", next);
                  }} placeholder="Quote" className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm" />
                  <input value={t.author} onChange={(e) => {
                    const next = [...cfg.testimonials]; next[i] = { ...next[i], author: e.target.value }; set("testimonials", next);
                  }} placeholder="— Author" className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm" />
                  <button onClick={() => set("testimonials", cfg.testimonials.filter((_, j) => j !== i))}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminAuthAppearance;
// code:4ce0
