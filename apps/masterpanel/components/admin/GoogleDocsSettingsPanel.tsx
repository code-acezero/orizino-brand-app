"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@/lib/server-fn-compat";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileBox, Loader2 } from "lucide-react";
import { toast } from "@/lib/app-toast";
import { getGdocsSettings, updateGdocsSettings } from "@/lib/order-documents.functions";

type Settings = {
  invoice_title_template?: string;
  sticker_title_template?: string;
  auto_archive?: Record<string, boolean>;
  folders?: { pending?: string; paid?: string; delivered?: string };
  edge_url?: string;
  service_role_jwt?: string;
};

const REASONS = ["pending", "paid", "delivered"] as const;
const TYPES = ["invoice", "sticker"] as const;

export default function GoogleDocsSettingsPanel() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(getGdocsSettings);
  const saveFn = useServerFn(updateGdocsSettings);

  const { data, isLoading } = useQuery({
    queryKey: ["gdocs-settings"],
    queryFn: () => fetchFn(),
  });

  const [s, setS] = useState<Settings>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setS(data as Settings);
  }, [data]);

  const auto = s.auto_archive || {};
  const setAuto = (k: string, v: boolean) =>
    setS((prev) => ({ ...prev, auto_archive: { ...(prev.auto_archive || {}), [k]: v } }));

  const save = async () => {
    setSaving(true);
    try {
      await saveFn({ data: s as any });
      toast.success("Google Docs settings saved");
      qc.invalidateQueries({ queryKey: ["gdocs-settings"] });
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileBox className="w-4 h-4 text-primary" /> Google Docs Archive
        </CardTitle>
        <CardDescription>
          Customize doc titles, pick Drive folders per order stage, and auto-save invoices/stickers when orders are placed,
          paid, or delivered.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label>Invoice title template</Label>
                <Input
                  value={s.invoice_title_template || ""}
                  placeholder="Invoice — {{order_number}} — {{brand_name}}"
                  onChange={(e) => setS({ ...s, invoice_title_template: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sticker title template</Label>
                <Input
                  value={s.sticker_title_template || ""}
                  placeholder="Shipping Label — {{order_number}} — {{customer_name}}"
                  onChange={(e) => setS({ ...s, sticker_title_template: e.target.value })}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Variables: <code>{"{{order_number}}"}</code>, <code>{"{{brand_name}}"}</code>,{" "}
                <code>{"{{customer_name}}"}</code>, <code>{"{{status}}"}</code>, <code>{"{{total}}"}</code>,{" "}
                <code>{"{{date}}"}</code>, <code>{"{{trigger}}"}</code>.
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Drive folder IDs</Label>
              <p className="text-xs text-muted-foreground">
                Paste the Drive folder ID (the part after <code>/folders/</code> in the URL). Leave blank to skip filing.
              </p>
              <div className="grid sm:grid-cols-3 gap-2">
                {REASONS.map((r) => (
                  <div key={r} className="space-y-1">
                    <Label className="capitalize text-xs">{r}</Label>
                    <Input
                      value={s.folders?.[r] || ""}
                      placeholder="1AbCd…"
                      onChange={(e) =>
                        setS({ ...s, folders: { ...(s.folders || {}), [r]: e.target.value } })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Auto-archive triggers</Label>
              <div className="rounded-lg border border-border/40 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase">
                    <tr>
                      <th className="text-left px-3 py-2">When order is…</th>
                      {TYPES.map((t) => (
                        <th key={t} className="px-3 py-2 capitalize">{t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {REASONS.map((r) => (
                      <tr key={r} className="border-t border-border/40">
                        <td className="px-3 py-2 capitalize">{r === "pending" ? "placed (pending)" : r}</td>
                        {TYPES.map((t) => {
                          const k = `${r}_${t}`;
                          return (
                            <td key={k} className="px-3 py-2 text-center">
                              <Switch checked={!!auto[k]} onCheckedChange={(v) => setAuto(k, v)} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Auto-archive requires the trigger endpoint below to be filled in (it tells Postgres how to call the edge function).
              </p>
            </div>

            <Separator />

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Edge function base URL</Label>
                <Input
                  value={s.edge_url || ""}
                  placeholder="https://<project>.functions.supabase.co"
                  onChange={(e) => setS({ ...s, edge_url: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Service role JWT (for trigger calls)</Label>
                <Input
                  type="password"
                  value={s.service_role_jwt || ""}
                  placeholder="eyJhbGciOi…"
                  onChange={(e) => setS({ ...s, service_role_jwt: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save Google Docs settings"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
// code:4ce0
