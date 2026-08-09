"use client";
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "@/lib/router-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, X, Upload, Loader2, ImagePlus, Bell, CheckCheck, Eye, EyeOff, Download, Mail, Package, Images, Lock, RefreshCw, Wand2, CircleCheck, CircleAlert, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import PageHeader from "@/components/admin/PageHeader";
import SearchInput from "@/components/admin/SearchInput";
import { TableLoadingRow, TableEmptyRow } from "@/components/admin/TableStates";
import { useServerFn } from "@/lib/server-fn-compat";
import { notifyAboutProducts } from "@/lib/email-broadcasts.functions";
import { generateSerials, listStickerPresets, syncStockFromSerials } from "@/lib/serials.functions";
import { generateSku, checkSku, getDefaultSkuPrefix, setDefaultSkuPrefix } from "@/lib/sku.functions";
import { PrintStickersDialog } from "@/_pages/admin/AdminProductsManagement";
import BulkUpload from "@/components/admin/BulkUpload";
import { exportProducts, exportVariants } from "@/components/admin/bulkExport";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/lib/app-toast";
import ImageUpload from "@/components/ImageUpload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import CommerceSettingsPanel from "@/components/admin/CommerceSettingsPanel";
import ProductSettingsPanel from "@/components/admin/ProductSettingsPanel";
import MobileListCard from "@/components/admin/MobileListCard";

const PRODUCT_TYPES = [
  { value: "general", label: "General" },
  { value: "clothing", label: "Clothing & Apparel" },
  { value: "shoes", label: "Shoes & Footwear" },
  { value: "electronics", label: "Electronics" },
  { value: "grocery", label: "Grocery & Food" },
  { value: "liquid", label: "Liquid / Beverage" },
  { value: "cosmetics", label: "Cosmetics & Beauty" },
  { value: "furniture", label: "Furniture & Home" },
  { value: "books", label: "Books & Stationery" },
  { value: "accessories", label: "Accessories & Jewelry" },
] as const;

const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
const SHOE_SIZES = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"];
const COMMON_COLORS = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Red", hex: "#EF4444" },
  { name: "Blue", hex: "#3B82F6" },
  { name: "Green", hex: "#22C55E" },
  { name: "Yellow", hex: "#EAB308" },
  { name: "Purple", hex: "#A855F7" },
  { name: "Pink", hex: "#EC4899" },
  { name: "Orange", hex: "#F97316" },
  { name: "Gray", hex: "#6B7280" },
  { name: "Brown", hex: "#92400E" },
  { name: "Navy", hex: "#1E3A5F" },
];

const AdminProducts = () => {
  const qc = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const rawTab = new URLSearchParams(location.search).get("tab") || "list";
  const urlTab = ["list", "settings", "commerce"].includes(rawTab) ? rawTab : "list";
  const [activeMainTab, setActiveMainTab] = useState(urlTab);
  useEffect(() => {
    setActiveMainTab(urlTab);
  }, [urlTab]);
  const handleTabChange = (v: string) => {
    setActiveMainTab(v);
    navigate(`/sales/products?tab=${v}`);
  };
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const notifyProductsFn = useServerFn(notifyAboutProducts);
  const generateSerialsFn = useServerFn(generateSerials);
  const listStickerPresetsFn = useServerFn(listStickerPresets);
  const syncStockFn = useServerFn(syncStockFromSerials);
  const generateSkuFn = useServerFn(generateSku);
  const checkSkuFn = useServerFn(checkSku);
  const getDefaultSkuPrefixFn = useServerFn(getDefaultSkuPrefix);
  const setDefaultSkuPrefixFn = useServerFn(setDefaultSkuPrefix);
  const [skuPrefix, setSkuPrefix] = useState("ORZ");
  const [savingPrefix, setSavingPrefix] = useState(false);
  const [skuStatus, setSkuStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  useEffect(() => {
    getDefaultSkuPrefixFn().then((r: any) => setSkuPrefix(r.prefix)).catch(() => {});
  }, []);

  const handleSavePrefix = async () => {
    setSavingPrefix(true);
    try {
      const r: any = await setDefaultSkuPrefixFn({ data: { prefix: skuPrefix } });
      setSkuPrefix(r.prefix);
      toast.success(`Default SKU prefix set to "${r.prefix}"`);
    } catch (e: any) {
      toast.error(e.message ?? "Could not save prefix");
    } finally {
      setSavingPrefix(false);
    }
  };
  const [skuSuggestions, setSkuSuggestions] = useState<{ sku: string; source: "product" | "variant"; name?: string }[]>([]);
  const [skuTakenBy, setSkuTakenBy] = useState<string | null>(null);
  const syncStockMut = useMutation({
    mutationFn: () => syncStockFn(),
    onSuccess: (r: any) => {
      toast.success(`Synced ${r.variantsUpdated} variant(s) and ${r.productsUpdated} product(s) from Stock & Serials`);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      if (editing?.id) loadVariants(editing.id);
    },
    onError: (e: any) => toast.error(e.message ?? "Sync failed"),
  });
  const { data: stickerPresets = [] } = useQuery<any[]>({ queryKey: ["sticker-presets"], queryFn: () => listStickerPresetsFn() });
  const [printProduct, setPrintProduct] = useState<{ id: string; codes: string[] } | null>(null);
  const notifyMut = useMutation({
    mutationFn: (ids: string[]) => notifyProductsFn({ data: { productIds: ids, audience_type: "subscribers", sendNow: true } }),
    onSuccess: () => { toast.success("Email queued to subscribers ✉️"); setSelected(new Set()); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to send"),
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name, parent_id").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const parentCategories = categories.filter((c) => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter((c) => c.parent_id === parentId);

  const saveMutation = useMutation({
    mutationFn: async (product: any) => {
      const slug = product.slug || product.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const payload = { ...product, slug };
      delete payload.categories;
      const desiredStock = Number(payload.stock_quantity) || 0;
      let productId = product.id as string | undefined;
      if (productId) {
        const { error } = await supabase.from("products").update(payload as any).eq("id", productId);
        if (error) throw error;
      } else {
        delete payload.id;
        const { data: inserted, error } = await supabase.from("products").insert(payload as any).select("id").single();
        if (error) throw error;
        productId = inserted?.id as string;
      }

      // Link Products <-> Stock via SKU: ensure available serials match stock_quantity.
      if (productId && desiredStock > 0) {
        const { count } = await (supabase.from as any)("product_serials")
          .select("id", { count: "exact", head: true })
          .eq("product_id", productId)
          .eq("status", "available");
        const missing = desiredStock - (count ?? 0);
        if (missing > 0) {
          if (!product.sku) {
            toast.error("SKU is required to auto-generate stock serials");
          } else {
            try {
              await generateSerialsFn({ data: { productId, quantity: Math.min(missing, 500) } });
              toast.success(`Generated ${missing} serial${missing > 1 ? "s" : ""}`);
            } catch (e: any) {
              toast.error(`Serials: ${e.message}`);
            }
          }
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["serials"] });
      setDialogOpen(false);
      setEditing(null);
      toast.success("Product saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Product deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkAction = useMutation({
    mutationFn: async ({ ids, action }: { ids: string[]; action: "delete" | "activate" | "deactivate" }) => {
      if (action === "delete") {
        const { error } = await supabase.from("products").delete().in("id", ids);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").update({ is_active: action === "activate" }).in("id", ids);
        if (error) throw error;
      }
    },
    onSuccess: (_, { ids, action }) => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setSelected(new Set());
      toast.success(`${ids.length} product${ids.length > 1 ? "s" : ""} ${action === "delete" ? "deleted" : action === "activate" ? "activated" : "deactivated"}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = products.filter((p: any) => p.name.toLowerCase().includes(search.toLowerCase()));

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((p: any) => p.id)));
  };

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const someSelected = selected.size > 0;

  const openEdit = (product?: any) => {
    setEditing(
      product
        ? { ...product, specifications: product.specifications || {} }
        : {
            name: "", slug: "", price: 0, stock_quantity: 0, description: "",
            short_description: "", is_active: true, is_featured: false,
            thumbnail: "", images: [], tags: [], category_id: null,
            video_url: "", video_highlight: false, image_carousel: false, meta_title: "", meta_description: "", meta_keywords: "",
            specifications: { product_type: "general", sizes: [], colors: [], weight: "", weight_unit: "kg", specs: [] },
          }
    );
    setDialogOpen(true);
  };

  const updateField = (field: string, value: any) => {
    setEditing((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  // Get selected parent category id for subcategory filtering
  const selectedCategoryId = editing?.category_id;
  const selectedParent = categories.find((c) => c.id === selectedCategoryId);
  const isSubcategory = selectedParent?.parent_id != null;
  const effectiveParentId = isSubcategory ? selectedParent?.parent_id : selectedCategoryId;

  const handleGenerateSku = async () => {
    if (!editing?.name?.trim()) { toast.error("Enter a product name first"); return; }
    setSkuStatus("checking");
    try {
      const r: any = await generateSkuFn({ data: { name: editing.name, prefix: skuPrefix, excludeProductId: editing?.id } });
      updateField("sku", r.sku);
      setSkuSuggestions(r.suggestions ?? []);
      setSkuStatus("available");
      setSkuTakenBy(null);
    } catch (e: any) {
      setSkuStatus("idle");
      toast.error(e.message ?? "Could not generate SKU");
    }
  };

  const handleGenerateVariantSku = async (i: number) => {
    if (!editing?.name?.trim()) { toast.error("Enter a product name first"); return; }
    const v = variants[i];
    try {
      const r: any = await generateSkuFn({ data: { name: editing.name, prefix: skuPrefix, color: v.color, size: v.size, excludeProductId: editing?.id } });
      updateVariant(i, "sku", r.sku);
    } catch (e: any) {
      toast.error(e.message ?? "Could not generate SKU");
    }
  };

  const handleCheckSku = async (skuOverride?: string) => {
    const sku = (skuOverride ?? editing?.sku ?? "").trim();
    if (!sku) { setSkuStatus("idle"); setSkuSuggestions([]); return; }
    setSkuStatus("checking");
    try {
      const r: any = await checkSkuFn({ data: { sku, excludeProductId: editing?.id } });
      setSkuStatus(r.available ? "available" : "taken");
      setSkuTakenBy(r.exact ? (r.exact.name ?? "another variant") : null);
      setSkuSuggestions(r.suggestions ?? []);
    } catch {
      setSkuStatus("idle");
    }
  };

  const addImage = (url: string) => {
    if (!editing) return;
    const current = editing.images || [];
    if (current.length >= 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }
    updateField("images", [...current, url]);
  };

  const removeImage = (index: number) => {
    if (!editing) return;
    const current = [...(editing.images || [])];
    current.splice(index, 1);
    updateField("images", current);
  };

  const specs = editing?.specifications || {};
  const productType = specs.product_type || "general";

  const updateSpec = (key: string, value: any) => {
    updateField("specifications", { ...specs, [key]: value });
  };

  const toggleSize = (size: string) => {
    const current = specs.sizes || [];
    updateSpec("sizes", current.includes(size) ? current.filter((s: string) => s !== size) : [...current, size]);
  };

  const toggleColor = (color: string) => {
    const current = specs.colors || [];
    updateSpec("colors", current.includes(color) ? current.filter((c: string) => c !== color) : [...current, color]);
  };

  const addSpecRow = () => {
    const current = specs.specs || [];
    updateSpec("specs", [...current, { key: "", value: "" }]);
  };

  const updateSpecRow = (index: number, field: string, value: string) => {
    const current = [...(specs.specs || [])];
    current[index] = { ...current[index], [field]: value };
    updateSpec("specs", current);
  };

  const removeSpecRow = (index: number) => {
    const current = [...(specs.specs || [])];
    current.splice(index, 1);
    updateSpec("specs", current);
  };

  // --- Variants ---
  const [variants, setVariants] = useState<any[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [variantSerialCounts, setVariantSerialCounts] = useState<Record<string, number>>({});
  const [galleryPickerIdx, setGalleryPickerIdx] = useState<number | null>(null);
  const [expandedVariantIdx, setExpandedVariantIdx] = useState<number | null>(null);
  const [variantVideoUploading, setVariantVideoUploading] = useState<number | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const variantImageRefs = useRef<Record<number, HTMLInputElement>>({});
  const bulkInputRef = useRef<HTMLInputElement>(null);

  const uploadSingleFile = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `variants/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("products").upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) return null;
    const { data: urlData } = supabase.storage.from("products").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleVariantImageUpload = async (idx: number, file?: File | null) => {
    if (!file) return;
    const url = await uploadSingleFile(file);
    if (!url) { toast.error("Upload failed"); return; }
    updateVariant(idx, "image_url", url);
    toast.success("Variant image uploaded");
  };

  const addVariantCustomImage = async (idx: number, file?: File | null) => {
    if (!file) return;
    const current: string[] = variants[idx]?.images || [];
    if (current.length >= 5) { toast.error("Maximum 5 images per variant"); return; }
    const url = await uploadSingleFile(file);
    if (!url) { toast.error("Upload failed"); return; }
    updateVariant(idx, "images", [...current, url]);
  };

  const removeVariantCustomImage = (idx: number, imgIdx: number) => {
    const current: string[] = variants[idx]?.images || [];
    updateVariant(idx, "images", current.filter((_, i) => i !== imgIdx));
  };

  const handleVariantVideoUpload = async (idx: number, file?: File | null) => {
    if (!file) return;
    setVariantVideoUploading(idx);
    const url = await uploadSingleFile(file);
    setVariantVideoUploading(null);
    if (!url) { toast.error("Upload failed"); return; }
    updateVariant(idx, "video_url", url);
  };

  const handleBulkImageUpload = async (files: FileList | File[]) => {
    const fileArr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (fileArr.length === 0) return;

    // Find variants without images, assign in order
    const emptyIndices = variants.map((v, i) => (!v.image_url ? i : -1)).filter((i) => i >= 0);
    const assignCount = Math.min(fileArr.length, emptyIndices.length || fileArr.length);

    setBulkUploading(true);
    let uploaded = 0;
    for (let f = 0; f < fileArr.length; f++) {
      const url = await uploadSingleFile(fileArr[f]);
      if (url) {
        const targetIdx = emptyIndices.length > 0 ? emptyIndices[f] : f;
        if (targetIdx !== undefined && targetIdx < variants.length) {
          updateVariant(targetIdx, "image_url", url);
          uploaded++;
        }
      }
    }
    setBulkUploading(false);
    if (uploaded > 0) toast.success(`Uploaded ${uploaded} image${uploaded > 1 ? "s" : ""} to variants`);
    else toast.error("No images could be uploaded");
  };

  const loadVariants = async (productId: string) => {
    setVariantsLoading(true);
    const { data } = await supabase.from("product_variants" as any).select("*").eq("product_id", productId).order("sort_order");
    setVariants((data as any[]) || []);
    // Which variants are tracked by Stock & Serials — their stock is
    // computed by "Sync stock", not edited by hand here.
    const { data: serialRows } = await supabase
      .from("product_serials" as any)
      .select("variant_id")
      .eq("product_id", productId)
      .not("variant_id", "is", null);
    const counts: Record<string, number> = {};
    for (const r of (serialRows as any[]) || []) counts[r.variant_id] = (counts[r.variant_id] || 0) + 1;
    setVariantSerialCounts(counts);
    setVariantsLoading(false);
  };

  useEffect(() => {
    if (editing?.id && dialogOpen) loadVariants(editing.id);
    else setVariants([]);
    setSkuStatus("idle");
    setSkuSuggestions([]);
    setSkuTakenBy(null);
  }, [editing?.id, dialogOpen]);

  const addVariant = () => {
    setVariants([...variants, { id: null, product_id: editing?.id, size: "", color: "", sku: "", price_override: null, stock_quantity: 0, is_active: true, sort_order: variants.length }]);
  };

  const updateVariant = (idx: number, field: string, value: any) => {
    const u = [...variants]; u[idx] = { ...u[idx], [field]: value }; setVariants(u);
  };

  const removeVariant = (idx: number) => {
    const v = variants[idx];
    if (v.id) supabase.from("product_variants" as any).delete().eq("id", v.id).then(() => { setVariants(variants.filter((_, i) => i !== idx)); toast.success("Variant deleted"); });
    else setVariants(variants.filter((_, i) => i !== idx));
  };

  const saveVariants = async () => {
    if (!editing?.id) { toast.error("Save the product first"); return; }
    try {
      for (const v of variants) {
        const p = { product_id: editing.id, size: v.size || null, color: v.color || null, sku: v.sku || null, price_override: v.price_override || null, stock_quantity: v.stock_quantity || 0, is_active: v.is_active, sort_order: v.sort_order, image_url: v.image_url || null };
        if (v.id) await supabase.from("product_variants" as any).update(p).eq("id", v.id);
        else await supabase.from("product_variants" as any).insert(p);
      }
      toast.success("Variants saved"); loadVariants(editing.id);
    } catch (e: any) { toast.error(e.message); }
  };

  const notifyRestockSubscribers = async () => {
    if (!editing?.id) return;
    try {
      const { data, error } = await supabase.functions.invoke("notify-restock", {
        body: { product_id: editing.id },
      });
      if (error) throw error;
      toast.success(data?.message || "Notifications sent");
    } catch (e: any) { toast.error("Failed: " + e.message); }
  };

  const generateVariants = () => {
    if (!editing?.id) { toast.error("Save the product first"); return; }
    const sizes = specs.sizes || []; const colors = specs.colors || [];
    const nv: any[] = []; let ord = variants.length;
    if (sizes.length > 0 && colors.length > 0) {
      for (const s of sizes) for (const c of colors) if (!variants.some((v) => v.size === s && v.color === c)) nv.push({ id: null, product_id: editing.id, size: s, color: c, sku: "", price_override: null, stock_quantity: 0, is_active: true, sort_order: ord++ });
    } else if (sizes.length > 0) {
      for (const s of sizes) if (!variants.some((v) => v.size === s && !v.color)) nv.push({ id: null, product_id: editing.id, size: s, color: "", sku: "", price_override: null, stock_quantity: 0, is_active: true, sort_order: ord++ });
    } else if (colors.length > 0) {
      for (const c of colors) if (!variants.some((v) => v.color === c && !v.size)) nv.push({ id: null, product_id: editing.id, size: "", color: c, sku: "", price_override: null, stock_quantity: 0, is_active: true, sort_order: ord++ });
    }
    if (nv.length === 0) { toast.error("No new combos. Add sizes/colors in Attributes first."); return; }
    setVariants([...variants, ...nv]); toast.success(`Generated ${nv.length} variant(s)`);
  };

  const needsWeight = ["grocery", "liquid", "cosmetics"].includes(productType);
  const showsColors = !["grocery", "books"].includes(productType);
  const showsSizes = ["clothing", "shoes"].includes(productType);
  const showsSpecs = ["electronics", "furniture"].includes(productType);
  const showsMaterial = ["clothing", "shoes", "furniture", "accessories"].includes(productType);

  return (
    <div className="max-w-[1700px] mx-auto w-full space-y-6">
      <PageHeader
        icon={<Package className="w-5 h-5" />}
        title="Products"
        description={`${products.length} products · ${categories.length} categories`}
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportProducts} className="gap-2 cursor-pointer">
                  <Download className="h-3.5 w-3.5" /> Products
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportVariants} className="gap-2 cursor-pointer">
                  <Download className="h-3.5 w-3.5" /> Variants
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <BulkUpload mode="variants" onComplete={() => qc.invalidateQueries({ queryKey: ["admin-products"] })} products={products.map((p: any) => ({ id: p.id, name: p.name, slug: p.slug }))} />
            <BulkUpload mode="products" onComplete={() => qc.invalidateQueries({ queryKey: ["admin-products"] })} categories={categories.map(c => ({ id: c.id, name: c.name, slug: "" }))} />
            <Button variant="outline" className="gap-2" onClick={() => syncStockMut.mutate()} disabled={syncStockMut.isPending} title="Recompute stock from remaining (not-sold) serials in Stock & Serials">
              <RefreshCw className={`h-4 w-4 ${syncStockMut.isPending ? "animate-spin" : ""}`} /> Sync stock
            </Button>
            <Button onClick={() => openEdit()} className="gap-2"><Plus className="h-4 w-4" /> Add Product</Button>
          </>
        }
      />

      <Tabs value={activeMainTab} onValueChange={handleTabChange}>
        <TabsList className="hidden">
          <TabsTrigger value="list">All Products</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="commerce">Commerce</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 mt-4">
          <div className="max-w-sm">
            <SearchInput
              value={search}
              onChange={(v) => { setSearch(v); setSelected(new Set()); }}
              placeholder="Search products…"
            />
          </div>

          {/* Desktop bulk action bar */}
          <AnimatePresence>
            {someSelected && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="hidden md:flex items-center gap-3 glass rounded-2xl px-4 py-3"
              >
                <span className="text-sm text-foreground font-medium">
                  {selected.size} selected
                </span>
                <div className="flex gap-2 ml-auto">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1.5" disabled={bulkAction.isPending}>
                        <Eye className="w-4 h-4 text-primary" /> Activate
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Activate products?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will activate {selected.size} product{selected.size > 1 ? "s" : ""} and make them visible to customers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => bulkAction.mutate({ ids: Array.from(selected), action: "activate" })}>
                          Activate
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1.5" disabled={bulkAction.isPending}>
                        <EyeOff className="w-4 h-4" /> Deactivate
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Deactivate products?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will deactivate {selected.size} product{selected.size > 1 ? "s" : ""} and hide them from customers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => bulkAction.mutate({ ids: Array.from(selected), action: "deactivate" })}>
                          Deactivate
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" disabled={bulkAction.isPending}>
                        <Trash2 className="w-4 h-4" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete products?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete {selected.size} product{selected.size > 1 ? "s" : ""}. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => bulkAction.mutate({ ids: Array.from(selected), action: "delete" })}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" className="gap-1.5 bg-gradient-primary text-primary-foreground" disabled={notifyMut.isPending}>
                        <Mail className="w-4 h-4" /> Notify subscribers
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Email subscribers about these {selected.size} product{selected.size > 1 ? "s" : ""}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          A single email containing one card per product (image, name, price, link) will be sent to all active newsletter subscribers from <strong>updates@orizino.com</strong>.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => notifyMut.mutate(Array.from(selected))}>
                          Send now
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile bulk action bar — phone-friendly: select-all, count, delete */}
          <div className="md:hidden sticky top-0 z-10 -mx-1 px-1">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card/95 backdrop-blur px-3 py-2 shadow-sm">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all products"
              />
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs font-medium text-foreground"
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
              <span className="text-xs text-muted-foreground ml-1">
                {someSelected ? `· ${selected.size} selected` : `· ${filtered.length} items`}
              </span>
              <div className="ml-auto flex items-center gap-1">
                {someSelected && (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 px-2">More</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => bulkAction.mutate({ ids: Array.from(selected), action: "activate" })}>
                          <Eye className="w-4 h-4 mr-2 text-primary" /> Activate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => bulkAction.mutate({ ids: Array.from(selected), action: "deactivate" })}>
                          <EyeOff className="w-4 h-4 mr-2" /> Deactivate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => notifyMut.mutate(Array.from(selected))} disabled={notifyMut.isPending}>
                          <Mail className="w-4 h-4 mr-2" /> Notify subscribers
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" className="h-8 gap-1" disabled={bulkAction.isPending}>
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete products?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete {selected.size} product{selected.size > 1 ? "s" : ""}. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => bulkAction.mutate({ ids: Array.from(selected), action: "delete" })}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Select all" />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableLoadingRow cols={8} />
                ) : filtered.length === 0 ? (
                  <TableEmptyRow
                    cols={8}
                    icon={<Package className="w-5 h-5" />}
                    message="No products found"
                    hint={search ? "Try a different search term." : "Add your first product to get started."}
                  />
                ) : filtered.map((p: any) => (
                  <TableRow key={p.id} className={selected.has(p.id) ? "bg-primary/5" : ""}>
                    <TableCell>
                      <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} aria-label={`Select ${p.name}`} />
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.categories?.name || "—"}</TableCell>
                    <TableCell>${Number(p.price).toFixed(2)}</TableCell>
                    <TableCell>{p.stock_quantity}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {(p.specifications as any)?.product_type || "general"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" title="Print stickers" onClick={async () => {
                        const { data } = await (supabase.from as any)("product_serials")
                          .select("serial_code")
                          .eq("product_id", p.id)
                          .eq("status", "available")
                          .limit(500);
                        const codes = (data ?? []).map((r: any) => r.serial_code);
                        if (!codes.length) { toast.error("No available serials for this product"); return; }
                        setPrintProduct({ id: p.id, codes });
                      }}><Package className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete product?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{p.name}". This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteMutation.mutate(p.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-2">
            {isLoading && (
              <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">Loading products…</div>
            )}
            {!isLoading && filtered.length === 0 && (
              <div className="rounded-xl border bg-card p-6 text-center">
                <Package className="w-5 h-5 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">No products found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {search ? "Try a different search term." : "Add your first product to get started."}
                </p>
              </div>
            )}
            {filtered.map((p: any) => {
              const thumb = p.thumbnail || (Array.isArray(p.images) && p.images[0]);
              const leading = thumb ? (
                <img src={thumb} alt="" className="w-12 h-12 rounded-lg object-cover bg-muted" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <Package className="w-5 h-5 text-muted-foreground" />
                </div>
              );
              return (
                <MobileListCard
                  key={p.id}
                  selected={selected.has(p.id)}
                  onSelectedChange={() => toggleSelect(p.id)}
                  onClick={() => openEdit(p)}
                  selectLabel={`Select ${p.name}`}
                  leading={leading}
                  title={p.name}
                  badges={
                    <Badge variant={p.is_active ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                      {p.is_active ? "Active" : "Inactive"}
                    </Badge>
                  }
                  subtitle={p.categories?.name || "Uncategorized"}
                  meta={
                    <>
                      <span className="font-medium text-foreground">${Number(p.price).toFixed(2)}</span>
                      <span>Stock: <span className="font-medium text-foreground">{p.stock_quantity}</span></span>
                      <span className="capitalize">{(p.specifications as any)?.product_type || "general"}</span>
                    </>
                  }
                  actions={
                    <>
                      <Button size="sm" variant="outline" className="h-8" onClick={() => openEdit(p)}>
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-8 text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete product?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{p.name}". This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteMutation.mutate(p.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  }
                />
              );
            })}
          </div>

        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <ProductSettingsPanel />
        </TabsContent>

        <TabsContent value="commerce" className="mt-4">
          <CommerceSettingsPanel />
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <Tabs defaultValue="general" className="w-full">
              <TabsList>
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="attributes">Attributes</TabsTrigger>
                <TabsTrigger value="variants">Variants{variants.length > 0 ? ` (${variants.length})` : ""}</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <div><Label>Name</Label><Input value={editing.name ?? ""} onChange={(e) => updateField("name", e.target.value)} /></div>
                <div><Label>Slug</Label><Input value={editing.slug ?? ""} onChange={(e) => updateField("slug", e.target.value)} placeholder="auto-generated" /></div>

                <div>
                  <Label>SKU</Label>
                  <div className="flex gap-2">
                    <Input
                      value={skuPrefix}
                      onChange={(e) => setSkuPrefix(e.target.value.toUpperCase().slice(0, 6))}
                      onBlur={handleSavePrefix}
                      title="Default SKU prefix used by Generate (e.g. your brand code)"
                      className="font-mono uppercase w-20 shrink-0 text-center"
                    />
                    <Input
                      value={editing.sku ?? ""}
                      onChange={(e) => { updateField("sku", e.target.value.toUpperCase()); setSkuStatus("idle"); }}
                      onBlur={() => handleCheckSku()}
                      placeholder="e.g. ORZ-GHK0001B"
                      className="font-mono uppercase"
                    />
                    <Button type="button" variant="outline" onClick={handleGenerateSku} disabled={skuStatus === "checking"} className="gap-1.5 shrink-0">
                      {skuStatus === "checking" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                      Generate
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Prefix box on the left is your default brand code ({savingPrefix ? "saving…" : "saved automatically"}); Generate builds a code from the product name.
                  </p>
                  {skuStatus === "available" && (editing.sku ?? "").trim() && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1"><CircleCheck className="w-3 h-3" /> Available</p>
                  )}
                  {skuStatus === "taken" && (
                    <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                      <CircleAlert className="w-3 h-3" /> Already used{skuTakenBy ? ` by "${skuTakenBy}"` : ""} — pick another or reuse a suggestion below.
                    </p>
                  )}
                  {skuSuggestions.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[11px] text-muted-foreground mb-1">
                        {skuStatus === "taken" ? "Similar SKUs already in use:" : "Similar SKUs found (e.g. from a deleted product) — click to reuse:"}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {skuSuggestions.map((s) => (
                          <button
                            key={s.sku}
                            type="button"
                            onClick={() => { updateField("sku", s.sku); handleCheckSku(s.sku); }}
                            className="text-[11px] font-mono px-2 py-1 rounded border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                            title={s.name ? `Product: ${s.name}` : s.source === "variant" ? "Used by a variant" : undefined}
                          >
                            {s.sku}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Category & Subcategory */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={effectiveParentId ?? "none"}
                      onValueChange={(v) => updateField("category_id", v === "none" ? null : v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {parentCategories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subcategory</Label>
                    <Select
                      value={isSubcategory ? selectedCategoryId : "none"}
                      onValueChange={(v) => updateField("category_id", v === "none" ? effectiveParentId : v)}
                      disabled={!effectiveParentId || effectiveParentId === "none"}
                    >
                      <SelectTrigger><SelectValue placeholder="Select subcategory" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {effectiveParentId && effectiveParentId !== "none" && getChildren(effectiveParentId).map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div><Label>Price</Label><Input type="number" value={editing.price ?? 0} onChange={(e) => updateField("price", +e.target.value)} /></div>
                  <div><Label>Compare Price</Label><Input type="number" value={editing.compare_at_price ?? ""} onChange={(e) => updateField("compare_at_price", e.target.value ? +e.target.value : null)} /></div>
                  <div><Label>Stock</Label><Input type="number" value={editing.stock_quantity ?? 0} onChange={(e) => updateField("stock_quantity", +e.target.value)} /></div>
                </div>

                <div>
                  <Label>Sticker preset</Label>
                  <Select
                    value={editing.sticker_preset_id ?? "__default__"}
                    onValueChange={(v) => updateField("sticker_preset_id", v === "__default__" ? null : v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Use active preset" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">Use active preset (default)</SelectItem>
                      {stickerPresets.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}{p.is_active ? " • active" : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Stickers for this product print with the chosen preset's layout, colors and barcode settings.</p>
                </div>

                <div><Label>Short Description</Label><Input value={editing.short_description ?? ""} onChange={(e) => updateField("short_description", e.target.value)} /></div>
                <div><Label>Description</Label><Textarea value={editing.description ?? ""} onChange={(e) => updateField("description", e.target.value)} rows={3} /></div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2"><Switch checked={editing.is_active ?? true} onCheckedChange={(v) => updateField("is_active", v)} /><Label>Active</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={editing.is_featured ?? false} onCheckedChange={(v) => updateField("is_featured", v)} /><Label>Featured</Label></div>
                </div>
              </TabsContent>

              {/* Attributes Tab */}
              <TabsContent value="attributes" className="space-y-4 mt-4">
                <div>
                  <Label>Product Type</Label>
                  <Select value={productType} onValueChange={(v) => updateSpec("product_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRODUCT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Select the product type to show relevant attribute fields.</p>
                </div>

                {/* Colors */}
                {showsColors && (
                  <div>
                    <Label>Available Colors</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {COMMON_COLORS.map((c) => {
                        const selected = (specs.colors || []).includes(c.name);
                        return (
                          <button key={c.name} type="button" onClick={() => toggleColor(c.name)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 text-xs font-medium transition-all ${selected ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                            <span className="w-3.5 h-3.5 rounded-full border border-border/50 shrink-0" style={{ background: c.hex }} />
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                    <Input placeholder="Add custom color name (press Enter)..." className="h-8 text-sm mt-2"
                      onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) { toggleColor((e.target as HTMLInputElement).value.trim()); (e.target as HTMLInputElement).value = ""; } }} />
                  </div>
                )}

                {/* Clothing Sizes */}
                {productType === "clothing" && (
                  <div>
                    <Label>Available Sizes</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {CLOTHING_SIZES.map((size) => (
                        <button key={size} type="button" onClick={() => toggleSize(size)}
                          className={`px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-all ${(specs.sizes || []).includes(size) ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Shoe Sizes */}
                {productType === "shoes" && (
                  <div>
                    <Label>Available Sizes (EU)</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {SHOE_SIZES.map((size) => (
                        <button key={size} type="button" onClick={() => toggleSize(size)}
                          className={`px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-all ${(specs.sizes || []).includes(size) ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weight / Volume — grocery, liquid, cosmetics */}
                {needsWeight && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{productType === "liquid" ? "Volume" : "Weight"}</Label>
                      <Input type="number" value={specs.weight || ""} onChange={(e) => updateSpec("weight", e.target.value)} placeholder="e.g. 500" />
                    </div>
                    <div>
                      <Label>Unit</Label>
                      <Select value={specs.weight_unit || (productType === "liquid" ? "ml" : "kg")} onValueChange={(v) => updateSpec("weight_unit", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="g">Grams (g)</SelectItem>
                          <SelectItem value="kg">Kilograms (kg)</SelectItem>
                          <SelectItem value="lb">Pounds (lb)</SelectItem>
                          <SelectItem value="oz">Ounces (oz)</SelectItem>
                          <SelectItem value="ml">Milliliters (ml)</SelectItem>
                          <SelectItem value="l">Liters (L)</SelectItem>
                          <SelectItem value="fl_oz">Fluid Ounces (fl oz)</SelectItem>
                          <SelectItem value="gal">Gallons (gal)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Material */}
                {showsMaterial && (
                  <div>
                    <Label>Material</Label>
                    <Input value={specs.material || ""} onChange={(e) => updateSpec("material", e.target.value)} placeholder="e.g. Cotton, Leather, Stainless Steel" />
                  </div>
                )}

                {/* Dimensions — furniture */}
                {productType === "furniture" && (
                  <div className="grid grid-cols-3 gap-4">
                    <div><Label>Length (cm)</Label><Input type="number" value={specs.length || ""} onChange={(e) => updateSpec("length", e.target.value)} /></div>
                    <div><Label>Width (cm)</Label><Input type="number" value={specs.width || ""} onChange={(e) => updateSpec("width", e.target.value)} /></div>
                    <div><Label>Height (cm)</Label><Input type="number" value={specs.height || ""} onChange={(e) => updateSpec("height", e.target.value)} /></div>
                  </div>
                )}

                {/* Cosmetics-specific fields */}
                {productType === "cosmetics" && (
                  <div className="space-y-3">
                    <div><Label>Skin Type</Label><Input value={specs.skin_type || ""} onChange={(e) => updateSpec("skin_type", e.target.value)} placeholder="e.g. Oily, Dry, All" /></div>
                    <div><Label>Ingredients</Label><Textarea value={specs.ingredients || ""} onChange={(e) => updateSpec("ingredients", e.target.value)} placeholder="Key ingredients..." rows={2} /></div>
                    <div className="flex items-center gap-2">
                      <Switch checked={specs.is_organic || false} onCheckedChange={(v) => updateSpec("is_organic", v)} />
                      <Label>Organic / Natural</Label>
                    </div>
                  </div>
                )}

                {/* Liquid-specific fields */}
                {productType === "liquid" && (
                  <div className="space-y-3">
                    <div><Label>Flavor / Scent</Label><Input value={specs.flavor || ""} onChange={(e) => updateSpec("flavor", e.target.value)} placeholder="e.g. Vanilla, Unscented" /></div>
                    <div><Label>Ingredients</Label><Textarea value={specs.ingredients || ""} onChange={(e) => updateSpec("ingredients", e.target.value)} placeholder="Key ingredients..." rows={2} /></div>
                  </div>
                )}

                {/* Books-specific fields */}
                {productType === "books" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Author</Label><Input value={specs.author || ""} onChange={(e) => updateSpec("author", e.target.value)} /></div>
                      <div><Label>ISBN</Label><Input value={specs.isbn || ""} onChange={(e) => updateSpec("isbn", e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Publisher</Label><Input value={specs.publisher || ""} onChange={(e) => updateSpec("publisher", e.target.value)} /></div>
                      <div><Label>Pages</Label><Input type="number" value={specs.pages || ""} onChange={(e) => updateSpec("pages", e.target.value)} /></div>
                    </div>
                    <div><Label>Language</Label><Input value={specs.language || ""} onChange={(e) => updateSpec("language", e.target.value)} placeholder="e.g. English" /></div>
                  </div>
                )}

                {/* Accessories-specific */}
                {productType === "accessories" && (
                  <div>
                    <Label>Accessory Type</Label>
                    <Input value={specs.accessory_type || ""} onChange={(e) => updateSpec("accessory_type", e.target.value)} placeholder="e.g. Necklace, Ring, Watch, Belt" />
                  </div>
                )}

                {/* Technical Specs — electronics, furniture */}
                {showsSpecs && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Technical Specifications</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addSpecRow} className="gap-1"><Plus className="w-3 h-3" /> Add Spec</Button>
                    </div>
                    <div className="space-y-2">
                      {(specs.specs || []).map((spec: any, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input value={spec.key} onChange={(e) => updateSpecRow(i, "key", e.target.value)} placeholder="e.g. Processor" className="h-9 flex-1" />
                          <Input value={spec.value} onChange={(e) => updateSpecRow(i, "value", e.target.value)} placeholder="e.g. Snapdragon 8 Gen 3" className="h-9 flex-1" />
                          <Button type="button" variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => removeSpecRow(i)}><X className="w-3.5 h-3.5 text-destructive" /></Button>
                        </div>
                      ))}
                      {(specs.specs || []).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No specs added. Click "Add Spec" to start.</p>}
                    </div>
                  </div>
                )}

                {/* Custom key-value pairs for general */}
                {productType === "general" && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Custom Attributes</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addSpecRow} className="gap-1"><Plus className="w-3 h-3" /> Add Attribute</Button>
                    </div>
                    <div className="space-y-2">
                      {(specs.specs || []).map((spec: any, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input value={spec.key} onChange={(e) => updateSpecRow(i, "key", e.target.value)} placeholder="Attribute name" className="h-9 flex-1" />
                          <Input value={spec.value} onChange={(e) => updateSpecRow(i, "value", e.target.value)} placeholder="Value" className="h-9 flex-1" />
                          <Button type="button" variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => removeSpecRow(i)}><X className="w-3.5 h-3.5 text-destructive" /></Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Variants Tab */}
              <TabsContent value="variants" className="space-y-4 mt-4">
                {!editing?.id ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Save the product first to manage variants.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">Size / Color Variants</p>
                        <p className="text-xs text-muted-foreground">Track inventory per size and color combination.</p>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={generateVariants} className="gap-1 text-xs">
                          ⚡ Auto-Generate
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={addVariant} className="gap-1">
                          <Plus className="w-3 h-3" /> Add Variant
                        </Button>
                      </div>
                    </div>

                    {variantsLoading ? (
                      <p className="text-center text-muted-foreground py-8">Loading variants...</p>
                    ) : variants.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
                        <p className="text-muted-foreground text-sm">No variants yet.</p>
                        <p className="text-xs text-muted-foreground mt-1">Add sizes/colors in Attributes tab, then click "Auto-Generate" to create all combinations.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Bulk drag-and-drop upload zone */}
                        <div
                          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleBulkImageUpload(e.dataTransfer.files); }}
                          onClick={() => bulkInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-xl p-4 flex items-center justify-center gap-3 cursor-pointer transition-all ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                        >
                          {bulkUploading ? (
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          ) : (
                            <ImagePlus className="w-5 h-5 text-muted-foreground" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {bulkUploading ? "Uploading..." : "Drop images here to bulk-assign to variants"}
                            </p>
                            <p className="text-xs text-muted-foreground">Images are assigned in order to variants without images</p>
                          </div>
                          <input ref={bulkInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files) handleBulkImageUpload(e.target.files); e.target.value = ""; }} />
                        </div>

                        {variants.some((v) => v.image_url) && (
                          <div className="flex justify-end">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                                >
                                  <Trash2 className="w-3 h-3" /> Clear All Images
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Clear all variant images?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will remove images from all {variants.filter((v) => v.image_url).length} variant(s). You'll need to save variants to apply the change. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => {
                                      setVariants(variants.map((v) => ({ ...v, image_url: "" })));
                                      toast.success("All variant images cleared — save variants to apply");
                                    }}
                                  >
                                    Clear All
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}

                        <div className="space-y-2">
                        <div className="grid grid-cols-[1fr_1fr_90px_90px_70px_60px_28px_36px] gap-2 px-2 text-xs font-medium text-muted-foreground">
                          <span>Size</span><span>Color</span><span>SKU</span><span title="Leave blank or 0 to use this product's global price">Price</span><span>Stock</span><span>Image</span><span></span><span></span>
                        </div>
                        {variants.map((v, i) => (
                          <div key={i}>
                          <div className={`grid grid-cols-[1fr_1fr_90px_90px_70px_60px_28px_36px] gap-2 items-center p-2 rounded-lg border transition-all ${v.is_active ? "border-border bg-secondary/10" : "border-border/40 bg-muted/20 opacity-60"}`}>
                            <Input value={v.size || ""} onChange={(e) => updateVariant(i, "size", e.target.value)} placeholder="Size" className="h-8 text-sm" />
                            <Input value={v.color || ""} onChange={(e) => updateVariant(i, "color", e.target.value)} placeholder="Color" className="h-8 text-sm" />
                            <div className="flex gap-1">
                              <Input value={v.sku || ""} onChange={(e) => updateVariant(i, "sku", e.target.value)} placeholder="SKU" className="h-8 text-xs" />
                              <button type="button" onClick={() => handleGenerateVariantSku(i)} title="Generate SKU for this variant" className="shrink-0 w-8 h-8 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors">
                                <Wand2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <Input
                              type="number"
                              value={v.price_override ?? ""}
                              onChange={(e) => updateVariant(i, "price_override", e.target.value === "" ? null : +e.target.value)}
                              placeholder={editing?.price != null ? String(editing.price) : "0"}
                              title="Leave blank or 0 to use this product's global price — only set this to give this specific variant its own price"
                              className="h-8 text-sm"
                            />
                            <div className="relative">
                              <Input
                                type="number"
                                value={v.stock_quantity}
                                onChange={(e) => updateVariant(i, "stock_quantity", +e.target.value)}
                                className="h-8 text-sm"
                              />
                              {variantSerialCounts[v.id] > 0 && (
                                <Lock
                                  className="w-3 h-3 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                                  aria-label="Also tracked by Stock & Serials — use Sync stock to recompute from remaining serials"
                                />
                              )}
                            </div>
                            <div className="flex items-center justify-center gap-1">
                              {v.image_url ? (
                                <div className="relative group w-10 h-10">
                                  <img src={v.image_url} alt="Variant" className="w-10 h-10 object-cover rounded border border-border" />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center gap-0.5">
                                    <button type="button" onClick={() => variantImageRefs.current[i]?.click()} className="p-0.5 rounded-full bg-primary text-primary-foreground"><Upload className="w-3 h-3" /></button>
                                    <button type="button" onClick={() => updateVariant(i, "image_url", "")} className="p-0.5 rounded-full bg-destructive text-destructive-foreground"><X className="w-3 h-3" /></button>
                                  </div>
                                </div>
                              ) : (
                                <button type="button" onClick={() => variantImageRefs.current[i]?.click()} className="w-10 h-10 border border-dashed border-border rounded flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
                                  <Upload className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {Array.isArray(editing?.images) && editing.images.length > 0 && (
                                <Popover open={galleryPickerIdx === i} onOpenChange={(o) => setGalleryPickerIdx(o ? i : null)}>
                                  <PopoverTrigger asChild>
                                    <button type="button" title="Choose from product gallery" className="w-6 h-10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
                                      <Images className="w-3.5 h-3.5" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-56" align="start">
                                    <p className="text-xs text-muted-foreground mb-2">Use one of this product's own images</p>
                                    <div className="grid grid-cols-4 gap-1.5">
                                      {editing.images.map((url: string, gi: number) => (
                                        <button
                                          key={gi}
                                          type="button"
                                          onClick={() => { updateVariant(i, "image_url", url); setGalleryPickerIdx(null); }}
                                          className="w-11 h-11 rounded border border-border overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                                        >
                                          <img src={url} alt="" className="w-full h-full object-cover" />
                                        </button>
                                      ))}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              )}
                              <input ref={(el) => { if (el) variantImageRefs.current[i] = el; }} type="file" accept="image/*" className="hidden" onChange={(e) => { handleVariantImageUpload(i, e.target.files?.[0]); e.target.value = ""; }} />
                            </div>
                            <button
                              type="button"
                              onClick={() => setExpandedVariantIdx(expandedVariantIdx === i ? null : i)}
                              title="Edit variant media"
                              className={`h-8 w-7 flex items-center justify-center rounded transition-transform text-muted-foreground hover:text-primary ${expandedVariantIdx === i ? "rotate-180" : ""}`}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeVariant(i)}>
                              <X className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </div>

                          {expandedVariantIdx === i && (
                            <div className="mt-1.5 p-3 rounded-lg border border-dashed border-border/70 bg-muted/10 space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium">Custom media for this variant</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {v.use_custom_media
                                      ? "This variant shows its own images/video instead of the product's defaults."
                                      : "Off — this variant uses the product's default images and video."}
                                  </p>
                                </div>
                                <Switch checked={!!v.use_custom_media} onCheckedChange={(val) => updateVariant(i, "use_custom_media", val)} />
                              </div>

                              {v.use_custom_media && (
                                <div className="space-y-3">
                                  <div>
                                    <Label className="text-xs">Images (up to 5)</Label>
                                    <div className="flex flex-wrap gap-2 mt-1.5">
                                      {(v.images || []).map((url: string, gi: number) => (
                                        <div key={gi} className="relative group w-14 h-14">
                                          <img src={url} alt="" className="w-14 h-14 object-cover rounded border border-border" />
                                          <button type="button" onClick={() => removeVariantCustomImage(i, gi)} className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ))}
                                      {(v.images || []).length < 5 && (
                                        <button
                                          type="button"
                                          onClick={() => document.getElementById(`variant-gallery-input-${i}`)?.click()}
                                          className="w-14 h-14 border border-dashed border-border rounded flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                                        >
                                          <ImagePlus className="w-4 h-4" />
                                        </button>
                                      )}
                                      <input id={`variant-gallery-input-${i}`} type="file" accept="image/*" className="hidden" onChange={(e) => { addVariantCustomImage(i, e.target.files?.[0]); e.target.value = ""; }} />
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-xs">Video (optional)</Label>
                                    <div className="flex gap-2 mt-1.5">
                                      <Input
                                        value={v.video_url || ""}
                                        onChange={(e) => updateVariant(i, "video_url", e.target.value)}
                                        placeholder="Paste a video URL or upload"
                                        className="h-9 text-xs"
                                      />
                                      <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => document.getElementById(`variant-video-input-${i}`)?.click()} disabled={variantVideoUploading === i}>
                                        {variantVideoUploading === i ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                      </Button>
                                      <input id={`variant-video-input-${i}`} type="file" accept="video/*" className="hidden" onChange={(e) => { handleVariantVideoUpload(i, e.target.files?.[0]); e.target.value = ""; }} />
                                      {v.video_url && (
                                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => updateVariant(i, "video_url", "")}>
                                          <X className="w-3.5 h-3.5 text-destructive" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          </div>
                        ))}

                        <div className="flex items-center justify-between pt-2">
                          <p className="text-xs text-muted-foreground">
                            Total stock: <span className="font-bold text-foreground">{variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0)}</span> units across {variants.length} variants
                          </p>
                          <div className="flex gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={notifyRestockSubscribers} className="gap-1">
                              <Bell className="w-3 h-3" /> Notify Subscribers
                            </Button>
                            <Button type="button" size="sm" onClick={saveVariants}>Save Variants</Button>
                          </div>
                        </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="media" className="space-y-4 mt-4">
                <div>
                  <Label>Thumbnail</Label>
                  <ImageUpload bucket="products" folder="thumbnails" value={editing.thumbnail ?? ""} onUploaded={(url) => updateField("thumbnail", url)} />
                </div>

                <div>
                  <Label>Product Images (up to 5)</Label>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    {(editing.images || []).map((img: string, i: number) => (
                      <div key={i} className="relative group">
                        <img src={img} alt={`Product ${i + 1}`} className="w-full h-24 object-cover rounded-xl border border-border" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {(editing.images || []).length < 5 && (
                      <ImageUpload bucket="products" folder="images" value="" onUploaded={addImage} />
                    )}
                  </div>
                </div>

                <div>
                  <Label>Video URL</Label>
                  <Input
                    value={editing.video_url ?? ""}
                    onChange={(e) => updateField("video_url", e.target.value)}
                    placeholder="YouTube or direct video URL"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Paste a YouTube link or direct video file URL</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-secondary/10">
                    <Switch
                      checked={editing.video_highlight ?? false}
                      onCheckedChange={(v) => updateField("video_highlight", v)}
                    />
                    <div>
                      <Label className="cursor-pointer">Video highlight</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Card alternates between the product image and a video preview.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-secondary/10">
                    <Switch
                      checked={editing.image_carousel ?? false}
                      onCheckedChange={(v) => updateField("image_carousel", v)}
                    />
                    <div>
                      <Label className="cursor-pointer">Image carousel</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Card rotates through the product's available images.</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="seo" className="space-y-4 mt-4">
                <div>
                  <Label>Meta Title</Label>
                  <Input value={editing.meta_title ?? ""} onChange={(e) => updateField("meta_title", e.target.value)} placeholder="Product page title (max 60 chars)" maxLength={60} />
                  <p className="text-xs text-muted-foreground mt-1">{(editing.meta_title ?? "").length}/60</p>
                </div>
                <div>
                  <Label>Meta Description</Label>
                  <Textarea value={editing.meta_description ?? ""} onChange={(e) => updateField("meta_description", e.target.value)} placeholder="Product page description (max 160 chars)" rows={3} maxLength={160} />
                  <p className="text-xs text-muted-foreground mt-1">{(editing.meta_description ?? "").length}/160</p>
                </div>
                <div>
                  <Label>Meta Keywords</Label>
                  <Input value={editing.meta_keywords ?? ""} onChange={(e) => updateField("meta_keywords", e.target.value)} placeholder="keyword1, keyword2, keyword3" />
                </div>
              </TabsContent>

              <Button className="w-full mt-4" onClick={() => saveMutation.mutate(editing)} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save Product"}
              </Button>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
      {printProduct && <PrintStickersDialog codes={printProduct.codes} onClose={() => setPrintProduct(null)} />}
    </div>
  );
};

export default AdminProducts;
// code:4ce0
