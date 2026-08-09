"use client";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import ImageUpload from "@/components/ImageUpload";
import VideoUpload from "@/components/VideoUpload";
import { toast } from "@/lib/app-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Image, Eye, EyeOff, GripVertical, ExternalLink, LayoutTemplate, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useDragReorder } from "@/hooks/use-drag-reorder";
import { format } from "date-fns";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Banner = Tables<"banners"> & { mobile_image_url?: string; video_url?: string };

const positions = [
  { value: "hero", label: "Hero", desc: "Main hero area" },
  { value: "top", label: "Top Bar", desc: "Above navigation" },
  { value: "mid", label: "Mid Page", desc: "Between sections" },
  { value: "bottom", label: "Bottom", desc: "Before footer" },
];

/* ── Live Banner Preview ── */
const BannerPreview = ({ banner }: { banner: Partial<TablesInsert<"banners">> }) => {
  const [animKey, setAnimKey] = useState(0);
  const prevRef = useRef(banner.position);

  useEffect(() => {
    if (prevRef.current !== banner.position) {
      setAnimKey((k) => k + 1);
      prevRef.current = banner.position;
    }
  }, [banner.position]);

  const isHero = banner.position === "hero";
  const isTopBar = banner.position === "top";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" /> Live Preview
        </span>
        <button onClick={() => setAnimKey((k) => k + 1)} className="text-[10px] text-primary hover:text-primary/80 transition-colors">
          ↻ Replay
        </button>
      </div>

      <div className="relative w-full rounded-xl bg-secondary/20 border border-border/50 overflow-hidden">
        {/* Simulated page chrome */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/40 border-b border-border/30 shrink-0">
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-destructive/60" />
            <span className="w-2 h-2 rounded-full bg-amber-400/60" />
            <span className="w-2 h-2 rounded-full bg-primary/60" />
          </div>
          <div className="flex-1 mx-2 h-4 rounded-md bg-secondary/60 flex items-center px-2">
            <span className="text-[8px] text-muted-foreground">yoursite.com</span>
          </div>
        </div>

        <div className="relative" style={{ minHeight: isHero ? "200px" : isTopBar ? "80px" : "120px" }}>
          {/* Top bar position */}
          {isTopBar && (
            <motion.div
              key={`top-${animKey}`}
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-primary/10 border-b border-primary/20 px-3 py-2 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-primary">{banner.title || "Banner Title"}</span>
                {banner.subtitle && <span className="text-[8px] text-muted-foreground">{banner.subtitle}</span>}
              </div>
              {banner.link_url && <span className="text-[8px] text-primary underline">View →</span>}
            </motion.div>
          )}

          {/* Fake navbar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/20">
            <div className="w-12 h-3 bg-primary/30 rounded" />
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => <div key={i} className="w-8 h-2 bg-muted-foreground/20 rounded" />)}
            </div>
          </div>

          {/* Hero / main area */}
          {isHero && (
            <motion.div
              key={`hero-${animKey}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative h-36 overflow-hidden"
            >
              {banner.image_url ? (
                <img src={banner.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-primary/20 to-accent/20 flex items-center justify-center">
                  <Image className="w-8 h-8 text-muted-foreground/30" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-background/70 to-transparent flex items-center px-4">
                <div>
                  <p className="text-sm font-bold">{banner.title || "Banner Title"}</p>
                  {banner.subtitle && <p className="text-[9px] text-muted-foreground mt-0.5">{banner.subtitle}</p>}
                  {banner.link_url && (
                    <span className="inline-block mt-1.5 text-[8px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-medium">Shop Now</span>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Mid / Bottom position */}
          {(banner.position === "mid" || banner.position === "bottom") && (
            <>
              <div className="px-3 py-3 space-y-1.5">
                {[1, 2].map((i) => <div key={i} className="h-2 bg-muted-foreground/10 rounded w-full" />)}
                <div className="h-2 bg-muted-foreground/10 rounded w-2/3" />
              </div>
              <motion.div
                key={`mid-${animKey}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mx-3 mb-3 rounded-xl overflow-hidden border border-border/30"
              >
                {banner.image_url ? (
                  <div className="relative h-20">
                    <img src={banner.image_url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
                      <p className="text-[10px] font-bold">{banner.title || "Banner"}</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-20 bg-primary/10 flex items-center justify-center">
                    <p className="text-[10px] font-medium text-primary">{banner.title || "Banner"}</p>
                  </div>
                )}
              </motion.div>
            </>
          )}

          {/* Bottom info bar */}
          <div className="px-3 py-1.5 flex items-center gap-1.5 border-t border-border/20">
            <Badge variant="outline" className="text-[7px] h-4 px-1">{banner.position || "hero"}</Badge>
            <Badge variant={banner.is_active ? "default" : "secondary"} className="text-[7px] h-4 px-1">
              {banner.is_active ? "Active" : "Draft"}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminBanners = () => {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<(Partial<TablesInsert<"banners">> & { id?: string; mobile_image_url?: string; video_url?: string }) | null>(null);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banners").select("*").order("sort_order");
      if (error) throw error;
      return data as Banner[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (b: any) => {
      if (b.id) {
        const { error } = await supabase.from("banners").update(b).eq("id", b.id);
        if (error) throw error;
      } else {
        const { id, ...rest } = b;
        const { error } = await supabase.from("banners").insert(rest as TablesInsert<"banners">);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-banners"] }); setDialogOpen(false); toast.success("Banner saved"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-banners"] }); toast.success("Deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const reorderMutation = useMutation({
    mutationFn: async (reordered: Banner[]) => {
      await Promise.all(reordered.map((b, i) => supabase.from("banners").update({ sort_order: i }).eq("id", b.id)));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-banners"] }); toast.success("Order saved"); },
  });

  const { dragIndex, overIndex, getDragProps } = useDragReorder(banners, (r) => reorderMutation.mutate(r));

  const openEdit = (b?: Banner) => {
    setEditing(b ? { ...b } : { title: "", subtitle: "", image_url: "", mobile_image_url: "", video_url: "", link_url: "", is_active: true, sort_order: banners.length, position: "hero" });
    setDialogOpen(true);
  };

  const activeCount = banners.filter((b) => b.is_active).length;
  const heroCount = banners.filter((b) => b.position === "hero").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <LayoutTemplate className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Banners</h1>
            <p className="text-xs text-muted-foreground">{banners.length} total · {activeCount} active · {heroCount} hero</p>
          </div>
        </div>
        <Button onClick={() => openEdit()} className="gap-2"><Plus className="h-4 w-4" /> Add Banner</Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {positions.map((pos) => {
          const count = banners.filter((b) => b.position === pos.value).length;
          const active = banners.filter((b) => b.position === pos.value && b.is_active).length;
          return (
            <Card key={pos.value} className="glass">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{pos.label}</p>
                <p className="text-lg font-bold mt-0.5">{count}</p>
                <p className="text-[10px] text-muted-foreground">{active} active</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Banner Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Card key={i} className="glass animate-pulse h-52" />)}
        </div>
      ) : banners.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <LayoutTemplate className="w-10 h-10 text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">No banners yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first banner to promote content across the site.</p>
            <Button onClick={() => openEdit()} className="gap-2"><Plus className="h-4 w-4" /> Add Banner</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {banners.map((b, idx) => (
              <motion.div
                key={b.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, delay: idx * 0.05 }}
              >
                <Card
                  className={`glass group transition-all hover:border-primary/30 ${!b.is_active ? "opacity-60" : ""} ${overIndex === idx && dragIndex !== idx ? "ring-2 ring-primary/30" : ""}`}
                  {...getDragProps(idx)}
                >
                  <CardContent className="p-0">
                    {/* Image Preview */}
                    <div className="relative h-36 overflow-hidden rounded-t-xl cursor-grab active:cursor-grabbing">
                      {b.image_url ? (
                        <img src={b.image_url} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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

                      {/* Status badge */}
                      <div className="absolute top-2 right-2">
                        <Badge variant={b.is_active ? "default" : "secondary"} className="text-[10px] gap-1">
                          {b.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {b.is_active ? "Active" : "Draft"}
                        </Badge>
                      </div>

                      {/* Title overlay */}
                      <div className="absolute bottom-2 left-3 right-3">
                        <h3 className="text-sm font-display font-bold text-foreground truncate">{b.title}</h3>
                        {b.subtitle && <p className="text-[10px] text-muted-foreground truncate">{b.subtitle}</p>}
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="p-3 space-y-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{b.position}</Badge>
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          #{b.sort_order}
                        </Badge>
                        {b.link_url && (
                          <Badge variant="outline" className="text-[10px] gap-1 text-primary">
                            <ExternalLink className="w-2.5 h-2.5" /> Linked
                          </Badge>
                        )}
                      </div>

                      {/* Schedule info */}
                      {(b.starts_at || b.ends_at) && (
                        <p className="text-[10px] text-muted-foreground">
                          {b.starts_at && `From ${format(new Date(b.starts_at), "MMM dd")}`}
                          {b.ends_at && ` · Until ${format(new Date(b.ends_at), "MMM dd")}`}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-1 pt-1">
                        <Button size="sm" variant="ghost" className="flex-1 h-8 text-xs gap-1" onClick={() => openEdit(b)}>
                          <Pencil className="w-3 h-3" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => {
                          saveMutation.mutate({ ...b, is_active: !b.is_active });
                        }}>
                          {b.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete banner?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently delete "{b.title}".</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteMutation.mutate(b.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Edit / Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Banner" : "Create Banner"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Form */}
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Summer Sale 2026" />
                </div>
                <div>
                  <Label>Subtitle</Label>
                  <Input value={editing.subtitle ?? ""} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} placeholder="Up to 50% off everything" />
                </div>
                <div>
                  <Label>Desktop Image</Label>
                  <ImageUpload bucket="banners" value={editing.image_url ?? ""} onUploaded={(url) => setEditing({ ...editing, image_url: url })} />
                </div>
                <div>
                  <Label>Mobile Image (optional — portrait/mobile ratio)</Label>
                  <ImageUpload bucket="banners" folder="mobile" value={editing.mobile_image_url ?? ""} onUploaded={(url) => setEditing({ ...editing, mobile_image_url: url })} />
                </div>
                <div>
                  <Label>Video (optional — plays instead of the image if set)</Label>
                  <VideoUpload bucket="banners" folder="video" value={editing.video_url ?? ""} onUploaded={(url) => setEditing({ ...editing, video_url: url })} />
                </div>
                <div>
                  <Label>Link URL</Label>
                  <Input value={editing.link_url ?? ""} onChange={(e) => setEditing({ ...editing, link_url: e.target.value })} placeholder="/shop?sale=true" />
                </div>
                <div>
                  <Label>Position</Label>
                  <Select value={editing.position ?? "hero"} onValueChange={(v) => setEditing({ ...editing, position: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {positions.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label} – {p.desc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Starts At</Label>
                    <Input type="datetime-local" value={editing.starts_at?.slice(0, 16) || ""} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value || null })} />
                  </div>
                  <div>
                    <Label>Ends At</Label>
                    <Input type="datetime-local" value={editing.ends_at?.slice(0, 16) || ""} onChange={(e) => setEditing({ ...editing, ends_at: e.target.value || null })} />
                  </div>
                </div>
                <div>
                  <Label>Sort Order</Label>
                  <Input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: +e.target.value })} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                  <Label>Active</Label>
                </div>
                <Button className="w-full" onClick={() => saveMutation.mutate(editing)} disabled={saveMutation.isPending || !editing.title}>
                  {saveMutation.isPending ? "Saving..." : "Save Banner"}
                </Button>
              </div>

              {/* Right: Live Preview */}
              <div>
                <BannerPreview banner={editing} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBanners;
// code:4ce0
