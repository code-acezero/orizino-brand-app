"use client";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";
import { toast } from "@/lib/app-toast";

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

  return (
    <div className="space-y-6 max-w-4xl">
      <Card className="glass border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="w-4 h-4 text-primary" /> Recommended Combinations
          </CardTitle>
          <CardDescription>Click a recommendation to auto-apply both settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {([
              { layout: "dark-luxury", gallery: "infinity", label: "✨ Luxury Immersive", desc: "Dark luxury + Infinity Loop — premium cinematic experience" },
              { layout: "glass", gallery: "coverflow", label: "🔮 Glass Coverflow", desc: "Glassmorphism + Coverflow — modern & interactive" },
              { layout: "neon", gallery: "parallax-stack", label: "⚡ Neon Stack", desc: "Neon + Parallax Stack — bold, energetic, eye-catching" },
              { layout: "minimal", gallery: "default", label: "🤍 Clean Classic", desc: "Minimal + Classic Gallery — Apple-style simplicity" },
              { layout: "magazine", gallery: "mosaic", label: "📰 Editorial Grid", desc: "Magazine + Mosaic — storytelling, editorial feel" },
              { layout: "glass", gallery: "filmstrip", label: "🎬 Cinematic Film", desc: "Glass + Filmstrip — vintage cinema aesthetic" },
            ] as const).map((rec) => (
              <button
                key={rec.label}
                onClick={() => { setPageLayout(rec.layout); setGalleryStyle(rec.gallery); }}
                className={`text-left p-3 rounded-xl border transition-all text-xs ${
                  pageLayout === rec.layout && galleryStyle === rec.gallery
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-border/50 hover:border-primary/30 hover:bg-secondary/30"
                }`}
              >
                <p className="font-semibold text-foreground">{rec.label}</p>
                <p className="text-muted-foreground mt-0.5 leading-relaxed">{rec.desc}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Page Layout Style</CardTitle>
          <CardDescription>Choose the visual theme for product detail pages.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {([
              { id: "dark-luxury", label: "Dark Luxury", desc: "Deep blacks, gold accents, premium feel with subtle glow effects", emoji: "🖤", preview: "bg-gradient-to-br from-black via-gray-900 to-black" },
              { id: "glass", label: "Glassmorphism", desc: "Frosted glass cards, blur effects, translucent layers with depth", emoji: "🔮", preview: "bg-gradient-to-br from-primary/20 via-background to-primary/10" },
              { id: "neon", label: "Neon Glow", desc: "Vibrant neon accents, electric shadows, cyberpunk energy", emoji: "⚡", preview: "bg-gradient-to-br from-background via-primary/5 to-background" },
              { id: "minimal", label: "Apple Minimal", desc: "Pure whitespace, clean typography, zero decoration", emoji: "🤍", preview: "bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950" },
              { id: "magazine", label: "Editorial Magazine", desc: "Full-width hero, asymmetric grid, storytelling format", emoji: "📰", preview: "bg-gradient-to-br from-amber-50 via-background to-orange-50 dark:from-amber-950/30 dark:via-background dark:to-orange-950/30" },
            ] as const).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setPageLayout(opt.id)}
                className={`text-left rounded-2xl border-2 transition-all overflow-hidden ${
                  pageLayout === opt.id ? "border-primary ring-2 ring-primary/20 scale-[1.02]" : "border-border/50 hover:border-primary/30"
                }`}
              >
                <div className={`h-20 ${opt.preview} relative flex items-center justify-center`}>
                  <span className="text-3xl">{opt.emoji}</span>
                  {pageLayout === opt.id && (
                    <Badge variant="default" className="absolute top-2 right-2 text-[10px] py-0">Active</Badge>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-semibold text-foreground text-sm">{opt.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Image Gallery Style</CardTitle>
          <CardDescription>Choose how product images are displayed.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {([
              { id: "default", label: "Classic Gallery", desc: "Thumbnail strip, zoom lens, lightbox — reliable & familiar", emoji: "🖼️" },
              { id: "infinity", label: "Infinity Loop", desc: "3D GSAP infinite carousel with blur transitions & auto-play", emoji: "♾️" },
              { id: "coverflow", label: "Coverflow 3D", desc: "iTunes-style coverflow with perspective rotation", emoji: "💿" },
              { id: "filmstrip", label: "Filmstrip Cinema", desc: "Vintage film aesthetic with sprocket frames", emoji: "🎬" },
              { id: "mosaic", label: "Grid Mosaic", desc: "Pinterest-style adaptive grid with hover zoom", emoji: "🧩" },
              { id: "parallax-stack", label: "Parallax Stack", desc: "Stacked cards with 3D tilt and depth parallax", emoji: "📚" },
            ] as const).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setGalleryStyle(opt.id)}
                className={`text-left p-4 rounded-2xl border-2 transition-all ${
                  galleryStyle === opt.id ? "border-primary bg-primary/10 ring-1 ring-primary/20" : "border-border/50 hover:border-primary/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{opt.emoji}</span>
                  <p className="font-semibold text-foreground text-sm">{opt.label}</p>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{opt.desc}</p>
                {galleryStyle === opt.id && <Badge variant="default" className="mt-2 text-[10px] py-0">Active</Badge>}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
        {saveMutation.isPending ? "Saving..." : "Save Product Details Layout"}
      </Button>
    </div>
  );
}
// code:4ce0
