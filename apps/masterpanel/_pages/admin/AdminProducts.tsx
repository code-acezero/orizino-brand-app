"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "@/lib/router-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Upload,
  Loader2,
  Eye,
  Download,
  Package,
  Images,
  Lock,
  RefreshCw,
  Wand2,
  CircleCheck,
  CircleAlert,
  ChevronDown,
  ChevronRight,
  Star,
  Copy,
  Check,
  Layers,
  TrendingUp,
  AlertTriangle,
  ExternalLink,
  Film,
  Search,
  CheckCircle2,
  Box,
  SlidersHorizontal,
  Palette,
  Tag,
  Boxes,
  Link2,
  UploadCloud,
  GripVertical,
  Printer,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import VideoUpload from "@/components/VideoUpload";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import PageHeader from "@/components/admin/PageHeader";
import { TableLoadingRow, TableEmptyRow } from "@/components/admin/TableStates";
import { useServerFn } from "@/lib/server-fn-compat";
import { notifyAboutProducts } from "@/lib/email-broadcasts.functions";
import { generateSerials, listStickerPresets, syncStockFromSerials, reconcileProductSerialsFromStock } from "@/lib/serials.functions";
import { generateSku, checkSku, getDefaultSkuPrefix, setDefaultSkuPrefix } from "@/lib/sku.functions";
import { PrintStickersDialog } from "@/_pages/admin/ProductManagerPage";
import BulkUpload from "@/components/admin/BulkUpload";
import { exportProducts, exportVariants } from "@/components/admin/bulkExport";
import { deleteStorageFiles, cleanOrphanProductImages } from "@/lib/image-cleanup.functions";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/lib/app-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CommerceSettingsPanel from "@/components/admin/CommerceSettingsPanel";
import ProductSettingsPanel from "@/components/admin/ProductSettingsPanel";
import MobileListCard from "@/components/admin/MobileListCard";

const PRODUCT_TYPES = [
  { value: "general", label: "General Product" },
  { value: "clothing", label: "Clothing & Apparel" },
  { value: "shoes", label: "Shoes & Footwear" },
  { value: "electronics", label: "Electronics & Tech" },
  { value: "grocery", label: "Grocery & Food" },
  { value: "liquid", label: "Liquid / Beverage" },
  { value: "cosmetics", label: "Cosmetics & Beauty" },
  { value: "furniture", label: "Furniture & Home" },
  { value: "books", label: "Books & Stationery" },
  { value: "accessories", label: "Accessories & Jewelry" },
] as const;

const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
const SHOE_SIZES = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"];
const COMMON_COLORS = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Charcoal", hex: "#374151" },
  { name: "Navy", hex: "#1E3A5F" },
  { name: "Royal Blue", hex: "#2563EB" },
  { name: "Sky Blue", hex: "#38BDF8" },
  { name: "Emerald Green", hex: "#10B981" },
  { name: "Olive", hex: "#65A30D" },
  { name: "Crimson Red", hex: "#DC2626" },
  { name: "Rose Pink", hex: "#F43F5E" },
  { name: "Amber Gold", hex: "#F59E0B" },
  { name: "Purple Violet", hex: "#8B5CF6" },
  { name: "Caramel Brown", hex: "#92400E" },
  { name: "Beige Cream", hex: "#F5F5DC" },
];

export default function AdminProducts() {
  const qc = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft" | "low_stock" | "out_of_stock">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [modalTab, setModalTab] = useState<"info" | "media" | "pricing" | "variants">("info");

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

  // Server functions
  const notifyProductsFn = useServerFn(notifyAboutProducts);
  const generateSerialsFn = useServerFn(generateSerials);
  const listStickerPresetsFn = useServerFn(listStickerPresets);
  const syncStockFn = useServerFn(syncStockFromSerials);
  const reconcileStockFn = useServerFn(reconcileProductSerialsFromStock);
  const generateSkuFn = useServerFn(generateSku);
  const checkSkuFn = useServerFn(checkSku);
  const getDefaultSkuPrefixFn = useServerFn(getDefaultSkuPrefix);
  const setDefaultSkuPrefixFn = useServerFn(setDefaultSkuPrefix);
  const deleteStorageFilesFn = useServerFn(deleteStorageFiles);
  const cleanOrphanFn = useServerFn(cleanOrphanProductImages);

  const [deletedImageUrls, setDeletedImageUrls] = useState<string[]>([]);
  const [cleaningOrphans, setCleaningOrphans] = useState(false);

  const [skuPrefix, setSkuPrefix] = useState("ORZ");
  const [savingPrefix, setSavingPrefix] = useState(false);
  const [skuStatus, setSkuStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [skuSuggestions, setSkuSuggestions] = useState<{ sku: string; source: "product" | "variant"; name?: string }[]>([]);
  const [skuTakenBy, setSkuTakenBy] = useState<string | null>(null);

  // Gallery multi-upload state
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Options & Variants state
  const [hasVariantsMode, setHasVariantsMode] = useState(false);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [customColorInput, setCustomColorInput] = useState("");
  const [customSizeInput, setCustomSizeInput] = useState("");
  const [variants, setVariants] = useState<any[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [variantSerialCounts, setVariantSerialCounts] = useState<Record<string, number>>({});
  const [bulkPriceValue, setBulkPriceValue] = useState("");
  const [bulkStockValue, setBulkStockValue] = useState("");
  const [expandedColors, setExpandedColors] = useState<Record<string, boolean>>({});

  const [printProduct, setPrintProduct] = useState<{ id: string; codes: string[] } | null>(null);

  useEffect(() => {
    getDefaultSkuPrefixFn()
      .then((r: any) => setSkuPrefix(r.prefix || "ORZ"))
      .catch(() => {});
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

  const syncStockMut = useMutation({
    mutationFn: () => syncStockFn(),
    onSuccess: (r: any) => {
      toast.success(`Synced ${r.variantsUpdated} variant(s) and ${r.productsUpdated} product(s) from Stock & Serials`);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      if (editing?.id) loadVariants(editing.id);
    },
    onError: (e: any) => toast.error(e.message ?? "Sync failed"),
  });

  const { data: stickerPresets = [] } = useQuery<any[]>({
    queryKey: ["sticker-presets"],
    queryFn: () => listStickerPresetsFn(),
  });

  const notifyMut = useMutation({
    mutationFn: (ids: string[]) =>
      notifyProductsFn({ data: { productIds: ids, audience_type: "subscribers", sendNow: true } }),
    onSuccess: () => {
      toast.success("Email queued to subscribers ✉️");
      setSelected(new Set());
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to send"),
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Query variant counts per product to display in table
  const { data: allVariants = [] } = useQuery({
    queryKey: ["all-product-variants-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variants")
        .select("id, product_id, size, color, stock_quantity, is_active");
      if (error) throw error;
      return data || [];
    },
  });

  const variantsByProductId = useMemo(() => {
    const map = new Map<string, typeof allVariants>();
    for (const v of allVariants) {
      if (!v.product_id) continue;
      if (!map.has(v.product_id)) map.set(v.product_id, []);
      map.get(v.product_id)!.push(v);
    }
    return map;
  }, [allVariants]);

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, parent_id")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  const parentCategories = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);
  const getChildren = (parentId: string) => categories.filter((c) => c.parent_id === parentId);

  // Quick stats calculation
  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter((p: any) => p.is_active).length;
    const lowStock = products.filter((p: any) => p.stock_quantity > 0 && p.stock_quantity <= 5).length;
    const outOfStock = products.filter((p: any) => (p.stock_quantity || 0) === 0).length;
    const totalInventoryUnits = products.reduce((acc: number, p: any) => acc + (p.stock_quantity || 0), 0);
    return { total, active, lowStock, outOfStock, totalInventoryUnits };
  }, [products]);

  // Filtering
  const filtered = useMemo(() => {
    return products.filter((p: any) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.slug?.toLowerCase().includes(q) ||
        p.categories?.name?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (categoryFilter !== "all" && p.category_id !== categoryFilter) {
        const directCat = categories.find((c) => c.id === p.category_id);
        if (directCat?.parent_id !== categoryFilter) return false;
      }

      if (statusFilter === "active" && !p.is_active) return false;
      if (statusFilter === "draft" && p.is_active) return false;
      if (statusFilter === "low_stock" && (p.stock_quantity <= 0 || p.stock_quantity > 5)) return false;
      if (statusFilter === "out_of_stock" && (p.stock_quantity || 0) > 0) return false;

      return true;
    });
  }, [products, search, statusFilter, categoryFilter, categories]);

  // Drag to rearrange state
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [reorderedProducts, setReorderedProducts] = useState<any[] | null>(null);

  const displayProducts = useMemo(() => reorderedProducts ?? filtered, [reorderedProducts, filtered]);

  useEffect(() => {
    setReorderedProducts(null);
  }, [search, statusFilter, categoryFilter]);

  const handleSort = async () => {
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
      setDraggedIndex(null);
      return;
    }
    const copy = [...displayProducts];
    const draggedItem = copy[dragItem.current];
    copy.splice(dragItem.current, 1);
    copy.splice(dragOverItem.current, 0, draggedItem);
    dragItem.current = null;
    dragOverItem.current = null;
    setDraggedIndex(null);
    setReorderedProducts(copy);

    qc.setQueryData(['admin-products'], (old: any[] = []) => {
      const map = new Map(copy.map((item, idx) => [item.id, idx]));
      return [...old].sort((a, b) => (map.get(a.id) ?? 999) - (map.get(b.id) ?? 999));
    });

    toast.success('Product order updated');

    try {
      await Promise.all(
        copy.map((item, idx) =>
          supabase.from('products').update({ sort_order: idx }).eq('id', item.id)
        )
      );
    } catch (e) {
      /* ignore if column absent */
    }
  };

  // Quick active toggle
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("products").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, is_active }) => {
      await qc.cancelQueries({ queryKey: ["admin-products"] });
      const prev = qc.getQueryData<any[]>(["admin-products"]);
      if (prev) {
        qc.setQueryData<any[]>(
          ["admin-products"],
          prev.map((p) => (p.id === id ? { ...p, is_active } : p))
        );
      }
      return { prev };
    },
    onError: (err: any, _, context) => {
      if (context?.prev) qc.setQueryData(["admin-products"], context.prev);
      toast.error(err.message || "Failed to update status");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ product, variantList }: { product: any; variantList: any[] }) => {
      const slug =
        product.slug?.trim() ||
        product.name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");

      // If product has variations, sync product-level stock_quantity to the sum of variant stocks
      const calculatedStock =
        hasVariantsMode && variantList.length > 0
          ? variantList.reduce((sum, v) => sum + (Number(v.stock_quantity) || 0), 0)
          : Number(product.stock_quantity) || 0;

      const payload = {
        ...product,
        slug,
        stock_quantity: calculatedStock,
        specifications: {
          ...(product.specifications || {}),
          colors: selectedColors,
          sizes: selectedSizes,
        },
      };
      delete payload.categories;

      if (Array.isArray(payload.images) && payload.images.length > 0) {
        if (!payload.thumbnail || !payload.images.includes(payload.thumbnail)) {
          payload.thumbnail = payload.images[0];
        }
      } else {
        payload.thumbnail = null;
      }

      let productId = product.id as string | undefined;

      if (productId) {
        const { error } = await supabase.from("products").update(payload as any).eq("id", productId);
        if (error) throw error;
      } else {
        delete payload.id;
        const { data: inserted, error } = await supabase
          .from("products")
          .insert(payload as any)
          .select("id")
          .single();
        if (error) throw error;
        productId = inserted?.id as string;
      }

      // Save variant combinations if in multi-variant mode
      if (productId) {
        if (hasVariantsMode && variantList.length > 0) {
          for (let i = 0; i < variantList.length; i++) {
            const v = variantList[i];
            const p = {
              product_id: productId,
              size: v.size || null,
              color: v.color || null,
              sku: v.sku || null,
              price_override: v.price_override || null,
              stock_quantity: Number(v.stock_quantity) || 0,
              is_active: v.is_active !== false,
              sort_order: i,
              image_url: v.image_url || null,
            };
            if (v.id) {
              await supabase.from("product_variants" as any).update(p).eq("id", v.id);
            } else {
              await supabase.from("product_variants" as any).insert(p);
            }
          }
        } else if (!hasVariantsMode && productId) {
          // If user switched back to Simple Product, clear old variants if any exist
          await supabase.from("product_variants" as any).delete().eq("product_id", productId);
        }

        // Reconcile Product Serials & Variants Two-Way
        try {
          if (hasVariantsMode && variantList.length > 0) {
            const { data: savedVars } = await supabase
              .from("product_variants" as any)
              .select("id, size, color, sku, stock_quantity")
              .eq("product_id", productId);

            const stockItems = (savedVars || []).map((v: any) => ({
              variantId: v.id,
              stock: Number(v.stock_quantity) || 0,
              sku: v.sku || product.sku,
            }));

            await reconcileStockFn({ data: { productId, stockItems } });
          } else {
            await reconcileStockFn({
              data: {
                productId,
                stockItems: [{ variantId: null, stock: calculatedStock, sku: product.sku }],
              },
            });
          }
        } catch (err) {
          console.warn("Serial reconciliation note:", err);
        }

        if (deletedImageUrls.length > 0) {
          deleteStorageFilesFn({ data: { urls: deletedImageUrls } }).catch(() => {});
          setDeletedImageUrls([]);
        }
      }

      return productId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["featured-products"] });
      qc.invalidateQueries({ queryKey: ["new-arrival-products"] });
      qc.invalidateQueries({ queryKey: ["company-featured"] });
      qc.invalidateQueries({ queryKey: ["company-featured-products"] });
      qc.invalidateQueries({ queryKey: ["product"] });
      qc.invalidateQueries({ queryKey: ["product-card-data"] });
      qc.invalidateQueries({ queryKey: ["all-product-variants-summary"] });
      qc.invalidateQueries({ queryKey: ["serials"] });
      setDialogOpen(false);
      setEditing(null);
      toast.success("Product saved successfully ✨");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: prod } = await supabase.from("products").select("thumbnail, images").eq("id", id).maybeSingle();
      const urlsToDelete: string[] = [];
      if (prod?.thumbnail) urlsToDelete.push(prod.thumbnail);
      if (Array.isArray(prod?.images)) urlsToDelete.push(...prod.images.filter(Boolean));
      if (urlsToDelete.length > 0) {
        deleteStorageFilesFn({ data: { urls: urlsToDelete } }).catch(() => {});
      }
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product"] });
      qc.invalidateQueries({ queryKey: ["product-card-data"] });
      qc.invalidateQueries({ queryKey: ["all-product-variants-summary"] });
      toast.success("Product and associated images deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkAction = useMutation({
    mutationFn: async ({ ids, action }: { ids: string[]; action: "delete" | "activate" | "deactivate" }) => {
      if (action === "delete") {
        const { data: prods } = await supabase.from("products").select("thumbnail, images").in("id", ids);
        const urlsToDelete: string[] = [];
        prods?.forEach((p) => {
          if (p.thumbnail) urlsToDelete.push(p.thumbnail);
          if (Array.isArray(p.images)) urlsToDelete.push(...p.images.filter(Boolean));
        });
        if (urlsToDelete.length > 0) {
          deleteStorageFilesFn({ data: { urls: urlsToDelete } }).catch(() => {});
        }
        const { error } = await supabase.from("products").delete().in("id", ids);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").update({ is_active: action === "activate" }).in("id", ids);
        if (error) throw error;
      }
    },
    onSuccess: (_, { ids, action }) => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product"] });
      qc.invalidateQueries({ queryKey: ["product-card-data"] });
      qc.invalidateQueries({ queryKey: ["all-product-variants-summary"] });
      setSelected(new Set());
      toast.success(
        `${ids.length} product${ids.length > 1 ? "s" : ""} ${
          action === "delete" ? "deleted" : action === "activate" ? "activated" : "deactivated"
        }`
      );
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
    setDeletedImageUrls([]);
    if (product) {
      setEditing({ ...product, specifications: product.specifications || {} });
      const specs = product.specifications || {};
      setSelectedColors(Array.isArray(specs.colors) ? specs.colors : []);
      setSelectedSizes(Array.isArray(specs.sizes) ? specs.sizes : []);
      loadVariants(product.id);
    } else {
      setEditing({
        name: "",
        slug: "",
        price: 0,
        compare_at_price: null,
        stock_quantity: 0,
        description: "",
        short_description: "",
        is_active: true,
        is_featured: false,
        thumbnail: "",
        images: [],
        tags: [],
        category_id: null,
        video_url: "",
        video_highlight: false,
        image_carousel: false,
        meta_title: "",
        meta_description: "",
        meta_keywords: "",
        specifications: { product_type: "clothing", sizes: ["M", "L"], colors: ["Black"], weight: "", weight_unit: "kg", specs: [] },
      });
      setSelectedColors(["Black"]);
      setSelectedSizes(["M", "L"]);
      setVariants([]);
      setHasVariantsMode(false);
    }
    setCustomColorInput("");
    setCustomSizeInput("");
    setBulkPriceValue("");
    setBulkStockValue("");
    setModalTab("info");
    setDialogOpen(true);
  };

  const updateField = (field: string, value: any) => {
    setEditing((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleNameChange = (name: string) => {
    if (!editing) return;
    const generatedSlug = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    setEditing((prev) => {
      if (!prev) return null;
      const isAutoSlug =
        !prev.slug ||
        prev.slug ===
          prev.name
            ?.toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "");

      return {
        ...prev,
        name,
        slug: isAutoSlug ? generatedSlug : prev.slug,
        meta_title: prev.meta_title ? prev.meta_title : name,
      };
    });
  };

  // Upload helpers
  const uploadSingleFile = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    try {
      const { error } = await supabase.storage.from("products").upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) {
        const fallbackPath = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: fbErr } = await supabase.storage.from("site-assets").upload(fallbackPath, file, { cacheControl: "3600", upsert: false });
        if (fbErr) {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve((e.target?.result as string) || null);
            reader.readAsDataURL(file);
          });
        }
        const { data: fbData } = supabase.storage.from("site-assets").getPublicUrl(fallbackPath);
        return fbData.publicUrl;
      }
      const { data: urlData } = supabase.storage.from("products").getPublicUrl(path);
      return urlData.publicUrl;
    } catch {
      return null;
    }
  };

  const handleBatchImageUpload = async (files: FileList | File[]) => {
    const fileArr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (fileArr.length === 0) return;

    const currentImages = editing?.images || [];
    if (currentImages.length + fileArr.length > 8) {
      toast.error("Maximum 8 images allowed per product");
    }

    const availableSlots = 8 - currentImages.length;
    const toUpload = fileArr.slice(0, Math.max(0, availableSlots));
    if (toUpload.length === 0) return;

    setGalleryUploading(true);
    const newUrls: string[] = [];

    for (const file of toUpload) {
      const url = await uploadSingleFile(file);
      if (url) newUrls.push(url);
    }

    setGalleryUploading(false);

    if (newUrls.length > 0) {
      const combined = [...currentImages, ...newUrls];
      const newThumbnail = editing?.thumbnail || combined[0];
      setEditing((prev) => (prev ? { ...prev, images: combined, thumbnail: newThumbnail } : null));
      toast.success(`Uploaded ${newUrls.length} image${newUrls.length > 1 ? "s" : ""}`);
    } else {
      toast.error("Failed to upload images");
    }
  };

  const removeGalleryImage = (idx: number) => {
    if (!editing) return;
    const current = [...(editing.images || [])];
    const removedUrl = current[idx];
    if (removedUrl) {
      setDeletedImageUrls((prev) => [...prev, removedUrl]);
      // Prune immediately from storage
      deleteStorageFilesFn({ data: { urls: [removedUrl] } }).catch(() => {});
    }
    current.splice(idx, 1);
    const newThumbnail = editing.thumbnail === removedUrl ? current[0] || "" : editing.thumbnail;
    setEditing((prev) => (prev ? { ...prev, images: current, thumbnail: newThumbnail } : null));
  };

  const setCoverImage = (url: string) => {
    if (!editing) return;
    updateField("thumbnail", url);
    toast.success("Cover image set");
  };

  // SKU helpers
  const handleGenerateSku = async () => {
    if (!editing?.name?.trim()) {
      toast.error("Enter a product name first");
      return;
    }
    setSkuStatus("checking");
    try {
      const r: any = await generateSkuFn({
        data: { name: editing.name, prefix: skuPrefix, excludeProductId: editing?.id },
      });
      updateField("sku", r.sku);
      setSkuSuggestions(r.suggestions ?? []);
      setSkuStatus("available");
      setSkuTakenBy(null);
    } catch (e: any) {
      setSkuStatus("idle");
      toast.error(e.message ?? "Could not generate SKU");
    }
  };

  const handleCheckSku = async (skuOverride?: string) => {
    const sku = (skuOverride ?? editing?.sku ?? "").trim();
    if (!sku) {
      setSkuStatus("idle");
      setSkuSuggestions([]);
      return;
    }
    setSkuStatus("checking");
    try {
      const r: any = await checkSkuFn({ data: { sku, excludeProductId: editing?.id } });
      setSkuStatus(r.available ? "available" : "taken");
      setSkuTakenBy(r.exact ? r.exact.name ?? "another variant" : null);
      setSkuSuggestions(r.suggestions ?? []);
    } catch {
      setSkuStatus("idle");
    }
  };

  // Specs & Attributes
  const specs = editing?.specifications || {};
  const productType = specs.product_type || "general";

  const updateSpec = (key: string, value: any) => {
    updateField("specifications", { ...specs, [key]: value });
  };

  const toggleColorOption = (colorName: string) => {
    const exists = selectedColors.includes(colorName);
    const updated = exists ? selectedColors.filter((c) => c !== colorName) : [...selectedColors, colorName];
    setSelectedColors(updated);
  };

  const toggleSizeOption = (sizeName: string) => {
    const exists = selectedSizes.includes(sizeName);
    const updated = exists ? selectedSizes.filter((s) => s !== sizeName) : [...selectedSizes, sizeName];
    setSelectedSizes(updated);
  };

  const addCustomColor = () => {
    const val = customColorInput.trim();
    if (!val) return;
    if (!selectedColors.includes(val)) setSelectedColors([...selectedColors, val]);
    setCustomColorInput("");
  };

  const addCustomSize = () => {
    const val = customSizeInput.trim();
    if (!val) return;
    if (!selectedSizes.includes(val)) setSelectedSizes([...selectedSizes, val]);
    setCustomSizeInput("");
  };

  // Load variants from backend
  const loadVariants = async (productId: string) => {
    setVariantsLoading(true);
    const { data } = await supabase
      .from("product_variants" as any)
      .select("*")
      .eq("product_id", productId)
      .order("sort_order");

    const rows = (data as any[]) || [];
    setVariants(rows);
    setHasVariantsMode(rows.length > 0);

    // Populate selected colors & sizes from actual loaded variants if empty
    const extractedColors = Array.from(new Set(rows.map((r) => r.color).filter(Boolean)));
    const extractedSizes = Array.from(new Set(rows.map((r) => r.size).filter(Boolean)));
    if (extractedColors.length > 0) setSelectedColors(extractedColors);
    if (extractedSizes.length > 0) setSelectedSizes(extractedSizes);

    // Expand all color groups by default
    const exp: Record<string, boolean> = {};
    for (const c of extractedColors) exp[c] = true;
    setExpandedColors(exp);

    const { data: serialRows } = await supabase
      .from("product_serials" as any)
      .select("variant_id")
      .eq("product_id", productId)
      .not("variant_id", "is", null);

    const counts: Record<string, number> = {};
    for (const r of (serialRows as any[]) || []) {
      counts[r.variant_id] = (counts[r.variant_id] || 0) + 1;
    }
    setVariantSerialCounts(counts);
    setVariantsLoading(false);
  };

  // Generate matrix combinations (Color x Size)
  const generateMatrixCombinations = () => {
    if (selectedColors.length === 0 && selectedSizes.length === 0) {
      toast.error("Please pick at least one Color or Size option");
      return;
    }

    const basePrefix = skuPrefix || "ORZ";
    const productName = editing?.name || "PRD";
    const cleanProd = productName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 4);

    const newVariants: any[] = [];
    const colors = selectedColors.length > 0 ? selectedColors : [""];
    const sizes = selectedSizes.length > 0 ? selectedSizes : [""];

    for (const color of colors) {
      for (const size of sizes) {
        // Check if combo already exists to preserve its stock and SKU
        const existing = variants.find(
          (v) => (v.color || "") === color && (v.size || "") === size
        );

        if (existing) {
          newVariants.push(existing);
        } else {
          const colorCode = color ? color.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3) : "";
          const sizeCode = size ? size.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
          const autoSku = [basePrefix, cleanProd, colorCode, sizeCode].filter(Boolean).join("-");

          newVariants.push({
            id: null,
            product_id: editing?.id,
            color: color || null,
            size: size || null,
            sku: autoSku,
            price_override: null,
            stock_quantity: 0,
            is_active: true,
            sort_order: newVariants.length,
            image_url: null,
          });
        }
      }
    }

    setVariants(newVariants);
    setHasVariantsMode(true);

    const exp: Record<string, boolean> = {};
    for (const c of colors) exp[c || "Default"] = true;
    setExpandedColors(exp);

    toast.success(`Generated ${newVariants.length} variation combination(s)`);
  };

  // Group variants by Color for hierarchical display
  const variantColorGroups = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const v of variants) {
      const key = v.color || "Default";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }
    return Array.from(map.entries()).map(([color, items]) => ({
      color,
      isDefault: color === "Default",
      items,
      totalStock: items.reduce((sum, item) => sum + (Number(item.stock_quantity) || 0), 0),
      image: items.find((i) => i.image_url)?.image_url || "",
    }));
  }, [variants]);

  const updateVariantByCombo = (color: string, size: string, field: string, value: any) => {
    setVariants((prev) =>
      prev.map((v) => {
        const matchesColor = (v.color || "Default") === color;
        const matchesSize = (v.size || "") === size;
        if (matchesColor && matchesSize) {
          return { ...v, [field]: value };
        }
        return v;
      })
    );
  };

  const removeVariantByCombo = (color: string, size: string) => {
    setVariants((prev) =>
      prev.filter((v) => !((v.color || "Default") === color && (v.size || "") === size))
    );
  };

  const setColorGroupImage = (color: string, url: string) => {
    setVariants((prev) =>
      prev.map((v) => {
        if ((v.color || "Default") === color) {
          return { ...v, image_url: url };
        }
        return v;
      })
    );
    toast.success(`Updated photo for color ${color}`);
  };

  const applyColorGroupPrice = (color: string, priceVal: number | null) => {
    setVariants((prev) =>
      prev.map((v) => {
        if ((v.color || "Default") === color) {
          return { ...v, price_override: priceVal };
        }
        return v;
      })
    );
    toast.success(`Updated price for all sizes in ${color}`);
  };

  const applyColorGroupStock = (color: string, stockVal: number) => {
    setVariants((prev) =>
      prev.map((v) => {
        if ((v.color || "Default") === color) {
          return { ...v, stock_quantity: Math.max(0, stockVal) };
        }
        return v;
      })
    );
    toast.success(`Updated stock for all sizes in ${color}`);
  };

  const autoGenerateAllSkus = async () => {
    const basePrefix = skuPrefix || "ORZ";
    const productName = editing?.name || "PRD";
    const cleanProd = productName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 4);

    setVariants((prev) =>
      prev.map((v) => {
        const colorCode = v.color ? v.color.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3) : "";
        const sizeCode = v.size ? v.size.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
        const autoSku = [basePrefix, cleanProd, colorCode, sizeCode].filter(Boolean).join("-");
        return { ...v, sku: autoSku };
      })
    );
    toast.success("Generated SKUs for all variations");
  };

  // Total stock computed dynamically
  const totalStockComputed = useMemo(() => {
    if (hasVariantsMode && variants.length > 0) {
      return variants.reduce((sum, v) => sum + (Number(v.stock_quantity) || 0), 0);
    }
    return Number(editing?.stock_quantity) || 0;
  }, [hasVariantsMode, variants, editing?.stock_quantity]);

  const copySkuToClipboard = (sku: string) => {
    if (!sku) return;
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 2000);
    toast.success(`Copied SKU "${sku}"`);
  };

  const regularPrice = Number(editing?.compare_at_price || editing?.price || 0);
  const discountPrice = editing?.compare_at_price ? Number(editing?.price || 0) : null;
  const discountSavings =
    discountPrice != null && discountPrice < regularPrice ? regularPrice - discountPrice : 0;
  const discountPercent =
    discountPrice != null && discountPrice < regularPrice && regularPrice > 0
      ? Math.round(((regularPrice - discountPrice) / regularPrice) * 100)
      : 0;

  const selectedCategoryId = editing?.category_id;
  const selectedParent = categories.find((c) => c.id === selectedCategoryId);
  const isSubcategory = selectedParent?.parent_id != null;
  const effectiveParentId = isSubcategory ? selectedParent?.parent_id : selectedCategoryId;

  return (
    <div className="max-w-[1750px] mx-auto w-full space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        icon={<Package className="w-5 h-5 text-primary" />}
        title="Products"
        description="Design, manage inventory, barcodes, and storefront listing details"
        actions={
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 rounded-xl h-9 w-full sm:w-auto justify-center text-xs font-semibold">
                  <Download className="h-3.5 w-3.5 text-muted-foreground" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem onClick={exportProducts} className="gap-2 cursor-pointer">
                  <Download className="h-3.5 w-3.5" /> Products CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportVariants} className="gap-2 cursor-pointer">
                  <Download className="h-3.5 w-3.5" /> Variants CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    setCleaningOrphans(true);
                    try {
                      const res: any = await cleanOrphanFn();
                      if (res.deletedCount > 0) {
                        toast.success(`Cleaned ${res.deletedCount} unused images from storage!`);
                        qc.invalidateQueries({ queryKey: ["admin-products"] });
                        qc.invalidateQueries({ queryKey: ["products"] });
                      } else {
                        toast.success("Storage is clean — no unused images found.");
                      }
                    } catch (e: any) {
                      toast.error(e.message || "Failed to clean orphan images");
                    } finally {
                      setCleaningOrphans(false);
                    }
                  }}
                  disabled={cleaningOrphans}
                  className="gap-2 cursor-pointer text-amber-600 dark:text-amber-400"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clean Orphan Images
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <BulkUpload
              mode="products"
              onComplete={() => qc.invalidateQueries({ queryKey: ["admin-products"] })}
              categories={categories.map((c) => ({ id: c.id, name: c.name, slug: "" }))}
            />

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl h-9 w-full sm:w-auto justify-center text-xs font-semibold"
              onClick={() => syncStockMut.mutate()}
              disabled={syncStockMut.isPending}
              title="Recompute stock from remaining serials in Stock & Serials"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncStockMut.isPending ? "animate-spin" : ""}`} />
              <span>Sync Stock</span>
            </Button>

            <Button
              onClick={() => openEdit()}
              size="sm"
              className="gap-1.5 rounded-xl h-9 w-full sm:w-auto justify-center bg-primary text-primary-foreground font-semibold shadow-sm hover:shadow active:scale-95 transition-all text-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Add Product
            </Button>
          </div>
        }
      />

      <Tabs value={activeMainTab} onValueChange={handleTabChange}>
        <TabsList className="hidden">
          <TabsTrigger value="list">All Products</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="commerce">Commerce</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6 mt-0">
          {/* ── Executive Stats Banner ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-4 flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Box className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground font-medium truncate">Total Products</p>
                <p className="text-xl font-bold tracking-tight text-foreground">{stats.total}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-4 flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground font-medium truncate">Active Listings</p>
                <p className="text-xl font-bold tracking-tight text-foreground">{stats.active}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-4 flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground font-medium truncate">Low Stock (≤ 5)</p>
                <p className="text-xl font-bold tracking-tight text-foreground">{stats.lowStock}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-4 flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground font-medium truncate">Total Inventory Units</p>
                <p className="text-xl font-bold tracking-tight text-foreground">{stats.totalInventoryUnits}</p>
              </div>
            </div>
          </div>

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
                placeholder="Search products by name, SKU, slug..."
                className="pl-9 h-10 rounded-xl bg-background/80 border-border/80 text-sm focus-visible:ring-primary/20 w-full"
              />
            </div>

            {/* ── 1-Button Consolidated Filter ── */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className={`h-10 px-3.5 rounded-xl border text-xs font-semibold gap-2 transition-all cursor-pointer ${
                    statusFilter !== "all" || categoryFilter !== "all"
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-background/80 border-border/80 text-foreground hover:bg-card hover:border-border"
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>
                    {statusFilter !== "all"
                      ? `Status: ${statusFilter === "active" ? "Active" : statusFilter === "draft" ? "Draft" : statusFilter === "low_stock" ? "Low Stock" : "Out of Stock"}`
                      : categoryFilter !== "all"
                      ? `Category: ${categories.find((c) => c.id === categoryFilter)?.name || "Selected"}`
                      : "Filter Products"}
                  </span>
                  {(statusFilter !== "all" || categoryFilter !== "all") && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                  )}
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl border-border/80 bg-popover/95 backdrop-blur-xl shadow-xl space-y-2">
                <div className="flex items-center justify-between px-2 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Filter Catalog</span>
                  {(statusFilter !== "all" || categoryFilter !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter("all");
                        setCategoryFilter("all");
                      }}
                      className="text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                    >
                      Reset All
                    </button>
                  )}
                </div>

                {/* Status Options */}
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground px-2">Status</span>
                  {[
                    { key: "all" as const, label: `All Products (${products.length})` },
                    { key: "active" as const, label: `Active (${stats.active})`, dot: "bg-emerald-500" },
                    { key: "draft" as const, label: `Draft (${stats.total - stats.active})`, dot: "bg-muted-foreground" },
                    { key: "low_stock" as const, label: `Low Stock ≤ 5 (${stats.lowStock})`, dot: "bg-amber-500" },
                    { key: "out_of_stock" as const, label: `Out of Stock (${stats.outOfStock})`, dot: "bg-rose-500" },
                  ].map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setStatusFilter(s.key)}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-left flex items-center justify-between transition-colors cursor-pointer ${
                        statusFilter === s.key
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-foreground hover:bg-muted/60"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {s.dot && <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />}
                        <span>{s.label}</span>
                      </span>
                      {statusFilter === s.key && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>

                {/* Categories */}
                <div className="space-y-1 pt-1 border-t border-border/40">
                  <span className="text-[10px] font-semibold text-muted-foreground px-2">Category</span>
                  <button
                    type="button"
                    onClick={() => setCategoryFilter("all")}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-left flex items-center justify-between transition-colors cursor-pointer ${
                      categoryFilter === "all"
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <span>All Categories</span>
                    {categoryFilter === "all" && <Check className="w-3.5 h-3.5" />}
                  </button>
                  {parentCategories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryFilter(c.id)}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-left flex items-center justify-between transition-colors cursor-pointer ${
                        categoryFilter === c.id
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-foreground hover:bg-muted/60"
                      }`}
                    >
                      <span className="truncate">{c.name}</span>
                      {categoryFilter === c.id && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* ── High-Density Desktop Product Table ── */}
          <div className="hidden md:block rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-16 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5" title="Select / Drag to rearrange">
                      <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Select all" />
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 opacity-50" />
                    </div>
                  </TableHead>
                  <TableHead className="w-[340px]">Product</TableHead>
                  <TableHead className="w-[140px]">SKU</TableHead>
                  <TableHead className="w-[120px]">Price</TableHead>
                  <TableHead className="w-[140px]">Stock & Variants</TableHead>
                  <TableHead className="w-[110px]">Type</TableHead>
                  <TableHead className="w-[90px] text-center">Status</TableHead>
                  <TableHead className="text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableLoadingRow cols={8} />
                ) : filtered.length === 0 ? (
                  <TableEmptyRow
                    cols={8}
                    icon={<Package className="w-6 h-6 text-muted-foreground" />}
                    message="No products found"
                    hint={search ? "Try adjusting your search query or filters." : "Click '+ Add Product' to list your first item."}
                  />
                ) : (
                  displayProducts.map((p: any, index: number) => {
                    const thumb = p.thumbnail || (Array.isArray(p.images) && p.images[0]);
                    const hasDiscount = p.compare_at_price && p.compare_at_price > p.price;
                    const prodVariants = variantsByProductId.get(p.id) || [];
                    const hasVariants = prodVariants.length > 0;
                    const stock = p.stock_quantity ?? 0;
                    const isOutOfStock = stock <= 0;
                    const isLowStock = stock > 0 && stock <= 5;

                    // Unique colors in this product
                    const uniqueColors = Array.from(new Set(prodVariants.map((v: any) => v.color).filter(Boolean)));

                    return (
                      <TableRow
                        key={p.id}
                        draggable
                        onDragStart={() => {
                          dragItem.current = index;
                          setDraggedIndex(index);
                        }}
                        onDragEnter={() => (dragOverItem.current = index)}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnd={handleSort}
                        className={`transition-colors cursor-move ${
                          draggedIndex === index
                            ? "opacity-30 bg-primary/10 border-dashed border-primary"
                            : selected.has(p.id)
                            ? "bg-primary/5"
                            : "hover:bg-muted/30"
                        }`}
                      >
                        <TableCell className="w-16 px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Checkbox
                              checked={selected.has(p.id)}
                              onCheckedChange={() => toggleSelect(p.id)}
                              aria-label={`Select ${p.name}`}
                              className="shrink-0"
                            />
                            <div
                              className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-foreground transition-colors p-0.5"
                              title="Drag to rearrange"
                            >
                              <GripVertical className="w-3.5 h-3.5 shrink-0" />
                            </div>
                          </div>
                        </TableCell>

                        {/* Product info with high-res thumbnail */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-muted border border-border/60 overflow-hidden shrink-0 relative group">
                              {thumb ? (
                                <img src={thumb} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  <Package className="w-5 h-5 opacity-40" />
                                </div>
                              )}
                              {Array.isArray(p.images) && p.images.length > 1 && (
                                <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/70 text-white text-[9px] font-bold">
                                  +{p.images.length - 1}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => openEdit(p)}
                                className="font-semibold text-sm text-foreground hover:text-primary transition-colors truncate block text-left max-w-[240px]"
                              >
                                {p.name}
                              </button>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                                  {p.categories?.name || "Uncategorized"}
                                </span>
                                {p.is_featured && (
                                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                                    Featured
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* SKU */}
                        <TableCell>
                          {p.sku ? (
                            <button
                              type="button"
                              onClick={() => copySkuToClipboard(p.sku)}
                              title="Click to copy SKU"
                              className="font-mono text-xs font-medium px-2 py-1 rounded-md bg-muted/60 border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors flex items-center gap-1.5"
                            >
                              <span className="truncate max-w-[90px]">{p.sku}</span>
                              {copiedSku === p.sku ? (
                                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                              ) : (
                                <Copy className="w-3 h-3 text-muted-foreground shrink-0 opacity-60" />
                              )}
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        {/* Price */}
                        <TableCell>
                          <div>
                            <span className="font-bold text-sm text-foreground">
                              ৳{Number(p.price).toFixed(2)}
                            </span>
                            {hasDiscount && (
                              <span className="text-xs text-muted-foreground line-through ml-1.5">
                                ৳{Number(p.compare_at_price).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Stock & Variant Count */}
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  isOutOfStock
                                    ? "bg-rose-500"
                                    : isLowStock
                                    ? "bg-amber-500 animate-pulse"
                                    : "bg-emerald-500"
                                }`}
                              />
                              <span
                                className={`text-xs font-semibold ${
                                  isOutOfStock
                                    ? "text-rose-600 dark:text-rose-400"
                                    : isLowStock
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-foreground"
                                }`}
                              >
                                {isOutOfStock ? "Out of Stock" : `${stock} in stock`}
                              </span>
                            </div>
                            <div className="text-[10.5px] text-muted-foreground mt-0.5">
                              {hasVariants ? (
                                <span className="font-medium text-primary">
                                  {uniqueColors.length > 0 ? `${uniqueColors.length} color(s)` : ""}
                                  {uniqueColors.length > 0 ? ` · ${prodVariants.length} sizes` : `${prodVariants.length} options`}
                                </span>
                              ) : (
                                <span>Single item (no variants)</span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Type */}
                        <TableCell>
                          <Badge variant="outline" className="text-[11px] capitalize rounded-lg">
                            {(p.specifications as any)?.product_type || "general"}
                          </Badge>
                        </TableCell>

                        {/* Status Switch */}
                        <TableCell className="text-center">
                          <Switch
                            checked={!!p.is_active}
                            onCheckedChange={(checked) =>
                              toggleActiveMutation.mutate({ id: p.id, is_active: checked })
                            }
                            aria-label={`Toggle status for ${p.name}`}
                          />
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right pr-4 space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                            title="Print Barcode Stickers"
                            onClick={async () => {
                              const { data } = await (supabase.from as any)("product_serials")
                                .select("serial_code")
                                .eq("product_id", p.id)
                                .eq("status", "available")
                                .limit(500);
                              const codes = (data ?? []).map((r: any) => r.serial_code);
                              if (!codes.length) {
                                toast.error("No available serials found for this product.");
                                return;
                              }
                              setPrintProduct({ id: p.id, codes });
                            }}
                          >
                            <Package className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary"
                            onClick={() => openEdit(p)}
                            title="Edit Product"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
                                title="Delete Product"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-2xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete product?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{p.name}". This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                                  onClick={() => deleteMutation.mutate(p.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* ── Mobile Product Cards List ── */}
          <div className="md:hidden space-y-3">
            {isLoading && (
              <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                Loading product catalogue…
              </div>
            )}

            {!isLoading && filtered.length === 0 && (
              <div className="rounded-2xl border bg-card p-6 text-center">
                <Package className="w-8 h-8 mx-auto text-muted-foreground mb-2 opacity-50" />
                <p className="text-sm font-semibold">No products found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {search ? "Try a different search term or filter." : "Add your first product to get started."}
                </p>
              </div>
            )}

            {displayProducts.map((p: any, index: number) => {
              const thumb = p.thumbnail || (Array.isArray(p.images) && p.images[0]);
              const prodVariants = variantsByProductId.get(p.id) || [];
              const uniqueColors = Array.from(new Set(prodVariants.map((v: any) => v.color).filter(Boolean)));
              const isSelected = selected.has(p.id);

              return (
                <div
                  key={p.id}
                  draggable
                  onDragStart={() => {
                    dragItem.current = index;
                    setDraggedIndex(index);
                  }}
                  onDragEnter={() => (dragOverItem.current = index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnd={handleSort}
                  className={`rounded-xl border bg-card p-2.5 transition-all shadow-xs cursor-move ${
                    draggedIndex === index
                      ? "opacity-30 bg-primary/10 border-dashed border-primary"
                      : isSelected
                      ? "border-primary/60 bg-primary/5"
                      : "border-border/70 hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Checkbox & Drag Point */}
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(p.id)}
                        aria-label={`Select ${p.name}`}
                        className="h-4 w-4 rounded-md"
                      />
                      <div
                        className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-foreground transition-colors p-1 touch-none"
                        title="Drag to rearrange"
                      >
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Thumbnail */}
                    <div
                      className="shrink-0 cursor-pointer"
                      onClick={() => openEdit(p)}
                    >
                      {thumb ? (
                        <img src={thumb} alt="" className="w-11 h-11 rounded-lg object-cover bg-muted border border-border/60" />
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-muted/60 flex items-center justify-center border border-border/60">
                          <Package className="w-5 h-5 text-muted-foreground opacity-40" />
                        </div>
                      )}
                    </div>

                    {/* Product Info & Meta */}
                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => openEdit(p)}
                    >
                      <h4 className="font-semibold text-xs text-foreground truncate leading-tight">
                        {p.name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5 truncate">
                        <span className="text-foreground/90 font-medium">{p.categories?.name || "Uncategorized"}</span>
                        <span>·</span>
                        <span className="font-bold text-foreground">৳{Number(p.price).toFixed(2)}</span>
                        <span>·</span>
                        <span>Stock: <strong className="text-foreground">{p.stock_quantity ?? 0}</strong></span>
                        {uniqueColors.length > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-primary font-medium">{uniqueColors.length} {uniqueColors.length === 1 ? "color" : "colors"}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Active Switch */}
                    <div className="shrink-0 pl-1" onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={!!p.is_active}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({ id: p.id, is_active: checked })
                        }
                        aria-label={`Toggle status for ${p.name}`}
                        className="scale-75 origin-right"
                      />
                    </div>
                  </div>

                  {/* Compact Bottom Action Bar */}
                  <div className="flex items-center gap-1.5 w-full pt-2 mt-2 border-t border-border/40">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 rounded-lg text-[11px] justify-center font-medium gap-1 px-2 hover:bg-primary/5 hover:text-primary hover:border-primary/40"
                      onClick={async () => {
                        const { data } = await (supabase.from as any)("product_serials")
                          .select("serial_code")
                          .eq("product_id", p.id)
                          .eq("status", "available")
                          .limit(500);
                        const codes = (data ?? []).map((r: any) => r.serial_code);
                        if (!codes.length) {
                          toast.error("No available serials found for this product.");
                          return;
                        }
                        setPrintProduct({ id: p.id, codes });
                      }}
                    >
                      <Package className="w-3 h-3 text-primary" /> Print
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 rounded-lg text-[11px] justify-center font-medium gap-1 px-2"
                      onClick={() => openEdit(p)}
                    >
                      <Pencil className="w-3 h-3 text-primary" /> Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive shrink-0 rounded-lg hover:bg-destructive/10">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete product?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{p.name}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                            onClick={() => deleteMutation.mutate(p.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
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

      {/* ── Unified Product Studio (Fixed Tab-Switched Modal) ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-full sm:max-w-4xl h-[92vh] sm:h-[88vh] max-h-[92vh] overflow-hidden p-0 rounded-2xl sm:rounded-3xl border border-border/80 shadow-2xl flex flex-col bg-card">
          {/* Studio Header with Center-Aligned Tab Pills */}
          <div className="px-4 sm:px-6 py-3.5 border-b border-border/70 bg-muted/20 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                    {editing?.id ? `Edit: ${editing.name || "Product"}` : "Create New Product"}
                  </DialogTitle>
                  <DialogDescription className="text-[11px] text-muted-foreground">
                    Step through each tab to configure details, visuals, pricing, and variants.
                  </DialogDescription>
                </div>
              </div>
              {editing?.slug && (
                <a
                  href={`/product/${editing.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold bg-primary/10 px-2.5 py-1 rounded-lg"
                >
                  Storefront Preview <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Small center-aligned tab navigation pills */}
            <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap pt-0.5">
              {[
                { id: "info", label: "Basic Info", icon: Box },
                { id: "media", label: "Visuals & Media", icon: Images },
                { id: "pricing", label: "Pricing & Stock", icon: TrendingUp },
                { id: "variants", label: "Options & Variations", icon: Layers },
              ].map((tab, idx) => {
                const Icon = tab.icon;
                const isActive = modalTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setModalTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20 scale-[1.02]"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50"
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold bg-black/15 dark:bg-white/15">
                      {idx + 1}
                    </span>
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                    {tab.id === "media" && (editing?.images?.length || 0) > 0 && (
                      <span className="text-[10px] px-1 py-0 rounded-full bg-background/20 font-mono">
                        {editing.images.length}
                      </span>
                    )}
                    {tab.id === "variants" && hasVariantsMode && variants.length > 0 && (
                      <span className="text-[10px] px-1 py-0 rounded-full bg-background/20 font-mono">
                        {variants.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Studio Body Fixed Height Scrollable */}
          {editing && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-card">
              {/* ── TAB 1: BASIC INFO & PLACEMENT ── */}
              {modalTab === "info" && (
                <div className="max-w-3xl mx-auto space-y-5">
                  {/* Card: Core Details */}
                  <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 space-y-4 shadow-sm">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Box className="w-4 h-4 text-primary" /> Product Identity & Details
                    </h3>

                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground">Product Title *</Label>
                      <Input
                        value={editing.name ?? ""}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="e.g. Premium Oversized Graphic T-Shirt"
                        className="rounded-xl h-10 mt-1.5 font-medium text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground">URL Slug</Label>
                        <Input
                          value={editing.slug ?? ""}
                          onChange={(e) => updateField("slug", e.target.value)}
                          placeholder="e.g. premium-oversized-graphic-tshirt"
                          className="rounded-xl h-9 mt-1 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground">Short Pitch / Subtitle</Label>
                        <Input
                          value={editing.short_description ?? ""}
                          onChange={(e) => updateField("short_description", e.target.value)}
                          placeholder="e.g. 100% Combed Cotton, Drop Shoulder"
                          className="rounded-xl h-9 mt-1 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground">Full Description</Label>
                      <Textarea
                        value={editing.description ?? ""}
                        onChange={(e) => updateField("description", e.target.value)}
                        placeholder="Write product specifications, fabric care, materials or highlights..."
                        rows={4}
                        className="rounded-xl mt-1.5 text-sm resize-none"
                      />
                    </div>
                  </div>

                  {/* Card: Categorization & Placement */}
                  <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 space-y-4 shadow-sm">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" /> Category & Placement
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground">Product Type</Label>
                        <Select
                          value={productType}
                          onValueChange={(v) => updateSpec("product_type", v)}
                        >
                          <SelectTrigger className="rounded-xl h-9 mt-1 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {PRODUCT_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground">Parent Category</Label>
                        <Select
                          value={effectiveParentId ?? "none"}
                          onValueChange={(v) => updateField("category_id", v === "none" ? null : v)}
                        >
                          <SelectTrigger className="rounded-xl h-9 mt-1 text-xs">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="none">Uncategorized</SelectItem>
                            {parentCategories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground">Subcategory</Label>
                        <Select
                          value={isSubcategory ? selectedCategoryId : "none"}
                          onValueChange={(v) => updateField("category_id", v === "none" ? effectiveParentId : v)}
                          disabled={!effectiveParentId || effectiveParentId === "none"}
                        >
                          <SelectTrigger className="rounded-xl h-9 mt-1 text-xs">
                            <SelectValue placeholder="Select Subcategory" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="none">None</SelectItem>
                            {effectiveParentId &&
                              effectiveParentId !== "none" &&
                              getChildren(effectiveParentId).map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Card: Visibility & Publishing */}
                  <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 space-y-3 shadow-sm">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Eye className="w-4 h-4 text-primary" /> Storefront Visibility
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20">
                        <div>
                          <p className="text-xs font-semibold text-foreground">Active in Storefront</p>
                          <p className="text-[10px] text-muted-foreground">Visible to customers for purchase</p>
                        </div>
                        <Switch
                          checked={editing.is_active ?? true}
                          onCheckedChange={(v) => updateField("is_active", v)}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20">
                        <div>
                          <p className="text-xs font-semibold text-foreground">Featured Product</p>
                          <p className="text-[10px] text-muted-foreground">Show in hero & featured grids</p>
                        </div>
                        <Switch
                          checked={editing.is_featured ?? false}
                          onCheckedChange={(v) => updateField("is_featured", v)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 2: VISUALS & MEDIA ── */}
              {modalTab === "media" && (
                <div className="max-w-3xl mx-auto space-y-5">
                  {/* Photo Gallery Multi-Upload */}
                  <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Images className="w-4 h-4 text-primary" /> Product Photos ({editing.images?.length || 0}/8)
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                          Upload high-resolution apparel images. Click ⭐ to set any photo as the cover thumbnail.
                        </p>
                      </div>
                    </div>

                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragActive(true);
                      }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragActive(false);
                        handleBatchImageUpload(e.dataTransfer.files);
                      }}
                      onClick={() => galleryInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                        dragActive
                          ? "border-primary bg-primary/10 scale-[0.99]"
                          : "border-border/80 hover:border-primary/50 hover:bg-muted/30"
                      }`}
                    >
                      {galleryUploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-7 h-7 animate-spin text-primary" />
                          <p className="text-xs font-medium">Uploading images…</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
                            <Upload className="w-6 h-6" />
                          </div>
                          <p className="text-xs font-bold text-foreground">
                            Click or drag & drop product photos here
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            PNG, JPG, WEBP up to 8 photos
                          </p>
                        </div>
                      )}
                      <input
                        ref={galleryInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) handleBatchImageUpload(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </div>

                    {Array.isArray(editing.images) && editing.images.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                        {editing.images.map((imgUrl: string, idx: number) => {
                          const isCover = (editing.thumbnail || editing.images[0]) === imgUrl;
                          return (
                            <div
                              key={idx}
                              className={`relative group rounded-xl overflow-hidden border-2 aspect-square bg-muted shadow-sm ${
                                isCover ? "border-primary ring-2 ring-primary/20" : "border-border/60"
                              }`}
                            >
                              <img src={imgUrl} alt={`Product ${idx + 1}`} className="w-full h-full object-cover" />

                              {isCover && (
                                <div className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-1">
                                  <Star className="w-2.5 h-2.5 fill-current" /> Cover
                                </div>
                              )}

                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                                {!isCover && (
                                  <button
                                    type="button"
                                    onClick={() => setCoverImage(imgUrl)}
                                    title="Set as Cover"
                                    className="p-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-semibold flex items-center gap-1 shadow hover:scale-105 active:scale-95 transition"
                                  >
                                    <Star className="w-3 h-3" /> Cover
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeGalleryImage(idx)}
                                  title="Delete"
                                  className="p-1.5 rounded-lg bg-destructive text-destructive-foreground shadow hover:scale-105 active:scale-95 transition"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Video Showcase */}
                  <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Film className="w-4 h-4 text-primary" /> Product Video Showcase
                      </h3>
                      {editing.video_url && (
                        <button
                          type="button"
                          onClick={() => updateField("video_url", "")}
                          className="text-[11px] text-destructive hover:underline flex items-center gap-1 font-medium transition"
                        >
                          <Trash2 className="w-3 h-3" /> Remove Video
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Option 1: Direct Video Upload */}
                      <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-2 flex flex-col justify-between">
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                            <UploadCloud className="w-3.5 h-3.5 text-primary" /> Direct Video Upload
                          </span>
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            Upload MP4 or WebM video directly to CDN storage.
                          </p>
                        </div>
                        <VideoUpload
                          bucket="banners"
                          folder="product-videos"
                          value={
                            editing.video_url &&
                            !editing.video_url.includes("youtube.com") &&
                            !editing.video_url.includes("youtu.be") &&
                            !editing.video_url.includes("vimeo.com")
                              ? editing.video_url
                              : ""
                          }
                          onUploaded={(url) => updateField("video_url", url)}
                        />
                      </div>

                      {/* Option 2: Embed Video Link */}
                      <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-2 flex flex-col justify-between">
                        <div className="space-y-2">
                          <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                            <Link2 className="w-3.5 h-3.5 text-primary" /> Embed Video Link
                          </span>
                          <Input
                            value={editing.video_url ?? ""}
                            onChange={(e) => updateField("video_url", e.target.value)}
                            placeholder="https://youtube.com/watch?v=... or direct MP4 URL"
                            className="rounded-xl h-9 text-xs bg-background"
                          />
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            Paste an embeddable YouTube, Vimeo, or CDN URL.
                          </p>
                        </div>

                        {editing.video_url && (
                          <div className="text-[11px] text-emerald-500 font-mono truncate flex items-center gap-1 pt-1 border-t border-border/40">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{editing.video_url}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 3: PRICING & INVENTORY ── */}
              {modalTab === "pricing" && (
                <div className="max-w-3xl mx-auto space-y-5">
                  {/* Card: Pricing & Discounts */}
                  <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" /> Pricing &amp; Discounts
                      </h3>
                      {discountPercent > 0 && (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 text-xs font-bold font-mono">
                          {discountPercent}% OFF {discountSavings > 0 ? `(Save ৳${discountSavings.toLocaleString()})` : ""}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground">Regular Price (৳) *</Label>
                        <Input
                          type="number"
                          value={editing.compare_at_price || editing.price || 0}
                          onChange={(e) => {
                            const val = e.target.value ? +e.target.value : 0;
                            if (editing.compare_at_price) {
                              updateField("compare_at_price", val);
                            } else {
                              updateField("price", val);
                            }
                          }}
                          placeholder="e.g. 850"
                          className="rounded-xl h-10 mt-1 font-bold text-sm"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">Main / regular catalog price</p>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground">Discount Price (৳)</Label>
                        <Input
                          type="number"
                          value={editing.compare_at_price ? editing.price : ""}
                          onChange={(e) => {
                            const val = e.target.value ? +e.target.value : null;
                            const mainPrice = editing.compare_at_price || editing.price || 0;
                            if (val != null && val > 0) {
                              setEditing((prev: any) => ({
                                ...prev,
                                compare_at_price: mainPrice,
                                price: val,
                              }));
                            } else {
                              setEditing((prev: any) => ({
                                ...prev,
                                price: mainPrice,
                                compare_at_price: null,
                              }));
                            }
                          }}
                          placeholder="Optional (e.g. 550)"
                          className="rounded-xl h-10 mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">Discounted selling price</p>
                      </div>
                    </div>
                  </div>

                  {/* Card: Inventory SKU & Barcodes */}
                  <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 space-y-4 shadow-sm">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Box className="w-4 h-4 text-primary" /> Inventory Barcode & SKU
                    </h3>

                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground">Base SKU Barcode</Label>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Input
                          value={skuPrefix}
                          onChange={(e) => setSkuPrefix(e.target.value.toUpperCase().slice(0, 6))}
                          onBlur={handleSavePrefix}
                          title="Default Brand Prefix (e.g. ORZ)"
                          className="w-16 h-10 text-center font-mono font-bold uppercase rounded-xl"
                        />
                        <Input
                          value={editing.sku ?? ""}
                          onChange={(e) => {
                            updateField("sku", e.target.value.toUpperCase());
                            setSkuStatus("idle");
                          }}
                          onBlur={() => handleCheckSku()}
                          placeholder="ORZ-PRD001"
                          className="font-mono uppercase h-10 rounded-xl flex-1 text-xs"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleGenerateSku}
                          disabled={skuStatus === "checking"}
                          className="h-10 px-3 rounded-xl gap-1 shrink-0 text-xs font-semibold"
                        >
                          {skuStatus === "checking" ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Wand2 className="w-3.5 h-3.5 text-primary" />
                          )}
                          Auto SKU
                        </Button>
                      </div>

                      {skuStatus === "available" && (editing.sku ?? "").trim() && (
                        <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1.5 font-medium">
                          <CircleCheck className="w-3.5 h-3.5" /> SKU Available
                        </p>
                      )}
                      {skuStatus === "taken" && (
                        <p className="text-xs text-rose-600 flex items-center gap-1 mt-1.5 font-medium">
                          <CircleAlert className="w-3.5 h-3.5" /> Already in use{skuTakenBy ? ` by "${skuTakenBy}"` : ""}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-muted-foreground">Total Stock Units</Label>
                          {hasVariantsMode && (
                            <Badge variant="secondary" className="text-[10px] text-primary">
                              Sum of all sizes
                            </Badge>
                          )}
                        </div>
                        <Input
                          type="number"
                          value={totalStockComputed}
                          onChange={(e) => {
                            if (!hasVariantsMode) {
                              updateField("stock_quantity", +e.target.value);
                            }
                          }}
                          disabled={hasVariantsMode}
                          className={`rounded-xl h-10 mt-1 font-bold text-sm ${
                            hasVariantsMode ? "bg-muted/60 text-primary cursor-not-allowed" : ""
                          }`}
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {hasVariantsMode
                            ? `Calculated from ${variants.length} color & size combinations.`
                            : "Direct single inventory quantity."}
                        </p>
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground">Sticker Barcode Preset</Label>
                        <Select
                          value={editing.sticker_preset_id ?? "__default__"}
                          onValueChange={(v) => updateField("sticker_preset_id", v === "__default__" ? null : v)}
                        >
                          <SelectTrigger className="rounded-xl h-10 mt-1 text-xs">
                            <SelectValue placeholder="Default active preset" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="__default__">Default active preset</SelectItem>
                            {stickerPresets.map((p: any) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} {p.is_active ? "• active" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 4: OPTIONS & VARIATIONS ── */}
              {modalTab === "variants" && (
                <div className="max-w-3xl mx-auto space-y-5">
                  <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 space-y-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Layers className="w-4 h-4 text-primary" /> Product Options & Variations Studio
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                          Turn on to configure color & size variations matrix with individual stock tracking.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {hasVariantsMode ? "Multi-Option Product" : "Simple Product"}
                        </span>
                        <Switch
                          checked={hasVariantsMode}
                          onCheckedChange={(enabled) => {
                            setHasVariantsMode(enabled);
                            if (enabled && variants.length === 0) {
                              generateMatrixCombinations();
                            }
                          }}
                        />
                      </div>
                    </div>

                    {hasVariantsMode ? (
                      <div className="space-y-5 pt-2 border-t border-border/50">
                        {/* Step A: Colors */}
                        <div className="space-y-2 p-3.5 rounded-2xl bg-muted/30 border border-border/60">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <Palette className="w-3.5 h-3.5 text-primary" /> Step 1: Available Colors ({selectedColors.length})
                            </Label>
                            <span className="text-[11px] text-muted-foreground">Click chips to toggle</span>
                          </div>

                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {COMMON_COLORS.map((c) => {
                              const isSelected = selectedColors.includes(c.name);
                              return (
                                <button
                                  key={c.name}
                                  type="button"
                                  onClick={() => toggleColorOption(c.name)}
                                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                                    isSelected
                                      ? "border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary/20"
                                      : "border-border/70 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                  }`}
                                >
                                  <span
                                    className="w-3 h-3 rounded-full border border-black/20 shrink-0"
                                    style={{ background: c.hex }}
                                  />
                                  {c.name}
                                </button>
                              );
                            })}
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <Input
                              value={customColorInput}
                              onChange={(e) => setCustomColorInput(e.target.value)}
                              placeholder="Add custom color name..."
                              className="h-8 rounded-lg text-xs"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addCustomColor();
                                }
                              }}
                            />
                            <Button type="button" size="sm" variant="outline" onClick={addCustomColor} className="h-8 text-xs rounded-lg">
                              Add Color
                            </Button>
                          </div>
                        </div>

                        {/* Step B: Sizes */}
                        <div className="space-y-2 p-3.5 rounded-2xl bg-muted/30 border border-border/60">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5 text-primary" /> Step 2: Available Sizes ({selectedSizes.length})
                            </Label>
                            <span className="text-[11px] text-muted-foreground">Clothing & footwear presets</span>
                          </div>

                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {(productType === "shoes" ? SHOE_SIZES : CLOTHING_SIZES).map((size) => {
                              const isSelected = selectedSizes.includes(size);
                              return (
                                <button
                                  key={size}
                                  type="button"
                                  onClick={() => toggleSizeOption(size)}
                                  className={`px-3 py-1 rounded-lg border text-xs font-bold transition-all ${
                                    isSelected
                                      ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20"
                                      : "border-border/70 text-muted-foreground hover:border-primary/40"
                                  }`}
                                >
                                  {size}
                                </button>
                              );
                            })}
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <Input
                              value={customSizeInput}
                              onChange={(e) => setCustomSizeInput(e.target.value)}
                              placeholder="Add custom size (e.g. 4XL, 100ml, One Size)..."
                              className="h-8 rounded-lg text-xs"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addCustomSize();
                                }
                              }}
                            />
                            <Button type="button" size="sm" variant="outline" onClick={addCustomSize} className="h-8 text-xs rounded-lg">
                              Add Size
                            </Button>
                          </div>
                        </div>

                        {/* Action: Generate Matrix */}
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-primary/10 border border-primary/20">
                          <div>
                            <p className="text-xs font-bold text-primary">Combinations Matrix</p>
                            <p className="text-[11px] text-muted-foreground">
                              Produces {selectedColors.length || 1} color(s) × {selectedSizes.length || 1} size(s) ={" "}
                              <strong>{(selectedColors.length || 1) * (selectedSizes.length || 1)} variations</strong>
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={generateMatrixCombinations}
                            className="rounded-xl text-xs font-bold bg-primary text-primary-foreground gap-1.5 shadow-sm"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Re-generate Matrix
                          </Button>
                        </div>

                        {/* Step C: Variations Grouped by Color */}
                        {variants.length > 0 && (
                          <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-foreground">
                                Active Variations Matrix ({variants.length} combinations)
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={autoGenerateAllSkus}
                                className="h-7 text-xs rounded-lg gap-1 font-semibold"
                              >
                                <Wand2 className="w-3 h-3 text-primary" /> Auto-SKUs
                              </Button>
                            </div>

                            {/* Color Group Cards */}
                            <div className="space-y-3">
                              {variantColorGroups.map((group) => {
                                const isExpanded = expandedColors[group.color] !== false;
                                return (
                                  <div
                                    key={group.color}
                                    className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm"
                                  >
                                    {/* Color Card Header */}
                                    <div className="p-3 bg-muted/40 flex items-center justify-between border-b border-border/60">
                                      <div className="flex items-center gap-2.5">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setExpandedColors({ ...expandedColors, [group.color]: !isExpanded })
                                          }
                                          className="p-1 rounded hover:bg-muted text-muted-foreground"
                                        >
                                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        </button>
                                        <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                                          <Palette className="w-3.5 h-3.5 text-primary" /> Color: {group.color}
                                        </span>
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                          {group.items.length} size{group.items.length > 1 ? "s" : ""} · {group.totalStock} units
                                        </Badge>
                                      </div>

                                      {/* Color photo picker */}
                                      <div className="flex items-center gap-2">
                                        {Array.isArray(editing.images) && editing.images.length > 0 && (
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <button
                                                type="button"
                                                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                                              >
                                                {group.image ? (
                                                  <img src={group.image} alt="" className="w-6 h-6 rounded-md object-cover border" />
                                                ) : (
                                                  <Images className="w-3.5 h-3.5" />
                                                )}
                                                Assign Photo
                                              </button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-56 p-2 rounded-xl" align="end">
                                              <p className="text-xs font-semibold mb-2">Pick photo for {group.color}:</p>
                                              <div className="grid grid-cols-4 gap-1.5">
                                                {editing.images.map((url: string, imgIdx: number) => (
                                                  <button
                                                    key={imgIdx}
                                                    type="button"
                                                    onClick={() => setColorGroupImage(group.color, url)}
                                                    className="w-10 h-10 rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary"
                                                  >
                                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                                  </button>
                                                ))}
                                              </div>
                                            </PopoverContent>
                                          </Popover>
                                        )}
                                      </div>
                                    </div>

                                    {/* Nested Size Rows under this Color */}
                                    {isExpanded && (
                                      <div className="p-2.5 sm:p-3 space-y-2">
                                        <div className="hidden sm:grid sm:grid-cols-[80px_1fr_100px_90px_40px] gap-2 px-1 text-[11px] font-bold text-muted-foreground">
                                          <span>Size</span>
                                          <span>SKU Code</span>
                                          <span title="Override product price">Price (৳)</span>
                                          <span>Stock</span>
                                          <span></span>
                                        </div>

                                        {group.items.map((v: any, itemIdx: number) => (
                                          <div
                                            key={itemIdx}
                                            className="flex flex-col sm:grid sm:grid-cols-[80px_1fr_100px_90px_40px] gap-2 p-2.5 sm:p-2 rounded-xl bg-background border border-border/60"
                                          >
                                            {/* Size Chip */}
                                            <div className="flex items-center gap-2">
                                              <div className="font-bold text-xs text-foreground px-2.5 py-1 rounded-lg bg-muted/60 text-center min-w-[50px] sm:min-w-0 sm:w-full">
                                                {v.size || "Standard"}
                                              </div>
                                              <div className="flex-1 sm:hidden">
                                                <Input
                                                  value={v.sku || ""}
                                                  onChange={(e) =>
                                                    updateVariantByCombo(group.color, v.size || "", "sku", e.target.value)
                                                  }
                                                  placeholder="SKU"
                                                  className="h-8 text-xs font-mono uppercase"
                                                />
                                              </div>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive sm:hidden shrink-0"
                                                onClick={() => removeVariantByCombo(group.color, v.size || "")}
                                              >
                                                <X className="w-3.5 h-3.5" />
                                              </Button>
                                            </div>

                                            {/* SKU on Desktop */}
                                            <div className="hidden sm:flex items-center gap-1">
                                              <Input
                                                value={v.sku || ""}
                                                onChange={(e) =>
                                                  updateVariantByCombo(group.color, v.size || "", "sku", e.target.value)
                                                }
                                                placeholder="SKU"
                                                className="h-8 text-xs font-mono uppercase"
                                              />
                                            </div>

                                            {/* Price Override & Stock */}
                                            <div className="grid grid-cols-2 sm:contents gap-2">
                                              <div>
                                                <span className="text-[10px] font-semibold text-muted-foreground sm:hidden mb-0.5 block">Price (৳)</span>
                                                <Input
                                                  type="number"
                                                  value={v.price_override ?? ""}
                                                  onChange={(e) =>
                                                    updateVariantByCombo(
                                                      group.color,
                                                      v.size || "",
                                                      "price_override",
                                                      e.target.value === "" ? null : +e.target.value
                                                    )
                                                  }
                                                  placeholder={String(editing.price || 0)}
                                                  title="Leave empty to use main product price"
                                                  className="h-8 text-xs"
                                                />
                                              </div>

                                              <div>
                                                <span className="text-[10px] font-semibold text-muted-foreground sm:hidden mb-0.5 block">Stock</span>
                                                <div className="relative">
                                                  <Input
                                                    type="number"
                                                    value={v.stock_quantity ?? 0}
                                                    onChange={(e) =>
                                                      updateVariantByCombo(
                                                        group.color,
                                                        v.size || "",
                                                        "stock_quantity",
                                                        +e.target.value
                                                      )
                                                    }
                                                    className="h-8 text-xs font-bold"
                                                  />
                                                  {variantSerialCounts[v.id] > 0 && (
                                                    <Lock className="w-3 h-3 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                  )}
                                                </div>
                                              </div>
                                            </div>

                                            {/* Desktop Remove Button */}
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="hidden sm:inline-flex h-8 w-8 text-destructive"
                                              onClick={() => removeVariantByCombo(group.color, v.size || "")}
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground space-y-2">
                        <p className="font-semibold text-foreground">
                          This product is currently configured as a Simple Item (Single Variation).
                        </p>
                        <p>
                          Total stock is tracked directly via the <strong>Global Stock Units</strong> input on the Pricing &amp; Stock tab.
                          Turn on the switch above if you need color/size variations.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Studio Fixed Footer Navigation Bar */}
          <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-t border-border/70 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-muted/30 shrink-0">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="rounded-xl h-10 px-4 text-xs font-semibold flex-1 sm:flex-initial"
              >
                Cancel
              </Button>
              {editing?.id && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    if (!editing?.id) return;
                    const { data } = await (supabase.from as any)("product_serials")
                      .select("serial_code")
                      .eq("product_id", editing.id)
                      .eq("status", "available")
                      .limit(500);
                    const codes = (data ?? []).map((r: any) => r.serial_code);
                    if (!codes.length) {
                      toast.error("No available serial barcodes found. Save product with stock > 0 first.");
                      return;
                    }
                    setPrintProduct({ id: editing.id, codes });
                  }}
                  className="rounded-xl h-10 px-4 text-xs font-semibold gap-1.5 flex-1 sm:flex-initial"
                >
                  <Package className="w-3.5 h-3.5 text-primary" /> Print Stickers
                </Button>
              )}
            </div>

            {/* Step Navigation & Save Action */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {modalTab !== "info" && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    const order = ["info", "media", "pricing", "variants"] as const;
                    const idx = order.indexOf(modalTab);
                    if (idx > 0) setModalTab(order[idx - 1]);
                  }}
                  className="rounded-xl h-10 px-3 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </Button>
              )}

              {modalTab !== "variants" && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const order = ["info", "media", "pricing", "variants"] as const;
                    const idx = order.indexOf(modalTab);
                    if (idx < order.length - 1) setModalTab(order[idx + 1]);
                  }}
                  className="rounded-xl h-10 px-4 text-xs font-semibold gap-1.5 border border-border/60"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}

              <Button
                type="button"
                onClick={() => {
                  if (!editing?.name?.trim()) {
                    toast.error("Please provide a product title");
                    setModalTab("info");
                    return;
                  }
                  saveMutation.mutate({ product: editing, variantList: variants });
                }}
                disabled={saveMutation.isPending}
                className="rounded-xl h-10 px-6 text-xs font-bold bg-primary text-primary-foreground shadow-md hover:shadow-lg active:scale-95 transition-all gap-2 flex-1 sm:flex-initial"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Save Product
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Barcode Print Stickers Modal */}
      {printProduct && (
        <PrintStickersDialog codes={printProduct.codes} onClose={() => setPrintProduct(null)} />
      )}
    </div>
  );
}
