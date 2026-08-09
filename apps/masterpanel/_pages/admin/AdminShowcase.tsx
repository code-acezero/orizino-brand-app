"use client";
import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabParam } from "@/hooks/use-tab-param";
import { TabsWithParam } from "@/components/admin/TabsWithParam";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import ImageUpload from "@/components/ImageUpload";
import VideoUpload from "@/components/VideoUpload";
import { toast } from "@/lib/app-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Settings2, Layers, GripVertical, Copy, Link2, Palette, Wand2, Eye, Monitor, Smartphone, ChevronLeft, ChevronRight, Play, Pause, Image, FileText, Sparkles, LayoutGrid, Type, ArrowUp, ArrowDown, RotateCcw } from "lucide-react";
import ColorPicker from "@/components/ui/color-picker";
import { useDragReorder } from "@/hooks/use-drag-reorder";
import { useServerFn } from "@/lib/server-fn-compat";
import { upsertSiteSettings } from "@/lib/admin-data.functions";

const FONT_FAMILY_MAP: Record<string, string> = {
  "Playfair Display": "'Playfair Display', serif",
  "Space Grotesk": "'Space Grotesk', sans-serif",
  "DM Sans": "'DM Sans', sans-serif",
  "Inter": "'Inter', sans-serif",
  "Agraham": "'Agraham', serif",
  "Bilderberg": "'Bilderberg', serif",
  "Nevera": "'Nevera', sans-serif",
  "OrangeAvenue": "'OrangeAvenue', sans-serif",
  "PrimorStylish": "'PrimorStylish', sans-serif",
  "Goca": "'Goca', sans-serif",
  "Logofontik": "'Logofontik', sans-serif",
};

interface ShowcaseConfig {
  autoplay_speed: number;
  transition_duration: number;
  height: string;
  overlay_style: string;
  overlay_opacity: number;
  text_position: string;
  text_max_width: string;
  ken_burns: boolean;
  idle_motion?: string;
  blur_level?: string;
  title_font?: string;
  show_dots: boolean;
  show_arrows: boolean;
  dot_style: string;
  title_size: string;
  subtitle_style: string;
  cta_style: string;
  border_radius: string;
  autoplay: boolean;
  pause_on_hover: boolean;
  transition_type: string;
  parallax_intensity: number;
  content_animation: string;
  slide_gap: string;
  particle_count: number;
  particle_speed: number;
  particle_size: number;
  show_particles: boolean;
  show_vignette: boolean;
}

const defaultConfig: ShowcaseConfig = {
  autoplay_speed: 6000,
  transition_duration: 800,
  height: "85vh",
  overlay_style: "gradient-left",
  overlay_opacity: 80,
  text_position: "left",
  text_max_width: "2xl",
  ken_burns: true,
  idle_motion: "ken_burns_zoom",
  blur_level: "cinematic",
  title_font: "Playfair Display",
  show_dots: true,
  show_arrows: true,
  dot_style: "pill",
  title_size: "7xl",
  subtitle_style: "badge",
  cta_style: "gradient",
  border_radius: "3xl",
  autoplay: true,
  pause_on_hover: true,
  transition_type: "fade",
  parallax_intensity: 20,
  content_animation: "slide-up",
  slide_gap: "0",
  particle_count: 40,
  particle_speed: 1,
  particle_size: 1,
  show_particles: true,
  show_vignette: true,
};

const emptySlide = {
  title: "",
  subtitle: "",
  description: "",
  image_url: "",
  mobile_image_url: "",
  video_url: "",
  cta_text: "Shop Now",
  cta_link: "/inventory",
  sort_order: 0,
  is_active: true,
  text_color: "",
  transition_type: "fade",
  product_id: null as string | null,
  text_align: "left",
};

/* ── Live Slide Preview ── */
const SlidePreview = ({ slides, config }: { slides: any[]; config: ShowcaseConfig }) => {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  const activeSlides = slides.filter((s) => s.is_active);

  useEffect(() => {
    if (!playing || activeSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % activeSlides.length);
    }, config.autoplay_speed);
    return () => clearInterval(timer);
  }, [playing, activeSlides.length, config.autoplay_speed]);

  useEffect(() => {
    if (current >= activeSlides.length) setCurrent(0);
  }, [activeSlides.length, current]);

  const slide = activeSlides[current];
  if (!slide && activeSlides.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-secondary/20 h-64 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Monitor className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No active slides to preview</p>
        </div>
      </div>
    );
  }

  if (!slide) return null;

  const overlayOpacity = config.overlay_opacity / 100;
  const currentImg = previewDevice === "mobile" ? (slide.mobile_image_url || slide.image_url) : slide.image_url;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-primary" /> Live Slider Preview
        </span>
        <div className="flex items-center gap-1">
          <div className="flex items-center bg-secondary/60 rounded-lg p-0.5 mr-2">
            <button
              onClick={() => setPreviewDevice("desktop")}
              className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-colors ${previewDevice === "desktop" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              title="Desktop view"
            >
              <Monitor className="w-3 h-3" /> Desktop
            </button>
            <button
              onClick={() => setPreviewDevice("mobile")}
              className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-colors ${previewDevice === "mobile" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              title="Mobile view"
            >
              <Smartphone className="w-3 h-3" /> Mobile
            </button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setCurrent((c) => (c - 1 + activeSlides.length) % activeSlides.length)}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setPlaying(!playing)}
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setCurrent((c) => (c + 1) % activeSlides.length)}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className={`relative rounded-xl overflow-hidden border border-border/50 transition-all duration-300 mx-auto ${previewDevice === "mobile" ? "max-w-[280px]" : "w-full"}`} style={{ height: previewDevice === "mobile" ? "400px" : "280px" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${slide.id || current}-${previewDevice}`}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            {currentImg ? (
              <img src={currentImg} alt={slide.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Image className="w-12 h-12 text-muted-foreground/20" />
              </div>
            )}

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-background/30 to-transparent" style={{ opacity: overlayOpacity }} />

            {/* Content */}
            <div className={`absolute inset-0 flex items-center px-6 ${config.text_position === "center" ? "justify-center text-center" : config.text_position === "right" ? "justify-end text-right" : ""}`}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="max-w-sm"
              >
                {slide.subtitle && (
                  <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium mb-2">
                    {slide.subtitle}
                  </span>
                )}
                <h3
                  className="text-xl font-bold leading-tight"
                  style={{
                    fontFamily: config.title_font ? (FONT_FAMILY_MAP[config.title_font] || config.title_font) : undefined,
                    color: slide.text_color || undefined,
                  }}
                >
                  {slide.title || "Slide Title"}
                </h3>
                {slide.description && (
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{slide.description}</p>
                )}
                {slide.cta_text && (
                  <span className="inline-block mt-3 text-[10px] px-3 py-1 rounded-full bg-primary text-primary-foreground font-semibold">
                    {slide.cta_text}
                  </span>
                )}
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        {activeSlides.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {activeSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/60"
                }`}
              />
            ))}
          </div>
        )}

        {/* Slide counter */}
        <div className="absolute top-3 right-3 z-10">
          <Badge variant="secondary" className="text-[10px] gap-1 bg-background/60 backdrop-blur-sm">
            {current + 1}/{activeSlides.length}
          </Badge>
        </div>
      </div>
    </div>
  );
};

const AdminShowcase = () => {
  const qc = useQueryClient();
  const saveSiteSettings = useServerFn(upsertSiteSettings);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [config, setConfig] = useState<ShowcaseConfig>({ ...defaultConfig });

  const { data: slides = [] } = useQuery({
    queryKey: ["admin-showcase"],
    queryFn: async () => {
      const { data, error } = await supabase.from("showcase_slides").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["admin-products-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name, thumbnail, slug").eq("is_active", true).order("name").limit(200);
      if (error) throw error;
      return data;
    },
  });

  const { data: configRow } = useQuery({
    queryKey: ["admin-showcase-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").eq("key", "showcase_config").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (configRow?.value) {
      const val = configRow.value as any;
      const c = val?.value ?? val;
      if (c && typeof c === "object") setConfig((prev) => ({ ...prev, ...c }));
    }
  }, [configRow]);

  const saveMutation = useMutation({
    mutationFn: async (slide: any) => {
      const { id, created_at, ...rest } = slide;
      if (id) {
        const { error } = await supabase.from("showcase_slides").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("showcase_slides").insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-showcase"] });
      qc.invalidateQueries({ queryKey: ["showcase-slides"] });
      setDialogOpen(false);
      toast.success("Slide saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("showcase_slides").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-showcase"] });
      qc.invalidateQueries({ queryKey: ["showcase-slides"] });
      toast.success("Slide deleted");
    },
  });

  const saveConfig = useMutation({
    mutationFn: async () => {
      await saveSiteSettings({ data: { entries: [{ key: "showcase_config", value: { value: config } }] } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-showcase-config"] });
      qc.invalidateQueries({ queryKey: ["showcase-config"] });
      toast.success("Showcase settings saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (slide?: any) => {
    setEditing(slide ? { ...slide } : { ...emptySlide, sort_order: slides.length });
    setDialogOpen(true);
  };

  const duplicateSlide = (slide: any) => {
    const { id, created_at, ...rest } = slide;
    setEditing({ ...rest, title: `${rest.title} (copy)`, sort_order: slides.length });
    setDialogOpen(true);
  };

  const reorderSlides = async (reordered: any[]) => {
    const updated = reordered.map((s, i) => ({ ...s, sort_order: i }));
    qc.setQueryData(["admin-showcase"], updated);
    for (const s of updated) {
      await supabase.from("showcase_slides").update({ sort_order: s.sort_order }).eq("id", s.id);
    }
    qc.invalidateQueries({ queryKey: ["admin-showcase"] });
    qc.invalidateQueries({ queryKey: ["showcase-slides"] });
  };

  const { dragIndex: slideDragIdx, overIndex: slideOverIdx, getDragProps: getSlideDragProps } = useDragReorder(slides, reorderSlides);

  const linkedProduct = (productId: string | null) => {
    if (!productId) return null;
    return products.find((p) => p.id === productId);
  };

  const activeSlides = slides.filter((s: any) => s.is_active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Layers className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Showcase Slider</h1>
            <p className="text-xs text-muted-foreground">{slides.length} slide{slides.length !== 1 ? "s" : ""} · {activeSlides.length} active</p>
          </div>
        </div>
        <Button onClick={() => openEdit()} className="gap-2"><Plus className="h-4 w-4" /> Add Slide</Button>
      </div>

      {/* Live Preview Card */}
      <Card className="glass border-primary/10">
        <CardContent className="p-4">
          <SlidePreview slides={slides} config={config} />
        </CardContent>
      </Card>

      <TabsWithParam defaultTab="slides" basePath="/sales/showcase">
        <TabsList>
          <TabsTrigger value="slides" className="flex items-center gap-1"><Layers className="w-4 h-4" /> Slides</TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1"><Settings2 className="w-4 h-4" /> Settings</TabsTrigger>
          <TabsTrigger value="effects" className="flex items-center gap-1"><Wand2 className="w-4 h-4" /> Effects</TabsTrigger>
          <TabsTrigger value="product-showcase" className="flex items-center gap-1"><Sparkles className="w-4 h-4" /> Product Showcase</TabsTrigger>
          <TabsTrigger value="collections-strip" className="flex items-center gap-1"><LayoutGrid className="w-4 h-4" /> Collections Strip</TabsTrigger>
          <TabsTrigger value="marquee-strip" className="flex items-center gap-1"><Type className="w-4 h-4" /> Marquee Strip</TabsTrigger>
        </TabsList>

        {/* Slides Tab - Card Grid */}
        <TabsContent value="slides">
          {slides.length === 0 ? (
            <Card className="glass">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Layers className="w-10 h-10 text-muted-foreground mb-3" />
                <h3 className="font-semibold mb-1">No slides yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Create showcase slides to build your hero slider.</p>
                <Button onClick={() => openEdit()} className="gap-2"><Plus className="h-4 w-4" /> Add Slide</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {slides.map((slide: any, idx: number) => {
                  const product = linkedProduct(slide.product_id);
                  return (
                    <motion.div
                      key={slide.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25, delay: idx * 0.05 }}
                    >
                      <Card
                        className={`glass group transition-all hover:border-primary/30 ${!slide.is_active ? "opacity-50" : ""} ${slideOverIdx === idx && slideDragIdx !== idx ? "ring-2 ring-primary/30" : ""}`}
                        {...getSlideDragProps(idx)}
                      >
                        <CardContent className="p-0">
                          {/* Image */}
                          <div className="relative h-40 overflow-hidden rounded-t-xl cursor-grab active:cursor-grabbing">
                            {slide.image_url ? (
                              <img src={slide.image_url} alt={slide.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                                <Image className="w-8 h-8 text-muted-foreground/30" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />

                            {/* Drag handle */}
                            <div className="absolute top-2 left-2 glass rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>

                            {/* Order badge */}
                            <div className="absolute top-2 right-2">
                              <Badge variant={slide.is_active ? "default" : "secondary"} className="text-[10px]">
                                #{idx + 1} · {slide.is_active ? "Active" : "Draft"}
                              </Badge>
                            </div>

                            {/* Content overlay */}
                            <div className="absolute bottom-2 left-3 right-3">
                              {slide.subtitle && (
                                <span className="inline-block text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium mb-1">{slide.subtitle}</span>
                              )}
                              <h3 className="text-sm font-display font-bold truncate" style={slide.text_color ? { color: slide.text_color } : undefined}>
                                {slide.title || "Untitled Slide"}
                              </h3>
                            </div>
                          </div>

                          {/* Meta */}
                          <div className="p-3 space-y-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant="outline" className="text-[10px]">{slide.transition_type || "fade"}</Badge>
                              {product && (
                                <Badge variant="outline" className="text-[10px] gap-1 text-primary">
                                  <Link2 className="w-2.5 h-2.5" /> {product.name}
                                </Badge>
                              )}
                              {slide.cta_text && (
                                <Badge variant="outline" className="text-[10px]">{slide.cta_text}</Badge>
                              )}
                            </div>

                            {slide.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-2">{slide.description}</p>
                            )}

                            <div className="flex gap-1 pt-1">
                              <Button size="sm" variant="ghost" className="flex-1 h-8 text-xs gap-1" onClick={() => openEdit(slide)}>
                                <Pencil className="w-3 h-3" /> Edit
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8" onClick={() => duplicateSlide(slide)} title="Duplicate">
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-8"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete slide?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete "{slide.title}".</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteMutation.mutate(slide.id)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass">
              <CardHeader><CardTitle className="text-lg">Timing & Playback</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between">
                  <Label>Autoplay</Label>
                  <Switch checked={config.autoplay} onCheckedChange={(v) => setConfig({ ...config, autoplay: v })} />
                </div>
                <div>
                  <Label>Autoplay Speed: {(config.autoplay_speed / 1000).toFixed(1)}s</Label>
                  <Slider value={[config.autoplay_speed]} onValueChange={([v]) => setConfig({ ...config, autoplay_speed: v })} min={2000} max={15000} step={500} className="mt-2" />
                </div>
                <div>
                  <Label>Transition Duration: {config.transition_duration}ms</Label>
                  <Slider value={[config.transition_duration]} onValueChange={([v]) => setConfig({ ...config, transition_duration: v })} min={200} max={2000} step={100} className="mt-2" />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Pause on Hover</Label>
                  <Switch checked={config.pause_on_hover} onCheckedChange={(v) => setConfig({ ...config, pause_on_hover: v })} />
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader><CardTitle className="text-lg">Layout & Dimensions</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label>Height</Label>
                  <Select value={config.height} onValueChange={(v) => setConfig({ ...config, height: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60vh">Short (60vh)</SelectItem>
                      <SelectItem value="70vh">Medium (70vh)</SelectItem>
                      <SelectItem value="85vh">Tall (85vh)</SelectItem>
                      <SelectItem value="100vh">Full Screen</SelectItem>
                      <SelectItem value="500px">500px Fixed</SelectItem>
                      <SelectItem value="700px">700px Fixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Border Radius</Label>
                  <Select value={config.border_radius} onValueChange={(v) => setConfig({ ...config, border_radius: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="xl">Small</SelectItem>
                      <SelectItem value="2xl">Medium</SelectItem>
                      <SelectItem value="3xl">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Text Position</Label>
                  <Select value={config.text_position} onValueChange={(v) => setConfig({ ...config, text_position: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Text Max Width</Label>
                  <Select value={config.text_max_width} onValueChange={(v) => setConfig({ ...config, text_max_width: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lg">Narrow</SelectItem>
                      <SelectItem value="xl">Medium</SelectItem>
                      <SelectItem value="2xl">Wide</SelectItem>
                      <SelectItem value="4xl">Extra Wide</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader><CardTitle className="text-lg">Overlay & Idle Motion</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label>Idle Motion Effect</Label>
                  <Select value={config.idle_motion || "ken_burns_zoom"} onValueChange={(v) => setConfig({ ...config, idle_motion: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ken_burns_zoom">Ken Burns Zoom (Slow Scale)</SelectItem>
                      <SelectItem value="subtle_drift">Subtle Ambient Drift</SelectItem>
                      <SelectItem value="floating_pan">Horizontal Pan & Floating</SelectItem>
                      <SelectItem value="none">None (Stationary)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Transition Blur Effect</Label>
                  <Select value={config.blur_level || "cinematic"} onValueChange={(v) => setConfig({ ...config, blur_level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cinematic">Cinematic Blur (Heavy)</SelectItem>
                      <SelectItem value="subtle">Subtle Blur</SelectItem>
                      <SelectItem value="none">Disabled (Sharp)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Overlay Style</Label>
                  <Select value={config.overlay_style} onValueChange={(v) => setConfig({ ...config, overlay_style: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gradient-left">Gradient Left</SelectItem>
                      <SelectItem value="gradient-right">Gradient Right</SelectItem>
                      <SelectItem value="gradient-bottom">Gradient Bottom</SelectItem>
                      <SelectItem value="gradient-center">Vignette</SelectItem>
                      <SelectItem value="solid">Solid Overlay</SelectItem>
                      <SelectItem value="none">No Overlay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Overlay Opacity: {config.overlay_opacity}%</Label>
                  <Slider value={[config.overlay_opacity]} onValueChange={([v]) => setConfig({ ...config, overlay_opacity: v })} min={0} max={100} step={5} className="mt-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader><CardTitle className="text-lg">Typography & Controls</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label>Title Font Family</Label>
                  <Select value={config.title_font || "Playfair Display"} onValueChange={(v) => setConfig({ ...config, title_font: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Playfair Display">Playfair Display (Serif)</SelectItem>
                      <SelectItem value="Space Grotesk">Space Grotesk (Modern Display)</SelectItem>
                      <SelectItem value="DM Sans">DM Sans (Clean Sans)</SelectItem>
                      <SelectItem value="Inter">Inter (Neutral Sans)</SelectItem>
                      <SelectItem value="Agraham">Agraham (Editorial Display)</SelectItem>
                      <SelectItem value="Bilderberg">Bilderberg (Vintage Serif)</SelectItem>
                      <SelectItem value="Nevera">Nevera (Futuristic Sans)</SelectItem>
                      <SelectItem value="OrangeAvenue">OrangeAvenue (Brand Script)</SelectItem>
                      <SelectItem value="PrimorStylish">PrimorStylish (Stylish Condensed)</SelectItem>
                      <SelectItem value="Goca">Goca (Condensed Bold)</SelectItem>
                      <SelectItem value="Logofontik">Logofontik (Monospaced Tech)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Title Size</Label>
                  <Select value={config.title_size} onValueChange={(v) => setConfig({ ...config, title_size: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4xl">Small</SelectItem>
                      <SelectItem value="5xl">Medium</SelectItem>
                      <SelectItem value="6xl">Large</SelectItem>
                      <SelectItem value="7xl">XL</SelectItem>
                      <SelectItem value="8xl">Huge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subtitle Style</Label>
                  <Select value={config.subtitle_style} onValueChange={(v) => setConfig({ ...config, subtitle_style: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="badge">Badge / Pill</SelectItem>
                      <SelectItem value="text">Plain Text</SelectItem>
                      <SelectItem value="underline">Underlined</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>CTA Button Style</Label>
                  <Select value={config.cta_style} onValueChange={(v) => setConfig({ ...config, cta_style: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gradient">Gradient</SelectItem>
                      <SelectItem value="solid">Solid</SelectItem>
                      <SelectItem value="outline">Outline</SelectItem>
                      <SelectItem value="ghost">Ghost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Show Dots</Label>
                  <Switch checked={config.show_dots} onCheckedChange={(v) => setConfig({ ...config, show_dots: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Show Arrows</Label>
                  <Switch checked={config.show_arrows} onCheckedChange={(v) => setConfig({ ...config, show_arrows: v })} />
                </div>
                <div>
                  <Label>Dot Style</Label>
                  <Select value={config.dot_style} onValueChange={(v) => setConfig({ ...config, dot_style: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pill">Pill</SelectItem>
                      <SelectItem value="circle">Circle</SelectItem>
                      <SelectItem value="dash">Dash</SelectItem>
                      <SelectItem value="number">Numbered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
          <Button className="w-full mt-6" onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending}>
            {saveConfig.isPending ? "Saving..." : "Save Showcase Settings"}
          </Button>
        </TabsContent>

        {/* Effects Tab */}
        <TabsContent value="effects">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-lg">Transition Effects</CardTitle>
                <CardDescription>Global default transition for all slides</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label>Default Transition</Label>
                  <Select value={config.transition_type} onValueChange={(v) => setConfig({ ...config, transition_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fade">Fade</SelectItem>
                      <SelectItem value="slide">Slide</SelectItem>
                      <SelectItem value="zoom">Zoom</SelectItem>
                      <SelectItem value="flip">Flip</SelectItem>
                      <SelectItem value="blur">Blur Fade</SelectItem>
                      <SelectItem value="cube">Cube</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Content Animation</Label>
                  <Select value={config.content_animation} onValueChange={(v) => setConfig({ ...config, content_animation: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slide-up">Slide Up</SelectItem>
                      <SelectItem value="slide-left">Slide Left</SelectItem>
                      <SelectItem value="fade-in">Fade In</SelectItem>
                      <SelectItem value="scale-up">Scale Up</SelectItem>
                      <SelectItem value="typewriter">Typewriter</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-lg">Visual Effects</CardTitle>
                <CardDescription>Parallax, particles, and image effects</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between">
                  <Label>Ken Burns Effect</Label>
                  <Switch checked={config.ken_burns} onCheckedChange={(v) => setConfig({ ...config, ken_burns: v })} />
                </div>
                <div>
                  <Label>Parallax Intensity: {config.parallax_intensity}%</Label>
                  <Slider value={[config.parallax_intensity]} onValueChange={([v]) => setConfig({ ...config, parallax_intensity: v })} min={0} max={50} step={5} className="mt-2" />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Vignette Border</Label>
                  <Switch checked={config.show_vignette} onCheckedChange={(v) => setConfig({ ...config, show_vignette: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Dust Particles</Label>
                  <Switch checked={config.show_particles} onCheckedChange={(v) => setConfig({ ...config, show_particles: v })} />
                </div>
                {config.show_particles && (
                  <>
                    <div>
                      <Label>Particle Count: {config.particle_count}</Label>
                      <Slider value={[config.particle_count]} onValueChange={([v]) => setConfig({ ...config, particle_count: v })} min={10} max={120} step={5} className="mt-2" />
                    </div>
                    <div>
                      <Label>Particle Speed: {config.particle_speed}x</Label>
                      <Slider value={[config.particle_speed]} onValueChange={([v]) => setConfig({ ...config, particle_speed: v })} min={0.2} max={3} step={0.2} className="mt-2" />
                    </div>
                    <div>
                      <Label>Particle Size: {config.particle_size}x</Label>
                      <Slider value={[config.particle_size]} onValueChange={([v]) => setConfig({ ...config, particle_size: v })} min={0.5} max={3} step={0.25} className="mt-2" />
                    </div>
                  </>
                )}
                <div>
                  <Label>Slide Gap</Label>
                  <Select value={config.slide_gap} onValueChange={(v) => setConfig({ ...config, slide_gap: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No Gap</SelectItem>
                      <SelectItem value="4">Small</SelectItem>
                      <SelectItem value="8">Medium</SelectItem>
                      <SelectItem value="16">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
          <Button className="w-full mt-6" onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending}>
            {saveConfig.isPending ? "Saving..." : "Save Effects Settings"}
          </Button>
        </TabsContent>

        {/* Product Showcase Tab */}
        <TabsContent value="product-showcase">
          <ProductShowcaseTab />
        </TabsContent>

        {/* Collections Strip Tab */}
        <TabsContent value="collections-strip">
          <CollectionShowcaseTab />
        </TabsContent>

        {/* Marquee Strip Tab */}
        <TabsContent value="marquee-strip">
          <MarqueeStripTab />
        </TabsContent>
      </TabsWithParam>

      {/* Slide Editor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Slide" : "Add Slide"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Form */}
              <div className="space-y-4">
                <div><Label>Title</Label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Discover the Future" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Subtitle</Label><Input value={editing.subtitle || ""} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} placeholder="New Arrivals" /></div>
                  <div>
                    <Label>Transition</Label>
                    <Select value={editing.transition_type || "fade"} onValueChange={(v) => setEditing({ ...editing, transition_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fade">Fade</SelectItem>
                        <SelectItem value="slide">Slide</SelectItem>
                        <SelectItem value="zoom">Zoom</SelectItem>
                        <SelectItem value="flip">Flip</SelectItem>
                        <SelectItem value="blur">Blur</SelectItem>
                        <SelectItem value="cube">Cube</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Description</Label><Textarea value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
                <div>
                  <Label>Desktop Image</Label>
                  <ImageUpload bucket="banners" folder="showcase" value={editing.image_url} onUploaded={(url) => setEditing({ ...editing, image_url: url })} />
                </div>
                <div>
                  <Label>Mobile Image (optional — portrait/mobile aspect ratio)</Label>
                  <ImageUpload bucket="banners" folder="showcase-mobile" value={editing.mobile_image_url || ""} onUploaded={(url) => setEditing({ ...editing, mobile_image_url: url })} />
                </div>
                <div>
                  <Label>Video (optional — plays instead of the image if set)</Label>
                  <VideoUpload bucket="banners" folder="showcase-video" value={editing.video_url ?? ""} onUploaded={(url) => setEditing({ ...editing, video_url: url })} />
                </div>

                <Card className="border-border/50">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-primary" />
                      <Label className="font-medium">Link to Product</Label>
                    </div>
                    <Select
                      value={editing.product_id || "none"}
                      onValueChange={(v) => {
                        const product = products.find(p => p.id === v);
                        setEditing({
                          ...editing,
                          product_id: v === "none" ? null : v,
                          cta_link: product ? `/product/${product.slug}` : editing.cta_link,
                        });
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="No product linked" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No product linked</SelectItem>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-3">
                  <div><Label>CTA Text</Label><Input value={editing.cta_text || ""} onChange={(e) => setEditing({ ...editing, cta_text: e.target.value })} /></div>
                  <div><Label>CTA Link</Label><Input value={editing.cta_link || ""} onChange={(e) => setEditing({ ...editing, cta_link: e.target.value })} /></div>
                </div>

                <div>
                  <Label>Text & Button Alignment</Label>
                  <Select value={editing.text_align || "left"} onValueChange={(v) => setEditing({ ...editing, text_align: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Card className="border-border/50">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-accent" />
                      <Label className="font-medium">Style Overrides</Label>
                    </div>
                    <div className="space-y-3">
                      <ColorPicker label="Text Color" value={editing.text_color || ""} onChange={(c) => setEditing({ ...editing, text_color: c })} />
                      <div>
                        <Label className="text-xs text-muted-foreground">Sort Order</Label>
                        <Input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-center gap-2">
                  <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                  <Label>Active</Label>
                </div>
                <Button className="w-full" onClick={() => saveMutation.mutate(editing)} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : "Save Slide"}
                </Button>
              </div>

              {/* Right: Live Preview */}
              <div className="space-y-4">
                <div className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                  <Eye className="w-3.5 h-3.5 text-primary" /> Slide Preview
                </div>
                <div className="relative rounded-xl overflow-hidden border border-border/50 h-52">
                  {editing.image_url ? (
                    <>
                      <img src={editing.image_url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-r from-background/70 to-transparent" />
                      <div className={`absolute inset-0 flex items-end p-4 ${
                        editing.text_align === "center" ? "justify-center text-center" : editing.text_align === "right" ? "justify-end text-right" : ""
                      }`}>
                        <div className={editing.text_align === "center" ? "flex flex-col items-center" : editing.text_align === "right" ? "flex flex-col items-end" : ""}>
                          {editing.subtitle && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary inline-block mb-1">{editing.subtitle}</span>}
                          <h3 className="text-base font-display font-bold" style={editing.text_color ? { color: editing.text_color } : undefined}>{editing.title || "Slide Title"}</h3>
                          {editing.description && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{editing.description}</p>}
                          {editing.cta_text && <span className="inline-block mt-1.5 text-[8px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-medium">{editing.cta_text}</span>}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full bg-secondary/20 flex items-center justify-center">
                      <div className="text-center">
                        <Image className="w-8 h-8 text-muted-foreground/30 mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">Upload an image to preview</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Linked product preview */}
                {editing.product_id && (() => {
                  const product = linkedProduct(editing.product_id);
                  if (!product) return null;
                  return (
                    <Card className="border-primary/20">
                      <CardContent className="p-3 flex items-center gap-3">
                        {product.thumbnail && <img src={product.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                        <div>
                          <p className="text-xs font-medium">{product.name}</p>
                          <p className="text-[10px] text-muted-foreground">Linked product</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Product Showcase Tab Content (rendered inside TabsWithParam but outside Dialog) ── */}
      {/* This is injected via the tab system */}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   Product Showcase Tab — Separate component to keep AdminShowcase clean
   ══════════════════════════════════════════════════════════════ */

interface ShowcaseEntry {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  video_url: string;
  markdown_specs: string;
  product_id: string | null;
  cta_text: string;
  cta_link: string;
  layout_type?: "auto" | "featured" | "tall" | "wide" | "square";
  card_style?: "glass" | "dark" | "cherry" | "minimal";
  show_gallery?: boolean;
  is_active: boolean;
  sort_order: number;
}

const emptyEntry: ShowcaseEntry = {
  id: "",
  title: "",
  subtitle: "",
  image_url: "",
  video_url: "",
  markdown_specs: "Fabric: 100% Premium Cotton\nWeight: 240+ GSM Heavyweight\nFit: Oversized Drop Shoulder",
  product_id: null,
  cta_text: "Explore Piece",
  cta_link: "/inventory",
  layout_type: "auto",
  card_style: "glass",
  show_gallery: false,
  is_active: true,
  sort_order: 0,
};

export function ProductShowcaseTab() {
  const qc = useQueryClient();
  const saveSiteSettings = useServerFn(upsertSiteSettings);
  const [entries, setEntries] = useState<ShowcaseEntry[]>([]);
  const [editing, setEditing] = useState<ShowcaseEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Load existing config
  const { data: savedConfig, isLoading } = useQuery({
    queryKey: ["product-showcase-config-admin"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "product_showcase_config")
        .maybeSingle();
      if (!data?.value) return [];
      const val = data.value as any;
      const parsed = val?.value ?? val;
      return Array.isArray(parsed) ? parsed : [];
    },
  });

  useEffect(() => {
    if (savedConfig) setEntries(savedConfig as ShowcaseEntry[]);
  }, [savedConfig]);

  // Products list for linking
  const { data: products = [] } = useQuery({
    queryKey: ["admin-products-list"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, thumbnail, slug").eq("is_active", true).order("name").limit(200);
      return data || [];
    },
  });

  const saveEntries = async (updated: ShowcaseEntry[]) => {
    setEntries(updated);
    try {
      await saveSiteSettings({ data: { key: "product_showcase_config", value: updated } });
      qc.invalidateQueries({ queryKey: ["product-showcase-config"] });
      toast.success("Product showcase saved");
    } catch {
      toast.error("Failed to save");
    }
  };

  const openEdit = (entry?: ShowcaseEntry) => {
    setEditing(entry || { ...emptyEntry, id: crypto.randomUUID(), sort_order: entries.length });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!editing) return;
    const exists = entries.find((e) => e.id === editing.id);
    const updated = exists
      ? entries.map((e) => (e.id === editing.id ? editing : e))
      : [...entries, editing];
    saveEntries(updated);
    setDialogOpen(false);
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    saveEntries(entries.filter((e) => e.id !== id));
  };

  const handleToggle = (id: string) => {
    saveEntries(entries.map((e) => (e.id === id ? { ...e, is_active: !e.is_active } : e)));
  };

  const moveEntry = (idx: number, dir: -1 | 1) => {
    const arr = [...entries];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= arr.length) return;
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    arr.forEach((e, i) => (e.sort_order = i));
    saveEntries(arr);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Bento Style Product Showcase</h3>
          <p className="text-xs text-muted-foreground">Dynamic Bento grid sections with media uploads (images or video), spec tags, product linking, and custom card spans.</p>
        </div>
        <Button onClick={() => openEdit()} className="gap-2" size="sm">
          <Plus className="h-4 w-4" /> Add Bento Card
        </Button>
      </div>

      {entries.length === 0 && !isLoading && (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="w-10 h-10 text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">No Bento Cards yet</h3>
            <p className="text-xs text-muted-foreground mb-4">Create dynamic bento showcase cards with custom images/videos and product specs.</p>
            <Button onClick={() => openEdit()} size="sm">Create First Bento Card</Button>
          </CardContent>
        </Card>
      )}

      {/* Entries List */}
      <div className="space-y-3">
        {entries
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((entry, idx) => {
            const product = products.find((p: any) => p.id === entry.product_id);
            return (
              <Card key={entry.id} className={`glass ${!entry.is_active ? "opacity-50" : ""}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  {/* Thumbnail */}
                  <div className="w-20 h-14 rounded-lg overflow-hidden bg-secondary/30 shrink-0 border border-border/50">
                    {entry.image_url ? (
                      <img src={entry.image_url} alt="" className="w-full h-full object-cover" />
                    ) : entry.video_url ? (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Play className="w-5 h-5 text-primary" />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Image className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{entry.title || "Untitled Bento Card"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {product ? `Linked: ${product.name}` : entry.subtitle || "No product linked"}
                    </p>
                    <div className="flex gap-1.5 mt-1">
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 uppercase">
                        {entry.layout_type || "auto"}
                      </Badge>
                      {entry.image_url && <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Image</Badge>}
                      {entry.video_url && <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Video</Badge>}
                      {entry.markdown_specs && <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Specs</Badge>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveEntry(idx, -1)} disabled={idx === 0}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveEntry(idx, 1)} disabled={idx === entries.length - 1}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Switch checked={entry.is_active} onCheckedChange={() => handleToggle(entry.id)} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(entry)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Bento Card?</AlertDialogTitle>
                          <AlertDialogDescription>This will remove this card from the home page Bento showcase.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(entry.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id && entries.find((e) => e.id === editing.id) ? "Edit" : "Add"} Bento Card</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-5">
              {/* Title & Subtitle */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Inspired Ken Kaneki Oversized" />
                </div>
                <div className="space-y-2">
                  <Label>Subtitle</Label>
                  <Input value={editing.subtitle} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} placeholder="200+ GSM European Fit Bone White" />
                </div>
              </div>

              {/* Layout & Style Selectors */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bento Card Grid Span</Label>
                  <Select value={editing.layout_type || "auto"} onValueChange={(v: any) => setEditing({ ...editing, layout_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (Dynamic Ratio)</SelectItem>
                      <SelectItem value="featured">Featured Hero (2x2 Span)</SelectItem>
                      <SelectItem value="tall">Tall Portrait (1x2 Span)</SelectItem>
                      <SelectItem value="wide">Wide Landscape (2x1 Span)</SelectItem>
                      <SelectItem value="square">Square Standard (1x1 Span)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Card Aesthetic Style</Label>
                  <Select value={editing.card_style || "glass"} onValueChange={(v: any) => setEditing({ ...editing, card_style: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="glass">Default Glass Overlay</SelectItem>
                      <SelectItem value="dark">Dark Obsidian</SelectItem>
                      <SelectItem value="cherry">Cherry Accent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Hero Image */}
              <div className="space-y-2">
                <Label>Bento Card Image (Separate upload)</Label>
                <ImageUpload value={editing.image_url} onUploaded={(url) => setEditing({ ...editing, image_url: url || "" })} bucket="showcase" />
              </div>

              {/* Hero Video */}
              <div className="space-y-2">
                <Label>Bento Card Video (Separate upload, overrides image)</Label>
                <VideoUpload value={editing.video_url} onUploaded={(url) => setEditing({ ...editing, video_url: url || "" })} bucket="showcase" />
              </div>

              {/* Link Product */}
              <div className="space-y-2">
                <Label>Link to Product (Select Product for auto CTA / Price)</Label>
                <Select
                  value={editing.product_id || "none"}
                  onValueChange={(v) => {
                    const prod = products.find((p: any) => p.id === v);
                    setEditing({
                      ...editing,
                      product_id: v === "none" ? null : v,
                      cta_link: prod ? `/product/${prod.slug}` : editing.cta_link,
                    });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select a product..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No product linked (Custom link)</SelectItem>
                    {products.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Gallery Carousel Toggle — only visible when a product is linked */}
              {editing.product_id && editing.product_id !== "none" && (
                <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-secondary/20">
                  <div>
                    <p className="text-sm font-medium">Show Product Gallery Carousel</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Uses the linked product's uploaded gallery images as an interactive carousel in the card. Overrides custom image/video.</p>
                  </div>
                  <Switch
                    checked={!!editing.show_gallery}
                    onCheckedChange={(v) => setEditing({ ...editing, show_gallery: v })}
                  />
                </div>
              )}

              {/* CTA */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CTA Button Text</Label>
                  <Input value={editing.cta_text} onChange={(e) => setEditing({ ...editing, cta_text: e.target.value })} placeholder="Explore Piece" />
                </div>
                <div className="space-y-2">
                  <Label>CTA Button Link</Label>
                  <Input value={editing.cta_link} onChange={(e) => setEditing({ ...editing, cta_link: e.target.value })} placeholder="/product/slug" />
                </div>
              </div>

              {/* Markdown Specs */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><FileText className="w-4 h-4" /> Product Specifications (Markdown)</Label>
                <p className="text-[10px] text-muted-foreground">Use "Key: Value" pairs, "- bullet points", or "## Headings". This renders as an editorial spec sheet overlaid on the showcase.</p>
                <div className="grid grid-cols-2 gap-3">
                  <Textarea
                    value={editing.markdown_specs}
                    onChange={(e) => setEditing({ ...editing, markdown_specs: e.target.value })}
                    className="min-h-[200px] font-mono text-xs"
                    placeholder={"Fabric: 100% Premium Cotton\nWeight: 220+ GSM Heavyweight\nFit: Oversized Drop Shoulder\n\n## Construction\n- Reinforced double-needle stitching\n- Pre-shrunk garment"}
                  />
                  <div className="border rounded-lg p-4 bg-secondary/20 min-h-[200px] overflow-y-auto">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2">Preview</p>
                    {editing.markdown_specs?.split("\n").map((line, i) => {
                      const t = line.trim();
                      if (!t) return null;
                      if (t.startsWith("### ")) return <h4 key={i} className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2 mb-1">{t.slice(4)}</h4>;
                      if (t.startsWith("## ")) return <h3 key={i} className="text-xs font-semibold mt-3 mb-1">{t.slice(3)}</h3>;
                      if (t.startsWith("- ") || t.startsWith("* ")) return (
                        <div key={i} className="flex items-center gap-2 py-0.5">
                          <span className="w-3 h-px bg-primary shrink-0" />
                          <span className="text-[10px]">{t.slice(2)}</span>
                        </div>
                      );
                      if (t.includes(":") && !t.startsWith("http")) {
                        const [key, ...v] = t.split(":");
                        return (
                          <div key={i} className="flex justify-between py-0.5 border-b border-border/30 last:border-0">
                            <span className="text-[9px] text-muted-foreground uppercase">{key.trim()}</span>
                            <span className="text-[10px] font-medium">{v.join(":").trim()}</span>
                          </div>
                        );
                      }
                      return <p key={i} className="text-[10px] text-muted-foreground">{t}</p>;
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave}>Save Entry</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminShowcase;
// code:4ce0

/* ══════════════════════════════════════════════════════════════
   CollectionShowcaseTab — CMS-driven horizontal collection strip
   Saves to site_settings.collection_showcase_config
   ══════════════════════════════════════════════════════════════ */

interface CollectionSlide {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  href: string;          // empty = Coming Soon on storefront
  is_active: boolean;
  sort_order: number;
}

const emptyCollectionSlide: CollectionSlide = {
  id: "",
  title: "",
  subtitle: "",
  image_url: "",
  href: "",
  is_active: true,
  sort_order: 0,
};

export function CollectionShowcaseTab() {
  const qc = useQueryClient();
  const saveSiteSettings = useServerFn(upsertSiteSettings);
  const [slides, setSlides] = useState<CollectionSlide[]>([]);
  const [editing, setEditing] = useState<CollectionSlide | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load from DB
  const { data: savedConfig, isLoading } = useQuery({
    queryKey: ["collection-showcase-config-admin"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "collection_showcase_config")
        .maybeSingle();
      if (!data?.value) return [];
      const val = data.value as any;
      const parsed = val?.value ?? val;
      return Array.isArray(parsed) ? parsed : [];
    },
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (savedConfig) setSlides(savedConfig as CollectionSlide[]);
  }, [savedConfig]);

  // Load products for link suggestions
  const { data: products = [] } = useQuery({
    queryKey: ["products-for-collection-link"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, slug").eq("is_active", true).limit(200);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-for-collection-link"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, slug").eq("is_active", true).limit(100);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const saveAll = async (updated: CollectionSlide[]) => {
    setSaving(true);
    try {
      await saveSiteSettings({ key: "collection_showcase_config", value: updated });
      qc.invalidateQueries({ queryKey: ["collection-showcase-config"] });
      qc.invalidateQueries({ queryKey: ["collection-showcase-config-admin"] });
      toast.success("Collections strip saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const openNew = () => {
    setEditing({ ...emptyCollectionSlide, id: crypto.randomUUID(), sort_order: slides.length });
    setDialogOpen(true);
  };

  const openEdit = (slide: CollectionSlide) => {
    setEditing({ ...slide });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!editing) return;
    const updated = slides.find((s) => s.id === editing.id)
      ? slides.map((s) => (s.id === editing.id ? editing : s))
      : [...slides, editing];
    setSlides(updated);
    saveAll(updated);
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    const updated = slides.filter((s) => s.id !== id);
    setSlides(updated);
    saveAll(updated);
  };

  const toggleActive = (id: string) => {
    const updated = slides.map((s) => s.id === id ? { ...s, is_active: !s.is_active } : s);
    setSlides(updated);
    saveAll(updated);
  };

  const moveSlide = (id: string, dir: -1 | 1) => {
    const idx = slides.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= slides.length) return;
    const updated = [...slides];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    const reordered = updated.map((s, i) => ({ ...s, sort_order: i }));
    setSlides(reordered);
    saveAll(reordered);
  };

  const sorted = [...slides].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Collections Strip</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Horizontal drag-scroll strip below the hero. Cards without a CTA link will show "Coming Soon" on the storefront.</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Add Card</Button>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Loading...</div>
      ) : sorted.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <LayoutGrid className="w-10 h-10 text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">No collection cards yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Add cards to populate the collections strip on the homepage.</p>
            <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Add First Card</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((slide, idx) => (
            <Card key={slide.id} className={`glass overflow-hidden ${!slide.is_active ? "opacity-50" : ""}`}>
              {/* Thumbnail */}
              <div className="relative h-40 bg-secondary/30">
                {slide.image_url ? (
                  <img src={slide.image_url} alt={slide.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                {/* Coming Soon badge */}
                {!slide.href?.trim() && (
                  <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm text-[9px] uppercase tracking-widest text-cherry px-2 py-0.5 rounded-full border border-cherry/30">
                    Coming Soon
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <button onClick={() => moveSlide(slide.id, -1)} disabled={idx === 0} className="w-6 h-6 rounded bg-background/70 text-foreground flex items-center justify-center disabled:opacity-30">
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <button onClick={() => moveSlide(slide.id, 1)} disabled={idx === sorted.length - 1} className="w-6 h-6 rounded bg-background/70 text-foreground flex items-center justify-center disabled:opacity-30">
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{slide.title || <span className="text-muted-foreground italic">Untitled</span>}</p>
                    {slide.subtitle && <p className="text-xs text-muted-foreground truncate">{slide.subtitle}</p>}
                    {slide.href ? (
                      <p className="text-[10px] text-cherry/80 truncate mt-0.5">→ {slide.href}</p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground mt-0.5">No link — shows Coming Soon</p>
                    )}
                  </div>
                  <Switch checked={slide.is_active} onCheckedChange={() => toggleActive(slide.id)} />
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(slide)} className="flex-1 gap-1">
                    <Pencil className="w-3 h-3" /> Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive" className="gap-1"><Trash2 className="w-3 h-3" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete card?</AlertDialogTitle>
                        <AlertDialogDescription>This will remove "{slide.title}" from the collections strip.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(slide.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id && slides.find(s => s.id === editing.id) ? "Edit Card" : "Add Card"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              {/* Title & Subtitle */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Essentials" />
                </div>
                <div className="space-y-2">
                  <Label>Subtitle (label above title)</Label>
                  <Input value={editing.subtitle} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} placeholder="Always in season" />
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Card Image</Label>
                <ImageUpload
                  value={editing.image_url}
                  onUploaded={(url) => setEditing({ ...editing, image_url: url || "" })}
                  bucket="showcase"
                />
              </div>

              {/* CTA Link */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  CTA Link <span className="text-muted-foreground font-normal text-xs">(leave empty = Coming Soon)</span>
                </Label>
                <Input
                  value={editing.href}
                  onChange={(e) => setEditing({ ...editing, href: e.target.value })}
                  placeholder="/categories/essentials or /product/slug"
                />
                {/* Quick link pickers */}
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Quick pick — Category</p>
                  <Select
                    value=""
                    onValueChange={(slug) => setEditing({ ...editing, href: `/categories/${slug}` })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select category..." /></SelectTrigger>
                    <SelectContent>
                      {(categories as any[]).map((c) => (
                        <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Quick pick — Product</p>
                  <Select
                    value=""
                    onValueChange={(slug) => setEditing({ ...editing, href: `/product/${slug}` })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select product..." /></SelectTrigger>
                    <SelectContent>
                      {(products as any[]).map((p) => (
                        <SelectItem key={p.id} value={p.slug}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Preview */}
                {!editing.href?.trim() && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-cherry/20">
                    <span className="text-cherry text-xs">⏳</span>
                    <span className="text-xs text-muted-foreground">This card will show a <strong className="text-foreground">Coming Soon</strong> overlay on the storefront.</span>
                  </div>
                )}
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/20">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">Show this card on the storefront</p>
                </div>
                <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving || !editing.title.trim()}>
                  {saving ? "Saving..." : "Save Card"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MarqueeStripTab — CMS-driven ticker marquee words strip
   Saves to site_settings.marquee_config
   ══════════════════════════════════════════════════════════════ */

const DEFAULT_MARQUEE_WORDS = [
  "DROP SHOULDER PERFECTION",
  "CRAFTED IN BANGLADESH",
  "SINCE 2026",
  "PREMIUM COTTON",
  "ENGINEERED FIT",
  "QUIET LUXURY",
  "LIMITED DROPS",
  "WEAR YOUR INTENTION",
];

export function MarqueeStripTab() {
  const qc = useQueryClient();
  const saveSiteSettings = useServerFn(upsertSiteSettings);
  const [words, setWords] = useState<string[]>(DEFAULT_MARQUEE_WORDS);
  const [separator, setSeparator] = useState("✦");
  const [newWord, setNewWord] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: savedConfig, isLoading } = useQuery({
    queryKey: ["marquee-config-admin"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "marquee_config")
        .maybeSingle();
      if (!data?.value) return null;
      const val = data.value as any;
      return val?.value ?? val;
    },
  });

  useEffect(() => {
    if (savedConfig) {
      if (Array.isArray(savedConfig.words) && savedConfig.words.length > 0) {
        setWords(savedConfig.words);
      }
      if (savedConfig.separator) {
        setSeparator(savedConfig.separator);
      }
    }
  }, [savedConfig]);

  const handleAddWord = () => {
    if (!newWord.trim()) return;
    setWords((prev) => [...prev, newWord.trim().toUpperCase()]);
    setNewWord("");
  };

  const handleWordChange = (idx: number, val: string) => {
    setWords((prev) => prev.map((w, i) => (i === idx ? val.toUpperCase() : w)));
  };

  const handleRemoveWord = (idx: number) => {
    setWords((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMoveWord = (from: number, to: number) => {
    if (to < 0 || to >= words.length) return;
    setWords((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const handleResetDefaults = () => {
    setWords(DEFAULT_MARQUEE_WORDS);
    setSeparator("✦");
    toast.info("Reset to brand defaults");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSiteSettings({
        data: {
          key: "marquee_config",
          value: {
            words: words.filter((w) => w.trim().length > 0),
            separator: separator.trim() || "✦",
          },
        },
      });
      qc.invalidateQueries({ queryKey: ["marquee-config"] });
      qc.invalidateQueries({ queryKey: ["marquee-config-admin"] });
      toast.success("Marquee words saved successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to save marquee settings");
    } finally {
      setSaving(false);
    }
  };

  const { data: logoUrl } = useQuery({
    queryKey: ["site-logo-url-admin"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["logo_url", "site_icon_url"]);
      const logoRow = data?.find((d: any) => d.key === "logo_url") || data?.find((d: any) => d.key === "site_icon_url");
      if (!logoRow?.value) return null;
      const val = logoRow.value as any;
      return val?.value ?? val;
    },
  });

  const wordsList = words.flatMap((w) => [w, "__LOGO__"]);
  const previewRepeated = [...wordsList, ...wordsList];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-display font-bold flex items-center gap-2">
            <Type className="w-5 h-5 text-primary" /> Marquee Ticker Words
          </h2>
          <p className="text-xs text-muted-foreground">
            Manage the scrolling promotional brand phrases displayed across the homepage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleResetDefaults} className="gap-1.5 text-xs">
            <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 text-xs">
            {saving ? "Saving..." : "Save Marquee"}
          </Button>
        </div>
      </div>

      {/* Live Preview Strip */}
      <Card className="glass border-primary/20 overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-border/40 bg-secondary/20">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-primary" /> Storefront Live Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative overflow-hidden py-3 select-none bg-primary">
            <div className="marquee-track flex items-center whitespace-nowrap">
              {previewRepeated.map((item, i) => {
                if (item === "__LOGO__") {
                  return logoUrl ? (
                    <span key={i} className="inline-flex items-center px-4 shrink-0">
                      <span
                        className="h-3.5 w-3.5 bg-cream inline-block shrink-0 opacity-80"
                        style={{
                          maskImage: `url("${logoUrl}")`,
                          WebkitMaskImage: `url("${logoUrl}")`,
                          maskSize: "contain",
                          WebkitMaskSize: "contain",
                          maskRepeat: "no-repeat",
                          WebkitMaskRepeat: "no-repeat",
                          maskPosition: "center",
                          WebkitMaskPosition: "center",
                        }}
                        role="img"
                      />
                    </span>
                  ) : (
                    <span key={i} className="inline-block px-4 opacity-50 text-xs">
                      ✦
                    </span>
                  );
                }

                return (
                  <span
                    key={i}
                    className="inline-block px-5 font-sans-brand text-[0.65rem] font-medium tracking-[0.2em] uppercase text-cream"
                  >
                    {item}
                  </span>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Phrases List */}
        <Card className="glass lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Marquee Phrases ({words.length})</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Reorder or edit individual brand slogans. Words are automatically capitalized on the storefront.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Add new word input */}
            <div className="flex gap-2">
              <Input
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddWord()}
                placeholder="e.g. CRAFTED IN BANGLADESH"
                className="text-xs font-mono"
              />
              <Button onClick={handleAddWord} size="sm" className="gap-1.5 shrink-0">
                <Plus className="w-3.5 h-3.5" /> Add Phrase
              </Button>
            </div>

            {/* List */}
            {isLoading ? (
              <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">Loading marquee settings...</div>
            ) : words.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                No marquee phrases configured. Click "Reset Defaults" or add a new phrase above.
              </div>
            ) : (
              <div className="space-y-2">
                {words.map((w, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-secondary/20">
                    <span className="text-xs font-mono text-muted-foreground w-6 text-center">{idx + 1}.</span>
                    <Input
                      value={w}
                      onChange={(e) => handleWordChange(idx, e.target.value)}
                      className="h-8 text-xs font-mono font-semibold uppercase tracking-wider flex-1"
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={idx === 0}
                        onClick={() => handleMoveWord(idx, idx - 1)}
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={idx === words.length - 1}
                        onClick={() => handleMoveWord(idx, idx + 1)}
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveWord(idx)}
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Separator & Settings */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Style Settings</CardTitle>
            <CardDescription className="text-xs">Configure separator symbol and marquee appearance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Separator Icon / Symbol</Label>
              <Input
                value={separator}
                onChange={(e) => setSeparator(e.target.value)}
                placeholder="✦"
                className="font-mono text-center text-lg h-10"
              />
              <p className="text-[11px] text-muted-foreground">
                Character rendered between each phrase. Recommended: <code className="text-foreground">✦</code>, <code className="text-foreground">•</code>, <code className="text-foreground">★</code>, or <code className="text-foreground font-mono">|</code>.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
