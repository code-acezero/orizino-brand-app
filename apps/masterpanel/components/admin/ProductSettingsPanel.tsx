"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "./useSiteSettings";

const defaults = {
  items_per_page: "12",
  show_stock_count: true,
  low_stock_threshold: "5",
  hide_out_of_stock: false,
  show_sku: true,
  enable_quick_view: true,
  enable_wishlist: true,
  enable_compare: false,
};

export default function ProductSettingsPanel() {
  const { form, setForm, save } = useSiteSettings(defaults);

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="glass">
        <CardHeader>
          <CardTitle>Catalog Display</CardTitle>
          <CardDescription>How products and stock information appear across the storefront.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Products Per Page</Label>
              <Input type="number" value={form.items_per_page} onChange={(e) => setForm({ ...form, items_per_page: e.target.value })} />
            </div>
            <div>
              <Label>Low Stock Threshold</Label>
              <Input type="number" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} placeholder="5" />
            </div>
          </div>

          {[
            { key: "show_stock_count", label: "Show Stock Count", desc: "Display remaining stock on product pages" },
            { key: "hide_out_of_stock", label: "Hide Out-of-Stock Products", desc: "Remove sold-out products from listings entirely" },
            { key: "show_sku", label: "Show SKU", desc: "Display product SKU on the product page" },
            { key: "enable_quick_view", label: "Enable Quick View", desc: "Show quick view modal on product cards" },
            { key: "enable_wishlist", label: "Enable Wishlist", desc: "Let customers save products to their wishlist" },
            { key: "enable_compare", label: "Enable Product Compare", desc: "Side-by-side comparison between products" },
          ].map((row) => (
            <div key={row.key} className="flex items-center justify-between p-3 rounded-xl border border-border/30">
              <div>
                <Label>{row.label}</Label>
                <p className="text-xs text-muted-foreground">{row.desc}</p>
              </div>
              <Switch
                checked={!!(form as any)[row.key]}
                onCheckedChange={(v) => setForm({ ...form, [row.key]: v })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button className="w-full" onClick={() => save.mutate(undefined)} disabled={save.isPending}>
        {save.isPending ? "Saving..." : "Save Product Settings"}
      </Button>
    </div>
  );
}
// code:4ce0
