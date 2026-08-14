"use client";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, Sparkles, Image, Check, Layout } from "lucide-react";
import { toast } from "@/lib/app-toast";
import { useRegisterUniversalSave } from "@/contexts/UniversalSaveContext";

export default function ProductDetailLayoutPanel() {
  const qc = useQueryClient();

  const { data: layoutSettingsRow } = useQuery({
    queryKey: ["admin-product-page-layout"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("key", "product_page_layout")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [pageLayout, setPageLayout] = useState("glass");
  const [galleryStyle, setGalleryStyle] = useState("default");

  useEffect(() => {
    if (layoutSettingsRow?.value) {
      const val = layoutSettingsRow.value as any;
      if (typeof val === "string") {
        setPageLayout(val);
      } else {
        setPageLayout(val?.layout || val?.value || "premium");
        setGalleryStyle(val?.gallery || "default");
      }
    }
  }, [layoutSettingsRow]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const jsonValue = { layout: pageLayout, gallery: galleryStyle } as any;
      if (layoutSettingsRow) {
        await supabase.from("site_settings").update({ value: jsonValue }).eq("id", layoutSettingsRow.id);
      } else {
        await supabase.from("site_settings").insert({ key: "product_page_layout", value: jsonValue });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-product-page-layout"] });
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Product details layout saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  useRegisterUniversalSave(
    {
      label: "Save Product Layout",
      onSave: async () => {
        await saveMutation.mutateAsync();
      },
      isSaving: saveMutation.isPending,
      onReject: () => {
        setPageLayout("glass");
        setGalleryStyle("default");
        toast.warning("Product layout reset to default");
      },
      canReject: true,
    },
    [pageLayout, galleryStyle, saveMutation.isPending]
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-secondary/15 to-background p-6 sm:p-8 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
              <Layers className="w-3 h-3 text-primary" />
              Product Page Experience
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Product Details &amp; Gallery Architecture
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Customize the editorial layout, specs presentation, and high-impact 3D / coverflow image galleries.
          </p>
        </div>
      </div>

      {/* Recommended Combinations */}
      <Card className="border-border/50 bg-card/60 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="py-4 px-5 border-b border-border/40 bg-secondary/15">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Sparkles className="w-4 h-4 text-primary" /> Curated Studio Presets
          </CardTitle>
          <CardDescription className="text-xs">
            One-tap presets to coordinate page aesthetics and gallery styles together.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {([
              { layout: "dark-luxury", gallery: "infinity", label: "Luxury Immersive", desc: "Dark luxury theme + 3D Infinity Loop gallery" },
              { layout: "glass", gallery: "coverflow", label: "Glass Coverflow", desc: "Frosted glassmorphism + 3D Coverflow rotation" },
              { layout: "neon", gallery: "parallax-stack", label: "Neon Stack", desc: "Cyberpunk edge glow + 3D Parallax Stack cards" },
              { layout: "minimal", gallery: "default", label: "Clean Classic", desc: "Pure minimal white + Lightbox Zoom gallery" },
              { layout: "magazine", gallery: "mosaic", label: "Editorial Grid", desc: "Magazine typography + Adaptive mosaic gallery" },
              { layout: "glass", gallery: "filmstrip", label: "Cinematic Film", desc: "Glass styling + Vintage filmstrip sprocket frame" },
            ] as const).map((rec) => {
              const active = pageLayout === rec.layout && galleryStyle === rec.gallery;
              return (
                <button
                  key={rec.label}
                  onClick={() => { setPageLayout(rec.layout); setGalleryStyle(rec.gallery); }}
                  className={`text-left p-3.5 rounded-2xl border transition-all text-xs cursor-pointer flex flex-col justify-between ${
                    active
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-xs"
                      : "border-border/50 hover:border-primary/40 bg-secondary/20 hover:bg-secondary/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-foreground">{rec.label}</p>
                    {active && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">{rec.desc}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Page Layout Style */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Layout className="w-4 h-4 text-primary" /> Visual Surface Style
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {([
            { id: "dark-luxury", label: "Dark Luxury", desc: "Deep blacks, gold accents, premium ambient glow", emoji: "🖤", preview: "bg-gradient-to-br from-black via-zinc-900 to-black" },
            { id: "glass", label: "Glassmorphism", desc: "Frosted translucent cards with smooth backdrop blur", emoji: "🔮", preview: "bg-gradient-to-br from-primary/20 via-background to-primary/10" },
            { id: "neon", label: "Neon Glow", desc: "Vibrant accents, high-contrast dark cyberpunk styling", emoji: "⚡", preview: "bg-gradient-to-br from-background via-primary/10 to-background" },
            { id: "minimal", label: "Apple Minimal", desc: "Pure whitespace, clean precision, zero decoration", emoji: "🤍", preview: "bg-gradient-to-br from-zinc-100 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950" },
            { id: "magazine", label: "Editorial Magazine", desc: "Asymmetric grid, display typography, narrative flow", emoji: "📰", preview: "bg-gradient-to-br from-amber-50 via-background to-orange-50 dark:from-amber-950/30 dark:via-background dark:to-orange-950/30" },
          ] as const).map((opt) => {
            const active = pageLayout === opt.id;
            return (
              <motion.div
                key={opt.id}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setPageLayout(opt.id)}
                className={`text-left rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                  active ? "border-primary ring-2 ring-primary/30 shadow-md bg-primary/5" : "border-border/50 bg-card/60 hover:border-primary/40 hover:bg-card shadow-xs"
                }`}
              >
                <div className={`h-16 ${opt.preview} relative flex items-center justify-center border-b border-border/30`}>
                  <span className="text-2xl">{opt.emoji}</span>
                  {active && (
                    <Badge variant="outline" className="absolute top-2 right-2 text-[9px] font-mono border-primary/30 text-primary bg-background/80">
                      Active
                    </Badge>
                  )}
                </div>
                <div className="p-3.5 space-y-0.5">
                  <p className="font-bold text-foreground text-xs">{opt.label}</p>
                  <p className="text-[10.5px] text-muted-foreground leading-relaxed line-clamp-2">{opt.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Image Gallery Style */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Image className="w-4 h-4 text-primary" /> Image Gallery Engine
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {([
            { id: "default", label: "Classic Gallery", desc: "Thumbnail strip, zoom lens, lightbox — reliable & familiar", emoji: "🖼️" },
            { id: "infinity", label: "Infinity Loop 3D", desc: "3D continuous loop carousel with smooth transitions", emoji: "♾️" },
            { id: "coverflow", label: "Coverflow 3D", desc: "Perspective depth rotation with centered focus", emoji: "💿" },
            { id: "filmstrip", label: "Filmstrip Cinema", desc: "Vintage film aesthetic with sprocket frame borders", emoji: "🎬" },
            { id: "mosaic", label: "Grid Mosaic", desc: "Pinterest-style adaptive masonry with hover zoom", emoji: "🧩" },
            { id: "parallax-stack", label: "Parallax Stack", desc: "Stacked cards with 3D cursor tilt and depth parallax", emoji: "📚" },
          ] as const).map((opt) => {
            const active = galleryStyle === opt.id;
            return (
              <motion.div
                key={opt.id}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setGalleryStyle(opt.id)}
                className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                  active ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-md" : "border-border/50 bg-card/60 hover:border-primary/40 hover:bg-card shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{opt.emoji}</span>
                    <p className="font-bold text-foreground text-xs">{opt.label}</p>
                  </div>
                  {active && <Check className="w-3.5 h-3.5 text-primary" />}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{opt.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
