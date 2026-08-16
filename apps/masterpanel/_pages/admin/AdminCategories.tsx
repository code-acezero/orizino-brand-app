"use client";

import { useState, useCallback, useMemo } from "react";
import { subDays, startOfDay, format as fmtDate, eachDayOfInterval } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  Check,
  X,
  FolderTree,
  Eye,
  EyeOff,
  Star,
  GripVertical,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Package,
  ShoppingCart,
  DollarSign,
  ArrowUpDown,
  Download,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  Mail,
  Search,
  LayoutGrid,
  List,
  Layers,
  ExternalLink,
  Globe,
  Palette,
  Image as ImageIcon,
  Tv,
  CheckCircle2,
  Loader2,
  Tag,
  Sliders,
  Play,
} from "lucide-react";
import { useServerFn } from "@/lib/server-fn-compat";
import { notifyAboutCategory } from "@/lib/email-broadcasts.functions";
import BulkUpload from "@/components/admin/BulkUpload";
import { exportCategories } from "@/components/admin/bulkExport";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/lib/app-toast";
import ImageUpload from "@/components/ImageUpload";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { useDragReorder } from "@/hooks/use-drag-reorder";
import { useCurrency } from "@/contexts/CurrencyContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LineChart, Line } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageHeader from "@/components/admin/PageHeader";

const PRESET_ACCENTS = [
  { name: "Indigo", color: "#6366f1" },
  { name: "Crimson", color: "#e11d48" },
  { name: "Emerald", color: "#10b981" },
  { name: "Amber", color: "#f59e0b" },
  { name: "Sky", color: "#0ea5e9" },
  { name: "Violet", color: "#8b5cf6" },
  { name: "Rose", color: "#f43f5e" },
  { name: "Zinc", color: "#71717a" },
];

const PRESET_EMOJIS = [
  "🔥", "👕", "👖", "🎌", "👘", "⚡", "🎒", "🕶️", "👟", "💎", "🏷️", "🧢", "🧥", "🩳", "✨", "🎁"
];

function getYouTubeId(url: string) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=))([^&?/]+)/);
  return m?.[1] || null;
}

/* ── Category Studio (Edit/Create Modal) ── */
interface CategoryStudioProps {
  editing: Record<string, any>;
  updateField: (field: string, value: any) => void;
  parentCategories: any[];
  saveMutation: any;
  onClose: () => void;
}

const CategoryStudio = ({
  editing,
  updateField,
  parentCategories,
  saveMutation,
  onClose,
}: CategoryStudioProps) => {
  const qc = useQueryClient();
  const categoryId = editing.id;
  const [newFilterName, setNewFilterName] = useState("");
  const [newFilterValues, setNewFilterValues] = useState("");
  const [previewMode, setPreviewMode] = useState<"banner" | "card">("banner");

  const { data: filters = [], refetch: refetchFilters } = useQuery({
    queryKey: ["category-filters-admin", categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      const { data } = await supabase
        .from("category_filters")
        .select("*")
        .eq("category_id", categoryId)
        .order("sort_order");
      return data || [];
    },
    enabled: !!categoryId,
  });

  const addFilter = async () => {
    if (!newFilterName.trim() || !categoryId) return;
    const values = newFilterValues
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (values.length === 0) {
      toast.error("Add at least one filter value");
      return;
    }
    const { error } = await supabase.from("category_filters").insert({
      category_id: categoryId,
      filter_name: newFilterName.trim(),
      filter_values: values,
      sort_order: filters.length,
      is_active: true,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewFilterName("");
    setNewFilterValues("");
    refetchFilters();
    qc.invalidateQueries({ queryKey: ["category-filters"] });
    toast.success("Filter attribute added");
  };

  const deleteFilter = async (filterId: string) => {
    await supabase.from("category_filters").delete().eq("id", filterId);
    refetchFilters();
    qc.invalidateQueries({ queryKey: ["category-filters"] });
    toast.success("Filter deleted");
  };

  const toggleFilterActive = async (filterId: string, isActive: boolean) => {
    await supabase.from("category_filters").update({ is_active: !isActive }).eq("id", filterId);
    refetchFilters();
    qc.invalidateQueries({ queryKey: ["category-filters"] });
  };

  const autoGenerateSlug = () => {
    if (!editing.name) return;
    const s = editing.name
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    updateField("slug", s);
  };

  const accentColor = editing.accent_color || "#6366f1";
  const ytId = editing.youtube_url ? getYouTubeId(editing.youtube_url) : null;

  return (
    <div className="flex flex-col h-full w-full min-h-0 overflow-hidden">
      {/* Studio Header */}
      <div className="px-4 sm:px-5 py-3 border-b border-border/70 flex items-center justify-between bg-muted/20 shrink-0">
        <div>
          <DialogTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-primary" />
            {editing.id ? `Edit Category: ${editing.name || "Untitled"}` : "Create New Category"}
          </DialogTitle>
          <DialogDescription className="text-[11px] text-muted-foreground mt-0.5">
            Configure hierarchy, branding visuals, storefront facets, and SEO indexing.
          </DialogDescription>
        </div>
        {editing.slug && (
          <a
            href={`/category/${editing.slug}`}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
          >
            Storefront <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Tabs Body */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3">
        <Tabs defaultValue="appearance" className="w-full flex flex-col min-h-0">
          <TabsList className="grid grid-cols-4 w-full h-8 bg-muted/60 p-0.5 rounded-lg shrink-0">
            <TabsTrigger value="general" className="text-[11px] sm:text-xs rounded-md font-medium h-7">General</TabsTrigger>
            <TabsTrigger value="appearance" className="text-[11px] sm:text-xs rounded-md font-medium h-7">Branding & Preview</TabsTrigger>
            <TabsTrigger value="filters" className="text-[11px] sm:text-xs rounded-md font-medium h-7">
              Filters {filters.length > 0 && `(${filters.length})`}
            </TabsTrigger>
            <TabsTrigger value="seo" className="text-[11px] sm:text-xs rounded-md font-medium h-7">SEO & Meta</TabsTrigger>
          </TabsList>

          {/* ── General Tab ── */}
          <TabsContent value="general" className="space-y-3 mt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Category Name *</Label>
                <Input
                  value={editing.name ?? ""}
                  onChange={(e) => {
                    updateField("name", e.target.value);
                    if (!editing.id && !editing.slug_manual) {
                      const autoSlug = e.target.value
                        .toLowerCase()
                        .trim()
                        .replace(/[\s\W-]+/g, "-")
                        .replace(/^-+|-+$/g, "");
                      updateField("slug", autoSlug);
                    }
                  }}
                  placeholder="e.g. StreetWear, Anime Oversized"
                  className="h-9 rounded-xl mt-1 text-xs font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">URL Slug</Label>
                  <button
                    type="button"
                    onClick={autoGenerateSlug}
                    className="text-[10px] text-primary hover:underline font-medium"
                  >
                    Auto-slug
                  </button>
                </div>
                <Input
                  value={editing.slug ?? ""}
                  onChange={(e) => {
                    updateField("slug", e.target.value);
                    updateField("slug_manual", true);
                  }}
                  placeholder="auto-generated-slug"
                  className="h-9 rounded-xl mt-1 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Parent Category</Label>
              <Select
                value={editing.parent_id ?? "none"}
                onValueChange={(v) => updateField("parent_id", v === "none" ? null : v)}
              >
                <SelectTrigger className="h-9 rounded-xl mt-1 text-xs">
                  <SelectValue placeholder="None (Top-Level Category)" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">None (Top-Level Category)</SelectItem>
                  {parentCategories
                    .filter((p) => p.id !== editing.id)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.icon ? `${p.icon} ` : ""}{p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Assigning a parent places this category as a subcategory.
              </p>
            </div>

            <div>
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                value={editing.description ?? ""}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Brief summary displayed on storefront category headers..."
                rows={2}
                className="rounded-xl mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <Label className="text-xs font-semibold">Sort Order</Label>
                <Input
                  type="number"
                  value={editing.sort_order ?? 0}
                  onChange={(e) => updateField("sort_order", +e.target.value)}
                  className="h-9 rounded-xl mt-1 text-xs"
                />
              </div>

              <div className="flex items-center gap-4 pt-4 sm:pt-5">
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={editing.is_active ?? true}
                    onCheckedChange={(v) => updateField("is_active", v)}
                  />
                  <Label htmlFor="is_active" className="text-xs font-medium cursor-pointer">
                    Active
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_featured"
                    checked={editing.is_featured ?? false}
                    onCheckedChange={(v) => updateField("is_featured", v)}
                  />
                  <Label htmlFor="is_featured" className="text-xs font-medium cursor-pointer">
                    Featured
                  </Label>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Branding & Live Preview Tab ── */}
          <TabsContent value="appearance" className="space-y-4 mt-3">
            {/* Live Interactive Storefront Preview Box */}
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
              <div className="px-3.5 py-2 bg-muted/40 border-b border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-bold text-foreground">Live Storefront Preview</span>
                </div>
                <div className="flex items-center gap-1 bg-muted/70 p-0.5 rounded-lg border border-border/40 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setPreviewMode("banner")}
                    className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                      previewMode === "banner"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Hero Banner
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("card")}
                    className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                      previewMode === "card"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Grid Tile
                  </button>
                </div>
              </div>

              {/* Preview Rendering */}
              {previewMode === "banner" ? (
                <div className="relative w-full h-28 sm:h-32 overflow-hidden bg-muted/60">
                  {/* Background Layer */}
                  {editing.banner_type === "youtube" && ytId ? (
                    <div className="absolute inset-0 w-full h-full pointer-events-none">
                      <iframe
                        src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&showinfo=0`}
                        className="w-full h-full object-cover scale-125"
                        allow="autoplay; encrypted-media"
                        frameBorder="0"
                      />
                    </div>
                  ) : editing.banner_url ? (
                    <img
                      src={editing.banner_url}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, ${accentColor}44, transparent 70%), linear-gradient(135deg, ${accentColor}22, #18181b)`,
                      }}
                    />
                  )}

                  {/* Gradient Overlay */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(to bottom, ${accentColor}33 0%, rgba(10,10,10,0.85) 100%)`,
                    }}
                  />

                  {/* Category Info Overlay */}
                  <div className="relative z-10 w-full h-full px-4 py-3 flex flex-col justify-end">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-10 h-10 rounded-xl border border-white/20 shadow-md flex items-center justify-center shrink-0 overflow-hidden text-xl backdrop-blur-md"
                        style={{ background: `${accentColor}33` }}
                      >
                        {editing.icon_url ? (
                          <img src={editing.icon_url} alt="" className="w-full h-full object-contain" />
                        ) : editing.icon ? (
                          <span>{editing.icon}</span>
                        ) : (
                          <FolderTree className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-display font-bold text-sm sm:text-base text-white drop-shadow-md truncate">
                            {editing.name || "Category Name"}
                          </h3>
                          {editing.is_featured && (
                            <Badge className="bg-amber-500 text-black font-bold text-[8px] px-1.5 py-0 h-3.5">
                              Featured
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-white/80 line-clamp-1 mt-0.5">
                          {editing.description || "Browse premium curated products in this collection."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 flex items-center justify-center bg-muted/20">
                  <div className="w-48 h-26 rounded-xl overflow-hidden relative border border-border/80 shadow-xs group">
                    {editing.image_url ? (
                      <img src={editing.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${accentColor}33, ${accentColor}11)` }}
                      >
                        <FolderTree className="w-6 h-6 opacity-30 text-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2.5 flex flex-col justify-end">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center text-xs shrink-0">
                          {editing.icon_url ? (
                            <img src={editing.icon_url} alt="" className="w-full h-full object-contain rounded-lg" />
                          ) : editing.icon ? (
                            <span>{editing.icon}</span>
                          ) : (
                            <FolderTree className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <span className="font-bold text-xs text-white truncate">
                          {editing.name || "Category Title"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Icon & Emoji Presets */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-primary" /> Category Icon & Emoji Picker
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded-xl border border-border/80 flex items-center justify-center shrink-0 overflow-hidden text-lg shadow-xs"
                    style={{ background: `${accentColor}18` }}
                  >
                    {editing.icon_url ? (
                      <img src={editing.icon_url} alt="" className="w-full h-full object-contain" />
                    ) : editing.icon ? (
                      <span>{editing.icon}</span>
                    ) : (
                      <FolderTree className="w-5 h-5 text-muted-foreground opacity-50" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      value={editing.icon ?? ""}
                      onChange={(e) => updateField("icon", e.target.value)}
                      placeholder="Emoji e.g. 👕 or 🎌"
                      className="h-8.5 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div>
                  <ImageUpload
                    bucket="banners"
                    folder="category-icons"
                    value={editing.icon_url ?? ""}
                    onUploaded={(url) => {
                      updateField("icon_url", url);
                      updateField("icon", "");
                    }}
                  />
                </div>
              </div>

              {/* Emoji Presets Palette */}
              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                <span className="text-[10px] text-muted-foreground font-medium mr-1">Presets:</span>
                {PRESET_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => {
                      updateField("icon", em);
                      updateField("icon_url", "");
                    }}
                    className={`w-6.5 h-6.5 rounded-lg text-xs flex items-center justify-center border transition-all hover:scale-110 active:scale-95 ${
                      editing.icon === em
                        ? "border-primary bg-primary/20 scale-105"
                        : "border-border/60 bg-muted/40 hover:bg-muted"
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* Brand Accent Color */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Brand Accent Color</Label>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="color"
                  value={editing.accent_color || "#6366f1"}
                  onChange={(e) => updateField("accent_color", e.target.value)}
                  className="w-8 h-8 rounded-lg border border-border cursor-pointer bg-transparent p-0.5 shrink-0"
                />
                <Input
                  value={editing.accent_color || "#6366f1"}
                  onChange={(e) => updateField("accent_color", e.target.value)}
                  placeholder="#6366f1"
                  className="h-8 rounded-xl text-xs font-mono w-28"
                />
                <div className="flex items-center gap-1 ml-auto">
                  {PRESET_ACCENTS.map((p) => (
                    <button
                      key={p.color}
                      type="button"
                      onClick={() => updateField("accent_color", p.color)}
                      className="w-5 h-5 rounded-full border border-border/60 hover:scale-110 transition-transform shadow-xs flex items-center justify-center"
                      style={{ background: p.color }}
                      title={p.name}
                    >
                      {editing.accent_color === p.color && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Category Card Photo */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Category Card Photo (Grid Thumbnail)</Label>
              <div>
                <ImageUpload
                  bucket="banners"
                  folder="categories"
                  value={editing.image_url ?? ""}
                  onUploaded={(url) => updateField("image_url", url)}
                />
              </div>
            </div>

            {/* Header Hero Banner */}
            <div className="rounded-xl border border-border/70 p-3 bg-muted/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold">Storefront Header Hero Banner</Label>
                  <p className="text-[10px] text-muted-foreground">Banner at the top of the storefront category page</p>
                </div>
                <Select
                  value={editing.banner_type ?? "image"}
                  onValueChange={(v) => updateField("banner_type", v)}
                >
                  <SelectTrigger className="w-[125px] h-7.5 rounded-lg text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="image">Image / GIF</SelectItem>
                    <SelectItem value="youtube">YouTube Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(editing.banner_type ?? "image") === "image" ? (
                <ImageUpload
                  bucket="banners"
                  folder="category-banners"
                  value={editing.banner_url ?? ""}
                  onUploaded={(url) => updateField("banner_url", url)}
                  accept="image/*,.gif"
                />
              ) : (
                <div className="space-y-1">
                  <Input
                    value={editing.youtube_url ?? ""}
                    onChange={(e) => updateField("youtube_url", e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="h-8.5 rounded-xl text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Accepts standard YouTube URLs or video IDs (autoplays muted in the background).
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Filters & Facets Tab ── */}
          <TabsContent value="filters" className="space-y-4 mt-4">
            {!categoryId ? (
              <div className="rounded-2xl border border-dashed border-border/80 p-6 text-center bg-muted/10">
                <Sliders className="w-8 h-8 mx-auto text-muted-foreground opacity-50 mb-2" />
                <p className="text-xs font-semibold text-foreground">Save category first</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Once saved, you can add custom storefront sidebar facets (e.g. Material, Style, Fit).
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-primary" /> Storefront Filter Groups
                    </Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Configured filters appear in the shop sidebar when browsing this category.
                    </p>
                  </div>
                </div>

                {/* Existing Filter Groups */}
                {filters.length > 0 && (
                  <div className="space-y-2">
                    {filters.map((f: any) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border/60 shadow-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-foreground">{f.filter_name}</span>
                            <Badge
                              variant={f.is_active ? "default" : "secondary"}
                              className="text-[9px] px-1.5 py-0 rounded"
                            >
                              {f.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {(f.filter_values || []).map((v: string) => (
                              <span
                                key={v}
                                className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-foreground"
                              >
                                {v}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            onClick={() => toggleFilterActive(f.id, f.is_active)}
                            title={f.is_active ? "Disable filter" : "Enable filter"}
                          >
                            {f.is_active ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-primary" />}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive rounded-lg hover:bg-destructive/10"
                            onClick={() => deleteFilter(f.id)}
                            title="Delete filter"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Filter */}
                <div className="rounded-2xl border border-border/70 p-3.5 bg-muted/20 space-y-3">
                  <p className="text-xs font-semibold text-foreground">Add New Filter Group</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <Label className="text-[11px] font-medium">Filter Group Title</Label>
                      <Input
                        value={newFilterName}
                        onChange={(e) => setNewFilterName(e.target.value)}
                        placeholder="e.g. Fabric, Fit, Theme"
                        className="h-9 rounded-xl text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-medium">Options (comma separated)</Label>
                      <Input
                        value={newFilterValues}
                        onChange={(e) => setNewFilterValues(e.target.value)}
                        placeholder="e.g. 100% Cotton, Heavy French Terry"
                        className="h-9 rounded-xl text-xs mt-1"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 rounded-xl h-9 text-xs font-semibold justify-center"
                    onClick={addFilter}
                    disabled={!newFilterName.trim()}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Filter Attribute
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── SEO Tab ── */}
          <TabsContent value="seo" className="space-y-4 mt-4">
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">SEO Meta Title</Label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {(editing.meta_title ?? "").length}/60
                </span>
              </div>
              <Input
                value={editing.meta_title ?? ""}
                onChange={(e) => updateField("meta_title", e.target.value)}
                placeholder="Category Title | Orizino Brand"
                maxLength={60}
                className="h-10 rounded-xl mt-1 text-xs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">SEO Meta Description</Label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {(editing.meta_description ?? "").length}/160
                </span>
              </div>
              <Textarea
                value={editing.meta_description ?? ""}
                onChange={(e) => updateField("meta_description", e.target.value)}
                placeholder="Search engine summary of this category..."
                rows={3}
                maxLength={160}
                className="rounded-xl mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Keywords</Label>
              <Input
                value={editing.meta_keywords ?? ""}
                onChange={(e) => updateField("meta_keywords", e.target.value)}
                placeholder="streetwear, oversized, anime clothing"
                className="h-10 rounded-xl mt-1 text-xs"
              />
            </div>

            {/* Google Search Result Preview */}
            <div className="rounded-2xl border border-border/70 p-4 bg-muted/20 space-y-1 mt-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Google Search Result Preview
              </p>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-mono truncate">
                <Globe className="w-3.5 h-3.5 shrink-0" />
                https://orizino.com/category/{editing.slug || "category-slug"}
              </div>
              <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer truncate">
                {editing.meta_title || editing.name || "Category Page Title"} | Orizino
              </h4>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {editing.meta_description || editing.description || "Discover the exclusive premium category collection on Orizino."}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sticky Symmetrical Footer */}
      <div className="px-3.5 sm:px-5 py-2.5 sm:py-3 border-t border-border/70 flex flex-row items-center justify-between gap-2 bg-card/95 backdrop-blur-md shrink-0 z-10">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="rounded-xl h-8.5 px-4 text-xs font-semibold"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => {
            if (!editing.name?.trim()) {
              toast.error("Category name is required");
              return;
            }
            saveMutation.mutate(editing);
          }}
          disabled={saveMutation.isPending}
          className="rounded-xl h-8.5 px-5 text-xs font-bold bg-primary text-primary-foreground shadow-xs hover:shadow-md active:scale-95 transition-all gap-1.5"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" /> Save Category
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

/* ── Main AdminCategories Component ── */
export default function AdminCategories() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "featured" | "parents" | "subs">("all");
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "products" | "orders" | "revenue">("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("all");
  const { formatPrice } = useCurrency();

  const notifyCategoryFn = useServerFn(notifyAboutCategory);
  const notifyCategoryMut = useMutation({
    mutationFn: (id: string) => notifyCategoryFn({ data: { categoryId: id, audience_type: "subscribers", sendNow: true } }),
    onSuccess: () => toast.success("Broadcast email queued to subscribers ✉️"),
    onError: (e: any) => toast.error(e?.message ?? "Failed to send notification"),
  });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  const parentCategories = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);
  const getChildren = useCallback(
    (parentId: string) => categories.filter((c) => c.parent_id === parentId),
    [categories]
  );

  // Fetch product counts per category
  const { data: products = [] } = useQuery({
    queryKey: ["category-analytics-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, category_id").limit(5000);
      return data || [];
    },
    staleTime: 60_000,
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ["category-analytics-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_items")
        .select("product_id, quantity, total_price, order_id, orders!inner(created_at)")
        .limit(5000);
      return data || [];
    },
    staleTime: 60_000,
  });

  const prodCountMap = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p: any) => {
      if (p.category_id) map.set(p.category_id, (map.get(p.category_id) || 0) + 1);
    });
    return map;
  }, [products]);

  const dateFilterStart = useMemo(() => {
    if (dateRange === "all") return null;
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
    return startOfDay(subDays(new Date(), days)).toISOString();
  }, [dateRange]);

  const filteredOrderItems = useMemo(() => {
    if (!dateFilterStart) return orderItems;
    return orderItems.filter((oi: any) => {
      const orderDate = oi.orders?.created_at;
      return orderDate && orderDate >= dateFilterStart;
    });
  }, [orderItems, dateFilterStart]);

  const prevPeriodFilterStart = useMemo(() => {
    if (dateRange === "all") return null;
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
    return startOfDay(subDays(new Date(), days * 2)).toISOString();
  }, [dateRange]);

  const prevFilteredOrderItems = useMemo(() => {
    if (!dateFilterStart || !prevPeriodFilterStart) return [];
    return orderItems.filter((oi: any) => {
      const d = oi.orders?.created_at;
      return d && d >= prevPeriodFilterStart && d < dateFilterStart;
    });
  }, [orderItems, dateFilterStart, prevPeriodFilterStart]);

  const buildRevenueMap = (items: any[]) => {
    const prodCatMap = new Map<string, string>();
    products.forEach((p: any) => {
      if (p.category_id) prodCatMap.set(p.id, p.category_id);
    });
    const map = new Map<string, number>();
    items.forEach((oi: any) => {
      const catId = prodCatMap.get(oi.product_id);
      if (!catId) return;
      map.set(catId, (map.get(catId) || 0) + (Number(oi.total_price) || 0));
    });
    return map;
  };

  const prevRevenueMap = useMemo(() => buildRevenueMap(prevFilteredOrderItems), [products, prevFilteredOrderItems]);

  const categoryAnalytics = useMemo(() => {
    const prodCatMap = new Map<string, string>();
    products.forEach((p: any) => {
      if (p.category_id) prodCatMap.set(p.id, p.category_id);
    });
    const map = new Map<string, { productCount: number; orderCount: number; revenue: number }>();
    products.forEach((p: any) => {
      if (!p.category_id) return;
      const entry = map.get(p.category_id) || { productCount: 0, orderCount: 0, revenue: 0 };
      entry.productCount++;
      map.set(p.category_id, entry);
    });
    filteredOrderItems.forEach((oi: any) => {
      const catId = prodCatMap.get(oi.product_id);
      if (!catId) return;
      const entry = map.get(catId) || { productCount: 0, orderCount: 0, revenue: 0 };
      entry.orderCount += oi.quantity || 1;
      entry.revenue += Number(oi.total_price) || 0;
      map.set(catId, entry);
    });
    return map;
  }, [products, filteredOrderItems]);

  const analyticsRows = useMemo(() => {
    const childToParent = new Map<string, string>();
    parentCategories.forEach((p) => {
      getChildren(p.id).forEach((ch) => childToParent.set(ch.id, p.id));
    });
    const resolveParent = (catId: string) => childToParent.get(catId) || catId;

    const rows = parentCategories.map((c) => {
      const children = getChildren(c.id);
      const allIds = [c.id, ...children.map((ch) => ch.id)];
      const stats = allIds.reduce(
        (acc, id) => {
          const s = categoryAnalytics.get(id);
          if (s) {
            acc.productCount += s.productCount;
            acc.orderCount += s.orderCount;
            acc.revenue += s.revenue;
          }
          return acc;
        },
        { productCount: 0, orderCount: 0, revenue: 0 }
      );
      const prevRev = allIds.reduce((sum, id) => {
        const parentId = resolveParent(id);
        return sum + (prevRevenueMap.get(id) || 0);
      }, 0);
      return {
        id: c.id,
        name: c.name,
        icon: c.icon,
        icon_url: c.icon_url,
        accent_color: c.accent_color,
        ...stats,
        prevRevenue: prevRev,
      };
    });
    rows.sort((a, b) => {
      const key =
        sortBy === "name"
          ? "name"
          : sortBy === "products"
          ? "productCount"
          : sortBy === "orders"
          ? "orderCount"
          : "revenue";
      if (key === "name") return sortDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      return sortDir === "asc" ? (a as any)[key] - (b as any)[key] : (b as any)[key] - (a as any)[key];
    });
    return rows;
  }, [parentCategories, categoryAnalytics, prevRevenueMap, sortBy, sortDir, categories, getChildren]);

  const sparklineData = useMemo(() => {
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : dateRange === "90d" ? 90 : 30;
    const end = new Date();
    const start = startOfDay(subDays(end, days - 1));
    const dayList = eachDayOfInterval({ start, end });
    const dayKeys = dayList.map((d) => fmtDate(d, "yyyy-MM-dd"));

    const prodCatMap = new Map<string, string>();
    products.forEach((p: any) => {
      if (p.category_id) prodCatMap.set(p.id, p.category_id);
    });

    const catDayMap = new Map<string, Map<string, number>>();
    const childToParent = new Map<string, string>();
    parentCategories.forEach((p) => {
      getChildren(p.id).forEach((ch) => childToParent.set(ch.id, p.id));
    });
    const resolveParent = (catId: string) => childToParent.get(catId) || catId;

    filteredOrderItems.forEach((oi: any) => {
      const catId = prodCatMap.get(oi.product_id);
      if (!catId) return;
      const parentId = resolveParent(catId);
      const orderDate = oi.orders?.created_at;
      if (!orderDate) return;
      const dayKey = orderDate.slice(0, 10);
      if (!catDayMap.has(parentId)) catDayMap.set(parentId, new Map());
      const dm = catDayMap.get(parentId)!;
      dm.set(dayKey, (dm.get(dayKey) || 0) + (Number(oi.total_price) || 0));
    });

    const result = new Map<string, { day: string; rev: number }[]>();
    parentCategories.forEach((c) => {
      const dm = catDayMap.get(c.id);
      result.set(
        c.id,
        dayKeys.map((dk) => ({ day: dk, rev: dm?.get(dk) || 0 }))
      );
    });
    return result;
  }, [products, filteredOrderItems, dateRange, parentCategories, categories, getChildren]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  const exportCsv = useCallback(() => {
    const header = "Category,Products,Orders,Revenue\n";
    const rows = analyticsRows
      .map((r) => `"${r.name.replace(/"/g, '""')}",${r.productCount},${r.orderCount},${r.revenue.toFixed(2)}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `category-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }, [analyticsRows]);

  const CHART_COLORS = [
    "hsl(var(--primary))",
    "#0ea5e9",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
    "#f43f5e",
  ];

  // Filtering
  const filteredParents = useMemo(() => {
    return parentCategories.filter((c) => {
      const children = getChildren(c.id);
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        children.some((ch) => ch.name.toLowerCase().includes(q) || ch.slug.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (statusFilter === "active") return c.is_active;
      if (statusFilter === "inactive") return !c.is_active;
      if (statusFilter === "featured") return c.is_featured;
      if (statusFilter === "parents") return true;
      if (statusFilter === "subs") return children.length > 0;
      return true;
    });
  }, [parentCategories, getChildren, search, statusFilter]);

  const saveMutation = useMutation({
    mutationFn: async (cat: any) => {
      const slug =
        cat.slug ||
        cat.name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");
      const payload = { ...cat, slug };
      delete payload.children;
      delete payload.slug_manual;
      if (cat.id) {
        const { error } = await supabase.from("categories").update(payload as any).eq("id", cat.id);
        if (error) throw error;
      } else {
        delete payload.id;
        const { error } = await supabase.from("categories").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      setDialogOpen(false);
      toast.success("Category saved successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("categories").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-categories"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ id, is_featured }: { id: string; is_featured: boolean }) => {
      const { error } = await supabase.from("categories").update({ is_featured }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-categories"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Category deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkAction = useMutation({
    mutationFn: async ({ ids, action }: { ids: string[]; action: "delete" | "activate" | "deactivate" }) => {
      if (action === "delete") {
        const { error } = await supabase.from("categories").delete().in("id", ids);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("categories")
          .update({ is_active: action === "activate" })
          .in("id", ids);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      setSelected(new Set());
      toast.success("Bulk action applied");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleSelectAll = () => {
    if (selected.size === categories.length) setSelected(new Set());
    else setSelected(new Set(categories.map((c) => c.id)));
  };

  const reorderMutation = useMutation({
    mutationFn: async (reordered: typeof parentCategories) => {
      const updates = reordered.map((cat, i) =>
        supabase.from("categories").update({ sort_order: i }).eq("id", cat.id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Sort order saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleReorder = useCallback(
    (reordered: typeof parentCategories) => {
      reorderMutation.mutate(reordered);
    },
    [reorderMutation]
  );

  const { dragIndex, overIndex, getDragProps } = useDragReorder(filteredParents, handleReorder);

  const openEdit = (cat?: any, parentId?: string | null) => {
    setEditing(
      cat
        ? { ...cat }
        : {
            name: "",
            slug: "",
            is_active: true,
            is_featured: false,
            sort_order: categories.length,
            icon: "",
            icon_url: "",
            image_url: "",
            description: "",
            parent_id: parentId ?? null,
            accent_color: "#6366f1",
            banner_url: "",
            banner_type: "image",
            youtube_url: "",
            meta_title: "",
            meta_description: "",
            meta_keywords: "",
          }
    );
    setDialogOpen(true);
  };

  const updateField = (field: string, value: any) => {
    setEditing((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const totalActive = useMemo(() => categories.filter((c) => c.is_active).length, [categories]);
  const totalFeatured = useMemo(() => categories.filter((c) => c.is_featured).length, [categories]);
  const totalSubcategories = useMemo(() => categories.filter((c) => !!c.parent_id).length, [categories]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        icon={<FolderTree className="w-5 h-5 text-primary" />}
        title="Categories"
        description="Structure catalogue hierarchy, storefront filters, branding visuals, and SEO"
        actions={
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={exportCategories}
              className="gap-1.5 rounded-xl h-9 w-full sm:w-auto justify-center text-xs font-semibold"
            >
              <Download className="h-3.5 w-3.5 text-muted-foreground" /> Export
            </Button>

            <BulkUpload
              mode="categories"
              onComplete={() => qc.invalidateQueries({ queryKey: ["admin-categories"] })}
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`gap-1.5 rounded-xl h-9 w-full sm:w-auto justify-center text-xs font-semibold transition-all ${
                showAnalytics ? "bg-primary/10 border-primary text-primary" : ""
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
              <span>{showAnalytics ? "Hide Analytics" : "Analytics"}</span>
            </Button>

            <Button
              onClick={() => openEdit()}
              size="sm"
              className="gap-1.5 rounded-xl h-9 w-full sm:w-auto justify-center bg-primary text-primary-foreground font-semibold shadow-sm hover:shadow active:scale-95 transition-all text-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Add Category
            </Button>
          </div>
        }
      />

      {/* ── Collapsible Analytics Drawer ── */}
      <AnimatePresence>
        {showAnalytics && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <Card className="glass border-border/80 overflow-hidden shadow-sm">
              <div className="p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" /> Category Revenue & Performance
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Revenue volume and order conversions grouped by category
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/50 text-xs">
                      {(["7d", "30d", "90d", "all"] as const).map((range) => (
                        <button
                          key={range}
                          type="button"
                          onClick={() => setDateRange(range)}
                          className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                            dateRange === range
                              ? "bg-background text-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {range === "7d"
                            ? "7 Days"
                            : range === "30d"
                            ? "30 Days"
                            : range === "90d"
                            ? "90 Days"
                            : "All Time"}
                        </button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-8 rounded-xl font-medium"
                      onClick={exportCsv}
                    >
                      <Download className="w-3.5 h-3.5" /> Export CSV
                    </Button>
                  </div>
                </div>

                {/* Revenue Bar Chart */}
                {analyticsRows.some((r) => r.revenue > 0) && (
                  <div className="h-44 sm:h-48 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsRows.slice(0, 8)} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={55} />
                        <RechartsTooltip
                          contentStyle={{
                            background: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 12,
                            fontSize: 12,
                          }}
                          formatter={(value: number) => [formatPrice(value), "Revenue"]}
                        />
                        <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                          {analyticsRows.slice(0, 8).map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Analytics Table */}
                <div className="rounded-xl border border-border/70 overflow-x-auto shadow-xs">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                          <span className="flex items-center gap-1">Category <ArrowUpDown className="w-3 h-3" /></span>
                        </TableHead>
                        <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("products")}>
                          <span className="flex items-center gap-1 justify-end">Products <ArrowUpDown className="w-3 h-3" /></span>
                        </TableHead>
                        <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("orders")}>
                          <span className="flex items-center gap-1 justify-end">Orders <ArrowUpDown className="w-3 h-3" /></span>
                        </TableHead>
                        <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("revenue")}>
                          <span className="flex items-center gap-1 justify-end">Revenue <ArrowUpDown className="w-3 h-3" /></span>
                        </TableHead>
                        <TableHead className="text-right w-[110px]">
                          <span className="text-xs">Trend</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analyticsRows.map((row, i) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                              />
                              <span className="text-xs font-semibold truncate">{row.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-xs">{row.productCount}</TableCell>
                          <TableCell className="text-right tabular-nums text-xs">{row.orderCount}</TableCell>
                          <TableCell className="text-right tabular-nums font-bold text-xs">
                            {formatPrice(row.revenue)}
                          </TableCell>
                          <TableCell className="text-right p-1">
                            {(() => {
                              const data = sparklineData.get(row.id) || [];
                              const hasData = data.some((d) => d.rev > 0);
                              if (!hasData) return <span className="text-xs text-muted-foreground">—</span>;
                              return (
                                <div className="w-[90px] h-[24px] ml-auto">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data}>
                                      <Line
                                        type="monotone"
                                        dataKey="rev"
                                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                                        strokeWidth={1.5}
                                        dot={false}
                                      />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              );
                            })()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Search & Filter Controls ── */}
      <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3 shadow-sm">
        <div className="relative flex-1 w-full max-w-full md:max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelected(new Set());
            }}
            placeholder="Search categories by name, slug, subcategory..."
            className="pl-9 h-10 rounded-xl bg-background/80 border-border/80 text-sm focus-visible:ring-primary/20 w-full"
          />
        </div>

        <div className="flex items-center bg-muted/40 p-1 rounded-xl border border-border/50 text-xs overflow-x-auto w-full md:w-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-medium text-center whitespace-nowrap transition-all ${
              statusFilter === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({categories.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-medium text-center whitespace-nowrap transition-all ${
              statusFilter === "active"
                ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Active ({totalActive})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("featured")}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-medium text-center whitespace-nowrap transition-all ${
              statusFilter === "featured"
                ? "bg-background text-amber-500 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Featured ({totalFeatured})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("parents")}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-medium text-center whitespace-nowrap transition-all ${
              statusFilter === "parents"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Top-Level ({parentCategories.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("subs")}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-medium text-center whitespace-nowrap transition-all ${
              statusFilter === "subs"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Subs ({totalSubcategories})
          </button>
        </div>
      </div>

      {/* ── Category Cards Grid (High Density & Mobile Compact with Visual Previews) ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-card/40 border border-border/60 animate-pulse" />
          ))}
        </div>
      ) : filteredParents.length === 0 ? (
        <Card className="glass border-border/80">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderTree className="w-10 h-10 text-muted-foreground mb-3 opacity-40" />
            <p className="text-sm font-semibold text-foreground">
              {search ? "No categories match your search" : "No categories created yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {search ? "Try clearing the search filter." : "Create parent categories and subcategories for your catalogue."}
            </p>
            {!search && (
              <Button
                variant="outline"
                className="mt-4 gap-1.5 rounded-xl h-9 text-xs font-semibold"
                onClick={() => openEdit()}
              >
                <Plus className="w-3.5 h-3.5" /> Add Category
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredParents.map((c, idx) => {
            const children = getChildren(c.id);
            const isDragging = dragIndex === idx;
            const isOver = overIndex === idx;
            const isSelected = selected.has(c.id);
            const parentProdCount = prodCountMap.get(c.id) || 0;
            const totalBranchProducts =
              parentProdCount +
              children.reduce((sum, ch) => sum + (prodCountMap.get(ch.id) || 0), 0);

            const hasBannerVisual = c.banner_url || c.image_url;

            return (
              <div
                key={c.id}
                {...(search ? {} : getDragProps(idx))}
                className={`${isDragging ? "opacity-50" : isOver ? "scale-[1.01]" : ""}`}
                style={{ transition: "transform 0.15s ease" }}
              >
                <div
                  className={`rounded-2xl border bg-card/80 backdrop-blur-md relative overflow-hidden transition-all shadow-xs ${
                    isSelected ? "border-primary/60 bg-primary/5" : "border-border/70 hover:border-border"
                  }`}
                >
                  {/* Top Banner Visual Strip (if banner or image exists) */}
                  {hasBannerVisual ? (
                    <div className="h-16 w-full relative overflow-hidden bg-muted/40 cursor-pointer" onClick={() => openEdit(c)}>
                      <img
                        src={c.banner_url || c.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(to bottom, transparent 0%, rgba(15,15,15,0.7) 100%)`,
                        }}
                      />
                      {/* Top Accent Strip */}
                      <div
                        className="absolute top-0 left-0 right-0 h-1"
                        style={{ background: c.accent_color || "#6366f1" }}
                      />
                    </div>
                  ) : (
                    <div
                      className="h-1 w-full"
                      style={{ background: c.accent_color || "#6366f1" }}
                    />
                  )}

                  <div className="p-3 sm:p-4 space-y-3">
                    {/* Top Row: Grip + Checkbox + Icon + Title + Switch */}
                    <div className="flex items-center gap-2.5">
                      {!search && (
                        <div className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground shrink-0">
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>
                      )}

                      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(c.id)}
                          aria-label={`Select ${c.name}`}
                          className="h-4 w-4 rounded-md"
                        />
                      </div>

                      {/* Icon Avatar */}
                      <div
                        className="w-10 h-10 rounded-xl bg-muted/60 border border-border/80 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer"
                        style={{ background: `${c.accent_color || "#6366f1"}15` }}
                        onClick={() => openEdit(c)}
                      >
                        {c.icon_url ? (
                          <img src={c.icon_url} alt="" className="w-full h-full object-contain" />
                        ) : c.icon ? (
                          <span className="text-base">{c.icon}</span>
                        ) : (
                          <FolderTree className="w-5 h-5 text-muted-foreground opacity-50" />
                        )}
                      </div>

                      {/* Title & Stats */}
                      <div
                        className="min-w-0 flex-1 cursor-pointer"
                        onClick={() => openEdit(c)}
                      >
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-xs sm:text-sm text-foreground truncate">
                            {c.name}
                          </h3>
                          {c.is_featured && (
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5 truncate">
                          <span className="font-mono">/{c.slug}</span>
                          <span>·</span>
                          <span className="font-medium text-foreground">
                            {totalBranchProducts} {totalBranchProducts === 1 ? "product" : "products"}
                          </span>
                        </div>
                      </div>

                      {/* Quick Active Switch */}
                      <div className="shrink-0 pl-1" onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={!!c.is_active}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({ id: c.id, is_active: checked })
                          }
                          aria-label={`Toggle status for ${c.name}`}
                          className="scale-75 origin-right"
                        />
                      </div>
                    </div>

                    {/* Subcategories Section */}
                    {children.length > 0 && (
                      <div className="pt-2 border-t border-border/40 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold uppercase tracking-wider px-0.5">
                          <span>Subcategories ({children.length})</span>
                          <button
                            type="button"
                            onClick={() => openEdit(undefined, c.id)}
                            className="text-primary hover:underline font-bold"
                          >
                            + Add Sub
                          </button>
                        </div>

                        <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5 no-scrollbar">
                          {children.map((sub) => (
                            <div
                              key={sub.id}
                              className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors border border-border/40"
                            >
                              <div
                                className="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer"
                                onClick={() => openEdit(sub)}
                              >
                                <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                                {sub.icon_url ? (
                                  <img src={sub.icon_url} alt="" className="w-4 h-4 rounded object-contain shrink-0" />
                                ) : sub.icon ? (
                                  <span className="text-xs">{sub.icon}</span>
                                ) : null}
                                <span className="text-xs font-medium text-foreground truncate">
                                  {sub.name}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  ({prodCountMap.get(sub.id) || 0})
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <Switch
                                  checked={!!sub.is_active}
                                  onCheckedChange={(checked) =>
                                    toggleActiveMutation.mutate({ id: sub.id, is_active: checked })
                                  }
                                  className="scale-60 origin-right"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground rounded"
                                  onClick={() => openEdit(sub)}
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10 rounded"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="rounded-2xl">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete "{sub.name}"?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently remove this subcategory.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                                        onClick={() => deleteMutation.mutate(sub.id)}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Symmetrical Bottom Action Bar */}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-border/40">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 rounded-lg text-[11px] justify-center font-medium gap-1 px-2 hover:bg-primary/5 hover:text-primary hover:border-primary/40"
                        onClick={() => openEdit(undefined, c.id)}
                      >
                        <Plus className="w-3 h-3 text-primary" /> Add Sub
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-lg text-[11px] font-medium gap-1 px-2.5"
                        onClick={() => notifyCategoryMut.mutate(c.id)}
                        disabled={notifyCategoryMut.isPending}
                        title="Broadcast notification to subscribers"
                      >
                        <Mail className="w-3 h-3 text-primary" />
                        <span className="hidden sm:inline">Notify</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 rounded-lg text-[11px] justify-center font-medium gap-1 px-2"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="w-3 h-3 text-primary" /> Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive shrink-0 rounded-lg hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete category "{c.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will delete "{c.name}" and all of its subcategories. Products inside will become uncategorized.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                              onClick={() => deleteMutation.mutate(c.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Floating Symmetrical Bulk Action Bar ── */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 glass-strong border border-border/80 rounded-2xl shadow-2xl px-4 sm:px-5 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3 z-50 max-w-[95vw]"
          >
            <Checkbox
              checked={selected.size === categories.length && categories.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-xs font-semibold whitespace-nowrap">{selected.size} selected</span>
            <div className="w-px h-5 bg-border/80" />

            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-xl text-xs gap-1 font-semibold"
              onClick={() => bulkAction.mutate({ ids: Array.from(selected), action: "activate" })}
              disabled={bulkAction.isPending}
            >
              <Eye className="w-3 h-3 text-emerald-500" /> Activate
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-xl text-xs gap-1 font-semibold"
              onClick={() => bulkAction.mutate({ ids: Array.from(selected), action: "deactivate" })}
              disabled={bulkAction.isPending}
            >
              <EyeOff className="w-3 h-3 text-muted-foreground" /> Disable
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 rounded-xl text-xs gap-1 font-semibold"
                  disabled={bulkAction.isPending}
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {selected.size} categories?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the selected categories and cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                    onClick={() => bulkAction.mutate({ ids: Array.from(selected), action: "delete" })}
                  >
                    Delete All Selected
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg"
              onClick={() => setSelected(new Set())}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Category Studio Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[94vw] sm:max-w-xl md:max-w-2xl h-[84vh] max-h-[84vh] overflow-hidden p-0 gap-0 rounded-2xl sm:rounded-3xl border border-border/80 shadow-2xl flex flex-col bg-card">
          {editing && (
            <CategoryStudio
              editing={editing}
              updateField={updateField}
              parentCategories={parentCategories}
              saveMutation={saveMutation}
              onClose={() => setDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
