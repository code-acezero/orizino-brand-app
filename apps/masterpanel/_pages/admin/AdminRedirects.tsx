"use client";
import React from "react";
import { useSiteSettings } from "@/components/admin/useSiteSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Save } from "lucide-react";

type Redirects = {
  storefront_url?: string;
  company_url?: string;
  masterpanel_url?: string;
  orderops_url?: string;
  shop_url?: string;
  start_shopping_url?: string;
  explore_categories_url?: string;
  shop_label?: string;
  back_to_shop_label?: string;
  back_to_shop_label_short?: string;
};

const defaults = {
  external_redirects: {
    storefront_url: "",
    company_url: "",
    masterpanel_url: "",
    orderops_url: "",
    shop_url: "",
    start_shopping_url: "",
    explore_categories_url: "",
    shop_label: "",
    back_to_shop_label: "",
    back_to_shop_label_short: "",
  } as Redirects,
};

const FIELDS: Array<{ key: keyof Redirects; label: string; help: string; placeholder: string; inputMode?: "url" | "text" }> = [
  { key: "storefront_url", label: "Storefront URL", help: "Origin of the customer-facing shop app.", placeholder: "https://shop.example.com" },
  { key: "company_url", label: "Company URL", help: "Origin of the corporate/landing site.", placeholder: "https://example.com" },
  { key: "masterpanel_url", label: "Master Panel URL", help: "Origin of this admin panel.", placeholder: "https://admin.example.com" },
  { key: "orderops_url", label: "Order Ops URL", help: "Origin of the mobile order management app (dashboard, scanner, online/offline orders).", placeholder: "https://ops.example.com" },
  { key: "shop_url", label: "\"Shop\" / \"Back to Shop\" button URL", help: "Overrides the target for the Shop button in the master panel and landing.", placeholder: "https://shop.example.com/shop" },
  { key: "start_shopping_url", label: "\"Start Shopping\" button URL", help: "Landing page hero CTA target.", placeholder: "https://shop.example.com/shop" },
  { key: "explore_categories_url", label: "\"Explore Categories\" button URL", help: "Landing page categories CTA target.", placeholder: "https://shop.example.com/categories" },
  { key: "shop_label", label: "Company nav \"Shop\" label", help: "Text shown on the Shop button in the company landing top nav. Blank = \"Shop\".", placeholder: "Shop", inputMode: "text" },
  { key: "back_to_shop_label", label: "Master Panel \"Back to Shop\" label", help: "Text shown on the sidebar Back to Shop button (desktop). Blank = \"Back to Shop\".", placeholder: "Back to Shop", inputMode: "text" },
  { key: "back_to_shop_label_short", label: "Master Panel \"Back to Shop\" label (compact)", help: "Text shown on the sidebar Back to Shop button on small screens. Blank = \"Shop\".", placeholder: "Shop", inputMode: "text" },
];

export default function AdminRedirects() {
  const { form, setForm, save } = useSiteSettings(defaults);
  const val = (form.external_redirects || {}) as Redirects;
  const setVal = (k: keyof Redirects, v: string) =>
    setForm((prev) => ({ ...prev, external_redirects: { ...(prev.external_redirects || {}), [k]: v } }));

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <ExternalLink className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Redirects</h1>
          <p className="text-xs text-muted-foreground">Configurable destinations for cross-app buttons (Shop, Start Shopping, Explore Categories…).</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">External URLs</CardTitle>
          <CardDescription>Leave blank to fall back to the default (env or localhost). Values are applied at runtime — no rebuild required.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input
                id={f.key}
                value={val[f.key] ?? ""}
                onChange={(e) => setVal(f.key, e.target.value)}
                placeholder={f.placeholder}
                inputMode={f.inputMode ?? "url"}
              />
              <p className="text-[11px] text-muted-foreground">{f.help}</p>
            </div>
          ))}
          <div className="pt-2">
            <Button onClick={() => save.mutate(["external_redirects"] as any)} disabled={save.isPending}>
              <Save className="w-4 h-4 mr-2" /> Save redirects
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
