"use client";
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayoutGrid, Check, ShoppingBag } from "lucide-react";
import { useSiteSettings } from "./useSiteSettings";
import { STOREFRONT_LAYOUTS, DEFAULT_STOREFRONT_LAYOUT } from "@/hooks/use-storefront-layout";
import { useRegisterUniversalSave } from "@/contexts/UniversalSaveContext";
import { toast } from "@/lib/app-toast";

const defaults = { storefront_layout: DEFAULT_STOREFRONT_LAYOUT as string };

const PREVIEWS: Record<string, React.ReactElement> = {
  "hero-2col": (
    <div className="space-y-1.5 w-full">
      <div className="h-7 rounded-md bg-primary/30 border border-primary/20" />
      <div className="grid grid-cols-2 gap-1.5">
        <div className="h-10 rounded-md bg-foreground/15" />
        <div className="h-10 rounded-md bg-foreground/15" />
        <div className="h-10 rounded-md bg-foreground/15" />
        <div className="h-10 rounded-md bg-foreground/15" />
      </div>
    </div>
  ),
  bento: (
    <div className="grid grid-cols-3 grid-rows-3 gap-1.5 h-[80px] w-full">
      <div className="col-span-2 row-span-2 bg-primary/30 rounded-md border border-primary/20" />
      <div className="bg-foreground/15 rounded-md" />
      <div className="bg-foreground/15 rounded-md" />
      <div className="col-span-2 bg-foreground/15 rounded-md" />
      <div className="bg-foreground/15 rounded-md" />
    </div>
  ),
  "card-grid": (
    <div className="grid grid-cols-3 gap-1.5 w-full">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-11 rounded-md bg-foreground/15" />
      ))}
    </div>
  ),
  "hero-grid": (
    <div className="space-y-1.5 w-full">
      <div className="h-6 rounded-md bg-primary/30 border border-primary/20" />
      <div className="grid grid-cols-3 gap-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 rounded-md bg-foreground/15" />
        ))}
      </div>
    </div>
  ),
  magazine: (
    <div className="grid grid-cols-3 gap-1.5 h-[80px] w-full">
      <div className="col-span-2 row-span-2 bg-primary/30 rounded-md border border-primary/20" />
      <div className="bg-foreground/15 rounded-md" />
      <div className="bg-foreground/15 rounded-md" />
      <div className="col-span-3 bg-foreground/15 rounded-md h-6" />
    </div>
  ),
  instagram: (
    <div className="grid grid-cols-3 gap-1 w-full">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="aspect-square bg-foreground/15 rounded-xs" />
      ))}
    </div>
  ),
  "scroll-feed": (
    <div className="space-y-1.5 w-full">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-8 rounded-md bg-foreground/15" />
      ))}
    </div>
  ),
};

const StorefrontLayoutPanel: React.FC = () => {
  const { form, setForm, save, undo, redo, canUndo, canRedo, reject, canReject } = useSiteSettings(defaults);
  const current = (form.storefront_layout as string) ?? DEFAULT_STOREFRONT_LAYOUT;

  useRegisterUniversalSave(
    {
      label: "Save Shop Layout",
      onSave: async () => {
        await save.mutateAsync(undefined);
        toast.success("Shop layout saved");
      },
      isSaving: save.isPending,
      onUndo: undo,
      canUndo: canUndo,
      onRedo: redo,
      canRedo: canRedo,
      onReject: () => {
        reject();
        toast.warning("Layout changes reverted");
      },
      canReject: canReject,
    },
    [form, save.isPending, canUndo, canRedo, canReject]
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-secondary/15 to-background p-6 sm:p-8 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
              <ShoppingBag className="w-3 h-3 text-primary" />
              Catalog Layout Engine
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Shop &amp; Catalog Layout
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Select how inventory and editorial pieces are architected on your primary catalog pages.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {STOREFRONT_LAYOUTS.map((l) => {
          const active = current === l.id;
          return (
            <motion.div
              key={l.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setForm({ ...form, storefront_layout: l.id })}
              className={`relative text-left p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                active
                  ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-md"
                  : "border-border/50 bg-card/60 hover:border-primary/40 hover:bg-card shadow-xs"
              }`}
            >
              <div className="mb-3 p-3 rounded-xl bg-background/60 border border-border/40 flex items-center justify-center min-h-[100px]">
                {PREVIEWS[l.id] || PREVIEWS["hero-2col"]}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">{l.name}</span>
                  {active && (
                    <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/10">
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {l.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default StorefrontLayoutPanel;
