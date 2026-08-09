"use client";
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSiteSettings } from "./useSiteSettings";
import { STOREFRONT_LAYOUTS, DEFAULT_STOREFRONT_LAYOUT } from "@/hooks/use-storefront-layout";

const defaults = { storefront_layout: DEFAULT_STOREFRONT_LAYOUT as string };

const PREVIEWS: Record<string, React.ReactElement> = {
  "hero-2col": (
    <div className="space-y-1">
      <div className="h-8 rounded bg-primary/40" />
      <div className="grid grid-cols-2 gap-1">
        <div className="h-6 rounded bg-muted-foreground/30" />
        <div className="h-6 rounded bg-muted-foreground/30" />
        <div className="h-6 rounded bg-muted-foreground/30" />
        <div className="h-6 rounded bg-muted-foreground/30" />
      </div>
    </div>
  ),
  bento: (
    <div className="grid grid-cols-3 grid-rows-3 gap-1 h-[68px]">
      <div className="col-span-2 row-span-2 bg-primary/40 rounded" />
      <div className="bg-muted-foreground/30 rounded" />
      <div className="bg-muted-foreground/30 rounded" />
      <div className="col-span-2 bg-muted-foreground/30 rounded" />
      <div className="bg-muted-foreground/30 rounded" />
    </div>
  ),
  "card-grid": (
    <div className="grid grid-cols-3 gap-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-7 rounded bg-muted-foreground/30" />
      ))}
    </div>
  ),
  "hero-grid": (
    <div className="space-y-1">
      <div className="h-6 rounded bg-primary/40" />
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-5 rounded bg-muted-foreground/30" />
        ))}
      </div>
    </div>
  ),
  magazine: (
    <div className="grid grid-cols-3 gap-1 h-[68px]">
      <div className="col-span-2 row-span-2 bg-primary/40 rounded" />
      <div className="bg-muted-foreground/30 rounded" />
      <div className="bg-muted-foreground/30 rounded" />
      <div className="col-span-3 bg-muted-foreground/30 rounded h-5" />
    </div>
  ),
  instagram: (
    <div className="grid grid-cols-3 gap-px">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="aspect-square bg-muted-foreground/30" />
      ))}
    </div>
  ),
  "scroll-feed": (
    <div className="space-y-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-6 rounded bg-muted-foreground/30" />
      ))}
    </div>
  ),
};

const StorefrontLayoutPanel: React.FC = () => {
  const { form, setForm, save } = useSiteSettings(defaults);
  const current = (form.storefront_layout as string) ?? DEFAULT_STOREFRONT_LAYOUT;

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Shop Layout</CardTitle>
        <CardDescription>
          Choose how products are arranged on the storefront. Applies to the Shop page and product
          lists. Default is "Hero + 2-Column".
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Label className="block">Layout</Label>
        <div
          role="radiogroup"
          aria-label="Storefront layout"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          {STOREFRONT_LAYOUTS.map((l) => {
            const active = current === l.id;
            return (
              <button
                key={l.id}
                role="radio"
                aria-checked={active}
                onClick={() => setForm({ ...form, storefront_layout: l.id })}
                className={`text-left p-3 rounded-xl border transition-all min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  active
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30 shadow-md"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <div className="mb-2 p-2 rounded-lg bg-background/40 border border-border/40">
                  {PREVIEWS[l.id]}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{l.name}</span>
                  {active && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{l.description}</p>
              </button>
            );
          })}
        </div>
        <Button className="w-full" onClick={() => save.mutate(undefined)} disabled={save.isPending}>
          {save.isPending ? "Saving..." : "Save Layout"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default StorefrontLayoutPanel;
// code:4ce0
