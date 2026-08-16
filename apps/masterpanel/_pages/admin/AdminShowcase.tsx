"use client";
import { useState, useEffect, useCallback, useRef } from "react";
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
import { Plus, Pencil, Trash2, Settings2, Layers, GripVertical, Copy, Link2, Palette, Wand2, Eye, Monitor, Smartphone, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Play, Pause, Image, FileText, LayoutGrid, Type, ArrowUp, ArrowDown, ArrowLeft, RotateCcw, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDragReorder } from "@/hooks/use-drag-reorder";
import { useRegisterUniversalSave, useUndoRedoState } from "@/contexts/UniversalSaveContext";
import MarqueeStripConfigPanel from "@/components/admin/MarqueeStripConfigPanel";

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-foreground/80">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value && value.startsWith("#") ? value : "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded-lg border border-border/60 bg-transparent cursor-pointer shrink-0"
        />
        <Input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#ffffff or inherit"
          className="h-8 text-xs font-mono bg-background/50 border-border/50 flex-1"
        />
      </div>
    </div>
  );
}

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [config, setConfig, { undo: undoConfig, redo: redoConfig, canUndo: canUndoConfig, canRedo: canRedoConfig, reject: rejectConfig, canReject: canRejectConfig, setInitial: setInitialConfig }] =
    useUndoRedoState<ShowcaseConfig>({ ...defaultConfig });

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
      if (c && typeof c === "object") setInitialConfig({ ...defaultConfig, ...c });
    }
  }, [configRow, setInitialConfig]);

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
      const { error } = await supabase
        .from("site_settings")
        .upsert(
          { key: "showcase_config", value: { value: config } as any, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-showcase-config"] });
      qc.invalidateQueries({ queryKey: ["showcase-config"] });
      toast.success("Showcase settings saved");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to save showcase settings"),
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
  const [currentShowcaseTab] = useTabParam("slides", "/brand/showcase");

  // Universal save hook for slider settings and motion effects tabs
  useRegisterUniversalSave(
    currentShowcaseTab === "settings" || currentShowcaseTab === "effects"
      ? {
          label: "Save",
          onSave: () => saveConfig.mutate(),
          isSaving: saveConfig.isPending,
          onUndo: undoConfig,
          canUndo: canUndoConfig,
          onRedo: redoConfig,
          canRedo: canRedoConfig,
          onReject: () => {
            rejectConfig();
            toast.warning("Showcase settings reverted");
          },
          canReject: canRejectConfig,
        }
      : null,
    [currentShowcaseTab, config, saveConfig.isPending, canUndoConfig, canRedoConfig, canRejectConfig]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Layers className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Hero Slider & Showcase Config</h1>
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

      <TabsWithParam defaultTab="slides" basePath="/brand/showcase">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="slides" className="flex items-center gap-1"><Layers className="w-4 h-4" /> Hero Slides</TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1"><Settings2 className="w-4 h-4" /> Slider Settings</TabsTrigger>
          <TabsTrigger value="effects" className="flex items-center gap-1"><Wand2 className="w-4 h-4" /> Motion Effects</TabsTrigger>
          <TabsTrigger value="product-showcase" className="flex items-center gap-1"><LayoutGrid className="w-4 h-4" /> Cinematic Product Showcase</TabsTrigger>
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
              </CardContent>
            </Card>
          </div>
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
  subtitle?: string;
  badge_tag?: string;
  image_url?: string;
  video_url?: string;
  markdown_specs?: string;
  product_id?: string | null;
  cta_text?: string;
  cta_link?: string;
  layout_type?: "auto" | "featured" | "tall" | "wide" | "square" | "full";
  card_style?: "glass" | "dark" | "cherry" | "minimal" | "monochrome" | "gold" | "custom";
  custom_bg?: string;
  content_position?: "bottom-left" | "bottom-center" | "bottom-right" | "top-left" | "top-center" | "center" | "side";
  show_price?: boolean;
  price_position?: "top" | "bottom" | "none";
  stock_status?: string;
  show_gallery?: boolean;
  follow_card_id?: string | null;
  is_active: boolean;
  sort_order: number;
}

const emptyEntry: ShowcaseEntry = {
  id: "",
  title: "",
  subtitle: "",
  badge_tag: "EDITORIAL SILHOUETTE",
  image_url: "",
  video_url: "",
  markdown_specs: "Fabric: 100% Premium Cotton\nWeight: 240+ GSM Heavyweight\nFit: Oversized Drop Shoulder",
  product_id: null,
  cta_text: "Explore Piece",
  cta_link: "/inventory",
  layout_type: "auto",
  card_style: "glass",
  content_position: "bottom-left",
  show_price: true,
  price_position: "top",
  stock_status: "In Stock",
  show_gallery: false,
  follow_card_id: null,
  is_active: true,
  sort_order: 0,
};

export function ProductShowcaseTab() {
  const qc = useQueryClient();
  const [entries, setEntries] = useState<ShowcaseEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing config
  const { data: savedConfig, isLoading } = useQuery({
    queryKey: ["product-showcase-config-admin"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "product_showcase_config")
        .maybeSingle();
      if (!data?.value) return null;
      const val = data.value as any;
      return val?.value ?? val;
    },
  });
const { data: products = [] } = useQuery({
    queryKey: ["admin-products-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, thumbnail, slug, price, is_featured")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("name")
        .limit(200);
      return data || [];
    },
  });

  const [isEnabled, setIsEnabled] = useState(true);
  const [showFeatured, setShowFeatured] = useState(false);
  const [mobileView, setMobileView] = useState<"deck" | "inspector">("deck");
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (savedConfig) {
      if (Array.isArray(savedConfig)) {
        setEntries(savedConfig as ShowcaseEntry[]);
        setIsEnabled(true);
        setShowFeatured(false);
        if (!selectedId && (savedConfig as ShowcaseEntry[]).length > 0) {
          setSelectedId((savedConfig as ShowcaseEntry[])[0].id);
        }
      } else if (typeof savedConfig === "object") {
        const feat = Boolean(savedConfig.show_featured || savedConfig.show_featured_fallback || savedConfig.show_featured_products);
        setIsEnabled(savedConfig.is_enabled !== false);
        setShowFeatured(feat);
        
        const existingEntries = Array.isArray(savedConfig.entries) ? (savedConfig.entries as ShowcaseEntry[]) : [];
        if (existingEntries.length > 0) {
          setEntries(existingEntries);
          if (!selectedId) {
            setSelectedId(existingEntries[0].id);
          }
        } else if (feat && products.length > 0 && !hasInitialized.current) {
          hasInitialized.current = true;
          const featuredProds = products.filter((p: any) => p.is_featured);
          const targetProds = featuredProds.length > 0 ? featuredProds : products.slice(0, 4);
          if (targetProds.length > 0) {
            const autoCards: ShowcaseEntry[] = targetProds.map((prod: any, idx: number) => ({
              id: crypto.randomUUID(),
              title: prod.name,
              subtitle: "Heavyweight Collection",
              badge_tag: idx === 1 ? "EDITORIAL SILHOUETTE" : "LIMITED DROP",
              image_url: prod.thumbnail || "",
              video_url: "",
              markdown_specs: "Fabric: 100% Heavyweight Cotton\nWeight: 240+ GSM European Fit\nFit: Oversized Drop Shoulder\nStatus: Available Now",
              product_id: prod.id,
              cta_text: "Shop Piece",
              cta_link: `/product/${prod.slug}`,
              layout_type: idx === 0 ? "featured" : idx === 1 ? "tall" : idx === 2 ? "wide" : "square",
              card_style: idx % 3 === 0 ? "glass" : idx % 3 === 1 ? "dark" : "cherry",
              content_position: idx === 1 ? "side" : "bottom-left",
              show_price: true,
              price_position: "top",
              stock_status: "In Stock",
              show_gallery: false,
              follow_card_id: null,
              is_active: true,
              sort_order: idx,
            }));
            setEntries(autoCards);
            setSelectedId(autoCards[0].id);
            saveConfig(autoCards, savedConfig.is_enabled !== false, feat);
          }
        }
      }
    }
  }, [savedConfig, products]);

  const saveConfig = async (updatedEntries: ShowcaseEntry[], updatedIsEnabled: boolean, updatedShowFeatured: boolean) => {
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from("site_settings")
        .upsert(
          {
            key: "product_showcase_config",
            value: {
              is_enabled: updatedIsEnabled,
              show_featured: updatedShowFeatured,
              entries: updatedEntries,
            } as any,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["product-showcase-config"] });
      qc.invalidateQueries({ queryKey: ["product-showcase-config-admin"] });
      toast.success("Cinematic Showcase saved successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save product showcase");
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualSave = () => {
    saveConfig(entries, isEnabled, showFeatured);
    setUndoStack([]);
    setRedoStack([]);
  };

  // Undo & Redo stacks
  const [undoStack, setUndoStack] = useState<{ entries: ShowcaseEntry[]; isEnabled: boolean; showFeatured: boolean }[]>([]);
  const [redoStack, setRedoStack] = useState<{ entries: ShowcaseEntry[]; isEnabled: boolean; showFeatured: boolean }[]>([]);

  const pushHistory = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-25), { entries, isEnabled, showFeatured }]);
    setRedoStack([]);
  }, [entries, isEnabled, showFeatured]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((s) => [...s, { entries, isEnabled, showFeatured }]);
    setEntries(prev.entries);
    setIsEnabled(prev.isEnabled);
    setShowFeatured(prev.showFeatured);
    toast.info("Undone change");
  }, [undoStack, entries, isEnabled, showFeatured]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((s) => [...s, { entries, isEnabled, showFeatured }]);
    setEntries(next.entries);
    setIsEnabled(next.isEnabled);
    setShowFeatured(next.showFeatured);
    toast.info("Redone change");
  }, [redoStack, entries, isEnabled, showFeatured]);

  const handleReject = useCallback(() => {
    if (savedConfig) {
      if (Array.isArray(savedConfig)) {
        setEntries(savedConfig as ShowcaseEntry[]);
        setIsEnabled(true);
        setShowFeatured(false);
      } else if (typeof savedConfig === "object") {
        setEntries(Array.isArray(savedConfig.entries) ? (savedConfig.entries as ShowcaseEntry[]) : []);
        setIsEnabled(savedConfig.is_enabled !== false);
        setShowFeatured(Boolean(savedConfig.show_featured));
      }
    }
    setUndoStack([]);
    setRedoStack([]);
    toast.warning("Unsaved changes discarded and reverted");
  }, [savedConfig]);

  // Register universal floating save button for Product Showcase
  useRegisterUniversalSave(
    {
      label: "Save",
      onSave: handleManualSave,
      isSaving,
      onUndo: handleUndo,
      canUndo: undoStack.length > 0,
      onRedo: handleRedo,
      canRedo: redoStack.length > 0,
      onReject: handleReject,
      canReject: undoStack.length > 0,
    },
    [entries, isEnabled, showFeatured, isSaving, undoStack.length, redoStack.length, handleUndo, handleRedo, handleReject]
  );

  const updateCard = (id: string, patch: Partial<ShowcaseEntry>) => {
    pushHistory();
    setEntries((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const handleAddCard = () => {
    pushHistory();
    const newEntry: ShowcaseEntry = {
      ...emptyEntry,
      id: crypto.randomUUID(),
      title: "New Editorial Bento Card",
      subtitle: "Limited Silhouette",
      badge_tag: "LIMITED DROP",
      layout_type: "auto",
      card_style: "glass",
      content_position: "bottom-left",
      show_price: true,
      price_position: "top",
      stock_status: "In Stock",
      is_active: true,
      sort_order: entries.length,
    };
    const next = [...entries, newEntry];
    setEntries(next);
    setSelectedId(newEntry.id);
    setMobileView("inspector");
    toast.success("New card added and opened in inspector");
  };

  const handleDuplicateCard = (card: ShowcaseEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    pushHistory();
    const dupe: ShowcaseEntry = {
      ...card,
      id: crypto.randomUUID(),
      title: `${card.title || "Card"} (Copy)`,
      sort_order: entries.length,
    };
    const next = [...entries, dupe];
    setEntries(next);
    setSelectedId(dupe.id);
    setMobileView("inspector");
    toast.success("Card duplicated and selected");
  };

  const handleDeleteCard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    pushHistory();
    const next = entries
      .filter((c) => c.id !== id)
      .map((c) => (c.follow_card_id === id ? { ...c, follow_card_id: null } : c));
    next.forEach((c, idx) => (c.sort_order = idx));
    setEntries(next);
    if (selectedId === id) {
      setSelectedId(next[0]?.id || null);
    }
    toast.info("Card removed");
  };

  const handleMoveCard = (idx: number, dir: -1 | 1, e: React.MouseEvent) => {
    e.stopPropagation();
    pushHistory();
    const next = [...entries];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= next.length) return;
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    next.forEach((c, i) => (c.sort_order = i));
    setEntries(next);
  };

  const handleImportFeaturedProducts = () => {
    pushHistory();
    const featuredProds = products.filter((p: any) => p.is_featured);
    const targetProds = featuredProds.length > 0 ? featuredProds : products.slice(0, 4);
    if (targetProds.length === 0) {
      toast.error("No active products found to import.");
      return;
    }

    const newCards: ShowcaseEntry[] = targetProds.map((prod: any, idx: number) => {
      const existing = entries.find((e) => e.product_id === prod.id);
      if (existing) return existing;

      const layoutType: "featured" | "tall" | "wide" | "square" =
        idx === 0 ? "featured" : idx === 1 ? "tall" : idx === 2 ? "wide" : "square";
      const cardStyle: "glass" | "dark" | "cherry" =
        idx % 3 === 0 ? "glass" : idx % 3 === 1 ? "dark" : "cherry";

      return {
        id: crypto.randomUUID(),
        title: prod.name,
        subtitle: "Heavyweight Collection",
        badge_tag: idx === 1 ? "EDITORIAL SILHOUETTE" : "LIMITED DROP",
        image_url: prod.thumbnail || "",
        video_url: "",
        markdown_specs: "Fabric: 100% Heavyweight Cotton\nWeight: 240+ GSM European Fit\nFit: Oversized Drop Shoulder\nStatus: Available Now",
        product_id: prod.id,
        cta_text: "Shop Piece",
        cta_link: `/product/${prod.slug}`,
        layout_type: layoutType,
        card_style: cardStyle,
        content_position: idx === 1 ? "side" : "bottom-left",
        show_price: true,
        price_position: "top",
        stock_status: "In Stock",
        show_gallery: false,
        follow_card_id: null,
        is_active: true,
        sort_order: entries.length + idx,
      };
    });

    const merged = [
      ...entries,
      ...newCards.filter((nc) => !entries.some((e) => e.product_id === nc.product_id || e.id === nc.id)),
    ];
    merged.forEach((e, i) => (e.sort_order = i));
    setEntries(merged);
    if (merged.length > 0 && !selectedId) {
      setSelectedId(merged[0].id);
    }
    setMobileView("inspector");
    toast.success(`Imported ${newCards.length} featured products into the Bento Deck`);
  };

  const handleAutofillFromProduct = (productId: string) => {
    if (!selectedCard) return;
    const prod = products.find((p: any) => p.id === productId);
    if (!prod) return;

    updateCard(selectedCard.id, {
      product_id: prod.id,
      title: prod.name,
      image_url: prod.thumbnail || selectedCard.image_url,
      cta_link: `/product/${prod.slug}`,
      subtitle: selectedCard.subtitle || "Heavyweight Collection",
      show_price: true,
      price_position: selectedCard.price_position || "top",
      markdown_specs: selectedCard.markdown_specs || "Fabric: 100% Heavyweight Cotton\nWeight: 240+ GSM\nFit: Oversized Drop Shoulder\nStatus: In Stock",
    });
    toast.info(`Pre-filled card details from "${prod.name}"`);
  };

  const applyStyleToAllCards = (sourceCard: ShowcaseEntry) => {
    const updated = entries.map((e) =>
      e.id === sourceCard.id
        ? sourceCard
        : {
            ...e,
            layout_type: sourceCard.layout_type,
            card_style: sourceCard.card_style,
            custom_bg: sourceCard.custom_bg,
            content_position: sourceCard.content_position,
            show_price: sourceCard.show_price,
            price_position: sourceCard.price_position,
            badge_tag: sourceCard.badge_tag,
            stock_status: sourceCard.stock_status,
          }
    );
    setEntries(updated);
    toast.success(`Applied style config from "${sourceCard.title || 'Card'}" to all ${entries.length} cards`);
  };

  const selectedCard = entries.find((e) => e.id === selectedId) || null;
  const selectedIndex = selectedCard ? entries.findIndex((e) => e.id === selectedCard.id) : -1;
  const selectedParentCard = selectedCard?.follow_card_id ? entries.find((p) => p.id === selectedCard.follow_card_id) : null;
  const linkedProduct = selectedCard?.product_id ? products.find((p: any) => p.id === selectedCard.product_id) : null;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── TOP SYMMETRICAL CONTROL BAR ── */}
      <div className="relative xl:sticky xl:top-[52px] z-10 bg-background/95 backdrop-blur-xl py-3 px-3.5 sm:px-5 rounded-2xl border border-border/50 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-foreground truncate">
                Cinematic Bento Showcase
              </h2>
              <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5 shrink-0">
                {entries.filter(e => e.is_active !== false).length}/{entries.length} Active
              </Badge>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate sm:whitespace-normal">
              Configure symmetrical bento architecture, luxury styling presets, and editorial copy.
            </p>
          </div>
        </div>

        {/* Global Controls & Actions */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <div className="flex items-center justify-between sm:justify-start gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border border-border/40 bg-secondary/15">
            <Label className="text-[11px] sm:text-xs font-medium cursor-pointer">Enabled</Label>
            <Switch
              checked={isEnabled}
              onCheckedChange={(val) => setIsEnabled(val)}
              className="scale-90 sm:scale-100"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border border-border/40 bg-secondary/15">
            <Label className="text-[11px] sm:text-xs font-medium cursor-pointer">Auto Fallback</Label>
            <Switch
              checked={showFeatured}
              onCheckedChange={(val) => setShowFeatured(val)}
              className="scale-90 sm:scale-100"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleImportFeaturedProducts}
            className="h-8 sm:h-9 px-2.5 sm:px-3 text-[11px] sm:text-xs font-semibold gap-1.5 border-border/60 hover:bg-secondary/20 w-full sm:w-auto"
          >
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span className="truncate">Import Featured</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddCard}
            className="h-8 sm:h-9 px-2.5 sm:px-3 text-[11px] sm:text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 w-full sm:w-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="truncate">Add Bento Card</span>
          </Button>
        </div>
      </div>

      {/* ── MOBILE VIEW SELECTOR (Visible only on < xl screens) ── */}
      <div className="xl:hidden flex items-center p-1.5 rounded-xl bg-secondary/40 border border-border/60 shadow-xs my-1">
        <button
          type="button"
          onClick={() => setMobileView("deck")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            mobileView === "deck"
              ? "bg-card text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-primary" />
          <span>Bento Deck ({entries.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView("inspector")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            mobileView === "inspector"
              ? "bg-card text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings2 className="w-3.5 h-3.5 text-primary" />
          <span>Inspector {selectedCard ? `(#${selectedIndex + 1})` : ""}</span>
        </button>
      </div>

      {/* ── MAIN SYMMETRICAL SPLIT WORKSPACE (NO POPUP) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Bento Cards Deck */}
        <div className={`space-y-4 ${mobileView === "inspector" ? "hidden xl:block" : "block"} xl:col-span-5`}>
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                Bento Deck ({entries.length})
              </h3>
            </div>
            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-mono">
              Tap card to inspect & edit
            </span>
          </div>

          {entries.length === 0 && !isLoading ? (
            <div className="py-16 px-6 text-center border border-dashed border-border/60 rounded-2xl bg-card/30">
              <LayoutGrid className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-foreground mb-1">No Bento Cards in Deck</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
                Import featured catalog pieces or create custom editorial bento cards.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button onClick={handleImportFeaturedProducts} size="sm" className="text-xs gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Import Featured
                </Button>
                <Button onClick={handleAddCard} variant="outline" size="sm" className="text-xs gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Blank Card
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 sm:space-y-3">
              {entries
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((entry, idx) => {
                  const isSelected = selectedId === entry.id;
                  const prod = products.find((p: any) => p.id === entry.product_id);
                  const parent = entry.follow_card_id ? entries.find((p) => p.id === entry.follow_card_id) : null;
                  const isActive = entry.is_active !== false;

                  return (
                    <div
                      key={entry.id}
                      onClick={() => {
                        setSelectedId(entry.id);
                        setMobileView("inspector");
                      }}
                      className={`group relative p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/30"
                          : "border-border/50 bg-card/40 hover:border-border hover:bg-card/75 shadow-sm"
                      } ${!isActive && !isSelected ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3.5">
                        {/* Thumbnail + Layout badge */}
                        <div className="relative w-16 h-14 sm:w-20 sm:h-16 rounded-xl overflow-hidden bg-secondary/30 shrink-0 border border-border/40">
                          {entry.image_url ? (
                            <img src={entry.image_url} alt="" className="w-full h-full object-cover" />
                          ) : prod?.thumbnail ? (
                            <img src={prod.thumbnail} alt="" className="w-full h-full object-cover" />
                          ) : entry.video_url ? (
                            <div className="w-full h-full flex items-center justify-center text-primary bg-primary/10">
                              <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Image className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                          )}

                          <span className="absolute bottom-0.5 right-0.5 font-mono text-[7.5px] sm:text-[8px] font-bold uppercase px-1 sm:px-1.5 py-0.5 rounded bg-background/80 backdrop-blur-xs border border-white/10 text-foreground">
                            {entry.layout_type || "auto"}
                          </span>
                        </div>

                        {/* Title & Metadata */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                              <span className={`w-4 h-4 sm:w-5 sm:h-5 rounded-md flex items-center justify-center text-[9px] sm:text-[10px] font-mono font-bold shrink-0 ${
                                isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                              }`}>
                                {idx + 1}
                              </span>
                              <p className={`text-xs font-bold truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                                {entry.title || prod?.name || "Untitled Bento Card"}
                              </p>
                            </div>
                            {prod?.price && (
                              <span className="font-mono text-[11px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                ৳{Number(prod.price).toLocaleString()}
                              </span>
                            )}
                          </div>

                          <p className="text-[10px] sm:text-[10.5px] text-muted-foreground truncate mb-1">
                            {prod ? `Linked: ${prod.name}` : entry.subtitle || "No product linked"}
                          </p>

                          {/* Attribute Tags */}
                          <div className="flex flex-wrap gap-1 items-center">
                            {parent ? (
                              <span className="text-[8px] sm:text-[8.5px] font-mono font-semibold px-1.5 py-0.5 rounded border border-primary/30 text-primary bg-primary/10">
                                🔗 #{entries.findIndex(x => x.id === parent.id) + 1}
                              </span>
                            ) : (
                              <span className="text-[8px] sm:text-[8.5px] font-mono px-1.5 py-0.5 rounded border border-border/60 bg-secondary/30 text-muted-foreground">
                                ⚙️ Custom
                              </span>
                            )}
                            <span className="text-[8px] sm:text-[8.5px] font-mono uppercase px-1.5 py-0.5 rounded border border-border/60 bg-secondary/30 text-foreground/80">
                              {entry.card_style || "glass"}
                            </span>
                            {entry.badge_tag && (
                              <span className="text-[8px] sm:text-[8.5px] font-mono uppercase px-1.5 py-0.5 rounded bg-background/60 border border-white/10 text-cherry dark:text-foreground/90 font-bold max-w-[110px] truncate">
                                {entry.badge_tag}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quick Controls */}
                        <div className="flex flex-col items-center justify-between gap-1 shrink-0 pl-1 border-l border-border/30">
                          <div className="flex items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground hover:text-foreground"
                              onClick={(e) => handleMoveCard(idx, -1, e)}
                              disabled={idx === 0}
                              title="Move Up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground hover:text-foreground"
                              onClick={(e) => handleMoveCard(idx, 1, e)}
                              disabled={idx === entries.length - 1}
                              title="Move Down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </Button>
                          </div>

                          <div className="flex items-center gap-1 pt-0.5">
                            <Switch
                              checked={isActive}
                              onCheckedChange={(val) => {
                                updateCard(entry.id, { is_active: val });
                              }}
                              className="scale-[0.65] sm:scale-75 origin-center"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground hover:text-primary"
                              onClick={(e) => handleDuplicateCard(entry, e)}
                              title="Duplicate Card"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground hover:text-destructive"
                              onClick={(e) => handleDeleteCard(entry.id, e)}
                              title="Delete Card"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Dedicated Symmetrical Card Inspector */}
        <div className={`xl:col-span-7 xl:sticky xl:top-[130px] xl:self-start xl:max-h-[calc(100vh-150px)] xl:overflow-y-auto pr-0 xl:pr-1 ${mobileView === "deck" ? "hidden xl:block" : "block"}`}>
          {!selectedCard ? (
            <div className="py-16 sm:py-20 px-6 sm:px-8 rounded-2xl border border-dashed border-border/50 bg-card/20 text-center flex flex-col items-center justify-center">
              <LayoutGrid className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/30 mb-3" />
              <h3 className="text-sm sm:text-base font-bold text-foreground mb-1">No Card Selected for Inspection</h3>
              <p className="text-xs text-muted-foreground max-w-sm mb-4">
                Select any card from the deck on the left to edit its content, layout, styling, and specs inline.
              </p>
              <Button onClick={handleAddCard} size="sm" className="text-xs gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Create New Card
              </Button>
            </div>
          ) : (
            <Card className="border-border/50 bg-card/50 backdrop-blur-md shadow-md overflow-hidden">
              {/* Header */}
              <CardHeader className="border-b border-border/30 bg-secondary/15 p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center justify-between sm:justify-start gap-2.5 min-w-0 w-full sm:w-auto">
                  <div className="flex items-center gap-2 min-w-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMobileView("deck")}
                      className="xl:hidden h-8 px-2 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Deck
                    </Button>

                    <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-primary text-primary-foreground font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      #{selectedIndex + 1}
                    </span>
                    <div className="min-w-0">
                      <CardTitle className="text-xs sm:text-sm md:text-base font-bold truncate">
                        {selectedCard.title || "Untitled Card"}
                      </CardTitle>
                      <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                        {selectedCard.layout_type || "auto"} span • {selectedCard.card_style || "glass"} theme
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  {selectedCard.product_id && selectedCard.product_id !== "none" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAutofillFromProduct(selectedCard.product_id!)}
                      className="h-7 sm:h-8 px-2 sm:px-2.5 text-[11px] sm:text-xs font-semibold gap-1 border-border/60 hover:bg-secondary/30"
                      title="Re-sync title, image, price, and slug from product"
                    >
                      <RotateCcw className="w-3 h-3 text-primary" /> Sync
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyStyleToAllCards(selectedCard)}
                    className="h-7 sm:h-8 px-2 sm:px-2.5 text-[11px] sm:text-xs font-semibold gap-1 border-primary/30 text-primary hover:bg-primary/10"
                    title="Apply this card's styling and layout to all deck cards"
                  >
                    <Copy className="w-3 h-3" /> Apply to All
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-6">
                {/* 1. PRODUCT BINDING */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <span className="w-4 h-4 rounded bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">1</span>
                      Linked Catalog Product
                    </Label>
                    {linkedProduct && (
                      <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        ৳{Number(linkedProduct.price).toLocaleString()}
                      </span>
                    )}
                  </div>

                  <Select
                    value={selectedCard.product_id || "none"}
                    onValueChange={(v) => {
                      if (v === "none") {
                        updateCard(selectedCard.id, { product_id: null });
                      } else {
                        const prod = products.find((p: any) => p.id === v);
                        updateCard(selectedCard.id, {
                          product_id: v,
                          title: selectedCard.title || prod?.name || "",
                          image_url: selectedCard.image_url || prod?.thumbnail || "",
                          cta_link: prod ? `/product/${prod.slug}` : selectedCard.cta_link,
                          subtitle: selectedCard.subtitle || "Heavyweight Collection",
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="bg-background/50 border-border/60 h-10 text-xs">
                      <SelectValue placeholder="Select catalog product..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[280px]">
                      <SelectItem value="none">Custom / Unlinked Card (No Catalog Product)</SelectItem>
                      {products.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.is_featured ? "★ " : ""}{p.name} {p.price ? `(৳${Number(p.price).toLocaleString()})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </section>

                <div className="h-px bg-border/40" />

                {/* 2. EDITORIAL CONTENT & TYPOGRAPHY */}
                <section className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">2</span>
                    Editorial Content & Copy
                  </Label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground/80">Card Title / Headline</Label>
                      <Input
                        value={selectedCard.title}
                        onChange={(e) => updateCard(selectedCard.id, { title: e.target.value })}
                        placeholder="e.g. Heavyweight Kuro Hoodie"
                        className="bg-background/50 border-border/50 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground/80">Subtitle / Tagline</Label>
                      <Input
                        value={selectedCard.subtitle || ""}
                        onChange={(e) => updateCard(selectedCard.id, { subtitle: e.target.value })}
                        placeholder="e.g. 240+ GSM European Fit"
                        className="bg-background/50 border-border/50 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground/80">CTA Button Text</Label>
                      <Input
                        value={selectedCard.cta_text}
                        onChange={(e) => updateCard(selectedCard.id, { cta_text: e.target.value })}
                        placeholder="Shop Piece"
                        className="bg-background/50 border-border/50 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground/80">CTA Destination Link</Label>
                      <Input
                        value={selectedCard.cta_link}
                        onChange={(e) => updateCard(selectedCard.id, { cta_link: e.target.value })}
                        placeholder="/product/slug or /inventory"
                        className="bg-background/50 border-border/50 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-foreground/80">Top Pill Badge Tag</Label>
                        <span className="text-[9px] font-mono text-cherry dark:text-foreground/90 font-bold">Accent in Light Mode</span>
                      </div>
                      <Input
                        value={selectedCard.badge_tag || ""}
                        onChange={(e) => updateCard(selectedCard.id, { badge_tag: e.target.value })}
                        placeholder="e.g. EDITORIAL SILHOUETTE, LIMITED DROP"
                        className="bg-background/50 border-border/50 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground/80">Stock / Availability Status</Label>
                      <Input
                        value={selectedCard.stock_status || ""}
                        onChange={(e) => updateCard(selectedCard.id, { stock_status: e.target.value })}
                        placeholder="e.g. In Stock, Limited Edition"
                        className="bg-background/50 border-border/50 text-xs"
                      />
                    </div>
                  </div>
                </section>

                <div className="h-px bg-border/40" />

                {/* 3. BENTO ARCHITECTURE & VISUAL THEME */}
                <section className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">3</span>
                    Bento Architecture & Styling
                  </Label>

                  {/* Inheritance / Follow mode */}
                  <div className="p-3 rounded-xl border border-border/50 bg-secondary/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground/90">Style Inheritance</Label>
                      {selectedParentCard && (
                        <span className="text-[10px] font-mono font-bold text-primary">
                          Following #{entries.findIndex(x => x.id === selectedParentCard.id) + 1}
                        </span>
                      )}
                    </div>
                    <Select
                      value={selectedCard.follow_card_id || "none"}
                      onValueChange={(v) => {
                        if (v === "none") {
                          updateCard(selectedCard.id, { follow_card_id: null });
                        } else {
                          const target = entries.find((e) => e.id === v);
                          if (target) {
                            updateCard(selectedCard.id, {
                              follow_card_id: v,
                              layout_type: target.layout_type,
                              card_style: target.card_style,
                              custom_bg: target.custom_bg,
                              content_position: target.content_position,
                              show_price: target.show_price,
                              price_position: target.price_position,
                              badge_tag: target.badge_tag,
                              stock_status: target.stock_status,
                            });
                            toast.info(`Inheriting style from "${target.title || 'Selected Card'}"`);
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="bg-background/50 border-border/50 h-9 text-xs">
                        <SelectValue placeholder="Individual Custom Config" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">⚙️ Individual Custom Config (Independent)</SelectItem>
                        {entries
                          .filter((e) => e.id !== selectedCard.id)
                          .map((e, i) => (
                            <SelectItem key={e.id} value={e.id}>
                              🔗 Follow #{i + 1}: {e.title || "Untitled Card"} ({e.card_style || "glass"}, {e.layout_type || "auto"})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground/80">Grid Span Ratio</Label>
                      <Select
                        value={selectedCard.layout_type || "auto"}
                        onValueChange={(v: any) => updateCard(selectedCard.id, { layout_type: v })}
                      >
                        <SelectTrigger className="bg-background/50 border-border/50 h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto (Smart Flow)</SelectItem>
                          <SelectItem value="featured">Featured (2×2 Hero)</SelectItem>
                          <SelectItem value="tall">Portrait (1×2 Tall)</SelectItem>
                          <SelectItem value="wide">Landscape (2×1 Wide)</SelectItem>
                          <SelectItem value="square">Square (1×1 Compact)</SelectItem>
                          <SelectItem value="full">Full Width (4×1 Banner)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground/80">Aesthetic Theme</Label>
                      <Select
                        value={selectedCard.card_style || "glass"}
                        onValueChange={(v: any) => updateCard(selectedCard.id, { card_style: v })}
                      >
                        <SelectTrigger className="bg-background/50 border-border/50 h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="glass">Frosted Glassmorphism</SelectItem>
                          <SelectItem value="dark">Deep Obsidian</SelectItem>
                          <SelectItem value="cherry">Editorial Crimson Accent</SelectItem>
                          <SelectItem value="minimal">Clean Minimal Luxe</SelectItem>
                          <SelectItem value="monochrome">Monochrome Slate</SelectItem>
                          <SelectItem value="gold">Gold Heritage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground/80">Content Alignment</Label>
                      <Select
                        value={selectedCard.content_position || "bottom-left"}
                        onValueChange={(v: any) => updateCard(selectedCard.id, { content_position: v })}
                      >
                        <SelectTrigger className="bg-background/50 border-border/50 h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bottom-left">Bottom Left (Standard)</SelectItem>
                          <SelectItem value="side">Side Vertical 90° (Editorial)</SelectItem>
                          <SelectItem value="bottom-center">Bottom Center</SelectItem>
                          <SelectItem value="bottom-right">Bottom Right</SelectItem>
                          <SelectItem value="top-left">Top Left</SelectItem>
                          <SelectItem value="center">Center Focused</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Price Badge Toggle & Position */}
                  <div className="p-3 rounded-xl border border-border/50 bg-secondary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={selectedCard.show_price !== false}
                        onCheckedChange={(val) => updateCard(selectedCard.id, { show_price: val })}
                      />
                      <div>
                        <Label className="text-xs font-semibold">Display Price Badge</Label>
                        <p className="text-[10px] text-muted-foreground">Format and display price from linked product.</p>
                      </div>
                    </div>
                    {selectedCard.show_price !== false && (
                      <div className="flex items-center gap-2">
                        <Label className="text-[11px] text-muted-foreground shrink-0">Badge Position:</Label>
                        <Select
                          value={selectedCard.price_position || "top"}
                          onValueChange={(v: any) => updateCard(selectedCard.id, { price_position: v })}
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs bg-background/50"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="top">Top Right Pill</SelectItem>
                            <SelectItem value="bottom">Bottom Bar</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </section>

                <div className="h-px bg-border/40" />

                {/* 4. MEDIA ASSETS */}
                <section className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">4</span>
                    Media Assets (Image & Video)
                  </Label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground/80">Card Image (Direct Upload)</Label>
                      <ImageUpload
                        value={selectedCard.image_url}
                        onUploaded={(url) => updateCard(selectedCard.id, { image_url: url || "" })}
                        bucket="banners"
                        folder="showcase"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground/80">Card Video (Looped Background)</Label>
                      <VideoUpload
                        value={selectedCard.video_url}
                        onUploaded={(url) => updateCard(selectedCard.id, { video_url: url || "" })}
                        bucket="banners"
                        folder="showcase-video"
                      />
                    </div>
                  </div>
                </section>

                <div className="h-px bg-border/40" />

                {/* 5. MATERIAL SPECS & LIVE PREVIEW */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <span className="w-4 h-4 rounded bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">5</span>
                      Material Specs & Live Panel Preview
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2 text-primary"
                      onClick={() => updateCard(selectedCard.id, { markdown_specs: "Fabric: 100% Heavyweight Cotton\nWeight: 240+ GSM European Fit\nFit: Oversized Silhouette\nStatus: In Stock" })}
                    >
                      Insert Preset Specs
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Textarea
                        value={selectedCard.markdown_specs}
                        onChange={(e) => updateCard(selectedCard.id, { markdown_specs: e.target.value })}
                        className="min-h-[140px] font-mono text-xs bg-background/50 border-border/50 resize-none"
                        placeholder="Fabric: 100% Premium Cotton\nWeight: 240+ GSM Heavyweight\nFit: Oversized Drop Shoulder"
                      />
                      <p className="text-[10px] text-muted-foreground">Format each line as "Label: Value".</p>
                    </div>

                    <div className="border border-border/40 rounded-xl p-3.5 bg-secondary/15 min-h-[140px] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 border-b border-border/30 pb-1 mb-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          <span className="font-mono text-[9px] font-bold tracking-widest uppercase text-foreground/80">
                            Specs Live Card Render
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {selectedCard.markdown_specs?.split("\n").filter(l => l.trim()).map((line, i) => {
                            const parts = line.split(":");
                            const key = parts[0]?.trim();
                            const val = parts.slice(1).join(":").trim();
                            return (
                              <div key={i} className="flex justify-between items-center text-[10px]">
                                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{key}</span>
                                <span className="font-semibold text-foreground truncate max-w-[120px]">{val || key}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/20 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                        <span>{selectedCard.stock_status || "In Stock"}</span>
                        <span className="text-primary font-bold">{selectedCard.cta_text || "Shop Piece"} →</span>
                      </div>
                    </div>
                  </div>
                </section>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
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
      const { error } = await supabase
        .from("site_settings")
        .upsert(
          {
            key: "collection_showcase_config",
            value: updated as any,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["collection-showcase-config"] });
      qc.invalidateQueries({ queryKey: ["collection-showcase-config-admin"] });
      toast.success("Collections strip saved");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save collections strip");
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
                  bucket="banners"
                  folder="showcase-collections"
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

export function MarqueeStripTab() {
  return <MarqueeStripConfigPanel />;
}
