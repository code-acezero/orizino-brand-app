import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@/lib/server-fn-compat";
import {
  getInvoiceSettings,
  saveInvoiceSettings,
  type InvoiceSettings,
  InvoiceSettingsSchema,
} from "@/lib/invoice-settings.functions";
import {
  renderInvoiceHtml,
  sampleInvoicePayload,
  INVOICE_VARIABLES,
} from "@/lib/invoice-render";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTabParam } from "@/hooks/use-tab-param";
import { StickerSetupTab } from "./AdminProductsManagement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { Receipt, Copy } from "lucide-react";

const PRESETS: Array<{ id: InvoiceSettings["preset"]; label: string; accent: string; heading: string; font: string }> = [
  { id: "classic", label: "Classic",  accent: "#0F172A", heading: "Inter",         font: "Inter" },
  { id: "modern",  label: "Modern",   accent: "#4F46E5", heading: "Space Grotesk", font: "Inter" },
  { id: "minimal", label: "Minimal",  accent: "#000000", heading: "Inter",         font: "Inter" },
  { id: "bold",    label: "Bold",     accent: "#DC2626", heading: "Playfair Display", font: "Inter" },
  { id: "custom",  label: "Custom",   accent: "#0F172A", heading: "Inter",         font: "Inter" },
];

const FIELD_TOGGLES: Array<{ key: keyof InvoiceSettings; label: string; group: string }> = [
  { key: "show_logo", label: "Show brand logo", group: "Header" },
  { key: "show_invoice_number", label: "Invoice number", group: "Header" },
  { key: "show_order_number", label: "Order number", group: "Header" },
  { key: "show_issue_date", label: "Issue date", group: "Header" },
  { key: "show_due_date", label: "Due date", group: "Header" },
  { key: "show_billing_address", label: "Billing address", group: "Customer" },
  { key: "show_shipping_address", label: "Shipping address", group: "Customer" },
  { key: "show_customer_email", label: "Customer email", group: "Customer" },
  { key: "show_customer_phone", label: "Customer phone", group: "Customer" },
  { key: "show_item_sku", label: "Item SKU column", group: "Items" },
  { key: "show_item_image", label: "Item image thumbnail", group: "Items" },
  { key: "show_subtotal", label: "Subtotal", group: "Totals" },
  { key: "show_shipping_fee", label: "Shipping fee", group: "Totals" },
  { key: "show_tax", label: "Tax", group: "Totals" },
  { key: "show_discount", label: "Discount", group: "Totals" },
  { key: "show_total", label: "Grand total", group: "Totals" },
  { key: "show_payment_method", label: "Payment method", group: "Meta" },
  { key: "show_tracking_number", label: "Tracking number", group: "Meta" },
  { key: "show_notes", label: "Notes", group: "Footer" },
  { key: "show_footer", label: "Footer", group: "Footer" },
  { key: "show_brand_mark", label: "Powered-by brand mark", group: "Footer" },
];

export default function AdminInvoiceStickers() {
  const [tab, setTab] = useTabParam("invoice", "/sales/invoice-stickers");
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Receipt className="w-6 h-6" /> Invoice &amp; Stickers
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Design your invoices and stickers. Live preview updates as you edit.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        {/* Switching between Invoice / Order Sticker / Product Serial Sticker
            now happens from the sidebar (Sales ▸ Invoice & Stickers ▸ …) as
            proper sub-items, not a tab strip fighting for space up here —
            kept only to register triggers for the Tabs primitive. */}
        <TabsList className="hidden">
          <TabsTrigger value="invoice">Invoice Designer</TabsTrigger>
          <TabsTrigger value="order-sticker">Order Sticker</TabsTrigger>
          <TabsTrigger value="product-sticker">Product Serial Sticker</TabsTrigger>
        </TabsList>

        <TabsContent value="invoice" className="mt-0">
          <InvoiceDesigner />
        </TabsContent>
        <TabsContent value="order-sticker" className="mt-0">
          <StickerSetupTab kind="order" />
        </TabsContent>
        <TabsContent value="product-sticker" className="mt-0">
          <StickerSetupTab kind="product_serial" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InvoiceDesigner() {
  const fetchSettings = useServerFn(getInvoiceSettings);
  const persist = useServerFn(saveInvoiceSettings);

  const [settings, setSettings] = useState<InvoiceSettings>(() => InvoiceSettingsSchema.parse({}));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const sample = useMemo(() => sampleInvoicePayload(), []);

  useEffect(() => {
    let alive = true;
    fetchSettings()
      .then((s) => { if (alive) setSettings(s); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [fetchSettings]);

  // Live preview
  useEffect(() => {
    const html = renderInvoiceHtml(settings, sample);
    if (previewRef.current) previewRef.current.srcdoc = html;
  }, [settings, sample]);

  function patch<K extends keyof InvoiceSettings>(key: K, value: InvoiceSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function applyPreset(id: InvoiceSettings["preset"]) {
    const p = PRESETS.find((x) => x.id === id) ?? PRESETS[0];
    setSettings((prev) => ({
      ...prev,
      preset: p.id,
      accent_color: p.accent,
      font_family: p.font,
      heading_font_family: p.heading,
    }));
  }

  async function onSave() {
    setSaving(true);
    try {
      const parsed = InvoiceSettingsSchema.parse(settings);
      await persist({ data: parsed });
      toast.success("Invoice design saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, typeof FIELD_TOGGLES>();
    for (const t of FIELD_TOGGLES) {
      if (!map.has(t.group)) map.set(t.group, []);
      map.get(t.group)!.push(t);
    }
    return Array.from(map.entries());
  }, []);

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6">
      {/* Editor */}
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Preset</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {PRESETS.map((p) => (
                <button key={p.id} onClick={() => applyPreset(p.id)}
                  className={`border rounded-lg p-3 text-left transition ${settings.preset === p.id ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/40"}`}>
                  <div className="w-full h-8 rounded mb-2" style={{ background: p.accent }} />
                  <div className="text-sm font-medium">{p.label}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Colors &amp; Typography</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {(["accent_color","text_color","muted_color","bg_color"] as const).map((k) => (
              <div key={k}>
                <Label className="text-xs uppercase tracking-wide">{k.replace(/_/g, " ")}</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={settings[k]} onChange={(e) => patch(k, e.target.value)} className="h-9 w-12 rounded border" />
                  <Input value={settings[k]} onChange={(e) => patch(k, e.target.value)} className="font-mono text-xs" />
                </div>
              </div>
            ))}
            <div>
              <Label className="text-xs">Body font</Label>
              <Input value={settings.font_family} onChange={(e) => patch("font_family", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Heading font</Label>
              <Input value={settings.heading_font_family} onChange={(e) => patch("heading_font_family", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Base font size (px)</Label>
              <Input type="number" min={8} max={24} value={settings.font_size} onChange={(e) => patch("font_size", parseInt(e.target.value) || 12)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Fields to include</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {grouped.map(([group, items]) => (
              <div key={group}>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{group}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {items.map((t) => (
                    <label key={t.key} className="flex items-center justify-between rounded border px-3 py-2 cursor-pointer hover:bg-muted/40">
                      <span className="text-sm">{t.label}</span>
                      <Switch checked={settings[t.key] as boolean} onCheckedChange={(v) => patch(t.key, v as any)} />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Copy</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Header text (optional)</Label>
              <Input value={settings.header_text} onChange={(e) => patch("header_text", e.target.value)} placeholder="e.g. Invoice for services rendered" />
            </div>
            <div>
              <Label className="text-xs">Footer text</Label>
              <Input value={settings.footer_text} onChange={(e) => patch("footer_text", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Default notes</Label>
              <Textarea value={settings.notes_text} onChange={(e) => patch("notes_text", e.target.value)} rows={2} />
            </div>
            <div>
              <Label className="text-xs">Terms &amp; conditions</Label>
              <Textarea value={settings.terms_text} onChange={(e) => patch("terms_text", e.target.value)} rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Advanced: raw HTML / Handlebars</CardTitle>
            <Switch checked={settings.advanced_mode} onCheckedChange={(v) => patch("advanced_mode", v)} />
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Enable to override the template with your own HTML. Handlebars-style
              variables like <code>{"{{order.order_number}}"}</code> and{" "}
              <code>{"{{#each items}}...{{/each}}"}</code> are supported.
            </p>
            <details>
              <summary className="text-xs cursor-pointer">Available variables ({INVOICE_VARIABLES.length})</summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-2 text-xs">
                {INVOICE_VARIABLES.map((v) => (
                  <button key={v.token} type="button" onClick={() => {
                    navigator.clipboard.writeText(v.token);
                    toast.success(`Copied ${v.token}`);
                  }} className="flex items-center justify-between gap-2 border rounded px-2 py-1 hover:bg-muted text-left">
                    <span><code className="text-[10px]">{v.token}</code> <span className="text-muted-foreground">— {v.label}</span></span>
                    <Copy className="w-3 h-3 opacity-50 shrink-0" />
                  </button>
                ))}
              </div>
            </details>
            <Textarea
              value={settings.advanced_html}
              onChange={(e) => patch("advanced_html", e.target.value)}
              disabled={!settings.advanced_mode}
              rows={12}
              className="font-mono text-xs"
              placeholder={`<div class="inv-wrap">\n  <h1>{{brand.name}} — Invoice {{order.invoice_number}}</h1>\n  <p>Total: {{order.currency}}{{order.total}}</p>\n  <ul>\n    {{#each items}}<li>{{this.name}} × {{this.quantity}}</li>{{/each}}\n  </ul>\n</div>`}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 sticky bottom-4 bg-background/95 backdrop-blur border rounded-lg p-3">
          <Button onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save invoice design"}</Button>
        </div>
      </div>

      {/* Preview */}
      <div className="xl:sticky xl:top-4 xl:self-start">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Live preview</CardTitle>
            <span className="text-xs text-muted-foreground">Sample data</span>
          </CardHeader>
          <CardContent className="p-0">
            <iframe ref={previewRef} title="Invoice preview" className="w-full h-[900px] bg-white rounded-b-lg" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
