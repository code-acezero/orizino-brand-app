"use client";
import { useEffect, useState } from "react";
import { useServerFn } from "@orizino/shared/lib/server-fn-compat";
import { supabase } from "@/integrations/supabase/client";
import { upsertSiteSettings } from "@/lib/admin-data.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/lib/app-toast";
import { ScanLine, Save, ExternalLink } from "lucide-react";
import AdminRoute from "@/components/AdminRoute";

type ScannerConfig = {
  enabled: boolean;
  entry_title: string;
  entry_subtitle: string;
  cta_label: string;
  learn_more_label: string;
  hint_signed_in: string;
  hint_signed_out: string;
  info_hero_title: string;
  info_hero_subtitle: string;
};

const DEFAULTS: ScannerConfig = {
  enabled: true,
  entry_title: "Verify Product",
  entry_subtitle: "Scan the barcode or QR on the tag to confirm authenticity — no sign‑in required.",
  cta_label: "Verify",
  learn_more_label: "Learn more about our scanner",
  hint_signed_in: "You're signed in — verifying a product you purchased shows full order details.",
  hint_signed_out: "Sign in to see full order details for products you purchased. Other customers see only a masked confirmation.",
  info_hero_title: "Every Orizino piece, verifiably genuine.",
  info_hero_subtitle: "Scan the tag on any Orizino product with your phone camera — no app install, no sign-in.",
};

export default function AdminScannerContent() {
  const [cfg, setCfg] = useState<ScannerConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const save = useServerFn(upsertSiteSettings);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "scanner_config").maybeSingle();
      if (data?.value) setCfg({ ...DEFAULTS, ...(data.value as any) });
      setLoading(false);
    })();
  }, []);

  async function onSave() {
    setSaving(true);
    try {
      await save({ data: { entries: [{ key: "scanner_config", value: cfg as any }] } as any });
      toast.success("Scanner content saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminRoute>
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <ScanLine className="w-4 h-4" /> Scanner ecosystem
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Verify page & info content</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Copy shown on the customer-facing <span className="font-mono">/verify</span> scanner and the company{" "}
              <span className="font-mono">/scanner-info</span> page.
            </p>
          </div>
          <Button onClick={onSave} disabled={saving || loading}>
            <Save className="w-4 h-4 mr-2" /> {saving ? "Saving…" : "Save"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Storefront /verify</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium text-sm">Scanner enabled</p>
                <p className="text-xs text-muted-foreground">When off, the /verify page shows a maintenance notice.</p>
              </div>
              <Switch checked={cfg.enabled} onCheckedChange={(v) => setCfg({ ...cfg, enabled: !!v })} />
            </div>

            <Field label="Page title">
              <Input value={cfg.entry_title} onChange={(e) => setCfg({ ...cfg, entry_title: e.target.value })} />
            </Field>
            <Field label="Page subtitle">
              <Textarea rows={2} value={cfg.entry_subtitle} onChange={(e) => setCfg({ ...cfg, entry_subtitle: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Manual entry button">
                <Input value={cfg.cta_label} onChange={(e) => setCfg({ ...cfg, cta_label: e.target.value })} />
              </Field>
              <Field label="Learn more link label">
                <Input value={cfg.learn_more_label} onChange={(e) => setCfg({ ...cfg, learn_more_label: e.target.value })} />
              </Field>
            </div>
            <Field label="Info hint — signed in customer">
              <Textarea rows={2} value={cfg.hint_signed_in} onChange={(e) => setCfg({ ...cfg, hint_signed_in: e.target.value })} />
            </Field>
            <Field label="Info hint — signed out visitor">
              <Textarea rows={2} value={cfg.hint_signed_out} onChange={(e) => setCfg({ ...cfg, hint_signed_out: e.target.value })} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Company /scanner-info <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Hero title">
              <Input value={cfg.info_hero_title} onChange={(e) => setCfg({ ...cfg, info_hero_title: e.target.value })} />
            </Field>
            <Field label="Hero subtitle">
              <Textarea rows={2} value={cfg.info_hero_subtitle} onChange={(e) => setCfg({ ...cfg, info_hero_subtitle: e.target.value })} />
            </Field>
          </CardContent>
        </Card>
      </div>
    </AdminRoute>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
