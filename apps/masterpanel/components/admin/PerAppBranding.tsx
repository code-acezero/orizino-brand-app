"use client";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/lib/app-toast";
import ImageUpload from "@/components/ImageUpload";
import { Copy, RotateCcw, Save, Layers } from "lucide-react";

type AppKey = "masterpanel" | "company" | "storefront";
type SourceKey = AppKey | "global";

const APPS: { id: AppKey; label: string; description: string }[] = [
  { id: "masterpanel", label: "Master Panel", description: "Admin dashboard" },
  { id: "company", label: "Company Landing", description: "Public marketing site" },
  { id: "storefront", label: "Storefront", description: "Customer shop" },
];

const FIELDS = [
  { key: "site_name",    label: "Title",   type: "text" as const },
  { key: "logo_url",     label: "Logo",    type: "image" as const, bucket: "site-assets", folder: "logos" },
  { key: "favicon_url",  label: "Favicon", type: "image" as const, bucket: "site-assets", folder: "favicons" },
];

const ALL_KEYS = FIELDS.flatMap((f) => [
  f.key,
  ...APPS.map((a) => `${f.key}:${a.id}`),
]);

const readVal = (v: unknown) =>
  typeof v === "object" && v !== null ? (v as any).value ?? v : v;

export default function PerAppBranding() {
  const qc = useQueryClient();
  const [app, setApp] = useState<AppKey>("masterpanel");
  const [syncFrom, setSyncFrom] = useState<SourceKey>("global");

  const { data: raw = {} } = useQuery({
    queryKey: ["per-app-branding"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ALL_KEYS);
      const map: Record<string, any> = {};
      data?.forEach((s) => { map[s.key] = readVal(s.value); });
      return map;
    },
  });

  // effective = override for the selected app, or the global fallback
  const effective = useMemo(() => {
    const out: Record<string, string> = {};
    for (const f of FIELDS) {
      out[f.key] = String(raw[`${f.key}:${app}`] ?? raw[f.key] ?? "");
    }
    return out;
  }, [raw, app]);

  const overrides = useMemo(() => {
    const out: Record<string, string> = {};
    for (const f of FIELDS) out[f.key] = String(raw[`${f.key}:${app}`] ?? "");
    return out;
  }, [raw, app]);

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const current = (key: string) =>
    key in drafts ? drafts[key] : overrides[key] || "";

  const setDraft = (key: string, value: string) =>
    setDrafts((d) => ({ ...d, [key]: value }));

  async function upsertKeys(entries: { key: string; value: any }[]) {
    const rows = entries.map((e) => ({ key: e.key, value: e.value as any }));
    const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
    if (error) throw new Error(error.message);
  }

  const save = async () => {
    try {
      const entries = FIELDS.map((f) => ({
        key: `${f.key}:${app}`,
        value: current(f.key),
      }));
      await upsertKeys(entries);
      toast.success(`Saved ${APPS.find((a) => a.id === app)?.label} branding overrides`);
      setDrafts({});
      qc.invalidateQueries({ queryKey: ["per-app-branding"] });
      qc.invalidateQueries({ queryKey: ["brand-identity"] });
      qc.invalidateQueries({ queryKey: ["site-favicon-url"] });
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    }
  };

  const clearOverrides = async () => {
    if (!confirm(`Remove overrides for ${APPS.find((a) => a.id === app)?.label}? It will fall back to the global brand.`)) return;
    try {
      const keys = FIELDS.map((f) => `${f.key}:${app}`);
      const { error } = await supabase.from("site_settings").delete().in("key", keys);
      if (error) throw new Error(error.message);
      toast.success("Overrides removed");
      setDrafts({});
      qc.invalidateQueries({ queryKey: ["per-app-branding"] });
      qc.invalidateQueries({ queryKey: ["brand-identity"] });
      qc.invalidateQueries({ queryKey: ["site-favicon-url"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  };

  const applySync = async () => {
    // Pull the source values (global or another app's overrides, falling back to global)
    const sourceValues: Record<string, string> = {};
    for (const f of FIELDS) {
      if (syncFrom === "global") {
        sourceValues[f.key] = String(raw[f.key] ?? "");
      } else {
        sourceValues[f.key] = String(raw[`${f.key}:${syncFrom}`] ?? raw[f.key] ?? "");
      }
    }
    if (syncFrom === app) {
      toast.error("Source and target apps are the same");
      return;
    }
    try {
      const entries = FIELDS.map((f) => ({
        key: `${f.key}:${app}`,
        value: sourceValues[f.key],
      }));
      await upsertKeys(entries);
      toast.success(`Synced from ${syncFrom === "global" ? "Global" : APPS.find((a) => a.id === syncFrom)?.label}`);
      setDrafts({});
      qc.invalidateQueries({ queryKey: ["per-app-branding"] });
      qc.invalidateQueries({ queryKey: ["brand-identity"] });
      qc.invalidateQueries({ queryKey: ["site-favicon-url"] });
    } catch (e: any) {
      toast.error(e.message ?? "Sync failed");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60 rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Per-app branding</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Set the title, logo, and favicon independently for each app.
                Empty fields fall back to the global brand.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid sm:grid-cols-3 gap-2">
            {APPS.map((a) => (
              <button
                key={a.id}
                onClick={() => { setApp(a.id); setDrafts({}); }}
                className={`text-left rounded-xl border p-3 transition-all ${
                  app === a.id
                    ? "border-primary bg-primary/10"
                    : "border-border/50 hover:border-primary/30 hover:bg-muted/40"
                }`}
              >
                <div className="text-sm font-semibold">{a.label}</div>
                <div className="text-[11px] text-muted-foreground">{a.description}</div>
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {f.label}
                  {!overrides[f.key] && (
                    <span className="ml-2 text-[10px] text-muted-foreground">
                      (using global)
                    </span>
                  )}
                </Label>
                {f.type === "text" ? (
                  <Input
                    value={current(f.key)}
                    placeholder={effective[f.key] || `Global: (empty)`}
                    onChange={(e) => setDraft(f.key, e.target.value)}
                  />
                ) : (
                  <div className="space-y-1">
                    <ImageUpload
                      bucket={f.bucket!}
                      folder={`${f.folder}/${app}`}
                      value={current(f.key)}
                      onUploaded={(url) => setDraft(f.key, url)}
                    />
                    <Input
                      value={current(f.key)}
                      placeholder={effective[f.key] || "https://…"}
                      onChange={(e) => setDraft(f.key, e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 flex flex-wrap items-center gap-2">
            <div className="text-xs">
              <div className="font-semibold flex items-center gap-1.5">
                <Copy className="h-3.5 w-3.5" /> Sync from another source
              </div>
              <p className="text-[11px] text-muted-foreground">
                Copies title, logo, and favicon into <b>{APPS.find((a) => a.id === app)?.label}</b>.
              </p>
            </div>
            <div className="flex-1" />
            <Select value={syncFrom} onValueChange={(v) => setSyncFrom(v as SourceKey)}>
              <SelectTrigger className="w-44 h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global brand</SelectItem>
                {APPS.filter((a) => a.id !== app).map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={applySync}>
              <Copy className="w-3.5 h-3.5 mr-1.5" /> Sync now
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button onClick={save} disabled={Object.keys(drafts).length === 0}>
              <Save className="w-4 h-4 mr-1.5" /> Save overrides
            </Button>
            <Button variant="outline" onClick={() => setDrafts({})} disabled={Object.keys(drafts).length === 0}>
              Discard changes
            </Button>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={clearOverrides}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset to global
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
