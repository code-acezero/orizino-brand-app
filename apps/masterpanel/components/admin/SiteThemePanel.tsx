"use client";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { themePalettes } from "@/lib/theme-palettes";
import { useSiteSettings } from "./useSiteSettings";

const defaults = { site_theme: "default", site_mode: "auto" as "auto" | "dark" | "light" };

/**
 * Site-wide color palette + mode picker. Lives inside Branding so all visual
 * identity decisions sit together.
 */
export default function SiteThemePanel() {
  const { form, setForm, save } = useSiteSettings(defaults);

  useEffect(() => {
    if (form.site_mode === "auto") {
      const isDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
      document.documentElement.classList.toggle("light", !isDark);
    } else {
      document.documentElement.classList.toggle("light", form.site_mode === "light");
    }
  }, [form.site_mode]);

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Site-wide Theme</CardTitle>
        <CardDescription>Choose a color palette and mode that applies across the entire store.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="mb-2 block">Mode</Label>
          <div className="flex gap-2">
            {(["auto", "dark", "light"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setForm({ ...form, site_mode: m })}
                className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-all capitalize cursor-pointer ${
                  (form.site_mode || "auto") === m
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border hover:border-primary/30 text-muted-foreground"
                }`}
              >
                {m === "auto" ? "Auto (Device)" : m}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="mb-3 block">Color Palette</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {themePalettes.map((t) => (
              <button
                key={t.id}
                onClick={() => setForm({ ...form, site_theme: t.id })}
                className={`text-left p-3 rounded-xl border transition-all ${
                  form.site_theme === t.id
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30 shadow-md"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <div className="flex gap-1 mb-2 h-6 rounded-lg overflow-hidden">
                  {t.preview.map((hex, i) => (
                    <div key={i} className="flex-1" style={{ background: hex }} />
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">{t.name}</span>
                  {form.site_theme === t.id && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Active</Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
        <Button className="w-full" onClick={() => save.mutate(undefined)} disabled={save.isPending}>
          {save.isPending ? "Saving..." : "Save Theme"}
        </Button>
      </CardContent>
    </Card>
  );
}
// code:4ce0
