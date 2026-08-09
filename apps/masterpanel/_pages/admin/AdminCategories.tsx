"use client";
import { useState, useCallback, useMemo } from "react";
import { subDays, startOfDay, format as fmtDate, eachDayOfInterval } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, ChevronRight, Check, X, FolderTree, Eye, EyeOff, Star, GripVertical, BarChart3, ChevronDown, ChevronUp, Package, ShoppingCart, DollarSign, ArrowUpDown, Download, CalendarDays, TrendingUp, TrendingDown, Minus, Filter, Mail } from "lucide-react";
import SearchInput from "@/components/admin/SearchInput";
import { useServerFn } from "@/lib/server-fn-compat";
import { notifyAboutCategory } from "@/lib/email-broadcasts.functions";
import BulkUpload from "@/components/admin/BulkUpload";
import { exportCategories } from "@/components/admin/bulkExport";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/lib/app-toast";
import ImageUpload from "@/components/ImageUpload";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { Checkbox } from "@/components/ui/checkbox";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDragReorder } from "@/hooks/use-drag-reorder";
import { useCurrency } from "@/contexts/CurrencyContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LineChart, Line } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// Category edit tabs with filters management
const CategoryEditTabs = ({ editing, updateField, parentCategories, saveMutation }: {
  editing: Record<string, any>;
  updateField: (field: string, value: any) => void;
  parentCategories: any[];
  saveMutation: any;
}) => {
  const qc = useQueryClient();
  const categoryId = editing.id;
  const [newFilterName, setNewFilterName] = useState("");
  const [newFilterValues, setNewFilterValues] = useState("");

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
    const values = newFilterValues.split(",").map(v => v.trim()).filter(Boolean);
    if (values.length === 0) { toast.error("Add at least one filter value"); return; }
    const { error } = await supabase.from("category_filters").insert({
      category_id: categoryId,
      filter_name: newFilterName.trim(),
      filter_values: values,
      sort_order: filters.length,
    });
    if (error) { toast.error(error.message); return; }
    setNewFilterName("");
    setNewFilterValues("");
    refetchFilters();
    qc.invalidateQueries({ queryKey: ["category-filters"] });
    toast.success("Filter added");
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

  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="appearance">Appearance</TabsTrigger>
        {categoryId && <TabsTrigger value="filters">Filters</TabsTrigger>}
        <TabsTrigger value="seo">SEO</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-4 mt-4">
        <div>
          <Label>Name</Label>
          <Input value={editing.name ?? ""} onChange={(e) => updateField("name", e.target.value)} />
        </div>
        <div>
          <Label>Slug</Label>
          <Input value={editing.slug ?? ""} onChange={(e) => updateField("slug", e.target.value)} placeholder="auto-generated" />
        </div>
        <div>
          <Label>Parent Category</Label>
          <Select value={editing.parent_id ?? "none"} onValueChange={(v) => updateField("parent_id", v === "none" ? null : v)}>
            <SelectTrigger><SelectValue placeholder="None (top-level)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (top-level)</SelectItem>
              {parentCategories.filter((p) => p.id !== editing.id).map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Description</Label>
          <Textarea value={editing.description ?? ""} onChange={(e) => updateField("description", e.target.value)} rows={2} />
        </div>
        <div>
          <Label>Sort Order</Label>
          <Input type="number" value={editing.sort_order ?? 0} onChange={(e) => updateField("sort_order", +e.target.value)} />
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch checked={editing.is_active ?? true} onCheckedChange={(v) => updateField("is_active", v)} />
            <Label>Active</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={editing.is_featured ?? false} onCheckedChange={(v) => updateField("is_featured", v)} />
            <Label>Featured</Label>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="appearance" className="space-y-4 mt-4">
        <div>
          <Label>Custom Icon (upload image)</Label>
          <ImageUpload bucket="banners" folder="category-icons" value={editing.icon_url ?? ""} onUploaded={(url) => updateField("icon_url", url)} />
          <p className="text-xs text-muted-foreground mt-1">Or use an emoji fallback:</p>
          <Input value={editing.icon ?? ""} onChange={(e) => updateField("icon", e.target.value)} placeholder="🛍️" className="mt-1" />
        </div>
        <div>
          <Label>Accent Color</Label>
          <div className="flex items-center gap-3 mt-1">
            <input type="color" value={editing.accent_color || "#6366f1"} onChange={(e) => updateField("accent_color", e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent" />
            <Input value={editing.accent_color || "#6366f1"} onChange={(e) => updateField("accent_color", e.target.value)} placeholder="#6366f1" className="flex-1" />
          </div>
        </div>
        <div>
          <Label>Category Image</Label>
          <ImageUpload bucket="banners" folder="categories" value={editing.image_url ?? ""} onUploaded={(url) => updateField("image_url", url)} />
        </div>
        <div className="border-t border-border pt-4">
          <Label className="text-base font-semibold">Category Banner</Label>
          <p className="text-xs text-muted-foreground mb-3">Shows at the top of the category page</p>
          <div className="space-y-3">
            <div>
              <Label>Banner Type</Label>
              <Select value={editing.banner_type ?? "image"} onValueChange={(v) => updateField("banner_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image / GIF</SelectItem>
                  <SelectItem value="youtube">YouTube Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(editing.banner_type ?? "image") === "image" ? (
              <div>
                <Label>Banner Image / GIF</Label>
                <ImageUpload bucket="banners" folder="category-banners" value={editing.banner_url ?? ""} onUploaded={(url) => updateField("banner_url", url)} accept="image/*,.gif" />
              </div>
            ) : (
              <div>
                <Label>YouTube URL</Label>
                <Input value={editing.youtube_url ?? ""} onChange={(e) => updateField("youtube_url", e.target.value)} placeholder="https://youtube.com/watch?v=..." />
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      {categoryId && (
        <TabsContent value="filters" className="space-y-4 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold">Custom Filters</p>
          </div>
          <p className="text-xs text-muted-foreground">Add filter groups (e.g. "Material", "Style") that appear in the shop sidebar when this category is selected.</p>

          {/* Existing filters */}
          {filters.length > 0 && (
            <div className="space-y-2">
              {filters.map((f: any) => (
                <div key={f.id} className="flex items-start gap-2 p-3 rounded-xl bg-secondary/30 border border-border/50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{f.filter_name}</span>
                      <Badge variant={f.is_active ? "default" : "secondary"} className="text-[10px]">
                        {f.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(f.filter_values || []).map((v: string) => (
                        <span key={v} className="px-2 py-0.5 rounded-lg bg-secondary text-muted-foreground text-[11px]">{v}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleFilterActive(f.id, f.is_active)}>
                      {f.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteFilter(f.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add new filter */}
          <div className="border-t border-border pt-3 space-y-3">
            <div>
              <Label>Filter Name</Label>
              <Input value={newFilterName} onChange={(e) => setNewFilterName(e.target.value)} placeholder="e.g. Material, Style, Fit" />
            </div>
            <div>
              <Label>Values (comma-separated)</Label>
              <Input value={newFilterValues} onChange={(e) => setNewFilterValues(e.target.value)} placeholder="e.g. Cotton, Polyester, Silk" />
            </div>
            <Button variant="outline" className="w-full gap-2" onClick={addFilter} disabled={!newFilterName.trim()}>
              <Plus className="w-4 h-4" /> Add Filter
            </Button>
          </div>
        </TabsContent>
      )}

      <TabsContent value="seo" className="space-y-4 mt-4">
        <div>
          <Label>Meta Title</Label>
          <Input value={editing.meta_title ?? ""} onChange={(e) => updateField("meta_title", e.target.value)} placeholder="Category page title (max 60 chars)" maxLength={60} />
          <p className="text-xs text-muted-foreground mt-1">{(editing.meta_title ?? "").length}/60</p>
        </div>
        <div>
          <Label>Meta Description</Label>
          <Textarea value={editing.meta_description ?? ""} onChange={(e) => updateField("meta_description", e.target.value)} placeholder="Category page description (max 160 chars)" rows={3} maxLength={160} />
          <p className="text-xs text-muted-foreground mt-1">{(editing.meta_description ?? "").length}/160</p>
        </div>
        <div>
          <Label>Meta Keywords</Label>
          <Input value={editing.meta_keywords ?? ""} onChange={(e) => updateField("meta_keywords", e.target.value)} placeholder="keyword1, keyword2, keyword3" />
        </div>
      </TabsContent>

      <Button className="w-full mt-4" onClick={() => saveMutation.mutate(editing)} disabled={saveMutation.isPending}>
        {saveMutation.isPending ? "Saving..." : "Save Category"}
      </Button>
    </Tabs>
  );
};

const AdminCategories = () => {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "products" | "orders" | "revenue">("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("all");
  const { formatPrice } = useCurrency();
  const notifyCategoryFn = useServerFn(notifyAboutCategory);
  const notifyCategoryMut = useMutation({
    mutationFn: (id: string) => notifyCategoryFn({ data: { categoryId: id, audience_type: "subscribers", sendNow: true } }),
    onSuccess: () => toast.success("Email queued to subscribers ✉️"),
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const parentCategories = categories.filter((c) => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter((c) => c.parent_id === parentId);

  // Analytics: fetch products + order_items with category info
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
      const { data } = await supabase.from("order_items").select("product_id, quantity, total_price, order_id, orders!inner(created_at)").limit(5000);
      return data || [];
    },
    staleTime: 60_000,
  });

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

  // Previous period order items (for % change calculation)
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
    products.forEach((p: any) => { if (p.category_id) prodCatMap.set(p.id, p.category_id); });
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
    products.forEach((p: any) => { if (p.category_id) prodCatMap.set(p.id, p.category_id); });
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
          if (s) { acc.productCount += s.productCount; acc.orderCount += s.orderCount; acc.revenue += s.revenue; }
          return acc;
        },
        { productCount: 0, orderCount: 0, revenue: 0 }
      );
      const prevRev = allIds.reduce((sum, id) => {
        const parentId = resolveParent(id);
        return sum + (prevRevenueMap.get(id) || 0);
      }, 0);
      return { id: c.id, name: c.name, icon: c.icon, icon_url: c.icon_url, accent_color: c.accent_color, ...stats, prevRevenue: prevRev };
    });
    rows.sort((a, b) => {
      const key = sortBy === "name" ? "name" : sortBy === "products" ? "productCount" : sortBy === "orders" ? "orderCount" : "revenue";
      if (key === "name") return sortDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      return sortDir === "asc" ? (a as any)[key] - (b as any)[key] : (b as any)[key] - (a as any)[key];
    });
    return rows;
  }, [parentCategories, categoryAnalytics, prevRevenueMap, sortBy, sortDir, categories]);

  // Build daily sparkline data per parent category
  const sparklineData = useMemo(() => {
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : dateRange === "90d" ? 90 : 30;
    const end = new Date();
    const start = startOfDay(subDays(end, days - 1));
    const dayList = eachDayOfInterval({ start, end });
    const dayKeys = dayList.map((d) => fmtDate(d, "yyyy-MM-dd"));

    const prodCatMap = new Map<string, string>();
    products.forEach((p: any) => { if (p.category_id) prodCatMap.set(p.id, p.category_id); });

    // parentCatId → { dayKey → revenue }
    const catDayMap = new Map<string, Map<string, number>>();

    // Map child category ids to parent ids
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

    // Convert to array format per category
    const result = new Map<string, { day: string; rev: number }[]>();
    parentCategories.forEach((c) => {
      const dm = catDayMap.get(c.id);
      result.set(c.id, dayKeys.map((dk) => ({ day: dk, rev: dm?.get(dk) || 0 })));
    });
    return result;
  }, [products, filteredOrderItems, dateRange, parentCategories, categories]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("desc"); }
  };

  const exportCsv = useCallback(() => {
    const header = "Category,Products,Orders,Revenue\n";
    const rows = analyticsRows.map((r) => `"${r.name.replace(/"/g, '""')}",${r.productCount},${r.orderCount},${r.revenue.toFixed(2)}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `category-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }, [analyticsRows]);

  const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(262 83% 58%)", "hsl(330 81% 60%)", "hsl(200 95% 50%)", "hsl(150 60% 45%)", "hsl(40 95% 55%)", "hsl(0 72% 51%)"];

  // Filter by search
  const filteredParents = parentCategories.filter((c) => {
    const q = search.toLowerCase();
    if (!q) return true;
    const children = getChildren(c.id);
    return c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q) || children.some((ch) => ch.name.toLowerCase().includes(q));
  });

  const saveMutation = useMutation({
    mutationFn: async (cat: any) => {
      const slug = cat.slug || cat.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const payload = { ...cat, slug };
      delete payload.children;
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
      toast.success("Category saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkAction = useMutation({
    mutationFn: async ({ ids, action }: { ids: string[]; action: "delete" | "activate" | "deactivate" }) => {
      if (action === "delete") {
        const { error } = await supabase.from("categories").delete().in("id", ids);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").update({ is_active: action === "activate" }).in("id", ids);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      setSelected(new Set());
      toast.success("Bulk action completed");
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

  // Drag-and-drop reorder
  const reorderMutation = useMutation({
    mutationFn: async (reordered: typeof parentCategories) => {
      const updates = reordered.map((cat, i) =>
        supabase.from("categories").update({ sort_order: i }).eq("id", cat.id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Order saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleReorder = useCallback((reordered: typeof parentCategories) => {
    reorderMutation.mutate(reordered);
  }, [reorderMutation]);

  const { dragIndex, overIndex, getDragProps } = useDragReorder(filteredParents, handleReorder);

  const openEdit = (cat?: any) => {
    setEditing(
      cat
        ? { ...cat }
        : {
            name: "", slug: "", is_active: true, is_featured: false, sort_order: 0,
            icon: "", icon_url: "", image_url: "", description: "", parent_id: null,
            accent_color: "#6366f1", banner_url: "", banner_type: "image", youtube_url: "",
            meta_title: "", meta_description: "", meta_keywords: "",
          }
    );
    setDialogOpen(true);
  };

  const updateField = (field: string, value: any) => {
    setEditing((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const totalActive = categories.filter((c) => c.is_active).length;
  const totalFeatured = categories.filter((c) => c.is_featured).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <FolderTree className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Categories</h1>
            <p className="text-xs text-muted-foreground">{categories.length} total · {totalActive} active · {totalFeatured} featured</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCategories} className="gap-2"><Download className="h-4 w-4" /> Export</Button>
          <BulkUpload mode="categories" onComplete={() => qc.invalidateQueries({ queryKey: ["admin-categories"] })} />
          <Button onClick={() => openEdit()} className="gap-2">
            <Plus className="h-4 w-4" /> Add Category
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search categories…"
        />
      </div>

      {/* Category Analytics Card */}
      <Card className="glass overflow-hidden">
        <button
          onClick={() => setShowAnalytics(!showAnalytics)}
          className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">Category Analytics</p>
              <p className="text-xs text-muted-foreground">Products, orders & revenue per category</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {products.length} products</span>
              <span className="flex items-center gap-1"><ShoppingCart className="w-3.5 h-3.5" /> {orderItems.length} items sold</span>
            </div>
            {showAnalytics && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-7"
                onClick={(e) => { e.stopPropagation(); exportCsv(); }}
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </Button>
            )}
            {showAnalytics ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>

        <AnimatePresence>
          {showAnalytics && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-4">
                {/* Date Range Filter */}
                <div className="flex items-center gap-2 flex-wrap">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  {(["7d", "30d", "90d", "all"] as const).map((range) => (
                    <Button
                      key={range}
                      variant={dateRange === range ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs px-3"
                      onClick={() => setDateRange(range)}
                    >
                      {range === "7d" ? "Last 7 days" : range === "30d" ? "Last 30 days" : range === "90d" ? "Last 90 days" : "All time"}
                    </Button>
                  ))}
                </div>

                {/* Revenue Bar Chart */}
                {analyticsRows.some((r) => r.revenue > 0) && (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsRows.slice(0, 8)} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={50} />
                        <RechartsTooltip
                          contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
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

                {/* Table */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                          <span className="flex items-center gap-1">Category <ArrowUpDown className="w-3 h-3" /></span>
                        </TableHead>
                        <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("products")}>
                          <span className="flex items-center gap-1 justify-end"><Package className="w-3 h-3" /> Products <ArrowUpDown className="w-3 h-3" /></span>
                        </TableHead>
                        <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("orders")}>
                          <span className="flex items-center gap-1 justify-end"><ShoppingCart className="w-3 h-3" /> Orders <ArrowUpDown className="w-3 h-3" /></span>
                        </TableHead>
                        <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("revenue")}>
                          <span className="flex items-center gap-1 justify-end"><DollarSign className="w-3 h-3" /> Revenue <ArrowUpDown className="w-3 h-3" /></span>
                        </TableHead>
                        <TableHead className="text-right w-[120px]">
                          <span className="text-xs">Trend</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analyticsRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No categories yet</TableCell>
                        </TableRow>
                      ) : (
                        analyticsRows.map((row, i) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                                <div className="w-6 h-6 rounded bg-secondary/50 flex items-center justify-center shrink-0 overflow-hidden">
                                  {row.icon_url ? <img src={row.icon_url} alt="" className="w-full h-full object-contain" /> : row.icon ? <span className="text-xs">{row.icon}</span> : <FolderTree className="w-3 h-3 text-muted-foreground" />}
                                </div>
                                <span className="text-sm font-medium truncate">{row.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{row.productCount}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.orderCount}</TableCell>
                            <TableCell className="text-right tabular-nums font-medium">
                              <div className="flex items-center justify-end gap-1.5">
                                <span>{formatPrice(row.revenue)}</span>
                                {dateRange !== "all" && (() => {
                                  const prev = row.prevRevenue;
                                  if (prev === 0 && row.revenue === 0) return null;
                                  if (prev === 0) return (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-500">
                                      <TrendingUp className="w-3 h-3" /> New
                                    </span>
                                  );
                                  const pct = ((row.revenue - prev) / prev) * 100;
                                  const isUp = pct > 0;
                                  const isFlat = Math.abs(pct) < 0.5;
                                  return (
                                    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${isFlat ? "text-muted-foreground" : isUp ? "text-emerald-500" : "text-destructive"}`}>
                                      {isFlat ? <Minus className="w-3 h-3" /> : isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                      {isFlat ? "0%" : `${isUp ? "+" : ""}${pct.toFixed(1)}%`}
                                    </span>
                                  );
                                })()}
                              </div>
                            </TableCell>
                            <TableCell className="text-right p-1">
                              {(() => {
                                const data = sparklineData.get(row.id) || [];
                                const hasData = data.some((d) => d.rev > 0);
                                if (!hasData) return <span className="text-xs text-muted-foreground">—</span>;
                                return (
                                  <div className="w-[100px] h-[28px] ml-auto">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <LineChart data={data}>
                                        <Line
                                          type="monotone"
                                          dataKey="rev"
                                          stroke={CHART_COLORS[i % CHART_COLORS.length]}
                                          strokeWidth={1.5}
                                          dot={false}
                                        />
                                        <RechartsTooltip
                                          contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 10, padding: "2px 6px" }}
                                          formatter={(v: number) => [formatPrice(v), ""]}
                                          labelFormatter={(l) => l}
                                        />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </div>
                                );
                              })()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="glass animate-pulse h-40" />
          ))}
        </div>
      ) : filteredParents.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderTree className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{search ? "No categories match your search" : "No categories yet"}</p>
            {!search && (
              <Button variant="outline" className="mt-3 gap-2" onClick={() => openEdit()}>
                <Plus className="w-4 h-4" /> Create your first category
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredParents.map((c, idx) => {
            const children = getChildren(c.id);
            const isDragging = dragIndex === idx;
            const isOver = overIndex === idx;
            return (
              <div
                {...(search ? {} : getDragProps(idx))}
                className={`${isDragging ? "opacity-50" : isOver ? "scale-[1.02]" : ""}`}
                style={{ transition: "transform 0.15s ease" }}
              >
                <Card className={`glass group hover:border-primary/30 transition-all relative overflow-hidden ${selected.has(c.id) ? "ring-2 ring-primary/50 border-primary/40" : ""} ${isOver ? "border-primary/50" : ""}`}>
                  {/* Accent strip */}
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ background: c.accent_color || "hsl(var(--primary))" }} />

                  <CardContent className="pt-5 pb-4 px-5">
                    {/* Top row: drag handle + checkbox + icon + name + actions */}
                    <div className="flex items-start gap-3">
                      {!search && (
                        <div className="cursor-grab active:cursor-grabbing mt-1 text-muted-foreground hover:text-foreground transition-colors">
                          <GripVertical className="w-4 h-4" />
                        </div>
                      )}
                      <Checkbox
                        checked={selected.has(c.id)}
                        onCheckedChange={() => toggleSelect(c.id)}
                        className="mt-1"
                      />
                      <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center shrink-0 overflow-hidden">
                        {c.icon_url ? (
                          <img src={c.icon_url} alt="" className="w-full h-full object-contain" />
                        ) : c.icon ? (
                          <span className="text-lg">{c.icon}</span>
                        ) : (
                          <FolderTree className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate">/{c.slug}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Notify subscribers" onClick={() => notifyCategoryMut.mutate(c.id)} disabled={notifyCategoryMut.isPending}>
                          <Mail className="h-3.5 w-3.5 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete "{c.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently delete this category and cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteMutation.mutate(c.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                      <Badge variant={c.is_active ? "default" : "secondary"} className="text-[10px] gap-1">
                        {c.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {c.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {c.is_featured && (
                        <Badge variant="outline" className="text-[10px] gap-1 text-amber-400 border-amber-500/30">
                          <Star className="w-3 h-3 fill-amber-400" /> Featured
                        </Badge>
                      )}
                      <div className="w-4 h-4 rounded-full border border-border shrink-0 ml-auto" style={{ background: c.accent_color || "#6366f1" }} />
                    </div>

                    {/* Description */}
                    {c.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{c.description}</p>
                    )}

                    {/* Subcategories */}
                    {children.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Subcategories ({children.length})</p>
                        {children.map((sub) => (
                          <div
                            key={sub.id}
                            className={`flex items-center gap-2 p-2 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors ${selected.has(sub.id) ? "ring-1 ring-primary/40" : ""}`}
                          >
                            <Checkbox
                              checked={selected.has(sub.id)}
                              onCheckedChange={() => toggleSelect(sub.id)}
                              className="scale-90"
                            />
                            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                            {sub.icon_url ? (
                              <img src={sub.icon_url} alt="" className="w-5 h-5 rounded object-contain shrink-0" />
                            ) : sub.icon ? (
                              <span className="text-sm">{sub.icon}</span>
                            ) : null}
                            <span className="text-xs font-medium text-foreground flex-1 truncate">{sub.name}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <Badge variant={sub.is_active ? "default" : "secondary"} className="text-[9px] px-1.5 py-0">
                                {sub.is_active ? "Active" : "Off"}
                              </Badge>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(sub)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete "{sub.name}"?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete this subcategory.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteMutation.mutate(sub.id)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 glass-strong border border-border rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-3 z-50"
          >
            <Checkbox
              checked={selected.size === categories.length && categories.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm font-medium">{selected.size} selected</span>
            <div className="w-px h-6 bg-border" />

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Activate
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Activate {selected.size} categories?</AlertDialogTitle>
                  <AlertDialogDescription>These categories will become visible on the storefront.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => bulkAction.mutate({ ids: Array.from(selected), action: "activate" })} disabled={bulkAction.isPending}>
                    {bulkAction.isPending ? "Activating..." : "Activate"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <EyeOff className="w-3.5 h-3.5" /> Deactivate
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deactivate {selected.size} categories?</AlertDialogTitle>
                  <AlertDialogDescription>These categories will be hidden from the storefront.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => bulkAction.mutate({ ids: Array.from(selected), action: "deactivate" })} disabled={bulkAction.isPending}>
                    {bulkAction.isPending ? "Deactivating..." : "Deactivate"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {selected.size} categories?</AlertDialogTitle>
                  <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => bulkAction.mutate({ ids: Array.from(selected), action: "delete" })} disabled={bulkAction.isPending}>
                    {bulkAction.isPending ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelected(new Set())}>
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit/Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit" : "Add"} Category</DialogTitle>
          </DialogHeader>
          {editing && (
            <CategoryEditTabs
              editing={editing}
              updateField={updateField}
              parentCategories={parentCategories}
              saveMutation={saveMutation}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCategories;
// code:4ce0
